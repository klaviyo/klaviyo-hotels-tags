(() => {
  // src/cloudbeds/constants.js
  var DEBUG = true;
  var KLAVIYO_EVENT_KEY_MAP = {
    "view_item": "Viewed Listing",
    "add_to_cart": "Viewed Listing",
    // Track as Viewed Listing since no listing page exists
    "begin_checkout": "Started Checkout"
  };

  // src/cloudbeds/klaviyoUtils.js
  var identifyAttempted = false;
  var klaviyo = window.klaviyo || [];
  function buildViewedListingPayload(itemData, ecommerceData) {
    debugLog("Building Viewed Listing payload");
    const pricePerNight = itemData.price || 0;
    const nights = itemData.nights || itemData.quantity || ecommerceData.nights || ecommerceData.quantity || 1;
    const totalPrice = pricePerNight * nights;
    const payload = {
      "Title": itemData.item_name || itemData.name || "",
      "ID": itemData.item_id || itemData.id || "",
      "Price per Night": pricePerNight,
      "Total Price": totalPrice,
      "URL": window.location.href,
      "Property Name": itemData.affiliation || itemData.item_brand || "",
      "Property Type": itemData.item_category || "",
      "$value": totalPrice,
      "$extra": {
        "Start Date": itemData.start_date || ecommerceData.start_date || "",
        "End Date": itemData.end_date || ecommerceData.end_date || "",
        "Total Guests": itemData.total_guests || ecommerceData.total_guests || "",
        "Number of Adults": itemData.adults || ecommerceData.adults || "",
        "Number of Kids": itemData.kids || ecommerceData.kids || "",
        "Number of Nights": nights,
        "Package Name": itemData.item_package_name || ecommerceData.item_package_name || "",
        "Package ID": itemData.item_package_id || ecommerceData.item_package_id || "",
        "Property ID": ecommerceData.property_id || ""
      }
    };
    debugLog("Viewed Listing payload:", payload);
    return payload;
  }
  function buildStartedCheckoutPayload(items, ecommerceData) {
    debugLog("Building Started Checkout payload");
    const { checkoutValue, totalGuests } = getCheckoutValueAndTotalGuests(items, ecommerceData);
    const checkoutPayload = {
      "$value": checkoutValue,
      "Currency": ecommerceData.currency || "",
      "Number of Guests": totalGuests,
      "CheckIn": ecommerceData.start_date || ecommerceData.check_in || ecommerceData.checkin || ecommerceData.check_in_date || "",
      "CheckOut": ecommerceData.end_date || ecommerceData.check_out || ecommerceData.checkout || ecommerceData.check_out_date || "",
      "Property Name": ecommerceData.property_name || items && items.length > 0 && items[0].affiliation || "",
      "$extra": {
        "Number of Adults": ecommerceData.adults || 1,
        "Number of Kids": ecommerceData.children || ecommerceData.kids || 0,
        "Number of Rooms": ecommerceData.rooms || ecommerceData.room_count || 1,
        "Booking Engine Source": ecommerceData.be_source || "",
        "Coupon": ecommerceData.coupon || "",
        "Tax": ecommerceData.tax || 0,
        "Property ID": ecommerceData.property_id || ""
      }
    };
    if (items && items.length > 0) {
      checkoutPayload.Items = items;
      if (items[0].nights) {
        checkoutPayload["Number of Nights"] = items[0].nights;
      }
    }
    if (!checkoutPayload["Number of Nights"] && checkoutPayload["CheckIn"] && checkoutPayload["CheckOut"]) {
      try {
        const checkIn = new Date(checkoutPayload["CheckIn"]);
        const checkOut = new Date(checkoutPayload["CheckOut"]);
        const nights = Math.round((checkOut - checkIn) / (1e3 * 60 * 60 * 24));
        if (nights > 0) {
          checkoutPayload["Number of Nights"] = nights;
        }
      } catch (err) {
        debugLog("Error calculating nights:", err);
      }
    }
    debugLog("Started Checkout payload:", checkoutPayload);
    return checkoutPayload;
  }
  function getCheckoutValueAndTotalGuests(items, ecommerceData) {
    let checkoutValue = 0;
    let totalGuests = 0;
    if (ecommerceData.value) {
      checkoutValue = ecommerceData.value;
    } else if (items && items.length > 0) {
      for (let i = 0; i < items.length; i++) {
        const itemPrice = items[i].price || 0;
        const itemQuantity = items[i].quantity || 1;
        checkoutValue += itemPrice * itemQuantity;
      }
    }
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
  function trackViewedListing(itemData, ecommerceData) {
    debugLog("trackViewedListing called with:", { itemData, ecommerceData });
    if (!itemData || !itemData.item_name && !itemData.name && !itemData.item_id && !itemData.id) {
      debugLog("Skipping Viewed Listing - no item data");
      return;
    }
    const listingData = buildViewedListingPayload(itemData, ecommerceData);
    klaviyo.track("Viewed Listing", listingData).then(() => {
      debugLog("Viewed Listing tracked");
    }).catch((err) => {
      debugLog("Error tracking Viewed Listing:", err);
    });
  }
  function trackStartedCheckout(items, ecommerceData) {
    debugLog("trackStartedCheckout called with:", { items, ecommerceData });
    const checkoutData = buildStartedCheckoutPayload(items, ecommerceData);
    klaviyo.track("Started Checkout", checkoutData).then(() => {
      debugLog("Started Checkout tracked");
    }).catch((err) => {
      debugLog("Error tracking Started Checkout:", err);
    });
  }
  function attemptIdentify(source) {
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

  // src/cloudbeds/generalUtils.js
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
  function isOnGuestsPage() {
    return window.location.href.indexOf("/guests") > -1 || document.getElementById("guest-form");
  }
  function startIdentifyMonitoring() {
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

  // src/cloudbeds/gtmUtils.js
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
  function handleDataLayerPush(event, handlers) {
    debugLog("Event received:", event);
    const { eventName, ecommerceData, ecommerceItems } = parseEventData(event);
    if (eventName === "form_start") {
      debugLog("form_start event detected");
      const eventModel = event.eventModel || ecommerceData.eventModel;
      if (eventModel) {
        debugLog("form_start eventModel:", eventModel);
        if (eventModel.form_id === "guest-form" || eventModel.first_field_name === "email" || eventModel.first_field_type === "email") {
          debugLog("Guest form detected via form_start - checking for email/phone");
          setTimeout(function() {
            if (handlers.attemptIdentify) {
              handlers.attemptIdentify("form_start event");
            }
          }, 500);
          setTimeout(function() {
            if (handlers.startIdentifyMonitoring) {
              handlers.startIdentifyMonitoring();
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
      if (eventName == "view_item") {
        debugLog("Processing Viewed Listing event");
        debugLog("Items available:", ecommerceItems);
        debugLog("Ecommerce data:", ecommerceData);
        if (ecommerceItems && ecommerceItems.length > 0) {
          debugLog("Using items[0] for listing data");
          handlers.trackViewedListing(ecommerceItems[0], ecommerceData);
        } else if (ecommerceData && Object.keys(ecommerceData).length > 1) {
          debugLog("Using ecommerceData directly for listing data");
          handlers.trackViewedListing(ecommerceData, ecommerceData);
        } else {
          debugLog("Skipping empty Viewed Listing event (no data)");
        }
      } else if (eventName == "add_to_cart") {
        debugLog("Processing add_to_cart as Viewed Listing (no listing page on Cloudbeds)");
        if (ecommerceItems && ecommerceItems.length > 0) {
          handlers.trackViewedListing(ecommerceItems[0], ecommerceData);
        }
      } else if (eventName == "begin_checkout") {
        debugLog("Processing Started Checkout event");
        handlers.trackStartedCheckout(ecommerceItems, ecommerceData);
        setTimeout(function() {
          if (handlers.attemptIdentify) {
            handlers.attemptIdentify("begin_checkout event");
          }
        }, 500);
        setTimeout(function() {
          if (handlers.startIdentifyMonitoring) {
            handlers.startIdentifyMonitoring();
          }
        }, 1e3);
      }
    } else {
      debugLog("Event not recognized or not in map:", eventName);
    }
  }

  // src/cloudbeds/klaviyo_hotel_tracking.js
  (function() {
    debugLog("Script initialized");
    const windowDataLayer = window.dataLayer;
    if (!windowDataLayer) {
      debugLog("WARNING: dataLayer not found on window object");
      return;
    }
    debugLog("dataLayer found, setting up listener");
    const handlers = {
      trackViewedListing,
      trackStartedCheckout,
      attemptIdentify,
      startIdentifyMonitoring
    };
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
        handleDataLayerPush(event, handlers);
      }
    };
    debugLog("Processing existing dataLayer events. Count:", windowDataLayer.length);
    if (windowDataLayer.length > 0) {
      for (let i = 0; i < windowDataLayer.length; i++) {
        if (typeof windowDataLayer[i] === "object") {
          debugLog("Processing existing event #" + i + ":", windowDataLayer[i]);
          handleDataLayerPush(windowDataLayer[i], handlers);
        }
      }
    }
    debugLog("Setup complete");
    if (isOnGuestsPage()) {
      debugLog("Detected guests page, starting monitoring");
      setTimeout(startIdentifyMonitoring, 1e3);
    }
    const checkForGuestsPage = function() {
      if (isOnGuestsPage()) {
        setTimeout(startIdentifyMonitoring, 1e3);
      }
    };
    window.addEventListener("popstate", checkForGuestsPage);
    debugLog("Guest identification monitoring initialized");
  })();
})();
