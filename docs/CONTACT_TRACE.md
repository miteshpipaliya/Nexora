# NEXORA Contact Form Trace & Audit Findings

## Date: 2026-11-05
**Task**: Footer Contact Form Architecture & Failure Diagnosis (Prompt 1)

### 1. Form Location & Request Anatomy
- **File**: `src/components/layout/Footer.tsx`
- **Component**: `Footer` -> Section "Message the Initiative" (lines 160–225)
- **Form State**:
  - `senderName`: string (User name)
  - `senderEmail`: string (User email)
  - `contactSubject`: string (Default: 'NEXORA General Inquiry')
  - `contactMessage`: string (Message body)
  - `submitting`: boolean
  - `submitted`: boolean
  - `errorMsg`: string | null
- **Current Submission Flow**:
  - `handleQuickContact` in `Footer.tsx` calls `dataService.submitContactMessage({...})`.
  - `dataService.submitContactMessage` executes:
    `safeApiFetch('/api/contact/submit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })`

### 2. Server Routing & Catch-All 404 Verification
- **Entrypoint**: `server.ts`
- **Router Configuration**:
  - `export const apiRouter = express.Router();`
  - Routes are mounted via `app.use('/api', apiRouter);` and `app.use(apiRouter);`.
  - At line 2146 of `server.ts`:
    ```typescript
    app.use('/api', (req, res) => {
      res.status(404).json({ error: `API route not found: ${req.method} ${req.originalUrl || req.url}` });
    });
    ```
- **Finding**: Route `/contact/submit` (or `/api/contact/submit`) was **NOT registered** on `apiRouter`.
- **Root Cause Confirmed**: When the footer dispatched `POST /api/contact/submit`, Express evaluated the route table, found no matching handler on `apiRouter`, and fell through to the catch-all middleware, returning:
  `{"error": "API route not found: POST /api/contact/submit"}` with HTTP 404.
  This verbatim string was displayed in the red error badge in `Footer.tsx` as shown in the user screenshot.

### 3. Database Schema & Admin Visitor Inbox Compatibility
- **Collection**: `contactMessages`
- **Admin Inbox Consumer**: `src/pages/Admin/AdminPage.tsx` lines 3400–3550 & `dataService.subscribeContactMessages`
- **Expected Fields in `ContactMessage` interface (`src/types/index.ts`)**:
  - `id`: string (UUID / message ID)
  - `sender_name`: string
  - `sender_email`: string (lowercase)
  - `subject`: string
  - `message`: string
  - `status`: 'unread' | 'read' | 'archived' | 'replied' | 'resolved'
  - `created_at`: string (ISO 8601 string)
  - `created_ts`: server timestamp / number
  - `delivery_status`: 'stored' | 'email_sent' | 'email_failed' | 'email_pending'
  - `email_attempts`: number
  - `replies`?: Array<{ id: string; sender_name: string; message: string; created_at: string; is_admin_reply: boolean }>
- **Firestore Security Rules**:
  - `contactMessages` collection rule denies all client creates (`allow create: if false;`).
  - Writes MUST go through server-side Admin SDK (`db.collection('contactMessages').doc(id).set(...)`).

### 4. Email Notification Infrastructure
- **Mailer Module**: `src/server/brevoMailer.ts`
- **Sender Verification**: Brevo API requires an authenticated domain (e.g. `no-reply@nexora-bvm.online`), free-mail domains (`gmail.com`, etc.) are blocked.
- **Recipient**: Read from `process.env.CONTACT_NOTIFY_EMAIL` (defaults to `nexora.bvm@gmail.com` from site config).
- **Failure Resilience**: If Brevo fails or is unconfigured, the contact message document remains persisted in Firestore with `delivery_status: 'email_failed'`. The client receives a successful 201 response confirming the message was received. Admin inbox provides a retry button via `/api/admin/contact-messages/:id/retry-email`.
