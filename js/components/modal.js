/**
 * IPTV Player - Modal Component
 * Handles detail and person modals
 */

class ModalManager {
    constructor() {
        this.detailModal = document.getElementById('detail-modal');
        this.personModal = document.getElementById('person-modal');
        this.currentModal = null;
        this.currentTrailers = []; // Store trailers for current item

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

        // If it's a series without episodes loaded, fetch them
        if (item.type === 'series' && !item.episodes && item.series_id) {
            try {
                const seriesInfo = await xtream.getSeriesInfo(item.series_id);
                if (seriesInfo && seriesInfo.episodes) {
                    item.episodes = seriesInfo.episodes;
                    item.info = seriesInfo.info;
                }
            } catch (error) {
                console.warn('Failed to load series episodes:', error);
            }
        }

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
        const posterUrl = item.stream_icon || item.cover || item.posterPath;
        const poster = ImageUtils.getSecureImageUrl(posterUrl);

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

        // Check if it's a series with episodes
        const isSeries = item.type === 'series' || item.episodes;

        // Actions - different for series vs movies
        if (isSeries && item.episodes) {
            document.getElementById('detail-actions').innerHTML = `
                <button class="action-btn secondary" data-focusable="true" id="btn-favorite-detail">
                    ❤️ Favorito
                </button>
            `;
        } else {
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
        }

        // Favorite button event
        document.getElementById('btn-favorite-detail').addEventListener('click', async () => {
            await this.toggleFavorite(item);
        });

        // Clear cast and crew until loaded
        document.getElementById('detail-cast').innerHTML = '';
        document.getElementById('detail-crew').innerHTML = '';

        // If it's a series with episodes, render seasons
        if (isSeries && item.episodes) {
            this.renderSeriesSeasons(item);
        }
    }

