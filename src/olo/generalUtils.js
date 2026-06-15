// General utility functions for Olo Serve tracking.

import { DEBUG, FULFILLMENT_TYPE_MAP, PREFERRED_IMAGE_GROUP } from './constants.js';
import { createDebugLogger } from '../shared/debugUtils.js';

// Debug logging utility
const logger = createDebugLogger('[Klaviyo Olo Tracking]', DEBUG);
export function debugLog(message, data) {
    logger(message, data !== undefined ? data : '');
}

// Parse Olo's `customizeDescription` (one comma-joined string) into a Modifiers
// array. The string mixes the base option and the chosen modifiers, e.g.:
//   "Base Price, Rice Noodles (v, gf), Roasted Tofu (v, gf), Scallions (v, gf)"
// Commas also appear INSIDE parentheses ("(v, gf)"), so a naive split breaks —
// we split only on top-level commas (paren depth 0), trim, drop the leading
// "Base Price" sentinel, and drop empties.
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

// Map Olo handoffMode to a normalized FulfillmentType ("Pickup" | "Delivery").
// Returns "" for unknown values so we never emit a non-spec string.
export function mapFulfillmentType(handoffMode) {
    if (!handoffMode || typeof handoffMode !== 'string') return '';
    const key = handoffMode.toLowerCase().replace(/[\s_-]/g, '');
    return FULFILLMENT_TYPE_MAP[key] || '';
}

// Pick the best image URL from an Olo product's `images` array. Prefers the
// menu thumbnail group, falls back to the first available filename.
export function pickImageURL(images) {
    if (!Array.isArray(images) || images.length === 0) return '';
    const preferred = images.find((img) => img && img.groupName === PREFERRED_IMAGE_GROUP);
    if (preferred && preferred.filename) return preferred.filename;
    const firstWithFile = images.find((img) => img && img.filename);
    return firstWithFile ? firstWithFile.filename : '';
}

// Derive a Brand from the ordering hostname. Olo's `vendor.name` is the
// LOCATION (e.g. "Seaport"), not the brand, so we infer the brand from the
// registrable domain label: order.honeygrow.com -> "Honeygrow".
export function getBrandFromHostname() {
    try {
        const host = (window.location && window.location.hostname) || '';
        const labels = host.split('.').filter(Boolean);
        if (labels.length === 0) return '';
        // Drop a trailing TLD label; for "order.honeygrow.com" -> "honeygrow".
        const brandLabel = labels.length >= 2 ? labels[labels.length - 2] : labels[0];
        if (!brandLabel) return '';
        return brandLabel.charAt(0).toUpperCase() + brandLabel.slice(1);
    } catch (err) {
        return '';
    }
}

// Current page URL, guarded.
export function currentURL() {
    try {
        return (window.location && window.location.href) || '';
    } catch (err) {
        return '';
    }
}
