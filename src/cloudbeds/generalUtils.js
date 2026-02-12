// General utility functions

import { DEBUG } from './constants.js';
import { attemptIdentify } from './klaviyoUtils.js';
import { isValidEmail, isValidPhone } from '../shared/validationUtils.js';
import { createDebugLogger } from '../shared/debugUtils.js';

// Export shared validation functions
export { isValidEmail, isValidPhone };

// Debug logging utility
const logger = createDebugLogger('[Klaviyo Hotel Tracking]', DEBUG);
export function debugLog(message, data) {
    logger(message, data || '');
}

// Check if on guests page
export function isOnGuestsPage() {
    return window.location.href.indexOf('/guests') > -1 || document.getElementById('guest-form');
}

// Start monitoring for guest information on forms
export function startIdentifyMonitoring() {
    debugLog('Starting guest information monitoring');

    // Check immediately
    attemptIdentify('monitoring start');

    // Find the guest form
    const guestForm = document.getElementById('guest-form') ||
                   document.querySelector('form[data-testid="guest-form"]');

    if (!guestForm) {
        debugLog('WARNING: Guest form not found, cannot attach listeners');
        return;
    }

    // Add blur listeners to ALL input fields in the form
    const allInputs = guestForm.querySelectorAll('input, textarea, select');
    debugLog('Found ' + allInputs.length + ' form fields to monitor');

    for (let i = 0; i < allInputs.length; i++) {
        (function(input) {
            input.addEventListener('blur', function() {
                const fieldName = input.name || input.type;
                debugLog('Form field blur:', fieldName);

                // Check if this is an email field
                const isEmailField = input.type === 'email' ||
                                   input.name === 'email' ||
                                   input.getAttribute('data-testid') === 'guest-form-email-input';

                // Check if this is a phone field
                const isPhoneField = (input.type === 'tel' && input.name === 'phoneNumber') ||
                                   input.name === 'phoneNumber' ||
                                   input.getAttribute('data-testid') === 'guest-form-phone-input';

                // Only identify on email or phone blur
                if (isEmailField) {
                    debugLog('Email field detected, attempting identification');
                    setTimeout(function() { attemptIdentify('email blur'); }, 500);
                } else if (isPhoneField) {
                    debugLog('Phone field detected, attempting re-identification');
                    setTimeout(function() { attemptIdentify('phone blur', true); }, 500);
                } else {
                    debugLog('Ignoring blur on non-email/phone field:', fieldName);
                }
            });
        })(allInputs[i]);
    }

    debugLog('Blur listeners attached to all form fields');

    // Also check on form submission as final catch
    guestForm.addEventListener('submit', function(e) {
        debugLog('Form submit detected - final identify attempt');
        attemptIdentify('form submit');
    });
    debugLog('Form submit listener attached');
}
