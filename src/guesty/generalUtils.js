// General utility functions

import { DEBUG } from './constants.js';
import { isValidEmail, isValidPhone } from '../shared/validationUtils.js';

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

export function debugLog(...args) {
    if (DEBUG) {
        console.log(...args);
    }
}
