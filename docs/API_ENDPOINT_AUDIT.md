# NEXORA — Complete API Endpoint Audit & Specification

**Host Base:** `https://www.nexora-bvm.online/api`  
**Router:** Express 4.x mounted on `/api` (compiled to standalone ESM `server.js` for Vercel Serverless Functions)  
**Security Framework:** Firebase Bearer ID Tokens, 15-Minute Elevated Admin HMAC-SHA256 Tokens, Brevo Transactional OTP Verification  

---

## 1. Authentication & Student OTP Endpoints

### 1.1 `POST /api/auth/send-email-otp`
- **Purpose:** Dispatches a 6-digit numeric verification OTP via Brevo Transactional Email.
- **Authentication:** Public (Protected by IP Rate Limiter: max 15 requests per 10 minutes; per-email cooldown: 30 seconds).
- **Request Body:**
  ```json
  {
    "email": "student@bvm.edu.in",
    "purpose": "signup" // or "reset-password"
  }
  ```
- **Validation:**
  - Valid RFC 5322 email string.
  - Enforces 30-second resend cooldown.
  - Generates cryptographic random 6-digit number (`crypto.randomInt(100000, 1000000)`).
  - Persists HMAC-SHA256 hash only. Raw OTP is never written to disk or database.
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "maskedEmail": "s•••••t@bvm.edu.in",
    "expiresInSeconds": 180,
    "resendCooldown": 30
  }
  ```
- **Error Codes:** `400 Bad Request`, `429 Too Many Requests`, `502 Bad Gateway` (Brevo failure).

---

### 1.2 `POST /api/auth/verify-email-otp`
- **Purpose:** Verifies the 6-digit OTP code against the server-stored HMAC hash.
- **Authentication:** Public.
- **Request Body:**
  ```json
  {
    "email": "student@bvm.edu.in",
    "otp": "491823",
    "purpose": "signup"
  }
  ```
- **Validation:**
  - 3-minute hard expiration window.
  - Max 5 incorrect attempts before challenge invalidation.
  - Constant-time HMAC comparison via `crypto.timingSafeEqual`.
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "verificationToken": "<stateless-signed-hmac-jwt>",
    "expiresAt": 1792834000000
  }
  ```
- **Error Codes:** `400 Bad Request` (expired/missing), `401 Unauthorized` (incorrect code), `429 Too Many Requests` (brute-force lockout).

---

### 1.3 `POST /api/auth/confirm-verified-signup`
- **Purpose:** Consumes authorization token and activates verified student profile in Firebase.
- **Authentication:** Public with valid `verificationToken`.
- **Request Body:**
  ```json
  {
    "email": "student@bvm.edu.in",
    "verificationToken": "<token>",
    "idToken": "<optional-firebase-id-token>"
  }
  ```
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Student email successfully verified."
  }
  ```

---

## 2. Administrator & Founder Security Endpoints

### 2.1 `ALL /api/admin/status` & `/api/admin/auth/status`
- **Purpose:** Checks if the Master Admin Security Password has been established.
- **Authentication:** Public (Conceals private contact information).
- **Privacy Standard:** Never returns unmasked founder email or phone number.
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "initialized": true,
    "maskedEmail": "m••••••••••••2@gmail.com",
    "maskedPhone": "+91 ••••• ••606"
  }
  ```

---

### 2.2 `POST /api/admin/auth/sync-claim`
- **Purpose:** Elevates custom admin claims (`{ admin: true }`) for pre-authorized administrator accounts upon login.
- **Authentication:** `Authorization: Bearer <firebase-id-token>`.
- **Allowed Emails:** `ADMIN_EMAILS` whitelist (`miteshpipaliya2202@gmail.com`, `mitesh.aiml@gmail.com`, `editwithvision@gmail.com`).
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "admin": true,
    "email": "miteshpipaliya2202@gmail.com",
    "message": "Admin claim verified."
  }
  ```
- **Error Codes:** `401 Unauthorized` (invalid token), `403 Forbidden` (email not in `ADMIN_EMAILS`).

---

### 2.3 `POST /api/admin/auth/verify-password`
- **Purpose:** Verifies high-entropy master admin password and initiates elevated 15-minute session.
- **Authentication:** Admin account.
- **Request Body:**
  ```json
  {
    "password": "<admin-security-password-16-chars-min>"
  }
  ```
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "sessionToken": "<signed-15min-admin-session-token>",
    "expiresAt": 1792835000000,
    "durationMinutes": 15
  }
  ```

---

### 2.4 `ALL /api/admin/session` & `/api/admin/auth/session`
- **Purpose:** Validates active elevated admin session token.
- **Authentication:** Header `x-admin-session: <token>` or `Authorization: Bearer <token>`.
- **Success Response (200 OK):**
  ```json
  {
    "authenticated": true,
    "expiresAt": 1792835000000,
    "remainingSeconds": 850
  }
  ```

---

## 3. Registrations & Event Management

### 3.1 `POST /api/registrations/create`
- **Purpose:** Authoritative backend event registration creation with atomic seat increments.
- **Authentication:** `Authorization: Bearer <firebase-id-token>`.
- **Request Body:**
  ```json
  {
    "event_slug": "brain-battle",
    "full_name": "Rohan Patel",
    "email": "rohan.patel@bvmengineering.ac.in",
    "phone_number": "+91 9876543210",
    "college": "Birla Vishvakarma Mahavidyalaya",
    "branch": "Computer Engineering",
    "academic_year": "3rd Year",
    "enrollment_number": "2208012015",
    "division": "CE-1",
    "team_name": "Turing Machines",
    "team_members": ["Aarav Shah", "Kavya Joshi", "Meera Desai", "Siddharth Dave"]
  }
  ```
- **Enforced Business Validations:**
  - **Brain Battle Squad Rule:** Requires exactly 5 students (1 leader + 4 team members). Rejects with `400 Bad Request` if size != 5.
  - **Coming Soon Lock:** Blocks registration with `403 Forbidden` if `isComingSoon === true`.
  - **Capacity Cap:** Blocks registration with `400 Bad Request` if `registered_count >= capacity`.
  - **Pricing Policy:** Auto-computes ₹50 for BVM students and ₹70 for external students.
- **Success Response (201 Created):**
  ```json
  {
    "success": true,
    "registration": {
      "id": "reg_1792834190_a81f",
      "reference_id": "NEX-BRAI-9X2KZ",
      "event_slug": "brain-battle",
      "full_name": "Rohan Patel",
      "registration_status": "Confirmed",
      "fee_paid": 50,
      "created_at": "2026-11-02T13:30:00.000Z"
    }
  }
  ```

---

### 3.2 `POST /api/admin/competitions`
- **Purpose:** Creates a new competition in Firestore.
- **Authentication:** Require Elevated Admin (`x-admin-session`).
- **Hard Limit:** Enforces maximum **15 competitions** in catalog.
- **Error Codes:** Returns `409 Conflict` with `limit: 15` if existing events count is 15.

---

### 3.3 `PUT /api/admin/competitions/:slug`
- **Purpose:** Updates existing competition metadata or toggles Coming Soon status.
- **Authentication:** Require Elevated Admin (`x-admin-session`).

---

### 3.4 `GET /api/admin/images` & `POST /api/admin/images`
- **Purpose:** Centralized Image Library management across 6 core categories.
- **Authentication:** Require Elevated Admin (`x-admin-session`).
