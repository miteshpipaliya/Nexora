# NEXORA — Safe Vercel Deployment Checklist

**Repository:** `https://github.com/miteshpipaliya/Nexora`
**Production branch:** `main`
**Audit branch:** `codex/nexora-production-audit`
**Production site:** `https://nexora-bvm.online`

## 1. Local verification

Run these from the repository root before pushing an audit branch update:

```bash
npm run typecheck
npm test
npm run build
```

Review `git status` and `git diff --check`. Never stage `.env` files, credentials, OTPs, or generated local state.

## 2. Vercel project settings

Confirm the `nexora` project is connected to `miteshpipaliya/Nexora`, uses Vite, builds with `npm run build`, and outputs `dist`. The repository requires Node.js `24.x` as declared in `package.json`.

Before using a Preview deployment for authentication or email testing, configure **Preview only** with a dedicated staging Firebase project and named Firestore database. Do not reuse Production Firebase credentials or database identifiers.

Preview client configuration:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIRESTORE_DATABASE_ID`

Preview server configuration:

- `FIREBASE_SERVICE_ACCOUNT` for the staging project, or `FIREBASE_CLIENT_EMAIL` and `FIREBASE_PRIVATE_KEY`
- `FIREBASE_PROJECT_ID` matching the staging project
- `FIRESTORE_DATABASE_ID` matching its staging database
- `OTP_HMAC_SECRET` with at least 32 characters
- `BREVO_API_KEY`
- `BREVO_SENDER_NAME` (`NEXORA`)
- `BREVO_SENDER_EMAIL` (verified sender on `nexora-bvm.online`)
- `BREVO_REPLY_TO` (`nexora.bvm@gmail.com`)

Do not put service-account credentials, Brevo keys, or HMAC secrets in any `VITE_*` variable.

## 3. Audit Preview and production release

Push reviewed work only to `codex/nexora-production-audit`. Confirm Vercel created a **Preview** deployment for that branch and inspect its build and runtime logs. Exercise Firebase Auth, Firestore, and Brevo only against staging resources. A successful build alone does not confirm email delivery or inbox receipt.

Do not merge into `main`, promote a deployment, change production environment variables, alter DNS, or invalidate administrator credentials without the owner's separate approval. Before any later production release, compare the intended commit and environment against the approved Preview results and retain the existing production Firebase project, database, and user data.
