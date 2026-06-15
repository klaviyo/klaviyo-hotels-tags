// Main Olo Serve tracking script (VEX-355).
//
// Loaded via the Klaviyo GTM template on Olo Serve ordering sites. Subscribes
// to the native window.Olo event bus and tracks the three normalized F&B
// events (Viewed Product, Added to Cart, Started Checkout) through the shared
// payload builders.
//
// Olo Serve exposes a native, versioned event bus on window.Olo — the same
// surface Olo's own GTM template uses (callInWindow('Olo.on', ...)). We
// subscribe directly rather than parsing GTM-bridge dataLayer events, because
// the bus exists on every Serve storefront whereas the GTM bridge only exists
// for brands that imported Olo's container config.

import { debugLog } from './generalUtils.js';
import { OLO_EVENTS } from './constants.js';
import { trackViewedProduct, trackAddedToCart, trackStartedCheckout } from './klaviyoUtils.js';

// window.Olo is created by the Serve app. Our script is injected by GTM after
// klaviyo.js, so the bus is usually present already — but guard against a race
// by polling briefly before giving up.
const POLL_INTERVAL_MS = 200;
const MAX_WAIT_MS = 15000;

function isBusReady() {
    return !!(window.Olo && typeof window.Olo.on === 'function');
}

function subscribe() {
    // replay:true delivers events that fired before we subscribed (our script
    // loads late), matching how Olo's own template behaves.
    const on = (eventName, cb) => {
        try {
            window.Olo.on(eventName, cb, { replay: true });
            debugLog('Subscribed to ' + eventName);
        } catch (err) {
            debugLog('Failed to subscribe to ' + eventName + ':', err);
        }
    };

    // Viewed Product fires from BOTH clickProductLink and viewProductDetail —
    // which one emits depends on the site's Serve feature flags — so we listen
    // to both and de-dupe in trackViewedProduct.
    on(OLO_EVENTS.CLICK_PRODUCT_LINK, function (product /*, clickFrom */) {
        trackViewedProduct(product);
    });

    on(OLO_EVENTS.VIEW_PRODUCT_DETAIL, function (product /*, viewIn */) {
        trackViewedProduct(product);
    });

    on(OLO_EVENTS.ADD_TO_CART, function (basketProduct) {
        trackAddedToCart(basketProduct);
    });

    on(OLO_EVENTS.CHECKOUT, function (basket, done) {
        // Serve passes a "done" callback and waits on it before transitioning
        // the page to checkout — we MUST call it, and without delay, so we
        // never stall the guest's navigation. Track after scheduling it.
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
                debugLog('window.Olo ready after ' + waited + 'ms');
                subscribe();
            } else if (waited >= MAX_WAIT_MS) {
                clearInterval(timer);
                debugLog('Gave up waiting for window.Olo after ' + MAX_WAIT_MS + 'ms');
            }
            waited += POLL_INTERVAL_MS;
        }, POLL_INTERVAL_MS);
    }

    debugLog('Setup complete');
})();
