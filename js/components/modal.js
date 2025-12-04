/**
 * IPTV Player - Modal Component
 * Handles detail and person modals
 */

class ModalManager {
    constructor() {
        this.detailModal = document.getElementById('detail-modal');
        this.personModal = document.getElementById('person-modal');
        this.currentModal = null;

        this.init();
    }

    /**
     * Initialize modals
     */
    init() {
        // Close modal events
        window.addEventListener('closeModal', () => this.closeAll());

        // Backdrop click to close
        document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
            backdrop.addEventListener('click', () => this.closeAll());
        });

        console.log('Modal manager initialized');
    }

    /**
     * Show detail modal
     */
    async showDetail(item, tmdbData = null) {
        this.currentModal = this.detailModal;

        // Set initial data from IPTV item
        this.setDetailBasicInfo(item);

        // Show modal
        this.detailModal.classList.remove('hidden');
        this.detailModal.classList.add('active');
        navigation.setModalOpen(true);

        // Load TMDB data if not provided
        if (!tmdbData) {
            try {
                const type = item.type === 'movie' ? 'movie' : 'tv';
                const searchResult = await tmdb.matchContent(item.name || item.title, type);

                if (searchResult) {
                    if (type === 'movie') {
                        tmdbData = await tmdb.getMovieDetails(searchResult.tmdbId);
                    } else {
                        tmdbData = await tmdb.getTvDetails(searchResult.tmdbId);
                    }
                }
            } catch (error) {
                console.warn('Failed to load TMDB data:', error);
            }
        }

        // Update with TMDB data
        if (tmdbData) {
            this.setDetailTmdbInfo(tmdbData, item);
        }

        // Focus first action button
        setTimeout(() => {
            const firstBtn = this.detailModal.querySelector('.action-btn');
            if (firstBtn) firstBtn.focus();
        }, 300);
    }

    /**
     * Set basic detail info
     */
    setDetailBasicInfo(item) {
        const title = item.name || item.title || 'Sem título';
        const poster = item.stream_icon || item.cover || item.posterPath;

        document.getElementById('detail-title').textContent = title;
        document.getElementById('detail-overview').textContent = item.plot || item.overview || 'Sem descrição disponível.';

        // Backdrop
        const backdrop = document.getElementById('detail-backdrop');
        if (poster) {
            backdrop.style.backgroundImage = `url(${poster})`;
        } else {
            backdrop.style.backgroundImage = 'none';
        }

        // Poster
        const posterEl = document.getElementById('detail-poster');
        if (poster) {
            posterEl.innerHTML = `<img src="${poster}" alt="${title}">`;
        } else {
            posterEl.innerHTML = '<div class="card-poster-placeholder" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:48px">🎬</div>';
        }

        // Stats
        const stats = [];
        if (item.releasedate || item.year) {
            stats.push(`<span class="detail-stat">📅 ${item.releasedate || item.year}</span>`);
        }
        if (item.duration || item.runtime) {
            stats.push(`<span class="detail-stat">⏱️ ${item.duration || item.runtime} min</span>`);
        }
        if (item.rating || item.vote_average) {
            const rating = parseFloat(item.rating || item.vote_average).toFixed(1);
            stats.push(`<span class="detail-stat rating">★ ${rating}</span>`);
        }
        document.getElementById('detail-stats').innerHTML = stats.join('');

        // Actions
        document.getElementById('detail-actions').innerHTML = `
            <button class="action-btn primary" data-focusable="true" id="btn-play-detail">
                ▶ Assistir
            </button>
            <button class="action-btn secondary" data-focusable="true" id="btn-favorite-detail">
                ❤️ Favorito
            </button>
        `;

        // Play button event
        document.getElementById('btn-play-detail').addEventListener('click', () => {
            this.closeAll();
            player.play(item);
        });

        // Favorite button event
        document.getElementById('btn-favorite-detail').addEventListener('click', async () => {
            await this.toggleFavorite(item);
        });

        // Clear cast and crew until loaded
        document.getElementById('detail-cast').innerHTML = '';
        document.getElementById('detail-crew').innerHTML = '';
    }

    /**
     * Set TMDB info
     */
    setDetailTmdbInfo(tmdbData, iptvItem) {
        // Update backdrop with high quality image
        if (tmdbData.backdropPath) {
            const backdrop = document.getElementById('detail-backdrop');
            backdrop.style.backgroundImage = `url(${tmdbData.backdropPath})`;
        }

        // Update poster
        if (tmdbData.posterPath) {
            const posterEl = document.getElementById('detail-poster');
            posterEl.innerHTML = `<img src="${tmdbData.posterPath}" alt="${tmdbData.title}">`;
        }

        // Update title and overview
        document.getElementById('detail-title').textContent = tmdbData.title;
        document.getElementById('detail-overview').textContent = tmdbData.overview || 'Sem descrição disponível.';

        // Update stats
        const stats = [];
        if (tmdbData.year) {
            stats.push(`<span class="detail-stat">📅 ${tmdbData.year}</span>`);
        }
        if (tmdbData.runtime || tmdbData.episodeRunTime) {
            stats.push(`<span class="detail-stat">⏱️ ${tmdbData.runtime || tmdbData.episodeRunTime} min</span>`);
        }
        if (tmdbData.rating) {
            stats.push(`<span class="detail-stat rating">★ ${tmdbData.rating.toFixed(1)}</span>`);
        }
        if (tmdbData.numberOfSeasons) {
            stats.push(`<span class="detail-stat">📺 ${tmdbData.numberOfSeasons} temporadas</span>`);
        }
        document.getElementById('detail-stats').innerHTML = stats.join('');

        // Genres
        if (tmdbData.genres && tmdbData.genres.length > 0) {
            const genresHtml = tmdbData.genres.map(g =>
                `<span class="genre-tag">${g.name}</span>`
            ).join('');

            const statsEl = document.getElementById('detail-stats');
            statsEl.innerHTML += `<div class="detail-genres" style="margin-top:12px">${genresHtml}</div>`;
        }

        // Cast
        if (tmdbData.cast && tmdbData.cast.length > 0) {
            const castHtml = `
                <div class="detail-section">
                    <h3 class="detail-section-title">Elenco</h3>
                    <div class="cast-grid">
                        ${tmdbData.cast.slice(0, 10).map(person => `
                            <div class="cast-card" data-focusable="true" data-person-id="${person.tmdbId}" tabindex="0">
                                <div class="cast-photo">
                                    ${person.profilePath
                    ? `<img src="${person.profilePath}" alt="${person.name}">`
                    : '<div class="cast-photo-placeholder">👤</div>'
                }
                                </div>
                                <div class="cast-name">${person.name}</div>
                                <div class="cast-character">${person.character || ''}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
            document.getElementById('detail-cast').innerHTML = castHtml;

            // Add click handlers to cast members
            document.querySelectorAll('.cast-card').forEach(card => {
                card.addEventListener('click', () => {
                    const personId = card.dataset.personId;
                    if (personId) {
                        this.showPerson(parseInt(personId));
                    }
                });
            });
        }

        // Crew (Director, Writer)
        if (tmdbData.crew) {
            const crewItems = [];

            if (tmdbData.crew.Director) {
                crewItems.push(`<strong>Diretor:</strong> ${tmdbData.crew.Director.map(d =>
                    `<span class="crew-link" data-person-id="${d.tmdbId}" data-focusable="true" tabindex="0">${d.name}</span>`
                ).join(', ')}`);
            }

            if (tmdbData.crew.Writer || tmdbData.crew.Screenplay) {
                const writers = [...(tmdbData.crew.Writer || []), ...(tmdbData.crew.Screenplay || [])];
                const uniqueWriters = [...new Map(writers.map(w => [w.tmdbId, w])).values()];
                crewItems.push(`<strong>Roteiro:</strong> ${uniqueWriters.map(w =>
                    `<span class="crew-link" data-person-id="${w.tmdbId}" data-focusable="true" tabindex="0">${w.name}</span>`
                ).join(', ')}`);
            }

            if (crewItems.length > 0) {
                document.getElementById('detail-crew').innerHTML = `
                    <div class="detail-section">
                        <h3 class="detail-section-title">Equipe</h3>
                        <div class="crew-list" style="color: var(--text-secondary); line-height: 1.8">
                            ${crewItems.join('<br>')}
                        </div>
                    </div>
                `;

                // Add click handlers to crew
                document.querySelectorAll('.crew-link').forEach(link => {
                    link.style.cssText = 'color: var(--accent-primary); cursor: pointer;';
                    link.addEventListener('click', () => {
                        const personId = link.dataset.personId;
                        if (personId) {
                            this.showPerson(parseInt(personId));
                        }
                    });
                });
            }
        }
    }

    /**
     * Show person modal
     */
    async showPerson(personId) {
        this.currentModal = this.personModal;

        // Show loading state
        document.getElementById('person-name').textContent = 'Carregando...';
        document.getElementById('person-bio').textContent = '';
        document.getElementById('person-photo').innerHTML = '<div class="cast-photo-placeholder" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:48px">👤</div>';
        document.getElementById('person-movies').innerHTML = '';
        document.getElementById('person-series').innerHTML = '';

        // Show modal
        this.personModal.classList.remove('hidden');
        this.personModal.classList.add('active');

        try {
            // Load person details
            const personData = await tmdb.getPersonDetails(personId);

            // Update UI
            document.getElementById('person-name').textContent = personData.name;
            document.getElementById('person-bio').textContent = personData.biography || 'Biografia não disponível.';

            if (personData.profilePath) {
                document.getElementById('person-photo').innerHTML = `<img src="${personData.profilePath}" alt="${personData.name}">`;
            }

            // Load filmography that matches IPTV list
            await this.loadPersonFilmography(personData);

        } catch (error) {
            console.error('Failed to load person:', error);
            toast.error('Erro', 'Não foi possível carregar informações da pessoa');
        }
    }

    /**
     * Load person filmography filtered by IPTV list
     */
    async loadPersonFilmography(personData) {
        // Get all movies and series from IPTV
        const [iptvMovies, iptvSeries] = await Promise.all([
            storage.getByIndex('channels', 'type', 'movie'),
            storage.getByIndex('channels', 'type', 'series')
        ]);

        // Match movies
        const matchedMovies = [];
        for (const credit of personData.movieCredits.cast.slice(0, 50)) {
            const matches = await tmdb.findInIPTVList(credit, iptvMovies);
            if (matches.length > 0) {
                matchedMovies.push({
                    ...credit,
                    iptvItem: matches[0]
                });
            }
        }

        // Match series
        const matchedSeries = [];
        for (const credit of personData.tvCredits.cast.slice(0, 50)) {
            const matches = await tmdb.findInIPTVList(credit, iptvSeries);
            if (matches.length > 0) {
                matchedSeries.push({
                    ...credit,
                    iptvItem: matches[0]
                });
            }
        }

        // Render movies
        const moviesContainer = document.getElementById('person-movies');
        if (matchedMovies.length > 0) {
            moviesContainer.innerHTML = matchedMovies.map(movie => `
                <div class="content-card" data-focusable="true" data-item-id="${movie.iptvItem.id}" tabindex="0">
                    <div class="card-poster">
                        ${movie.posterPath
                    ? `<img src="${movie.posterPath}" alt="${movie.title}">`
                    : '<div class="card-poster-placeholder">🎬</div>'
                }
                    </div>
                    <div class="card-info">
                        <div class="card-title">${movie.title}</div>
                        <div class="card-meta">${movie.year || ''}</div>
                    </div>
                </div>
            `).join('');

            // Add click handlers
            moviesContainer.querySelectorAll('.content-card').forEach((card, index) => {
                card.addEventListener('click', () => {
                    this.closeAll();
                    player.play(matchedMovies[index].iptvItem);
                });
            });
        } else {
            moviesContainer.innerHTML = '<p style="color: var(--text-muted)">Nenhum filme desta pessoa encontrado na sua lista.</p>';
        }

        // Render series
        const seriesContainer = document.getElementById('person-series');
        if (matchedSeries.length > 0) {
            seriesContainer.innerHTML = matchedSeries.map(series => `
                <div class="content-card" data-focusable="true" data-item-id="${series.iptvItem.id}" tabindex="0">
                    <div class="card-poster">
                        ${series.posterPath
                    ? `<img src="${series.posterPath}" alt="${series.title}">`
                    : '<div class="card-poster-placeholder">📺</div>'
                }
                    </div>
                    <div class="card-info">
                        <div class="card-title">${series.title}</div>
                        <div class="card-meta">${series.year || ''}</div>
                    </div>
                </div>
            `).join('');

            // Add click handlers
            seriesContainer.querySelectorAll('.content-card').forEach((card, index) => {
                card.addEventListener('click', () => {
                    this.closeAll();
                    // Show series detail or play first episode
                    this.showDetail(matchedSeries[index].iptvItem);
                });
            });
        } else {
            seriesContainer.innerHTML = '<p style="color: var(--text-muted)">Nenhuma série desta pessoa encontrada na sua lista.</p>';
        }
    }

    /**
     * Toggle favorite
     */
    async toggleFavorite(item) {
        try {
            const existing = await storage.get('favorites', item.id);

            if (existing) {
                await storage.delete('favorites', item.id);
                toast.success('Favorito', 'Removido dos favoritos');
            } else {
                await storage.put('favorites', {
                    ...item,
                    id: item.id,
                    addedAt: Date.now()
                });
                toast.success('Favorito', 'Adicionado aos favoritos');
            }
        } catch (error) {
            console.error('Failed to toggle favorite:', error);
            toast.error('Erro', 'Não foi possível atualizar favoritos');
        }
    }

    /**
     * Close all modals
     */
    closeAll() {
        this.detailModal.classList.add('hidden');
        this.detailModal.classList.remove('active');
        this.personModal.classList.add('hidden');
        this.personModal.classList.remove('active');

        navigation.setModalOpen(false);
        this.currentModal = null;
    }
}

// Create global instance
const modal = new ModalManager();
