/**
 * IPTV Player - Home Screen
 * With Hero Banner, Skeleton Loading, and Continue Watching
 */

class HomeScreen {
    constructor() {
        this.container = document.getElementById('home-content');
        this.heroData = null;
        this.recentItems = [];
        this.heroIndex = 0;
        this.heroInterval = null;
    }

    /**
     * Initialize home screen
     */
    async init() {
        await this.render();
    }

    /**
     * Render skeleton loading state
     */
    renderSkeleton() {
        return `
            <!-- Hero Skeleton -->
            <div class="hero-banner skeleton-hero">
                <div class="skeleton-shimmer"></div>
            </div>
            
            <!-- Stats Skeleton -->
            <div class="quick-stats">
                ${[1, 2, 3, 4].map(() => `
                    <div class="stat-card skeleton">
                        <div class="skeleton-shimmer"></div>
                    </div>
                `).join('')}
            </div>
            
            <!-- Row Skeleton -->
            <div class="content-row">
                <div class="row-header">
                    <div class="skeleton-text" style="width: 200px; height: 24px;"></div>
                </div>
                <div class="row-content">
                    ${[1, 2, 3, 4, 5, 6].map(() => `
                        <div class="content-card skeleton">
                            <div class="card-poster skeleton-poster">
                                <div class="skeleton-shimmer"></div>
                            </div>
                            <div class="card-info">
                                <div class="skeleton-text" style="width: 80%; height: 16px;"></div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    /**
     * Render home screen
     */
    async render() {
        // Show skeleton first
        this.container.innerHTML = this.renderSkeleton();

        try {
            // Load continue watching
            const history = await storage.getAll('history');
            const continueWatching = history
                .filter(h => h.progress > 0 && h.progress < 0.95)
                .sort((a, b) => b.watchedAt - a.watchedAt)
                .slice(0, 10);

            // Load favorites
            const favorites = await storage.getAll('favorites');
            const recentFavorites = favorites
                .sort((a, b) => b.addedAt - a.addedAt)
                .slice(0, 10);

            // Get content for display
            let featuredMovies = [];
            let featuredSeries = [];

            try {
                const movies = await xtream.getVodStreams();
                featuredMovies = movies.slice(0, 20);
            } catch (e) {
                console.warn('Could not load movies:', e);
            }

            try {
                const series = await xtream.getSeriesStreams();
                featuredSeries = series.slice(0, 20);
            } catch (e) {
                console.warn('Could not load series:', e);
            }

            // Select hero items (random featured content)
            const heroItems = [...featuredMovies.slice(0, 5), ...featuredSeries.slice(0, 5)]
                .filter(item => item.stream_icon || item.cover)
                .slice(0, 5);

            // Build HTML
            let html = '';

            // Hero Banner
            if (heroItems.length > 0) {
                html += this.renderHeroBanner(heroItems);
            }

            // Quick Stats
            const movieCount = await storage.count('channels', 'type', 'movie');
            const seriesCount = await storage.count('channels', 'type', 'series');
            const liveCount = await storage.count('channels', 'type', 'live');

            html += `
                <div class="quick-stats">
                    <div class="stat-card" data-focusable="true" data-screen="live" tabindex="0">
                        <div class="stat-icon">📺</div>
                        <div class="stat-info">
                            <div class="stat-value">${liveCount || '—'}</div>
                            <div class="stat-label">Canais ao Vivo</div>
                        </div>
                    </div>
                    <div class="stat-card" data-focusable="true" data-screen="movies" tabindex="0">
                        <div class="stat-icon">🎬</div>
                        <div class="stat-info">
                            <div class="stat-value">${movieCount || '—'}</div>
                            <div class="stat-label">Filmes</div>
                        </div>
                    </div>
                    <div class="stat-card" data-focusable="true" data-screen="series" tabindex="0">
                        <div class="stat-icon">📺</div>
                        <div class="stat-info">
                            <div class="stat-value">${seriesCount || '—'}</div>
                            <div class="stat-label">Séries</div>
                        </div>
                    </div>
                    <div class="stat-card" data-focusable="true" data-screen="favorites" tabindex="0">
                        <div class="stat-icon">❤️</div>
                        <div class="stat-info">
                            <div class="stat-value">${favorites.length}</div>
                            <div class="stat-label">Favoritos</div>
                        </div>
                    </div>
                </div>
            `;

            // Continue Watching
            if (continueWatching.length > 0) {
                html += `
                    <div class="content-row">
                        <div class="row-header">
                            <h2 class="row-title">▶️ Continuar Assistindo</h2>
                        </div>
                        <div class="row-content" id="continue-watching-row">
                            ${continueWatching.map(item => this.renderContinueCard(item)).join('')}
                        </div>
                    </div>
                `;
            }

            // Favorites Row
            if (recentFavorites.length > 0) {
                html += `
                    <div class="content-row">
                        <div class="row-header">
                            <h2 class="row-title">❤️ Meus Favoritos</h2>
                            <span class="row-action" data-screen="favorites">Ver todos →</span>
                        </div>
                        <div class="row-content" id="favorites-row">
                            ${recentFavorites.map(item => this.renderContentCard(item)).join('')}
                        </div>
                    </div>
                `;
            }

            // Featured Movies
            if (featuredMovies.length > 0) {
                html += `
                    <div class="content-row">
                        <div class="row-header">
                            <h2 class="row-title">🎬 Filmes em Destaque</h2>
                            <span class="row-action" data-screen="movies">Ver todos →</span>
                        </div>
                        <div class="row-content" id="featured-movies-row">
                            ${featuredMovies.map(item => this.renderContentCard(item)).join('')}
                        </div>
                    </div>
                `;
            }

            // Featured Series
            if (featuredSeries.length > 0) {
                html += `
                    <div class="content-row">
                        <div class="row-header">
                            <h2 class="row-title">📺 Séries em Destaque</h2>
                            <span class="row-action" data-screen="series">Ver todos →</span>
                        </div>
                        <div class="row-content" id="featured-series-row">
                            ${featuredSeries.map(item => this.renderContentCard(item)).join('')}
                        </div>
                    </div>
                `;
            }

            // Empty state
            if (!heroItems.length && !continueWatching.length && !featuredMovies.length) {
                html = `
                    <div class="empty-state">
                        <div class="empty-icon">📺</div>
                        <h2 class="empty-title">Bem-vindo ao IPTV Player</h2>
                        <p class="empty-description">
                            Navegue pelas categorias para começar a assistir seus conteúdos favoritos.
                        </p>
                    </div>
                `;
            }

            this.container.innerHTML = html;
            this.bindEvents();

            // Start hero auto-rotation
            if (heroItems.length > 1) {
                this.startHeroRotation(heroItems);
            }

        } catch (error) {
            console.error('Home render error:', error);
            this.container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">⚠️</div>
                    <h2 class="empty-title">Erro ao carregar</h2>
                    <p class="empty-description">${error.message}</p>
                </div>
            `;
        }
    }

    /**
     * Render Hero Banner
     */
    renderHeroBanner(items) {
        const firstItem = items[0];
        const poster = firstItem.stream_icon || firstItem.cover;
        const title = firstItem.name || firstItem.title;
        const plot = firstItem.plot || firstItem.overview || '';

        return `
            <div class="hero-banner" id="hero-banner">
                <div class="hero-backdrop" style="background-image: url('${poster}')"></div>
                <div class="hero-gradient"></div>
                <div class="hero-content">
                    <h1 class="hero-title" id="hero-title">${title}</h1>
                    <p class="hero-description" id="hero-description">${plot.substring(0, 200)}${plot.length > 200 ? '...' : ''}</p>
                    <div class="hero-actions">
                        <button class="hero-btn primary" data-focusable="true" id="hero-play" data-item-index="0">
                            ▶ Assistir
                        </button>
                        <button class="hero-btn secondary" data-focusable="true" id="hero-info" data-item-index="0">
                            ℹ️ Mais Info
                        </button>
                    </div>
                    ${items.length > 1 ? `
                        <div class="hero-indicators">
                            ${items.map((_, i) => `
                                <button class="hero-indicator ${i === 0 ? 'active' : ''}" 
                                        data-index="${i}"
                                        data-focusable="true"></button>
                            `).join('')}
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    /**
     * Start hero rotation
     */
    startHeroRotation(items) {
        if (this.heroInterval) {
            clearInterval(this.heroInterval);
        }

        this.heroItems = items;
        this.heroIndex = 0;

        this.heroInterval = setInterval(() => {
            this.heroIndex = (this.heroIndex + 1) % items.length;
            this.updateHero(items[this.heroIndex], this.heroIndex);
        }, 8000);

        // Indicator click handlers
        document.querySelectorAll('.hero-indicator').forEach(indicator => {
            indicator.addEventListener('click', () => {
                const index = parseInt(indicator.dataset.index);
                this.heroIndex = index;
                this.updateHero(items[index], index);

                // Reset interval
                clearInterval(this.heroInterval);
                this.heroInterval = setInterval(() => {
                    this.heroIndex = (this.heroIndex + 1) % items.length;
                    this.updateHero(items[this.heroIndex], this.heroIndex);
                }, 8000);
            });
        });
    }

    /**
     * Update hero content
     */
    updateHero(item, index) {
        const banner = document.getElementById('hero-banner');
        if (!banner) return;

        const backdrop = banner.querySelector('.hero-backdrop');
        const title = document.getElementById('hero-title');
        const description = document.getElementById('hero-description');
        const playBtn = document.getElementById('hero-play');
        const infoBtn = document.getElementById('hero-info');

        // Fade out
        banner.classList.add('transitioning');

        setTimeout(() => {
            const poster = item.stream_icon || item.cover;
            const plot = item.plot || item.overview || '';

            backdrop.style.backgroundImage = `url('${poster}')`;
            title.textContent = item.name || item.title;
            description.textContent = plot.substring(0, 200) + (plot.length > 200 ? '...' : '');
            playBtn.dataset.itemIndex = index;
            infoBtn.dataset.itemIndex = index;

            // Update indicators
            document.querySelectorAll('.hero-indicator').forEach((ind, i) => {
                ind.classList.toggle('active', i === index);
            });

            // Fade in
            banner.classList.remove('transitioning');
        }, 300);
    }

    /**
     * Render continue watching card
     */
    renderContinueCard(item) {
        const progress = (item.progress * 100).toFixed(0);
        const poster = item.stream_icon || item.cover || item.posterPath;
        const title = item.name || item.title;

        return `
            <div class="continue-card" data-focusable="true" data-item-id="${item.id}" tabindex="0">
                <div class="continue-thumbnail-wrapper">
                    ${poster
                ? `<img class="continue-thumbnail" src="${poster}" alt="${title}">`
                : '<div class="continue-thumbnail placeholder">🎬</div>'
            }
                    <div class="continue-play-icon">▶</div>
                </div>
                <div class="continue-overlay">
                    <div class="continue-progress">
                        <div class="continue-progress-bar" style="width: ${progress}%"></div>
                    </div>
                </div>
                <div class="continue-info">
                    <div class="continue-title">${title}</div>
                    <div class="continue-meta">${progress}% assistido</div>
                </div>
            </div>
        `;
    }

    /**
     * Render content card
     */
    renderContentCard(item) {
        const poster = item.stream_icon || item.cover || item.posterPath;
        const title = item.name || item.title;
        const rating = item.rating || item.vote_average;
        const year = item.releasedate || item.year;

        return `
            <div class="content-card" data-focusable="true" data-item-id="${item.id}" tabindex="0">
                <div class="card-poster">
                    ${poster
                ? `<img src="${poster}" alt="${title}" loading="lazy">`
                : '<div class="card-poster-placeholder">🎬</div>'
            }
                    ${rating ? `<div class="card-rating">★ ${parseFloat(rating).toFixed(1)}</div>` : ''}
                    <div class="card-overlay">
                        <div class="card-play-icon">▶</div>
                    </div>
                </div>
                <div class="card-info">
                    <div class="card-title">${title || 'Sem título'}</div>
                    ${year ? `<div class="card-year">${year}</div>` : ''}
                </div>
            </div>
        `;
    }

    /**
     * Bind events
     */
    bindEvents() {
        // Content cards
        this.container.querySelectorAll('.content-card, .continue-card').forEach(card => {
            card.addEventListener('click', async () => {
                const itemId = card.dataset.itemId;
                const item = await this.findItem(itemId);
                if (item) {
                    if (card.classList.contains('continue-card')) {
                        player.play(item);
                    } else {
                        modal.showDetail(item);
                    }
                }
            });
        });

        // Row actions
        this.container.querySelectorAll('.row-action').forEach(action => {
            action.addEventListener('click', () => {
                const screen = action.dataset.screen;
                if (screen) {
                    app.navigateToScreen(screen);
                }
            });
        });

        // Stat cards - navigate to screens
        this.container.querySelectorAll('.stat-card[data-screen]').forEach(card => {
            card.addEventListener('click', () => {
                const screen = card.dataset.screen;
                if (screen) {
                    app.navigateToScreen(screen);
                }
            });
        });

        // Hero buttons
        const heroPlay = document.getElementById('hero-play');
        const heroInfo = document.getElementById('hero-info');

        if (heroPlay && this.heroItems) {
            heroPlay.addEventListener('click', () => {
                const index = parseInt(heroPlay.dataset.itemIndex);
                const item = this.heroItems[index];
                if (item) player.play(item);
            });
        }

        if (heroInfo && this.heroItems) {
            heroInfo.addEventListener('click', () => {
                const index = parseInt(heroInfo.dataset.itemIndex);
                const item = this.heroItems[index];
                if (item) modal.showDetail(item);
            });
        }
    }

    /**
     * Find item by ID
     */
    async findItem(id) {
        // Check history first
        let item = await storage.get('history', id);
        if (item) return item;

        // Check favorites
        item = await storage.get('favorites', id);
        if (item) return item;

        // Check channels
        item = await storage.get('channels', id);
        return item;
    }

    /**
     * Refresh home screen
     */
    async refresh() {
        if (this.heroInterval) {
            clearInterval(this.heroInterval);
        }
        await this.render();
    }

    /**
     * Cleanup
     */
    destroy() {
        if (this.heroInterval) {
            clearInterval(this.heroInterval);
        }
    }
}

// Create global instance
const homeScreen = new HomeScreen();
