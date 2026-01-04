/**
 * IPTV Player - Video Player Component
 * Native HTML5 video player with HLS support for webOS
 */

class VideoPlayer {
    constructor() {
        this.container = document.getElementById('player-container');
        this.video = document.getElementById('video-player');
        this.overlay = document.getElementById('player-overlay');
        this.progressBar = document.getElementById('progress-bar');
        this.progressFilled = document.getElementById('progress-filled');
        this.progressBuffered = document.getElementById('progress-buffered');
        this.currentTimeDisplay = document.getElementById('current-time-display');
        this.durationDisplay = document.getElementById('duration-display');
        this.volumeFilled = document.getElementById('volume-filled');
        this.titleDisplay = document.getElementById('player-title');

        this.isPlaying = false;
        this.isMuted = false;
        this.volume = 1;
        this.controlsTimeout = null;
        this.currentItem = null;

        // Auto-play next episode
        this.nextEpisode = null;
        this.autoPlayEnabled = true;
        this.autoPlayCountdown = null;
        this.autoPlaySeconds = 10;

        this.init();
    }

    /**
     * Initialize player
     */
    init() {
        // Video events
        this.video.addEventListener('play', () => this.onPlay());
        this.video.addEventListener('pause', () => this.onPause());
        this.video.addEventListener('timeupdate', () => this.onTimeUpdate());
        this.video.addEventListener('progress', () => this.onProgress());
        this.video.addEventListener('loadedmetadata', () => this.onLoadedMetadata());
        this.video.addEventListener('ended', () => this.onEnded());
        this.video.addEventListener('error', (e) => this.onError(e));
        this.video.addEventListener('waiting', () => this.onWaiting());
        this.video.addEventListener('canplay', () => this.onCanPlay());

        // Control events
        document.getElementById('btn-play-pause').addEventListener('click', () => this.togglePlayPause());
        document.getElementById('btn-rewind').addEventListener('click', () => this.seek(-CONFIG.player.seekTime));
        document.getElementById('btn-forward').addEventListener('click', () => this.seek(CONFIG.player.seekTime));
        document.getElementById('btn-mute').addEventListener('click', () => this.toggleMute());
        document.getElementById('player-back').addEventListener('click', () => this.close());

        // Progress bar click
        this.progressBar.addEventListener('click', (e) => this.seekToPosition(e));

        // Keyboard controls
        window.addEventListener('mediaControl', (e) => this.handleMediaControl(e.detail.action));
        window.addEventListener('playerBack', () => this.close());

        // Show/hide controls on activity
        this.container.addEventListener('mousemove', () => this.showControls());
        this.container.addEventListener('keydown', () => this.showControls());

        // Volume bar
        document.getElementById('volume-bar').addEventListener('click', (e) => this.setVolumeFromClick(e));

        console.log('Video player initialized');
    }

    /**
     * Check if we need to proxy the stream URL
     */
    needsStreamProxy(url) {
        const isSecureContext = window.location.protocol === 'https:';
        return isSecureContext && url && url.startsWith('http://');
    }

    /**
     * Get proxied stream URL
     */
    getProxiedStreamUrl(url) {
        if (this.needsStreamProxy(url)) {
            return `/api/stream?url=${encodeURIComponent(url)}`;
        }
        return url;
    }

