(() => {
  // src/guesty/constants.js
  var DEBUG = true;

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
  var DEBUG_ACCOUNT_IDS = [
    // Example: 'ABC123',
    // Example: 'XYZ789',
  ];

  // src/guesty/generalUtils.js
  function getCurrentPageURL() {
    return window.location.pathname;
  }
  function getURLParams() {
    const params = new URLSearchParams(window.location.search);
    return {
      checkIn: params.get("checkIn"),
      checkOut: params.get("checkOut"),
      minOccupancy: params.get("minOccupancy")
    };
  }
  function isDebugEnabled() {
    if (DEBUG_ENABLED_GLOBALLY) {
      return true;
    }
    try {
      const klaviyo2 = window.klaviyo || [];
      if (klaviyo2.account && typeof klaviyo2.account === "function") {
        const accountId = klaviyo2.account();
        if (accountId && DEBUG_ACCOUNT_IDS.includes(accountId)) {
          return true;
        }
      }
    } catch (err) {
    }
    return false;
  }
  function debugLog(...args) {
    const shouldLog = DEBUG || isDebugEnabled();
    if (shouldLog) {
      console.log(...args);
    }
  }

  // src/guesty/klaviyoUtils.js
  var klaviyo = window.klaviyo || [];
  var MONITORING_ACCOUNT = "UcwNrH";
  var MONITORING_PROFILE_ID = "guesty-onsite-monitoring";
  var checkoutTracked = false;
  var quoteResponseData = null;
  var totalValue = null;
  var additionalFields = {};
  var lastViewedListing = null;
  function setQuoteData(data, value, fields) {
    quoteResponseData = data;
    totalValue = value;
    additionalFields = fields;
  }
  function setLastViewedListing(listingData) {
    lastViewedListing = listingData;
    debugLog("Stored listing data for checkout:", listingData);
  }
  function getLastViewedListing() {
    return lastViewedListing;
  }
  async function sendErrorAlert(eventName, errorCause, errorMessage, customerAccountId) {
    try {
      debugLog("Sending critical error alert to monitoring account:", {
        eventName,
        errorCause,
        errorMessage,
        customerAccountId
      });
      const response = await fetch(`https://a.klaviyo.com/client/events/?company_id=${MONITORING_ACCOUNT}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          data: {
            type: "event",
            attributes: {
              profile: {
                $external_id: MONITORING_PROFILE_ID,
                $first_name: "Guesty",
                $last_name: "Onsite"
              },
              metric: {
                name: "Guesty Integration Error"
              },
              properties: {
                "Failed Event": eventName,
                "Error Cause": errorCause,
                "Error Message": errorMessage || "Unknown error",
                "Customer Account ID": customerAccountId,
                "Timestamp": (/* @__PURE__ */ new Date()).toISOString(),
                "Page URL": window.location.href,
                "User Agent": navigator.userAgent
              }
            }
          }
        })
      });
      if (response.ok) {
        debugLog("Critical error alert sent successfully");
      } else {
        debugLog("Error alert API response failed:", response.status, response.statusText);
      }
    } catch (alertError) {
      debugLog("Failed to send error alert:", alertError);
    }
  }
  function trackViewedListingOrCheckout(eventName, responseData, value, additionalFieldsParam) {
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
    let customerAccountId = "unknown";
    try {
      if (klaviyo.account && typeof klaviyo.account === "function") {
        customerAccountId = klaviyo.account();
      }
    } catch (e) {
      debugLog("Could not get account ID:", e);
    }
    klaviyo.isIdentified().then((res) => {
      if (res) {
        debugLog(`Tracking Klaviyo Event - ${eventName}: `, listingData);
      } else {
        debugLog(`Klaviyo Event - ${eventName} - tracked to local storage, user is not identified yet`);
      }
    }).catch((err) => {
      debugLog(`Error checking identification status for ${eventName}:`, err);
    });
    try {
      klaviyo.track(`${eventName}`, listingData).then((res) => {
        klaviyo.isIdentified().then((result) => {
          if (result) {
            debugLog(`Klaviyo Event - ${eventName} - Success: ${res}`);
          }
        });
      }).catch((err) => {
        debugLog(`CRITICAL: Error tracking ${eventName}:`, err);
        const errorCause = "klaviyo.track() promise rejected";
        sendErrorAlert(eventName, errorCause, err.message || err.toString(), customerAccountId);
      });
    } catch (err) {
      debugLog(`CRITICAL: Exception tracking ${eventName}:`, err);
      const errorCause = "klaviyo.track() threw exception";
      sendErrorAlert(eventName, errorCause, err.message || err.toString(), customerAccountId);
    }
  }
  function trackStartedCheckoutOnce() {
    if (checkoutTracked || !quoteResponseData) return;
    checkoutTracked = true;
    trackViewedListingOrCheckout("Started Checkout", quoteResponseData, totalValue, additionalFields);
  }
  function setupCheckoutIdentifyListeners() {
    let emailField = document.querySelector("input[name='email']");
    let phoneNumber = document.querySelector("input[name='phone']");
    let firstName = document.querySelector("input[name='firstName']");
    let lastName = document.querySelector("input[name='lastName']");
    function handleUserInput() {
      const user = {
        "email": emailField?.value.trim() || "",
        "phone_number": phoneNumber?.value || "",
        "first_name": firstName?.value || "",
        "last_name": lastName?.value || ""
      };
      const validEmail = isValidEmail(user.email);
      const validPhone = isValidPhone(user.phone_number);
      if (validEmail || validPhone) {
        klaviyo.identify(user).then(() => {
          debugLog("Identified Klaviyo User!");
          trackStartedCheckoutOnce();
        }).catch((err) => {
          debugLog("Error identifying user:", err);
        });
      } else {
        debugLog("Neither valid email nor phone entered yet", { validEmail, validPhone });
      }
    }
    phoneNumber?.addEventListener("blur", handleUserInput);
    emailField?.addEventListener("blur", handleUserInput);
  }

  // src/guesty/klaviyo_hotel_tracking.js
  (function() {
    const originalFetch = window.fetch;
    const originalXHROpen = XMLHttpRequest.prototype.open;
    const FIELDS = "_id+title+nickname+type+roomType+propertyType+accommodates+amenities+bathrooms+bedrooms+beds+bedType+timezone+defaultCheckInTime+defaultCheckOutTime+address+picture+pictures+prices+publicDescription+terms+taxes+reviews+tags+parentId++";
    const klaviyo2 = window.klaviyo || [];
    window.fetch = async function(...args) {
      const response = await originalFetch(...args);
      const clonedResponse = response.clone();
      const url = typeof args[0] === "string" ? args[0] : args[0]?.url;
      if (url?.includes("/api/pm-websites-backend/listings/") && url?.includes("?fields") && !getCurrentPageURL().includes("/checkout")) {
        clonedResponse.text().then((data) => {
          const listingData = JSON.parse(data);
          setLastViewedListing(listingData);
          trackViewedListingOrCheckout("Viewed Listing", listingData);
        });
      }
      if (url?.includes("/api/pm-websites-backend/reservations/quotes") && getCurrentPageURL().includes("/checkout")) {
        clonedResponse.text().then(async (data) => {
          try {
            let parsedData = JSON.parse(data);
            debugLog("Quote data received:", parsedData);
            const urlParams = getURLParams();
            debugLog("URL parameters:", urlParams);
            const totalValue2 = parsedData.rates.ratePlans[0].ratePlan.money.fareAccommodationAdjusted;
            const additionalFields2 = {
              "CheckIn": urlParams.checkIn || parsedData.checkInDateLocalized,
              "CheckOut": urlParams.checkOut || parsedData.checkOutDateLocalized,
              "Number of Guests": urlParams.minOccupancy ? parseInt(urlParams.minOccupancy) : parsedData.guestsCount,
              "Guest Details": parsedData.numberOfGuests,
              "CheckIn Date and Time": parsedData.stay[0].eta,
              "CheckOut Date and Time": parsedData.stay[0].etd
            };
            const storedListingData = getLastViewedListing();
            if (storedListingData) {
              debugLog("Using stored listing data from Viewed Listing event");
              setQuoteData(storedListingData, totalValue2, additionalFields2);
              klaviyo2.isIdentified().then((res) => {
                if (res) {
                  trackStartedCheckoutOnce();
                } else {
                  setupCheckoutIdentifyListeners();
                }
              });
            } else {
              debugLog("Warning: No stored listing data available. User may not have viewed listing page first.");
            }
          } catch (error) {
            debugLog("Error in Started Checkout tracking (fetch):", error);
          }
        });
      }
      return response;
    };
    XMLHttpRequest.prototype.open = function(method, url, ...rest) {
      this.addEventListener("load", function() {
        if (url.includes("/api/pm-websites-backend/listings/") && url.includes("?fields") && !getCurrentPageURL().includes("/checkout")) {
          try {
            let data = JSON.parse(this.responseText);
            setLastViewedListing(data);
            trackViewedListingOrCheckout("Viewed Listing", data);
          } catch (e) {
            debugLog("Error parsing JSON response: ", e);
          }
        }
        if (url.includes("/api/pm-websites-backend/reservations/quotes") && getCurrentPageURL().includes("/checkout")) {
          try {
            let data = JSON.parse(this.responseText);
            debugLog("Quote data received (XHR):", data);
            const urlParams = getURLParams();
            debugLog("URL parameters (XHR):", urlParams);
            const totalValue2 = data.rates.ratePlans[0].ratePlan.money.fareAccommodationAdjusted;
            const additionalFields2 = {
              "CheckIn": urlParams.checkIn || data.checkInDateLocalized,
              "CheckOut": urlParams.checkOut || data.checkOutDateLocalized,
              "Number of Guests": urlParams.minOccupancy ? parseInt(urlParams.minOccupancy) : data.guestsCount,
              "Guest Details": data.numberOfGuests,
              "CheckIn Date and Time": data.stay[0].eta,
              "CheckOut Date and Time": data.stay[0].etd
            };
            const storedListingData = getLastViewedListing();
            if (storedListingData) {
              debugLog("Using stored listing data from Viewed Listing event (XHR)");
              setQuoteData(storedListingData, totalValue2, additionalFields2);
              klaviyo2.isIdentified().then((res) => {
                if (res) {
                  trackStartedCheckoutOnce();
                } else {
                  setupCheckoutIdentifyListeners();
                }
              });
            } else {
              debugLog("Warning: No stored listing data available (XHR). User may not have viewed listing page first.");
            }
          } catch (e) {
            debugLog("Error parsing JSON response (XHR): ", e);
          }
        }
      });
      return originalXHROpen.apply(this, [method, url, ...rest]);
    };
    debugLog("Guesty tracking script initialized");
  })();
})();
