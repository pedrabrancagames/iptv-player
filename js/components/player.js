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
     * Play content
     */
    async play(item) {
        this.currentItem = item;

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

        console.log('Playing:', streamUrl);

        try {
            // Set source
            this.video.src = streamUrl;

            // Start playback
            await this.video.play();

            // Save to history
            this.saveToHistory(item);

            // Show controls briefly
            this.showControls();

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
        // Save progress
        if (this.currentItem && this.video.duration) {
            this.saveProgress();
        }

        // Stop video
        this.video.pause();
        this.video.src = '';

        // Hide player
        this.container.classList.add('hidden');
        navigation.setModalOpen(false);

        // Clear timeout
        if (this.controlsTimeout) {
            clearTimeout(this.controlsTimeout);
        }

        this.currentItem = null;
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
        const btn = document.getElementById('btn-play-pause');
        btn.textContent = this.isPlaying ? '⏸' : '▶';
    }

    /**
     * Update volume UI
     */
    updateVolumeUI() {
        const muteBtn = document.getElementById('btn-mute');
        muteBtn.textContent = this.isMuted || this.volume === 0 ? '🔇' : '🔊';
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

        // Could auto-play next episode here
        toast.info('Fim', 'Reprodução finalizada');
    }

    onError(event) {
        console.error('Video error:', this.video.error);

        const errorMessages = {
            1: 'Carregamento abortado',
            2: 'Erro de rede',
            3: 'Erro de decodificação',
            4: 'Formato não suportado'
        };

        const code = this.video.error?.code || 0;
        toast.error('Erro de vídeo', errorMessages[code] || 'Erro desconhecido');
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
