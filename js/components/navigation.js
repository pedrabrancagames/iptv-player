/**
 * IPTV Player - Navigation Component
 * Handles TV remote navigation and focus management
 */

class NavigationManager {
    constructor() {
        this.focusableSelector = '[data-focusable="true"], .content-card, .menu-item, .category-btn, .cast-card, .action-btn, .episode-card';
        this.currentFocusedElement = null;
        this.focusHistory = [];
        this.grids = new Map();
        this.isModalOpen = false;

        this.init();
    }

    /**
     * Initialize navigation
     */
    init() {
        // Keyboard event listener
        document.addEventListener('keydown', this.handleKeyDown.bind(this));

        // Focus event tracking
        document.addEventListener('focusin', this.handleFocusIn.bind(this));

        // Mouse fallback
        document.addEventListener('click', this.handleClick.bind(this));

        console.log('Navigation manager initialized');
    }

    /**
     * Handle keyboard navigation
     */
    handleKeyDown(event) {
        const key = event.key || event.keyCode;

        // Map key codes for LG remote
        const keyMap = {
            'ArrowUp': 'up',
            'ArrowDown': 'down',
            'ArrowLeft': 'left',
            'ArrowRight': 'right',
            'Enter': 'enter',
            'Escape': 'back',
            'Backspace': 'back',
            'MediaPlayPause': 'playpause',
            'MediaPlay': 'play',
            'MediaPause': 'pause',
            'MediaStop': 'stop',
            'MediaRewind': 'rewind',
            'MediaFastForward': 'forward',
            // Key codes
            38: 'up',
            40: 'down',
            37: 'left',
            39: 'right',
            13: 'enter',
            27: 'back',
            461: 'back',     // LG Back button
            415: 'play',
            19: 'pause',
            413: 'stop',
            412: 'rewind',
            417: 'forward',
            // Color buttons
            403: 'red',
            404: 'green',
            405: 'yellow',
            406: 'blue'
        };

        const action = keyMap[key] || keyMap[event.keyCode];

        if (!action) return;

        event.preventDefault();

        switch (action) {
            case 'up':
            case 'down':
            case 'left':
            case 'right':
                this.navigate(action);
                break;
            case 'enter':
                this.select();
                break;
            case 'back':
                this.goBack();
                break;
            case 'play':
            case 'pause':
            case 'playpause':
            case 'stop':
            case 'rewind':
            case 'forward':
                this.handleMediaKey(action);
                break;
            case 'red':
            case 'green':
            case 'yellow':
            case 'blue':
                this.handleColorKey(action);
                break;
        }
    }

    /**
     * Navigate in direction
     */
    navigate(direction) {
        const currentElement = document.activeElement;

        if (!currentElement || currentElement === document.body) {
            // No focus, find first focusable element
            this.focusFirst();
            return;
        }

        // Check if we're in a grid
        const grid = currentElement.closest('.content-grid, .row-content, .cast-grid');

        if (grid) {
            this.navigateGrid(grid, currentElement, direction);
        } else {
            this.navigateLinear(currentElement, direction);
        }
    }

    /**
     * Navigate within a grid
     */
    navigateGrid(grid, currentElement, direction) {
        const items = Array.from(grid.querySelectorAll(this.focusableSelector));
        const currentIndex = items.indexOf(currentElement);

        if (currentIndex === -1) return;

        // Calculate grid dimensions
        const gridRect = grid.getBoundingClientRect();
        const itemRect = currentElement.getBoundingClientRect();
        const itemsPerRow = Math.floor(gridRect.width / itemRect.width);

        let nextIndex;

        switch (direction) {
            case 'up':
                nextIndex = currentIndex - itemsPerRow;
                if (nextIndex < 0) {
                    // Move to element above the grid
                    this.focusPreviousSection(grid);
                    return;
                }
                break;
            case 'down':
                nextIndex = currentIndex + itemsPerRow;
                if (nextIndex >= items.length) {
                    // Move to element below the grid
                    this.focusNextSection(grid);
                    return;
                }
                break;
            case 'left':
                nextIndex = currentIndex - 1;
                if (nextIndex < 0 || currentIndex % itemsPerRow === 0) {
                    // Move to sidebar or previous section
                    this.focusSidebar();
                    return;
                }
                break;
            case 'right':
                nextIndex = currentIndex + 1;
                if (nextIndex >= items.length || currentIndex % itemsPerRow === itemsPerRow - 1) {
                    return; // Stay at edge
                }
                break;
        }

        if (nextIndex >= 0 && nextIndex < items.length) {
            items[nextIndex].focus();
            this.scrollIntoView(items[nextIndex]);
        }
    }

