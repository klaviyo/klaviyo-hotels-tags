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

// Check if on guests/contact details page (Mews checkout)
export function isOnGuestsPage() {
    debugLog('Checking if on guests page', window.location.href);
    return window.location.href.indexOf('/contact-details') > -1 ||
           window.location.href.indexOf('/checkout') > -1 ||
           document.getElementById('contact-details');
}

// Start monitoring for guest information on forms
export function startIdentifyMonitoring() {
    debugLog('Starting guest information monitoring');

    // Check immediately
    attemptIdentify('monitoring start');

    // Try to find and attach to form
    const attachToForm = function() {
        // Find the Mews distributor iframe
        const iframe = document.querySelector('iframe.mews-distributor') ||
                      document.querySelector('iframe[name*="mews-distributor"]');

        if (!iframe) {
            debugLog('Mews iframe not found yet');
            return false;
        }

        debugLog('Mews iframe found:', iframe.name || iframe.className);

        // Try to access iframe content
        let iframeDoc;
        try {
            iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
            if (!iframeDoc) {
                debugLog('Cannot access iframe document yet');
                return false;
            }
        } catch (e) {
            debugLog('Error accessing iframe (cross-origin?):', e.message);
            return false;
        }

        debugLog('Iframe document accessible');

        // Debug: Log what forms exist in iframe
        const allForms = iframeDoc.querySelectorAll('form');
        debugLog('Total forms in iframe:', allForms.length);

        if (allForms.length > 0) {
            debugLog('First form in iframe details:', {
                id: allForms[0].id,
                ariaLabel: allForms[0].getAttribute('aria-label'),
                className: allForms[0].className
            });
        }

        // Find the contact details form inside the iframe
        let guestForm = iframeDoc.getElementById('contact-details');
        debugLog('getElementById("contact-details") in iframe:', !!guestForm);

        if (!guestForm) {
            guestForm = iframeDoc.querySelector('form[aria-label="Your details"]');
            debugLog('querySelector form[aria-label="Your details"] in iframe:', !!guestForm);
        }

        if (!guestForm) {
            guestForm = iframeDoc.querySelector('form[id*="contact"]');
            debugLog('querySelector form[id*="contact"] in iframe:', !!guestForm);
        }

        if (!guestForm) {
            debugLog('Contact form not found in iframe yet, will keep watching');
            return false;
        }

        debugLog('Contact form found!');
        attachFormListeners(guestForm);
        return true;
    };

    // Try immediately
    if (attachToForm()) {
        return;
    }

    // Set up MutationObserver to watch for form appearing
    const observer = new MutationObserver(function(mutations) {
        debugLog('DOM changed, checking for form');
        if (attachToForm()) {
            debugLog('Form found via MutationObserver, stopping observer');
            observer.disconnect();
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    // Also try periodically as backup (less aggressive)
    let attempts = 0;
    const intervalId = setInterval(function() {
        attempts++;
        debugLog('Periodic check #' + attempts + ' for form');
        if (attachToForm() || attempts > 8) {
            clearInterval(intervalId);
            if (attempts > 8) {
                debugLog('Gave up looking for form after 8 attempts');
            }
        }
    }, 1000);
}

function attachFormListeners(guestForm) {
    debugLog('Attaching listeners to form');

    // Check immediately for filled fields
    attemptIdentify('form found');

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
                                   input.id === 'email' ||
                                   input.getAttribute('data-test-id') === 'checkout-field-email' ||
                                   input.getAttribute('autocomplete') === 'email';

                // Check if this is a phone field
                const isPhoneField = input.type === 'tel' ||
                                   input.name === 'phone' ||
                                   input.name === 'phoneNumber' ||
                                   input.id === 'phone' ||
                                   input.getAttribute('data-test-id') === 'checkout-field-phone' ||
                                   input.getAttribute('autocomplete') === 'tel';

                // Only identify/re-identify on email or phone blur
                if (isEmailField) {
                    debugLog('Email field detected, attempting re-identification');
                    setTimeout(function() { attemptIdentify('email blur', true); }, 500);
                } else if (isPhoneField) {
                    debugLog('Phone field detected, attempting re-identification');
                    setTimeout(function() { attemptIdentify('phone blur', true); }, 500);
                } else {
                    debugLog('Ignoring blur on non-email/phone field:', fieldName);
                }
            });

            // Also add change listener for email/phone fields only
            input.addEventListener('change', function() {
                const fieldName = input.name || input.type;

                const isEmailField = input.type === 'email' ||
                                   input.name === 'email' ||
                                   input.id === 'email' ||
                                   input.getAttribute('data-test-id') === 'checkout-field-email' ||
                                   input.getAttribute('autocomplete') === 'email';

                const isPhoneField = input.type === 'tel' ||
                                   input.name === 'phone' ||
                                   input.name === 'phoneNumber' ||
                                   input.id === 'phone' ||
                                   input.getAttribute('data-test-id') === 'checkout-field-phone' ||
                                   input.getAttribute('autocomplete') === 'tel';

                if (isEmailField || isPhoneField) {
                    debugLog('Form field changed:', fieldName);
                    setTimeout(function() { attemptIdentify('field change: ' + fieldName, true); }, 500);
                }
            });
        })(allInputs[i]);
    }

    debugLog('Blur and change listeners attached to all form fields');

    // Also check on form submission as final catch
    guestForm.addEventListener('submit', function(e) {
        debugLog('Form submit detected - final identify attempt');
        attemptIdentify('form submit');
    });
    debugLog('Form submit listener attached');

    // Set up periodic checking as backup (reduced frequency)
    let checks = 0;
    const checkInterval = setInterval(function() {
        checks++;
        attemptIdentify('periodic check #' + checks);
        if (checks >= 5) {
            clearInterval(checkInterval);
            debugLog('Stopped periodic checks');
        }
    }, 3000);
}
