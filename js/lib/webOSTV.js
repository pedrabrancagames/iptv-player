/**
 * webOSTV.js - LG webOS TV Library Stub
 * This is a minimal stub for development. The real library is provided by LG.
 */

// Check if we're running on actual webOS
if (typeof window.webOS === 'undefined') {
    console.log('webOS library not found, using development stub');

    window.webOS = {
        // Platform information
        platform: {
            tv: true
        },

        // Service request (Luna Service Bus)
        service: {
            request: function (uri, params) {
                console.log('webOS service request:', uri, params);

                // Simulate async response
                setTimeout(() => {
                    if (params.onSuccess) {
                        params.onSuccess({ returnValue: true });
                    }
                }, 100);

                return {
                    cancel: function () { }
                };
            }
        },

        // Keyboard
        keyboard: {
            isShowing: function () {
                return false;
            }
        },

        // Device info
        deviceInfo: function (callback) {
            callback({
                modelName: 'Development',
                sdkVersion: '1.0.0',
                screenWidth: 1920,
                screenHeight: 1080
            });
        },

        // System info
        systemInfo: function (callback) {
            callback({
                country: 'BR',
                timezone: 'America/Sao_Paulo'
            });
        },

        // Fetch polyfill check
        fetchPolyfill: false,

        // Platform back
        platformBack: function () {
            console.log('webOS platform back requested');
            window.history.back();
        },

        // App lifecycle
        libVersion: '1.0.0-stub'
    };

    // webOSTV specific
    window.webOSTV = window.webOS;
}

// DRM Agent stub (if not available)
if (typeof window.DrmAgent === 'undefined') {
    window.DrmAgent = {
        // For future DRM implementation if needed
    };
}

console.log('webOSTV.js loaded');
