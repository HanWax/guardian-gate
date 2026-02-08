# PRD: Meta Cloud API Setup for WhatsApp Integration

## Introduction

Configure Meta Cloud API credentials and webhook infrastructure to enable WhatsApp messaging for GuardianGate's safety flow. This is the gateway task for Phase 3 (WhatsApp Integration) that unblocks morning check-ins, parent confirmations, and the 9am safety loop.

## Goals

- Enable programmatic sending of WhatsApp template and text messages
- Receive incoming WhatsApp messages via webhook endpoint
- Provide documented, testable API client helper for future message features
- Complete setup in 2-4 hours with no database migrations

## Tasks

### T-001: Create WhatsApp API client helper ✅
**Description:** Build `src/lib/server/whatsapp.ts` with functions for sending template messages and text messages using Meta Cloud API.

**Acceptance Criteria:**
- [x] Create `sendTemplateMessage(to: string, templateName: string, languageCode: string, components?: any[])` function
- [x] Create `sendTextMessage(to: string, text: string)` function
- [x] Both functions use `WHATSAPP_API_TOKEN` and `WHATSAPP_PHONE_NUMBER_ID` from env
- [x] Include JSDoc comments documenting parameters and return types
- [x] Export helper functions for use in other server code
- [x] Quality checks pass (lint, typecheck)

### T-002: Add environment variables and documentation ✅
**Description:** Document required WhatsApp API environment variables in `.env.example` and add setup instructions.

**Acceptance Criteria:**
- [x] Add `WHATSAPP_API_TOKEN` to `.env.example` with comment explaining it's from Meta Business Manager
- [x] Add `WHATSAPP_PHONE_NUMBER_ID` to `.env.example` with comment explaining it's the WhatsApp Business Phone Number ID
- [x] Add `WHATSAPP_VERIFY_TOKEN` to `.env.example` with comment explaining it's a random string for webhook verification
- [x] Create `docs/whatsapp-setup.md` with step-by-step Meta Business account setup instructions
- [x] Document how to obtain API token and phone number ID from Meta Dashboard
- [x] Quality checks pass (lint)

### T-003: Create webhook verification endpoint ✅
**Description:** Implement GET endpoint that responds to Meta's webhook verification challenge with hub.verify_token.

**Acceptance Criteria:**
- [x] Create server function in `src/lib/server/whatsapp-webhook.ts` that handles GET requests
- [x] Verify `hub.verify_token` matches `WHATSAPP_VERIFY_TOKEN` from env
- [x] Return `hub.challenge` value when token matches
- [x] Return 403 error when token doesn't match
- [x] Add route in `src/lib/server/whatsapp-webhook-handler.ts` that calls the server function
- [x] Quality checks pass (lint, typecheck)

### T-004: Create webhook message receiver endpoint
**Description:** Implement POST endpoint that receives and logs incoming WhatsApp message payloads from Meta.

**Acceptance Criteria:**
- [ ] Create server function in `src/lib/server/whatsapp-webhook.ts` that handles POST requests
- [ ] Parse incoming message payload (extract sender, message text, timestamp)
- [ ] Log received messages to console with structured format
- [ ] Return 200 status to acknowledge receipt to Meta
- [ ] Handle webhook signature verification (x-hub-signature-256 header)
- [ ] Add POST handler to `src/routes/api/whatsapp/webhook.ts`
- [ ] Quality checks pass (lint, typecheck)

### T-005: Add unit tests for webhook logic
**Description:** Create test suite for webhook verification and message payload parsing.

**Acceptance Criteria:**
- [ ] Create `src/lib/server/whatsapp-webhook.test.ts` with Vitest
- [ ] Test webhook verification with correct token returns challenge
- [ ] Test webhook verification with incorrect token returns 403
- [ ] Test message payload parsing extracts sender, text, timestamp correctly
- [ ] Test signature verification logic with valid/invalid signatures
- [ ] All tests pass (`npm run test`)
- [ ] Quality checks pass (lint, typecheck)

## Functional Requirements

- FR-1: The WhatsApp client helper must send template messages to a phone number using Meta Cloud API
- FR-2: The WhatsApp client helper must send plain text messages to a phone number using Meta Cloud API
- FR-3: The webhook verification endpoint must respond to Meta's GET request with hub.challenge when hub.verify_token matches the configured WHATSAPP_VERIFY_TOKEN
- FR-4: The webhook verification endpoint must return 403 when hub.verify_token does not match
- FR-5: The webhook POST endpoint must receive incoming message payloads and log sender, message text, and timestamp
- FR-6: The webhook POST endpoint must verify the x-hub-signature-256 header to ensure requests come from Meta
- FR-7: The webhook POST endpoint must return 200 status to acknowledge receipt
- FR-8: Environment variables (WHATSAPP_API_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_VERIFY_TOKEN) must be documented in .env.example

## Non-Goals (Out of Scope)

- NO database storage of sent/received messages (future work)
- NO message retry logic or queue system (future work)
- NO actual Meta Business account verification process (manual, external)
- NO creation of message templates in Meta Dashboard (manual step, only documented)
- NO integration with existing nursery/parent/child data (future tasks in Phase 3)
- NO message rate limiting or throttling (future work)
- NO webhook payload storage or history (future work)

## Technical Considerations

- **Meta Cloud API:** Uses Graph API v21.0 endpoint `https://graph.facebook.com/v21.0/{phone_number_id}/messages`
- **Authentication:** Bearer token in Authorization header
- **Webhook signature:** HMAC SHA256 signature in x-hub-signature-256 header must be verified
- **Server functions:** Follow existing TanStack Start patterns in `src/lib/server/`
- **API routes:** Use TanStack Start file-based routing in `src/routes/api/`
- **Testing:** Unit tests with Vitest, no browser tests needed (API endpoints only)

## Success Metrics

- Webhook verification endpoint successfully validates Meta's challenge request
- Incoming message payloads are received and logged with correct parsing
- WhatsApp client helper functions can be imported and called from other server code
- All quality checks pass (lint, test, typecheck)
- Setup documentation enables reproducing Meta Business account configuration

## Open Questions

- **Message template approval timing:** How long does Meta take to approve message templates? (Document in setup guide)
- **Phone number verification:** Does the WhatsApp Business phone number need to be verified before API works? (Document in setup guide)
- **Rate limits:** What are Meta's default rate limits for Cloud API? (Note in setup guide for future reference)
