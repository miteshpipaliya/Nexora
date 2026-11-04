# NEXORA — Owner Action Guide & Manual Steps (v6)

This document contains step-by-step instructions for tasks that require the owner's credentials in Brevo, BigRock, Vercel, and Firebase.

---

## 1. Brevo Custom Domain & DNS Setup (BigRock)

**Target Domain:** `nexora-bvm.online`  
**Registrar / DNS Manager:** BigRock (Nameservers: `dns1.bigrock.in` to `dns4.bigrock.in`)  
**Expected Completion Time:** ~30 minutes plus DNS propagation.

### Step-by-Step Instructions:
1. **Brevo Console:**
   - Log into [app.brevo.com](https://app.brevo.com).
   - In the left sidebar, click **Senders, Domains & Dedicated IPs** &rarr; **Domains**.
   - Click **Add a Domain**.
   - Enter `nexora-bvm.online`.
   - Brevo will display the exact DNS records to configure (a brevo-code TXT record, DKIM TXT records, and a DMARC TXT record). Keep this tab open.

2. **BigRock DNS Management:**
   - Log into your [BigRock Control Panel](https://www.bigrock.in).
   - Navigate to **Manage Orders** &rarr; **List All Orders** &rarr; click on `nexora-bvm.online`.
   - On the right sidebar or domain overview, click **Manage DNS** (DNS Management).
   - For each record shown in Brevo, click **Add Record**:
     - **TXT Record 1 (Brevo verification):**
       - Host Name: `@` (or leave blank if BigRock appends domain automatically)
       - Value: *Paste the `brevo-code=...` string from Brevo*
     - **TXT Record 2 (DKIM):**
       - Host Name: `mail._domainkey` (or `brevo1._domainkey` as indicated by Brevo)
       - Value: *Paste the DKIM public key string*
     - **TXT Record 3 (DMARC):**
       - Host Name: `_dmarc`
       - Value: `v=DMARC1; p=none; sp=none;` (or value provided by Brevo)
   - Save all records. Leave your existing Vercel A / CNAME records completely untouched.

3. **Authenticate in Brevo:**
   - Return to the Brevo Domains tab.
   - Click **Authenticate this domain** or check status every few minutes until all indicators turn green (**Authenticated**).

4. **Add Authorized Sender in Brevo:**
   - In Brevo, navigate to **Senders** &rarr; click **Add a Sender**.
   - **Sender Name:** `NEXORA`
   - **Sender Email:** `no-reply@nexora-bvm.online`
   - Complete verification (since the domain is authenticated, this activates immediately).

5. **Disable Brevo IP Blocking:**
   - In Brevo, go to **Security** &rarr; **Authorised IPs**.
   - Ensure IP blocking is turned **OFF** (Vercel serverless IP addresses change dynamically with every request).

---

## 2. Vercel Environment Variables & Secret Rotation

In your [Vercel Dashboard](https://vercel.com) &rarr; Project `nexora` &rarr; **Settings** &rarr; **Environment Variables**:

1. **Update Brevo Variables (Production & Preview):**
   - `BREVO_SENDER_EMAIL`: `no-reply@nexora-bvm.online` (no quotes or spaces)
   - `BREVO_SENDER_NAME`: `NEXORA`
   - `BREVO_API_KEY`: *Create a brand-new API key in Brevo (SMTP & API), delete the old compromised key, and paste the new key here without quotes*.

2. **Generate and Set New `OTP_HMAC_SECRET`:**
   - Run in your local terminal:
     ```bash
     node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
     ```
   - Copy the 64-character hexadecimal string.
   - Add/Update `OTP_HMAC_SECRET` in Vercel with this value.

3. **Delete Stale Password Variable:**
   - Delete `ADMIN_SECURITY_PASSWORD` if it exists in Vercel settings (the database record is now the permanent source of truth).

4. **Trigger Deployment:**
   - Go to **Deployments** &rarr; click **...** on the latest deployment &rarr; click **Redeploy**.
   - *Note: Environment variable changes only take effect after a redeployment.*

---

## 3. Brand-New Admin Security Password Initialization (CLI)

This procedure durably writes the scrypt hash to Firestore document `_admin_security/founder` in database `ai-studio-nexorastudenttec-75ba3757-5549-44e3-a3ae-2ae34026863b`, increments the `passwordVersion`, and invalidates all old admin sessions.

### Step-by-Step Execution:
1. **Obtain Firebase Service Account Key:**
   - Go to [Firebase Console](https://console.firebase.google.com) &rarr; Project `gen-lang-client-0089073748`.
   - Click the gear icon (**Project settings**) &rarr; **Service accounts**.
   - Click **Generate new private key**.
   - Save the downloaded JSON file as `firebase-service-account.json` in the project root folder (*never commit this file to git*).

2. **Run Password CLI in PowerShell (Windows) or Bash (macOS/Linux):**

   **In PowerShell (Windows):**
   ```powershell
   $env:FIREBASE_SERVICE_ACCOUNT = Get-Content ./firebase-service-account.json -Raw
   npm run admin:password -- --set
   # Enter your new password twice (input is hidden)
   Remove-Item Env:FIREBASE_SERVICE_ACCOUNT
   ```

   **In Bash (macOS/Linux):**
   ```bash
   FIREBASE_SERVICE_ACCOUNT=$(cat ./firebase-service-account.json) npm run admin:password -- --set
   ```

3. **Delete the Private Key File:**
   ```powershell
   Remove-Item ./firebase-service-account.json
   ```

4. **Verify Persistence & Cold-Start Resilience:**
   - Open `https://www.nexora-bvm.online/admin`.
   - Enter your brand-new Admin Security Password.
   - Wait 10 minutes (to allow serverless container to cold-start) or trigger another visit, and verify that logging in succeeds. Store the password in your password manager.

---

## 4. Honest Technical Limits of Web Audio Chime (Package D)

1. **User Gesture Requirement:** Modern web browsers (Chrome, Safari, Firefox, Edge) enforce autoplay policies. The Web Audio chime cannot synthesize sound until the visitor has clicked, tapped, or pressed a key on the page at least once. If a broadcast arrives before any user interaction, the visual WhatsApp-style toast appears immediately and silently without throwing an error.
2. **Device Hardware / Silent Mode:** Hardware mute switches (e.g., iPhone ring/silent switch) and OS-level "Do Not Disturb" / silent modes will mute synthesized audio output.
3. **Closed Tab Limitation:** A visitor who has closed their browser or closed the tab will not receive the popup or sound. Receiving notifications with closed tabs requires Web Push notifications with a service worker and user push subscription permission, which is out of scope.
