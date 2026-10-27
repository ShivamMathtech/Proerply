# Optional integrations

## SMTP password recovery

Configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`, and `SMTP_STARTTLS=true` on the backend. The app uses STARTTLS with Python's SMTP client and sends a six-digit, ten-minute recovery code. Verification has attempt limits, codes and reset tokens are hashed, reset tokens are single use, and a completed password reset revokes all existing sessions.

Without SMTP in development, the response says that no email was sent. Read the newest account-specific JSON file in `backend/data/dev-mailbox/`. Keep this directory private and delete expired development mail when no longer needed. Production recovery returns 503 if SMTP is not configured. SMTP failures do not disclose account existence; administrators should monitor their provider. Live SMTP delivery has not been tested with your credentials.

## Stripe hosted checkout

1. Configure `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` on the backend only.
2. Point a signed webhook at `https://YOUR_API/api/v1/payments/webhook`.
3. Subscribe to `checkout.session.completed` and `checkout.session.async_payment_succeeded`.
4. Set `FRONTEND_URL` to the actual frontend origin.
5. Use provider test mode before enabling live payments. Never enter real payment details into the demo.

The server determines the USD price from the course record. It records a pending order, opens hosted Checkout, and grants enrollment only after a signed, paid event matches the order amount, currency, checkout session and client reference. Provider event IDs and enrollment uniqueness make processing idempotent. Return-page query parameters do not prove payment.

Only one-time course purchases are implemented. No subscription billing, discounts, taxes, refunds, chargeback automation or instructor payouts are provided. Billing options on the pricing page describe course purchasing and learning paths. Refund/revocation operations need an explicit business policy before extending this starter. Stripe test/live network calls were not exercised with provider credentials; signature rejection, price-forgery protection and idempotent fulfillment were tested locally.

## Licensed videos

Edit a course in the studio and set the lesson's HTTPS video URL. A browser-playable video appears with native controls. Playback position is saved about every ten seconds and on pause. A missing video uses the original reading lesson and exercise; a failed URL reports a playback error. Verify MIME type, range requests and cross-origin access on your media host. Provide captions with your production content; this starter does not manufacture caption tracks.

## WebRTC calls

The API offers authenticated `/calls/{conversation_id}` signaling, visible only to the two conversation participants. Starting a call stores an offer; the other participant opens the same conversation and chooses **Join existing call** to supply an answer. SDP includes ICE candidates after gathering; the initiator polls for the answer. The browser handles the media path. No server-side media relay, recording, transcription or video synthesis is included.

Set `ICE_SERVERS_JSON` to a JSON array of permitted STUN/ICE server configurations. For a TURN service supporting the common REST shared-secret mechanism, set `TURN_URL` and `TURN_SECRET`; `/calls/config` returns short-lived HMAC credentials rather than the secret. Keep the backend and frontend on HTTPS for camera/microphone access outside localhost. Test restrictive networks with your TURN provider; direct LAN operation is not a substitute for production connectivity testing.

Both participants can end the call. Tracks and peer connections are released when the screen unmounts. Demo mode only previews the current camera, and is labeled accordingly. Camera/microphone hardware and two-party network calls were not tested in the build environment.

## Browser notifications

Notifications require an explicit click and browser permission. The app checks for due reminders while its tab is open. If permission is denied or unsupported, reminders remain editable and visible in the app. There is no service worker, web push backend or system background alarm in this package.
