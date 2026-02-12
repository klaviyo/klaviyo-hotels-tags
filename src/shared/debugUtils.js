// Shared debug utilities

import { DEBUG_ENABLED_GLOBALLY, DEBUG_ACCOUNT_IDS } from './debugConfig.js';
import { klaviyo } from './klaviyoInstance.js';

// Check if debugging is enabled for the current account
function isDebugEnabled() {
    // If globally enabled, always log
    if (DEBUG_ENABLED_GLOBALLY) {
        return true;
    }

    // Check if current account is in the debug list
    try {
        if (klaviyo.account && typeof klaviyo.account === 'function') {
            const accountId = klaviyo.account();
            if (accountId && DEBUG_ACCOUNT_IDS.includes(accountId)) {
                return true;
            }
        }
    } catch (err) {
        // Silently fail if we can't get account ID
    }

    return false;
}

// Creates a debug logger function with a specific prefix
// The enabled parameter controls whether to log at all
export function createDebugLogger(prefix, legacyEnabled = true) {
    return function debugLog(...args) {
        // If legacy flag is true, always log
        // Otherwise check account-based debugging
        if (legacyEnabled || isDebugEnabled()) {
            console.log(prefix, ...args);
        }
    };
}
