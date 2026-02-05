// Shared debug utilities

import { DEBUG_ENABLED_GLOBALLY, DEBUG_ACCOUNT_IDS } from './debugConfig.js';

// Check if debugging is enabled for the current account
function isDebugEnabled() {
    // If globally enabled, always log
    if (DEBUG_ENABLED_GLOBALLY) {
        return true;
    }

    // Check if current account is in the debug list
    try {
        const klaviyo = window.klaviyo || [];
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
// The enabled parameter controls local development logging
// Account-based checks only apply when deployed (isDebugEnabled)
export function createDebugLogger(prefix, legacyEnabled = true) {
    return function debugLog(...args) {
        // Check if logging is enabled via:
        // 1. Legacy/local DEBUG flag (for development), OR
        // 2. Account-based debugging (for production troubleshooting)
        const shouldLog = legacyEnabled || isDebugEnabled();

        if (shouldLog) {
            console.log(prefix, ...args);
        }
    };
}
