// Normalized F&B payload builders (VEX-353).
//
// Platform adapters (Toast, Olo) map their raw event data into the
// platform-neutral input shapes below; these builders then produce the exact
// Klaviyo property schema so both platforms emit identical events.
//
// Neutral item input (Viewed Product / Added to Cart):
//   { productName, productId, brand, price, categories, imageURL, url, modifiers }
// Neutral cart input (Started Checkout):
//   { value, brand, fulfillmentType, checkoutURL, categories, items: [
//       { productId, productName, quantity, itemPrice, productURL, imageURL,
//         productCategories, modifiers } ] }
//
// All fields are optional: missing values degrade to empty string / empty array
// / 0 — builders never return `undefined` for a key and never throw.

// ---- type coercion helpers --------------------------------------------------

// Coerce to a finite number, else fall back (default 0). Accepts numeric
// strings like "13.06"; rejects NaN/Infinity/null/undefined.
export function toNumber(value, fallback = 0) {
    const n = typeof value === "string" ? parseFloat(value) : value;
    return typeof n === "number" && isFinite(n) ? n : fallback;
}

// Coerce to a string, else fall back (default ""). Guards null/undefined.
export function toStringSafe(value, fallback = "") {
    if (value === null || value === undefined) return fallback;
    return typeof value === "string" ? value : String(value);
}

// Coerce to a clean array of non-empty strings. Accepts an array or a single
// value; filters out empties so e.g. Categories never contains "".
export function toArray(value) {
    if (value === null || value === undefined) return [];
    const arr = Array.isArray(value) ? value : [value];
    return arr
        .filter((v) => v !== null && v !== undefined && v !== "")
        .map((v) => (typeof v === "string" ? v : String(v)));
}

// Round to 2 decimals to avoid float noise in monetary values.
function money(value) {
    return Math.round(toNumber(value) * 100) / 100;
}

// ---- item-level builders ----------------------------------------------------

// Build the shared item-level payload used by both Viewed Product and Added to
// Cart. Item-level props per spec: ProductName, ProductID, Brand, Price
// (numeric, pre-tax), Categories (array), ImageURL, URL, Modifiers (array).
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

// ---- checkout builder -------------------------------------------------------

// Build one normalized line item for the Started Checkout Items[] array.
// RowTotal = ItemPrice × Quantity (spec).
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

// Build the Started Checkout payload. Checkout props per spec: $value,
// ItemNames (array), CheckoutURL, Categories (array), FulfillmentType
// ("Delivery" | "Pickup"), Brand, and Items[] line items.
export function buildStartedCheckoutPayload(cart) {
    const c = cart || {};
    const lineItems = Array.isArray(c.items) ? c.items.map(buildLineItem) : [];

    // $value: prefer a platform-provided pre-tax total; otherwise sum the line
    // items' RowTotals so $value always totals all line items.
    const providedValue = toNumber(c.value, NaN);
    const summedValue = lineItems.reduce((sum, li) => sum + li.RowTotal, 0);
    const value = isFinite(providedValue) ? money(providedValue) : money(summedValue);

    // Categories: explicit cart-level categories, else the union of all line
    // items' categories (deduped, order preserved).
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