    /**
     * Render series seasons and episodes
     */
    renderSeriesSeasons(series) {
        const episodes = series.episodes;
        console.log('renderSeriesSeasons called:', { series, episodes });

        if (!episodes || Object.keys(episodes).length === 0) {
            console.warn('No episodes found for series');
            return;
        }

        const seasonNumbers = Object.keys(episodes).sort((a, b) => parseInt(a) - parseInt(b));
        console.log('Season numbers:', seasonNumbers);

        // Store series data for later use
        this.currentSeries = series;
        this.currentSeasonEpisodes = episodes;

        let seasonsHtml = `
            <div class="detail-section series-seasons">
                <h3 class="detail-section-title">Temporadas</h3>
                <div class="seasons-list">
                    ${seasonNumbers.map(seasonNum => `
                        <button class="season-btn" data-focusable="true" data-season="${seasonNum}" tabindex="0">
                            Temporada ${seasonNum}
                            <span class="season-count">${episodes[seasonNum].length} episódios</span>
                        </button>
                    `).join('')}
                </div>
                <div class="episodes-container" id="episodes-container"></div>
            </div>
        `;

        document.getElementById('detail-cast').innerHTML = seasonsHtml;
        document.getElementById('detail-crew').innerHTML = '';

        // Add click handlers to season buttons
        document.querySelectorAll('.season-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.season-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.renderEpisodes(btn.dataset.season);
            });
        });

        // Load first season episodes by default
        if (seasonNumbers.length > 0) {
            document.querySelector('.season-btn').classList.add('active');
            this.renderEpisodes(seasonNumbers[0]);
        }
    }

    /**
     * Render episodes for a season
     */
    renderEpisodes(seasonNum) {
        const episodes = this.currentSeasonEpisodes[seasonNum];
        const container = document.getElementById('episodes-container');

        container.innerHTML = `
            <div class="episodes-list">
                ${episodes.map(ep => {
            const thumbUrl = ImageUtils.getSecureImageUrl(ep.info?.movie_image);
            return `
                    <div class="episode-card" data-focusable="true" data-episode-id="${ep.id}" tabindex="0">
                        <div class="episode-thumbnail">
                            ${ep.info?.movie_image
                    ? `<img src="${thumbUrl}" alt="Episódio ${ep.episode_num}">`
                    : `<div class="episode-thumb-placeholder">▶</div>`
                }
                            <div class="episode-number">E${ep.episode_num}</div>
                        </div>
                        <div class="episode-info">
                            <div class="episode-title">${ep.title || `Episódio ${ep.episode_num}`}</div>
                            ${ep.info?.plot ? `<div class="episode-plot">${ep.info.plot.substring(0, 100)}${ep.info.plot.length > 100 ? '...' : ''}</div>` : ''}
                            ${ep.info?.duration ? `<div class="episode-duration">⏱️ ${ep.info.duration}</div>` : ''}
                        </div>
                        <button class="episode-play-btn" data-focusable="true">▶</button>
                    </div>
                `}).join('')}
            </div>
        `;

        // Add click handlers to episodes
        container.querySelectorAll('.episode-card').forEach((card, index) => {
            const episode = episodes[index];

            card.addEventListener('click', () => {
                this.showEpisodeDetail(episode);
            });

            card.querySelector('.episode-play-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                this.playEpisode(episode);
            });
        });
    }

    /**
     * Show episode detail
     */
    showEpisodeDetail(episode) {
        const info = episode.info || {};

        // Update modal with episode info
        document.getElementById('detail-title').textContent = episode.title || `Episódio ${episode.episode_num}`;
        document.getElementById('detail-overview').textContent = info.plot || 'Sem descrição disponível.';

        // Update backdrop if available
        if (info.movie_image) {
            const backdrop = document.getElementById('detail-backdrop');
            const backdropUrl = ImageUtils.getSecureImageUrl(info.movie_image);
            backdrop.style.backgroundImage = `url(${backdropUrl})`;
        }

        // Update stats
        const stats = [];
        if (info.releasedate) {
            stats.push(`<span class="detail-stat">📅 ${info.releasedate}</span>`);
        }
        if (info.duration) {
            stats.push(`<span class="detail-stat">⏱️ ${info.duration}</span>`);
        }
        if (info.rating) {
            stats.push(`<span class="detail-stat rating">★ ${parseFloat(info.rating).toFixed(1)}</span>`);
        }
        document.getElementById('detail-stats').innerHTML = stats.join('');

        // Update actions to show play button
        document.getElementById('detail-actions').innerHTML = `
            <button class="action-btn primary" data-focusable="true" id="btn-play-episode">
                ▶ Reproduzir Episódio
            </button>
            <button class="action-btn secondary" data-focusable="true" id="btn-back-to-seasons">
                ← Voltar para Temporadas
            </button>
        `;

        document.getElementById('btn-play-episode').addEventListener('click', () => {
            this.playEpisode(episode);
        });

        document.getElementById('btn-back-to-seasons').addEventListener('click', () => {
            // Restore series view
            this.setDetailBasicInfo(this.currentSeries);
            if (this.currentSeries.episodes) {
                this.renderSeriesSeasons(this.currentSeries);
            }
        });

        // Hide seasons list temporarily
        const seasonsSection = document.querySelector('.series-seasons');
        if (seasonsSection) {
            seasonsSection.style.display = 'none';
        }
    }

    /**
     * Play an episode
     */
    playEpisode(episode) {
        // Find next episode for auto-play
        const nextEpisode = this.findNextEpisode(episode);

        this.closeAll();

        const currentEp = {
            id: episode.id,
            name: episode.title || `Episódio ${episode.episode_num}`,
            streamUrl: episode.streamUrl,
            stream_icon: episode.info?.movie_image || this.currentSeries?.cover,
            type: 'episode'
        };

        player.play(currentEp);

        // Set next episode for auto-play
        if (nextEpisode) {
            player.setNextEpisode({
                id: nextEpisode.id,
                name: nextEpisode.title || `Episódio ${nextEpisode.episode_num}`,
                title: nextEpisode.title || `Episódio ${nextEpisode.episode_num}`,
                streamUrl: nextEpisode.streamUrl,
                stream_icon: nextEpisode.info?.movie_image || this.currentSeries?.cover,
                type: 'episode'
            });
        } else {
            player.setNextEpisode(null);
        }
    }

    /**
     * Find next episode in series
     */
    findNextEpisode(currentEpisode) {
        if (!this.currentSeries || !this.currentSeries.episodes) return null;

        const seasons = Object.keys(this.currentSeries.episodes).sort((a, b) => parseInt(a) - parseInt(b));

        for (let i = 0; i < seasons.length; i++) {
            const seasonNum = seasons[i];
            const episodes = this.currentSeries.episodes[seasonNum];

            for (let j = 0; j < episodes.length; j++) {
                if (episodes[j].id === currentEpisode.id) {
                    // Check if there's a next episode in this season
                    if (j < episodes.length - 1) {
                        return episodes[j + 1];
                    }
                    // Check if there's a next season
                    if (i < seasons.length - 1) {
                        const nextSeasonNum = seasons[i + 1];
                        const nextSeasonEpisodes = this.currentSeries.episodes[nextSeasonNum];
                        if (nextSeasonEpisodes && nextSeasonEpisodes.length > 0) {
                            return nextSeasonEpisodes[0];
                        }
                    }
                    return null;
                }
            }
        }

        return null;
    }

    /**
     * Set TMDB info
     */
    setDetailTmdbInfo(tmdbData, iptvItem) {
        // Store trailers for later use
        this.currentTrailers = tmdbData.videos || [];

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

        // Add trailer button if trailers are available
        if (this.currentTrailers.length > 0) {
            const actionsEl = document.getElementById('detail-actions');
            const trailerBtn = document.createElement('button');
            trailerBtn.className = 'action-btn trailer';
            trailerBtn.setAttribute('data-focusable', 'true');
            trailerBtn.id = 'btn-trailer-detail';
            trailerBtn.innerHTML = '🎬 Trailer';

            // Insert after first button
            const firstBtn = actionsEl.querySelector('.action-btn');
            if (firstBtn && firstBtn.nextSibling) {
                actionsEl.insertBefore(trailerBtn, firstBtn.nextSibling);
            } else {
                actionsEl.appendChild(trailerBtn);
            }

            trailerBtn.addEventListener('click', () => {
                this.playTrailer();
            });
        }

        // Cast - only if not a series with episodes (which uses detail-cast for seasons)
        const hasSeriesSeasons = document.querySelector('.series-seasons');
        if (tmdbData.cast && tmdbData.cast.length > 0 && !hasSeriesSeasons) {
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
        this.closeTrailer();

        navigation.setModalOpen(false);
        this.currentModal = null;
    }

    /**
     * Play trailer in embedded YouTube player
     */
    playTrailer() {
        if (this.currentTrailers.length === 0) {
            toast.info('Trailer', 'Nenhum trailer disponível');
            return;
        }

        const trailer = this.currentTrailers[0]; // Play first trailer
        const youtubeKey = trailer.key;

        // Create trailer modal overlay
        const trailerModal = document.createElement('div');
        trailerModal.id = 'trailer-modal';
        trailerModal.className = 'trailer-modal';
        trailerModal.innerHTML = `
            <div class="trailer-backdrop"></div>
            <div class="trailer-container">
                <button class="trailer-close" id="trailer-close" data-focusable="true">✕</button>
                <div class="trailer-title">${trailer.name || 'Trailer'}</div>
                <div class="trailer-player">
                    <iframe 
                        src="https://www.youtube.com/embed/${youtubeKey}?autoplay=1&rel=0&modestbranding=1"
                        frameborder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowfullscreen>
                    </iframe>
                </div>
                ${this.currentTrailers.length > 1 ? `
                    <div class="trailer-list">
                        ${this.currentTrailers.map((t, i) => `
                            <button class="trailer-list-item ${i === 0 ? 'active' : ''}" 
                                    data-key="${t.key}" 
                                    data-name="${t.name}"
                                    data-focusable="true">
                                ${t.type}: ${t.name}
                            </button>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        `;

        document.body.appendChild(trailerModal);

        // Add close events
        const closeBtn = document.getElementById('trailer-close');
        const backdrop = trailerModal.querySelector('.trailer-backdrop');

        closeBtn.addEventListener('click', () => this.closeTrailer());
        backdrop.addEventListener('click', () => this.closeTrailer());

        // Handle switching between trailers
        trailerModal.querySelectorAll('.trailer-list-item').forEach(item => {
            item.addEventListener('click', () => {
                const key = item.dataset.key;
                const name = item.dataset.name;
                const iframe = trailerModal.querySelector('iframe');
                iframe.src = `https://www.youtube.com/embed/${key}?autoplay=1&rel=0&modestbranding=1`;
                trailerModal.querySelector('.trailer-title').textContent = name || 'Trailer';

                // Update active state
                trailerModal.querySelectorAll('.trailer-list-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
            });
        });

        // Handle ESC key
        const handleEsc = (e) => {
            if (e.key === 'Escape' || e.key === 'Backspace' || e.keyCode === 461) {
                this.closeTrailer();
                document.removeEventListener('keydown', handleEsc);
            }
        };
        document.addEventListener('keydown', handleEsc);

        // Focus close button
        setTimeout(() => closeBtn.focus(), 100);
    }

    /**
     * Close trailer modal
     */
    closeTrailer() {
        const trailerModal = document.getElementById('trailer-modal');
        if (trailerModal) {
            // Stop video by removing iframe
            const iframe = trailerModal.querySelector('iframe');
            if (iframe) {
                iframe.src = '';
            }
            trailerModal.remove();
        }
    }
}

// Create global instance
const modal = new ModalManager();
