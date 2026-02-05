// Shared debug utilities

// Creates a debug logger function with a specific prefix
export function createDebugLogger(prefix, enabled = true) {
    return function debugLog(...args) {
        if (enabled) {
            console.log(prefix, ...args);
        }
    };
}
