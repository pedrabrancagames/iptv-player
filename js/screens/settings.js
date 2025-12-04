/**
 * IPTV Player - Settings Screen
 */

class SettingsScreen {
    constructor() {
        this.container = document.getElementById('settings-container');
        this.settings = {};
        this.xtreamCredentials = {};
    }

    /**
     * Initialize screen
     */
    async init() {
        await this.loadSettings();
        await this.loadXtreamCredentials();
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
     * Load Xtream credentials
     */
    async loadXtreamCredentials() {
        try {
            const stored = await storage.get('settings', 'xtream_credentials');
            this.xtreamCredentials = stored?.value || {
                server: CONFIG.xtream.server,
                port: CONFIG.xtream.port,
                username: CONFIG.xtream.username,
                password: CONFIG.xtream.password
            };
        } catch (error) {
            this.xtreamCredentials = {
                server: CONFIG.xtream.server,
                port: CONFIG.xtream.port,
                username: CONFIG.xtream.username,
                password: CONFIG.xtream.password
            };
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
     * Save Xtream credentials
     */
    async saveXtreamCredentials() {
        try {
            await storage.put('settings', {
                key: 'xtream_credentials',
                value: this.xtreamCredentials
            });

            // Update xtream service with new credentials
            xtream.updateCredentials(this.xtreamCredentials);

            toast.success('Salvo', 'Credenciais atualizadas');
            return true;
        } catch (error) {
            console.error('Failed to save credentials:', error);
            toast.error('Erro', 'Não foi possível salvar credenciais');
            return false;
        }
    }

    /**
     * Test connection with current credentials
     */
    async testConnection() {
        const server = document.getElementById('xtream-server').value.trim();
        const port = document.getElementById('xtream-port').value.trim();
        const username = document.getElementById('xtream-username').value.trim();
        const password = document.getElementById('xtream-password').value.trim();

        if (!server || !username || !password) {
            toast.warning('Atenção', 'Preencha todos os campos');
            return;
        }

        toast.info('Testando', 'Conectando ao servidor...');

        try {
            const testUrl = `${server}:${port}/player_api.php?username=${username}&password=${password}`;
            const response = await fetch(testUrl);
            const data = await response.json();

            if (data.user_info) {
                toast.success('Sucesso', `Conectado como ${data.user_info.username}`);
                return true;
            } else {
                toast.error('Erro', 'Credenciais inválidas');
                return false;
            }
        } catch (error) {
            toast.error('Erro', 'Não foi possível conectar ao servidor');
            return false;
        }
    }

    /**
     * Render settings
     */
    render() {
        const subscriptionInfo = xtream.getSubscriptionInfo();

        this.container.innerHTML = `
            <!-- IPTV Provider Settings -->
            <div class="settings-group">
                <h3 class="settings-group-title">🔧 Provedor IPTV</h3>
                
                <div class="settings-item">
                    <span class="settings-label">Servidor</span>
                    <input type="text" 
                           id="xtream-server" 
                           class="settings-input" 
                           value="${this.xtreamCredentials.server || ''}"
                           placeholder="http://exemplo.com"
                           data-focusable="true">
                </div>
                
                <div class="settings-item">
                    <span class="settings-label">Porta</span>
                    <input type="text" 
                           id="xtream-port" 
                           class="settings-input" 
                           value="${this.xtreamCredentials.port || '80'}"
                           placeholder="80"
                           data-focusable="true">
                </div>
                
                <div class="settings-item">
                    <span class="settings-label">Usuário</span>
                    <input type="text" 
                           id="xtream-username" 
                           class="settings-input" 
                           value="${this.xtreamCredentials.username || ''}"
                           placeholder="seu_usuario"
                           data-focusable="true">
                </div>
                
                <div class="settings-item">
                    <span class="settings-label">Senha</span>
                    <input type="password" 
                           id="xtream-password" 
                           class="settings-input" 
                           value="${this.xtreamCredentials.password || ''}"
                           placeholder="sua_senha"
                           data-focusable="true">
                </div>
                
                <div class="settings-actions">
                    <button class="action-btn secondary" id="btn-test-connection" data-focusable="true">
                        🔍 Testar Conexão
                    </button>
                    <button class="action-btn primary" id="btn-save-credentials" data-focusable="true">
                        💾 Salvar e Reconectar
                    </button>
                </div>
            </div>

            <!-- Account Info -->
            <div class="settings-group">
                <h3 class="settings-group-title">📊 Status da Conta</h3>
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
                <h3 class="settings-group-title">▶️ Reprodução</h3>
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
                <h3 class="settings-group-title">📺 Conteúdo</h3>
                <div class="settings-item" data-focusable="true" data-setting="showAdultContent" tabindex="0">
                    <span class="settings-label">Conteúdo adulto</span>
                    <div class="toggle-switch ${this.settings.showAdultContent ? 'active' : ''}"></div>
                </div>
            </div>

            <!-- Storage -->
            <div class="settings-group">
                <h3 class="settings-group-title">💾 Armazenamento</h3>
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
                <h3 class="settings-group-title">ℹ️ Sobre</h3>
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
        // Test connection
        document.getElementById('btn-test-connection')?.addEventListener('click', () => {
            this.testConnection();
        });

        // Save credentials
        document.getElementById('btn-save-credentials')?.addEventListener('click', async () => {
            const server = document.getElementById('xtream-server').value.trim();
            const port = document.getElementById('xtream-port').value.trim() || '80';
            const username = document.getElementById('xtream-username').value.trim();
            const password = document.getElementById('xtream-password').value.trim();

            if (!server || !username || !password) {
                toast.warning('Atenção', 'Preencha todos os campos obrigatórios');
                return;
            }

            // Test first
            const testOk = await this.testConnection();
            if (!testOk) return;

            // Save credentials
            this.xtreamCredentials = { server, port: parseInt(port), username, password };
            const saved = await this.saveXtreamCredentials();

            if (saved) {
                // Reload data with new credentials
                toast.info('Atualizando', 'Recarregando dados...');
                try {
                    await storage.clear('channels');
                    await storage.clear('categories');
                    await xtream.authenticate();
                    await app.loadInitialData();
                    this.render(); // Refresh to show new account info
                    toast.success('Pronto', 'Lista IPTV atualizada!');
                } catch (error) {
                    toast.error('Erro', 'Não foi possível carregar a nova lista');
                }
            }
        });

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
