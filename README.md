# Oscar Bahamonde · Nuxt portfolio

Independent source repository, rebuilt from scratch on 2026-11-13. Nuxt 4, Vue, TypeScript and responsive CSS. This repository does not replace the older React/Vite repository.

## Development

Requires Node 22.21+ and npm.

```sh
npm install
npm test
npm run dev
npm run build
npm run preview
```

Nuxt renders the portfolio on the server and prerenders the home page. SEO files are in `public/`. CSS respects reduced-motion preferences. No API credentials are needed for the current site.

## Booking and payment

- Calendar: https://calendar.app.google/kDqLmVtrnZ8nWfgKA
- Mercado Pago: https://mpago.la/1PGrFn1
- PEN 20 / 30 minutes, weekdays 09:00–13:00 and 14:00–17:00 in America/Lima.
- Google Calendar handles availability, booking and Meet invitations.
- The two links are independent. Payment verification is manual. This repository does not claim automatic payment validation.

For a future paid booking flow, implement Checkout Pro with server-side payment lookup, signature validation, amount/currency checks, persistent booking state, slot holds and idempotent Calendar event creation. Never trust checkout return parameters as proof of payment. Store all secrets only in deployment environment variables.

## Deployment

Import this repository into Vercel with framework Nuxt and build command `npm run build`. Connecting it to the existing production project is a separate operation. This repository has not been deployed automatically by its creation.

## Validation status

The dependency-free source checks can run locally with `npm test`. A full Nuxt build requires network access to npm. The Lighthouse scores from the previous portfolio do not apply to this rebuild.

## Portrait

The portrait in `public/images/oscar-portrait.jpg` is an AI-assisted retouch of Oscar's photograph: lighting, color and subtle skin cleanup. It is included with the owner's authorization.

## Mercado Pago Checkout Pro

Set `NUXT_MERCADO_PAGO_ACCESS_TOKEN` as a sensitive production environment variable in Vercel, then redeploy. Without it, `/api/checkout` redirects to the existing S/20 payment link and verification remains manual. With it, the server creates a PEN 20 preference and verifies the payment through Mercado Pago, matching a browser order cookie, currency, amount, live mode and approved state. `/pago` never trusts query-string status. Calendar reservations still occur through Google Calendar; no webhook or automatic event creation has been implemented. Do not claim a fully automated paid booking flow.

## Booking flow (current)
The home page embeds the real Google Calendar appointment schedule (30 minutes, weekdays 09–13 and 14–17, Lima). Guests complete a Calendar booking before using the separate checkout. A client-side checkbox acknowledges booking but does not verify it. A paid order is NOT automatically associated with a Calendar event. Do not describe this as an atomic paid booking system. Full coupling requires dedicated Calendar API authorization, persistent booking records, slot holds and idempotent payment/event handling.

## Unified booking
The site queries the owner's Google Calendar (recurring instances and all-day events included), offers Mon–Fri 09–13 / 14–17 America/Lima, 30-minute slots, four-hour notice and 60-day window. No availability is offered when Calendar cannot be read.

An event with deterministic slot ID and conditional ETag updates coordinates competing requests from this application. Holds last 15 minutes; expired holds do not block this application's availability. Calendar remains the durable order record; expired temporary entries may remain visible to the owner until reused. This does not provide a distributed transaction against unrelated clients editing Google Calendar: availability is rechecked before checkout and confirmation; conflicts or late payments require manual review/refund, never automatic replacement of personal events.

Mercado Pago checkout uses PEN20 and the hold UUID as external reference. The browser return and webhook independently retrieve and validate the payment before confirming the same hold. A verified payment finalizes the Calendar event, invitation and Meet; duplicate notifications are idempotent through the event version and confirmed state. Test payment completion with merchant test accounts before collecting real payments. Webhook notifications are untrusted triggers; the API always retrieves the actual payment with the merchant credential. Rate limiting and signature validation are recommended before higher traffic.

Private runtime variables: NUXT_MERCADO_PAGO_ACCESS_TOKEN, NUXT_GOOGLE_CLIENT_ID, NUXT_GOOGLE_CLIENT_SECRET, NUXT_GOOGLE_REFRESH_TOKEN, NUXT_GOOGLE_CALENDAR_ID (primary), NUXT_BOOKING_SECRET (random 32+ bytes). Never commit their values. Enable Calendar API in the Google project. `/conectar` starts owner-only setup with the booking secret; callback verifies the owner email and displays the refresh token once for secure Vercel configuration. Keep Google OAuth in production rather than testing for durable refresh tokens, and inspect the application's consent branding/scopes before authorizing. No client-side credentials.

Personal Calendar events marked Free also block consultation slots, as requested by the owner. Cancelled and self-declined events are ignored.
