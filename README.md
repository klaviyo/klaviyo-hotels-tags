# Klaviyo Hotel Tracking

GTM tracking scripts for Klaviyo hotel bookings with modular utilities. Supports both Cloudbeds and Mews booking engines.

## Project Structure

```
├── src/
│   ├── cloudbeds/
│   │   ├── generalUtils.js           # General utility functions (logging, validation)
│   │   ├── gtmUtils.js               # GTM/dataLayer event handling
│   │   ├── klaviyoUtils.js           # Klaviyo payload builders
│   │   └── klaviyo_hotel_tracking.js # Main Cloudbeds tracking script
│   └── mews/
│       ├── generalUtils.js           # General utility functions (logging, validation)
│       ├── klaviyoUtils.js           # Klaviyo payload builders
│       └── klaviyo_hotel_tracking.js # Main Mews tracking script
├── klaviyo_hotel_tracking_cloudbeds.js  # Built Cloudbeds bundle
├── klaviyo_hotel_tracking_mews.js       # Built Mews bundle
└── package.json
```

## Events Tracked

### Cloudbeds
1. **Viewed Listing** - Triggered by:
   - `cb_booking_engine_load` (Cloudbeds booking engine load)
   - `view_item` (GA4 view item event)
   - `add_to_cart` (GA4 add to cart - tracked as listing view since Cloudbeds has no dedicated listing page)

2. **Started Checkout** - Triggered by:
   - `begin_checkout` (GA4 checkout event)
   - Also attempts to identify user from guest form fields (email/phone)

### Mews
1. **Viewed Listing** - Triggered when user views available rooms
2. **Started Checkout** - Triggered when user begins the checkout process
3. **Placed Order** - Triggered when booking is completed

## Setup

Install dependencies:
```bash
npm install
```

## Development Workflow

### Build Scripts

- `npm run build` - Build both Cloudbeds and Mews scripts
- `npm run build:cloudbeds` - Build only Cloudbeds script
- `npm run build:mews` - Build only Mews script
- `npm run watch` - Auto-rebuild Cloudbeds on file changes
- `npm run watch:mews` - Auto-rebuild Mews on file changes

### Deployment Scripts

- `npm run deploy:cloudbeds` - Build and deploy Cloudbeds to Surge
- `npm run deploy:mews` - Build and deploy Mews to Surge

### Adding Utilities

1. Add your utility function to the appropriate utils file (`src/cloudbeds/generalUtils.js` or `src/mews/generalUtils.js`):
```javascript
export function myUtility() {
    // Your code here
}
```

2. Import it in your tracking file:
```javascript
import { myUtility } from './generalUtils.js';
```

3. Build and deploy:
```bash
npm run deploy:cloudbeds
# or
npm run deploy:mews
```

## Surge Deployment

Your tracking scripts are deployed to:

**Cloudbeds:**
https://klaviyo-hotel-cloudbeds.surge.sh/klaviyo_hotel_tracking_cloudbeds.js

**Mews:**
https://klaviyo-hotel-mews.surge.sh/klaviyo_hotel_tracking_mews.js

Deploy with:
```bash
npm run deploy:cloudbeds
npm run deploy:mews
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
