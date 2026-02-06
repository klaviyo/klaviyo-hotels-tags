// Debug configuration

// Global debug flag - set to false for production
export const DEBUG_ENABLED_GLOBALLY = false;

// Array of Klaviyo company IDs that should have debugging enabled
// Loaded from .env at build time (comma-separated string converted to array)
export const DEBUG_ACCOUNT_IDS = process.env.DEBUG_ACCOUNT_IDS || [];
