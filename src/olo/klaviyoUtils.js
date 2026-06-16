// Olo -> Klaviyo adapters: map Olo event args into the shared neutral inputs,
// run the F&B builders, and track via Klaviyo.

import { debugLog, parseModifiers, mapFulfillmentType, pickImageURL, getBrandFromHostname, currentURL } from './generalUtils.js';
import { klaviyo } from '../shared/klaviyoInstance.js';
import {
    buildViewedProductPayload,
    buildAddedToCartPayload,
    buildStartedCheckoutPayload,
} from '../shared/restaurant/payloads.js';
import {
    VIEWED_PRODUCT,
    ADDED_TO_CART,
    STARTED_CHECKOUT,
} from '../shared/restaurant/eventNames.js';
import { isValidEmail, isValidPhone } from '../shared/validationUtils.js';

// Olo's addToCart/basket/checkout payloads carry only a minimal product ({ id })
// with no images. Cache images from the richer view/click products, persisted to
// sessionStorage so they survive page reloads and the hard nav into checkout
// (where v1.checkout's basket is minimal), then back-fill cart + line items.
const IMAGE_CACHE_KEY = 'klOloImageById';

function loadImageCache() {
    try {
        return JSON.parse(sessionStorage.getItem(IMAGE_CACHE_KEY)) || {};
    } catch (err) {
        return {};
    }
}

const imageById = loadImageCache();

function rememberProductImage(product) {
    if (!product || product.id == null) return;
    const url = pickImageURL(product.images);
    if (url && imageById[String(product.id)] !== url) {
        imageById[String(product.id)] = url;
        try {
            sessionStorage.setItem(IMAGE_CACHE_KEY, JSON.stringify(imageById));
        } catch (err) { /* sessionStorage unavailable — fall back to in-memory */ }
    }
}

function imageForProductId(id) {
    return id != null && imageById[String(id)] ? imageById[String(id)] : '';
}

// Olo's product-view events omit price for fixed-price items (only build-your-own
// items carry baseCost), but addToCart/checkout expose unitCost. Cache price by
// product id (sessionStorage) so a Viewed Product can pick it up once it's known
// from any add/checkout in the session. (First view of a never-added fixed-price
// item still has no price source, so Price is 0.)
const PRICE_CACHE_KEY = 'klOloPriceById';

function loadPriceCache() {
    try {
        return JSON.parse(sessionStorage.getItem(PRICE_CACHE_KEY)) || {};
    } catch (err) {
        return {};
    }
}

const priceById = loadPriceCache();

function rememberProductPrice(id, price) {
    if (id == null) return;
    const n = Number(price);
    if (!isFinite(n) || n <= 0) return;
    if (priceById[String(id)] !== n) {
        priceById[String(id)] = n;
        try {
            sessionStorage.setItem(PRICE_CACHE_KEY, JSON.stringify(priceById));
        } catch (err) { /* sessionStorage unavailable — fall back to in-memory */ }
    }
}

function priceForProductId(id) {
    return id != null && priceById[String(id)] ? priceById[String(id)] : undefined;
}

// viewProductDetail / clickProductLink product -> neutral item.
// baseCost is usually absent on product views; fall back to a price cached from
// a prior add/checkout this session, else Price degrades to 0.
function mapProductToItem(product) {
    const p = product || {};
    return {
        productName: p.name,
        productId: p.id,
        brand: getBrandFromHostname(),
        price: p.baseCost != null ? p.baseCost : priceForProductId(p.id),
        categories: p.category && p.category.name ? [p.category.name] : [],
        imageURL: pickImageURL(p.images),
        url: currentURL(),
        modifiers: [],
    };
}

// addToCart basketProduct -> neutral item.
function mapBasketProductToItem(basketProduct) {
    const bp = basketProduct || {};
    const product = bp.product || {};
    return {
        productName: bp.productName || product.name,
        productId: product.id,
        brand: getBrandFromHostname(),
        price: bp.unitCost,
        quantity: bp.quantity,
        categories: bp.categoryName ? [bp.categoryName] : [],
        imageURL: pickImageURL(product.images) || imageForProductId(product.id),
        url: currentURL(),
        modifiers: parseModifiers(bp.customizeDescription),
    };
}

// One basketProduct -> neutral checkout line item.
function mapBasketProductToLineItem(basketProduct) {
    const bp = basketProduct || {};
    const product = bp.product || {};
    return {
        productId: product.id,
        productName: bp.productName || product.name,
        quantity: bp.quantity,
        itemPrice: bp.unitCost,
        productURL: currentURL(),
        imageURL: pickImageURL(product.images) || imageForProductId(product.id),
        productCategories: bp.categoryName ? [bp.categoryName] : [],
        modifiers: parseModifiers(bp.customizeDescription),
    };
}

