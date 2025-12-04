/**
 * IPTV Player - Main Application
 */

class App {
    constructor() {
        this.currentScreen = 'home';
        this.isInitialized = false;
        this.screens = {
            home: homeScreen,
            live: liveScreen,
            movies: moviesScreen,
            series: seriesScreen,
            search: searchScreen,
            favorites: favoritesScreen,
            settings: settingsScreen
        };
    }

    /**
     * Initialize application
     */
    async init() {
        console.log('IPTV Player starting...');

        this.showLoading('Inicializando...');

        try {
            // Initialize storage
            this.showLoading('Preparando armazenamento...');
            await storage.init();

            // Authenticate with Xtream
            this.showLoading('Conectando ao servidor...');
            await xtream.authenticate();

            // Update connection status
            this.updateConnectionStatus(true);

            // Clear expired cache
            await storage.clearExpiredCache();

            // Load initial data
            this.showLoading('Carregando conteúdo...');
            await this.loadInitialData();

            // Initialize screens
            this.showLoading('Preparando interface...');
            await this.initializeScreens();

            // Setup event listeners
            this.setupEventListeners();

            // Hide loading, show app
            this.hideLoading();

            // Initialize navigation
            searchScreen.init();

            // Update time
            this.updateTime();
            setInterval(() => this.updateTime(), 60000);

            // Start garbage collection interval
            setInterval(() => this.garbageCollect(), CONFIG.memory.gcInterval);

            this.isInitialized = true;
            console.log('IPTV Player initialized successfully');

        } catch (error) {
            console.error('Initialization failed:', error);
            this.showError(error.message);
        }
    }

    /**
     * Load initial data
     */
    async loadInitialData() {
        try {
            // Load categories (this also caches them)
            await xtream.getAllContent();

            // Preload some content for home screen
            // This runs in background and doesn't block
            this.preloadContent();

        } catch (error) {
            console.warn('Could not load all initial data:', error);
        }
    }

    /**
     * Preload content for faster navigation
     */
    async preloadContent() {
        try {
            // Preload first category of each type
            const [liveCategories, vodCategories, seriesCategories] = await Promise.all([
                storage.getByIndex('categories', 'type', 'live'),
                storage.getByIndex('categories', 'type', 'movie'),
                storage.getByIndex('categories', 'type', 'series')
            ]);

            // Load first few items of each (in background)
            if (liveCategories[0]) {
                xtream.getLiveStreams(liveCategories[0].originalId).catch(() => { });
            }
            if (vodCategories[0]) {
                xtream.getVodStreams(vodCategories[0].originalId).catch(() => { });
            }
            if (seriesCategories[0]) {
                xtream.getSeriesStreams(seriesCategories[0].originalId).catch(() => { });
            }
        } catch (error) {
            console.warn('Preload failed:', error);
        }
    }

    /**
     * Initialize screens
     */
    async initializeScreens() {
        await homeScreen.init();
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Sidebar menu
        document.querySelectorAll('.menu-item').forEach(item => {
            item.addEventListener('click', () => {
                const screen = item.dataset.screen;
                if (screen) {
                    this.navigateToScreen(screen);
                }
            });
        });

        // Navigate home event
        window.addEventListener('navigateHome', () => {
            this.navigateToScreen('home');
        });

        // Color key events
        window.addEventListener('colorKey', (e) => {
            this.handleColorKey(e.detail.color);
        });
    }

    /**
     * Navigate to screen
     */
    async navigateToScreen(screenName) {
        if (screenName === this.currentScreen) return;

        // Update sidebar
        document.querySelectorAll('.menu-item').forEach(item => {
            item.classList.toggle('active', item.dataset.screen === screenName);
        });

        // Hide current screen
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });

        // Show new screen
        const newScreen = document.getElementById(`screen-${screenName}`);
        if (newScreen) {
            newScreen.classList.add('active');
        }

        // Initialize screen if needed
        const screenController = this.screens[screenName];
        if (screenController && screenController.init) {
            await screenController.init();
        }

        this.currentScreen = screenName;

        // Focus first element in new screen
        setTimeout(() => {
            const firstFocusable = newScreen?.querySelector('[data-focusable="true"]');
            if (firstFocusable) {
                firstFocusable.focus();
            }
        }, 100);
    }

    /**
     * Handle color keys
     */
    handleColorKey(color) {
        switch (color) {
            case 'red':
                // Toggle favorite or back
                break;
            case 'green':
                // Search
                this.navigateToScreen('search');
                break;
            case 'yellow':
                // Info/Details
                break;
            case 'blue':
                // Options/Settings
                this.navigateToScreen('settings');
                break;
        }
    }

    /**
     * Update connection status
     */
    updateConnectionStatus(connected) {
        const statusEl = document.querySelector('.connection-status');
        const textEl = document.querySelector('.connection-text');

        if (statusEl) {
            statusEl.classList.toggle('connected', connected);
        }
        if (textEl) {
            textEl.textContent = connected ? 'Conectado' : 'Desconectado';
        }
    }

    /**
     * Update time display
     */
    updateTime() {
        const timeEl = document.getElementById('current-time');
        if (timeEl) {
            const now = new Date();
            timeEl.textContent = now.toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit'
            });
        }
    }

    /**
     * Garbage collection
     */
    garbageCollect() {
        // Clear memory cache if too large
        if (storage.memoryCache && storage.memoryCache.size > CONFIG.memory.maxItemsInMemory * 2) {
            const toDelete = storage.memoryCache.size - CONFIG.memory.maxItemsInMemory;
            const keys = Array.from(storage.memoryCache.keys());

            for (let i = 0; i < toDelete; i++) {
                storage.memoryCache.delete(keys[i]);
            }

            console.log(`GC: Removed ${toDelete} items from memory cache`);
        }
    }

    /**
     * Show loading screen
     */
    showLoading(message) {
        const loadingScreen = document.getElementById('loading-screen');
        const messageEl = loadingScreen?.querySelector('.loading-message');

        if (loadingScreen) {
            loadingScreen.classList.remove('hidden');
        }
        if (messageEl) {
            messageEl.textContent = message || 'Carregando...';
        }
    }

    /**
     * Hide loading screen
     */
    hideLoading() {
        const loadingScreen = document.getElementById('loading-screen');
        const appContainer = document.getElementById('app');

        if (loadingScreen) {
            loadingScreen.classList.add('hidden');
        }
        if (appContainer) {
            appContainer.classList.remove('hidden');
        }
    }

    /**
     * Show error
     */
    showError(message) {
        const loadingScreen = document.getElementById('loading-screen');
        const content = loadingScreen?.querySelector('.loading-content');

        if (content) {
            content.innerHTML = `
                <div class="loading-logo">
                    <span class="logo-icon" style="color: var(--error)">⚠️</span>
                    <span class="logo-text">Erro</span>
                </div>
                <p class="loading-message" style="max-width:400px;text-align:center">${message}</p>
                <button class="action-btn primary" onclick="location.reload()" style="margin-top:20px">
                    Tentar Novamente
                </button>
            `;
        }
    }
}

// Create global instance
const app = new App();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    app.init();
});

// Handle webOS launch
if (typeof webOS !== 'undefined' && webOS.platformBack) {
    document.addEventListener('webOSLaunch', () => {
        console.log('webOS launch event received');
    });

    document.addEventListener('webOSRelaunch', () => {
        console.log('webOS relaunch event received');
    });
}
