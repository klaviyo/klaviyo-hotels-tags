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

    // Find email and phone fields
    const emailField = guestForm.querySelector('input[name="email"]') ||
                      guestForm.querySelector('[data-testid="guest-form-email-input"]') ||
                      guestForm.querySelector('input[type="email"]');

    const phoneField = guestForm.querySelector('input[name="phoneNumber"]') ||
                      guestForm.querySelector('[data-testid="guest-form-phone-input"]') ||
                      guestForm.querySelector('input[type="tel"][name="phoneNumber"]');

    // Add blur listener to email field
    if (emailField) {
        emailField.addEventListener('blur', function() {
            debugLog('Email field blur');
            setTimeout(function() { attemptIdentify('email blur'); }, 500);
        });
        debugLog('Blur listener attached to email field');
    } else {
        debugLog('WARNING: Email field not found');
    }

    // Add blur listener to phone field (allows re-identification)
    if (phoneField) {
        phoneField.addEventListener('blur', function() {
            debugLog('Phone field blur');
            setTimeout(function() { attemptIdentify('phone blur', true); }, 500);
        });
        debugLog('Blur listener attached to phone field');
    } else {
        debugLog('WARNING: Phone field not found');
    }

    // Also check on form submission as final catch
    guestForm.addEventListener('submit', function(e) {
        debugLog('Form submit detected - final identify attempt');
        attemptIdentify('form submit');
    });
    debugLog('Form submit listener attached');
}