    /**
     * Play content
     */
    async play(item) {
        this.currentItem = item;
        this.retriedDirectly = false;

        // Destroy previous HLS instance if exists
        if (this.hls) {
            this.hls.destroy();
            this.hls = null;
        }

        // Show player
        this.container.classList.remove('hidden');
        navigation.setModalOpen(true);

        // Set title
        this.titleDisplay.textContent = item.name || item.title || 'Reproduzindo';

        // Get stream URL
        let streamUrl = item.streamUrl || item.url;

        if (!streamUrl) {
            toast.error('Erro', 'URL do stream não encontrada');
            this.close();
            return;
        }

        // Apply stream proxy if needed for HTTPS context
        const originalUrl = streamUrl;
        streamUrl = this.getProxiedStreamUrl(streamUrl);

        if (originalUrl !== streamUrl) {
            console.log('Using stream proxy for:', originalUrl);
        }

        console.log('Playing:', streamUrl);

        try {
            // Check if it's an HLS stream
            const isHLS = originalUrl.includes('.m3u8');

            if (isHLS && typeof Hls !== 'undefined' && Hls.isSupported()) {
                // Use HLS.js for HLS streams
                this.hls = new Hls({
                    enableWorker: true,
                    lowLatencyMode: true,
                    backBufferLength: 90
                });

                this.hls.loadSource(streamUrl);
                this.hls.attachMedia(this.video);

                this.hls.on(Hls.Events.MANIFEST_PARSED, async () => {
                    try {
                        await this.video.play();
                        this.saveToHistory(item);
                        this.showControls();
                    } catch (e) {
                        console.error('HLS playback error:', e);
                        toast.error('Erro de reprodução', e.message);
                    }
                });

                this.hls.on(Hls.Events.ERROR, (event, data) => {
                    console.error('HLS error:', data);
                    if (data.fatal) {
                        switch (data.type) {
                            case Hls.ErrorTypes.NETWORK_ERROR:
                                toast.error('Erro de rede', 'Problema ao carregar stream');
                                this.hls.startLoad();
                                break;
                            case Hls.ErrorTypes.MEDIA_ERROR:
                                toast.error('Erro de mídia', 'Tentando recuperar...');
                                this.hls.recoverMediaError();
                                break;
                            default:
                                toast.error('Erro fatal', 'Não foi possível reproduzir');
                                this.close();
                        }
                    }
                });

            } else if (isHLS && this.video.canPlayType('application/vnd.apple.mpegurl')) {
                // Native HLS support (Safari, webOS)
                this.video.src = streamUrl;
                await this.video.play();
                this.saveToHistory(item);
                this.showControls();

            } else {
                // Standard video (MP4, TS, etc.)
                this.video.src = streamUrl;
                await this.video.play();
                this.saveToHistory(item);
                this.showControls();
            }

        } catch (error) {
            console.error('Playback error:', error);
            toast.error('Erro de reprodução', error.message);
            this.close();
        }
    }

    /**
     * Toggle play/pause
     */
    togglePlayPause() {
        if (this.isPlaying) {
            this.video.pause();
        } else {
            this.video.play();
        }
    }

    /**
     * Seek relative
     */
    seek(seconds) {
        const newTime = this.video.currentTime + seconds;
        this.video.currentTime = Math.max(0, Math.min(newTime, this.video.duration));
        this.showControls();
    }

    /**
     * Seek to click position
     */
    seekToPosition(event) {
        const rect = this.progressBar.getBoundingClientRect();
        const percent = (event.clientX - rect.left) / rect.width;
        this.video.currentTime = percent * this.video.duration;
    }

    /**
     * Toggle mute
     */
    toggleMute() {
        this.isMuted = !this.isMuted;
        this.video.muted = this.isMuted;
        this.updateVolumeUI();
    }

    /**
     * Set volume from click
     */
    setVolumeFromClick(event) {
        const rect = event.currentTarget.getBoundingClientRect();
        const percent = (event.clientX - rect.left) / rect.width;
        this.volume = Math.max(0, Math.min(1, percent));
        this.video.volume = this.volume;
        this.isMuted = false;
        this.video.muted = false;
        this.updateVolumeUI();
    }

    /**
     * Close player
     */
    close() {
        // Cancel any auto-play countdown
        this.cancelAutoPlay();

        // Save progress
        if (this.currentItem && this.video.duration) {
            this.saveProgress();
        }

        // Destroy HLS instance
        if (this.hls) {
            this.hls.destroy();
            this.hls = null;
        }

        // Stop video and clear source properly
        this.video.pause();
        this.video.removeAttribute('src');
        this.video.load(); // Reset the video element

        // Hide player
        this.container.classList.add('hidden');
        navigation.setModalOpen(false);

        // Clear timeout
        if (this.controlsTimeout) {
            clearTimeout(this.controlsTimeout);
        }

        this.currentItem = null;
        this.nextEpisode = null;
    }

    /**
     * Show controls
     */
    showControls() {
        this.container.classList.add('controls-visible');

        if (this.controlsTimeout) {
            clearTimeout(this.controlsTimeout);
        }

        this.controlsTimeout = setTimeout(() => {
            if (this.isPlaying) {
                this.container.classList.remove('controls-visible');
            }
        }, CONFIG.ui.controlsHideDelay);
    }

