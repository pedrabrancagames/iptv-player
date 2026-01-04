/**
 * IPTV Player - Search Screen
 */

class SearchScreen {
    constructor() {
        this.input = document.getElementById('search-input');
        this.resultsContainer = document.getElementById('search-results');
        this.searchTimeout = null;
        this.lastQuery = '';
    }

    /**
     * Initialize screen
     */
    init() {
        this.input.addEventListener('input', () => this.handleInput());
        this.input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.performSearch();
            }
        });
    }

    /**
     * Handle input with debounce
     */
    handleInput() {
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }

        this.searchTimeout = setTimeout(() => {
            this.performSearch();
        }, CONFIG.ui.searchDebounce);
    }

    /**
     * Perform search
     */
    async performSearch() {
        const query = this.input.value.trim();

        if (query.length < 2) {
            this.resultsContainer.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">🔍</div>
                    <h2 class="empty-title">Digite para buscar</h2>
                    <p class="empty-description">Busque por filmes, séries ou canais</p>
                </div>
            `;
            return;
        }

        if (query === this.lastQuery) return;
        this.lastQuery = query;

        this.resultsContainer.innerHTML = '<div class="loading-spinner" style="margin:auto"></div>';

        try {
            // Search in local storage first
            const localResults = await xtream.search(query);

            // Also search TMDB
            let tmdbResults = { results: [] };
            try {
                tmdbResults = await tmdb.searchMulti(query);
            } catch (e) {
                console.warn('TMDB search failed:', e);
            }

            this.renderResults(localResults, tmdbResults.results, query);

        } catch (error) {
            console.error('Search failed:', error);
            this.resultsContainer.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">⚠️</div>
                    <h2 class="empty-title">Erro na busca</h2>
                    <p class="empty-description">${error.message}</p>
                </div>
            `;
        }
    }

    /**
     * Render search results
     */
    renderResults(localResults, tmdbResults, query) {
        let html = '';
        const hasLocal = localResults.live.length > 0 ||
            localResults.movies.length > 0 ||
            localResults.series.length > 0;

        // Local results - in your list
        if (hasLocal) {
            html += `<h3 style="margin-bottom: 16px; color: var(--text-secondary)">Na sua lista</h3>`;

            if (localResults.live.length > 0) {
                html += `
                    <div class="content-row">
                        <div class="row-header">
                            <h2 class="row-title">Canais (${localResults.live.length})</h2>
                        </div>
                        <div class="row-content">
                            ${localResults.live.slice(0, 10).map(item => this.renderCard(item, 'live')).join('')}
                        </div>
                    </div>
                `;
            }

            if (localResults.movies.length > 0) {
                html += `
                    <div class="content-row">
                        <div class="row-header">
                            <h2 class="row-title">Filmes (${localResults.movies.length})</h2>
                        </div>
                        <div class="row-content">
                            ${localResults.movies.slice(0, 10).map(item => this.renderCard(item, 'movie')).join('')}
                        </div>
                    </div>
                `;
            }

            if (localResults.series.length > 0) {
                html += `
                    <div class="content-row">
                        <div class="row-header">
                            <h2 class="row-title">Séries (${localResults.series.length})</h2>
                        </div>
                        <div class="row-content">
                            ${localResults.series.slice(0, 10).map(item => this.renderCard(item, 'series')).join('')}
                        </div>
                    </div>
                `;
            }
        }

        // TMDB results
        if (tmdbResults.length > 0) {
            const movies = tmdbResults.filter(r => r.type === 'movie');
            const tvShows = tmdbResults.filter(r => r.type === 'tv');
            const people = tmdbResults.filter(r => r.type === 'person');

            html += `<h3 style="margin: 24px 0 16px; color: var(--text-secondary)">Resultados TMDB</h3>`;

            if (movies.length > 0) {
                html += `
                    <div class="content-row">
                        <div class="row-header">
                            <h2 class="row-title">Filmes</h2>
                        </div>
                        <div class="row-content" data-type="tmdb-movies">
                            ${movies.slice(0, 10).map(item => this.renderTmdbCard(item)).join('')}
                        </div>
                    </div>
                `;
            }

            if (tvShows.length > 0) {
                html += `
                    <div class="content-row">
                        <div class="row-header">
                            <h2 class="row-title">Séries</h2>
                        </div>
                        <div class="row-content" data-type="tmdb-tv">
                            ${tvShows.slice(0, 10).map(item => this.renderTmdbCard(item)).join('')}
                        </div>
                    </div>
                `;
            }

            if (people.length > 0) {
                html += `
                    <div class="content-row">
                        <div class="row-header">
                            <h2 class="row-title">Pessoas</h2>
                        </div>
                        <div class="row-content" data-type="tmdb-people">
                            ${people.slice(0, 10).map(person => `
                                <div class="cast-card" data-focusable="true" data-person-id="${person.tmdbId}" tabindex="0">
                                    <div class="cast-photo">
                                        ${person.profilePath
                        ? `<img src="${person.profilePath}" alt="${person.name}">`
                        : '<div class="cast-photo-placeholder">👤</div>'
                    }
                                    </div>
                                    <div class="cast-name">${person.name}</div>
                                    <div class="cast-character">${person.knownFor || ''}</div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
            }
        }

        if (!html) {
            html = `
                <div class="empty-state">
                    <div class="empty-icon">🔍</div>
                    <h2 class="empty-title">Nenhum resultado</h2>
                    <p class="empty-description">Nenhum resultado encontrado para "${query}"</p>
                </div>
            `;
        }

        this.resultsContainer.innerHTML = html;
        this.bindEvents();
    }

    /**
     * Render local content card
     */
    renderCard(item, type) {
        const posterUrl = item.stream_icon || item.cover || item.posterPath;
        const poster = ImageUtils.getSecureImageUrl(posterUrl);
        const title = item.name || item.title;
        const placeholder = ImageUtils.getPlaceholder(type);

        return `
            <div class="content-card" data-focusable="true" data-item-id="${item.id}" data-type="${type}" tabindex="0">
                <div class="card-poster">
                    ${poster
                ? `<img src="${poster}" alt="${title}" loading="lazy" onerror="this.src='${placeholder}'">`
                : `<div class="card-poster-placeholder">${type === 'live' ? '📺' : '🎬'}</div>`
            }
                </div>
                <div class="card-info">
                    <div class="card-title">${title || 'Sem título'}</div>
                </div>
            </div>
        `;
    }

    /**
     * Render TMDB card
     */
    renderTmdbCard(item) {
        return `
            <div class="content-card" data-focusable="true" data-tmdb-id="${item.tmdbId}" data-tmdb-type="${item.type}" tabindex="0">
                <div class="card-poster">
                    ${item.posterPath
                ? `<img src="${item.posterPath}" alt="${item.title}" loading="lazy">`
                : '<div class="card-poster-placeholder">🎬</div>'
            }
                    ${item.rating ? `<div class="card-rating">★ ${item.rating.toFixed(1)}</div>` : ''}
                </div>
                <div class="card-info">
                    <div class="card-title">${item.title || 'Sem título'}</div>
                    <div class="card-meta">${item.year || ''}</div>
                </div>
            </div>
        `;
    }

    /**
     * Bind events
     */
    bindEvents() {
        // Local content cards
        this.resultsContainer.querySelectorAll('.content-card[data-item-id]').forEach(card => {
            card.addEventListener('click', async () => {
                const itemId = card.dataset.itemId;
                const type = card.dataset.type;
                const item = await storage.get('channels', itemId);

                if (item) {
                    if (type === 'live') {
                        player.play(item);
                    } else {
                        modal.showDetail(item);
                    }
                }
            });
        });

        // TMDB cards
        this.resultsContainer.querySelectorAll('.content-card[data-tmdb-id]').forEach(card => {
            card.addEventListener('click', async () => {
                const tmdbId = parseInt(card.dataset.tmdbId);
                const type = card.dataset.tmdbType;

                try {
                    let tmdbData;
                    if (type === 'movie') {
                        tmdbData = await tmdb.getMovieDetails(tmdbId);
                    } else {
                        tmdbData = await tmdb.getTvDetails(tmdbId);
                    }

                    // Try to find in IPTV list
                    const channels = await storage.getByIndex('channels', 'type', type === 'movie' ? 'movie' : 'series');
                    const matches = await tmdb.findInIPTVList(tmdbData, channels);

                    if (matches.length > 0) {
                        modal.showDetail(matches[0], tmdbData);
                    } else {
                        toast.warning('Não disponível', 'Este título não está na sua lista IPTV');
                    }
                } catch (error) {
                    console.error('Failed to load TMDB details:', error);
                }
            });
        });

        // People cards
        this.resultsContainer.querySelectorAll('.cast-card').forEach(card => {
            card.addEventListener('click', () => {
                const personId = parseInt(card.dataset.personId);
                modal.showPerson(personId);
            });
        });
    }

    /**
     * Focus input
     */
    focus() {
        this.input.focus();
    }

    /**
     * Clear search
     */
    clear() {
        this.input.value = '';
        this.lastQuery = '';
        this.resultsContainer.innerHTML = '';
    }
}

const searchScreen = new SearchScreen();