// checkout basket -> neutral cart.
function mapBasketToCart(basket) {
    const b = basket || {};
    const products = Array.isArray(b.basketProducts) ? b.basketProducts : [];
    return {
        value: b.subTotal,
        brand: getBrandFromHostname(),
        fulfillmentType: mapFulfillmentType(b.handoffMode),
        checkoutURL: currentURL(),
        items: products.map(mapBasketProductToLineItem),
    };
}

// clickProductLink and viewProductDetail can both fire for the same product;
// de-dupe per product id within a short window.
const VIEWED_DEDUPE_MS = 2000;
const lastViewedAt = {};

export function trackViewedProduct(product) {
    rememberProductImage(product);
    const item = mapProductToItem(product);
    if (!item.productName && !item.productId) {
        debugLog('Skipping Viewed Product - no product data');
        return;
    }
    const key = String(item.productId || item.productName);
    const now = Date.now();
    if (lastViewedAt[key] && (now - lastViewedAt[key]) < VIEWED_DEDUPE_MS) {
        debugLog('Skipping duplicate Viewed Product for', key);
        return;
    }
    lastViewedAt[key] = now;

    const payload = buildViewedProductPayload(item);
    debugLog('Viewed Product payload:', payload);
    klaviyo.track(VIEWED_PRODUCT, payload).then(() => {
        debugLog('Viewed Product tracked');
    }).catch((err) => {
        debugLog('Error tracking Viewed Product:', err);
    });
}

export function trackAddedToCart(basketProduct) {
    const item = mapBasketProductToItem(basketProduct);
    rememberProductPrice(item.productId, item.price); // cache price for later Viewed Product back-fill
    if (!item.productName && !item.productId) {
        debugLog('Skipping Added to Cart - no product data');
        return;
    }
    const payload = buildAddedToCartPayload(item);
    debugLog('Added to Cart payload:', payload);
    klaviyo.track(ADDED_TO_CART, payload).then(() => {
        debugLog('Added to Cart tracked');
    }).catch((err) => {
        debugLog('Error tracking Added to Cart:', err);
    });
}

export function trackStartedCheckout(basket) {
    const cart = mapBasketToCart(basket);
    cart.items.forEach((li) => rememberProductPrice(li.productId, li.itemPrice));
    const payload = buildStartedCheckoutPayload(cart);
    debugLog('Started Checkout payload:', payload);
    klaviyo.track(STARTED_CHECKOUT, payload).then(() => {
        debugLog('Started Checkout tracked');
    }).catch((err) => {
        debugLog('Error tracking Started Checkout:', err);
    });
}

// Guest identification from Olo's /checkout/auth form. Olo collects name/email/
// phone there but doesn't expose them on window.Olo.data.user, so we read the
// inputs directly. Selectors confirmed against Olo Serve's Ember form; the
// ember*-input ids are dynamic, so we key off name/autocomplete/type.
function findField(selectors) {
    for (let i = 0; i < selectors.length; i++) {
        const el = document.querySelector(selectors[i]);
        if (el) return el;
    }
    return null;
}
const findEmailField = () => findField(['input[name="emailAddress"]', 'input[autocomplete="email"]', 'input[type="email"]']);
const findPhoneField = () => findField(['input[autocomplete="tel"]', 'input[name="phoneNumber"]', 'input[type="tel"]']);
const findFirstNameField = () => findField(['input[name="firstName"]', 'input[autocomplete="given-name"]']);
const findLastNameField = () => findField(['input[name="lastName"]', 'input[autocomplete="family-name"]']);
const fieldValue = (el) => (el && el.value ? el.value.trim() : '');

let lastIdentifyKey = '';

export function attemptIdentify(source) {
    const email = fieldValue(findEmailField());
    const phone = fieldValue(findPhoneField());
    const first = fieldValue(findFirstNameField());
    const last = fieldValue(findLastNameField());
    const hasEmail = email && isValidEmail(email);
    const hasPhone = phone && isValidPhone(phone);

    // Olo's auth form requires name + contact, so wait for the full set and send
    // one complete identify rather than partial ones as fields are filled.
    if ((!hasEmail && !hasPhone) || !first || !last) return;

    const props = { first_name: first, last_name: last };
    if (hasEmail) props.email = email;
    if (hasPhone) props.phone_number = phone;

    const key = JSON.stringify(props);
    if (key === lastIdentifyKey) return; // don't re-send an identical identify

    debugLog('Identifying guest (' + source + '):', props);
    try {
        klaviyo.identify(props);
        lastIdentifyKey = key; // only mark sent after identify didn't throw, so a failure can retry
    } catch (err) {
        debugLog('Error identifying:', err);
    }
}

// Identify on submit / continue-click — the moment all required fields (incl.
// first/last name) are filled. Document-level capture catches it regardless of
// when Olo's SPA mounts the form, and before it navigates away.
export function startIdentifyMonitoring() {
    const onAction = () => {
        if (window.location.pathname.indexOf('/checkout') !== -1) {
            attemptIdentify('checkout action');
        }
    };
    document.addEventListener('submit', onAction, true);
    document.addEventListener('click', onAction, true);
}
