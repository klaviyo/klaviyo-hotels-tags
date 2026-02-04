// Klaviyo-specific utility functions

import { debugLog, isValidEmail } from './generalUtils.js';

// Track if we've already attempted to identify the user
let identifyAttempted = false;

// Initialize Klaviyo
const klaviyo = window.klaviyo || [];

// Build payload for Viewed Listing event
export function buildViewedListingPayload(itemData, ecommerceData) {
    debugLog('Building Viewed Listing payload');

    // Calculate total value: use ecommerceData.value if available, otherwise price * quantity
    const totalValue = ecommerceData.value || (itemData.price || 0) * (itemData.quantity || 1);

    const payload = {
        "Title": itemData.item_name || itemData.name || "",
        "ID": itemData.item_id || itemData.id || "",
        "Price": itemData.price || 0,
        "URL": window.location.href,
        "Property Name": itemData.affiliation || itemData.item_brand || "",
        "Property Type": itemData.item_category || "",
        "$value": totalValue,
        "$extra": {
            "Start Date": itemData.start_date || ecommerceData.start_date || "",
            "End Date": itemData.end_date || ecommerceData.end_date || "",
            "Total Guests": itemData.total_guests || ecommerceData.total_guests || "",
            "Number of Adults": itemData.adults || ecommerceData.adults || "",
            "Number of Kids": itemData.kids || ecommerceData.kids || "",
            "Number of Nights": itemData.nights || itemData.quantity || ecommerceData.nights || ecommerceData.quantity || "",
            "Package Name": itemData.item_package_name || ecommerceData.item_package_name || "",
            "Package ID": itemData.item_package_id || ecommerceData.item_package_id || "",
            "Property ID": ecommerceData.property_id || "",
        }
    };
    debugLog('Viewed Listing payload:', payload);
    return payload;
}

// Build payload for Started Checkout event
export function buildStartedCheckoutPayload(items, ecommerceData) {
    debugLog('Building Started Checkout payload');

    const { checkoutValue, totalGuests } = getCheckoutValueAndTotalGuests(items, ecommerceData);

    const checkoutPayload = {
        "$value": checkoutValue,
        "Currency": ecommerceData.currency || "",
        "Number of Guests": totalGuests,
        "CheckIn": ecommerceData.start_date || ecommerceData.check_in || ecommerceData.checkin || ecommerceData.check_in_date || "",
        "CheckOut": ecommerceData.end_date || ecommerceData.check_out || ecommerceData.checkout || ecommerceData.check_out_date || "",
        "Property Name": ecommerceData.property_name || (items && items.length > 0 && items[0].affiliation) || "",
        "$extra": {
            "Number of Adults": ecommerceData.adults || 1,
            "Number of Kids": ecommerceData.children || ecommerceData.kids || 0,
            "Number of Rooms": ecommerceData.rooms || ecommerceData.room_count || 1,
            "Booking Engine Source": ecommerceData.be_source || "",
            "Coupon": ecommerceData.coupon || "",
            "Tax": ecommerceData.tax || 0,
            "Property ID": ecommerceData.property_id || "",
        }
    };

    // Add items if available
    if (items && items.length > 0) {
        checkoutPayload.Items = items;

        // Calculate nights from items if available
        if (items[0].nights) {
            checkoutPayload["Number of Nights"] = items[0].nights;
        }
    }

    // Calculate number of nights from check-in/out dates if not already set
    if (!checkoutPayload["Number of Nights"] && checkoutPayload["CheckIn"] && checkoutPayload["CheckOut"]) {
        try {
            const checkIn = new Date(checkoutPayload["CheckIn"]);
            const checkOut = new Date(checkoutPayload["CheckOut"]);
            const nights = Math.round((checkOut - checkIn) / (1000 * 60 * 60 * 24));
            if (nights > 0) {
                checkoutPayload["Number of Nights"] = nights;
            }
        } catch (err) {
            debugLog('Error calculating nights:', err);
        }
    }

    debugLog('Started Checkout payload:', checkoutPayload);
    return checkoutPayload;
}

// Calculate checkout value and total guests from items or ecommerce data
export function getCheckoutValueAndTotalGuests(items, ecommerceData) {
    let checkoutValue = 0;
    let totalGuests = 0;

    // Use ecommerce data if available, otherwise calculate from items
    if (ecommerceData.value) {
        checkoutValue = ecommerceData.value;
    } else if (items && items.length > 0) {
        for (let i = 0; i < items.length; i++) {
            const itemPrice = items[i].price || 0;
            const itemQuantity = items[i].quantity || 1;
            checkoutValue += itemPrice * itemQuantity;
        }
    }

    // Use ecommerce guest count if available, otherwise calculate from items
    if (ecommerceData.total_guests || ecommerceData.guests || ecommerceData.guest_count) {
        totalGuests = ecommerceData.total_guests || ecommerceData.guests || ecommerceData.guest_count;
    } else if (items && items.length > 0) {
        for (let i = 0; i < items.length; i++) {
            if (items[i].total_guests) {
                totalGuests += items[i].total_guests;
            } else if (items[i].adults || items[i].kids) {
                totalGuests += (items[i].adults || 0) + (items[i].kids || 0);
            }
        }
    }

    return {
        checkoutValue: parseFloat(checkoutValue.toFixed(2)),
        totalGuests: totalGuests || 1
    };
}

