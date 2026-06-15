// Shared F&B payload builders. Platform adapters (Toast, Olo) map raw events
// into the neutral inputs below; these produce the normalized Klaviyo schema so
// both platforms emit identical events. Missing fields degrade to "" / [] / 0 —
// builders never return undefined or throw.
//
// Item input: { productName, productId, brand, price, categories, imageURL, url, modifiers }
// Cart input: { value, brand, fulfillmentType, checkoutURL, categories, items: [
//             { productId, productName, quantity, itemPrice, productURL, imageURL,
//               productCategories, modifiers } ] }

// Finite number, else fallback; accepts numeric strings like "13.06".
export function toNumber(value, fallback = 0) {
    const n = typeof value === "string" ? parseFloat(value) : value;
    return typeof n === "number" && isFinite(n) ? n : fallback;
}

export function toStringSafe(value, fallback = "") {
    if (value === null || value === undefined) return fallback;
    return typeof value === "string" ? value : String(value);
}

// Array of non-empty strings; accepts an array or a single value.
export function toArray(value) {
    if (value === null || value === undefined) return [];
    const arr = Array.isArray(value) ? value : [value];
    return arr
        .filter((v) => v !== null && v !== undefined && v !== "")
        .map((v) => (typeof v === "string" ? v : String(v)));
}

function money(value) {
    return Math.round(toNumber(value) * 100) / 100;
}

// Shared item payload for Viewed Product and Added to Cart.
function buildItemPayload(item) {
    const it = item || {};
    return {
        ProductName: toStringSafe(it.productName),
        ProductID: toStringSafe(it.productId),
        Brand: toStringSafe(it.brand),
        Price: money(it.price),
        Categories: toArray(it.categories),
        ImageURL: toStringSafe(it.imageURL),
        URL: toStringSafe(it.url),
        Modifiers: toArray(it.modifiers),
    };
}

export function buildViewedProductPayload(item) {
    return buildItemPayload(item);
}

export function buildAddedToCartPayload(item) {
    return buildItemPayload(item);
}

// One checkout line item; RowTotal = ItemPrice × Quantity.
function buildLineItem(lineItem) {
    const li = lineItem || {};
    const itemPrice = money(li.itemPrice);
    const quantity = toNumber(li.quantity, 1);
    return {
        ProductID: toStringSafe(li.productId),
        ProductName: toStringSafe(li.productName),
        Quantity: quantity,
        ItemPrice: itemPrice,
        RowTotal: money(itemPrice * quantity),
        ProductURL: toStringSafe(li.productURL),
        ImageURL: toStringSafe(li.imageURL),
        ProductCategories: toArray(li.productCategories),
        Modifiers: toArray(li.modifiers),
    };
}

export function buildStartedCheckoutPayload(cart) {
    const c = cart || {};
    const lineItems = Array.isArray(c.items) ? c.items.map(buildLineItem) : [];

    // Prefer a platform-provided pre-tax total; else sum the line items.
    const providedValue = toNumber(c.value, NaN);
    const summedValue = lineItems.reduce((sum, li) => sum + li.RowTotal, 0);
    const value = isFinite(providedValue) ? money(providedValue) : money(summedValue);

    // Explicit cart categories, else the union across line items.
    const categories = c.categories
        ? toArray(c.categories)
        : dedupe(lineItems.reduce((acc, li) => acc.concat(li.ProductCategories), []));

    return {
        $value: value,
        ItemNames: lineItems.map((li) => li.ProductName).filter((n) => n !== ""),
        CheckoutURL: toStringSafe(c.checkoutURL),
        Categories: categories,
        FulfillmentType: toStringSafe(c.fulfillmentType),
        Brand: toStringSafe(c.brand),
        Items: lineItems,
    };
}

function dedupe(arr) {
    const seen = {};
    const out = [];
    for (const v of arr) {
        if (!seen[v]) {
            seen[v] = true;
            out.push(v);
        }
    }
    return out;
}
