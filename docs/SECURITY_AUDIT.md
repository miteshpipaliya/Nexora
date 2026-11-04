# NEXORA — Security Architecture & Hardening Record

**Application:** NEXORA (Student Technology & Innovation Community, BVM)
**Review basis:** OWASP ASVS and Web Security Testing Guide principles; this document is not a compliance certification.

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

---

## 5. Release Readiness Review — 2026-11-04

### 5.1 Preview startup and isolation

- Vercel's `codex/nexora-production-audit` Preview environment has no configured variables. The Preview API import fails closed with `ConfigError: OTP_HMAC_SECRET must be configured with at least 32 characters in serverless environments.` This is missing Preview configuration, not evidence that a Production credential or database was used.
- The Preview deployment serves its HTML, but `/api/health` returned `500 FUNCTION_INVOCATION_FAILED`. Firebase Auth, Firestore, Brevo, and the browser experience cannot be integration-tested until isolated Preview settings are added.
- Do not remove the serverless HMAC requirement or Preview Firebase isolation check to make the Preview appear healthy.

### 5.2 Production Firebase configuration verification limit

- The committed frontend Firebase project/database settings match the backend's Production fallback project/database identifiers.
- Vercel shows Production-targeted `FIREBASE_SERVICE_ACCOUNT`, but its secret value is not available through the connected account's metadata response. The service account's `project_id` therefore could not be independently compared with the frontend project. Production `FIREBASE_PROJECT_ID` is not separately configured.
- Before a Production release, the owner must confirm in Vercel/Firebase that the service account belongs to the same Firebase project and has the required Auth and Firestore permissions. No credential value should be copied into Git or shared in chat.

### 5.3 Dependency advisory review

- `body-parser` was updated to `1.20.9`, fixing the reported High compressed-body denial-of-service advisory.
- `bun audit` still reports `@grpc/grpc-js` advisories because Firebase's Firestore web package pins a Node-targeted `1.9.x` dependency. The Firebase Admin Firestore runtime resolves `@grpc/grpc-js` `1.14.6`, and the Vite browser bundle contains no gRPC package code. Do not force an override that violates Firebase's declared dependency range without compatibility testing.
- `glob` and `minimatch` remain Moderate transitive advisories through `rimraf`; no direct application imports were found. They remain visible in the dependency audit and require follow-up when upstream ranges permit safe updates.

### 5.4 Checks not completed

- `npm run rules:test` currently fails because `tests/rules.test.ts` does not exist. Firestore rules were inspected statically (including default deny and internal collection denials), but their behavior was not verified against the Firebase emulator.
- Student/Admin Firebase workflows, Firestore authorization, registration, responsive UI, and real Brevo delivery were not integration-tested. Staging credentials and authorized test accounts are required. No actual OTP email was sent or inbox receipt confirmed.

### 5.5 Medium and Low findings

- The Vercel security header is `Content-Security-Policy-Report-Only`; it reports policy violations but does not enforce the policy. No exploitable XSS was confirmed in this review, but CSP is not an active blocking control.
- Firestore permits clients with a verified `admin` claim to create `/adminAuditLogs` documents, and the frontend writes those documents directly. Ordinary users are denied, but an administrator client can add fabricated entries; treat the collection as operational history rather than tamper-proof evidence.
- Moderate `glob`/`minimatch` and Low `@grpc/grpc-js` advisories remain in the transitive lockfile graph as described above. No direct imports or gRPC code were found in the browser bundle, and Admin Firestore resolves the patched gRPC version, but `bun audit` still reports them.

### 5.6 Release gate

Do not merge or deploy to Production until isolated Preview configuration is present, the Preview API returns 200, Firebase service-account project alignment is confirmed, Firestore rules are tested, and the required staging integration checks pass. The existing Production deployment and data remain unchanged.
