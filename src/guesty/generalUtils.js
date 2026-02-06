// General utility functions

import { DEBUG } from './constants.js';
import { isValidEmail, isValidPhone } from '../shared/validationUtils.js';
import { DEBUG_ENABLED_GLOBALLY, DEBUG_ACCOUNT_IDS } from '../shared/debugConfig.js';
import { klaviyo } from '../shared/klaviyoInstance.js';

// Export shared validation functions
export { isValidEmail, isValidPhone };

export function getCurrentPageURL() {
    return window.location.pathname;
}

export function getURLParams() {
    const params = new URLSearchParams(window.location.search);
    return {
        checkIn: params.get('checkIn'),
        checkOut: params.get('checkOut'),
        minOccupancy: params.get('minOccupancy')
    };
}

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

export function debugLog(...args) {
    if (DEBUG && isDebugEnabled()) {
        console.log(...args);
    }
}
