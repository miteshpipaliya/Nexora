# NEXORA — Brevo Transactional Email Setup & Verification Guide

**Service:** Brevo (formerly Sendinblue) Transactional Email API (v3)  
**Endpoint:** `POST https://api.brevo.com/v3/smtp/email`  
**Purpose:** Dispatches 6-digit Student Registration OTPs, Admin Security Password Recovery Codes, and Visitor Inquiry Replies  

---

## 1. Brevo Account & API Key Configuration

1. Log in to your Brevo Console at [https://app.brevo.com](https://app.brevo.com).
2. Navigate to **SMTP & API** &rarr; **API Keys**.
3. Generate a new API Key:
   - **Name:** `NEXORA Preview Vercel Key`
   - **Type:** v3 Key
   - Ensure the key has permissions to send Transactional Emails.
4. Copy the API key immediately (format: `xkeysib-...`).

---

## 2. Sender Verification (Mandatory)

Brevo **will reject** any email dispatched from an unverified sender with HTTP 400 (`sender not allowed`).

1. In Brevo, verify that `nexora-bvm.online` is authenticated and the sender `no-reply@nexora-bvm.online` is active. The project owner reports that DKIM and DMARC are configured; this repository cannot independently verify DNS ownership.
2. Use sender name `NEXORA` and reply-to address `nexora.bvm@gmail.com`.

---

## 3. Vercel Environment Configuration

In the Vercel Dashboard for your `nexora` project:
1. Navigate to **Settings** &rarr; **Environment Variables**.
2. Configure the following variables in the appropriate targets. Keep Preview isolated with staging Firebase credentials as described in `ENV_REFERENCE.md`:

| Variable Name | Required Value | Notes |
|---|---|---|
| `BREVO_API_KEY` | `xkeysib-...` | Your raw Brevo API key (no surrounding quotes). |
| `BREVO_SENDER_EMAIL` | `no-reply@nexora-bvm.online` | Must match the sender verified in Brevo. |
| `BREVO_SENDER_NAME` | `NEXORA` | Display name in recipients' inbox. |
| `BREVO_REPLY_TO` | `nexora.bvm@gmail.com` | Reply destination; do not use the legacy `BREVO_REPLY_TO_EMAIL` name for new deployments. |
| `OTP_HMAC_SECRET` | 32+ character random hex | Used for server-side keyed HMAC-SHA256 OTP hashing. |

3. Add these values to the **Preview** target only after staging Firebase is configured. Do not replace Production values during Preview setup. Redeploy the audit branch Preview after saving the Preview variables.

---

## 4. Verification & Testing

### Read-only Preview smoke probe
The existing smoke probe checks basic HTTP responses and public assets. It does not send email or confirm Brevo delivery. Always point it at the audit Preview URL; without `TEST_URL`, its default target is the production site:
```bash
TEST_URL=https://<audit-preview-url> node scripts/production-smoke-test.mjs
```

### Manual Testing Procedure
1. Open the audit branch's Vercel Preview URL in an incognito window. Do not use the production domain for integration tests.
2. Select **Sign Up with Student Email**.
3. Enter your test email address and click **Send Verification Code**.
4. Check the inbox. The email should arrive within 5–15 seconds featuring:
   - NEXORA dark theme cosmic styling.
   - 6-digit verification code in monospace violet block.
   - 3-minute expiration warning.
5. Enter the code in the NEXORA UI to complete signup.

An HTTP success from Brevo confirms provider acceptance only. Confirm inbox receipt separately; check spam/junk if the message is not visible. Never perform a live email test until the Preview target has an approved Brevo key and staging Firebase settings.

---

## 5. Troubleshooting Common Brevo Errors

| Error Code | Root Cause | Solution |
|---|---|---|
| **401 Unauthorized** | Invalid or revoked `BREVO_API_KEY`. | Re-copy key from Brevo dashboard into Vercel and redeploy. |
| **401 Unauthorized (IP restriction)** | Brevo account has Authorized IPs configured, blocking Vercel serverless IPs. | Keep the restriction enabled. Use a supported fixed-egress arrangement or ask Brevo about an approved alternative; do not clear the allowlist as a workaround. |
| **400 Bad Request (`sender not allowed`)** | `BREVO_SENDER_EMAIL` has not been confirmed via email link in Brevo. | Complete sender verification in Brevo dashboard. |
| **402 Payment Required / 429 Quota** | Daily free tier quota (300 emails/day) reached. | Upgrade Brevo transactional tier or wait for midnight UTC reset. |
