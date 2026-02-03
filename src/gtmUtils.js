// GTM and dataLayer utilities

import { debugLog } from './generalUtils.js';
import { KLAVIYO_EVENT_KEY_MAP } from './constants.js';

// Parse event data from different formats (gtag vs GA4)
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

// Main handler for dataLayer push events
// Returns an object with the parsed event data that the caller can use for tracking
export function handleDataLayerPush(event, handlers) {
    debugLog('Event received:', event);

    const { eventName, ecommerceData, ecommerceItems } = parseEventData(event);

    // Handle form_start event for user identification
    if (eventName === "form_start") {
        debugLog('form_start event detected');
        const eventModel = event.eventModel || ecommerceData.eventModel;

        if (eventModel) {
            debugLog('form_start eventModel:', eventModel);

            // Check if this is the guest form
            if (eventModel.form_id === "guest-form" ||
                eventModel.first_field_name === "email" ||
                eventModel.first_field_type === "email") {
                debugLog('Guest form detected via form_start - checking for email/phone');

                // Wait a moment for any autofill to complete, then check fields
                setTimeout(function() {
                    if (handlers.attemptIdentify) {
                        handlers.attemptIdentify('form_start event');
                    }
                }, 500);

                // Start monitoring if not already started
                setTimeout(function() {
                    if (handlers.startIdentifyMonitoring) {
                        handlers.startIdentifyMonitoring();
                    }
                }, 1000);
            }
        }
    }

    // Handle form interaction events (when user interacts with email/phone fields)
    if (eventName === "form_interaction" || eventName === "gtm.formInteract") {
        const formElement = event['gtm.element'];
        if (formElement && (formElement.name === 'email' || formElement.name === 'phoneNumber')) {
            debugLog('User interacted with email/phone field - will check after blur');
            // attemptIdentify will be called by blur/change listeners
        }
    }

    // Only proceed if we have a recognized event
    if (eventName && KLAVIYO_EVENT_KEY_MAP[eventName]) {
        debugLog('Matched event type:', KLAVIYO_EVENT_KEY_MAP[eventName]);

        // Handle view_item - property/listing view
        if (eventName == "view_item") {
            debugLog('Processing Viewed Listing event');
            debugLog('Items available:', ecommerceItems);
            debugLog('Ecommerce data:', ecommerceData);
            if (ecommerceItems && ecommerceItems.length > 0) {
                debugLog('Using items[0] for listing data');
                handlers.trackViewedListing(ecommerceItems[0], ecommerceData);
            } else if (ecommerceData && Object.keys(ecommerceData).length > 1) { // More than just empty object
                debugLog('Using ecommerceData directly for listing data');
                handlers.trackViewedListing(ecommerceData, ecommerceData);
            } else {
                debugLog('Skipping empty Viewed Listing event (no data)');
            }
        }
        // Handle Add to Cart - track as Viewed Listing since there's no real listing page
        else if (eventName == "add_to_cart") {
            debugLog('Processing add_to_cart as Viewed Listing (no listing page on Cloudbeds)');
            if (ecommerceItems && ecommerceItems.length > 0) {
                handlers.trackViewedListing(ecommerceItems[0], ecommerceData);
            }
        }
        // Handle Started Checkout
        else if (eventName == "begin_checkout") {
            debugLog('Processing Started Checkout event');
            handlers.trackStartedCheckout(ecommerceItems, ecommerceData);

            // Immediately check for email/phone in case they're already filled
            setTimeout(function() {
                if (handlers.attemptIdentify) {
                    handlers.attemptIdentify('begin_checkout event');
                }
            }, 500);

            // Start monitoring for guest info after checkout begins
            setTimeout(function() {
                if (handlers.startIdentifyMonitoring) {
                    handlers.startIdentifyMonitoring();
                }
            }, 1000);
        }
    } else {
        debugLog('Event not recognized or not in map:', eventName);
    }
}
