# Klaviyo Hotel Tracking

Tracking scripts for Klaviyo hotel bookings with modular utilities. Supports Cloudbeds, Mews, and Guesty booking engines.

## Project Structure

```
├── src/
│   ├── cloudbeds/
│   │   ├── generalUtils.js           # General utility functions (logging, validation)
│   │   ├── gtmUtils.js               # GTM/dataLayer event handling
│   │   ├── klaviyoUtils.js           # Klaviyo payload builders
│   │   └── klaviyo_hotel_tracking.js # Main Cloudbeds tracking script
│   ├── mews/
│   │   ├── generalUtils.js           # General utility functions (logging, validation)
│   │   ├── klaviyoUtils.js           # Klaviyo payload builders
│   │   └── klaviyo_hotel_tracking.js # Main Mews tracking script
│   └── guesty/
│       ├── constants.js              # Configuration constants
│       ├── generalUtils.js           # General utility functions (logging, validation, URL parsing)
│       ├── klaviyoUtils.js           # Klaviyo event tracking and error monitoring
│       └── klaviyo_hotel_tracking.js # Main Guesty tracking script (network interception)
├── klaviyo_hotel_tracking_cloudbeds.js  # Built Cloudbeds bundle
├── klaviyo_hotel_tracking_mews.js       # Built Mews bundle
├── klaviyo_hotel_tracking_guesty.js     # Built Guesty bundle
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

### Guesty
1. **Viewed Listing** - Triggered when API call to `/api/pm-websites-backend/listings/` completes
   - Stores listing data for checkout reuse (avoids CORS issues)
   - Tracks property details, amenities, pricing, location
2. **Started Checkout** - Triggered when API call to `/api/pm-websites-backend/reservations/quotes` completes
   - Uses stored listing data from Viewed Listing event
   - Extracts checkout details (dates, guest count) from URL parameters
   - Identifies user from email/phone form fields on blur
3. **Error Monitoring** - Sends alerts to monitoring account (UcwNrH) when critical errors occur
   - Only monitors `klaviyo.track()` failures
   - Uses direct Klaviyo API calls (no second script instance)
   - Includes error metadata: Failed Event, Error Cause, Customer Account ID

## Setup

Install dependencies:
```bash
npm install
```

## Development Workflow

### Build Scripts

- `npm run build` - Build all scripts (Cloudbeds, Mews, Guesty)
- `npm run build:cloudbeds` - Build only Cloudbeds script
- `npm run build:mews` - Build only Mews script
- `npm run build:guesty` - Build only Guesty script
- `npm run watch` - Auto-rebuild Cloudbeds on file changes
- `npm run watch:mews` - Auto-rebuild Mews on file changes
- `npm run watch:guesty` - Auto-rebuild Guesty on file changes

### Deployment Scripts

- `npm run deploy:cloudbeds` - Build and deploy Cloudbeds to Surge
- `npm run deploy:mews` - Build and deploy Mews to Surge
- `npm run deploy:guesty` - Build and deploy Guesty to Surge

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

**Guesty:**
https://klaviyo-hotel-guesty.surge.sh/klaviyo_hotel_tracking_guesty.js

Deploy with:
```bash
npm run deploy:cloudbeds
npm run deploy:mews
npm run deploy:guesty
```

## Usage

### Cloudbeds & Mews (GTM-based)
Add the script URL to your GTM Tag Template. See .tpl file for more info.

### Guesty (Direct Implementation)
Guesty uses network interception (fetch/XHR) instead of GTM. Add the script directly to your site:
```html
<script src="https://klaviyo-hotel-guesty.surge.sh/klaviyo_hotel_tracking_guesty.js"></script>
```

## Architecture

The codebase uses **esbuild** to bundle modular ES6 code into a single IIFE (Immediately Invoked Function Expression) that can be loaded via a script tag.

**Benefits:**
- Organized, maintainable code with shared utilities
- Single output file for easy deployment
- Fast builds with esbuild
- Debug logging enabled by default for easier troubleshooting

### Implementation Approaches

**Cloudbeds & Mews (GTM-based):**
- Listen to GTM dataLayer events
- Parse ecommerce data from GTM events
- Track events when GTM pushes to dataLayer

**Guesty (Network Interception):**
- Intercept fetch() and XMLHttpRequest calls
- Parse API responses directly
- Store listing data to avoid CORS issues
- Extract checkout details from URL parameters
- Monitor critical errors with direct API calls
