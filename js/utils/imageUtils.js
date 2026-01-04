/**
 * IPTV Player - Image Utilities
 * Handles secure image URL conversion for Mixed Content prevention
 */

const ImageUtils = {
    /**
     * Check if we're in a secure (HTTPS) context
     */
    isSecureContext: window.location.protocol === 'https:',

    /**
     * Image proxy endpoint
     */
    proxyUrl: '/api/image',

    /**
     * Convert an image URL to a secure URL if needed
     * @param {string} url - The original image URL
     * @returns {string} - The secure image URL
     */
    getSecureImageUrl(url) {
        if (!url) return '';

        // Already HTTPS or data URL, return as-is
        if (url.startsWith('https://') || url.startsWith('data:')) {
            return url;
        }

        // If in secure context and URL is HTTP, use proxy
        if (this.isSecureContext && url.startsWith('http://')) {
            return `${this.proxyUrl}?url=${encodeURIComponent(url)}`;
        }

        // Return original URL for non-secure context
        return url;
    },

    /**
     * Get a placeholder image URL
     * @param {string} type - Type of content: 'movie', 'series', 'live', 'default'
     * @returns {string} - Placeholder image URL
     */
    getPlaceholder(type = 'default') {
        const placeholders = {
            movie: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 450"><rect fill="%231a1a2e" width="300" height="450"/><text x="150" y="225" text-anchor="middle" fill="%23666" font-size="48">🎬</text></svg>',
            series: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 450"><rect fill="%231a1a2e" width="300" height="450"/><text x="150" y="225" text-anchor="middle" fill="%23666" font-size="48">📺</text></svg>',
            live: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%231a1a2e" width="100" height="100"/><text x="50" y="55" text-anchor="middle" fill="%23666" font-size="32">📡</text></svg>',
            default: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 450"><rect fill="%231a1a2e" width="300" height="450"/><text x="150" y="225" text-anchor="middle" fill="%23666" font-size="48">🖼️</text></svg>'
        };
        return placeholders[type] || placeholders.default;
    },

    /**
     * Create an image element with secure URL and error handling
     * @param {string} url - The image URL
     * @param {string} alt - Alt text
     * @param {string} type - Type for placeholder
     * @returns {string} - HTML img tag
     */
    createImageTag(url, alt = '', type = 'default') {
        const secureUrl = this.getSecureImageUrl(url);
        const placeholder = this.getPlaceholder(type);
        return `<img src="${secureUrl}" alt="${alt}" onerror="this.src='${placeholder}'" loading="lazy">`;
    }
};

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.ImageUtils = ImageUtils;
}