    /**
     * Handle media control keys
     */
    handleMediaControl(action) {
        if (this.container.classList.contains('hidden')) return;

        switch (action) {
            case 'play':
                this.video.play();
                break;
            case 'pause':
                this.video.pause();
                break;
            case 'playpause':
                this.togglePlayPause();
                break;
            case 'stop':
                this.close();
                break;
            case 'rewind':
                this.seek(-CONFIG.player.seekTime);
                break;
            case 'forward':
                this.seek(CONFIG.player.seekTime);
                break;
        }

        this.showControls();
    }

    /**
     * Update play/pause button
     */
    updatePlayPauseButton() {
        const btnIcon = document.querySelector('#btn-play-pause i');
        if (btnIcon) {
            btnIcon.className = this.isPlaying ? 'ph-fill ph-pause' : 'ph-fill ph-play';
        }
    }

    /**
     * Update volume UI
     */
    updateVolumeUI() {
        const muteBtnIcon = document.querySelector('#btn-mute i');
        if (muteBtnIcon) {
            muteBtnIcon.className = this.isMuted || this.volume === 0 ? 'ph-fill ph-speaker-slash' : 'ph-fill ph-speaker-high';
        }
        this.volumeFilled.style.width = `${this.isMuted ? 0 : this.volume * 100}%`;
    }

    /**
     * Format time
     */
    formatTime(seconds) {
        if (isNaN(seconds) || !isFinite(seconds)) return '00:00';

        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);

