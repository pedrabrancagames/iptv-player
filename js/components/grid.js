/**
 * IPTV Player - Grid Component
 * Virtual scrolling grid for memory-efficient content display
 */

class VirtualGrid {
    constructor(container, options = {}) {
        this.container = typeof container === 'string'
            ? document.querySelector(container)
            : container;

        this.options = {
            itemWidth: 180,
            itemHeight: 320,
            gap: 24,
            buffer: 2,
            ...options
        };

        this.items = [];
        this.renderedItems = new Map();
        this.scrollTop = 0;
        this.containerHeight = 0;
        this.columns = 0;

        this.onItemClick = options.onItemClick || (() => { });
        this.onItemFocus = options.onItemFocus || (() => { });
        this.renderItem = options.renderItem || this.defaultRenderItem.bind(this);

        this.init();
    }

    /**
     * Initialize grid
     */
    init() {
        if (!this.container) return;

        this.container.classList.add('virtual-grid');
        this.container.innerHTML = '<div class="virtual-grid-content"></div>';
        this.contentEl = this.container.querySelector('.virtual-grid-content');

        this.calculateDimensions();

        // Scroll listener
        this.container.addEventListener('scroll', this.handleScroll.bind(this));

        // Resize observer
        this.resizeObserver = new ResizeObserver(() => {
            this.calculateDimensions();
            this.render();
        });
        this.resizeObserver.observe(this.container);
    }

    /**
     * Calculate grid dimensions
     */
    calculateDimensions() {
        if (!this.container) return;

        const containerWidth = this.container.clientWidth;
        this.containerHeight = this.container.clientHeight;

        // Calculate columns that fit
        this.columns = Math.floor(
            (containerWidth + this.options.gap) / (this.options.itemWidth + this.options.gap)
        );
        this.columns = Math.max(1, this.columns);
    }

    /**
     * Set items
     */
    setItems(items) {
        this.items = items;
        this.updateContentHeight();
        this.render();
    }

    /**
     * Add items (for pagination)
     */
    addItems(items) {
        this.items.push(...items);
        this.updateContentHeight();
        this.render();
    }

    /**
     * Update content height
     */
    updateContentHeight() {
        const rows = Math.ceil(this.items.length / this.columns);
        const totalHeight = rows * (this.options.itemHeight + this.options.gap) - this.options.gap;
        this.contentEl.style.height = `${totalHeight}px`;
    }

    /**
     * Handle scroll
     */
    handleScroll() {
        this.scrollTop = this.container.scrollTop;
        this.render();
    }

    /**
     * Render visible items
     */
    render() {
        if (!this.container || this.items.length === 0) return;

        const rowHeight = this.options.itemHeight + this.options.gap;

        // Calculate visible range
        const startRow = Math.floor(this.scrollTop / rowHeight) - this.options.buffer;
        const visibleRows = Math.ceil(this.containerHeight / rowHeight) + this.options.buffer * 2;
        const endRow = startRow + visibleRows;

        const startIndex = Math.max(0, startRow * this.columns);
        const endIndex = Math.min(this.items.length, endRow * this.columns);

        // Track which items should be visible
        const visibleIndices = new Set();
        for (let i = startIndex; i < endIndex; i++) {
            visibleIndices.add(i);
        }

        // Remove items that are no longer visible
        for (const [index, element] of this.renderedItems) {
            if (!visibleIndices.has(index)) {
                element.remove();
                this.renderedItems.delete(index);
            }
        }

        // Add new visible items
        for (let i = startIndex; i < endIndex; i++) {
            if (!this.renderedItems.has(i)) {
                const item = this.items[i];
                const element = this.createItemElement(item, i);
                this.contentEl.appendChild(element);
                this.renderedItems.set(i, element);
            }
        }
    }

    /**
     * Create item element
     */
    createItemElement(item, index) {
        const row = Math.floor(index / this.columns);
        const col = index % this.columns;

        const x = col * (this.options.itemWidth + this.options.gap);
        const y = row * (this.options.itemHeight + this.options.gap);

        const element = document.createElement('div');
        element.className = 'virtual-grid-item content-card';
        element.setAttribute('data-focusable', 'true');
        element.setAttribute('data-index', index);
        element.tabIndex = 0;

        element.style.cssText = `
            position: absolute;
            left: ${x}px;
            top: ${y}px;
            width: ${this.options.itemWidth}px;
        `;

        element.innerHTML = this.renderItem(item);

        // Event listeners
        element.addEventListener('click', () => this.onItemClick(item, index));
        element.addEventListener('focus', () => this.onItemFocus(item, index));

        return element;
    }

