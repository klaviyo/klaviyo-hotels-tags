// Shared Klaviyo instance reference
// Use a Proxy to dynamically access window.klaviyo on every property access
// This ensures we always get the real Klaviyo object after it loads, not just an empty array
export const klaviyo = new Proxy({}, {
    get(target, prop) {
        const kl = window.klaviyo || [];
        return kl[prop];
    },
    has(target, prop) {
        const kl = window.klaviyo || [];
        return prop in kl;
    }
});
