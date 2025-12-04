/**
 * IPTV Player - Xtream Codes API Service
 * Handles all communication with the IPTV provider
 */

class XtreamService {
    constructor() {
        this.baseUrl = `${CONFIG.xtream.server}:${CONFIG.xtream.port}`;
        this.username = CONFIG.xtream.username;
        this.password = CONFIG.xtream.password;
        this.userInfo = null;
        this.isAuthenticated = false;
    }

    /**
     * Initialize with saved credentials
     */
    async initFromStorage() {
        try {
            const stored = await storage.get('settings', 'xtream_credentials');
            if (stored?.value) {
                this.updateCredentials(stored.value);
            }
        } catch (error) {
            console.warn('Could not load saved credentials, using defaults');
        }
    }

    /**
     * Update credentials
     */
    updateCredentials(credentials) {
        if (credentials.server) {
            this.baseUrl = `${credentials.server}:${credentials.port || 80}`;
        }
        if (credentials.username) {
            this.username = credentials.username;
        }
        if (credentials.password) {
            this.password = credentials.password;
        }
        this.isAuthenticated = false;
        this.userInfo = null;
        console.log('Xtream credentials updated');
    }

    /**
     * Build API URL
     */
    buildUrl(endpoint, params = {}) {
        let url = `${this.baseUrl}${endpoint}`;

        // Add credentials if not already in URL
        if (!url.includes('username=')) {
            const separator = url.includes('?') ? '&' : '?';
            url += `${separator}username=${this.username}&password=${this.password}`;
        }

        // Add additional params
        Object.entries(params).forEach(([key, value]) => {
            url += `&${key}=${value}`;
        });

        return url;
    }

    /**
     * Authenticate and get user info
     */
    async authenticate() {
        try {
            const url = this.buildUrl(XTREAM_ENDPOINTS.auth);
            const data = await api.get(url, { cache: false });

            if (data.user_info) {
                this.userInfo = data.user_info;
                this.isAuthenticated = true;

                console.log('Xtream authenticated:', {
                    username: this.userInfo.username,
                    status: this.userInfo.status,
                    expDate: this.userInfo.exp_date
                });

                return {
                    success: true,
                    userInfo: this.userInfo,
                    serverInfo: data.server_info
                };
            }

            throw new Error('Invalid authentication response');
        } catch (error) {
            console.error('Xtream authentication failed:', error);
            this.isAuthenticated = false;
            throw error;
        }
    }

    /**
     * Get live TV categories
     */
    async getLiveCategories() {
        const url = this.buildUrl(XTREAM_ENDPOINTS.liveCategories);
        const data = await api.get(url, {
            cacheKey: 'live_categories',
            cacheExpiry: CONFIG.memory.cacheExpiry.channels
        });

        // Store in IndexedDB
        const categories = data.map(cat => ({
            ...cat,
            id: `live_${cat.category_id}`,
            type: 'live',
            originalId: cat.category_id
        }));

        await storage.putMany('categories', categories);
        return categories;
    }

    /**
     * Get live TV streams
     */
    async getLiveStreams(categoryId = null) {
        let url;
        let cacheKey;

        if (categoryId) {
            url = this.buildUrl(XTREAM_ENDPOINTS.liveStreamsByCategory + categoryId);
            cacheKey = `live_streams_${categoryId}`;
        } else {
            url = this.buildUrl(XTREAM_ENDPOINTS.liveStreams);
            cacheKey = 'live_streams_all';
        }

        const data = await api.get(url, {
            cacheKey,
            cacheExpiry: CONFIG.memory.cacheExpiry.channels
        });

        // Transform and store
        const streams = data.map(stream => ({
            ...stream,
            id: `live_${stream.stream_id}`,
            type: 'live',
            originalId: stream.stream_id,
            streamUrl: this.getLiveStreamUrl(stream.stream_id)
        }));

        return streams;
    }

    /**
     * Get VOD (movie) categories
     */
    async getVodCategories() {
        const url = this.buildUrl(XTREAM_ENDPOINTS.vodCategories);
        const data = await api.get(url, {
            cacheKey: 'vod_categories',
            cacheExpiry: CONFIG.memory.cacheExpiry.channels
        });

        const categories = data.map(cat => ({
            ...cat,
            id: `vod_${cat.category_id}`,
            type: 'movie',
            originalId: cat.category_id
        }));

        await storage.putMany('categories', categories);
        return categories;
    }

    /**
     * Get VOD (movie) streams
     */
    async getVodStreams(categoryId = null) {
        let url;
        let cacheKey;

        if (categoryId) {
            url = this.buildUrl(XTREAM_ENDPOINTS.vodStreamsByCategory + categoryId);
            cacheKey = `vod_streams_${categoryId}`;
        } else {
            url = this.buildUrl(XTREAM_ENDPOINTS.vodStreams);
            cacheKey = 'vod_streams_all';
        }

        const data = await api.get(url, {
            cacheKey,
            cacheExpiry: CONFIG.memory.cacheExpiry.channels
        });

        const streams = data.map(stream => ({
            ...stream,
            id: `vod_${stream.stream_id}`,
            type: 'movie',
            originalId: stream.stream_id,
            streamUrl: this.getVodStreamUrl(stream.stream_id, stream.container_extension)
        }));

        return streams;
    }

