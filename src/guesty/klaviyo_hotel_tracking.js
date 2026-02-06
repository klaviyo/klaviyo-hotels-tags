// Guesty hotel tracking - intercepts API calls to track events
import { getCurrentPageURL, getURLParams, debugLog } from './generalUtils.js';
import {
    trackViewedListingOrCheckout,
    trackStartedCheckoutOnce,
    setupCheckoutIdentifyListeners,
    setQuoteData,
    setLastViewedListing,
    getLastViewedListing
} from './klaviyoUtils.js';
import { klaviyo } from '../shared/klaviyoInstance.js';

(function () {
    const originalFetch = window.fetch;
    const originalXHROpen = XMLHttpRequest.prototype.open;
    const FIELDS = "_id+title+nickname+type+roomType+propertyType+accommodates+amenities+bathrooms+bedrooms+beds+bedType+timezone+defaultCheckInTime+defaultCheckOutTime+address+picture+pictures+prices+publicDescription+terms+taxes+reviews+tags+parentId++";

    // Initialize Klaviyo

    // Intercept fetch requests
    window.fetch = async function (...args) {
        const response = await originalFetch(...args);
        const clonedResponse = response.clone();
        const url = typeof args[0] === "string" ? args[0] : args[0]?.url;

        // Track Viewed Listing
        if (url?.includes('/api/pm-websites-backend/listings/') && url?.includes("?fields") && !getCurrentPageURL().includes("/checkout")) {
            clonedResponse.text().then((data) => {
                const listingData = JSON.parse(data);
                setLastViewedListing(listingData); // Store for checkout
                trackViewedListingOrCheckout("Viewed Listing", listingData);
            });
        }

        // Track Started Checkout
        if (url?.includes('/api/pm-websites-backend/reservations/quotes') && getCurrentPageURL().includes("/checkout")) {
            clonedResponse.text().then(async (data) => {
                try {
                    let parsedData = JSON.parse(data);
                    debugLog('Quote data received:', parsedData);

                    // Get dates and guest count from URL parameters
                    const urlParams = getURLParams();
                    debugLog('URL parameters:', urlParams);

                    const totalValue = parsedData.rates.ratePlans[0].ratePlan.money.fareAccommodationAdjusted;
                    const additionalFields = {
                        "CheckIn": urlParams.checkIn || parsedData.checkInDateLocalized,
                        "CheckOut": urlParams.checkOut || parsedData.checkOutDateLocalized,
                        "Number of Guests": urlParams.minOccupancy ? parseInt(urlParams.minOccupancy) : parsedData.guestsCount,
                        "Guest Details": parsedData.numberOfGuests,
                        "CheckIn Date and Time": parsedData.stay[0].eta,
                        "CheckOut Date and Time": parsedData.stay[0].etd
                    };

                    // Use stored listing data from Viewed Listing event
                    const storedListingData = getLastViewedListing();

                    if (storedListingData) {
                        debugLog('Using stored listing data from Viewed Listing event');
                        setQuoteData(storedListingData, totalValue, additionalFields);

                        klaviyo.isIdentified().then(res => {
                            if (res) {
                                trackStartedCheckoutOnce();
                            } else {
                                setupCheckoutIdentifyListeners();
                            }
                        });
                    } else {
                        debugLog('Warning: No stored listing data available. User may not have viewed listing page first.');
                    }
                } catch (error) {
                    debugLog('Error in Started Checkout tracking (fetch):', error);
                }
            });
        }
        return response;
    };

    // Intercept XMLHttpRequest
    XMLHttpRequest.prototype.open = function (method, url, ...rest) {
        this.addEventListener('load', function () {
            // Track Viewed Listing
            if (url.includes('/api/pm-websites-backend/listings/') && url.includes('?fields') && !getCurrentPageURL().includes("/checkout")) {
                try {
                    let data = JSON.parse(this.responseText);
                    setLastViewedListing(data); // Store for checkout
                    trackViewedListingOrCheckout("Viewed Listing", data);
                } catch (e) {
                    debugLog("Error parsing JSON response: ", e);
                }
            }

            // Track Started Checkout
            if (url.includes('/api/pm-websites-backend/reservations/quotes') && getCurrentPageURL().includes("/checkout")) {
                try {
                    let data = JSON.parse(this.responseText);
                    debugLog('Quote data received (XHR):', data);

                    // Get dates and guest count from URL parameters
                    const urlParams = getURLParams();
                    debugLog('URL parameters (XHR):', urlParams);

                    const totalValue = data.rates.ratePlans[0].ratePlan.money.fareAccommodationAdjusted;
                    const additionalFields = {
                        "CheckIn": urlParams.checkIn || data.checkInDateLocalized,
                        "CheckOut": urlParams.checkOut || data.checkOutDateLocalized,
                        "Number of Guests": urlParams.minOccupancy ? parseInt(urlParams.minOccupancy) : data.guestsCount,
                        "Guest Details": data.numberOfGuests,
                        "CheckIn Date and Time": data.stay[0].eta,
                        "CheckOut Date and Time": data.stay[0].etd
                    };

                    // Use stored listing data from Viewed Listing event
                    const storedListingData = getLastViewedListing();

                    if (storedListingData) {
                        debugLog('Using stored listing data from Viewed Listing event (XHR)');
                        setQuoteData(storedListingData, totalValue, additionalFields);

                        klaviyo.isIdentified().then(res => {
                            if (res) {
                                trackStartedCheckoutOnce();
                            } else {
                                setupCheckoutIdentifyListeners();
                            }
                        });
                    } else {
                        debugLog('Warning: No stored listing data available (XHR). User may not have viewed listing page first.');
                    }
                } catch (e) {
                    debugLog("Error parsing JSON response (XHR): ", e);
                }
            }
        });

        return originalXHROpen.apply(this, [method, url, ...rest]);
    };

    debugLog('Guesty tracking script initialized');
})();