    /**
     * Navigate linearly (non-grid)
     */
    navigateLinear(currentElement, direction) {
        const container = currentElement.closest('.sidebar-menu, .category-filter, .detail-actions, .control-buttons, .season-selector');

        if (!container) {
            // General navigation
            this.navigateGeneral(currentElement, direction);
            return;
        }

        const items = Array.from(container.querySelectorAll(this.focusableSelector));
        const currentIndex = items.indexOf(currentElement);

        if (currentIndex === -1) return;

        let nextIndex;
        const isHorizontal = container.classList.contains('category-filter') ||
            container.classList.contains('detail-actions') ||
            container.classList.contains('control-buttons') ||
            container.classList.contains('season-selector');

        if (isHorizontal) {
            if (direction === 'left') {
                nextIndex = currentIndex - 1;
            } else if (direction === 'right') {
                nextIndex = currentIndex + 1;
            } else if (direction === 'up' || direction === 'down') {
                this.navigateGeneral(currentElement, direction);
                return;
            }
        } else {
            if (direction === 'up') {
                nextIndex = currentIndex - 1;
            } else if (direction === 'down') {
                nextIndex = currentIndex + 1;
            } else if (direction === 'left' || direction === 'right') {
                this.navigateGeneral(currentElement, direction);
                return;
            }
        }

        if (nextIndex >= 0 && nextIndex < items.length) {
            items[nextIndex].focus();
        }
    }

    /**
     * General spatial navigation
     */
    navigateGeneral(currentElement, direction) {
        const currentRect = currentElement.getBoundingClientRect();
        const focusables = Array.from(document.querySelectorAll(this.focusableSelector))
            .filter(el => el !== currentElement && this.isVisible(el));

        let candidates = [];

        focusables.forEach(el => {
            const rect = el.getBoundingClientRect();
            const distance = this.calculateDistance(currentRect, rect, direction);

            if (distance !== null) {
                candidates.push({ element: el, distance });
            }
        });

        // Sort by distance and pick closest
        candidates.sort((a, b) => a.distance - b.distance);

        if (candidates.length > 0) {
            candidates[0].element.focus();
            this.scrollIntoView(candidates[0].element);
        }
    }

    /**
     * Calculate distance for spatial navigation
     */
    calculateDistance(fromRect, toRect, direction) {
        const fromCenter = {
            x: fromRect.left + fromRect.width / 2,
            y: fromRect.top + fromRect.height / 2
        };
        const toCenter = {
            x: toRect.left + toRect.width / 2,
            y: toRect.top + toRect.height / 2
        };

        // Check if candidate is in the right direction
        switch (direction) {
            case 'up':
                if (toCenter.y >= fromCenter.y - 10) return null;
                break;
            case 'down':
                if (toCenter.y <= fromCenter.y + 10) return null;
                break;
            case 'left':
                if (toCenter.x >= fromCenter.x - 10) return null;
                break;
            case 'right':
                if (toCenter.x <= fromCenter.x + 10) return null;
                break;
        }

        // Calculate Euclidean distance
        const dx = toCenter.x - fromCenter.x;
        const dy = toCenter.y - fromCenter.y;

        // Weight based on direction (prefer elements in line)
        let distance = Math.sqrt(dx * dx + dy * dy);

        if (direction === 'up' || direction === 'down') {
            distance += Math.abs(dx) * 0.5; // Penalize horizontal deviation
        } else {
            distance += Math.abs(dy) * 0.5; // Penalize vertical deviation
        }

        return distance;
    }

    /**
     * Select current element
     */
    select() {
        const currentElement = document.activeElement;

        if (currentElement && currentElement !== document.body) {
            // Trigger click event
            currentElement.click();
        }
    }

