// Constants for Klaviyo Olo Serve tracking (VEX-355).

// Enable debug logging (legacy global flag; account-based debug also applies)
export const DEBUG = false;

// Olo Serve "global events" we subscribe to via window.Olo.on, mapped to the
// normalized Klaviyo F&B events. Event signatures (from Olo's own GTM template):
//   v1.viewProductDetail (product, viewIn)
//   v1.clickProductLink  (product, clickFrom)
//   v1.addToCart         (basketProduct)
//   v1.checkout          (basket, doneCallback)
// Viewed Product listens to BOTH viewProductDetail and clickProductLink: which
// one a site emits varies by Serve feature flags (observed live: some sites fire
// only clickProductLink). trackViewedProduct de-dupes if both fire.
export const OLO_EVENTS = {
    VIEW_PRODUCT_DETAIL: "v1.viewProductDetail",
    CLICK_PRODUCT_LINK: "v1.clickProductLink",
    ADD_TO_CART: "v1.addToCart",
    CHECKOUT: "v1.checkout",
};

// Olo basket.handoffMode -> normalized FulfillmentType ("Pickup" | "Delivery").
// Olo uses handoff modes like CounterPickup / CurbsidePickup / DriveThru for
// pickup and Dispatch / Delivery for delivery.
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

// Olo product image groupName we prefer for ImageURL (the menu thumbnail).
export const PREFERRED_IMAGE_GROUP = "mobile-webapp-menu";
