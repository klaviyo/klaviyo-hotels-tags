// General utility functions

import { DEBUG } from './constants.js';

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

export function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

export function isValidPhone(phone) {
    const phoneRegex = /^\+?[0-9]{10,15}$/;
    return phoneRegex.test(phone);
}

export function debugLog(...args) {
    if (DEBUG) {
        console.log(...args);
    }
}
