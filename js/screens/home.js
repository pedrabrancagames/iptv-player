/**
 * IPTV Player - Home Screen
 */

class HomeScreen {
    constructor() {
        this.container = document.getElementById('home-content');
        this.heroData = null;
        this.recentItems = [];
    }

    /**
     * Initialize home screen
     */
    async init() {
        await this.render();
    }

    /**
     * Render home screen
     */
    async render() {
        this.container.innerHTML = `
            <div class="home-loading">
                <div class="loading-spinner"></div>
                <p>Carregando conteúdo...</p>
            </div>
        `;

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

            // Get some content for display
            let featuredMovies = [];
            let featuredSeries = [];

            try {
                const movies = await xtream.getVodStreams();
                featuredMovies = movies.slice(0, 15);
            } catch (e) {
                console.warn('Could not load movies:', e);
            }

            try {
                const series = await xtream.getSeriesStreams();
                featuredSeries = series.slice(0, 15);
            } catch (e) {
                console.warn('Could not load series:', e);
            }

            // Build HTML
            let html = '';

            // Quick Stats
            const movieCount = await storage.count('channels', 'type', 'movie');
            const seriesCount = await storage.count('channels', 'type', 'series');
            const liveCount = await storage.count('channels', 'type', 'live');

            html += `
                <div class="quick-stats">
                    <div class="stat-card">
                        <div class="stat-icon">📺</div>
                        <div class="stat-info">
                            <div class="stat-value">${liveCount || '—'}</div>
                            <div class="stat-label">Canais ao Vivo</div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">🎬</div>
                        <div class="stat-info">
                            <div class="stat-value">${movieCount || '—'}</div>
                            <div class="stat-label">Filmes</div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">📺</div>
                        <div class="stat-info">
                            <div class="stat-value">${seriesCount || '—'}</div>
                            <div class="stat-label">Séries</div>
                        </div>
                    </div>
                    <div class="stat-card">
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
                            <h2 class="row-title">Continuar Assistindo</h2>
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
                            <h2 class="row-title">Meus Favoritos</h2>
                            <span class="row-action" data-screen="favorites">Ver todos</span>
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
                            <h2 class="row-title">Filmes em Destaque</h2>
                            <span class="row-action" data-screen="movies">Ver todos</span>
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
                            <h2 class="row-title">Séries em Destaque</h2>
                            <span class="row-action" data-screen="series">Ver todos</span>
                        </div>
                        <div class="row-content" id="featured-series-row">
                            ${featuredSeries.map(item => this.renderContentCard(item)).join('')}
                        </div>
                    </div>
                `;
            }

            // Empty state
            if (html === '') {
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
     * Render continue watching card
     */
    renderContinueCard(item) {
        const progress = (item.progress * 100).toFixed(0);
        const poster = item.stream_icon || item.cover || item.posterPath;
        const title = item.name || item.title;

        return `
            <div class="continue-card" data-focusable="true" data-item-id="${item.id}" tabindex="0">
                ${poster
                ? `<img class="continue-thumbnail" src="${poster}" alt="${title}">`
                : '<div class="continue-thumbnail" style="background:var(--bg-tertiary)"></div>'
            }
                <div class="continue-overlay">
                    <div class="continue-progress">
                        <div class="continue-progress-bar" style="width: ${progress}%"></div>
                    </div>
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

        return `
            <div class="content-card" data-focusable="true" data-item-id="${item.id}" tabindex="0">
                <div class="card-poster">
                    ${poster
                ? `<img src="${poster}" alt="${title}" loading="lazy">`
                : '<div class="card-poster-placeholder">🎬</div>'
            }
                    ${rating ? `<div class="card-rating">★ ${parseFloat(rating).toFixed(1)}</div>` : ''}
                </div>
                <div class="card-info">
                    <div class="card-title">${title || 'Sem título'}</div>
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
        await this.render();
    }
}

// Create global instance
const homeScreen = new HomeScreen();
