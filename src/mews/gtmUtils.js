// GTM and dataLayer utilities

import { debugLog } from './generalUtils.js';
import { KLAVIYO_EVENT_KEY_MAP } from './constants.js';
import { setReservationData, setViewItemData } from './klaviyoUtils.js';
import { klaviyo } from '../shared/klaviyoInstance.js';

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
        if (formElement && (formElement.name === 'email' || formElement.name === 'phone' || formElement.name === 'phoneNumber')) {
            debugLog('User interacted with email/phone field - will check after blur');
            // attemptIdentify will be called by blur/change listeners
        }
    }

    // Handle view_item to store data for later (when distributorRoomAdded fires)
    if (eventName === "view_item") {
        debugLog('view_item detected - storing data for later');
        if (ecommerceItems && ecommerceItems.length > 0) {
            setViewItemData(ecommerceItems[0], ecommerceData);
        }
    }

    // Handle Mews-specific reservation created event (has customerEmail)
    if (eventName === "distributorReservationCreated") {
        debugLog('Mews reservation created event detected');
        if (event.customerEmail) {
            debugLog('Customer email found in reservation event:', event.customerEmail);
            identifyFromEventData(event.customerEmail, event.customerName, handlers);
        }
    }

    // Handle purchase event as backup for identification
    if (eventName === "purchase") {
        debugLog('Purchase event detected');
        // Try to identify from form fields one more time
        setTimeout(function() {
            if (handlers.attemptIdentify) {
                handlers.attemptIdentify('purchase event');
            }
        }, 500);
    }

    // Only proceed if we have a recognized event
    if (eventName && KLAVIYO_EVENT_KEY_MAP[eventName]) {
        debugLog('Matched event type:', KLAVIYO_EVENT_KEY_MAP[eventName]);

        // Handle distributorRoomAdded - track as Viewed Listing (combines view_item + reservation data)
        if (eventName == "distributorRoomAdded") {
            debugLog('Processing Room Added as Viewed Listing event');

            if (event.reservations && event.reservations.length > 0) {
                const reservation = event.reservations[0];
                const occupancy = reservation.occupancyData && reservation.occupancyData.length > 0 ?
                                reservation.occupancyData[0] : null;

                // Store reservation data for Started Checkout later
                const resData = {
                    startDate: reservation.startDate,
                    endDate: reservation.endDate,
                    guests: occupancy ? occupancy.personCount : 0,
                    adults: occupancy ? occupancy.personCount : 0,
                    children: 0,
                    roomId: reservation.roomId,
                    rateId: reservation.rateId
                };

                debugLog('Captured reservation data:', resData);
                setReservationData(resData);

                // Now track Viewed Listing with combined data from view_item + reservation
                debugLog('Tracking Viewed Listing with combined view_item + reservation data');
                handlers.trackViewedListing(reservation, event);
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

// Helper function to identify user from event data (Mews reservation events)
function identifyFromEventData(email, fullName, handlers) {
    debugLog('Attempting identification from event data');

    if (!email || !handlers.attemptIdentify) {
        debugLog('Missing email or identify handler');
        return;
    }


    // Check if already identified
    if (klaviyo.isIdentified && typeof klaviyo.isIdentified === 'function') {
        klaviyo.isIdentified().then(function(isIdentified) {
            if (isIdentified) {
                debugLog('User already identified via Klaviyo, skipping');
                return;
            }

            // Proceed with identification
            performIdentifyFromEvent(email, fullName);
        }).catch(function(err) {
            debugLog('Error checking isIdentified:', err);
            performIdentifyFromEvent(email, fullName);
        });
    } else {
        performIdentifyFromEvent(email, fullName);
    }
}

function performIdentifyFromEvent(email, fullName) {
    const identifyData = { email: email };

    // Parse name if provided
    if (fullName) {
        const nameParts = fullName.trim().split(' ');
        if (nameParts.length > 0) {
            identifyData.first_name = nameParts[0];
            if (nameParts.length > 1) {
                identifyData.last_name = nameParts.slice(1).join(' ');
            }
        }
    }

    debugLog('Identifying user from event data:', identifyData);
    klaviyo.identify(identifyData);
}
