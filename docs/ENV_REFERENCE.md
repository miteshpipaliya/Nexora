# Internal Environment Variable Reference (Server-Side Only)

> **CONFIDENTIAL / DEVELOPER USE ONLY**  
> Do not commit real values or `.env` files to Git.  
> Set these variables in the **Vercel Project Settings > Environment Variables** for Production and Preview environments.

| Variable Name | Required | Server/Client | Description & Format |
|---|---|---|---|
| `PORT` | Optional (Dev: 3000) | Server-only | Port for Express dev and production listeners (defaults to 3000). |
| `NODE_ENV` | Optional | Server-only | `'production'` or `'development'`. Controls `.env` loading and error detail suppression. |
| `FIREBASE_SERVICE_ACCOUNT` | **Required for serverless Admin SDK** (or both fallback keys) | Server-only | Raw JSON or base64-encoded service account JSON with `project_id`, `client_email`, and `private_key`. Grant it only the Firebase Auth and Firestore access this backend needs. |
| `FIREBASE_PROJECT_ID` | Optional with the fallback keys | Server-only | Project ID when using the individual service account fields; raw service account JSON supplies its own project ID. |
| `FIREBASE_CLIENT_EMAIL` | Required with `FIREBASE_PRIVATE_KEY` | Server-only | Service account email alternative when `FIREBASE_SERVICE_ACCOUNT` is not used. |
| `FIREBASE_PRIVATE_KEY` | Required with `FIREBASE_CLIENT_EMAIL` | Server-only | Service account private key; keep server-side and preserve newline formatting. |
| `FIRESTORE_DATABASE_ID` | Required in Preview | Server-only | Named Firestore database for the matching Firebase project. Set to the staging database ID in Preview; Production retains the existing production database. |
| `BREVO_API_KEY` | **Required** | Server-only | Transactional email API key for Brevo (`xkeysib-...`) to deliver student and admin OTPs. |
| `BREVO_SENDER_EMAIL` | **Required** | Server-only | Sender address verified with Brevo on `nexora-bvm.online`. |
| `BREVO_SENDER_NAME` | Optional | Server-only | Display name for outbound emails (e.g. `NEXORA`). |
| `BREVO_REPLY_TO` | Optional | Server-only | Reply-to address; `BREVO_REPLY_TO_EMAIL` remains supported as a legacy alias. |
| `OTP_HMAC_SECRET` | **Required** | Server-only | Cryptographic secret (minimum 32 characters) for signing and verifying HMAC OTP challenge tokens. |
| `GEMINI_API_KEY` | Optional | Server-only | Google AI Studio Gemini API Key if backend AI services are invoked. |

### Isolated Vercel Preview Firebase configuration

Preview deployments must use a separate staging Firebase project and must not fall back to the committed Production Firebase config. Set these client-visible Firebase project settings for the **Preview** target only:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIRESTORE_DATABASE_ID`

Set these server-side values for Preview and ensure the service account belongs to that same staging project:

- `FIREBASE_SERVICE_ACCOUNT` (staging service account; never copy Production credentials), or `FIREBASE_CLIENT_EMAIL` plus `FIREBASE_PRIVATE_KEY`
- `FIREBASE_PROJECT_ID` (same staging project ID)
- `FIRESTORE_DATABASE_ID` (same staging database ID)
- `OTP_HMAC_SECRET`

Brevo also needs Preview-targeted `BREVO_API_KEY`, `BREVO_SENDER_NAME`, `BREVO_SENDER_EMAIL`, and `BREVO_REPLY_TO` values before OTP email can be tested there. Values prefixed with `VITE_` are bundled into browser code and must contain only public Firebase client configuration, never credentials.

### Critical Security Policies:
1. `.env` and `.env.example` must remain excluded from Git tracking via `.gitignore`.
2. Vercel environment variables are authoritative in production. `dotenv.config()` is restricted to development mode only and will never override production variables.
3. No secrets are prefixed with `VITE_` or bundled in client-side artifacts.