export function trackViewedListing(itemData, ecommerceData) {
    debugLog('trackViewedListing called with:', { itemData: itemData, ecommerceData: ecommerceData });

    // Skip if no meaningful data
    if (!itemData || (!itemData.item_name && !itemData.name && !itemData.item_id && !itemData.id)) {
        debugLog('Skipping Viewed Listing - no item data');
        return;
    }

    const listingData = buildViewedListingPayload(itemData, ecommerceData);
    klaviyo.track("Viewed Listing", listingData).then(() => {
        debugLog('Viewed Listing tracked');
    }).catch((err) => {
        debugLog('Error tracking Viewed Listing:', err);
    });
}

export function trackStartedCheckout(items, ecommerceData) {
    debugLog('trackStartedCheckout called with:', { items: items, ecommerceData: ecommerceData });

    const checkoutData = buildStartedCheckoutPayload(items, ecommerceData);

    klaviyo.track("Started Checkout", checkoutData).then(() => {
        debugLog('Started Checkout tracked');
    }).catch((err) => {
        debugLog('Error tracking Started Checkout:', err);
    });
}
// User identification functions
export function attemptIdentify(source) {
    if (source) {
        debugLog('attemptIdentify called from:', source);
    }

    // Check if user is already identified
    if (klaviyo.isIdentified && typeof klaviyo.isIdentified === 'function') {
        klaviyo.isIdentified().then(function(isIdentified) {
            debugLog('klaviyo.isIdentified():', isIdentified);

            if (isIdentified) {
                debugLog('User already identified, skipping identification');
                identifyAttempted = true;
                return;
            }

            // User not identified, proceed with identification
            debugLog('User not identified, proceeding with identification');
            performIdentification(source);
        }).catch(function(err) {
            debugLog('Error checking isIdentified, proceeding anyway:', err);
            performIdentification(source);
        });
    } else {
        debugLog('klaviyo.isIdentified not available, proceeding with identification');
        performIdentification(source);
    }
}

export function performIdentification(source) {
    // Try to get email and phone from the form - try multiple selectors
    const emailField = document.querySelector('input[name="email"]') ||
                    document.querySelector('[data-testid="guest-form-email-input"]') ||
                    document.querySelector('input[type="email"]');

    const phoneField = document.querySelector('input[name="phoneNumber"]') ||
                    document.querySelector('[data-testid="guest-form-phone-input"]') ||
                    document.querySelector('input[type="tel"][name="phoneNumber"]');

    debugLog('Email field found:', !!emailField);
    debugLog('Phone field found:', !!phoneField);

    const email = emailField ? emailField.value.trim() : '';
    const phone = phoneField ? phoneField.value.trim() : '';

    debugLog('Email value:', email);
    debugLog('Phone value:', phone);

    // Validate email if present
    const hasValidEmail = email && isValidEmail(email);
    const hasPhone = phone && phone.length > 0;

    if (!hasValidEmail && email) {
        debugLog('Email invalid or incomplete:', email);
    }

    // Only identify if we have valid email or phone
    if ((hasValidEmail || hasPhone) && !identifyAttempted) {
        const identifyData = {};

        if (hasValidEmail) {
            identifyData['email'] = email;
        }

        if (hasPhone) {
            identifyData['phone_number'] = phone;
        }

        // Only proceed if we have at least valid email or phone
        if (identifyData.email || identifyData.phone_number) {
            // Try to get first and last name if available
            const firstNameField = document.querySelector('input[name="firstName"]') ||
                                document.querySelector('[data-testid="guest-form-first-name-input"]') ||
                                document.querySelector('input[autocomplete="given-name"]');

            const lastNameField = document.querySelector('input[name="lastName"]') ||
                               document.querySelector('[data-testid="guest-form-last-name-input"]') ||
                               document.querySelector('input[autocomplete="family-name"]');

            if (firstNameField && firstNameField.value.trim()) {
                identifyData['first_name'] = firstNameField.value.trim();
            }

            if (lastNameField && lastNameField.value.trim()) {
                identifyData['last_name'] = lastNameField.value.trim();
            }

            debugLog('Identifying user with:', identifyData);
            klaviyo.identify(identifyData);

            // Mark as attempted - never try again
            identifyAttempted = true;
            debugLog('Identification complete - no further attempts will be made');
        }
    } else if (identifyAttempted) {
        debugLog('User already identified in this session, skipping');
    } else {
        debugLog('No valid email or phone found yet, will retry');
    }
}
