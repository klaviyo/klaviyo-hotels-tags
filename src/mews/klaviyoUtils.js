// Klaviyo-specific utility functions

import { debugLog, isValidEmail } from './generalUtils.js';

// Track if we've already attempted to identify the user
let identifyAttempted = false;

// Store reservation data from distributorRoomAdded event
let reservationData = null;

// Store view_item data for later enrichment
let viewItemData = null;

// Initialize Klaviyo
const klaviyo = window.klaviyo || [];

export function setReservationData(data) {
    reservationData = data;
    debugLog('Stored reservation data:', data);
}

export function setViewItemData(itemData, ecommerceData) {
    viewItemData = { itemData, ecommerceData };
    debugLog('Stored view_item data:', viewItemData);
}

// Build payload for Viewed Listing event
export function buildViewedListingPayload(itemData, ecommerceData) {
    debugLog('Building Viewed Listing payload');

    // Check if itemData is a reservation object from distributorRoomAdded
    // If so, use stored view_item data for room details
    let roomData = itemData;
    let eventData = ecommerceData;

    if (itemData.startDate && viewItemData) {
        // This is from distributorRoomAdded, use stored view_item data for room details
        debugLog('Using stored view_item data for room details');
        roomData = viewItemData.itemData;
        eventData = viewItemData.ecommerceData;

        // Add reservation dates to the data
        roomData = {
            ...roomData,
            start_date: itemData.startDate,
            end_date: itemData.endDate
        };

        eventData = {
            ...eventData,
            ...ecommerceData,  // Include any data from distributorRoomAdded event
            start_date: itemData.startDate,
            end_date: itemData.endDate
        };
    }

    // Calculate total value
    const totalValue = eventData.value || (roomData.price || 0) * (roomData.quantity || 1);

    // Get dates
    const startDate = roomData.start_date || eventData.start_date || "";
    const endDate = roomData.end_date || eventData.end_date || "";

    // Calculate nights from dates
    let nights = roomData.nights || roomData.quantity || eventData.nights || eventData.quantity;
    if (!nights && startDate && endDate) {
        try {
            const start = new Date(startDate);
            const end = new Date(endDate);
            nights = Math.round((end - start) / (1000 * 60 * 60 * 24));
        } catch (err) {
            debugLog('Error calculating nights:', err);
        }
    }

    // Get guest counts
    const occupancy = itemData.occupancyData && itemData.occupancyData.length > 0 ?
                     itemData.occupancyData[0] : null;
    const guests = occupancy ? occupancy.personCount : (reservationData ? reservationData.guests : "");

    const payload = {
        "Title": roomData.item_name || roomData.name || "",
        "ID": roomData.item_id || roomData.id || itemData.roomId || "",
        "Price": roomData.price || 0,
        "URL": window.location.href,
        "Property Name": roomData.item_category2 || roomData.affiliation || ecommerceData.hotelName || "",
        "Location": roomData.item_category3 || "",
        "$value": totalValue,
        "$extra": {
            "Start Date": startDate,
            "End Date": endDate,
            "Total Guests": guests,
            "Number of Adults": guests,
            "Number of Kids": 0,
            "Number of Nights": nights || "",
            "Property ID": roomData.enterpriseId || ecommerceData.hotelId || "",
            "Brand": roomData.item_brand || ""
        }
    };
    debugLog('Viewed Listing payload:', payload);
    return payload;
}

