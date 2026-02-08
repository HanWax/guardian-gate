# WhatsApp Cloud API Setup Guide

This guide walks you through setting up Meta's WhatsApp Cloud API for GuardianGate's messaging features.

## Prerequisites

- A Meta Business account
- A verified phone number for WhatsApp Business
- Admin access to Meta Business Manager

## Step-by-Step Setup

### 1. Create a Meta Business App

1. Go to [Meta for Developers](https://developers.facebook.com/)
2. Click **My Apps** → **Create App**
3. Select **Business** as the app type
4. Fill in app details:
   - **App Name**: GuardianGate (or your preferred name)
   - **App Contact Email**: Your business email
   - **Business Portfolio**: Select or create a business portfolio
5. Click **Create App**

### 2. Add WhatsApp Product

1. In your app dashboard, click **Add Product**
2. Find **WhatsApp** and click **Set Up**
3. Accept WhatsApp Business Platform terms
4. You'll be redirected to the WhatsApp Product page

### 3. Configure WhatsApp Business Phone Number

1. In the WhatsApp Product page, go to **API Setup**
2. Under **From**, you'll see a test phone number (or add your own):
   - **Test Number**: Meta provides a temporary number for testing
   - **Production Number**: Click **Add Phone Number** to verify and add your own business number
3. Copy the **Phone Number ID** (this is your `WHATSAPP_PHONE_NUMBER_ID`)
   - ⚠️ This is NOT the actual phone number - it's a unique identifier
   - Example format: `123456789012345`

### 4. Get API Access Token

1. In the **API Setup** section, find **Temporary Access Token**
2. Click **Generate Token** or **Copy**
3. This token is valid for 24 hours (use for testing)
4. Save this as `WHATSAPP_API_TOKEN` in your `.env` file

#### Generate Permanent Access Token (Production)

For production use, create a permanent token:

1. In your app dashboard, go to **Settings** → **Basic**
2. Copy your **App ID** and **App Secret**
3. Generate a system user token:
   - Go to [Meta Business Manager](https://business.facebook.com/)
   - Navigate to **Business Settings** → **Users** → **System Users**
   - Click **Add** and create a system user
   - Click **Generate New Token**
   - Select your app and enable required permissions:
     - `whatsapp_business_messaging`
     - `whatsapp_business_management`
   - Click **Generate Token** and save it securely
4. This permanent token should be used in production

### 5. Create Message Templates

Message templates must be approved by Meta before use:

1. In WhatsApp Product page, go to **Message Templates**
2. Click **Create Template**
3. Fill in template details:
   - **Name**: Use lowercase with underscores (e.g., `morning_checkin`)
   - **Category**: Choose appropriate category (e.g., `UTILITY`)
   - **Language**: Select Hebrew (`he`)
   - **Content**: Write your message (supports variables like `{{1}}`)
4. Submit for approval
5. **Approval time**: Usually 15 minutes to 24 hours

#### Example Templates for GuardianGate

**Morning Check-in Reminder:**
```
שלום {{1}},

תזכורת לדווח על הגעת {{2}} לגן בוקר טוב!

🏫 GuardianGate
```

**Parent Confirmation Request:**
```
{{1}} נרשם/ה כנעדר/ת היום בגן.

אנא אשר/י:
1️⃣ ילד/ה בבית
2️⃣ טעות ברישום

שלך, צוות הגן 🌟
```

### 6. Set Up Webhook (for receiving messages)

1. In WhatsApp Product page, go to **Configuration**
2. Under **Webhook**, click **Edit**
3. Enter webhook details:
   - **Callback URL**: `https://your-domain.com/api/whatsapp/webhook`
   - **Verify Token**: Create a random string (min 16 chars)
   - Save this as `WHATSAPP_VERIFY_TOKEN` in `.env`
4. Click **Verify and Save**
5. Subscribe to webhook fields:
   - `messages` (required for receiving messages)
   - `message_status` (optional, for delivery status)

### 7. Configure Environment Variables

Copy `.env.example` to `.env` and fill in:

```env
WHATSAPP_API_TOKEN=your-actual-token-from-step-4
WHATSAPP_PHONE_NUMBER_ID=your-phone-id-from-step-3
WHATSAPP_VERIFY_TOKEN=your-random-string-from-step-6
```

### 8. Test Your Setup

Test sending a message using the WhatsApp API client:

```typescript
import { sendTextMessage } from '~/lib/server/whatsapp';

// Send test message to your own number
await sendTextMessage('972501234567', 'שלום! זהו הודעת בדיקה.');
```

Check that:
- ✅ Message is received on WhatsApp
- ✅ Webhook verification succeeds (check server logs)
- ✅ Incoming messages trigger webhook endpoint

## Production Checklist

Before going live:

- [ ] Replace temporary access token with permanent system user token
- [ ] Verify business phone number (not using Meta's test number)
- [ ] All message templates are approved by Meta
- [ ] Webhook is configured with production domain (HTTPS required)
- [ ] Webhook signature verification is enabled
- [ ] Rate limits understood and monitored
- [ ] Message template naming follows your conventions
- [ ] Test end-to-end flow with real phone numbers

## Common Issues

### Message template rejected
- Ensure template follows Meta's [messaging policy](https://developers.facebook.com/docs/whatsapp/message-templates/guidelines)
- Avoid promotional content in utility templates
- Use clear, specific language

### Webhook verification fails
- Check that `WHATSAPP_VERIFY_TOKEN` matches exactly
- Ensure webhook endpoint is publicly accessible (HTTPS)
- Verify no firewall blocking Meta's servers

### "Invalid phone number" error
- Phone numbers must be in international format (e.g., `972501234567`)
- No `+` or spaces
- Number must be registered on WhatsApp

### Token expired
- Temporary tokens expire after 24 hours
- Generate permanent system user token for production

## Rate Limits

WhatsApp Cloud API has default rate limits:

- **Business-initiated messages**: 1,000 per day (can request increase)
- **User-initiated messages**: Unlimited (responses within 24-hour window)
- **API requests**: 80 requests per second per phone number

Monitor usage in Meta Business Manager → WhatsApp → Insights.

## Additional Resources

- [WhatsApp Cloud API Documentation](https://developers.facebook.com/docs/whatsapp/cloud-api)
- [Message Templates Guidelines](https://developers.facebook.com/docs/whatsapp/message-templates/guidelines)
- [Webhook Setup Guide](https://developers.facebook.com/docs/graph-api/webhooks)
- [Rate Limits Documentation](https://developers.facebook.com/docs/graph-api/overview/rate-limiting)

## Support

For Meta-specific issues:
- [WhatsApp Business API Support](https://developers.facebook.com/support/)
- [Meta Business Help Center](https://www.facebook.com/business/help)

For GuardianGate implementation questions, consult the team or check `src/lib/server/whatsapp.ts` for code examples.