    /**
     * Go back
     */
    goBack() {
        // Check if modal is open
        if (this.isModalOpen) {
            window.dispatchEvent(new CustomEvent('closeModal'));
            return;
        }

        // Check if player is open
        const playerContainer = document.getElementById('player-container');
        if (playerContainer && !playerContainer.classList.contains('hidden')) {
            window.dispatchEvent(new CustomEvent('playerBack'));
            return;
        }

        // Navigate back in screen history
        if (this.focusHistory.length > 0) {
            const previousFocus = this.focusHistory.pop();
            if (previousFocus && document.contains(previousFocus)) {
                previousFocus.focus();
            }
        } else {
            // Go to home or show exit dialog
            window.dispatchEvent(new CustomEvent('navigateHome'));
        }
    }

    /**
     * Handle media control keys
     */
    handleMediaKey(action) {
        window.dispatchEvent(new CustomEvent('mediaControl', { detail: { action } }));
    }

    /**
     * Handle color keys
     */
    handleColorKey(color) {
        window.dispatchEvent(new CustomEvent('colorKey', { detail: { color } }));
    }

    /**
     * Focus first focusable element
     */
    focusFirst() {
        const first = document.querySelector(`${this.focusableSelector}:not(.hidden)`);
        if (first) {
            first.focus();
        }
    }

    /**
     * Focus sidebar
     */
    focusSidebar() {
        const activeMenuItem = document.querySelector('.menu-item.active');
        if (activeMenuItem) {
            activeMenuItem.focus();
        }
    }

    /**
     * Focus previous section
     */
    focusPreviousSection(currentElement) {
        const sections = Array.from(document.querySelectorAll('.content-row, .content-grid, .category-filter'));
        const currentSection = currentElement.closest('.content-row, .content-grid, .category-filter');
        const currentIndex = sections.indexOf(currentSection);

        if (currentIndex > 0) {
            const prevSection = sections[currentIndex - 1];
            const firstFocusable = prevSection.querySelector(this.focusableSelector);
            if (firstFocusable) {
                firstFocusable.focus();
            }
        }
    }

    /**
     * Focus next section
     */
    focusNextSection(currentElement) {
        const sections = Array.from(document.querySelectorAll('.content-row, .content-grid, .category-filter'));
        const currentSection = currentElement.closest('.content-row, .content-grid, .category-filter');
        const currentIndex = sections.indexOf(currentSection);

        if (currentIndex < sections.length - 1) {
            const nextSection = sections[currentIndex + 1];
            const firstFocusable = nextSection.querySelector(this.focusableSelector);
            if (firstFocusable) {
                firstFocusable.focus();
            }
        }
    }

    /**
     * Check if element is visible
     */
    isVisible(element) {
        const rect = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);

        return rect.width > 0 &&
            rect.height > 0 &&
            style.visibility !== 'hidden' &&
            style.display !== 'none' &&
            style.opacity !== '0';
    }

    /**
     * Scroll element into view
     */
    scrollIntoView(element) {
        element.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
            inline: 'nearest'
        });
    }

    /**
     * Handle focus change
     */
    handleFocusIn(event) {
        if (this.currentFocusedElement && this.currentFocusedElement !== event.target) {
            this.focusHistory.push(this.currentFocusedElement);

            // Limit history size
            if (this.focusHistory.length > 20) {
                this.focusHistory.shift();
            }
        }

        this.currentFocusedElement = event.target;
    }

    /**
     * Handle click for focus
     */
    handleClick(event) {
        const focusable = event.target.closest(this.focusableSelector);
        if (focusable) {
            focusable.focus();
        }
    }

    /**
     * Set modal state
     */
    setModalOpen(isOpen) {
        this.isModalOpen = isOpen;
    }

    /**
     * Focus element and save history
     */
    focusElement(element) {
        if (element) {
            element.focus();
            this.scrollIntoView(element);
        }
    }

    /**
     * Clear focus history
     */
    clearHistory() {
        this.focusHistory = [];
    }

    /**
     * Get current focused element
     */
    getCurrentFocus() {
        return this.currentFocusedElement;
    }
}

// Create global instance
const navigation = new NavigationManager();
