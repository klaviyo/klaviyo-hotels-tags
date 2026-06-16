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

// Viewed Product payload. Price is omitted entirely when unknown (e.g. Olo
// doesn't expose price on product views for fixed-price items) — we never emit
// a misleading Price: 0.
export function buildViewedProductPayload(item) {
    const it = item || {};
    const hasPrice = it.price != null && isFinite(Number(it.price));
    const modifiers = toArray(it.modifiers);
    const payload = {
        ProductName: toStringSafe(it.productName),
        ProductID: toStringSafe(it.productId),
        Brand: toStringSafe(it.brand),
        Price: hasPrice ? money(it.price) : undefined,
        Categories: toArray(it.categories),
        ImageURL: toStringSafe(it.imageURL),
        URL: toStringSafe(it.url),
        // A product view has no chosen modifiers, so omit Modifiers when empty
        // rather than sending an always-blank array.
        Modifiers: modifiers.length ? modifiers : undefined,
    };
    if (!hasPrice) delete payload.Price;
    if (!modifiers.length) delete payload.Modifiers;
    return payload;
}

// Added to Cart — the just-added item (AddedItem* fields) plus the full current
// cart ($value, ItemNames, Items[]), following Klaviyo's standard schema.
// AddedItemPrice is omitted when unknown.
export function buildAddedToCartPayload(addedItem, cart) {
    const a = addedItem || {};
    const c = cart || {};
    const lineItems = Array.isArray(c.items) ? c.items.map(buildLineItem) : [];

    const providedValue = toNumber(c.value, NaN);
    const summed = lineItems.reduce((sum, li) => sum + li.RowTotal, 0);
    const value = isFinite(providedValue) ? money(providedValue) : money(summed);

    const hasPrice = a.price != null && isFinite(Number(a.price));
    const payload = {
        $value: value,
        AddedItemProductName: toStringSafe(a.productName),
        AddedItemProductID: toStringSafe(a.productId),
        AddedItemCategories: toArray(a.categories),
        AddedItemImageURL: toStringSafe(a.imageURL),
        AddedItemURL: toStringSafe(a.url),
        AddedItemPrice: hasPrice ? money(a.price) : undefined,
        AddedItemQuantity: toNumber(a.quantity, 1),
        AddedItemModifiers: toArray(a.modifiers),
        ItemNames: dedupe(lineItems.map((li) => li.ProductName).filter((n) => n !== "")),
        CheckoutURL: toStringSafe(c.checkoutURL),
        Items: lineItems,
    };
    if (!hasPrice) delete payload.AddedItemPrice;
    return payload;
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
        ItemNames: dedupe(lineItems.map((li) => li.ProductName).filter((n) => n !== "")),
        Quantity: lineItems.reduce((sum, li) => sum + li.Quantity, 0),
        CheckoutURL: toStringSafe(c.checkoutURL),
        Categories: categories,
        Modifiers: dedupe(lineItems.reduce((acc, li) => acc.concat(li.Modifiers), [])),
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
