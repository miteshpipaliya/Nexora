# NEXORA — Administrator Credential Recovery & Access Protocol

**Primary Administrator:** `miteshpipaliya2202@gmail.com`  
**Founder Phone:** `+91 8200243606`  
**Approved Admin Whitelist:**
- `miteshpipaliya2202@gmail.com` (Founder / Super Admin)
- `mitesh.aiml@gmail.com` (Secondary Admin)
- `editwithvision@gmail.com` (Design & Media Admin)

---

## 1. Standard Admin Access Flow

1. Navigate to `https://www.nexora-bvm.online/auth` and log in with `miteshpipaliya2202@gmail.com`.
2. The frontend `AuthContext` detects your admin email and automatically calls `POST /api/admin/auth/sync-claim`.
3. The server validates your token and ensures `{ admin: true }` custom claims are active.
4. Navigate to `/admin`.
5. Enter your 16+ character **Admin Security Password**.
6. A 15-minute elevated session is granted, unlocking full CMS, Competition Management, and Team controls.

---

## 2. Recovery Scenario A: Initial Password Setup

If logging into a fresh deployment where the Admin Security Password has not yet been initialized:
1. Navigate to `https://www.nexora-bvm.online/admin`.
2. The UI will detect that the password has not been set (`initialized: false`) and display the **Admin Initialization Shield**.
3. Click **Send Setup Verification Code**.
4. A 6-digit setup OTP will be dispatched to `miteshpipaliya2202@gmail.com` via Brevo.
5. Enter the OTP, enter your desired new master password (minimum 16 characters), and click **Create Admin Password**.
6. The password is cryptographically salted, hashed via `scrypt`, and permanently saved to Firestore (`_system_security/admin_credentials`).

---

## 3. Recovery Scenario B: Forgot Admin Password

If the Admin Security Password is lost or forgotten:
1. Navigate to `https://www.nexora-bvm.online/admin`.
2. Click **Forgot Admin Password?** beneath the password input.
3. Click **Send Recovery Code to Founder Gmail**.
4. Brevo will deliver a 6-digit recovery code to `miteshpipaliya2202@gmail.com`.
5. Enter the 6-digit code on the recovery screen.
6. Upon validation, you will be prompted to set a new 16+ character master password.
7. Once updated, all active admin sessions across all devices are immediately revoked, and your new credentials take effect immediately.

---

## 4. Recovery Scenario C: Emergency Server-Side Override

In the event of an email dispatch failure or lock-out:
1. Open the Vercel Dashboard for `nexora`.
2. Navigate to **Settings** &rarr; **Environment Variables**.
3. Set the temporary override variable:
   - **Key:** `ADMIN_SECURITY_PASSWORD`
   - **Value:** `EmergencyTempPassword2026!@#$` (or any strong 16+ character string)
4. Redeploy the application.
5. Log in at `/admin` using the temporary password.
6. Navigate to the Admin Settings panel, establish a permanent database-backed password, and subsequently remove the `ADMIN_SECURITY_PASSWORD` environment variable in Vercel to return to standard Firestore security.
