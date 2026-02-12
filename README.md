# Klaviyo Hotel Booking Tracking

**Track hotel bookings and send event data to Klaviyo for email marketing and automation.**

This Google Tag Manager template enables seamless tracking of hotel booking events from popular Property Management Systems (PMS) and Booking Engines, sending structured data directly to Klaviyo.

## ✨ Features

- 🏨 **Multi-Platform Support**: Cloudbeds, Mews, and Guesty integrations
- 📊 **Automatic Event Tracking**: Viewed Listing, Started Checkout, and more
- 👤 **Customer Identification**: Automatically identifies guests with email/phone
- 🎯 **Rich Event Data**: Captures dates, pricing, guest count, property details
- 🔧 **Easy Setup**: Simple GTM installation with no coding required

## 📋 Supported Platforms

### Cloudbeds
Tracks events from Cloudbeds booking engine via GTM dataLayer events.

**📖 [View Cloudbeds Setup Guide](https://help.klaviyo.com/hc/en-us/articles/39406849361691)**

### Mews
Tracks events from Mews Distributor (booking engine) via GTM dataLayer events.

**📖 [View Mews Setup Guide](https://help.klaviyo.com/hc/en-us/articles/38311148860955)**

### Guesty
Tracks events directly from Guesty booking via GTM and direct DOM elements.

**📖 [View Guesty Setup Guide](https://help.klaviyo.com/hc/en-us/articles/37673288455323)**

## 🎯 Events Tracked

| Event | Description | Trigger |
|-------|-------------|---------|
| **Viewed Listing** | Guest views property details | Property/room page view |
| **Started Checkout** | Guest begins checkout process | Checkout initiated |

Additionally, we will identify a guest on the checkout if they are anonymous after they fill in their email or phone number.

### Event Properties Captured:
- Property name, ID, location
- Room/listing details
- Check-in/check-out dates
- Number of guests, nights, rooms
- Pricing information
- Guest contact information (email, phone, name)

## 🚀 Installation

### Prerequisites
1. Active Klaviyo account
2. Google Tag Manager installed on your website
3. Supported booking engine (Cloudbeds, Mews, or Guesty)

### Setup Instructions

#### Step 1: Install Klaviyo Hotels Tracking Template

1. In Google Tag Manager, go to the Templates section in the sidebar
2. Under Tag Templates, click "Search Gallery"
3. Look for "Klaviyo Hotels Tracking"
4. Install the template

#### Step 2: Create a New Tag

1. Go to **Tags** → **New**
2. Click **Tag Configuration**
3. Select **Klaviyo Hotels Tracking** from your templates
4. Configure the following:

   **Required Fields:**
   - **Klaviyo Public API Key**: Your Klaviyo account public key (6-character code)
   - **Integration Name**: Select your booking platform (Cloudbeds, Mews, or Guesty)

5. **Triggering**: Set to fire on **All Pages** or specific pages where your booking engine loads

#### Step 3: Publish

1. Click **Save**
2. Submit your GTM container
3. Publish changes

#### Step 4: Test

1. Use **GTM Preview Mode** to test
2. Complete a booking flow on your website
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
- Guests who viewed properties but didn't book
- Guests who started checkout but didn't complete
- Guests who booked specific property types

### Build Flows
- Abandoned checkout recovery emails
- Post-booking confirmation and upsells
- Pre-arrival information and reminders
- Post-stay review requests

### Personalize Emails
Use event properties in emails:
- Property name and details
- Booking dates and guest count
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

**Version**: 1.0.0
**Last Updated**: February 2026
**Maintained by**: Klaviyo
