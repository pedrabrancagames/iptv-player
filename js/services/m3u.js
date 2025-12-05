/**
 * IPTV Player - M3U Parser Service
 * Parses M3U/M3U8 playlist files
 */

class M3UParser {
    constructor() {
        this.playlists = [];
    }

    /**
     * Parse M3U content
     */
    parse(content) {
        const lines = content.split('\n').map(line => line.trim());
        const channels = [];

        let currentChannel = null;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // Skip empty lines
            if (!line) continue;

            // Check for EXTINF line (channel info)
            if (line.startsWith('#EXTINF:')) {
                currentChannel = this.parseExtInf(line);
            }
            // Check for URL line
            else if (!line.startsWith('#') && currentChannel) {
                currentChannel.streamUrl = line;
                currentChannel.url = line;
                channels.push(currentChannel);
                currentChannel = null;
            }
            // Parse additional tags
            else if (line.startsWith('#EXTGRP:') && currentChannel) {
                currentChannel.group = line.substring(8).trim();
            }
        }

        return channels;
    }

    /**
     * Parse EXTINF line
     */
    parseExtInf(line) {
        const channel = {
            id: this.generateId(),
            type: 'live',
            name: '',
            group: 'Sem Categoria',
            logo: '',
            tvg: {}
        };

        // Extract duration and rest
        const match = line.match(/#EXTINF:(-?\d+)\s*(.*)/);
        if (!match) return channel;

        const attributes = match[2];

        // Parse attributes
        const tvgId = this.extractAttribute(attributes, 'tvg-id');
        const tvgName = this.extractAttribute(attributes, 'tvg-name');
        const tvgLogo = this.extractAttribute(attributes, 'tvg-logo');
        const groupTitle = this.extractAttribute(attributes, 'group-title');

        if (tvgId) channel.tvg.id = tvgId;
        if (tvgName) channel.tvg.name = tvgName;
        if (tvgLogo) {
            channel.logo = tvgLogo;
            channel.stream_icon = tvgLogo;
        }
        if (groupTitle) channel.group = groupTitle;

        // Extract channel name (after the comma)
        const commaIndex = attributes.lastIndexOf(',');
        if (commaIndex !== -1) {
            channel.name = attributes.substring(commaIndex + 1).trim();
        } else {
            channel.name = tvgName || 'Sem Nome';
        }

        // Detect type from URL or group
        channel.type = this.detectType(channel);

        return channel;
    }

    /**
     * Extract attribute from EXTINF line
     */
    extractAttribute(str, attr) {
        const regex = new RegExp(`${attr}="([^"]*)"`, 'i');
        const match = str.match(regex);
        return match ? match[1] : null;
    }

    /**
     * Detect content type
     */
    detectType(channel) {
        const name = (channel.name || '').toLowerCase();
        const group = (channel.group || '').toLowerCase();

        // Check for movies
        if (group.includes('filme') || group.includes('movie') ||
            group.includes('vod') || group.includes('lançamento')) {
            return 'movie';
        }

        // Check for series
        if (group.includes('série') || group.includes('series') ||
            group.includes('temporada') || group.includes('episod')) {
            return 'series';
        }

        // Default to live
        return 'live';
    }

    /**
     * Generate unique ID
     */
    generateId() {
        return 'm3u_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Fetch and parse M3U from URL
     */
    async fetchAndParse(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error: ${response.status}`);
            }
            const content = await response.text();
            return this.parse(content);
        } catch (error) {
            console.error('Failed to fetch M3U:', error);
            throw error;
        }
    }

    /**
     * Group channels by category
     */
    groupByCategory(channels) {
        const groups = {};

        channels.forEach(channel => {
            const group = channel.group || 'Sem Categoria';
            if (!groups[group]) {
                groups[group] = [];
            }
            groups[group].push(channel);
        });

        return groups;
    }

    /**
     * Get unique categories
     */
    getCategories(channels) {
        const categories = new Set();
        channels.forEach(channel => {
            categories.add(channel.group || 'Sem Categoria');
        });
        return Array.from(categories).sort();
    }

    /**
     * Filter channels by type
     */
    filterByType(channels, type) {
        return channels.filter(channel => channel.type === type);
    }
}

// Global instance
const m3uParser = new M3UParser();
