# Internal Environment Variable Reference (Server-Side Only)

> **CONFIDENTIAL / DEVELOPER USE ONLY**  
> Do not commit real values or `.env` files to Git.  
> Set these variables in the **Vercel Project Settings > Environment Variables** for Production and Preview environments.

| Variable Name | Required | Server/Client | Description & Format |
|---|---|---|---|
| `PORT` | Optional (Dev: 3000) | Server-only | Port for Express dev and production listeners (defaults to 3000). |
| `NODE_ENV` | Optional | Server-only | `'production'` or `'development'`. Controls `.env` loading and error detail suppression. |
| `FIREBASE_SERVICE_ACCOUNT` | **Required** (or fallback keys) | Server-only | Full JSON string or base64-encoded string of the Google Cloud/Firebase service account private key. |
| `FIREBASE_PROJECT_ID` | Optional | Server-only | Firebase project ID (defaults to `gen-lang-client-0089073748`). |
| `FIREBASE_CLIENT_EMAIL` | Optional | Server-only | Alternative individual service account email when `FIREBASE_SERVICE_ACCOUNT` JSON is not set. |
| `FIREBASE_PRIVATE_KEY` | Optional | Server-only | Alternative individual private key (`-----BEGIN PRIVATE KEY-----...`). |
| `FIREBASE_API_KEY` | Optional | Server-only | Firebase Web API key used for backend identity verification and REST operations. |
| `BREVO_API_KEY` | **Required** | Server-only | Transactional email API key for Brevo (`xkeysib-...`) to deliver student and admin OTPs. |
| `BREVO_SENDER_EMAIL` | Optional | Server-only | Verified sender email configured in Brevo (e.g. `nexora.bvm@gmail.com`). |
| `BREVO_SENDER_NAME` | Optional | Server-only | Display name for outbound emails (e.g. `NEXORA BVM`). |
| `OTP_HMAC_SECRET` | **Required** | Server-only | Cryptographic secret (minimum 32 characters) for signing and verifying HMAC OTP challenge tokens. |
| `ADMIN_SECURITY_PASSWORD` | Optional | Server-only | Master fallback password for elevated admin initialization or recovery (minimum 16 chars). |
| `GEMINI_API_KEY` | Optional | Server-only | Google AI Studio Gemini API Key if backend AI services are invoked. |

### Critical Security Policies:
1. `.env` and `.env.example` must remain excluded from Git tracking via `.gitignore`.
2. Vercel environment variables are authoritative in production. `dotenv.config()` is restricted to development mode only and will never override production variables.
3. No secrets are prefixed with `VITE_` or bundled in client-side artifacts.
