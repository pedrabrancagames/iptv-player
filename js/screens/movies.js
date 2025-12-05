/**
 * IPTV Player - Movies Screen
 * With Filter and Sort functionality
 */

class MoviesScreen {
    constructor() {
        this.categoriesContainer = document.getElementById('movie-categories');
        this.gridContainer = document.getElementById('movies-grid');
        this.categories = [];
        this.currentCategory = null;
        this.items = [];
        this.filteredItems = [];

        // Filter and sort state
        this.sortBy = 'title';
        this.sortOrder = 'asc';
        this.filters = {
            genre: '',
            year: '',
            decade: ''
        };
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
     * Render categories in sidebar
     */
    renderCategories() {
        const sidebarCategories = document.getElementById('sidebar-categories');
        if (!sidebarCategories) return;

        sidebarCategories.innerHTML = this.categories.map((cat, index) => `
            <button class="sidebar-category-btn ${index === 0 ? 'active' : ''}" 
                    data-category-id="${cat.originalId}"
                    data-focusable="true">
                ${cat.category_name}
            </button>
        `).join('');

        // Category button events
        sidebarCategories.querySelectorAll('.sidebar-category-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                sidebarCategories.querySelectorAll('.sidebar-category-btn').forEach(b => b.classList.remove('active'));
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

            // Reset filters
            this.filters = { genre: '', year: '', decade: '' };
            this.sortBy = 'title';

            this.applyFiltersAndSort();
            this.renderFiltersBar();
            this.renderGrid();
        } catch (error) {
            console.error('Failed to load movies:', error);
            toast.error('Erro', 'Não foi possível carregar filmes');
        }
    }

    /**
     * Extract unique values for filters
     */
    getFilterOptions() {
        const years = new Set();
        const decades = new Set();
        const genres = new Set();

        this.items.forEach(item => {
            // Extract year
            const year = item.year || item.releasedate?.substring(0, 4);
            if (year && !isNaN(year)) {
                years.add(year);
                const decade = Math.floor(parseInt(year) / 10) * 10;
                decades.add(decade);
            }

            // Extract genre from category name or genre field
            if (item.genre) {
                item.genre.split(',').forEach(g => genres.add(g.trim()));
            }
        });

        return {
            years: Array.from(years).sort((a, b) => b - a),
            decades: Array.from(decades).sort((a, b) => b - a),
            genres: Array.from(genres).sort()
        };
    }

    /**
     * Render filters bar
     */
    renderFiltersBar() {
        const options = this.getFilterOptions();

        // Check if filter bar already exists
        let filterBar = document.querySelector('.content-filter-bar');
        if (!filterBar) {
            filterBar = document.createElement('div');
            filterBar.className = 'content-filter-bar';
            this.gridContainer.parentElement.insertBefore(filterBar, this.gridContainer);
        }

        filterBar.innerHTML = `
            <div class="filter-group">
                <label class="filter-label">Ordenar por:</label>
                <select id="sort-select" class="filter-select" data-focusable="true">
                    <option value="title" ${this.sortBy === 'title' ? 'selected' : ''}>Título (A-Z)</option>
                    <option value="title-desc" ${this.sortBy === 'title-desc' ? 'selected' : ''}>Título (Z-A)</option>
                    <option value="year" ${this.sortBy === 'year' ? 'selected' : ''}>Ano (Mais Novo)</option>
                    <option value="year-asc" ${this.sortBy === 'year-asc' ? 'selected' : ''}>Ano (Mais Antigo)</option>
                    <option value="rating" ${this.sortBy === 'rating' ? 'selected' : ''}>Avaliação</option>
                    <option value="random" ${this.sortBy === 'random' ? 'selected' : ''}>Aleatório</option>
                </select>
            </div>

            ${options.genres.length > 0 ? `
            <div class="filter-group">
                <label class="filter-label">Gênero:</label>
                <select id="filter-genre" class="filter-select" data-focusable="true">
                    <option value="">Todos</option>
                    ${options.genres.map(g => `<option value="${g}" ${this.filters.genre === g ? 'selected' : ''}>${g}</option>`).join('')}
                </select>
            </div>
            ` : ''}

            ${options.years.length > 0 ? `
            <div class="filter-group">
                <label class="filter-label">Ano:</label>
                <select id="filter-year" class="filter-select" data-focusable="true">
                    <option value="">Todos</option>
                    ${options.years.map(y => `<option value="${y}" ${this.filters.year === y ? 'selected' : ''}>${y}</option>`).join('')}
                </select>
            </div>
            ` : ''}

            ${options.decades.length > 0 ? `
            <div class="filter-group">
                <label class="filter-label">Década:</label>
                <select id="filter-decade" class="filter-select" data-focusable="true">
                    <option value="">Todas</option>
                    ${options.decades.map(d => `<option value="${d}" ${this.filters.decade == d ? 'selected' : ''}>${d}s</option>`).join('')}
                </select>
            </div>
            ` : ''}

            <div class="filter-results">
                <span id="results-count">${this.filteredItems.length}</span> filmes
            </div>

            <button class="filter-reset-btn" id="reset-filters" data-focusable="true">
                🔄 Limpar Filtros
            </button>
        `;

        this.bindFilterEvents();
    }

    /**
     * Bind filter events
     */
    bindFilterEvents() {
        // Sort select
        document.getElementById('sort-select')?.addEventListener('change', (e) => {
            this.sortBy = e.target.value;
            this.applyFiltersAndSort();
            this.renderGrid();
        });

        // Genre filter
        document.getElementById('filter-genre')?.addEventListener('change', (e) => {
            this.filters.genre = e.target.value;
            this.applyFiltersAndSort();
            this.renderGrid();
            this.updateResultsCount();
        });

        // Year filter
        document.getElementById('filter-year')?.addEventListener('change', (e) => {
            this.filters.year = e.target.value;
            this.applyFiltersAndSort();
            this.renderGrid();
            this.updateResultsCount();
        });

        // Decade filter
        document.getElementById('filter-decade')?.addEventListener('change', (e) => {
            this.filters.decade = e.target.value;
            this.applyFiltersAndSort();
            this.renderGrid();
            this.updateResultsCount();
        });

        // Reset filters
        document.getElementById('reset-filters')?.addEventListener('click', () => {
            this.filters = { genre: '', year: '', decade: '' };
            this.sortBy = 'title';
            this.applyFiltersAndSort();
            this.renderFiltersBar();
            this.renderGrid();
        });
    }

    /**
     * Update results count
     */
    updateResultsCount() {
        const countEl = document.getElementById('results-count');
        if (countEl) {
            countEl.textContent = this.filteredItems.length;
        }
    }

    /**
     * Apply filters and sorting
     */
    applyFiltersAndSort() {
        // Start with all items
        let result = [...this.items];

        // Apply genre filter
        if (this.filters.genre) {
            result = result.filter(item =>
                item.genre && item.genre.toLowerCase().includes(this.filters.genre.toLowerCase())
            );
        }

        // Apply year filter
        if (this.filters.year) {
            result = result.filter(item => {
                const itemYear = item.year || item.releasedate?.substring(0, 4);
                return itemYear === this.filters.year;
            });
        }

        // Apply decade filter
        if (this.filters.decade) {
            const decadeStart = parseInt(this.filters.decade);
            const decadeEnd = decadeStart + 9;
            result = result.filter(item => {
                const itemYear = parseInt(item.year || item.releasedate?.substring(0, 4));
                return itemYear >= decadeStart && itemYear <= decadeEnd;
            });
        }

        // Apply sorting
        switch (this.sortBy) {
            case 'title':
                result.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
                break;
            case 'title-desc':
                result.sort((a, b) => (b.name || '').localeCompare(a.name || ''));
                break;
            case 'year':
                result.sort((a, b) => {
                    const yearA = parseInt(a.year || a.releasedate?.substring(0, 4) || 0);
                    const yearB = parseInt(b.year || b.releasedate?.substring(0, 4) || 0);
                    return yearB - yearA;
                });
                break;
            case 'year-asc':
                result.sort((a, b) => {
                    const yearA = parseInt(a.year || a.releasedate?.substring(0, 4) || 0);
                    const yearB = parseInt(b.year || b.releasedate?.substring(0, 4) || 0);
                    return yearA - yearB;
                });
                break;
            case 'rating':
                result.sort((a, b) => {
                    const ratingA = parseFloat(a.rating || 0);
                    const ratingB = parseFloat(b.rating || 0);
                    return ratingB - ratingA;
                });
                break;
            case 'random':
                result.sort(() => Math.random() - 0.5);
                break;
        }

        this.filteredItems = result;
    }

    /**
     * Render grid
     */
    renderGrid() {
        if (this.filteredItems.length === 0) {
            this.gridContainer.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">🎬</div>
                    <h2 class="empty-title">Nenhum filme encontrado</h2>
                    <p class="empty-description">Tente ajustar os filtros</p>
                </div>
            `;
            return;
        }

        this.gridContainer.innerHTML = this.filteredItems.slice(0, CONFIG.memory.maxItemsInMemory).map(item => {
            const poster = item.stream_icon || item.cover;
            const rating = item.rating;
            const year = item.year || item.releasedate?.substring(0, 4);

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
                            ${year ? `<span>${year}</span>` : ''}
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
