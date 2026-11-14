# NEXORA — Razorpay Test Mode Setup (PayNxr)

This branch implements **test payments only**. The backend rejects a Razorpay Key ID that does not start with `rzp_test_`; no live charges are supported.

## Local configuration (Windows E:\\NEXORA)

1. Create or update `E:\\NEXORA\\.env` **locally on your own computer**. Back up any existing file before editing. Never upload or commit the file.
2. Enter only the values needed for your existing NEXORA deployment; retain the existing Firebase Admin, Brevo and authentication environment variable names.
3. Add the two Razorpay test credentials in the local server environment:
   - `RAZORPAY_KEY_ID=rzp_test_...`
   - `RAZORPAY_KEY_SECRET=<your test secret>`
4. Add `RAZORPAY_WEBHOOK_SECRET=<the webhook secret created in your Razorpay dashboard>` if testing signed webhook delivery.
5. The server already loads dotenv in development; don't add `VITE_` prefixes to private secrets. The only key returned to the browser is the **public test Key ID**, from a server-created order.
6. Confirm `git check-ignore .env` recognizes it; `.env` and `.env.*` are in the tracked `.gitignore`.
7. `.env.example` is deliberately removed on PayNxr. Deleting that file from the branch does **not** erase previous Git history. Rotate any exposed or potentially exposed credentials.

## Vercel Preview environment

Go to NEXORA project → Settings → Environment Variables. Configure the following keys on the **Preview** environment (scope to `PayNxr` if appropriate), without copying their values into source code or documentation:

- `RAZORPAY_KEY_ID` — test-mode public Key ID.
- `RAZORPAY_KEY_SECRET` — secret test key; server only.
- `RAZORPAY_WEBHOOK_SECRET` — signed webhook secret; server only.
- The existing `FIREBASE_SERVICE_ACCOUNT` (or current supported Firebase Admin credential set) and Firebase project configuration needed to verify signed-in students and access Firestore.
- Existing Firebase client configuration and any existing Brevo/authentication environment variables, as already used in NEXORA.

**Important:** Preview Firebase Admin should target a separate safe testing environment. Do not run payment flow tests against production Firestore data. Never use live Razorpay API credentials on PayNxr.

## Razorpay webhook

Create a TEST-mode webhook in the Razorpay dashboard:

- URL: `https://<your PayNxr preview hostname>/api/payments/webhook`
- Events: `payment.captured`, `payment.failed`, `order.paid`.
- Enter the **same** webhook secret in Razorpay and Vercel `RAZORPAY_WEBHOOK_SECRET`.
- Ensure the preview webhook URL is reachable (Vercel Deployment Protection might require a project-specific bypass); do **not** disable authentication across the project merely to enable the webhook.
- Reconfigure the URL when a preview deployment hostname changes; for a stable endpoint, use an intentional preview-branch alias/domain.

## Existing flow

Admin → Competitions: enter a nonnegative fee in INR and optionally enable “Require Razorpay online payment (TEST MODE)”. Online payment is **off by default** for backward compatibility. A zero-fee event registers without checkout.

Student → Register: the existing Firebase-authenticated registration is stored. When paid test checkout is enabled, it is **Pending Review** until server-side verification of a **captured** Razorpay payment. The browser cannot mark it confirmed by itself. Closing or failing checkout leaves it pending; reopening the registration modal offers a payment retry.

API endpoints:

- `POST /api/payments/create-order`: Firebase bearer token, competition slug, Firestore fee and participant count, Razorpay test order, immutable order record.
- `POST /api/payments/verify`: Firebase bearer token, Razorpay payment/order/signature, HMAC verification, payment fetch, captured status and atomic Firestore update.
- `POST /api/payments/webhook`: signed raw request body, idempotent gateway event reconciliation.

Gateway credentials, card data, CVV and UPI PINs are not saved in Firestore. The server stores payment IDs and amounts for reconciliation.

## Validation / limitations

`npm run build`, `npm run typecheck` and `npm test` should all pass before enabling checkout. Unit tests validate unauthorized requests, malformed competition IDs, disabled payments and forged success signatures **without contacting Razorpay**. Full end-to-end test payments, webhook delivery, gateway retries, and isolated Firestore integration require your real *test* Razorpay credentials and a safe test Firebase project. Do not claim those are validated solely from a green Vercel build.

The Vercel error `Deployment rate limited — retry in 24 hours` is a platform/account limit, not a code syntax error. A deployment may build successfully after the restriction expires without changing any application logic.
