# Klaviyo Hotel Tracking

GTM tracking script for Klaviyo hotel bookings with modular utilities.

## Project Structure

```
├── src/
│   ├── constants.js                  # Event mappings and configuration constants
│   ├── generalUtils.js               # General utility functions (logging, validation)
│   ├── gtmUtils.js                   # GTM/dataLayer event handling
│   ├── klaviyoUtils.js               # Klaviyo payload builders
│   └── klaviyo_hotel_tracking.js     # Main tracking script (orchestrates everything)
├── klaviyo_hotel_tracking.js         # Built bundle (16.8KB with debug logging)
└── package.json
```

## Events Tracked

This script tracks the following Klaviyo events:

1. **Viewed Listing** - Triggered by:
   - `cb_booking_engine_load` (Cloudbeds booking engine load)
   - `view_item` (GA4 view item event)
   - `add_to_cart` (GA4 add to cart - tracked as listing view since Cloudbeds has no dedicated listing page)

2. **Started Checkout** - Triggered by:
   - `begin_checkout` (GA4 checkout event)
   - Also attempts to identify user from guest form fields (email/phone)

## Setup

Install dependencies:
```bash
npm install
```

## Development Workflow

### Build Scripts

- `npm run build` - Build bundled script (with console logging)
- `npm run deploy` - Build and deploy to Surge
- `npm run watch` - Auto-rebuild on file changes

### Adding Utilities

1. Add your utility function to `src/utils.js`:
```javascript
export function myUtility() {
    // Your code here
}
```

2. Import it in your tracking file:
```javascript
import { myUtility } from './utils.js';
```

3. Build and deploy:
```bash
npm run deploy
```

### Disabling Debug Logging

To disable debug logging, set `DEBUG = false` in `src/utils.js` and rebuild.

## Surge Deployment

Your tracking script is deployed to:
**https://klaviyo-hotel-debug-1769738861.surge.sh/klaviyo_hotel_tracking.js**

The CNAME file is configured, so you can deploy with:
```bash
surge
```

Or use the npm script:
```bash
npm run deploy
```

## Using in GTM

Add the script URL to your GTM Tag Template. See .tpl file for more info.

## Architecture

The codebase uses **esbuild** to bundle modular ES6 code into a single IIFE (Immediately Invoked Function Expression) that can be loaded via a script tag in GTM.

**Benefits:**
- Organized, maintainable code with shared utilities
- Single output file for easy GTM deployment
- Fast builds with esbuild
- Debug logging enabled by default for easier troubleshooting
