# NEXORA — Administrator Credential Recovery & Access Protocol

**Administrator access:** Controlled by the verified founder identity supplied in the server environment and Firestore authorization records. Personal administrator contact details must not be documented in the public repository.

---

## 1. Standard Admin Access Flow

1. Navigate to `https://www.nexora-bvm.online/auth` and log in with `the configured founder email address`.
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
4. A 6-digit setup OTP will be dispatched to `the configured founder email address` via Brevo.
5. Enter the OTP, enter your desired new master password (minimum 16 characters), and click **Create Admin Password**.
6. The password is cryptographically salted, hashed via `scrypt`, and permanently saved to Firestore (`_system_security/admin_credentials`).

---

## 3. Recovery Scenario B: Forgot Admin Password

If the Admin Security Password is lost or forgotten:
1. Navigate to `https://www.nexora-bvm.online/admin`.
2. Click **Forgot Admin Password?** beneath the password input.
3. Click **Send Recovery Code to Founder Gmail**.
4. Brevo will deliver a 6-digit recovery code to `the configured founder email address`.
5. Enter the 6-digit code on the recovery screen.
6. Upon validation, you will be prompted to set a new 16+ character master password.
7. Once updated, all active admin sessions across all devices are immediately revoked, and your new credentials take effect immediately.

---

## 4. Recovery Scenario C: Emergency Server-Side Override (REMOVED)

The emergency `ADMIN_SECURITY_PASSWORD` environment variable override has been removed. It was a documented backdoor that bypassed MFA and presented a critical security risk (P0-03).

**Secure recovery process:**
- Use **Recovery Scenario B** (Forgot Admin Password) which uses verified identity via email OTP, short-lived challenge tokens, and appropriate authorization.
- If email delivery fails, contact the platform administrator through an out-of-band channel.
- Recovery tokens are single-use, short-lived (10 minutes), and cannot grant administrator access without prior admin authorization.
- All recovery actions are audit-logged.
