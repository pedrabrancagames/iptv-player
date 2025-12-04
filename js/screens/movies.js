/**
 * IPTV Player - Movies Screen
 */

class MoviesScreen {
    constructor() {
        this.categoriesContainer = document.getElementById('movie-categories');
        this.gridContainer = document.getElementById('movies-grid');
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
            this.categories = await xtream.getVodCategories();
            this.renderCategories();

            if (this.categories.length > 0) {
                await this.loadCategory(this.categories[0].originalId);
            }
        } catch (error) {
            console.error('Failed to load movie categories:', error);
            toast.error('Erro', 'Não foi possível carregar categorias');
        }
    }

    /**
     * Render categories
     */
    renderCategories() {
        this.categoriesContainer.innerHTML = `
            <div class="category-nav-container">
                <button class="category-nav-btn" id="movie-cat-prev" data-focusable="true">◀</button>
                <div class="category-scroll" id="movie-cat-scroll">
                    ${this.categories.map((cat, index) => `
                        <button class="category-btn ${index === 0 ? 'active' : ''}" 
                                data-category-id="${cat.originalId}"
                                data-focusable="true">
                            ${cat.category_name}
                        </button>
                    `).join('')}
                </div>
                <button class="category-nav-btn" id="movie-cat-next" data-focusable="true">▶</button>
            </div>
        `;

        const scrollContainer = document.getElementById('movie-cat-scroll');
        const prevBtn = document.getElementById('movie-cat-prev');
        const nextBtn = document.getElementById('movie-cat-next');

        // Navigation button events
        prevBtn.addEventListener('click', () => {
            scrollContainer.scrollBy({ left: -300, behavior: 'smooth' });
        });

        nextBtn.addEventListener('click', () => {
            scrollContainer.scrollBy({ left: 300, behavior: 'smooth' });
        });

        // Category button events
        scrollContainer.querySelectorAll('.category-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                scrollContainer.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
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
            this.items = await xtream.getVodStreams(categoryId);

            // Store in IndexedDB for search
            const itemsWithType = this.items.map(item => ({
                ...item,
                type: 'movie'
            }));
            await storage.putMany('channels', itemsWithType);

            this.renderGrid();
        } catch (error) {
            console.error('Failed to load movies:', error);
            toast.error('Erro', 'Não foi possível carregar filmes');
        }
    }

    /**
     * Render grid
     */
    renderGrid() {
        if (this.items.length === 0) {
            this.gridContainer.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">🎬</div>
                    <h2 class="empty-title">Nenhum filme encontrado</h2>
                </div>
            `;
            return;
        }

        this.gridContainer.innerHTML = this.items.slice(0, CONFIG.memory.maxItemsInMemory).map(item => {
            const poster = item.stream_icon || item.cover;
            const rating = item.rating;

            return `
                <div class="content-card" data-focusable="true" data-item-id="${item.id}" tabindex="0">
                    <div class="card-poster">
                        ${poster
                    ? `<img src="${poster}" alt="${item.name}" loading="lazy" onerror="this.parentElement.innerHTML='<div class=card-poster-placeholder>🎬</div>'">`
                    : '<div class="card-poster-placeholder">🎬</div>'
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
            card.addEventListener('click', () => {
                const itemId = card.dataset.itemId;
                const item = this.items.find(i => i.id === itemId);
                if (item) {
                    modal.showDetail(item);
                }
            });
        });
    }
}

const moviesScreen = new MoviesScreen();
