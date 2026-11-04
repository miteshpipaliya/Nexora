# NEXORA — Manual Administrative Operations & Action Guide (v5)

This guide documents required external actions in Brevo, Vercel, and Firestore for the site owner (**Founder & Lead Architect: Mitesh Pipaliya**).

---

## 1. Brevo Transactional Email Configuration (WP7)

Brevo strictly enforces domain authentication for transactional emails. Personal `@gmail.com` sender addresses fail with status 400 (`unverified_sender`) or 503.

### 1.1 Custom Domain Verification
1. Log in to [Brevo Dashboard](https://app.brevo.com) &rarr; **Senders, Domains & Dedicated IPs** &rarr; **Domains**.
2. Add your custom domain: `nexora-bvm.online`.
3. Add the provided DNS records to your domain registrar (Hostinger / Cloudflare):
   - **DKIM (TXT):** `mail._domainkey.nexora-bvm.online`
   - **SPF (TXT):** `v=spf1 include:spf.brevo.com ~all`
   - **Brevo Code (TXT):** `brevo-code...`
4. Wait for verification status to turn green (**Authenticated**).

### 1.2 Sender Address
1. Go to **Senders** &rarr; **Add a Sender**.
2. Name: `NEXORA Verification Desk`
3. Email: `no-reply@nexora-bvm.online` (or `noreply@nexora-bvm.online`).
4. Complete the verification confirmation.

### 1.3 Vercel Environment Variables
In Vercel Dashboard &rarr; Project `nexora` &rarr; **Settings** &rarr; **Environment Variables**:
- `BREVO_API_KEY`: `xkeysib-...` (active API key, without surrounding quotes)
- `BREVO_SENDER_EMAIL`: `no-reply@nexora-bvm.online`
- `BREVO_SENDER_NAME`: `NEXORA`

### 1.4 Diagnostics Endpoint
After deployment, verify email health using the admin-only diagnostics route:
```bash
curl -H "Authorization: Bearer <ADMIN_SESSION_TOKEN>" https://www.nexora-bvm.online/api/admin/email-diagnostics
```

---

## 2. Admin Security Password Setup & Recovery (WP6)

Admin password verification is stored permanently in Firestore document `_admin_security/founder` in database `ai-studio-nexorastudenttec-75ba3757-5549-44e3-a3ae-2ae34026863b` using `scrypt` hashing.

### 2.1 Setting Admin Password via CLI
Run the secure CLI recovery tool locally:
```bash
npm run admin:password -- --set
```
You will be prompted to enter and confirm the new admin password. The password is normalized (NFKC), salted with 16 cryptographically random bytes, hashed via scrypt, and written directly to Firestore with immediate read-back verification.

### 2.2 Clearing or Resetting Admin Password
```bash
npm run admin:password -- --clear
```

### 2.3 Vercel Environment Variable Cleanup
Once the password has been saved to Firestore, remove `ADMIN_SECURITY_PASSWORD` from Vercel environment variables to prevent plain-text exposure in configuration dashboards.

---

## 3. Competition Image and Capacity Management (WP4)

1. Open `/admin` &rarr; **Competitions**.
2. In the Competition Editor modal:
   - **Show Seat Limit Toggle:** Toggle "Show seat limit (registered / capacity)" ON or OFF.
   - When ON: The public card and details page display `{registered_count} / {capacity} seats filled` with a progress bar.
   - When OFF: The card displays `{registered_count} student(s) registered` (or "Be the first to register"), and hides capacity quotas and progress bars.
   - Ensure a suitable cover image is selected from the Image Library or preset list.

---

## 4. Team Member Management (WP5)

1. Open `/admin` &rarr; **Team Members**.
2. **Role Order:**
   - Standard roles are ordered 1 to 8, with Faculty Member at order #2.
   - You can edit any role's display order directly in the Roles list.
3. **Publishing:**
   - Toggle the **Publish** switch for any team member to immediately update their public visibility in Firestore.
   - Only published members (`enabled !== false`) appear on `/team`.
4. **Division:**
   - Enter student classroom division as free text (e.g., `A`, `B`, `C`, `Div 1`, up to 20 characters).
