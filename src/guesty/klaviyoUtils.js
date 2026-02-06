// Klaviyo-specific utility functions

import { isValidEmail, isValidPhone, debugLog } from './generalUtils.js';
import { klaviyo } from '../shared/klaviyoInstance.js';

// Monitoring account for error tracking (loaded from .env at build time)
const MONITORING_ACCOUNT = process.env.MONITORING_ACCOUNT;
const MONITORING_PROFILE_ID = process.env.MONITORING_PROFILE_ID;

// Track state for checkout event
let checkoutTracked = false;
let quoteResponseData = null;
let totalValue = null;
let additionalFields = {};

// Store the last viewed listing data for checkout
let lastViewedListing = null;

export function resetCheckoutState() {
    checkoutTracked = false;
    quoteResponseData = null;
    totalValue = null;
    additionalFields = {};
}

export function setQuoteData(data, value, fields) {
    quoteResponseData = data;
    totalValue = value;
    additionalFields = fields;
}

export function setLastViewedListing(listingData) {
    lastViewedListing = listingData;
    debugLog('Stored listing data for checkout:', listingData);
}

export function getLastViewedListing() {
    return lastViewedListing;
}

// Send error alert to monitoring account for critical errors only
async function sendErrorAlert(eventName, errorCause, errorMessage, customerAccountId) {
    try {
        debugLog('Sending critical error alert to monitoring account:', {
            eventName,
            errorCause,
            errorMessage,
            customerAccountId
        });

        // Use fetch to directly call Klaviyo Create Client Event API
        const response = await fetch(`https://a.klaviyo.com/client/events/?company_id=${MONITORING_ACCOUNT}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                data: {
                    type: 'event',
                    attributes: {
                        profile: {
                            $external_id: MONITORING_PROFILE_ID,
                            $first_name: 'Guesty',
                            $last_name: 'Onsite'
                        },
                        metric: {
                            name: 'Guesty Integration Error'
                        },
                        properties: {
                            'Failed Event': eventName,
                            'Error Cause': errorCause,
                            'Error Message': errorMessage || 'Unknown error',
                            'Customer Account ID': customerAccountId,
                            'Timestamp': new Date().toISOString(),
                            'Page URL': window.location.href,
                            'User Agent': navigator.userAgent
                        }
                    }
                }
            })
        });

        if (response.ok) {
            debugLog('Critical error alert sent successfully');
        } else {
            debugLog('Error alert API response failed:', response.status, response.statusText);
        }
    } catch (alertError) {
        debugLog('Failed to send error alert:', alertError);
    }
}

export function trackViewedListingOrCheckout(eventName, responseData, value, additionalFieldsParam) {
    let listingData = {
        "Title": responseData.title,
        "ID": responseData._id,
        "Tags": responseData.tags,
        "ImageURL": responseData.picture?.thumbnail || "",
        "Property Type": responseData.propertyType,
        "URL": window.location.href,
        "Listing City": responseData.address?.city || "",
        "Listing Country": responseData.address?.country || "",
        "Price": responseData.prices?.basePrice,
        "Amenities": responseData.amenities,
        "Listing Timezone": responseData.timezone,
        "$extra": {
            "prices": responseData.prices,
            "reviews": responseData.reviews,
            "taxes": responseData.taxes,
            "images": responseData.pictures,
            "bedrooms": responseData.bedrooms,
            "bathrooms": responseData.bathrooms
        }
    };

    if (additionalFieldsParam && Object.keys(additionalFieldsParam).length) {
        Object.assign(listingData, additionalFieldsParam);
    }

    if (value) {
        listingData["$value"] = value;
    }

    // Get customer account ID for error reporting
    let customerAccountId = 'unknown';
    try {
        if (klaviyo.account && typeof klaviyo.account === 'function') {
            customerAccountId = klaviyo.account();
        }
    } catch (e) {
        debugLog('Could not get account ID:', e);
    }

    klaviyo.isIdentified().then(res => {
        if (res) {
            debugLog(`Tracking Klaviyo Event - ${eventName}: `, listingData);
        } else {
            debugLog(`Klaviyo Event - ${eventName} - tracked to local storage, user is not identified yet`);
        }
    }).catch(err => {
        debugLog(`Error checking identification status for ${eventName}:`, err);
    });

    // Track event and monitor for critical failures
    try {
        klaviyo.track(`${eventName}`, listingData).then(res => {
            klaviyo.isIdentified().then(result => {
                if (result) {
                    debugLog(`Klaviyo Event - ${eventName} - Success: ${res}`);
                }
            });
        }).catch(err => {
            // Critical error: event tracking failed
            debugLog(`CRITICAL: Error tracking ${eventName}:`, err);
            const errorCause = 'klaviyo.track() promise rejected';
            sendErrorAlert(eventName, errorCause, err.message || err.toString(), customerAccountId);
        });
    } catch (err) {
        // Critical error: event tracking threw exception
        debugLog(`CRITICAL: Exception tracking ${eventName}:`, err);
        const errorCause = 'klaviyo.track() threw exception';
        sendErrorAlert(eventName, errorCause, err.message || err.toString(), customerAccountId);
    }
}

export function trackStartedCheckoutOnce() {
    if (checkoutTracked || !quoteResponseData) return;
    checkoutTracked = true;
    trackViewedListingOrCheckout("Started Checkout", quoteResponseData, totalValue, additionalFields);
}

export function setupCheckoutIdentifyListeners() {
    let emailField = document.querySelector("input[name='email']");
    let phoneNumber = document.querySelector("input[name='phone']");
    let firstName = document.querySelector("input[name='firstName']");
    let lastName = document.querySelector("input[name='lastName']");

    function handleUserInput() {
        const user = {
            "email": emailField?.value.trim() || "",
            "phone_number": phoneNumber?.value || "",
            "first_name": firstName?.value || "",
            "last_name": lastName?.value || "",
        };

        const validEmail = isValidEmail(user.email);
        const validPhone = isValidPhone(user.phone_number);

        if (validEmail || validPhone) {
            klaviyo.identify(user).then(() => {
                debugLog("Identified Klaviyo User!");
                trackStartedCheckoutOnce();
            }).catch(err => {
                // Non-critical: identification failed but events can still be tracked
                debugLog("Error identifying user:", err);
            });
        } else {
            debugLog("Neither valid email nor phone entered yet", { validEmail, validPhone });
        }
    }

    phoneNumber?.addEventListener("blur", handleUserInput);
    emailField?.addEventListener("blur", handleUserInput);
}
