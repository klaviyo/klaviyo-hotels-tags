// Utility functions for Klaviyo hotel tracking

// Enable debug logging
export const DEBUG = true;

// Debug logging utility
export function debugLog(message, data) {
    if (DEBUG) {
        console.log('[Klaviyo Hotel Tracking] ' + message, data || '');
    }
}

// Simple email validation
export function isValidEmail(email) {
    if (!email || email.length < 5) return false;
    // Check for @ and . with characters around them
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

    // Check if this is a gtag format event
    if (event.length && event[0] === 'event' && typeof event[1] === 'string') {
        try {
            eventName = event[1];
            ecommerceData = event[2] || {};
            ecommerceItems = ecommerceData.items;
            isGtagEvent = true;
            debugLog('Parsed as gtag event:', { eventName, hasItems: !!ecommerceItems, data: ecommerceData });
        } catch (err) {
            debugLog('Error parsing gtag event:', err);
        }
    }

    // If not gtag format, try standard GA4 dataLayer format
    if (!isGtagEvent) {
        try {
            eventName = event.event;
            ecommerceData = event.ecommerce || {};
            ecommerceItems = ecommerceData.items;
            isGA4Event = true;
            debugLog('Parsed as GA4 event:', { eventName, hasItems: !!ecommerceItems });
        } catch (err) {
            debugLog('Error parsing event:', err);
        }
    }

    return { eventName, ecommerceData, ecommerceItems, isGA4Event, isGtagEvent };
}
