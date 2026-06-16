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
        // Don't track here: firing during the cart -> checkout navigation gets the
        // request cancelled by the redirect. Just release Serve's navigation so we
        // never stall the guest. Started Checkout fires from the checkout page
        // instead (trackCheckoutOnPage) — a stable destination where the request
        // isn't cancelled.
        if (typeof done === 'function') {
            setTimeout(done, 0);
        }
    });
}

// Fire Started Checkout from the checkout page, reading the live basket once
// it's populated. De-duped per basket in trackStartedCheckout.
function trackCheckoutOnPage() {
    if (window.location.pathname.indexOf('/checkout') === -1) return;
    let waited = 0;
    const timer = setInterval(function () {
        const basket = window.Olo && window.Olo.data && window.Olo.data.basket;
        if (basket && Array.isArray(basket.basketProducts) && basket.basketProducts.length) {
            clearInterval(timer);
            trackStartedCheckout(basket);
        } else if (waited >= MAX_WAIT_MS) {
            clearInterval(timer);
            debugLog('Checkout page: basket not populated within ' + MAX_WAIT_MS + 'ms');
        }
        waited += POLL_INTERVAL_MS;
    }, POLL_INTERVAL_MS);
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

    // Fire Started Checkout from the checkout page (reliable — see above).
    trackCheckoutOnPage();

    debugLog('Setup complete');
})();
