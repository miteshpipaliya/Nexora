# NEXORA — Security Architecture & Hardening Audit

**Application:** NEXORA (Student Technology & Innovation Community, BVM)  
**Security Standard:** Zero-Trust Administrative Elevation, Cryptographic Keyed Hashing, OWASP Top 10 Compliance  

---

## 1. Environment & Credential Quarantine

### 1.1 Git Tracking Quarantine
- `.env`, `.env.example`, `.env.local`, `.env.production` are strictly ignored by `.gitignore`.
- Git cached tracking of any `.env*` files has been expunged from the repository history on `main`.
- Developer configuration is documented via safe reference in `docs/ENV_REFERENCE.md` with synthetic, non-functional examples.

### 1.2 Separation of Client and Server Variables
- **Client (`VITE_*`):** Only public Firebase configuration (`VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_PROJECT_ID`, etc.) and Google Maps Demo key are exposed in the bundle.
- **Server:** Sensitive credentials (`BREVO_API_KEY`, `FIREBASE_SERVICE_ACCOUNT`, `OTP_HMAC_SECRET`, `ADMIN_SECURITY_PASSWORD`) are accessible exclusively to Node.js / Vercel Serverless Function runtimes via `process.env`.
- No server secret is ever prefixed with `VITE_` or embedded into client-side source code.

---

## 2. Authentication & Cryptographic Measures

### 2.1 OTP Generation & Storage Policy
- **Generation:** Numeric 6-digit codes generated via CSPRNG `crypto.randomInt(100000, 1000000)`.
- **Keyed Hashing:** Raw OTPs are NEVER written to the filesystem, Firestore, logs, or responses.
  ```ts
  hash = crypto.createHmac('sha256', HMAC_SECRET)
               .update(`${email}:${otp}:${purpose}`)
               .digest('hex');
  ```
- **Comparison:** Constant-time verification prevents side-channel timing attacks:
  ```ts
  crypto.timingSafeEqual(Buffer.from(hashA, 'hex'), Buffer.from(hashB, 'hex'))
  ```
- **Rate Limiting & Lockout:** Max 5 incorrect attempts before the challenge is permanently burned. Cooldown of 30 seconds per dispatch, expiring in 180 seconds.

### 2.2 Elevated Administrator Sessions
- NEXORA enforces a dual-key administrative paradigm:
  1. Primary Firebase Authentication (`miteshpipaliya2202@gmail.com`).
  2. Master Admin Security Password (16+ characters, hashed with `crypto.scryptSync` using unique 16-byte cryptographic salts).
- Verified administrators receive a 15-minute cryptographically signed session token:
  ```ts
  token = `${base64Data}.${hmacSha256Signature}`
  ```
- Revoked immediately upon password change, logout, or session lock.

---

## 3. Data Leakage Prevention (PII Masking)

### 3.1 Anonymous API Sanitization
- Endpoint `GET /api/admin/status` and `/api/admin/auth/status` previously contained unmasked founder contact details.
- **Hardening Applied:** Raw email and phone removed from responses. Only masked representations are returned:
  - Email: `m••••••••••••2@gmail.com`
  - Phone: `+91 ••••• ••606`

---

## 4. Firestore Security Rules & Access Control

- **Users Collection (`/users/{userId}`):** Read allowed for authenticated users; write restricted to document owner or verified admin claim (`request.auth.token.admin == true`).
- **Events Collection (`/events/{slug}`):** Read open to all; create, update, delete strictly restricted to admins.
- **Registrations (`/registrations/{regId}`):** Read restricted to owner or admin; writes routed via authoritative backend server endpoint `/api/registrations/create` to prevent student seat tampering.
- **Audit Logs (`/adminAuditLogs/{logId}`):** Write-only by server; read-only by verified admins.
