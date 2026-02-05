// Shared validation utilities

// Email validation with improved regex
export function isValidEmail(email) {
    if (!email || email.length < 5) return false;
    const emailRegex = /^[a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
}

// Phone validation
export function isValidPhone(phone) {
    const phoneRegex = /^\+?[0-9]{10,15}$/;
    return phoneRegex.test(phone);
}
