// General utility functions

import { DEBUG } from './constants.js';
import { attemptIdentify } from './klaviyoUtils.js';

// Debug logging utility
export function debugLog(message, data) {
    if (DEBUG) {
        console.log('[Klaviyo Hotel Tracking] ' + message, data || '');
    }
}

// Simple email validation
export function isValidEmail(email) {
    if (!email || email.length < 5) return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
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
                debugLog('Form field blur:', input.name || input.type);
                // Check for email/phone whenever any field loses focus
                setTimeout(function() { attemptIdentify('field blur: ' + (input.name || input.type)); }, 500);
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
