import { debugLog, isOnGuestsPage, startIdentifyMonitoring } from './generalUtils.js';
import { handleDataLayerPush } from './gtmUtils.js';
import { trackViewedListing, trackStartedCheckout, attemptIdentify } from './klaviyoUtils.js';

(function() {
    debugLog('Script initialized');
    const windowDataLayer = window.dataLayer;

    // Check if dataLayer exists
    if (!windowDataLayer) {
        debugLog('WARNING: dataLayer not found on window object');
        return;
    }

    debugLog('dataLayer found, setting up listener');

    // Create handlers object once for reuse
    const handlers = {
        trackViewedListing,
        trackStartedCheckout,
        attemptIdentify,
        startIdentifyMonitoring
    };

    const dlPush = windowDataLayer.push;

    // Override the push method of the dataLayer array to listen for push events
    windowDataLayer.push = function() {
        // Capture the arguments passed to the original push method
        const args = Array.prototype.slice.call(arguments);
        debugLog('dataLayer.push called with arguments:', args);

        // Call the original push method to ensure the dataLayer still functions as expected
        dlPush.apply(window.dataLayer, args);

        // Extract the event object from the arguments
        let event;
        for (let i = 0; i < args.length; i++) {
            if (typeof args[i] === 'object') {
                event = args[i];
                break;
            }
        }
        // Handle the dataLayer push event
        if (event) {
            handleDataLayerPush(event, handlers);
        }
    };

    // Process any existing events in the dataLayer
    debugLog('Processing existing dataLayer events. Count:', windowDataLayer.length);
    if (windowDataLayer.length > 0) {
        for (let i = 0; i < windowDataLayer.length; i++) {
            if (typeof windowDataLayer[i] === 'object') {
                debugLog('Processing existing event #' + i + ':', windowDataLayer[i]);
                handleDataLayerPush(windowDataLayer[i], handlers);
            }
        }
    }

    debugLog('Setup complete');

    // Start monitoring if already on guests page
    if (isOnGuestsPage()) {
        debugLog('Detected guests page, starting monitoring');
        setTimeout(startIdentifyMonitoring, 1000);
    }

    // Monitor for URL changes (SPA navigation)
    const checkForGuestsPage = function() {
        if (isOnGuestsPage()) {
            setTimeout(startIdentifyMonitoring, 1000);
        }
    };

    window.addEventListener('popstate', checkForGuestsPage);

    debugLog('Guest identification monitoring initialized');

})();
