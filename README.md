# Klaviyo Hotels & Restaurants Tracking

**Track hotel bookings and restaurant orders, and send event data to Klaviyo for email marketing and automation.**

This Google Tag Manager template enables seamless tracking of behavioral events from popular hotel booking engines and restaurant ordering platforms, sending structured data directly to Klaviyo.

> **Note on the name:** this repository is named `klaviyo-hotels-tags` for historical reasons, but the template now supports **both hotels and restaurants**. The published tag is **"Klaviyo Hotels and Restaurants Tracking."**

## ✨ Features

- 🏨 **Hotels**: Cloudbeds, Mews, and Guesty booking engines
- 🍽️ **Restaurants**: Olo (Olo Serve) online ordering
- 📊 **Automatic Event Tracking**: Viewed Listing / Viewed Product, Added to Cart, Started Checkout, and more
- 👤 **Customer Identification**: Automatically identifies guests with email/phone
- 🎯 **Rich Event Data**: dates, pricing, guests, property details (hotels); items, modifiers, fulfillment type (restaurants)
- 🔧 **Easy Setup**: Simple GTM installation with no coding required

## 📋 Supported Platforms

### Cloudbeds (Hotels)
Tracks events from Cloudbeds booking engine via GTM dataLayer events.

**📖 [View Cloudbeds Setup Guide](https://help.klaviyo.com/hc/en-us/articles/39406849361691)**

### Mews (Hotels)
Tracks events from Mews Distributor (booking engine) via GTM dataLayer events.

**📖 [View Mews Setup Guide](https://help.klaviyo.com/hc/en-us/articles/38311148860955)**

### Guesty (Hotels)
Tracks events directly from Guesty booking via GTM and direct DOM elements.

**📖 [View Guesty Setup Guide](https://help.klaviyo.com/hc/en-us/articles/37673288455323)**

### Olo (Restaurants)
Tracks restaurant ordering events from Olo Serve via Olo's native on-site event bus (`window.Olo`).

## 🎯 Events Tracked

**Hotels (Cloudbeds, Mews, Guesty)**

| Event | Description | Trigger |
|-------|-------------|---------|
| **Viewed Listing** | Guest views property details | Property/room page view |
| **Started Checkout** | Guest begins checkout process | Checkout initiated |

**Restaurants (Olo)**

| Event | Description | Trigger |
|-------|-------------|---------|
| **Viewed Product** | Guest views/opens a menu item | Item detail / product click |
| **Added to Cart** | Guest adds an item to the cart | Add to cart |
| **Started Checkout** | Guest begins checkout | Checkout initiated |

Additionally, we identify a guest on the checkout if they are anonymous after they fill in their email or phone number.

### Event Properties Captured:
- **Hotels:** property name, ID, location; room/listing details; check-in/out dates; guests, nights, rooms; pricing
- **Restaurants:** product name, ID, brand; price; categories; modifiers; fulfillment type (Pickup/Delivery); cart items and value; image URL
- Guest contact information (email, phone, name)

## 🚀 Installation

### Prerequisites
1. Active Klaviyo account
2. Google Tag Manager installed on your website
3. A supported platform — hotels: Cloudbeds, Mews, or Guesty; restaurants: Olo

### Setup Instructions

#### Step 1: Install the Klaviyo Hotels and Restaurants Tracking Template

1. In Google Tag Manager, go to the Templates section in the sidebar
2. Under Tag Templates, click "Search Gallery"
3. Look for "Klaviyo Hotels and Restaurants Tracking"
4. Install the template

#### Step 2: Create a New Tag

1. Go to **Tags** → **New**
2. Click **Tag Configuration**
3. Select **Klaviyo Hotels and Restaurants Tracking** from your templates
4. Configure the following:

   **Required Fields:**
   - **Klaviyo Public API Key**: Your Klaviyo account public key (6-character code)
   - **Platform**: Select your platform — Cloudbeds, Mews, Guesty (hotels) or Olo (restaurants)

5. **Triggering**: Set to fire on **All Pages** or specific pages where your booking/ordering experience loads

#### Step 3: Publish

1. Click **Save**
2. Submit your GTM container
3. Publish changes

#### Step 4: Test

1. Use **GTM Preview Mode** to test
2. Complete a booking or ordering flow on your website
3. Verify events appear in your Klaviyo account

## 🔧 Configuration

### Finding Your Klaviyo Public API Key

1. Log in to Klaviyo
2. Go to **Settings** → **Account** → **Settings** → **API Keys**
3. Copy your **Public API Key** (6-character code, e.g., `ABC123`)
4. Paste into the GTM tag configuration

## 📊 Using Data in Klaviyo

Once events are flowing to Klaviyo, you can:

### Create Segments
- Guests who viewed properties/products but didn't book or order
- Guests who started checkout but didn't complete
- Guests who engaged with specific property types or menu items

### Build Flows
- Abandoned checkout / cart recovery emails
- Browse recovery for viewed properties and products
- Post-booking / post-order confirmation and upsells
- Pre-arrival information and reminders (hotels); reorder reminders (restaurants)

### Personalize Emails
Use event properties in emails:
- Property or product name and details
- Booking dates / cart contents
- Pricing information

### Browser Compatibility
- All modern browsers (Chrome, Firefox, Safari, Edge)
- Mobile browsers supported

### Performance
- Minimal impact on page load
- Asynchronous event tracking
- No blocking operations

### Need Help?

- Reach out to our support team at support@klaviyo.com
- Check out our help center [Klaviyo Documentation](https://help.klaviyo.com/)

## 📚 Resources

- [Klaviyo Documentation](https://help.klaviyo.com/)
- [Google Tag Manager Help](https://support.google.com/tagmanager)

## 📝 License

Copyright © Klaviyo. All rights reserved.

---

**Version**: 2.0.0
**Last Updated**: June 2026
**Maintained by**: Klaviyo
