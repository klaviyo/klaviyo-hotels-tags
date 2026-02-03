import { debugLog, isValidEmail, KLAVIYO_EVENT_KEY_MAP, isOnGuestsPage, parseEventData } from './utils.js';

(function() {
    debugLog('Script initialized');

    // Handle dataLayer events for hotel bookings
    function handleDataLayerPush(event) {
        debugLog('Event received:', event);

        const klaviyo = window.klaviyo || [];
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
                        if (typeof attemptIdentify !== 'undefined') {
                            attemptIdentify('form_start event');
                        }
                    }, 500);

                    // Start monitoring if not already started
                    setTimeout(function() {
                        if (typeof startIdentifyMonitoring !== 'undefined') {
                            startIdentifyMonitoring();
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

            // Handle Booking Engine Load - property/listing view
            if (eventName == "cb_booking_engine_load" || eventName == "view_item") {
                debugLog('Processing Viewed Listing event');
                debugLog('Items available:', ecommerceItems);
                debugLog('Ecommerce data:', ecommerceData);
                if (ecommerceItems && ecommerceItems.length > 0) {
                    debugLog('Using items[0] for listing data');
                    trackViewedListing(ecommerceItems[0], ecommerceData);
                } else if (ecommerceData && Object.keys(ecommerceData).length > 1) { // More than just empty object
                    debugLog('Using ecommerceData directly for listing data');
                    trackViewedListing(ecommerceData, ecommerceData);
                } else {
                    debugLog('Skipping empty Viewed Listing event (no data)');
                }
            }
            // Handle Add to Cart - track as Viewed Listing since there's no real listing page
            else if (eventName == "add_to_cart") {
                debugLog('Processing add_to_cart as Viewed Listing (no listing page on Cloudbeds)');
                if (ecommerceItems && ecommerceItems.length > 0) {
                    trackViewedListing(ecommerceItems[0], ecommerceData);
                }
            }
            // Handle Started Checkout
            else if (eventName == "begin_checkout") {
                debugLog('Processing Started Checkout event');
                trackStartedCheckout(ecommerceItems, ecommerceData);

                // Immediately check for email/phone in case they're already filled
                setTimeout(function() {
                    if (typeof attemptIdentify !== 'undefined') {
                        attemptIdentify('begin_checkout event');
                    }
                }, 500);

                // Start monitoring for guest info after checkout begins
                setTimeout(function() {
                    if (typeof startIdentifyMonitoring !== 'undefined') {
                        startIdentifyMonitoring();
                    }
                }, 1000);
            }
        } else {
            debugLog('Event not recognized or not in map:', eventName);
        }
    }

    // Track Viewed Listing event
    function trackViewedListing(itemData, ecommerceData) {
        debugLog('trackViewedListing called with:', { itemData: itemData, ecommerceData: ecommerceData });

        const klaviyo = window.klaviyo || [];

        // Skip if no meaningful data
        if (!itemData || (!itemData.item_name && !itemData.name && !itemData.item_id && !itemData.id)) {
            debugLog('Skipping Viewed Listing - no item data');
            return;
        }

        const listingData = {
            "Title": itemData.item_name || itemData.name || "",
            "ID": itemData.item_id || itemData.id || "",
            "Price": itemData.price || 0,
            "URL": window.location.href,
            "$value": itemData.price || 0
        };

        // Add property name
        if (itemData.affiliation || itemData.item_brand) {
            listingData["Property Name"] = itemData.affiliation || itemData.item_brand;
        }

        // Add property type (accommodation category)
        if (itemData.item_category) {
            listingData["Property Type"] = itemData.item_category;
        }

        // Add location data if available
        if (ecommerceData.city) listingData["Listing City"] = ecommerceData.city;
        if (ecommerceData.country) listingData["Listing Country"] = ecommerceData.country;

        // Add image if available
        if (itemData.image_url || itemData.item_image) {
            listingData["ImageURL"] = itemData.image_url || itemData.item_image;
        }

        // Add extra details - technical/additional fields
        listingData["$extra"] = {};
        if (itemData.start_date || ecommerceData.start_date) {
            listingData["$extra"]["start_date"] = itemData.start_date || ecommerceData.start_date;
        }
        if (itemData.end_date || ecommerceData.end_date) {
            listingData["$extra"]["end_date"] = itemData.end_date || ecommerceData.end_date;
        }
        if (itemData.total_guests) listingData["$extra"]["total_guests"] = itemData.total_guests;
        if (itemData.adults) listingData["$extra"]["adults"] = itemData.adults;
        if (itemData.kids) listingData["$extra"]["kids"] = itemData.kids;
        if (itemData.nights || itemData.quantity) listingData["$extra"]["nights"] = itemData.nights || itemData.quantity;
        if (itemData.item_category2) listingData["$extra"]["room_type"] = itemData.item_category2;
        if (itemData.item_variant) listingData["$extra"]["rate_plan"] = itemData.item_variant;
        if (itemData.item_package_name || itemData.item_package_id) {
            listingData["$extra"]["package_name"] = itemData.item_package_name;
            listingData["$extra"]["package_id"] = itemData.item_package_id;
        }
        if (ecommerceData.property_id) listingData["$extra"]["property_id"] = ecommerceData.property_id;

        debugLog('Tracking Viewed Listing:', listingData);
        klaviyo.track("Viewed Listing", listingData);
    }

    // Track Started Checkout event
    function trackStartedCheckout(items, ecommerceData) {
        debugLog('trackStartedCheckout called with:', { items: items, ecommerceData: ecommerceData });

        const klaviyo = window.klaviyo || [];

        let checkoutValue = 0;
        const checkoutData = {};

        // Calculate total value and total guests from items
        let totalGuests = 0;
        if (items && items.length > 0) {
            for (let i = 0; i < items.length; i++) {
                const itemPrice = items[i].price || 0;
                const itemQuantity = items[i].quantity || 1;
                checkoutValue += itemPrice * itemQuantity;

                // Sum up guests from all rooms
                if (items[i].total_guests) {
                    totalGuests += items[i].total_guests;
                } else if (items[i].adults || items[i].kids) {
                    totalGuests += (items[i].adults || 0) + (items[i].kids || 0);
                }
            }
            checkoutData.Items = items;
        } else if (ecommerceData.value) {
            checkoutValue = ecommerceData.value;
        }

        checkoutData.$value = parseFloat(checkoutValue.toFixed(2));

        // Add currency if available
        if (ecommerceData.currency) {
            checkoutData["Currency"] = ecommerceData.currency;
        }

        // Add total guests if calculated from items
        if (totalGuests > 0) {
            checkoutData["Number of Guests"] = totalGuests;
        }

        // Add reservation details
        if (ecommerceData.start_date || ecommerceData.check_in || ecommerceData.checkin || ecommerceData.check_in_date) {
            checkoutData["CheckIn"] = ecommerceData.start_date || ecommerceData.check_in || ecommerceData.checkin || ecommerceData.check_in_date;
        }
        if (ecommerceData.end_date || ecommerceData.check_out || ecommerceData.checkout || ecommerceData.check_out_date) {
            checkoutData["CheckOut"] = ecommerceData.end_date || ecommerceData.check_out || ecommerceData.checkout || ecommerceData.check_out_date;
        }
        // Override with ecommerce-level guest count if available
        if (ecommerceData.total_guests || ecommerceData.guests || ecommerceData.guest_count) {
            checkoutData["Number of Guests"] = ecommerceData.total_guests || ecommerceData.guests || ecommerceData.guest_count;
        }
        // Calculate nights from Cloudbeds data
        if (items && items.length > 0 && items[0].nights) {
            checkoutData["Number of Nights"] = items[0].nights;
        }

        // Add guest breakdown details to $extra
        if (ecommerceData.adults) checkoutData["$extra"]["adults"] = ecommerceData.adults;
        if (ecommerceData.children || ecommerceData.kids) {
            checkoutData["$extra"]["children"] = ecommerceData.children || ecommerceData.kids;
        }
        if (ecommerceData.rooms || ecommerceData.room_count) {
            checkoutData["$extra"]["number_of_rooms"] = ecommerceData.rooms || ecommerceData.room_count;
        }

        // Calculate number of nights if check-in/out dates available
        if (checkoutData["CheckIn"] && checkoutData["CheckOut"]) {
            try {
                const checkIn = new Date(checkoutData["CheckIn"]);
                const checkOut = new Date(checkoutData["CheckOut"]);
                const nights = Math.round((checkOut - checkIn) / (1000 * 60 * 60 * 24));
                if (nights > 0) {
                    checkoutData["Number of Nights"] = nights;
                }
            } catch (err) {
                debugLog('Error calculating nights:', err);
            }
        }

        // Add property information from items or top-level data
        if (items && items.length > 0 && items[0].affiliation) {
            checkoutData["Property Name"] = items[0].affiliation;
        } else if (ecommerceData.property_name) {
            checkoutData["Property Name"] = ecommerceData.property_name;
        }

        // Add any additional data to $extra - technical/additional fields
        checkoutData["$extra"] = {};
        if (ecommerceData.property_id) checkoutData["$extra"]["property_id"] = ecommerceData.property_id;
        if (ecommerceData.coupon) checkoutData["$extra"]["coupon"] = ecommerceData.coupon;
        if (ecommerceData.tax) checkoutData["$extra"]["tax"] = ecommerceData.tax;
        if (ecommerceData.shipping) checkoutData["$extra"]["fees"] = ecommerceData.shipping;
        if (ecommerceData.be_source) checkoutData["$extra"]["booking_engine_source"] = ecommerceData.be_source;

        debugLog('Tracking Started Checkout:', checkoutData);
        klaviyo.track("Started Checkout", checkoutData);
    }

    const windowDataLayer = window.dataLayer;

    // Check if dataLayer exists
    if (!windowDataLayer) {
        debugLog('WARNING: dataLayer not found on window object');
        return;
    }

    debugLog('dataLayer found, setting up listener');

    const dlPush = windowDataLayer.push;

    // Override the push method of the dataLayer array to listen for push events
    windowDataLayer.push = function() {
        // Capture the arguments passed to the original push method
        const args = Array.prototype.slice.call(arguments);
        debugLog('dataLayer.push called with arguments:', args);

        // Call the original push method to ensure the dataLayer still functions as expected
        dlPush.apply(window.dataLayer, args);

        // Extract the event object from the arguments
        let event;
        for (let i = 0; i < args.length; i++) {
            if (typeof args[i] === 'object') {
                event = args[i];
                break;
            }
        }
        // Handle the dataLayer push event
        if (event) {
            handleDataLayerPush(event);
        }
    };

    // Process any existing events in the dataLayer
    debugLog('Processing existing dataLayer events. Count:', windowDataLayer.length);
    if (windowDataLayer.length > 0) {
        for (let i = 0; i < windowDataLayer.length; i++) {
            if (typeof windowDataLayer[i] === 'object') {
                debugLog('Processing existing event #' + i + ':', windowDataLayer[i]);
                handleDataLayerPush(windowDataLayer[i]);
            }
        }
    }

    debugLog('Setup complete');

    // Monitor for guest information (email/phone) and identify user
    let identifyAttempted = false;

    function attemptIdentify(source) {
        const klaviyo = window.klaviyo || [];

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

    function performIdentification(source) {
        const klaviyo = window.klaviyo || [];

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

    // Start monitoring when on guests page or after checkout starts
    function startIdentifyMonitoring() {
        if (identifyAttempted) return;

        debugLog('Starting guest information monitoring');

        // Check immediately
        attemptIdentify('monitoring start');

        // Find the guest form
        const guestForm = document.getElementById('guest-form') ||
                       document.querySelector('form[data-testid="guest-form"]');

        if (!guestForm) {
            debugLog('WARNING: Guest form not found, cannot attach listeners');
            return;
        }

        // Add blur listeners to ALL input fields in the form
        const allInputs = guestForm.querySelectorAll('input, textarea, select');
        debugLog('Found ' + allInputs.length + ' form fields to monitor');

        for (let i = 0; i < allInputs.length; i++) {
            (function(input) {
                input.addEventListener('blur', function() {
                    debugLog('Form field blur:', input.name || input.type);
                    // Check for email/phone whenever any field loses focus
                    setTimeout(function() { attemptIdentify('field blur: ' + (input.name || input.type)); }, 500);
                });
            })(allInputs[i]);
        }

        debugLog('Blur listeners attached to all form fields');

        // Also check on form submission as final catch
        guestForm.addEventListener('submit', function(e) {
            debugLog('Form submit detected - final identify attempt');
            attemptIdentify('form submit');
        });
        debugLog('Form submit listener attached');
    }

    // Start monitoring if already on guests page
    if (isOnGuestsPage()) {
        debugLog('Detected guests page, starting monitoring');
        // Wait a bit for form to fully load
        setTimeout(startIdentifyMonitoring, 1000);
    }

    // Also monitor for URL changes (SPA navigation)
    const originalPush = windowDataLayer.push;
    const checkForGuestsPage = function() {
        if (isOnGuestsPage() && !identifyAttempted) {
            setTimeout(startIdentifyMonitoring, 1000);
        }
    };

    // Listen for history changes
    window.addEventListener('popstate', checkForGuestsPage);

    debugLog('Guest identification monitoring initialized');

})();
