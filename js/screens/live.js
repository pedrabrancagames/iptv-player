/**
 * IPTV Player - Live TV Screen
 */

class LiveScreen {
    constructor() {
        this.categoriesContainer = document.getElementById('live-categories');
        this.gridContainer = document.getElementById('live-grid');
        this.categories = [];
        this.currentCategory = null;
        this.items = [];
        this.grid = null;
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
            this.categories = await xtream.getLiveCategories();
            this.renderCategories();

            // Load first category
            if (this.categories.length > 0) {
                await this.loadCategory(this.categories[0].originalId);
            }
        } catch (error) {
            console.error('Failed to load live categories:', error);
            toast.error('Erro', 'Não foi possível carregar categorias');
        }
    }

    /**
     * Render categories
     */
    renderCategories() {
        this.categoriesContainer.innerHTML = `
            <div class="category-nav-container">
                <button class="category-nav-btn" id="live-cat-prev" data-focusable="true">◀</button>
                <div class="category-scroll" id="live-cat-scroll">
                    ${this.categories.map((cat, index) => `
                        <button class="category-btn ${index === 0 ? 'active' : ''}" 
                                data-category-id="${cat.originalId}"
                                data-focusable="true">
                            ${cat.category_name}
                        </button>
                    `).join('')}
                </div>
                <button class="category-nav-btn" id="live-cat-next" data-focusable="true">▶</button>
            </div>
        `;

        const scrollContainer = document.getElementById('live-cat-scroll');
        const prevBtn = document.getElementById('live-cat-prev');
        const nextBtn = document.getElementById('live-cat-next');

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
            this.items = await xtream.getLiveStreams(categoryId);
            this.renderGrid();
        } catch (error) {
            console.error('Failed to load live streams:', error);
            toast.error('Erro', 'Não foi possível carregar canais');
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
                    <h2 class="empty-title">Nenhum canal encontrado</h2>
                </div>
            `;
            return;
        }

        this.gridContainer.innerHTML = this.items.slice(0, CONFIG.memory.maxItemsInMemory).map(item => `
            <div class="channel-card" data-focusable="true" data-item-id="${item.id}" tabindex="0">
                <div class="channel-logo">
                    ${item.stream_icon
                ? `<img src="${item.stream_icon}" alt="${item.name}" onerror="this.parentElement.innerHTML='📺'">`
                : '📺'
            }
                </div>
                <div class="channel-info">
                    <div class="channel-name">${item.name}</div>
                    <div class="channel-status">Ao vivo</div>
                </div>
            </div>
        `).join('');

        this.gridContainer.querySelectorAll('.channel-card').forEach(card => {
            card.addEventListener('click', () => {
                const itemId = card.dataset.itemId;
                const item = this.items.find(i => i.id === itemId);
                if (item) {
                    player.play(item);
                }
            });
        });
    }
}

const liveScreen = new LiveScreen();
