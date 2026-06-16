(() => {
  // <define:process.env.DEBUG_ACCOUNT_IDS>
  var define_process_env_DEBUG_ACCOUNT_IDS_default = [];

  // src/olo/constants.js
  var DEBUG = false;
  var OLO_EVENTS = {
    VIEW_PRODUCT_DETAIL: "v1.viewProductDetail",
    // (product, viewIn)
    CLICK_PRODUCT_LINK: "v1.clickProductLink",
    // (product, clickFrom)
    ADD_TO_CART: "v1.addToCart",
    // (basketProduct)
    CHECKOUT: "v1.checkout"
    // (basket, doneCallback)
  };
  var FULFILLMENT_TYPE_MAP = {
    counterpickup: "Pickup",
    curbsidepickup: "Pickup",
    curbside: "Pickup",
    drivethru: "Pickup",
    pickup: "Pickup",
    dinein: "Pickup",
    dispatch: "Delivery",
    delivery: "Delivery"
  };
  var PREFERRED_IMAGE_GROUP = "mobile-webapp-menu";

  // src/shared/debugConfig.js
  var DEBUG_ENABLED_GLOBALLY = false;
  var DEBUG_ACCOUNT_IDS = define_process_env_DEBUG_ACCOUNT_IDS_default || [];

  // src/shared/klaviyoInstance.js
  var klaviyo = new Proxy({}, {
    get(target, prop) {
      const kl = window.klaviyo || [];
      return kl[prop];
    },
    has(target, prop) {
      const kl = window.klaviyo || [];
      return prop in kl;
    }
  });

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
      if (legacyEnabled || isDebugEnabled()) {
        console.log(prefix, ...args);
      }
    };
  }

  // src/olo/generalUtils.js
  var logger = createDebugLogger("[Klaviyo Olo Tracking]", DEBUG);
  function debugLog(message, data) {
    logger(message, data !== void 0 ? data : "");
  }
  function parseModifiers(customizeDescription) {
    if (!customizeDescription || typeof customizeDescription !== "string") {
      return [];
    }
    const parts = [];
    let current = "";
    let depth = 0;
    for (let i = 0; i < customizeDescription.length; i++) {
      const ch = customizeDescription[i];
      if (ch === "(") {
        depth++;
        current += ch;
      } else if (ch === ")") {
        depth = Math.max(0, depth - 1);
        current += ch;
      } else if (ch === "," && depth === 0) {
        parts.push(current);
        current = "";
      } else {
        current += ch;
      }
    }
    parts.push(current);
    return parts.map((p) => p.trim()).filter((p) => p !== "" && p.toLowerCase() !== "base price");
  }
  function mapFulfillmentType(handoffMode) {
    if (!handoffMode || typeof handoffMode !== "string") return "";
    const key = handoffMode.toLowerCase().replace(/[\s_-]/g, "");
    return FULFILLMENT_TYPE_MAP[key] || "";
  }
  function pickImageURL(images) {
    if (!Array.isArray(images) || images.length === 0) return "";
    const preferred = images.find((img) => img && img.groupName === PREFERRED_IMAGE_GROUP);
    if (preferred && preferred.filename) return preferred.filename;
    const firstWithFile = images.find((img) => img && img.filename);
    return firstWithFile ? firstWithFile.filename : "";
  }
  function getBrandFromHostname() {
    try {
      const host = window.location && window.location.hostname || "";
      const labels = host.split(".").filter(Boolean);
      if (labels.length === 0) return "";
      const brandLabel = labels.length >= 2 ? labels[labels.length - 2] : labels[0];
      if (!brandLabel) return "";
      return brandLabel.charAt(0).toUpperCase() + brandLabel.slice(1);
    } catch (err) {
      return "";
    }
  }
  function currentURL() {
    try {
      return window.location && window.location.href || "";
    } catch (err) {
      return "";
    }
  }

  // src/shared/restaurant/payloads.js
  function toNumber(value, fallback = 0) {
    const n = typeof value === "string" ? parseFloat(value) : value;
    return typeof n === "number" && isFinite(n) ? n : fallback;
  }
  function toStringSafe(value, fallback = "") {
    if (value === null || value === void 0) return fallback;
    return typeof value === "string" ? value : String(value);
  }
  function toArray(value) {
    if (value === null || value === void 0) return [];
    const arr = Array.isArray(value) ? value : [value];
    return arr.filter((v) => v !== null && v !== void 0 && v !== "").map((v) => typeof v === "string" ? v : String(v));
  }
  function money(value) {
    return Math.round(toNumber(value) * 100) / 100;
  }
  function buildViewedProductPayload(item) {
    const it = item || {};
    const hasPrice = it.price != null && isFinite(Number(it.price));
    const modifiers = toArray(it.modifiers);
    const payload = {
      ProductName: toStringSafe(it.productName),
      ProductID: toStringSafe(it.productId),
      Brand: toStringSafe(it.brand),
      Price: hasPrice ? money(it.price) : void 0,
      Categories: toArray(it.categories),
      ImageURL: toStringSafe(it.imageURL),
      URL: toStringSafe(it.url),
      // A product view has no chosen modifiers, so omit Modifiers when empty
      // rather than sending an always-blank array.
      Modifiers: modifiers.length ? modifiers : void 0
    };
    if (!hasPrice) delete payload.Price;
    if (!modifiers.length) delete payload.Modifiers;
    return payload;
  }
  function buildAddedToCartPayload(addedItem, cart) {
    const a = addedItem || {};
    const c = cart || {};
    const lineItems = Array.isArray(c.items) ? c.items.map(buildLineItem) : [];
    const providedValue = toNumber(c.value, NaN);
    const summed = lineItems.reduce((sum, li) => sum + li.RowTotal, 0);
    const value = isFinite(providedValue) ? money(providedValue) : money(summed);
    const hasPrice = a.price != null && isFinite(Number(a.price));
    const payload = {
      $value: value,
      AddedItemProductName: toStringSafe(a.productName),
      AddedItemProductID: toStringSafe(a.productId),
      AddedItemCategories: toArray(a.categories),
      AddedItemImageURL: toStringSafe(a.imageURL),
      AddedItemURL: toStringSafe(a.url),
      AddedItemPrice: hasPrice ? money(a.price) : void 0,
      AddedItemQuantity: toNumber(a.quantity, 1),
      AddedItemModifiers: toArray(a.modifiers),
      ItemNames: lineItems.map((li) => li.ProductName).filter((n) => n !== ""),
      CheckoutURL: toStringSafe(c.checkoutURL),
      Items: lineItems
    };
    if (!hasPrice) delete payload.AddedItemPrice;
    return payload;
  }
  function buildLineItem(lineItem) {
    const li = lineItem || {};
    const itemPrice = money(li.itemPrice);
    const quantity = toNumber(li.quantity, 1);
    return {
      ProductID: toStringSafe(li.productId),
      ProductName: toStringSafe(li.productName),
      Quantity: quantity,
      ItemPrice: itemPrice,
      RowTotal: money(itemPrice * quantity),
      ProductURL: toStringSafe(li.productURL),
      ImageURL: toStringSafe(li.imageURL),
      ProductCategories: toArray(li.productCategories),
      Modifiers: toArray(li.modifiers)
    };
  }
  function buildStartedCheckoutPayload(cart) {
    const c = cart || {};
    const lineItems = Array.isArray(c.items) ? c.items.map(buildLineItem) : [];
    const providedValue = toNumber(c.value, NaN);
    const summedValue = lineItems.reduce((sum, li) => sum + li.RowTotal, 0);
    const value = isFinite(providedValue) ? money(providedValue) : money(summedValue);
    const categories = c.categories ? toArray(c.categories) : dedupe(lineItems.reduce((acc, li) => acc.concat(li.ProductCategories), []));
    return {
      $value: value,
      ItemNames: lineItems.map((li) => li.ProductName).filter((n) => n !== ""),
      Quantity: lineItems.reduce((sum, li) => sum + li.Quantity, 0),
      CheckoutURL: toStringSafe(c.checkoutURL),
      Categories: categories,
      Modifiers: dedupe(lineItems.reduce((acc, li) => acc.concat(li.Modifiers), [])),
      FulfillmentType: toStringSafe(c.fulfillmentType),
      Brand: toStringSafe(c.brand),
      Items: lineItems
    };
  }
  function dedupe(arr) {
    const seen = {};
    const out = [];
    for (const v of arr) {
      if (!seen[v]) {
        seen[v] = true;
        out.push(v);
      }
    }
    return out;
  }

  // src/shared/restaurant/eventNames.js
  var VIEWED_PRODUCT = "Viewed Product";
  var ADDED_TO_CART = "Added to Cart";
  var STARTED_CHECKOUT = "Started Checkout";

  // src/shared/validationUtils.js
  function isValidEmail(email) {
    if (!email || email.length < 5) return false;
    const emailRegex = /^[a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  }
  function isValidPhone(phone) {
    if (!phone) return false;
    const cleanPhone = phone.replace(/[\s\(\)\-\.]/g, "");
    const phoneRegex = /^\+?[0-9]{10,15}$/;
    return phoneRegex.test(cleanPhone);
  }

  // src/olo/klaviyoUtils.js
  var IMAGE_CACHE_KEY = "klOloImageById";
  function loadImageCache() {
    try {
      return JSON.parse(sessionStorage.getItem(IMAGE_CACHE_KEY)) || {};
    } catch (err) {
      return {};
    }
  }
  var imageById = loadImageCache();
  function rememberProductImage(product) {
    if (!product || product.id == null) return;
    const url = pickImageURL(product.images);
    if (url && imageById[String(product.id)] !== url) {
      imageById[String(product.id)] = url;
      try {
        sessionStorage.setItem(IMAGE_CACHE_KEY, JSON.stringify(imageById));
      } catch (err) {
      }
    }
  }
  function imageForProductId(id) {
    return id != null && imageById[String(id)] ? imageById[String(id)] : "";
  }
  var PRICE_CACHE_KEY = "klOloPriceById";
  function loadPriceCache() {
    try {
      return JSON.parse(sessionStorage.getItem(PRICE_CACHE_KEY)) || {};
    } catch (err) {
      return {};
    }
  }
  var priceById = loadPriceCache();
  function rememberProductPrice(id, price) {
    if (id == null) return;
    const n = Number(price);
    if (!isFinite(n) || n <= 0) return;
    if (priceById[String(id)] !== n) {
      priceById[String(id)] = n;
      try {
        sessionStorage.setItem(PRICE_CACHE_KEY, JSON.stringify(priceById));
      } catch (err) {
      }
    }
  }
  function priceForProductId(id) {
    return id != null && priceById[String(id)] ? priceById[String(id)] : void 0;
  }
  function mapProductToItem(product) {
    const p = product || {};
    return {
      productName: p.name,
      productId: p.id,
      brand: getBrandFromHostname(),
      price: p.baseCost != null ? p.baseCost : priceForProductId(p.id),
      categories: p.category && p.category.name ? [p.category.name] : [],
      imageURL: pickImageURL(p.images),
      url: currentURL(),
      modifiers: []
    };
  }
  function mapBasketProductToItem(basketProduct) {
    const bp = basketProduct || {};
    const product = bp.product || {};
    return {
      productName: bp.productName || product.name,
      productId: product.id,
      brand: getBrandFromHostname(),
      price: bp.unitCost,
      quantity: bp.quantity,
      categories: bp.categoryName ? [bp.categoryName] : [],
      imageURL: pickImageURL(product.images) || imageForProductId(product.id),
      url: currentURL(),
      modifiers: parseModifiers(bp.customizeDescription)
    };
  }
  function mapBasketProductToLineItem(basketProduct) {
    const bp = basketProduct || {};
    const product = bp.product || {};
    return {
      productId: product.id,
      productName: bp.productName || product.name,
      quantity: bp.quantity,
      itemPrice: bp.unitCost,
      productURL: currentURL(),
      imageURL: pickImageURL(product.images) || imageForProductId(product.id),
      productCategories: bp.categoryName ? [bp.categoryName] : [],
      modifiers: parseModifiers(bp.customizeDescription)
    };
  }
  function mapBasketToCart(basket) {
    const b = basket || {};
    const products = Array.isArray(b.basketProducts) ? b.basketProducts : [];
    return {
      value: b.total,
      // all-in order total (tax, tip, fees, less discounts) — Klaviyo $value
      brand: getBrandFromHostname(),
      fulfillmentType: mapFulfillmentType(b.handoffMode),
      checkoutURL: currentURL(),
      items: products.map(mapBasketProductToLineItem)
    };
  }
  var VIEWED_DEDUPE_MS = 2e3;
  var lastViewedAt = {};
  function trackViewedProduct(product) {
    rememberProductImage(product);
    const item = mapProductToItem(product);
    if (!item.productName && !item.productId) {
      debugLog("Skipping Viewed Product - no product data");
      return;
    }
    const key = String(item.productId || item.productName);
    const now = Date.now();
    if (lastViewedAt[key] && now - lastViewedAt[key] < VIEWED_DEDUPE_MS) {
      debugLog("Skipping duplicate Viewed Product for", key);
      return;
    }
    lastViewedAt[key] = now;
    const payload = buildViewedProductPayload(item);
    debugLog("Viewed Product payload:", payload);
    klaviyo.track(VIEWED_PRODUCT, payload).then(() => {
      debugLog("Viewed Product tracked");
    }).catch((err) => {
      debugLog("Error tracking Viewed Product:", err);
    });
  }
  function basketTotalQuantity() {
    const b = window.Olo && window.Olo.data && window.Olo.data.basket || {};
    const products = Array.isArray(b.basketProducts) ? b.basketProducts : [];
    return products.reduce((sum, p) => sum + (Number(p && p.quantity) || 0), 0);
  }
  var ADD_POLL_MS = 50;
  var ADD_MAX_WAIT_MS = 800;
  function trackAddedToCart(basketProduct) {
    const addedItem = mapBasketProductToItem(basketProduct);
    rememberProductPrice(addedItem.productId, addedItem.price);
    if (!addedItem.productName && !addedItem.productId) {
      debugLog("Skipping Added to Cart - no product data");
      return;
    }
    const beforeQty = basketTotalQuantity();
    let waited = 0;
    const fire = () => {
      const rawBasket = window.Olo && window.Olo.data && window.Olo.data.basket || {};
      let products = Array.isArray(rawBasket.basketProducts) ? rawBasket.basketProducts.slice() : [];
      const addedId = basketProduct && basketProduct.product && basketProduct.product.id;
      const present = addedId != null && products.some((p) => p && p.product && String(p.product.id) === String(addedId));
      if (!present) products = products.concat([basketProduct]);
      const cart = mapBasketToCart({ ...rawBasket, basketProducts: products });
      cart.items.forEach((li) => rememberProductPrice(li.productId, li.itemPrice));
      const payload = buildAddedToCartPayload(addedItem, cart);
      debugLog("Added to Cart payload:", payload);
      klaviyo.track(ADDED_TO_CART, payload).then(() => {
        debugLog("Added to Cart tracked");
      }).catch((err) => {
        debugLog("Error tracking Added to Cart:", err);
      });
    };
    const timer = setInterval(() => {
      waited += ADD_POLL_MS;
      if (basketTotalQuantity() > beforeQty || waited >= ADD_MAX_WAIT_MS) {
        clearInterval(timer);
        fire();
      }
    }, ADD_POLL_MS);
  }
  function trackStartedCheckout(basket) {
    const cart = mapBasketToCart(basket);
    cart.items.forEach((li) => rememberProductPrice(li.productId, li.itemPrice));
    const payload = buildStartedCheckoutPayload(cart);
    debugLog("Started Checkout payload:", payload);
    klaviyo.track(STARTED_CHECKOUT, payload).then(() => {
      debugLog("Started Checkout tracked");
    }).catch((err) => {
      debugLog("Error tracking Started Checkout:", err);
    });
  }
  function findField(selectors) {
    for (let i = 0; i < selectors.length; i++) {
      const el = document.querySelector(selectors[i]);
      if (el) return el;
    }
    return null;
  }
  var findEmailField = () => findField(['input[name="emailAddress"]', 'input[autocomplete="email"]', 'input[type="email"]']);
  var findPhoneField = () => findField(['input[autocomplete="tel"]', 'input[name="phoneNumber"]', 'input[type="tel"]']);
  var findFirstNameField = () => findField(['input[name="firstName"]', 'input[autocomplete="given-name"]']);
  var findLastNameField = () => findField(['input[name="lastName"]', 'input[autocomplete="family-name"]']);
  var fieldValue = (el) => el && el.value ? el.value.trim() : "";
  var lastIdentifyKey = "";
  function attemptIdentify(source) {
    const email = fieldValue(findEmailField());
    const phone = fieldValue(findPhoneField());
    const first = fieldValue(findFirstNameField());
    const last = fieldValue(findLastNameField());
    const hasEmail = email && isValidEmail(email);
    const hasPhone = phone && isValidPhone(phone);
    if (!hasEmail && !hasPhone || !first || !last) return;
    const props = { first_name: first, last_name: last };
    if (hasEmail) props.email = email;
    if (hasPhone) props.phone_number = phone;
    const key = JSON.stringify(props);
    if (key === lastIdentifyKey) return;
    debugLog("Identifying guest (" + source + "):", props);
    try {
      klaviyo.identify(props);
      lastIdentifyKey = key;
    } catch (err) {
      debugLog("Error identifying:", err);
    }
  }
  function startIdentifyMonitoring() {
    const onAction = () => {
      if (window.location.pathname.indexOf("/checkout") !== -1) {
        attemptIdentify("checkout action");
      }
    };
    document.addEventListener("submit", onAction, true);
    document.addEventListener("click", onAction, true);
  }

  // src/olo/klaviyo_restaurant_tracking.js
  var POLL_INTERVAL_MS = 200;
  var MAX_WAIT_MS = 15e3;
  function isBusReady() {
    return !!(window.Olo && typeof window.Olo.on === "function");
  }
  function subscribe() {
    const on = (eventName, cb) => {
      try {
        window.Olo.on(eventName, cb, { replay: true });
        debugLog("Subscribed to " + eventName);
      } catch (err) {
        debugLog("Failed to subscribe to " + eventName + ":", err);
      }
    };
    on(OLO_EVENTS.CLICK_PRODUCT_LINK, function(product) {
      trackViewedProduct(product);
    });
    on(OLO_EVENTS.VIEW_PRODUCT_DETAIL, function(product) {
      trackViewedProduct(product);
    });
    on(OLO_EVENTS.ADD_TO_CART, function(basketProduct) {
      trackAddedToCart(basketProduct);
    });
    on(OLO_EVENTS.CHECKOUT, function(basket, done) {
      if (typeof done === "function") {
        setTimeout(done, 0);
      }
      trackStartedCheckout(basket);
    });
  }
  (function() {
    debugLog("Script initialized");
    if (isBusReady()) {
      subscribe();
    } else {
      debugLog("window.Olo not ready yet, polling...");
      let waited = 0;
      const timer = setInterval(function() {
        if (isBusReady()) {
          clearInterval(timer);
          subscribe();
        } else if (waited >= MAX_WAIT_MS) {
          clearInterval(timer);
          debugLog("Gave up waiting for window.Olo after " + MAX_WAIT_MS + "ms");
        }
        waited += POLL_INTERVAL_MS;
      }, POLL_INTERVAL_MS);
    }
    startIdentifyMonitoring();
    debugLog("Setup complete");
  })();
})();
