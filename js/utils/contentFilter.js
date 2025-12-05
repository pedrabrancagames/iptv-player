/**
 * IPTV Player - Content Filter Utilities
 * Filters adult content based on user settings
 */

const ContentFilter = {
    // Words that indicate adult content in Portuguese and English
    adultKeywords: [
        // Portuguese
        'adulto', 'adultos', '+18', '18+', 'xxx', 'pornô', 'porno',
        'erótico', 'erotico', 'sexy', 'sexo', 'sex',
        // English
        'adult', 'porn', 'erotic', 'mature', 'nsfw',
        // Common category names
        'hot', 'spicy', 'xxx', 'playboy', 'only fans', 'onlyfans'
    ],

    /**
     * Check if item is adult content
     */
    isAdultContent(item) {
        if (!item) return false;

        // Check explicit adult flag
        if (item.adult === true) return true;

        // Fields to check
        const fieldsToCheck = [
            item.name,
            item.title,
            item.category_name,
            item.group,
            item.genre
        ].filter(Boolean).map(s => s.toLowerCase());

        // Check for adult keywords
        return fieldsToCheck.some(field =>
            this.adultKeywords.some(keyword => field.includes(keyword.toLowerCase()))
        );
    },

    /**
     * Check if category is adult
     */
    isAdultCategory(category) {
        if (!category) return false;

        const name = (category.category_name || category.name || '').toLowerCase();
        return this.adultKeywords.some(keyword => name.includes(keyword.toLowerCase()));
    },

    /**
     * Filter items based on adult content setting
     */
    async filterItems(items) {
        const settings = await this.getUserSettings();

        if (settings.showAdultContent === true) {
            return items;
        }

        return items.filter(item => !this.isAdultContent(item));
    },

    /**
     * Filter categories based on adult content setting
     */
    async filterCategories(categories) {
        const settings = await this.getUserSettings();

        if (settings.showAdultContent === true) {
            return categories;
        }

        return categories.filter(cat => !this.isAdultCategory(cat));
    },

    /**
     * Get user settings
     */
    async getUserSettings() {
        try {
            const stored = await storage.get('settings', 'user_settings');
            return stored?.value || CONFIG.defaultSettings;
        } catch (e) {
            return CONFIG.defaultSettings;
        }
    }
};
