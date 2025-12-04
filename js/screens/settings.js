/**
 * IPTV Player - Settings Screen
 */

class SettingsScreen {
    constructor() {
        this.container = document.getElementById('settings-container');
        this.settings = {};
    }

    /**
     * Initialize screen
     */
    async init() {
        await this.loadSettings();
        this.render();
    }

    /**
     * Load settings
     */
    async loadSettings() {
        try {
            const stored = await storage.get('settings', 'user_settings');
            this.settings = stored?.value || { ...CONFIG.defaultSettings };
        } catch (error) {
            console.warn('Could not load settings:', error);
            this.settings = { ...CONFIG.defaultSettings };
        }
    }

    /**
     * Save settings
     */
    async saveSettings() {
        try {
            await storage.put('settings', {
                key: 'user_settings',
                value: this.settings
            });
            toast.success('Salvo', 'Configurações atualizadas');
        } catch (error) {
            console.error('Failed to save settings:', error);
            toast.error('Erro', 'Não foi possível salvar configurações');
        }
    }

    /**
     * Render settings
     */
    render() {
        const subscriptionInfo = xtream.getSubscriptionInfo();

        this.container.innerHTML = `
            <!-- Account Info -->
            <div class="settings-group">
                <h3 class="settings-group-title">Conta</h3>
                ${subscriptionInfo ? `
                    <div class="settings-item">
                        <span class="settings-label">Usuário</span>
                        <span class="settings-value">${subscriptionInfo.username}</span>
                    </div>
                    <div class="settings-item">
                        <span class="settings-label">Status</span>
                        <span class="settings-value" style="color: ${subscriptionInfo.status === 'Active' ? 'var(--success)' : 'var(--error)'}">${subscriptionInfo.status}</span>
                    </div>
                    <div class="settings-item">
                        <span class="settings-label">Expira em</span>
                        <span class="settings-value">${subscriptionInfo.daysLeft} dias</span>
                    </div>
                    <div class="settings-item">
                        <span class="settings-label">Conexões</span>
                        <span class="settings-value">${subscriptionInfo.activeConnections} / ${subscriptionInfo.maxConnections}</span>
                    </div>
                ` : `
                    <div class="settings-item">
                        <span class="settings-label">Status</span>
                        <span class="settings-value" style="color: var(--warning)">Não conectado</span>
                    </div>
                `}
            </div>

            <!-- Playback Settings -->
            <div class="settings-group">
                <h3 class="settings-group-title">Reprodução</h3>
                <div class="settings-item" data-focusable="true" data-setting="autoplay" tabindex="0">
                    <span class="settings-label">Reprodução automática</span>
                    <div class="toggle-switch ${this.settings.autoplay ? 'active' : ''}"></div>
                </div>
                <div class="settings-item" data-focusable="true" data-setting="subtitles" tabindex="0">
                    <span class="settings-label">Legendas</span>
                    <div class="toggle-switch ${this.settings.subtitles ? 'active' : ''}"></div>
                </div>
            </div>

            <!-- Content Settings -->
            <div class="settings-group">
                <h3 class="settings-group-title">Conteúdo</h3>
                <div class="settings-item" data-focusable="true" data-setting="showAdultContent" tabindex="0">
                    <span class="settings-label">Conteúdo adulto</span>
                    <div class="toggle-switch ${this.settings.showAdultContent ? 'active' : ''}"></div>
                </div>
            </div>

            <!-- Storage -->
            <div class="settings-group">
                <h3 class="settings-group-title">Armazenamento</h3>
                <div class="settings-item" data-focusable="true" id="btn-clear-cache" tabindex="0">
                    <span class="settings-label">Limpar cache</span>
                    <span class="settings-value">Liberar memória</span>
                </div>
                <div class="settings-item" data-focusable="true" id="btn-clear-history" tabindex="0">
                    <span class="settings-label">Limpar histórico</span>
                    <span class="settings-value">Remover assistidos</span>
                </div>
                <div class="settings-item" data-focusable="true" id="btn-reload-data" tabindex="0">
                    <span class="settings-label">Recarregar dados</span>
                    <span class="settings-value">Atualizar lista</span>
                </div>
            </div>

            <!-- App Info -->
            <div class="settings-group">
                <h3 class="settings-group-title">Sobre</h3>
                <div class="settings-item">
                    <span class="settings-label">Versão</span>
                    <span class="settings-value">${CONFIG.app.version}</span>
                </div>
                <div class="settings-item">
                    <span class="settings-label">TMDB</span>
                    <span class="settings-value">Conectado ✓</span>
                </div>
            </div>
        `;

        this.bindEvents();
    }

    /**
     * Bind events
     */
    bindEvents() {
        // Toggle settings
        this.container.querySelectorAll('[data-setting]').forEach(item => {
            item.addEventListener('click', () => {
                const setting = item.dataset.setting;
                this.settings[setting] = !this.settings[setting];

                const toggle = item.querySelector('.toggle-switch');
                if (toggle) {
                    toggle.classList.toggle('active', this.settings[setting]);
                }

                this.saveSettings();
            });
        });

        // Clear cache
        document.getElementById('btn-clear-cache')?.addEventListener('click', async () => {
            await api.clearCache();
            toast.success('Cache limpo', 'Memória liberada com sucesso');
        });

        // Clear history
        document.getElementById('btn-clear-history')?.addEventListener('click', async () => {
            await storage.clear('history');
            toast.success('Histórico limpo', 'Todos os itens assistidos foram removidos');
        });

        // Reload data
        document.getElementById('btn-reload-data')?.addEventListener('click', async () => {
            toast.info('Atualizando', 'Recarregando dados...');
            try {
                await storage.clear('channels');
                await storage.clear('categories');
                await app.loadInitialData();
                toast.success('Atualizado', 'Dados recarregados com sucesso');
            } catch (error) {
                toast.error('Erro', 'Não foi possível recarregar dados');
            }
        });
    }
}

const settingsScreen = new SettingsScreen();
