# NEXORA — Brevo Transactional Email Setup & Verification Guide

**Service:** Brevo (formerly Sendinblue) Transactional Email API (v3)  
**Endpoint:** `POST https://api.brevo.com/v3/smtp/email`  
**Purpose:** Dispatches 6-digit Student Registration OTPs, Admin Security Password Recovery Codes, and Visitor Inquiry Replies  

---

## 1. Brevo Account & API Key Configuration

1. Log in to your Brevo Console at [https://app.brevo.com](https://app.brevo.com).
2. Navigate to **SMTP & API** &rarr; **API Keys**.
3. Generate a new API Key:
   - **Name:** `NEXORA Production Vercel Key`
   - **Type:** v3 Key
   - Ensure the key has permissions to send Transactional Emails.
4. Copy the API key immediately (format: `xkeysib-...`).

---

## 2. Sender Verification (Mandatory)

Brevo **will reject** any email dispatched from an unverified sender with HTTP 400 (`sender not allowed`).

1. In the Brevo dashboard, go to **Senders & IP** &rarr; **Senders**.
2. Click **Add a Sender**:
   - **Sender Name:** `NEXORA` (or `NEXORA — Student Tech Community`)
   - **Sender Email:** `nexora.bvm@gmail.com`
3. Check the inbox for `nexora.bvm@gmail.com`, open the verification email from Brevo, and click the confirmation link.
4. Verify that the status in the Brevo Senders list shows **Verified**.

---

## 3. Vercel Environment Configuration

In the Vercel Dashboard for your `nexora` project:
1. Navigate to **Settings** &rarr; **Environment Variables**.
2. Add the following variables for **Production**, **Preview**, and **Development**:

| Variable Name | Required Value | Notes |
|---|---|---|
| `BREVO_API_KEY` | `xkeysib-...` | Your raw Brevo API key (no surrounding quotes). |
| `BREVO_SENDER_EMAIL` | `nexora.bvm@gmail.com` | Must match verified sender in Brevo. |
| `BREVO_SENDER_NAME` | `NEXORA` | Display name in recipients' inbox. |
| `OTP_HMAC_SECRET` | 32+ character random hex | Used for server-side keyed HMAC-SHA256 OTP hashing. |

3. Trigger a redeployment in Vercel after saving environment variables.

---

## 4. Verification & Testing

### Automated Diagnostic Test
Run the automated Brevo verification script from the repository root:
```bash
node scripts/production-smoke-test.mjs --email test-student@bvm.edu.in
```

### Manual Testing Procedure
1. Open `https://www.nexora-bvm.online/auth` in an incognito window.
2. Select **Sign Up with Student Email**.
3. Enter your test email address and click **Send Verification Code**.
4. Check the inbox. The email should arrive within 5–15 seconds featuring:
   - NEXORA dark theme cosmic styling.
   - 6-digit verification code in monospace violet block.
   - 3-minute expiration warning.
5. Enter the code in the NEXORA UI to complete signup.

---

## 5. Troubleshooting Common Brevo Errors

| Error Code | Root Cause | Solution |
|---|---|---|
| **401 Unauthorized** | Invalid or revoked `BREVO_API_KEY`. | Re-copy key from Brevo dashboard into Vercel and redeploy. |
| **401 Unauthorized (IP restriction)** | Brevo account has Authorized IPs configured, blocking Vercel serverless IPs. | In Brevo &rarr; Security &rarr; Authorized IPs, clear the IP whitelist to allow dynamic cloud functions, or configure an SMTP proxy. |
| **400 Bad Request (`sender not allowed`)** | `BREVO_SENDER_EMAIL` has not been confirmed via email link in Brevo. | Complete sender verification in Brevo dashboard. |
| **402 Payment Required / 429 Quota** | Daily free tier quota (300 emails/day) reached. | Upgrade Brevo transactional tier or wait for midnight UTC reset. |
