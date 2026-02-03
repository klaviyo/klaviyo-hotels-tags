// Utility functions for Klaviyo hotel tracking (Production)

// Disable debug logging in production
export const DEBUG = false;

// Debug logging utility
export function debugLog(message, data) {
    if (DEBUG) {
        console.log('[Klaviyo Hotel Tracking] ' + message, data || '');
    }
}

// Simple email validation
export function isValidEmail(email) {
    if (!email || email.length < 5) return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Event mapping constants
export const KLAVIYO_EVENT_KEY_MAP = {
    "cb_booking_engine_load": "Viewed Booking Engine",
    "view_item": "Viewed Listing",
    "add_to_cart": "Viewed Listing",  // Track as Viewed Listing since no listing page exists
    "begin_checkout": "Started Checkout"
};

// Check if on guests page
export function isOnGuestsPage() {
    return window.location.href.indexOf('/guests') > -1 || document.getElementById('guest-form');
}

// Parse event data from different formats
export function parseEventData(event) {
    let eventName, ecommerceData, ecommerceItems, isGA4Event = false, isGtagEvent = false;

    if (event.length && event[0] === 'event' && typeof event[1] === 'string') {
        try {
            eventName = event[1];
            ecommerceData = event[2] || {};
            ecommerceItems = ecommerceData.items;
            isGtagEvent = true;
        } catch (err) {
            debugLog('Error parsing gtag event:', err);
        }
    }

    if (!isGtagEvent) {
        try {
            eventName = event.event;
            ecommerceData = event.ecommerce || {};
            ecommerceItems = ecommerceData.items;
            isGA4Event = true;
        } catch (err) {
            debugLog('Error parsing event:', err);
        }
    }

    return { eventName, ecommerceData, ecommerceItems, isGA4Event, isGtagEvent };
}
