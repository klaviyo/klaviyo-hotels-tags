(() => {
  // <define:process.env.DEBUG_ACCOUNT_IDS>
  var define_process_env_DEBUG_ACCOUNT_IDS_default = [];

  // src/mews/constants.js
  var DEBUG = true;
  var KLAVIYO_EVENT_KEY_MAP = {
    "distributorRoomAdded": "Viewed Listing",
    // Has all data including dates
    "begin_checkout": "Started Checkout"
  };

  // src/shared/klaviyoInstance.js
  var klaviyo = window.klaviyo || [];

  // src/mews/klaviyoUtils.js
  var identifyAttempted = false;
  var reservationData = null;
  var viewItemData = null;
  function setReservationData(data) {
    reservationData = data;
    debugLog("Stored reservation data:", data);
  }
  function setViewItemData(itemData, ecommerceData) {
    viewItemData = { itemData, ecommerceData };
    debugLog("Stored view_item data:", viewItemData);
  }
  function calculateNights(startDate, endDate) {
    if (!startDate || !endDate) return null;
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const nights = Math.round((end - start) / (1e3 * 60 * 60 * 24));
      return nights > 0 ? nights : null;
    } catch (err) {
      debugLog("Error calculating nights:", err);
      return null;
    }
  }
  function getGuestCount(itemData) {
    const occupancy = itemData.occupancyData && itemData.occupancyData.length > 0 ? itemData.occupancyData[0] : null;
    return occupancy ? occupancy.personCount : reservationData ? reservationData.guests : "";
  }
  function buildViewedListingFromViewItem(itemData, ecommerceData) {
    debugLog("Building Viewed Listing from view_item event");
    const pricePerNight = itemData.price || 0;
    const startDate = itemData.start_date || ecommerceData.start_date || "";
    const endDate = itemData.end_date || ecommerceData.end_date || "";
    const nights = itemData.nights || itemData.quantity || ecommerceData.nights || ecommerceData.quantity || calculateNights(startDate, endDate) || 1;
    const totalPrice = pricePerNight * nights;
    const guests = getGuestCount(itemData);
    return {
      "Title": itemData.item_name || itemData.name || "",
      "ID": itemData.item_id || itemData.id || "",
      "Price per Night": pricePerNight,
      "Total Price": totalPrice,
      "URL": window.location.href,
      "Property Name": itemData.item_category2 || itemData.affiliation || ecommerceData.hotelName || "",
      "Location": itemData.item_category3 || "",
      "$value": totalPrice,
      "$extra": {
        "Start Date": startDate,
        "End Date": endDate,
        "Total Guests": guests,
        "Number of Adults": guests,
        "Number of Kids": 0,
        "Number of Nights": nights,
        "Brand": itemData.item_brand || ""
      }
    };
  }
  function buildViewedListingFromDistributorRoomAdded(reservationItem, ecommerceData) {
    debugLog("Building Viewed Listing from distributorRoomAdded event");
    if (!viewItemData) {
      debugLog("Warning: No view_item data stored for distributorRoomAdded event");
      return null;
    }
    const roomData = viewItemData.itemData;
    const viewEventData = viewItemData.ecommerceData;
    const pricePerNight = roomData.price || 0;
    const startDate = reservationItem.startDate || "";
    const endDate = reservationItem.endDate || "";
    const nights = calculateNights(startDate, endDate) || 1;
    const totalPrice = pricePerNight * nights;
    const guests = getGuestCount(reservationItem);
    return {
      "Title": roomData.item_name || roomData.name || "",
      "ID": roomData.item_id || roomData.id || reservationItem.roomId || "",
      "Price per Night": pricePerNight,
      "Total Price": totalPrice,
      "URL": window.location.href,
      "Property Name": roomData.item_category2 || roomData.affiliation || ecommerceData.hotelName || viewEventData.hotelName || "",
      "Location": roomData.item_category3 || "",
      "$value": totalPrice,
      "$extra": {
        "Start Date": startDate,
        "End Date": endDate,
        "Total Guests": guests,
        "Number of Adults": guests,
        "Number of Kids": 0,
        "Number of Nights": nights,
        "Brand": roomData.item_brand || ""
      }
    };
  }
  function buildViewedListingPayload(itemData, ecommerceData) {
    debugLog("Building Viewed Listing payload");
    let payload;
    if (itemData.startDate) {
      payload = buildViewedListingFromDistributorRoomAdded(itemData, ecommerceData);
    } else {
      payload = buildViewedListingFromViewItem(itemData, ecommerceData);
    }
    debugLog("Viewed Listing payload:", payload);
    return payload;
  }
  function buildStartedCheckoutPayload(items, ecommerceData) {
    debugLog("Building Started Checkout payload");
    const { checkoutValue, totalGuests } = getCheckoutValueAndTotalGuests(items, ecommerceData);
    const checkIn = ecommerceData.start_date || ecommerceData.check_in || ecommerceData.checkin || ecommerceData.check_in_date || (reservationData ? reservationData.startDate : "");
    const checkOut = ecommerceData.end_date || ecommerceData.check_out || ecommerceData.checkout || ecommerceData.check_out_date || (reservationData ? reservationData.endDate : "");
    const checkoutPayload = {
      "$value": checkoutValue,
      "Currency": ecommerceData.currency || "",
      "Number of Guests": totalGuests || (reservationData ? reservationData.guests : ""),
      "CheckIn": checkIn,
      "CheckOut": checkOut,
      "Property Name": ecommerceData.property_name || items && items.length > 0 && (items[0].item_category2 || items[0].affiliation) || "",
      "Location": items && items.length > 0 && items[0].item_category3 ? items[0].item_category3 : "",
      "$extra": {
        "Number of Adults": ecommerceData.adults || (reservationData ? reservationData.adults : 1),
        "Number of Kids": ecommerceData.children || ecommerceData.kids || (reservationData ? reservationData.children : 0),
        "Number of Rooms": ecommerceData.rooms || ecommerceData.room_count || 1,
        "Booking Engine Source": ecommerceData.be_source || "Mews Booking Engine",
        "Rate Name": items && items.length > 0 && items[0].item_variant ? items[0].item_variant : "",
        "Coupon": ecommerceData.coupon || "",
        "Tax": ecommerceData.tax || 0,
        "Property ID": items && items.length > 0 && items[0].enterpriseId || ecommerceData.property_id || "",
        "Brand": items && items.length > 0 && items[0].item_brand ? items[0].item_brand : ""
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
        const checkIn2 = new Date(checkoutPayload["CheckIn"]);
        const checkOut2 = new Date(checkoutPayload["CheckOut"]);
        const nights = Math.round((checkOut2 - checkIn2) / (1e3 * 60 * 60 * 24));
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
    const hasItemData = itemData && (itemData.item_name || itemData.name || itemData.item_id || itemData.id);
    const hasReservationData = itemData && (itemData.roomId || itemData.startDate);
    if (!hasItemData && !hasReservationData) {
      debugLog("Skipping Viewed Listing - no item or reservation data");
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
    const iframe = document.querySelector("iframe.mews-distributor") || document.querySelector('iframe[name*="mews-distributor"]');
    let searchDoc = document;
    if (iframe) {
      try {
        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
        if (iframeDoc) {
          searchDoc = iframeDoc;
          debugLog("Searching inside Mews iframe");
        }
      } catch (e) {
        debugLog("Cannot access iframe, searching main document");
      }
    }
    debugLog("Searching for email field...");
    let emailField = searchDoc.querySelector('input[name="email"]');
    if (!emailField) emailField = searchDoc.querySelector('input[id="email"]');
    if (!emailField) emailField = searchDoc.querySelector('[data-test-id="checkout-field-email"]');
    if (!emailField) emailField = searchDoc.querySelector('input[type="email"]');
    if (!emailField) emailField = searchDoc.querySelector('input[autocomplete="email"]');
    debugLog("Searching for phone field...");
    let phoneField = searchDoc.querySelector('input[name="phone"]');
    if (!phoneField) phoneField = searchDoc.querySelector('input[id="phone"]');
    if (!phoneField) phoneField = searchDoc.querySelector('[data-test-id="checkout-field-phone"]');
    if (!phoneField) phoneField = searchDoc.querySelector('input[name="phoneNumber"]');
    if (!phoneField) phoneField = searchDoc.querySelector('input[type="tel"]');
    if (!phoneField) phoneField = searchDoc.querySelector('input[autocomplete="tel"]');
    debugLog("Email field found:", !!emailField);
    if (emailField) debugLog("Email field details:", { name: emailField.name, id: emailField.id, type: emailField.type });
    debugLog("Phone field found:", !!phoneField);
    if (phoneField) debugLog("Phone field details:", { name: phoneField.name, id: phoneField.id, type: phoneField.type });
    const email = emailField ? emailField.value.trim() : "";
    const phone = phoneField ? phoneField.value.trim() : "";
    debugLog("Email value:", email);
    debugLog("Phone value:", phone);
    const hasValidEmail = email && isValidEmail(email);
    const hasValidPhone = phone && isValidPhone(phone);
    if (!hasValidEmail && email) {
      debugLog("Email invalid or incomplete:", email);
    }
    if (!hasValidPhone && phone) {
      debugLog("Phone invalid or incomplete:", phone);
    }
    if ((hasValidEmail || hasValidPhone) && !identifyAttempted) {
      const identifyData = {};
      if (hasValidEmail) {
        identifyData["email"] = email;
      }
      if (hasValidPhone) {
        identifyData["phone_number"] = phone;
      }
      if (identifyData.email || identifyData.phone_number) {
        const firstNameField = searchDoc.querySelector('input[name="firstName"]') || searchDoc.querySelector('[data-testid="guest-form-first-name-input"]') || searchDoc.querySelector('input[autocomplete="given-name"]');
        const lastNameField = searchDoc.querySelector('input[name="lastName"]') || searchDoc.querySelector('[data-testid="guest-form-last-name-input"]') || searchDoc.querySelector('input[autocomplete="family-name"]');
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

  // src/shared/validationUtils.js
  function isValidEmail(email) {
    if (!email || email.length < 5) return false;
    const emailRegex = /^[a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  }
  function isValidPhone(phone) {
    const phoneRegex = /^\+?[0-9]{10,15}$/;
    return phoneRegex.test(phone);
  }

  // src/shared/debugConfig.js
  var DEBUG_ENABLED_GLOBALLY = false;
  var DEBUG_ACCOUNT_IDS = define_process_env_DEBUG_ACCOUNT_IDS_default || [];

  // src/shared/debugUtils.js
  function isDebugEnabled() {
    if (DEBUG_ENABLED_GLOBALLY) {
      return true;
    }
    try {
      if (klaviyo.account && typeof klaviyo.account === "function") {
        const accountId = klaviyo.account();
        if (accountId && DEBUG_ACCOUNT_IDS.includes(accountId)) {
          return true;
        }
      }
    } catch (err) {
    }
    return false;
  }
  function createDebugLogger(prefix, legacyEnabled = true) {
    return function debugLog2(...args) {
      if (legacyEnabled && isDebugEnabled()) {
        console.log(prefix, ...args);
      }
    };
  }

  // src/mews/generalUtils.js
  var logger = createDebugLogger("[Klaviyo Hotel Tracking]", DEBUG);
  function debugLog(message, data) {
    logger(message, data || "");
  }
  function isOnGuestsPage() {
    debugLog("Checking if on guests page", window.location.href);
    return window.location.href.indexOf("/contact-details") > -1 || window.location.href.indexOf("/checkout") > -1 || document.getElementById("contact-details");
  }
  function startIdentifyMonitoring() {
    debugLog("Starting guest information monitoring");
    attemptIdentify("monitoring start");
    const attachToForm = function() {
      const iframe = document.querySelector("iframe.mews-distributor") || document.querySelector('iframe[name*="mews-distributor"]');
      if (!iframe) {
        debugLog("Mews iframe not found yet");
        return false;
      }
      debugLog("Mews iframe found:", iframe.name || iframe.className);
      let iframeDoc;
      try {
        iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
        if (!iframeDoc) {
          debugLog("Cannot access iframe document yet");
          return false;
        }
      } catch (e) {
        debugLog("Error accessing iframe (cross-origin?):", e.message);
        return false;
      }
      debugLog("Iframe document accessible");
      const allForms = iframeDoc.querySelectorAll("form");
      debugLog("Total forms in iframe:", allForms.length);
      if (allForms.length > 0) {
        debugLog("First form in iframe details:", {
          id: allForms[0].id,
          ariaLabel: allForms[0].getAttribute("aria-label"),
          className: allForms[0].className
        });
      }
      let guestForm = iframeDoc.getElementById("contact-details");
      debugLog('getElementById("contact-details") in iframe:', !!guestForm);
      if (!guestForm) {
        guestForm = iframeDoc.querySelector('form[aria-label="Your details"]');
        debugLog('querySelector form[aria-label="Your details"] in iframe:', !!guestForm);
      }
      if (!guestForm) {
        guestForm = iframeDoc.querySelector('form[id*="contact"]');
        debugLog('querySelector form[id*="contact"] in iframe:', !!guestForm);
      }
      if (!guestForm) {
        debugLog("Contact form not found in iframe yet, will keep watching");
        return false;
      }
      debugLog("Contact form found!");
      attachFormListeners(guestForm);
      return true;
    };
    if (attachToForm()) {
      return;
    }
    const observer = new MutationObserver(function(mutations) {
      debugLog("DOM changed, checking for form");
      if (attachToForm()) {
        debugLog("Form found via MutationObserver, stopping observer");
        observer.disconnect();
      }
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    let attempts = 0;
    const intervalId = setInterval(function() {
      attempts++;
      debugLog("Periodic check #" + attempts + " for form");
      if (attachToForm() || attempts > 8) {
        clearInterval(intervalId);
        if (attempts > 8) {
          debugLog("Gave up looking for form after 8 attempts");
        }
      }
    }, 1e3);
  }
  function attachFormListeners(guestForm) {
    debugLog("Attaching listeners to form");
    attemptIdentify("form found");
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
        input.addEventListener("change", function() {
          debugLog("Form field changed:", input.name || input.type);
          setTimeout(function() {
            attemptIdentify("field change: " + (input.name || input.type));
          }, 500);
        });
      })(allInputs[i]);
    }
    debugLog("Blur and change listeners attached to all form fields");
    guestForm.addEventListener("submit", function(e) {
      debugLog("Form submit detected - final identify attempt");
      attemptIdentify("form submit");
    });
    debugLog("Form submit listener attached");
    let checks = 0;
    const checkInterval = setInterval(function() {
      checks++;
      attemptIdentify("periodic check #" + checks);
      if (checks >= 5) {
        clearInterval(checkInterval);
        debugLog("Stopped periodic checks");
      }
    }, 3e3);
  }

  // src/mews/gtmUtils.js
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
      if (formElement && (formElement.name === "email" || formElement.name === "phone" || formElement.name === "phoneNumber")) {
        debugLog("User interacted with email/phone field - will check after blur");
      }
    }
    if (eventName === "view_item") {
      debugLog("view_item detected - storing data for later");
      if (ecommerceItems && ecommerceItems.length > 0) {
        setViewItemData(ecommerceItems[0], ecommerceData);
      }
    }
    if (eventName === "distributorReservationCreated") {
      debugLog("Mews reservation created event detected");
      if (event.customerEmail) {
        debugLog("Customer email found in reservation event:", event.customerEmail);
        identifyFromEventData(event.customerEmail, event.customerName, handlers);
      }
    }
    if (eventName === "purchase") {
      debugLog("Purchase event detected");
      setTimeout(function() {
        if (handlers.attemptIdentify) {
          handlers.attemptIdentify("purchase event");
        }
      }, 500);
    }
    if (eventName && KLAVIYO_EVENT_KEY_MAP[eventName]) {
      debugLog("Matched event type:", KLAVIYO_EVENT_KEY_MAP[eventName]);
      if (eventName == "distributorRoomAdded") {
        debugLog("Processing Room Added as Viewed Listing event");
        if (event.reservations && event.reservations.length > 0) {
          const reservation = event.reservations[0];
          const occupancy = reservation.occupancyData && reservation.occupancyData.length > 0 ? reservation.occupancyData[0] : null;
          const resData = {
            startDate: reservation.startDate,
            endDate: reservation.endDate,
            guests: occupancy ? occupancy.personCount : 0,
            adults: occupancy ? occupancy.personCount : 0,
            children: 0,
            roomId: reservation.roomId,
            rateId: reservation.rateId
          };
          debugLog("Captured reservation data:", resData);
          setReservationData(resData);
          debugLog("Tracking Viewed Listing with combined view_item + reservation data");
          handlers.trackViewedListing(reservation, event);
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
  function identifyFromEventData(email, fullName, handlers) {
    debugLog("Attempting identification from event data");
    if (!email || !handlers.attemptIdentify) {
      debugLog("Missing email or identify handler");
      return;
    }
    if (klaviyo.isIdentified && typeof klaviyo.isIdentified === "function") {
      klaviyo.isIdentified().then(function(isIdentified) {
        if (isIdentified) {
          debugLog("User already identified via Klaviyo, skipping");
          return;
        }
        performIdentifyFromEvent(email, fullName);
      }).catch(function(err) {
        debugLog("Error checking isIdentified:", err);
        performIdentifyFromEvent(email, fullName);
      });
    } else {
      performIdentifyFromEvent(email, fullName);
    }
  }
  function performIdentifyFromEvent(email, fullName) {
    const identifyData = { email };
    if (fullName) {
      const nameParts = fullName.trim().split(" ");
      if (nameParts.length > 0) {
        identifyData.first_name = nameParts[0];
        if (nameParts.length > 1) {
          identifyData.last_name = nameParts.slice(1).join(" ");
        }
      }
    }
    debugLog("Identifying user from event data:", identifyData);
    klaviyo.identify(identifyData);
  }

  // src/mews/klaviyo_hotel_tracking.js
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