// Build payload for Started Checkout event
export function buildStartedCheckoutPayload(items, ecommerceData) {
    debugLog('Building Started Checkout payload');

    const { checkoutValue, totalGuests } = getCheckoutValueAndTotalGuests(items, ecommerceData);

    // Use stored reservation data for dates if not in ecommerce data
    const checkIn = ecommerceData.start_date || ecommerceData.check_in || ecommerceData.checkin ||
                   ecommerceData.check_in_date || (reservationData ? reservationData.startDate : "");
    const checkOut = ecommerceData.end_date || ecommerceData.check_out || ecommerceData.checkout ||
                    ecommerceData.check_out_date || (reservationData ? reservationData.endDate : "");

    const checkoutPayload = {
        "$value": checkoutValue,
        "Currency": ecommerceData.currency || "",
        "Number of Guests": totalGuests || (reservationData ? reservationData.guests : ""),
        "CheckIn": checkIn,
        "CheckOut": checkOut,
        "Property Name": ecommerceData.property_name ||
                        (items && items.length > 0 && (items[0].item_category2 || items[0].affiliation)) || "",
        "Location": items && items.length > 0 && items[0].item_category3 ? items[0].item_category3 : "",
        "$extra": {
            "Number of Adults": ecommerceData.adults || (reservationData ? reservationData.adults : 1),
            "Number of Kids": ecommerceData.children || ecommerceData.kids || (reservationData ? reservationData.children : 0),
            "Number of Rooms": ecommerceData.rooms || ecommerceData.room_count || 1,
            "Booking Engine Source": ecommerceData.be_source || "Mews Booking Engine",
            "Rate Name": items && items.length > 0 && items[0].item_variant ? items[0].item_variant : "",
            "Coupon": ecommerceData.coupon || "",
            "Tax": ecommerceData.tax || 0,
            "Property ID": (items && items.length > 0 && items[0].enterpriseId) || ecommerceData.property_id || "",
            "Brand": items && items.length > 0 && items[0].item_brand ? items[0].item_brand : ""
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
    // Accept either regular item data OR reservation data (from distributorRoomAdded)
    const hasItemData = itemData && (itemData.item_name || itemData.name || itemData.item_id || itemData.id);
    const hasReservationData = itemData && (itemData.roomId || itemData.startDate);

    if (!hasItemData && !hasReservationData) {
        debugLog('Skipping Viewed Listing - no item or reservation data');
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

    // Find the Mews iframe and get its document
    const iframe = document.querySelector('iframe.mews-distributor') ||
                  document.querySelector('iframe[name*="mews-distributor"]');

    let searchDoc = document;
    if (iframe) {
        try {
            const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
            if (iframeDoc) {
                searchDoc = iframeDoc;
                debugLog('Searching inside Mews iframe');
            }
        } catch (e) {
            debugLog('Cannot access iframe, searching main document');
        }
    }

    // Try to get email and phone from the form - try multiple selectors (Mews uses name="email" and name="phone")
    debugLog('Searching for email field...');
    let emailField = searchDoc.querySelector('input[name="email"]');
    if (!emailField) emailField = searchDoc.querySelector('input[id="email"]');
    if (!emailField) emailField = searchDoc.querySelector('[data-test-id="checkout-field-email"]');
    if (!emailField) emailField = searchDoc.querySelector('input[type="email"]');
    if (!emailField) emailField = searchDoc.querySelector('input[autocomplete="email"]');

    debugLog('Searching for phone field...');
    let phoneField = searchDoc.querySelector('input[name="phone"]');
    if (!phoneField) phoneField = searchDoc.querySelector('input[id="phone"]');
    if (!phoneField) phoneField = searchDoc.querySelector('[data-test-id="checkout-field-phone"]');
    if (!phoneField) phoneField = searchDoc.querySelector('input[name="phoneNumber"]');
    if (!phoneField) phoneField = searchDoc.querySelector('input[type="tel"]');
    if (!phoneField) phoneField = searchDoc.querySelector('input[autocomplete="tel"]');

    debugLog('Email field found:', !!emailField);
    if (emailField) debugLog('Email field details:', { name: emailField.name, id: emailField.id, type: emailField.type });

    debugLog('Phone field found:', !!phoneField);
    if (phoneField) debugLog('Phone field details:', { name: phoneField.name, id: phoneField.id, type: phoneField.type });

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
            // Try to get first and last name if available (using same searchDoc as above)
            const firstNameField = searchDoc.querySelector('input[name="firstName"]') ||
                                searchDoc.querySelector('[data-testid="guest-form-first-name-input"]') ||
                                searchDoc.querySelector('input[autocomplete="given-name"]');

            const lastNameField = searchDoc.querySelector('input[name="lastName"]') ||
                               searchDoc.querySelector('[data-testid="guest-form-last-name-input"]') ||
                               searchDoc.querySelector('input[autocomplete="family-name"]');

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
