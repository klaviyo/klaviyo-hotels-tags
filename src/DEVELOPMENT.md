# Klaviyo Hotel Tracking

Tracking scripts for Klaviyo hotel bookings with modular utilities. Supports Cloudbeds, Mews, and Guesty booking engines.

## Project Structure

```
├── src/
│   ├── shared/                       # Shared utilities across all integrations
│   │   ├── validationUtils.js        # Email and phone validation
│   │   ├── debugUtils.js             # Debug logging with account-based control
│   │   ├── debugConfig.js            # Debug configuration (account IDs)
│   │   └── README.md                 # Shared utilities documentation
│   ├── cloudbeds/
│   │   ├── constants.js              # Configuration constants (debug flag, event mapping)
│   │   ├── generalUtils.js           # General utility functions (logging, validation)
│   │   ├── gtmUtils.js               # GTM/dataLayer event handling
│   │   ├── klaviyoUtils.js           # Klaviyo payload builders and tracking
│   │   └── klaviyo_hotel_tracking.js # Main Cloudbeds tracking script
│   ├── mews/
│   │   ├── constants.js              # Configuration constants (debug flag, event mapping)
│   │   ├── generalUtils.js           # General utility functions (logging, validation)
│   │   ├── gtmUtils.js               # GTM/dataLayer event handling
│   │   ├── klaviyoUtils.js           # Klaviyo payload builders and tracking
│   │   └── klaviyo_hotel_tracking.js # Main Mews tracking script
│   └── guesty/
│       ├── constants.js              # Configuration constants (debug flag)
│       ├── generalUtils.js           # General utility functions (logging, validation, URL parsing)
│       ├── klaviyoUtils.js           # Klaviyo event tracking and error monitoring
│       └── klaviyo_hotel_tracking.js # Main Guesty tracking script (network interception)
├── .github/
│   ├── workflows/
│   │   └── deploy.yml                # GitHub Actions: auto-deploy to GitHub Pages
│   ├── CODEOWNERS                    # Auto-assigns reviewers on PRs
│   └── pull_request_template.md      # PR template with checklist
├── public/                            # Build output directory
│   ├── klaviyo_hotel_tracking_cloudbeds.js  # Built Cloudbeds bundle
│   ├── klaviyo_hotel_tracking_mews.js       # Built Mews bundle
│   └── klaviyo_hotel_tracking_guesty.js     # Built Guesty bundle
├── template_hotel.tpl                   # GTM Tag Template
├── package.json                         # Dependencies and scripts
├── .gitignore                           # Git ignore rules
└── README.md                            # Public-facing documentation
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
3. **Error Monitoring** - Sends alerts to monitoring account when critical errors occur
   - Only monitors `klaviyo.track()` failures
   - Uses direct Klaviyo API calls (no second script instance)
   - Includes error metadata: Failed Event, Error Cause, Customer Account ID
   - Monitoring account credentials are configured via `.env` file

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Create a `.env` file in the project root with your API keys:

```bash
# Klaviyo Monitoring Account Configuration

# Monitoring account for error tracking (Guesty integration)
MONITORING_ACCOUNT=your_monitoring_account_id
MONITORING_PROFILE_ID=guesty-onsite-monitoring

