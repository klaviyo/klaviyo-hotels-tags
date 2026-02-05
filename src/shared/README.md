# Shared Utilities

This directory contains shared utilities used across all hotel integrations (Cloudbeds, Mews, and Guesty).

## Files

### `validationUtils.js`
Contains validation functions for email and phone numbers.

- **`isValidEmail(email)`** - Validates email format
- **`isValidPhone(phone)`** - Validates phone number format (10-15 digits, optional + prefix)

### `debugUtils.js`
Contains debug logging utilities with account-based control.

- **`createDebugLogger(prefix, enabled)`** - Creates a debug logger with a specific prefix

### `debugConfig.js`
Configuration for debug logging control.

## Account-Based Debug Logging

Debug logging can be controlled in two ways:

### 1. Global Debug Flag
Set `DEBUG_ENABLED_GLOBALLY = true` in `debugConfig.js` to enable debugging for all accounts (useful for local development).

### 2. Account-Specific Debug List
Add Klaviyo company IDs to the `DEBUG_ACCOUNT_IDS` array in `debugConfig.js` to enable debugging for specific customer accounts.

### Example Usage

```javascript
// debugConfig.js
export const DEBUG_ENABLED_GLOBALLY = false; // Production setting
export const DEBUG_ACCOUNT_IDS = [
    'ABC123',  // Enable for customer ABC123
    'XYZ789',  // Enable for customer XYZ789
];
```

### How It Works

1. When `debugLog()` is called, it checks if debugging is enabled
2. First checks if `DEBUG_ENABLED_GLOBALLY` is true
3. If not, gets the current Klaviyo account ID via `klaviyo.account()`
4. Checks if the account ID is in the `DEBUG_ACCOUNT_IDS` array
5. Only logs if debugging is enabled

### Benefits

- **Production-ready**: Debugging disabled by default in production
- **Selective troubleshooting**: Enable debugging for specific customer accounts
- **No code changes**: Add/remove account IDs without rebuilding
- **Safe**: Fails silently if Klaviyo is not initialized

## Adding New Shared Utilities

When adding new shared utilities:

1. Create the utility file in this directory
2. Export functions that are identical across all integrations
3. Update integration files to import from shared utilities
4. Document the utility in this README