    /**
     * Default item renderer
     */
    defaultRenderItem(item) {
        const poster = item.stream_icon || item.cover || item.posterPath;
        const title = item.name || item.title;
        const rating = item.rating || item.vote_average;

        return `
            <div class="card-poster">
                ${poster
                ? `<img src="${poster}" alt="${title}" loading="lazy" onerror="this.parentElement.innerHTML='<div class=card-poster-placeholder>🎬</div>'">`
                : '<div class="card-poster-placeholder">🎬</div>'
            }
                ${rating ? `<div class="card-rating">★ ${parseFloat(rating).toFixed(1)}</div>` : ''}
                <div class="card-overlay">
                    <div class="card-play-btn">▶</div>
                </div>
            </div>
            <div class="card-info">
                <div class="card-title">${title || 'Sem título'}</div>
                <div class="card-meta">
                    ${item.year ? `<span>${item.year}</span>` : ''}
                    ${item.category_name ? `<span>${item.category_name}</span>` : ''}
                </div>
            </div>
        `;
    }

    /**
     * Scroll to item
     */
    scrollToItem(index) {
        if (index < 0 || index >= this.items.length) return;

        const row = Math.floor(index / this.columns);
        const y = row * (this.options.itemHeight + this.options.gap);

        this.container.scrollTo({
            top: y - this.containerHeight / 2 + this.options.itemHeight / 2,
            behavior: 'smooth'
        });
    }

    /**
     * Focus item by index
     */
    focusItem(index) {
        const element = this.renderedItems.get(index);
        if (element) {
            element.focus();
        } else {
            this.scrollToItem(index);
            // Wait for render and then focus
            requestAnimationFrame(() => {
                const el = this.renderedItems.get(index);
                if (el) el.focus();
            });
        }
    }

    /**
     * Get first focusable item
     */
    getFirstFocusable() {
        return this.renderedItems.get(0);
    }

    /**
     * Clear grid
     */
    clear() {
        this.items = [];
        this.renderedItems.clear();
        if (this.contentEl) {
            this.contentEl.innerHTML = '';
            this.contentEl.style.height = '0';
        }
    }

    /**
     * Destroy grid
     */
    destroy() {
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
        this.clear();
    }
}

/**
 * Horizontal Row Component
 */
class HorizontalRow {
    constructor(container, options = {}) {
        this.container = typeof container === 'string'
            ? document.querySelector(container)
            : container;

        this.options = {
            itemWidth: 180,
            gap: 24,
            ...options
        };

        this.items = [];
        this.onItemClick = options.onItemClick || (() => { });
        this.renderItem = options.renderItem || this.defaultRenderItem.bind(this);
    }

    /**
     * Set items and render
     */
    setItems(items) {
        this.items = items;
        this.render();
    }

    /**
     * Render row
     */
    render() {
        if (!this.container) return;

        // Limit items for memory
        const maxItems = CONFIG.memory.maxItemsInMemory;
        const itemsToRender = this.items.slice(0, maxItems);

        this.container.innerHTML = itemsToRender.map((item, index) => `
            <div class="content-card" data-focusable="true" data-index="${index}" tabindex="0">
                ${this.renderItem(item)}
            </div>
        `).join('');

        // Add click listeners
        this.container.querySelectorAll('.content-card').forEach((el, index) => {
            el.addEventListener('click', () => this.onItemClick(this.items[index], index));
        });
    }

    /**
     * Default item renderer
     */
    defaultRenderItem(item) {
        const poster = item.stream_icon || item.cover || item.posterPath;
        const title = item.name || item.title;
        const rating = item.rating || item.vote_average;

        return `
            <div class="card-poster">
                ${poster
                ? `<img src="${poster}" alt="${title}" loading="lazy" onerror="this.parentElement.innerHTML='<div class=card-poster-placeholder>🎬</div>'">`
                : '<div class="card-poster-placeholder">🎬</div>'
            }
                ${rating ? `<div class="card-rating">★ ${parseFloat(rating).toFixed(1)}</div>` : ''}
            </div>
            <div class="card-info">
                <div class="card-title">${title || 'Sem título'}</div>
            </div>
        `;
    }

    /**
     * Clear row
     */
    clear() {
        this.items = [];
        if (this.container) {
            this.container.innerHTML = '';
        }
    }
}

// Export
window.VirtualGrid = VirtualGrid;
window.HorizontalRow = HorizontalRow;
