/**
 * IPTV Player - Favorites Screen
 */

class FavoritesScreen {
    constructor() {
        this.gridContainer = document.getElementById('favorites-grid');
        this.items = [];
    }

    /**
     * Initialize screen
     */
    async init() {
        await this.loadFavorites();
    }

    /**
     * Load favorites
     */
    async loadFavorites() {
        try {
            this.items = await storage.getAll('favorites');
            this.items.sort((a, b) => b.addedAt - a.addedAt);
            this.render();
        } catch (error) {
            console.error('Failed to load favorites:', error);
            toast.error('Erro', 'Não foi possível carregar favoritos');
        }
    }

    /**
     * Render favorites
     */
    render() {
        if (this.items.length === 0) {
            this.gridContainer.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">❤️</div>
                    <h2 class="empty-title">Nenhum favorito</h2>
                    <p class="empty-description">
                        Adicione filmes e séries aos favoritos para acessá-los rapidamente
                    </p>
                </div>
            `;
            return;
        }

        this.gridContainer.innerHTML = this.items.map(item => {
            const poster = item.stream_icon || item.cover || item.posterPath;
            const title = item.name || item.title;
            const type = item.type || 'movie';

            return `
                <div class="content-card" data-focusable="true" data-item-id="${item.id}" tabindex="0">
                    <div class="card-poster">
                        ${poster
                    ? `<img src="${poster}" alt="${title}" loading="lazy">`
                    : `<div class="card-poster-placeholder">${type === 'series' ? '📺' : '🎬'}</div>`
                }
                        <div class="card-badge">${type === 'series' ? 'Série' : type === 'live' ? 'Ao Vivo' : 'Filme'}</div>
                        <div class="card-overlay">
                            <div class="card-play-btn">▶</div>
                        </div>
                    </div>
                    <div class="card-info">
                        <div class="card-title">${title || 'Sem título'}</div>
                    </div>
                </div>
            `;
        }).join('');

        this.gridContainer.querySelectorAll('.content-card').forEach(card => {
            card.addEventListener('click', () => {
                const itemId = card.dataset.itemId;
                const item = this.items.find(i => i.id === itemId);
                if (item) {
                    if (item.type === 'live') {
                        player.play(item);
                    } else {
                        modal.showDetail(item);
                    }
                }
            });
        });
    }

    /**
     * Refresh favorites
     */
    async refresh() {
        await this.loadFavorites();
    }
}

const favoritesScreen = new FavoritesScreen();
