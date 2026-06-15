// Olo Serve tracking (VEX-355). Loaded via the Klaviyo GTM template on Olo Serve
// sites. Subscribes to the native window.Olo event bus (the surface Olo's own
// GTM template uses) rather than the GTM dataLayer bridge, which only exists for
// brands that imported Olo's container.

import { debugLog } from './generalUtils.js';
import { OLO_EVENTS } from './constants.js';
import { trackViewedProduct, trackAddedToCart, trackStartedCheckout, startIdentifyMonitoring } from './klaviyoUtils.js';

// Injected after klaviyo.js, so window.Olo is usually ready; poll for a race.
const POLL_INTERVAL_MS = 200;
const MAX_WAIT_MS = 15000;

function isBusReady() {
    return !!(window.Olo && typeof window.Olo.on === 'function');
}

function subscribe() {
    // replay:true delivers events that fired before we subscribed (late load).
    const on = (eventName, cb) => {
        try {
            window.Olo.on(eventName, cb, { replay: true });
            debugLog('Subscribed to ' + eventName);
        } catch (err) {
            debugLog('Failed to subscribe to ' + eventName + ':', err);
        }
    };

    // Both map to Viewed Product; de-duped in trackViewedProduct.
    on(OLO_EVENTS.CLICK_PRODUCT_LINK, function (product) {
        trackViewedProduct(product);
    });
    on(OLO_EVENTS.VIEW_PRODUCT_DETAIL, function (product) {
        trackViewedProduct(product);
    });

    on(OLO_EVENTS.ADD_TO_CART, function (basketProduct) {
        trackAddedToCart(basketProduct);
    });

    on(OLO_EVENTS.CHECKOUT, function (basket, done) {
        // Serve waits on this callback before navigating to checkout — call it
        // immediately so we never stall the guest, then track.
        if (typeof done === 'function') {
            setTimeout(done, 0);
        }
        trackStartedCheckout(basket);
    });
}

(function () {
    debugLog('Script initialized');

    if (isBusReady()) {
        subscribe();
    } else {
        debugLog('window.Olo not ready yet, polling...');
        let waited = 0;
        const timer = setInterval(function () {
            if (isBusReady()) {
                clearInterval(timer);
                subscribe();
            } else if (waited >= MAX_WAIT_MS) {
                clearInterval(timer);
                debugLog('Gave up waiting for window.Olo after ' + MAX_WAIT_MS + 'ms');
            }
            waited += POLL_INTERVAL_MS;
        }, POLL_INTERVAL_MS);
    }

    // Identify guests from the /checkout/auth form (independent of the bus).
    startIdentifyMonitoring();

    debugLog('Setup complete');
})();
