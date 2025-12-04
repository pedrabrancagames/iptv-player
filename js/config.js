/**
 * IPTV Player - Configuration
 * Central configuration for the application
 */

const CONFIG = {
    // App Info
    app: {
        name: 'IPTV Player',
        version: '1.0.0'
    },

    // Xtream Codes API Configuration
    xtream: {
        server: 'http://1fcpbqww8.vip',
        port: 80,
        username: '073857',
        password: 'zBffUj',
        // Use HLS for better webOS compatibility
        output: 'hls'
    },

    // TMDB API Configuration
    tmdb: {
        apiKey: '3bb24b0146d1dd3979666ea4a0607aff',
        baseUrl: 'https://api.themoviedb.org/3',
        imageBaseUrl: 'https://image.tmdb.org/t/p',
        language: 'pt-BR',
        // Image sizes
        posterSizes: {
            small: 'w185',
            medium: 'w342',
            large: 'w500',
            original: 'original'
        },
        backdropSizes: {
            small: 'w300',
            medium: 'w780',
            large: 'w1280',
            original: 'original'
        },
        profileSizes: {
            small: 'w45',
            medium: 'w185',
            large: 'h632',
            original: 'original'
        }
    },

    // Memory Optimization (for SM8600 with limited RAM)
    memory: {
        maxItemsInMemory: 50,       // Max items rendered at once
        maxCachedImages: 20,        // Limit image cache
        chunkSize: 100,             // Items per API request
        gcInterval: 30000,          // Garbage collection interval (30s)
        lazyLoadThreshold: 3,       // Items to preload
        cacheExpiry: {
            channels: 24 * 60 * 60 * 1000,    // 24 hours
            tmdbDetails: 7 * 24 * 60 * 60 * 1000,  // 7 days
            tmdbSearch: 24 * 60 * 60 * 1000,   // 24 hours
            person: 30 * 24 * 60 * 60 * 1000   // 30 days
        }
    },

    // UI Settings
    ui: {
        gridColumns: 6,
        rowItemsVisible: 7,
        animationDuration: 250,
        controlsHideDelay: 3000,    // Hide player controls after 3s
        toastDuration: 4000,        // Toast notification duration
        searchDebounce: 500         // Search input debounce
    },

    // Player Settings
    player: {
        seekTime: 10,               // Seconds to seek
        volumeStep: 0.1,            // Volume increment
        bufferSize: 30,             // Buffer in seconds
        retryAttempts: 3,
        retryDelay: 2000
    },

    // Storage Keys
    storage: {
        favorites: 'iptv_favorites',
        history: 'iptv_history',
        settings: 'iptv_settings',
        cache: 'iptv_cache',
        lastSync: 'iptv_last_sync'
    },

    // Default Settings
    defaultSettings: {
        autoplay: true,
        showAdultContent: false,
        preferredQuality: 'auto',
        subtitles: true,
        theme: 'dark'
    }
};

// Xtream API Endpoints
const XTREAM_ENDPOINTS = {
    // Authentication
    auth: '/player_api.php',
    
    // Live TV
    liveCategories: '/player_api.php?action=get_live_categories',
    liveStreams: '/player_api.php?action=get_live_streams',
    liveStreamsByCategory: '/player_api.php?action=get_live_streams&category_id=',
    
    // VOD (Movies)
    vodCategories: '/player_api.php?action=get_vod_categories',
    vodStreams: '/player_api.php?action=get_vod_streams',
    vodStreamsByCategory: '/player_api.php?action=get_vod_streams&category_id=',
    vodInfo: '/player_api.php?action=get_vod_info&vod_id=',
    
    // Series
    seriesCategories: '/player_api.php?action=get_series_categories',
    seriesStreams: '/player_api.php?action=get_series',
    seriesStreamsByCategory: '/player_api.php?action=get_series&category_id=',
    seriesInfo: '/player_api.php?action=get_series_info&series_id=',
    
    // Stream URLs
    liveStreamUrl: (streamId) => `/live/${CONFIG.xtream.username}/${CONFIG.xtream.password}/${streamId}.m3u8`,
    vodStreamUrl: (streamId) => `/movie/${CONFIG.xtream.username}/${CONFIG.xtream.password}/${streamId}.m3u8`,
    seriesStreamUrl: (streamId) => `/series/${CONFIG.xtream.username}/${CONFIG.xtream.password}/${streamId}.m3u8`
};

// TMDB API Endpoints
const TMDB_ENDPOINTS = {
    // Search
    searchMovie: '/search/movie',
    searchTv: '/search/tv',
    searchMulti: '/search/multi',
    searchPerson: '/search/person',
    
    // Details
    movieDetails: (id) => `/movie/${id}`,
    tvDetails: (id) => `/tv/${id}`,
    personDetails: (id) => `/person/${id}`,
    
    // Credits
    movieCredits: (id) => `/movie/${id}/credits`,
    tvCredits: (id) => `/tv/${id}/credits`,
    personMovieCredits: (id) => `/person/${id}/movie_credits`,
    personTvCredits: (id) => `/person/${id}/tv_credits`,
    
    // Additional
    movieRecommendations: (id) => `/movie/${id}/recommendations`,
    tvRecommendations: (id) => `/tv/${id}/recommendations`,
    movieVideos: (id) => `/movie/${id}/videos`,
    tvVideos: (id) => `/tv/${id}/videos`,
    
    // Configuration
    configuration: '/configuration'
};

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CONFIG, XTREAM_ENDPOINTS, TMDB_ENDPOINTS };
}
