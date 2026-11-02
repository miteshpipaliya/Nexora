# NEXORA — Production Deployment Checklist (Vercel + GitHub)

**Target Production Branch:** `main`  
**Connected Repository:** `https://github.com/miteshpipaliya/Nexora`  
**Production Site:** `https://www.nexora-bvm.online`  

---

## 1. Pre-Commit Verification (Local Machine)

Before pushing any commit to `main`, execute the complete verification sequence:

```bash
# 1. Typecheck the entire codebase
npx tsc --noEmit

# 2. Run automated test suites
npm test

# 3. Verify production compilation and esbuild server bundling
npm run build

# 4. Run local Vercel serverless bundle simulation
bash scripts/verify-vercel-build.sh
```

**All 4 commands must exit with status 0.**

---

## 2. Git Hygiene & Ignored Files Check

Verify that local credentials are never staged or committed:

```bash
# Check git status for untracked environment files
git status

# Ensure .env and .env.example are untracked
git ls-files | grep -E "^\.env"
# (Output should be empty)
```

---

## 3. Vercel Dashboard Project Configuration

In the Vercel Dashboard for `nexora`:

1. **Framework Preset:** Vite
2. **Build Command:** `npm run build`
3. **Output Directory:** `dist`
4. **Install Command:** `npm install`
5. **Node.js Version:** 20.x or 22.x
6. **Environment Variables:** Verify all required variables are set:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
   - `BREVO_API_KEY`
   - `BREVO_SENDER_EMAIL` (`nexora.bvm@gmail.com`)
   - `BREVO_SENDER_NAME` (`NEXORA`)
   - `OTP_HMAC_SECRET`

---

## 4. Deployment Trigger & Rollout

1. Commit changes to `main`:
   ```bash
   git add .
   git commit -m "fix(prod): resolve vercel bundling, elevate admin claim sync, and enforce 15 competition ceiling"
   git push origin main
   ```
2. Open Vercel Deployments view.
3. Monitor the build logs:
   - Client build (`vite build`) generates static chunks in `dist/`.
   - Server build (`esbuild server.ts --bundle --platform=node --format=esm --outfile=server.js --packages=external`) produces unified `server.js`.
   - Vercel Serverless Function `/api/index.ts` loads bundled server.
4. Verify Deployment state shows **Ready (Production)**.

---

## 5. Post-Deployment Verification

1. Navigate to `https://www.nexora-bvm.online`.
2. Inspect browser console for clean initialization (no errors or uncaught exceptions).
3. Check `/competitions`: Verify all 10 competitions display high-res local images with 0 broken images.
4. Check `/auth`: Test student OTP dispatch.
5. Check `/admin`: Log in with `miteshpipaliya2202@gmail.com`, verify Admin Claim sync, and authenticate with Admin Security Password.
