// Constants for Olo Serve tracking.

export const DEBUG = false;

// Olo Serve "global events" (window.Olo.on) -> normalized Klaviyo events.
// Viewed Product listens to both clickProductLink and viewProductDetail because
// which one a site emits varies by Serve feature flags; trackViewedProduct
// de-dupes if both fire.
export const OLO_EVENTS = {
    VIEW_PRODUCT_DETAIL: "v1.viewProductDetail", // (product, viewIn)
    CLICK_PRODUCT_LINK: "v1.clickProductLink",   // (product, clickFrom)
    ADD_TO_CART: "v1.addToCart",                 // (basketProduct)
    CHECKOUT: "v1.checkout",                     // (basket, doneCallback)
};

// handoffMode -> FulfillmentType.
export const FULFILLMENT_TYPE_MAP = {
    counterpickup: "Pickup",
    curbsidepickup: "Pickup",
    curbside: "Pickup",
    drivethru: "Pickup",
    pickup: "Pickup",
    dinein: "Pickup",
    dispatch: "Delivery",
    delivery: "Delivery",
};

// Preferred product image group for ImageURL (the menu thumbnail).
export const PREFERRED_IMAGE_GROUP = "mobile-webapp-menu";
