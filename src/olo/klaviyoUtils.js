// Olo -> Klaviyo adapters: map Olo Serve event args into the shared neutral
// input shapes, run the shared F&B builders, and track via Klaviyo.

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

// Olo's addToCart / basket payloads carry only a minimal product ({ id }) with
// no images. The richer view/click product objects DO include images, so we
// cache them by product id and back-fill onto cart + checkout line items.
const imageById = {};

function rememberProductImage(product) {
    if (!product || product.id == null) return;
    const url = pickImageURL(product.images);
    if (url) imageById[String(product.id)] = url;
}

function imageForProductId(id) {
    return id != null && imageById[String(id)] ? imageById[String(id)] : '';
}

// ---- mappers (Olo arg -> neutral builder input) -----------------------------

// v1.viewProductDetail product -> neutral item.
// Note: product.baseCost is often absent on Olo product views (hasPrice:false),
// so Price degrades to 0 by design.
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
        modifiers: [], // product views carry no chosen modifiers
    };
}

// v1.addToCart basketProduct -> neutral item.
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
        productURL: currentURL(), // Olo has no per-product URL on checkout
        imageURL: pickImageURL(product.images) || imageForProductId(product.id),
        productCategories: bp.categoryName ? [bp.categoryName] : [],
        modifiers: parseModifiers(bp.customizeDescription),
    };
}

// v1.checkout basket -> neutral cart.
function mapBasketToCart(basket) {
    const b = basket || {};
    const products = Array.isArray(b.basketProducts) ? b.basketProducts : [];
    return {
        value: b.subTotal, // pre-tax total (builder falls back to summing rows)
        brand: getBrandFromHostname(),
        fulfillmentType: mapFulfillmentType(b.handoffMode),
        checkoutURL: currentURL(),
        items: products.map(mapBasketProductToLineItem),
    };
}

// ---- track functions --------------------------------------------------------

// Viewed Product can be triggered by two Olo events that may both fire for the
// same product within milliseconds (v1.clickProductLink and v1.viewProductDetail).
// De-dupe so we emit at most one Viewed Product per product in a short window.
const VIEWED_DEDUPE_MS = 2000;
const lastViewedAt = {}; // productId -> last Viewed Product timestamp

export function trackViewedProduct(product) {
    rememberProductImage(product); // cache image to back-fill Added to Cart / checkout
    const item = mapProductToItem(product);
    if (!item.productName && !item.productId) {
        debugLog('Skipping Viewed Product - no product data');
        return;
    }
    // Keyed by product so both the live case (click + detail fire adjacently)
    // and the replay case (all clicks, then all details) collapse correctly.
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
