# Klaviyo Hotel Booking Tracking

**Track hotel bookings and send event data to Klaviyo for email marketing and automation.**

This Google Tag Manager template enables seamless tracking of hotel booking events from popular Property Management Systems (PMS) and Booking Engines, sending structured data directly to Klaviyo.

## ✨ Features

- 🏨 **Multi-Platform Support**: Cloudbeds, Mews, and Guesty integrations
- 📊 **Automatic Event Tracking**: Viewed Listing, Started Checkout, and more
- 👤 **Customer Identification**: Automatically identifies guests with email/phone
- 🎯 **Rich Event Data**: Captures dates, pricing, guest count, property details
- 🔧 **Easy Setup**: Simple GTM installation with no coding required
- 🐛 **Debug Mode**: Built-in logging for troubleshooting

## 📋 Supported Platforms

### Cloudbeds
Tracks events from Cloudbeds booking engine via GTM dataLayer events.

### Mews
Tracks events from Mews Distributor (booking engine) via GTM dataLayer events.

### Guesty
Tracks events directly from Guesty booking flow via network interception.

## 🎯 Events Tracked

| Event | Description | Trigger |
|-------|-------------|---------|
| **Viewed Listing** | Guest views property details | Property/room page view |
| **Started Checkout** | Guest begins checkout process | Checkout initiated |
| **Identified Guest** | Guest enters contact info | Email/phone entered |

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

#### Step 1: Import Template to GTM

1. Download the template file: [`template_hotel.tpl`](template_hotel.tpl)
2. In Google Tag Manager, go to **Templates** → **Tag Templates**
3. Click **New** → **Import**
4. Select the downloaded `.tpl` file
5. Click **Save**

#### Step 2: Create a New Tag

1. Go to **Tags** → **New**
2. Click **Tag Configuration**
3. Select **Klaviyo Hotel Tracking** from your templates
4. Configure the following:

   **Required Fields:**
   - **Klaviyo Public API Key**: Your Klaviyo account public key (6-character code)
   - **Integration Type**: Select your booking platform (Cloudbeds, Mews, or Guesty)

   **Optional Fields:**
   - **Debug Mode**: Enable to see console logs (recommended for initial setup)

5. **Triggering**: Set to fire on **All Pages** or specific pages where your booking engine loads

#### Step 3: Publish

1. Click **Save**
2. Submit your GTM container
3. Publish changes

#### Step 4: Test

1. Enable **Debug Mode** in the tag configuration
2. Use **GTM Preview Mode** to test
3. Complete a booking flow on your website
4. Check browser console for `[Klaviyo Hotel Tracking]` logs
5. Verify events appear in your Klaviyo account

## 🔧 Configuration

### Finding Your Klaviyo Public API Key

1. Log in to Klaviyo
2. Go to **Settings** → **Account** → **Settings** → **API Keys**
3. Copy your **Public API Key** (6-character code, e.g., `ABC123`)
4. Paste into the GTM tag configuration

### Debug Mode

Enable debug mode during setup to see detailed logging:
- Event tracking confirmations
- User identification status
- Data payload details
- Error messages

**Important:** Disable debug mode in production to avoid console clutter.

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

### Personalize Campaigns
Use event properties in emails:
- Property name and details
- Booking dates and guest count
- Pricing information
- Custom recommendations

## 🏗️ Technical Details

### Integration Methods

**Cloudbeds & Mews**: Listen to GTM dataLayer events pushed by the booking engine

**Guesty**: Intercepts network requests to capture booking data directly from API calls

### Browser Compatibility
- All modern browsers (Chrome, Firefox, Safari, Edge)
- Mobile browsers supported

### Performance
- Minimal impact on page load
- Asynchronous event tracking
- No blocking operations

## 🐛 Troubleshooting

### Events Not Appearing in Klaviyo

1. **Enable Debug Mode** in GTM tag configuration
2. Check browser console for `[Klaviyo Hotel Tracking]` logs
3. Verify Klaviyo Public API Key is correct
4. Ensure GTM tag is firing (use Preview mode)
5. Check that your booking engine is supported

### Guest Not Being Identified

- Guest identification happens when email/phone is entered
- Check console logs for "User identified" messages
- Verify form fields match expected selectors

### Need Help?

- Check `src/DEVELOPMENT.md` for technical documentation
- Review browser console logs with Debug Mode enabled
- Contact your implementation team

## 📚 Resources

- [Klaviyo Documentation](https://help.klaviyo.com/)
- [Google Tag Manager Help](https://support.google.com/tagmanager)
- [Technical Development Guide](src/DEVELOPMENT.md)

## 📝 License

Copyright © Klaviyo. All rights reserved.

## 🤝 Support

For technical support or questions about implementation, please contact your Klaviyo account team.

---

**Version**: 1.0.0
**Last Updated**: February 2026
**Maintained by**: Klaviyo
