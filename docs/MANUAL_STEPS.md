# NEXORA — Manual Administrative Operations & Action Guide

This document specifies the required manual configuration steps in third-party service provider dashboards (Vercel, Brevo, and Firebase).

---

## 1. Configure Vercel Environment Variables

In your Vercel Dashboard &rarr; Project `nexora` &rarr; **Settings** &rarr; **Environment Variables**, ensure the following variables are present for **Production**, **Preview**, and **Development**:

### 1.1 Client Public Configuration (`VITE_*`)
- `VITE_FIREBASE_API_KEY`: Firebase Web API Key
- `VITE_FIREBASE_AUTH_DOMAIN`: `gen-lang-client-0089073748.firebaseapp.com` (or your custom auth domain)
- `VITE_FIREBASE_PROJECT_ID`: `gen-lang-client-0089073748`
- `VITE_FIREBASE_STORAGE_BUCKET`: `gen-lang-client-0089073748.appspot.com`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`: `737604676344`
- `VITE_FIREBASE_APP_ID`: `1:737604676344:web:03f27f8cf28e1620a5996f`

### 1.2 Server Private Credentials (Protected Runtimes Only)
- `BREVO_API_KEY`: Your live Brevo transactional API key (`xkeysib-...`, without surrounding quotes).
- `BREVO_SENDER_EMAIL`: `nexora.bvm@gmail.com` (must be confirmed in Brevo).
- `BREVO_SENDER_NAME`: `NEXORA`
- `OTP_HMAC_SECRET`: 32+ character random hex string for keyed HMAC-SHA256 OTP hashing.
- `FIREBASE_SERVICE_ACCOUNT` (Optional for serverless): Firebase Admin Service Account JSON string or base64 string.

---

## 2. Brevo Sender Verification & IP Rules

1. **Verify Sender Email:**
   - Go to [Brevo Dashboard](https://app.brevo.com) &rarr; **Senders & IP** &rarr; **Senders**.
   - Ensure `nexora.bvm@gmail.com` is added and confirmed via the email verification link.
2. **Dynamic Serverless IP Compatibility:**
   - In Brevo &rarr; **Security** &rarr; **Authorized IPs**:
   - Ensure the IP whitelist is empty. Vercel Serverless Function IP addresses rotate dynamically across AWS and GCP regions.

---

## 3. Administrator Access & Custom Claims

1. Sign in to `https://www.nexora-bvm.online/auth` using:
   - **Email:** `miteshpipaliya2202@gmail.com`
2. The system will automatically call `POST /api/admin/auth/sync-claim` to grant `{ admin: true }` custom claims to your account.
3. Access `/admin` and enter your Admin Security Password.
4. If you have not yet set up your Admin Security Password, follow the onscreen setup wizard which dispatches a setup OTP to `miteshpipaliya2202@gmail.com`.

---

## 4. Trigger Production Build on Vercel

Push the changes to `main`:
```bash
git push origin main
```
Vercel will automatically trigger a build using the bundled pipeline:
- `vite build && esbuild server.ts --bundle --platform=node --format=esm --outfile=server.js --packages=external`
- The deployment will transition to **Ready** in approximately 60–90 seconds.
