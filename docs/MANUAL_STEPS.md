# Manual Steps for Operators & Administrators

The following operations must be performed manually in third-party dashboards or administrative consoles:

## 1. Configure Vercel Environment Variables
In the Vercel Dashboard -> Project Settings -> Environment Variables, add the following variables for **Production** and **Preview**:

1. `FIREBASE_SERVICE_ACCOUNT`:
   - Paste the service account JSON (either plain string or base64 encoded) generated from Firebase Console -> Project Settings -> Service Accounts -> Generate New Private Key.
2. `OTP_HMAC_SECRET`:
   - Generate a secure 32+ character random secret (e.g., `openssl rand -hex 32`).
3. `ADMIN_SECURITY_PASSWORD` (Optional):
   - Optional 16+ character master fallback password for elevated admin access.
4. `BREVO_API_KEY`:
   - Active Brevo transactional API key (`xkeysib-...`).
5. `BREVO_SENDER_EMAIL`:
   - Verified sender email in Brevo (e.g., `nexorabvm@gmail.com` or custom domain sender).
6. `BREVO_SENDER_NAME`:
   - `Nexora BVM`
7. `FIREBASE_API_KEY`:
   - Public Firebase Web API Key matching client configuration.

## 2. Brevo IP Restriction Settings
- Go to Brevo Dashboard -> Settings -> Security -> Authorized IPs.
- Ensure authorized IP restrictions are **disabled** or set to allow dynamic cloud ranges, because Vercel serverless function IP addresses rotate dynamically across AWS/GCP regions.

## 3. Provision Admin Custom Claims
To grant the initial founder or administrator elevated custom claims on Firebase Auth:
```bash
npm run admin:claim -- founder@bvmengineering.ac.in
```
After the claim is set, sign out of the Nexora web interface and sign back in for the new token claims to take effect.

## 4. Deploy Firestore Rules and Indexes
Deploy the security rules and composite index definitions to your Firebase project:
```bash
firebase deploy --only firestore:rules,firestore:indexes
```

## 5. Rotate Secrets if Exposed
If `.env` was ever committed or shared publicly, immediately rotate:
1. Brevo API key in the Brevo console.
2. `OTP_HMAC_SECRET` in Vercel settings.
3. Firebase Service Account private key in the Google Cloud Console.
