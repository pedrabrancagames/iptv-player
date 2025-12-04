/**
 * IPTV Player - Detail Screen Extensions
 * Additional functionality for the detail modal
 */

// This file extends the modal.js functionality for series episodes

/**
 * Render series episodes in detail modal
 */
function renderSeriesEpisodes(seriesInfo, container) {
    if (!seriesInfo.episodes) return;

    const seasons = Object.keys(seriesInfo.episodes).sort((a, b) => parseInt(a) - parseInt(b));

    if (seasons.length === 0) return;

    let html = `
        <div class="series-seasons">
            <h3 class="detail-section-title">Episódios</h3>
            
            <!-- Season Selector -->
            <div class="season-selector">
                ${seasons.map((season, index) => `
                    <button class="season-btn ${index === 0 ? 'active' : ''}" 
                            data-season="${season}" 
                            data-focusable="true">
                        Temporada ${season}
                    </button>
                `).join('')}
            </div>
            
            <!-- Episode List -->
            <div class="episode-list" id="episode-list">
                ${renderEpisodes(seriesInfo.episodes[seasons[0]])}
            </div>
        </div>
    `;

    container.innerHTML += html;

    // Season selector events
    const seasonBtns = container.querySelectorAll('.season-btn');
    seasonBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            seasonBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const season = btn.dataset.season;
            const episodeList = document.getElementById('episode-list');
            episodeList.innerHTML = renderEpisodes(seriesInfo.episodes[season]);
            bindEpisodeEvents(episodeList, seriesInfo.episodes[season]);
        });
    });

    // Initial episode events
    bindEpisodeEvents(document.getElementById('episode-list'), seriesInfo.episodes[seasons[0]]);
}

/**
 * Render episodes HTML
 */
function renderEpisodes(episodes) {
    if (!episodes || episodes.length === 0) {
        return '<p style="color: var(--text-muted)">Nenhum episódio disponível</p>';
    }

    return episodes.map(episode => {
        const thumbnail = episode.info?.movie_image || episode.info?.cover_big;
        const title = episode.title || `Episódio ${episode.episode_num}`;
        const duration = episode.info?.duration || '';
        const plot = episode.info?.plot || '';

        return `
            <div class="episode-card" data-focusable="true" data-episode-id="${episode.id}" tabindex="0">
                <div class="episode-thumbnail">
                    ${thumbnail
                ? `<img src="${thumbnail}" alt="${title}">`
                : '<div style="width:100%;height:100%;background:var(--bg-tertiary);display:flex;align-items:center;justify-content:center">📺</div>'
            }
                    ${duration ? `<span class="episode-duration">${formatDuration(duration)}</span>` : ''}
                </div>
                <div class="episode-info">
                    <div class="episode-number">Episódio ${episode.episode_num}</div>
                    <div class="episode-title">${title}</div>
                    ${plot ? `<div class="episode-description">${plot}</div>` : ''}
                </div>
            </div>
        `;
    }).join('');
}

/**
 * Bind episode click events
 */
function bindEpisodeEvents(container, episodes) {
    container.querySelectorAll('.episode-card').forEach(card => {
        card.addEventListener('click', () => {
            const episodeId = card.dataset.episodeId;
            const episode = episodes.find(e => e.id == episodeId);

            if (episode) {
                modal.closeAll();
                player.play({
                    id: `episode_${episode.id}`,
                    name: episode.title,
                    streamUrl: episode.streamUrl,
                    type: 'episode'
                });
            }
        });
    });
}

/**
 * Format duration
 */
function formatDuration(duration) {
    if (!duration) return '';

    // If it's already formatted
    if (duration.includes(':')) return duration;

    // If it's in minutes
    const mins = parseInt(duration);
    if (isNaN(mins)) return duration;

    const hours = Math.floor(mins / 60);
    const minutes = mins % 60;

    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
}

// Export for use in modal.js
window.renderSeriesEpisodes = renderSeriesEpisodes;