# Debug Account IDs (JSON array of Klaviyo account IDs to enable debugging for)
# Example: DEBUG_ACCOUNT_IDS=["ABC123","XYZ789"]
DEBUG_ACCOUNT_IDS=[]
```

**Important:** The `.env` file is excluded from git (see `.gitignore`). Never commit API keys to the repository.

These environment variables are injected at build time and replace the placeholders in the source code.

## Development Workflow

### Build Scripts

- `npm run build` - Build all scripts (Cloudbeds, Mews, Guesty)
- `npm run build:cloudbeds` - Build only Cloudbeds script
- `npm run build:mews` - Build only Mews script
- `npm run build:guesty` - Build only Guesty script

### Watch Scripts (Build Only)

- `npm run watch` - Auto-rebuild Cloudbeds on file changes
- `npm run watch:mews` - Auto-rebuild Mews on file changes
- `npm run watch:guesty` - Auto-rebuild Guesty on file changes

### Development Scripts (Build + Auto-Deploy to Surge)

**For active development with automatic deployment to Surge:**

- `npm run dev` - Watch all files and auto-deploy all integrations to Surge
- `npm run dev:cloudbeds` - Watch Cloudbeds files and auto-deploy to Surge
- `npm run dev:mews` - Watch Mews files and auto-deploy to Surge
- `npm run dev:guesty` - Watch Guesty files and auto-deploy to Surge

These scripts will:
1. Watch for file changes in `src/` directories
2. Automatically rebuild on save
3. Deploy to Surge for testing

### Manual Deployment to Surge

- `npm run deploy` - Build and deploy all integrations to Surge
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

## Deployment

### Development (Surge)

For testing and development, scripts are deployed to Surge:

**Cloudbeds:** https://klaviyo-hotel-cloudbeds.surge.sh/klaviyo_hotel_tracking_cloudbeds.js
**Mews:** https://klaviyo-hotel-mews.surge.sh/klaviyo_hotel_tracking_mews.js
**Guesty:** https://klaviyo-hotel-guesty.surge.sh/klaviyo_hotel_tracking_guesty.js

Deploy manually:
```bash
npm run deploy:cloudbeds
npm run deploy:mews
npm run deploy:guesty
```

Or use auto-deploy during development:
```bash
npm run dev:cloudbeds  # Auto-deploys to Surge on file changes
```

### Production (GitHub Pages)

Production scripts are automatically deployed to GitHub Pages when you push to the `master` branch.

**Production URLs:**
- `https://klaviyo.github.io/tagmanager/klaviyo_hotel_tracking_cloudbeds.js`
- `https://klaviyo.github.io/tagmanager/klaviyo_hotel_tracking_mews.js`
- `https://klaviyo.github.io/tagmanager/klaviyo_hotel_tracking_guesty.js`

**Deployment Process:**
1. Make changes and commit to a branch
2. Push to GitHub and create a PR
3. Merge to `master`
4. GitHub Actions automatically builds and deploys to GitHub Pages

**Configuring Production Environment Variables:**

To set API keys for production deployment, configure GitHub Secrets:

1. Go to your repository on GitHub
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add the following secrets:
   - `MONITORING_ACCOUNT` - Your monitoring account ID
   - `MONITORING_PROFILE_ID` - Profile ID for monitoring (e.g., `guesty-onsite-monitoring`)
   - `DEBUG_ACCOUNT_IDS` - JSON array of account IDs to enable debugging (e.g., `["ABC123","XYZ789"]`)

These secrets are automatically injected into the `.env` file during the GitHub Actions build process.

**Updating Production Environment Variables:**

To troubleshoot issues in production, you can update the GitHub Secrets at any time:
1. Update the secret value in GitHub Settings
2. Re-run the workflow or push a new commit to `master`
3. The new environment variables will be deployed

## Usage

Add the script URL to your GTM Tag Template. See .tpl file for more info.

**Note:** While Cloudbeds and Mews listen to GTM dataLayer events, Guesty uses network interception (fetch/XHR) to track events directly from API calls.

## Debug Logging

Debug logging can be controlled per-account for production troubleshooting.

### Configuration

Edit `src/shared/debugConfig.js`:

```javascript
// Global debug flag (set to false for production)
export const DEBUG_ENABLED_GLOBALLY = false;

// Enable debugging for specific Klaviyo accounts
export const DEBUG_ACCOUNT_IDS = [
    'ABC123',  // Customer having issues
    'XYZ789',  // Another customer to debug
];
```

### How It Works

1. Debug logs are disabled by default in production (`DEBUG_ENABLED_GLOBALLY = false`)
2. Add customer Klaviyo account IDs to `DEBUG_ACCOUNT_IDS` array
3. Redeploy - debugging will auto-enable only for those accounts
4. The script checks `klaviyo.account()` on each log call

See `src/shared/README.md` for more details.

## Architecture

The codebase uses **esbuild** to bundle modular ES6 code into a single IIFE (Immediately Invoked Function Expression) that can be loaded via a script tag.

**Benefits:**
- Organized, maintainable code with shared utilities
- Single output file for easy deployment
- Fast builds with esbuild
- Account-based debug logging for production troubleshooting
- Automatic deployment with GitHub Actions

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
