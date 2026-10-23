# NEXORA Manual Steps Guide (MANUAL_STEPS.md)

This document contains step-by-step instructions for tasks that require manual user credentials or cloud console actions.

---

## 1. Firebase Service Account Setup (For Admin Claims & Server API)
To enable the backend to verify Firebase ID tokens, manage custom claims (`admin: true`), and write server-authoritative registrations:

1. Open the [Firebase Console](https://console.firebase.google.com/).
2. Select your NEXORA project (`nexorastudenttech` or your designated project).
3. Click the **Gear icon** next to *Project Overview* -> **Project settings**.
4. Navigate to the **Service accounts** tab.
5. Click **Generate new private key**, then confirm **Generate key**.
6. A JSON file will download. Open it and either:
   - **Option A (Vercel / Production)**: Copy the contents and set the environment variable:
     - `FIREBASE_SERVICE_ACCOUNT_KEY`: paste the entire JSON string.
   - **Option B (Separate environment variables)**:
     - `FIREBASE_PROJECT_ID`: `"project_id"` value from JSON
     - `FIREBASE_CLIENT_EMAIL`: `"client_email"` value from JSON
     - `FIREBASE_PRIVATE_KEY`: `"private_key"` value from JSON (replace `\n` with actual line breaks)
   - **Option C (Local Development)**: Save the JSON file to `service-account.json` in the project root (ensure it is gitignored).

---

## 2. Setting the First Admin User Claim
Once you have the service account key configured:
1. Run the admin claims setup script:
   ```bash
   npx tsx scripts/set-admin-claim.ts miteshpipaliya2202@gmail.com
   ```
2. The user will be granted `admin: true` in Firebase Authentication.
3. When the user logs in, their Firebase ID token will contain `{ admin: true }`.

---

## 3. Brevo Transactional Email Key Setup
To enable transactional OTP emails for registration and authentication:

1. Go to [Brevo (formerly Sendinblue)](https://app.brevo.com/).
2. Log in and click your profile name at the top right -> **SMTP & API Keys**.
3. Under the **API Keys** tab, click **Generate a new API key**.
4. Name it `NEXORA Production` and copy the generated key (`xkeysib-...`).
5. **Critical IP Restriction Check**: Ensure no restrictive IP filter is blocking Vercel or cloud IP addresses under *Security / Authorized IPs*.
6. Add the key to your environment variables:
   - `BREVO_API_KEY`: `xkeysib-...`
   - `BREVO_SENDER_EMAIL`: `nexora.tech@gmail.com` (or your verified sender address)
   - `BREVO_SENDER_NAME`: `NEXORA Student Community`

---

## 4. Vercel Environment Variables Configuration
In your [Vercel Dashboard](https://vercel.com/):
1. Go to your project -> **Settings** -> **Environment Variables**.
2. Add the following variables for *Production* and *Preview*:
   - `FIREBASE_SERVICE_ACCOUNT_KEY`: (JSON string from Step 1)
   - `BREVO_API_KEY`: (API key from Step 3)
   - `BREVO_SENDER_EMAIL`: `nexora.tech@gmail.com`
   - `VITE_FIREBASE_API_KEY`: your web app API key
   - `VITE_FIREBASE_AUTH_DOMAIN`: your auth domain
   - `VITE_FIREBASE_PROJECT_ID`: your project ID
   - `VITE_FIREBASE_STORAGE_BUCKET`: your storage bucket
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`: your sender ID
   - `VITE_FIREBASE_APP_ID`: your app ID
3. Trigger a redeploy from **Deployments** -> **Redeploy**.

---

## 5. GitHub Branch Protection Setup
To enforce high safety standards:
1. Go to your repository on GitHub -> **Settings** -> **Branches**.
2. Click **Add branch ruleset** or **Add rule** for branch `main`.
3. Check:
   - **Require a pull request before merging** (Require approvals: 1).
   - **Require status checks to pass before merging** (Require branch to be up to date before merging).
   - **Do not allow force pushes**.
   - **Do not allow deletions**.
