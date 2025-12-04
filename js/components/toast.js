/**
 * IPTV Player - Toast Notifications
 */

class ToastManager {
    constructor() {
        this.container = document.getElementById('toast-container');
        this.queue = [];
        this.maxVisible = 3;
    }

    /**
     * Show toast notification
     */
    show(type, title, message, duration = CONFIG.ui.toastDuration) {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };

        toast.innerHTML = `
            <span class="toast-icon">${icons[type] || icons.info}</span>
            <div class="toast-content">
                <div class="toast-title">${title}</div>
                ${message ? `<div class="toast-message">${message}</div>` : ''}
            </div>
            <button class="toast-close">×</button>
        `;

        // Close button
        toast.querySelector('.toast-close').addEventListener('click', () => {
            this.remove(toast);
        });

        // Add to container
        this.container.appendChild(toast);

        // Auto remove
        setTimeout(() => {
            this.remove(toast);
        }, duration);

        return toast;
    }

    /**
     * Remove toast
     */
    remove(toast) {
        toast.style.animation = 'fadeOut var(--transition-normal) ease-out forwards';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 250);
    }

    // Convenience methods
    success(title, message, duration) {
        return this.show('success', title, message, duration);
    }

    error(title, message, duration) {
        return this.show('error', title, message, duration);
    }

    warning(title, message, duration) {
        return this.show('warning', title, message, duration);
    }

    info(title, message, duration) {
        return this.show('info', title, message, duration);
    }
}

// Create global instance
const toast = new ToastManager();
