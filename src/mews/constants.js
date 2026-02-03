// Constants for Klaviyo hotel tracking

// Enable debug logging
export const DEBUG = true;

// Event mapping constants - maps GA4/Mews events to Klaviyo events
export const KLAVIYO_EVENT_KEY_MAP = {
    "distributorRoomAdded": "Viewed Listing",  // Has all data including dates
    "begin_checkout": "Started Checkout"
};