    /**
     * Get VOD info (movie details from provider)
     */
    async getVodInfo(vodId) {
        const url = this.buildUrl(XTREAM_ENDPOINTS.vodInfo + vodId);
        return await api.get(url, {
            cacheKey: `vod_info_${vodId}`,
            cacheExpiry: CONFIG.memory.cacheExpiry.tmdbDetails
        });
    }

    /**
     * Get series categories
     */
    async getSeriesCategories() {
        const url = this.buildUrl(XTREAM_ENDPOINTS.seriesCategories);
        const data = await api.get(url, {
            cacheKey: 'series_categories',
            cacheExpiry: CONFIG.memory.cacheExpiry.channels
        });

        const categories = data.map(cat => ({
            ...cat,
            id: `series_${cat.category_id}`,
            type: 'series',
            originalId: cat.category_id
        }));

        await storage.putMany('categories', categories);
        return categories;
    }

    /**
     * Get series streams
     */
    async getSeriesStreams(categoryId = null) {
        let url;
        let cacheKey;

        if (categoryId) {
            url = this.buildUrl(XTREAM_ENDPOINTS.seriesStreamsByCategory + categoryId);
            cacheKey = `series_streams_${categoryId}`;
        } else {
            url = this.buildUrl(XTREAM_ENDPOINTS.seriesStreams);
            cacheKey = 'series_streams_all';
        }

        const data = await api.get(url, {
            cacheKey,
            cacheExpiry: CONFIG.memory.cacheExpiry.channels
        });

        const streams = data.map(stream => ({
            ...stream,
            id: `series_${stream.series_id}`,
            type: 'series',
            originalId: stream.series_id
        }));

        return streams;
    }

    /**
     * Get series info (episodes)
     */
    async getSeriesInfo(seriesId) {
        const url = this.buildUrl(XTREAM_ENDPOINTS.seriesInfo + seriesId);
        const data = await api.get(url, {
            cacheKey: `series_info_${seriesId}`,
            cacheExpiry: CONFIG.memory.cacheExpiry.tmdbDetails
        });

        // Transform episodes
        if (data.episodes) {
            Object.keys(data.episodes).forEach(seasonNum => {
                data.episodes[seasonNum] = data.episodes[seasonNum].map(ep => ({
                    ...ep,
                    streamUrl: this.getSeriesStreamUrl(ep.id, ep.container_extension)
                }));
            });
        }

        return data;
    }

    /**
     * Get live stream URL
     */
    getLiveStreamUrl(streamId) {
        return `${this.baseUrl}/live/${this.username}/${this.password}/${streamId}.m3u8`;
    }

    /**
     * Get VOD stream URL
     */
    getVodStreamUrl(streamId, extension = 'mp4') {
        return `${this.baseUrl}/movie/${this.username}/${this.password}/${streamId}.${extension}`;
    }

    /**
     * Get series episode stream URL
     */
    getSeriesStreamUrl(episodeId, extension = 'mp4') {
        return `${this.baseUrl}/series/${this.username}/${this.password}/${episodeId}.${extension}`;
    }

    /**
     * Search across all content types
     */
    async search(query, types = ['live', 'movie', 'series']) {
        const results = {
            live: [],
            movies: [],
            series: []
        };

        const queryLower = query.toLowerCase();

        // Search in cached data first
        const cachedChannels = await storage.search('channels', query, 50);

        if (cachedChannels.length > 0) {
            cachedChannels.forEach(item => {
                if (item.type === 'live' && types.includes('live')) {
                    results.live.push(item);
                } else if (item.type === 'movie' && types.includes('movie')) {
                    results.movies.push(item);
                } else if (item.type === 'series' && types.includes('series')) {
                    results.series.push(item);
                }
            });
        }

        return results;
    }

    /**
     * Get all content (for initial load)
     */
    async getAllContent() {
        const [liveCategories, vodCategories, seriesCategories] = await Promise.all([
            this.getLiveCategories(),
            this.getVodCategories(),
            this.getSeriesCategories()
        ]);

        return {
            live: liveCategories,
            movies: vodCategories,
            series: seriesCategories
        };
    }

    /**
     * Check if subscription is active
     */
    isSubscriptionActive() {
        if (!this.userInfo) return false;

        const expDate = parseInt(this.userInfo.exp_date) * 1000;
        return this.userInfo.status === 'Active' && expDate > Date.now();
    }

    /**
     * Get subscription info
     */
    getSubscriptionInfo() {
        if (!this.userInfo) return null;

        const expDate = new Date(parseInt(this.userInfo.exp_date) * 1000);
        const daysLeft = Math.ceil((expDate - Date.now()) / (1000 * 60 * 60 * 24));

        return {
            username: this.userInfo.username,
            status: this.userInfo.status,
            expiresAt: expDate,
            daysLeft: Math.max(0, daysLeft),
            maxConnections: this.userInfo.max_connections,
            activeConnections: this.userInfo.active_cons
        };
    }
}

// Create global instance
const xtream = new XtreamService();
