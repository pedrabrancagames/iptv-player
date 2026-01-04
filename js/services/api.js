/**
 * IPTV Player - API Service
 * Base HTTP client with caching and error handling
 */

class ApiService {
    constructor() {
        this.requestQueue = [];
        this.isProcessing = false;
        this.rateLimitDelay = 100; // ms between requests
        this.isSecureContext = window.location.protocol === 'https:';
        this.proxyUrl = '/api/proxy';
    }

    /**
     * Check if URL needs to be proxied (HTTP URL in HTTPS context)
     */
    needsProxy(url) {
        return this.isSecureContext && url.startsWith('http://');
    }

    /**
     * Get the proxied URL for HTTP requests
     */
    getProxiedUrl(url) {
        if (this.needsProxy(url)) {
            return `${this.proxyUrl}?url=${encodeURIComponent(url)}`;
        }
        return url;
    }

    /**
     * Make HTTP GET request with caching
     */
    async get(url, options = {}) {
        const {
            cache = true,
            cacheKey = url,
            cacheExpiry = CONFIG.memory.cacheExpiry.channels,
            retries = CONFIG.player.retryAttempts
        } = options;

        // Check cache first
        if (cache) {
            const cached = await this.getFromCache(cacheKey);
            if (cached) {
                return cached;
            }
        }

        // Make request with retry logic
        let lastError;
        for (let i = 0; i < retries; i++) {
            try {
                const response = await this.fetchWithTimeout(url);

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const data = await response.json();

                // Cache successful response
                if (cache) {
                    await this.saveToCache(cacheKey, data, cacheExpiry);
                }

                return data;
            } catch (error) {
                lastError = error;
                console.warn(`Request attempt ${i + 1} failed:`, error.message);

                if (i < retries - 1) {
                    await this.delay(CONFIG.player.retryDelay * (i + 1));
                }
            }
        }

        throw lastError;
    }

    /**
     * Fetch with timeout
     */
    async fetchWithTimeout(url, timeout = 30000) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        // Use proxy for HTTP requests in HTTPS context
        const requestUrl = this.getProxiedUrl(url);

        if (this.needsProxy(url)) {
            console.log('Using proxy for HTTP request:', url);
        }

        try {
            const response = await fetch(requestUrl, {
                signal: controller.signal,
                headers: {
                    'Accept': 'application/json'
                }
            });
            clearTimeout(timeoutId);
            return response;
        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                throw new Error('Request timeout');
            }
            throw error;
        }
    }

    /**
     * Get from cache
     */
    async getFromCache(cacheKey) {
        try {
            const cached = await storage.get('tmdb_cache', cacheKey);

            if (cached && cached.expires > Date.now()) {
                return cached.data;
            }

            // Delete expired cache
            if (cached) {
                await storage.delete('tmdb_cache', cacheKey);
            }

            return null;
        } catch (error) {
            console.warn('Cache read error:', error);
            return null;
        }
    }

    /**
     * Save to cache
     */
    async saveToCache(cacheKey, data, expiry) {
        try {
            await storage.put('tmdb_cache', {
                cacheKey,
                data,
                expires: Date.now() + expiry,
                type: 'api_response'
            });
        } catch (error) {
            console.warn('Cache write error:', error);
        }
    }

    /**
     * Queue request for rate limiting
     */
    queueRequest(requestFn) {
        return new Promise((resolve, reject) => {
            this.requestQueue.push({ requestFn, resolve, reject });
            this.processQueue();
        });
    }

    /**
     * Process request queue
     */
    async processQueue() {
        if (this.isProcessing || this.requestQueue.length === 0) {
            return;
        }

        this.isProcessing = true;

        while (this.requestQueue.length > 0) {
            const { requestFn, resolve, reject } = this.requestQueue.shift();

            try {
                const result = await requestFn();
                resolve(result);
            } catch (error) {
                reject(error);
            }

            // Rate limit delay
            if (this.requestQueue.length > 0) {
                await this.delay(this.rateLimitDelay);
            }
        }

        this.isProcessing = false;
    }

    /**
     * Delay helper
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Build URL with query parameters
     */
    buildUrl(baseUrl, params = {}) {
        const url = new URL(baseUrl);
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                url.searchParams.append(key, value);
            }
        });
        return url.toString();
    }

    /**
     * Clear all caches
     */
    async clearCache() {
        await storage.clear('tmdb_cache');
        console.log('API cache cleared');
    }
}

// Create global instance
const api = new ApiService();
