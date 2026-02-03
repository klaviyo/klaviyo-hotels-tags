(() => {
  // src/utils.js
  var DEBUG = true;
  function debugLog(message, data) {
    if (DEBUG) {
      console.log("[Klaviyo Hotel Tracking] " + message, data || "");
    }
  }
  function isValidEmail(email) {
    if (!email || email.length < 5)
      return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
  var KLAVIYO_EVENT_KEY_MAP = {
    "cb_booking_engine_load": "Viewed Booking Engine",
    "view_item": "Viewed Listing",
    "add_to_cart": "Viewed Listing",
    // Track as Viewed Listing since no listing page exists
    "begin_checkout": "Started Checkout"
  };
  function isOnGuestsPage() {
    return window.location.href.indexOf("/guests") > -1 || document.getElementById("guest-form");
  }
  function parseEventData(event) {
    let eventName, ecommerceData, ecommerceItems, isGA4Event = false, isGtagEvent = false;
    if (event.length && event[0] === "event" && typeof event[1] === "string") {
      try {
        eventName = event[1];
        ecommerceData = event[2] || {};
        ecommerceItems = ecommerceData.items;
        isGtagEvent = true;
        debugLog("Parsed as gtag event:", { eventName, hasItems: !!ecommerceItems, data: ecommerceData });
      } catch (err) {
        debugLog("Error parsing gtag event:", err);
      }
    }
    if (!isGtagEvent) {
      try {
        eventName = event.event;
        ecommerceData = event.ecommerce || {};
        ecommerceItems = ecommerceData.items;
        isGA4Event = true;
        debugLog("Parsed as GA4 event:", { eventName, hasItems: !!ecommerceItems });
      } catch (err) {
        debugLog("Error parsing event:", err);
      }
    }
    return { eventName, ecommerceData, ecommerceItems, isGA4Event, isGtagEvent };
  }

  // src/klaviyo_hotel_tracking_debug.js
  (function() {
    debugLog("Script initialized");
    function handleDataLayerPush(event) {
      debugLog("Event received:", event);
      const klaviyo = window.klaviyo || [];
      const { eventName, ecommerceData, ecommerceItems } = parseEventData(event);
      if (eventName === "form_start") {
        debugLog("form_start event detected");
        const eventModel = event.eventModel || ecommerceData.eventModel;
        if (eventModel) {
          debugLog("form_start eventModel:", eventModel);
          if (eventModel.form_id === "guest-form" || eventModel.first_field_name === "email" || eventModel.first_field_type === "email") {
            debugLog("Guest form detected via form_start - checking for email/phone");
            setTimeout(function() {
              if (typeof attemptIdentify !== "undefined") {
                attemptIdentify("form_start event");
              }
            }, 500);
            setTimeout(function() {
              if (typeof startIdentifyMonitoring !== "undefined") {
                startIdentifyMonitoring();
              }
            }, 1e3);
          }
        }
      }
      if (eventName === "form_interaction" || eventName === "gtm.formInteract") {
        const formElement = event["gtm.element"];
        if (formElement && (formElement.name === "email" || formElement.name === "phoneNumber")) {
          debugLog("User interacted with email/phone field - will check after blur");
        }
      }
      if (eventName && KLAVIYO_EVENT_KEY_MAP[eventName]) {
        debugLog("Matched event type:", KLAVIYO_EVENT_KEY_MAP[eventName]);
        if (eventName == "cb_booking_engine_load" || eventName == "view_item") {
          debugLog("Processing Viewed Listing event");
          debugLog("Items available:", ecommerceItems);
          debugLog("Ecommerce data:", ecommerceData);
          if (ecommerceItems && ecommerceItems.length > 0) {
            debugLog("Using items[0] for listing data");
            trackViewedListing(ecommerceItems[0], ecommerceData);
          } else if (ecommerceData && Object.keys(ecommerceData).length > 1) {
            debugLog("Using ecommerceData directly for listing data");
            trackViewedListing(ecommerceData, ecommerceData);
          } else {
            debugLog("Skipping empty Viewed Listing event (no data)");
          }
        } else if (eventName == "add_to_cart") {
          debugLog("Processing add_to_cart as Viewed Listing (no listing page on Cloudbeds)");
          if (ecommerceItems && ecommerceItems.length > 0) {
            trackViewedListing(ecommerceItems[0], ecommerceData);
          }
        } else if (eventName == "begin_checkout") {
          debugLog("Processing Started Checkout event");
          trackStartedCheckout(ecommerceItems, ecommerceData);
          setTimeout(function() {
            if (typeof attemptIdentify !== "undefined") {
              attemptIdentify("begin_checkout event");
            }
          }, 500);
          setTimeout(function() {
            if (typeof startIdentifyMonitoring !== "undefined") {
              startIdentifyMonitoring();
            }
          }, 1e3);
        }
      } else {
        debugLog("Event not recognized or not in map:", eventName);
      }
    }
    function trackViewedListing(itemData, ecommerceData) {
      debugLog("trackViewedListing called with:", { itemData, ecommerceData });
      const klaviyo = window.klaviyo || [];
      if (!itemData || !itemData.item_name && !itemData.name && !itemData.item_id && !itemData.id) {
        debugLog("Skipping Viewed Listing - no item data");
        return;
      }
      const listingData = {
        "Title": itemData.item_name || itemData.name || "",
        "ID": itemData.item_id || itemData.id || "",
        "Price": itemData.price || 0,
        "URL": window.location.href,
        "$value": itemData.price || 0
      };
      if (itemData.affiliation || itemData.item_brand) {
        listingData["Property Name"] = itemData.affiliation || itemData.item_brand;
      }
      if (itemData.item_category) {
        listingData["Property Type"] = itemData.item_category;
      }
      if (ecommerceData.city)
        listingData["Listing City"] = ecommerceData.city;
      if (ecommerceData.country)
        listingData["Listing Country"] = ecommerceData.country;
      if (itemData.image_url || itemData.item_image) {
        listingData["ImageURL"] = itemData.image_url || itemData.item_image;
      }
      listingData["$extra"] = {};
      if (itemData.start_date || ecommerceData.start_date) {
        listingData["$extra"]["start_date"] = itemData.start_date || ecommerceData.start_date;
      }
      if (itemData.end_date || ecommerceData.end_date) {
        listingData["$extra"]["end_date"] = itemData.end_date || ecommerceData.end_date;
      }
      if (itemData.total_guests)
        listingData["$extra"]["total_guests"] = itemData.total_guests;
      if (itemData.adults)
        listingData["$extra"]["adults"] = itemData.adults;
      if (itemData.kids)
        listingData["$extra"]["kids"] = itemData.kids;
      if (itemData.nights || itemData.quantity)
        listingData["$extra"]["nights"] = itemData.nights || itemData.quantity;
      if (itemData.item_category2)
        listingData["$extra"]["room_type"] = itemData.item_category2;
      if (itemData.item_variant)
        listingData["$extra"]["rate_plan"] = itemData.item_variant;
      if (itemData.item_package_name || itemData.item_package_id) {
        listingData["$extra"]["package_name"] = itemData.item_package_name;
        listingData["$extra"]["package_id"] = itemData.item_package_id;
      }
      if (ecommerceData.property_id)
        listingData["$extra"]["property_id"] = ecommerceData.property_id;
      debugLog("Tracking Viewed Listing:", listingData);
      klaviyo.track("Viewed Listing", listingData);
    }
    function trackStartedCheckout(items, ecommerceData) {
      debugLog("trackStartedCheckout called with:", { items, ecommerceData });
      const klaviyo = window.klaviyo || [];
      let checkoutValue = 0;
      const checkoutData = {};
      let totalGuests = 0;
      if (items && items.length > 0) {
        for (let i = 0; i < items.length; i++) {
          const itemPrice = items[i].price || 0;
          const itemQuantity = items[i].quantity || 1;
          checkoutValue += itemPrice * itemQuantity;
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
      if (ecommerceData.currency) {
        checkoutData["Currency"] = ecommerceData.currency;
      }
      if (totalGuests > 0) {
        checkoutData["Number of Guests"] = totalGuests;
      }
      if (ecommerceData.start_date || ecommerceData.check_in || ecommerceData.checkin || ecommerceData.check_in_date) {
        checkoutData["CheckIn"] = ecommerceData.start_date || ecommerceData.check_in || ecommerceData.checkin || ecommerceData.check_in_date;
      }
      if (ecommerceData.end_date || ecommerceData.check_out || ecommerceData.checkout || ecommerceData.check_out_date) {
        checkoutData["CheckOut"] = ecommerceData.end_date || ecommerceData.check_out || ecommerceData.checkout || ecommerceData.check_out_date;
      }
      if (ecommerceData.total_guests || ecommerceData.guests || ecommerceData.guest_count) {
        checkoutData["Number of Guests"] = ecommerceData.total_guests || ecommerceData.guests || ecommerceData.guest_count;
      }
      if (items && items.length > 0 && items[0].nights) {
        checkoutData["Number of Nights"] = items[0].nights;
      }
      if (ecommerceData.adults)
        checkoutData["$extra"]["adults"] = ecommerceData.adults;
      if (ecommerceData.children || ecommerceData.kids) {
        checkoutData["$extra"]["children"] = ecommerceData.children || ecommerceData.kids;
      }
      if (ecommerceData.rooms || ecommerceData.room_count) {
        checkoutData["$extra"]["number_of_rooms"] = ecommerceData.rooms || ecommerceData.room_count;
      }
      if (checkoutData["CheckIn"] && checkoutData["CheckOut"]) {
        try {
          const checkIn = new Date(checkoutData["CheckIn"]);
          const checkOut = new Date(checkoutData["CheckOut"]);
          const nights = Math.round((checkOut - checkIn) / (1e3 * 60 * 60 * 24));
          if (nights > 0) {
            checkoutData["Number of Nights"] = nights;
          }
        } catch (err) {
          debugLog("Error calculating nights:", err);
        }
      }
      if (items && items.length > 0 && items[0].affiliation) {
        checkoutData["Property Name"] = items[0].affiliation;
      } else if (ecommerceData.property_name) {
        checkoutData["Property Name"] = ecommerceData.property_name;
      }
      checkoutData["$extra"] = {};
      if (ecommerceData.property_id)
        checkoutData["$extra"]["property_id"] = ecommerceData.property_id;
      if (ecommerceData.coupon)
        checkoutData["$extra"]["coupon"] = ecommerceData.coupon;
      if (ecommerceData.tax)
        checkoutData["$extra"]["tax"] = ecommerceData.tax;
      if (ecommerceData.shipping)
        checkoutData["$extra"]["fees"] = ecommerceData.shipping;
      if (ecommerceData.be_source)
        checkoutData["$extra"]["booking_engine_source"] = ecommerceData.be_source;
      debugLog("Tracking Started Checkout:", checkoutData);
      klaviyo.track("Started Checkout", checkoutData);
    }
    const windowDataLayer = window.dataLayer;
    if (!windowDataLayer) {
      debugLog("WARNING: dataLayer not found on window object");
      return;
    }
    debugLog("dataLayer found, setting up listener");
    const dlPush = windowDataLayer.push;
    windowDataLayer.push = function() {
      const args = Array.prototype.slice.call(arguments);
      debugLog("dataLayer.push called with arguments:", args);
      dlPush.apply(window.dataLayer, args);
      let event;
      for (let i = 0; i < args.length; i++) {
        if (typeof args[i] === "object") {
          event = args[i];
          break;
        }
      }
      if (event) {
        handleDataLayerPush(event);
      }
    };
    debugLog("Processing existing dataLayer events. Count:", windowDataLayer.length);
    if (windowDataLayer.length > 0) {
      for (let i = 0; i < windowDataLayer.length; i++) {
        if (typeof windowDataLayer[i] === "object") {
          debugLog("Processing existing event #" + i + ":", windowDataLayer[i]);
          handleDataLayerPush(windowDataLayer[i]);
        }
      }
    }
    debugLog("Setup complete");
    let identifyAttempted = false;
    function attemptIdentify(source) {
      const klaviyo = window.klaviyo || [];
      if (source) {
        debugLog("attemptIdentify called from:", source);
      }
      if (klaviyo.isIdentified && typeof klaviyo.isIdentified === "function") {
        klaviyo.isIdentified().then(function(isIdentified) {
          debugLog("klaviyo.isIdentified():", isIdentified);
          if (isIdentified) {
            debugLog("User already identified, skipping identification");
            identifyAttempted = true;
            return;
          }
          debugLog("User not identified, proceeding with identification");
          performIdentification(source);
        }).catch(function(err) {
          debugLog("Error checking isIdentified, proceeding anyway:", err);
          performIdentification(source);
        });
      } else {
        debugLog("klaviyo.isIdentified not available, proceeding with identification");
        performIdentification(source);
      }
    }
    function performIdentification(source) {
      const klaviyo = window.klaviyo || [];
      const emailField = document.querySelector('input[name="email"]') || document.querySelector('[data-testid="guest-form-email-input"]') || document.querySelector('input[type="email"]');
      const phoneField = document.querySelector('input[name="phoneNumber"]') || document.querySelector('[data-testid="guest-form-phone-input"]') || document.querySelector('input[type="tel"][name="phoneNumber"]');
      debugLog("Email field found:", !!emailField);
      debugLog("Phone field found:", !!phoneField);
      const email = emailField ? emailField.value.trim() : "";
      const phone = phoneField ? phoneField.value.trim() : "";
      debugLog("Email value:", email);
      debugLog("Phone value:", phone);
      const hasValidEmail = email && isValidEmail(email);
      const hasPhone = phone && phone.length > 0;
      if (!hasValidEmail && email) {
        debugLog("Email invalid or incomplete:", email);
      }
      if ((hasValidEmail || hasPhone) && !identifyAttempted) {
        const identifyData = {};
        if (hasValidEmail) {
          identifyData["email"] = email;
        }
        if (hasPhone) {
          identifyData["phone_number"] = phone;
        }
        if (identifyData.email || identifyData.phone_number) {
          const firstNameField = document.querySelector('input[name="firstName"]') || document.querySelector('[data-testid="guest-form-first-name-input"]') || document.querySelector('input[autocomplete="given-name"]');
          const lastNameField = document.querySelector('input[name="lastName"]') || document.querySelector('[data-testid="guest-form-last-name-input"]') || document.querySelector('input[autocomplete="family-name"]');
          if (firstNameField && firstNameField.value.trim()) {
            identifyData["first_name"] = firstNameField.value.trim();
          }
          if (lastNameField && lastNameField.value.trim()) {
            identifyData["last_name"] = lastNameField.value.trim();
          }
          debugLog("Identifying user with:", identifyData);
          klaviyo.identify(identifyData);
          identifyAttempted = true;
          debugLog("Identification complete - no further attempts will be made");
        }
      } else if (identifyAttempted) {
        debugLog("User already identified in this session, skipping");
      } else {
        debugLog("No valid email or phone found yet, will retry");
      }
    }
    function startIdentifyMonitoring() {
      if (identifyAttempted)
        return;
      debugLog("Starting guest information monitoring");
      attemptIdentify("monitoring start");
      const guestForm = document.getElementById("guest-form") || document.querySelector('form[data-testid="guest-form"]');
      if (!guestForm) {
        debugLog("WARNING: Guest form not found, cannot attach listeners");
        return;
      }
      const allInputs = guestForm.querySelectorAll("input, textarea, select");
      debugLog("Found " + allInputs.length + " form fields to monitor");
      for (let i = 0; i < allInputs.length; i++) {
        (function(input) {
          input.addEventListener("blur", function() {
            debugLog("Form field blur:", input.name || input.type);
            setTimeout(function() {
              attemptIdentify("field blur: " + (input.name || input.type));
            }, 500);
          });
        })(allInputs[i]);
      }
      debugLog("Blur listeners attached to all form fields");
      guestForm.addEventListener("submit", function(e) {
        debugLog("Form submit detected - final identify attempt");
        attemptIdentify("form submit");
      });
      debugLog("Form submit listener attached");
    }
    if (isOnGuestsPage()) {
      debugLog("Detected guests page, starting monitoring");
      setTimeout(startIdentifyMonitoring, 1e3);
    }
    const originalPush = windowDataLayer.push;
    const checkForGuestsPage = function() {
      if (isOnGuestsPage() && !identifyAttempted) {
        setTimeout(startIdentifyMonitoring, 1e3);
      }
    };
    window.addEventListener("popstate", checkForGuestsPage);
    debugLog("Guest identification monitoring initialized");
  })();
})();
