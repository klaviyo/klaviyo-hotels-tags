// Constants for Klaviyo hotel tracking

// Enable debug logging
export const DEBUG = false;

// Event mapping constants - maps GA4/Cloudbeds events to Klaviyo events
export const KLAVIYO_EVENT_KEY_MAP = {
    "view_item": "Viewed Listing",
    "add_to_cart": "Viewed Listing",  // Track as Viewed Listing since no listing page exists
    "begin_checkout": "Started Checkout"
};
