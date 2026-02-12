// Shared validation utilities

// Email validation with improved regex
export function isValidEmail(email) {
    if (!email || email.length < 5) return false;
    const emailRegex = /^[a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
}

// Phone validation - strips common formatting characters before validation
export function isValidPhone(phone) {
    if (!phone) return false;

    // Strip common formatting characters (spaces, parentheses, hyphens, dots)
    // Keep + if it's at the beginning
    const cleanPhone = phone.replace(/[\s\(\)\-\.]/g, '');

    // Must have 10-15 digits, optionally starting with +
    const phoneRegex = /^\+?[0-9]{10,15}$/;
    return phoneRegex.test(cleanPhone);
}
