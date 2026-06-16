// General utilities for Olo Serve tracking.

import { DEBUG, FULFILLMENT_TYPE_MAP, PREFERRED_IMAGE_GROUP } from './constants.js';
import { createDebugLogger } from '../shared/debugUtils.js';

const logger = createDebugLogger('[Klaviyo Olo Tracking]', DEBUG);
export function debugLog(message, data) {
    logger(message, data !== undefined ? data : '');
}

// Olo's customizeDescription is one comma-joined string ("Base Price, Rice
// Noodles (v, gf), ..."). Commas also appear inside parens, so split only on
// top-level commas, then drop the leading "Base Price" sentinel.
export function parseModifiers(customizeDescription) {
    if (!customizeDescription || typeof customizeDescription !== 'string') {
        return [];
    }

    const parts = [];
    let current = '';
    let depth = 0;
    for (let i = 0; i < customizeDescription.length; i++) {
        const ch = customizeDescription[i];
        if (ch === '(') {
            depth++;
            current += ch;
        } else if (ch === ')') {
            depth = Math.max(0, depth - 1);
            current += ch;
        } else if (ch === ',' && depth === 0) {
            parts.push(current);
            current = '';
        } else {
            current += ch;
        }
    }
    parts.push(current);

    return parts
        .map((p) => p.trim())
        .filter((p) => p !== '' && p.toLowerCase() !== 'base price');
}

// handoffMode -> "Pickup" | "Delivery"; "" for unknown (never a non-spec value).
export function mapFulfillmentType(handoffMode) {
    if (!handoffMode || typeof handoffMode !== 'string') return '';
    const key = handoffMode.toLowerCase().replace(/[\s_-]/g, '');
    return FULFILLMENT_TYPE_MAP[key] || '';
}

// Prefer the menu thumbnail; fall back to the first available image.
export function pickImageURL(images) {
    if (!Array.isArray(images) || images.length === 0) return '';
    const preferred = images.find((img) => img && img.groupName === PREFERRED_IMAGE_GROUP);
    if (preferred && preferred.filename) return preferred.filename;
    const firstWithFile = images.find((img) => img && img.filename);
    return firstWithFile ? firstWithFile.filename : '';
}

// Brand from hostname — Olo's vendor.name is the location, not the brand.
// order.honeygrow.com -> "Honeygrow".
export function getBrandFromHostname() {
    try {
        const host = (window.location && window.location.hostname) || '';
        const labels = host.split('.').filter(Boolean);
        if (labels.length === 0) return '';
        const brandLabel = labels.length >= 2 ? labels[labels.length - 2] : labels[0];
        if (!brandLabel) return '';
        return brandLabel.charAt(0).toUpperCase() + brandLabel.slice(1);
    } catch (err) {
        return '';
    }
}

export function currentURL() {
    try {
        return (window.location && window.location.href) || '';
    } catch (err) {
        return '';
    }
}

// Canonical Olo product page URL: {origin}/menu/{vendorSlug}/products/{id}
// (matches Olo Serve's product path). Falls back to the current URL.
export function productURL(productId) {
    try {
        const origin = (window.location && window.location.origin) || '';
        const vendor = (window.Olo && window.Olo.data && window.Olo.data.vendor) || {};
        if (origin && vendor.slug && productId != null) {
            return origin + '/menu/' + vendor.slug + '/products/' + productId;
        }
    } catch (err) { /* fall through */ }
    return currentURL();
}

// Olo checkout page URL: {origin}/checkout.
export function checkoutURL() {
    try {
        const origin = (window.location && window.location.origin) || '';
        if (origin) return origin + '/checkout';
    } catch (err) { /* fall through */ }
    return currentURL();
}