        if (h > 0) {
            return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        }
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }

    /**
     * Save to history
     */
    async saveToHistory(item) {
        try {
            await storage.put('history', {
                id: item.id,
                ...item,
                watchedAt: Date.now(),
                progress: 0
            });
        } catch (error) {
            console.warn('Failed to save to history:', error);
        }
    }

    /**
     * Save progress
     */
    async saveProgress() {
        if (!this.currentItem) return;

        try {
            const progress = this.video.currentTime / this.video.duration;

            await storage.put('history', {
                id: this.currentItem.id,
                ...this.currentItem,
                watchedAt: Date.now(),
                progress: progress,
                currentTime: this.video.currentTime,
                duration: this.video.duration
            });
        } catch (error) {
            console.warn('Failed to save progress:', error);
        }
    }

    // Video event handlers
    onPlay() {
        this.isPlaying = true;
        this.updatePlayPauseButton();
    }

    onPause() {
        this.isPlaying = false;
        this.updatePlayPauseButton();
        this.saveProgress();
    }

    onTimeUpdate() {
        const current = this.video.currentTime;
        const duration = this.video.duration;

        if (duration) {
            const percent = (current / duration) * 100;
            this.progressFilled.style.width = `${percent}%`;
            this.currentTimeDisplay.textContent = this.formatTime(current);
        }
    }

    onProgress() {
        if (this.video.buffered.length > 0) {
            const buffered = this.video.buffered.end(this.video.buffered.length - 1);
            const duration = this.video.duration;

            if (duration) {
                const percent = (buffered / duration) * 100;
                this.progressBuffered.style.width = `${percent}%`;
            }
        }
    }

    onLoadedMetadata() {
        this.durationDisplay.textContent = this.formatTime(this.video.duration);
        this.updateVolumeUI();
    }

    onEnded() {
        this.isPlaying = false;
        this.updatePlayPauseButton();
        this.showControls();

        // Check for next episode auto-play
        if (this.nextEpisode && this.autoPlayEnabled) {
            this.showAutoPlayUI();
        } else {
            toast.info('Fim', 'Reprodução finalizada');
        }
    }

    /**
     * Set next episode for auto-play
     */
    setNextEpisode(episode) {
        this.nextEpisode = episode;
    }

    /**
     * Show auto-play UI with countdown
     */
    showAutoPlayUI() {
        // Create auto-play overlay
        const autoPlayDiv = document.createElement('div');
        autoPlayDiv.id = 'auto-play-overlay';
        autoPlayDiv.className = 'auto-play-overlay';

        let seconds = this.autoPlaySeconds;

        autoPlayDiv.innerHTML = `
            <div class="auto-play-content">
                <div class="auto-play-thumbnail">
                    ${this.nextEpisode.stream_icon || this.nextEpisode.cover
                ? `<img src="${this.nextEpisode.stream_icon || this.nextEpisode.cover}" alt="Next">`
                : '<div class="auto-play-placeholder"><i class="ph-fill ph-play-circle"></i></div>'
            }
                </div>
                <div class="auto-play-info">
                    <div class="auto-play-label">Próximo episódio em</div>
                    <div class="auto-play-countdown" id="auto-play-countdown">${seconds}</div>
                    <div class="auto-play-title">${this.nextEpisode.title || this.nextEpisode.name}</div>
                </div>
                <div class="auto-play-actions">
                    <button class="auto-play-btn primary" id="auto-play-now" data-focusable="true">
                        <i class="ph-fill ph-play"></i> Reproduzir Agora
                    </button>
                    <button class="auto-play-btn secondary" id="auto-play-cancel" data-focusable="true">
                        <i class="ph-fill ph-x"></i> Cancelar
                    </button>
                </div>
            </div>
        `;

        this.container.appendChild(autoPlayDiv);

        const countdownEl = document.getElementById('auto-play-countdown');
        const playNowBtn = document.getElementById('auto-play-now');
        const cancelBtn = document.getElementById('auto-play-cancel');

        // Start countdown
        this.autoPlayCountdown = setInterval(() => {
            seconds--;
            if (countdownEl) countdownEl.textContent = seconds;

            if (seconds <= 0) {
                this.playNextEpisode();
            }
        }, 1000);

        // Button events
        playNowBtn.addEventListener('click', () => this.playNextEpisode());
        cancelBtn.addEventListener('click', () => this.cancelAutoPlay());

        // Focus play button
        setTimeout(() => playNowBtn.focus(), 100);
    }

    /**
     * Play next episode
     */
    playNextEpisode() {
        this.cancelAutoPlay();
        if (this.nextEpisode) {
            this.play(this.nextEpisode);
        }
    }

    /**
     * Cancel auto-play
     */
    cancelAutoPlay() {
        if (this.autoPlayCountdown) {
            clearInterval(this.autoPlayCountdown);
            this.autoPlayCountdown = null;
        }

        const overlay = document.getElementById('auto-play-overlay');
        if (overlay) {
            overlay.remove();
        }
    }

    onError(event) {
        const error = this.video.error;
        console.error('Video error:', error);

        // Fallback logic: If we are using a proxy and it fails, try direct connection
        const currentSrc = this.video.src;
        if (currentSrc && currentSrc.includes('/api/stream') && !this.retriedDirectly) {
            console.log('Proxy failed, trying direct connection...');

            // Extract original URL from proxy param
            try {
                const urlParam = new URL(currentSrc).searchParams.get('url');
                if (urlParam) {
                    const originalUrl = decodeURIComponent(urlParam);
                    console.log('Retrying with original URL:', originalUrl);

                    this.retriedDirectly = true;
                    this.video.src = originalUrl;
                    this.video.play().catch(e => {
                        console.error('Direct playback failed:', e);
                        // If direct playback fails (likely mixed content), show specific error
                        if (e.name === 'NotSupportedError' || e.message.includes('supported source')) {
                            toast.error('Erro de Segurança', 'Navegador bloqueou conteúdo misto (HTTP). Tente rodar localmente.');
                        }
                    });

                    toast.info('Tentando conexão direta...', 'O proxy falhou, conectando diretamente ao servidor.');
                    return;
                }
            } catch (e) {
                console.error('Error parsing proxy URL:', e);
            }
        }

        const errorMessages = {
            1: 'Carregamento abortado',
            2: 'Erro de rede',
            3: 'Erro de decodificação',
            4: 'Formato não suportado (Provável bloqueio do servidor)'
        };

        const code = error?.code || 0;
        const msg = errorMessages[code] || 'Erro desconhecido';

        toast.error('Erro de reprodução', msg);
    }

    onWaiting() {
        // Show loading indicator
        toast.info('Carregando', 'Buffering...', 2000);
    }

    onCanPlay() {
        // Hide loading indicator if any
    }
}

// Create global instance
const player = new VideoPlayer();
