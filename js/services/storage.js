/**
 * IPTV Player - Storage Service
 * IndexedDB wrapper for persistent storage with memory optimization
 */

class StorageService {
    constructor() {
        this.dbName = 'IPTVPlayerDB';
        this.dbVersion = 1;
        this.db = null;
        this.memoryCache = new Map();
        this.maxMemoryCacheSize = CONFIG.memory.maxItemsInMemory;
    }

    /**
     * Initialize IndexedDB
     */
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => {
                console.error('Failed to open IndexedDB:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                console.log('IndexedDB initialized successfully');
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Channels store
                if (!db.objectStoreNames.contains('channels')) {
                    const channelsStore = db.createObjectStore('channels', { keyPath: 'id' });
                    channelsStore.createIndex('type', 'type', { unique: false });
                    channelsStore.createIndex('category', 'category_id', { unique: false });
                    channelsStore.createIndex('name', 'name', { unique: false });
                }

                // Categories store
                if (!db.objectStoreNames.contains('categories')) {
                    const categoriesStore = db.createObjectStore('categories', { keyPath: 'id' });
                    categoriesStore.createIndex('type', 'type', { unique: false });
                }

                // TMDB cache store
                if (!db.objectStoreNames.contains('tmdb_cache')) {
                    const tmdbStore = db.createObjectStore('tmdb_cache', { keyPath: 'cacheKey' });
                    tmdbStore.createIndex('expires', 'expires', { unique: false });
                    tmdbStore.createIndex('type', 'type', { unique: false });
                }

                // Favorites store
                if (!db.objectStoreNames.contains('favorites')) {
                    const favoritesStore = db.createObjectStore('favorites', { keyPath: 'id' });
                    favoritesStore.createIndex('addedAt', 'addedAt', { unique: false });
                }

                // History store
                if (!db.objectStoreNames.contains('history')) {
                    const historyStore = db.createObjectStore('history', { keyPath: 'id' });
                    historyStore.createIndex('watchedAt', 'watchedAt', { unique: false });
                    historyStore.createIndex('progress', 'progress', { unique: false });
                }

                // Settings store
                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings', { keyPath: 'key' });
                }

                console.log('IndexedDB schema created');
            };
        });
    }

    /**
     * Get item from store
     */
    async get(storeName, key) {
        // Check memory cache first
        const cacheKey = `${storeName}:${key}`;
        if (this.memoryCache.has(cacheKey)) {
            return this.memoryCache.get(cacheKey);
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(key);

            request.onsuccess = () => {
                const result = request.result;
                if (result) {
                    this.setMemoryCache(cacheKey, result);
                }
                resolve(result);
            };

            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Put item in store
     */
    async put(storeName, data) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put(data);

            request.onsuccess = () => {
                // Update memory cache
                const key = data.id || data.key || data.cacheKey;
                if (key) {
                    this.setMemoryCache(`${storeName}:${key}`, data);
                }
                resolve(request.result);
            };

            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Put multiple items in store
     */
    async putMany(storeName, items) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);

            let completed = 0;
            const total = items.length;

            items.forEach(item => {
                const request = store.put(item);
                request.onsuccess = () => {
                    completed++;
                    if (completed === total) {
                        resolve(completed);
                    }
                };
                request.onerror = () => reject(request.error);
            });

            if (total === 0) {
                resolve(0);
            }
        });
    }

    /**
     * Delete item from store
     */
    async delete(storeName, key) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(key);

            request.onsuccess = () => {
                this.memoryCache.delete(`${storeName}:${key}`);
                resolve();
            };

            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Get all items from store
     */
    async getAll(storeName) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Get items by index
     */
    async getByIndex(storeName, indexName, value) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            const index = store.index(indexName);
            const request = index.getAll(value);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Get items with pagination
     */
    async getPaginated(storeName, indexName, value, offset = 0, limit = 50) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            const index = indexName ? store.index(indexName) : store;

            const range = value ? IDBKeyRange.only(value) : null;
            const request = index.openCursor(range);

            const results = [];
            let skipped = 0;

            request.onsuccess = (event) => {
                const cursor = event.target.result;

                if (cursor) {
                    if (skipped < offset) {
                        skipped++;
                        cursor.continue();
                    } else if (results.length < limit) {
                        results.push(cursor.value);
                        cursor.continue();
                    } else {
                        resolve(results);
                    }
                } else {
                    resolve(results);
                }
            };

            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Count items in store
     */
    async count(storeName, indexName, value) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            const target = indexName ? store.index(indexName) : store;
            const range = value ? IDBKeyRange.only(value) : null;
            const request = target.count(range);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Clear store
     */
    async clear(storeName) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.clear();

            request.onsuccess = () => {
                // Clear memory cache for this store
                for (const key of this.memoryCache.keys()) {
                    if (key.startsWith(`${storeName}:`)) {
                        this.memoryCache.delete(key);
                    }
                }
                resolve();
            };

            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Search items by name
     */
    async search(storeName, query, limit = 20) {
        const allItems = await this.getAll(storeName);
        const queryLower = query.toLowerCase();

        return allItems
            .filter(item => {
                const name = (item.name || item.title || '').toLowerCase();
                return name.includes(queryLower);
            })
            .slice(0, limit);
    }

    /**
     * Memory cache management
     */
    setMemoryCache(key, value) {
        // Evict oldest items if cache is full
        if (this.memoryCache.size >= this.maxMemoryCacheSize) {
            const firstKey = this.memoryCache.keys().next().value;
            this.memoryCache.delete(firstKey);
        }
        this.memoryCache.set(key, value);
    }

    /**
     * Clear expired TMDB cache
     */
    async clearExpiredCache() {
        const now = Date.now();
        const transaction = this.db.transaction('tmdb_cache', 'readwrite');
        const store = transaction.objectStore('tmdb_cache');
        const index = store.index('expires');
        const range = IDBKeyRange.upperBound(now);
        const request = index.openCursor(range);

        return new Promise((resolve) => {
            let deleted = 0;

            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    cursor.delete();
                    deleted++;
                    cursor.continue();
                } else {
                    console.log(`Cleared ${deleted} expired cache entries`);
                    resolve(deleted);
                }
            };
        });
    }

    /**
     * Get storage stats
     */
    async getStats() {
        const stats = {};
        const storeNames = ['channels', 'categories', 'tmdb_cache', 'favorites', 'history'];

        for (const storeName of storeNames) {
            stats[storeName] = await this.count(storeName);
        }

        stats.memoryCacheSize = this.memoryCache.size;

        return stats;
    }
}

// Create global instance
const storage = new StorageService();
