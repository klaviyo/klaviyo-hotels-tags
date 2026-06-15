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

// viewProductDetail / clickProductLink product -> neutral item.
// baseCost is often absent on product views, so Price degrades to 0.
function mapProductToItem(product) {
    const p = product || {};
    return {
        productName: p.name,
        productId: p.id,
        brand: getBrandFromHostname(),
        price: p.baseCost,
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
    const payload = buildStartedCheckoutPayload(cart);
    debugLog('Started Checkout payload:', payload);
    klaviyo.track(STARTED_CHECKOUT, payload).then(() => {
        debugLog('Started Checkout tracked');
    }).catch((err) => {
        debugLog('Error tracking Started Checkout:', err);
    });
}
