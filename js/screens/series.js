/**
 * IPTV Player - Series Screen
 */

class SeriesScreen {
    constructor() {
        this.categoriesContainer = document.getElementById('series-categories');
        this.gridContainer = document.getElementById('series-grid');
        this.categories = [];
        this.currentCategory = null;
        this.items = [];
    }

    /**
     * Initialize screen
     */
    async init() {
        await this.loadCategories();
    }

    /**
     * Load categories
     */
    async loadCategories() {
        try {
            this.categories = await xtream.getSeriesCategories();
            this.renderCategories();

            if (this.categories.length > 0) {
                await this.loadCategory(this.categories[0].originalId);
            }
        } catch (error) {
            console.error('Failed to load series categories:', error);
            toast.error('Erro', 'Não foi possível carregar categorias');
        }
    }

    /**
     * Render categories
     */
    renderCategories() {
        this.categoriesContainer.innerHTML = this.categories.map((cat, index) => `
            <button class="category-btn ${index === 0 ? 'active' : ''}" 
                    data-category-id="${cat.originalId}"
                    data-focusable="true">
                ${cat.category_name}
            </button>
        `).join('');

        this.categoriesContainer.querySelectorAll('.category-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.categoriesContainer.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.loadCategory(btn.dataset.categoryId);
            });
        });
    }

    /**
     * Load category content
     */
    async loadCategory(categoryId) {
        this.currentCategory = categoryId;
        this.gridContainer.innerHTML = '<div class="loading-spinner" style="margin:auto"></div>';

        try {
            this.items = await xtream.getSeriesStreams(categoryId);

            // Store in IndexedDB for search
            const itemsWithType = this.items.map(item => ({
                ...item,
                type: 'series'
            }));
            await storage.putMany('channels', itemsWithType);

            this.renderGrid();
        } catch (error) {
            console.error('Failed to load series:', error);
            toast.error('Erro', 'Não foi possível carregar séries');
        }
    }

    /**
     * Render grid
     */
    renderGrid() {
        if (this.items.length === 0) {
            this.gridContainer.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📺</div>
                    <h2 class="empty-title">Nenhuma série encontrada</h2>
                </div>
            `;
            return;
        }

        this.gridContainer.innerHTML = this.items.slice(0, CONFIG.memory.maxItemsInMemory).map(item => {
            const poster = item.cover;
            const rating = item.rating;

            return `
                <div class="content-card" data-focusable="true" data-item-id="${item.id}" tabindex="0">
                    <div class="card-poster">
                        ${poster
                    ? `<img src="${poster}" alt="${item.name}" loading="lazy" onerror="this.parentElement.innerHTML='<div class=card-poster-placeholder>📺</div>'">`
                    : '<div class="card-poster-placeholder">📺</div>'
                }
                        ${rating ? `<div class="card-rating">★ ${parseFloat(rating).toFixed(1)}</div>` : ''}
                        <div class="card-overlay">
                            <div class="card-play-btn">▶</div>
                        </div>
                    </div>
                    <div class="card-info">
                        <div class="card-title">${item.name || 'Sem título'}</div>
                        <div class="card-meta">
                            ${item.year ? `<span>${item.year}</span>` : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        this.gridContainer.querySelectorAll('.content-card').forEach(card => {
            card.addEventListener('click', async () => {
                const itemId = card.dataset.itemId;
                const item = this.items.find(i => i.id === itemId);
                if (item) {
                    await this.showSeriesDetail(item);
                }
            });
        });
    }

    /**
     * Show series detail with episodes
     */
    async showSeriesDetail(series) {
        try {
            // Get series info with episodes
            const seriesInfo = await xtream.getSeriesInfo(series.originalId);

            // Merge with TMDB data
            let tmdbData = null;
            try {
                const searchResult = await tmdb.matchContent(series.name, 'tv');
                if (searchResult) {
                    tmdbData = await tmdb.getTvDetails(searchResult.tmdbId);
                }
            } catch (e) {
                console.warn('Could not get TMDB data for series:', e);
            }

            // Show modal with series and episodes
            await modal.showDetail({
                ...series,
                ...seriesInfo.info,
                episodes: seriesInfo.episodes
            }, tmdbData);

        } catch (error) {
            console.error('Failed to load series info:', error);
            // Show basic detail
            modal.showDetail(series);
        }
    }
}

const seriesScreen = new SeriesScreen();
