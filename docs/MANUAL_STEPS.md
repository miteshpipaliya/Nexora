# NEXORA Owner Manual Steps

The following steps require external provider access (Vercel, Google Search Console, BigRock DNS, Brevo, Firebase Console) and must be completed by the project owner:

---

## 1. Domain Redirect & Production Apex Resolution (Vercel)
1. Open [Vercel Dashboard](https://vercel.com) → Select project `Nexora`.
2. Navigate to **Settings** → **Domains**.
3. Confirm that both `nexora-bvm.online` and `www.nexora-bvm.online` are added.
4. Set the apex domain `nexora-bvm.online` to redirect with status **301 (Permanent)** or **308** to `https://www.nexora-bvm.online`.
5. Ensure SSL certificates for both domains are active and green.

---

## 2. Google Search Console: Favicon Crawl & Indexing Request
1. Open [Google Search Console](https://search.google.com/search-console).
2. Add `nexora-bvm.online` as a **Domain property** (verify via DNS TXT record in your BigRock DNS management portal).
3. In Search Console, select `https://www.nexora-bvm.online` and open **URL Inspection**.
4. Enter `https://www.nexora-bvm.online/` and click **Test Live URL**.
5. Once live verification passes, click **Request Indexing**.
6. Under **Sitemaps**, submit: `https://www.nexora-bvm.online/sitemap.xml`.
7. **Verification URL**: Check `https://www.google.com/s2/favicons?domain=www.nexora-bvm.online&sz=64`. When Google's crawler processes the updated homepage, this URL will display the purple star logo instead of the grey globe.

---

## 3. Brevo Transactional Email Sender & Contact Notification
1. Ensure your custom domain `nexora-bvm.online` is authenticated in [Brevo Dashboard](https://app.brevo.com) (Senders & IP → Domains → DNS SPF & DKIM records in BigRock).
2. Set Vercel Environment Variables (Settings → Environment Variables) for Production and Preview:
   - `BREVO_SENDER_EMAIL`: `no-reply@nexora-bvm.online` (or your verified domain email)
   - `CONTACT_NOTIFY_EMAIL`: `miteshpipaliya2202@gmail.com` (organizer inbox for contact messages)
3. Trigger a redeployment in Vercel to pick up the updated variables.

---

## 4. Firestore TTL Policy for Presence Sessions (Firebase Console)
1. Open [Firebase Console](https://console.firebase.google.com) → Select project database `ai-studio-nexorastudenttec-75ba3757-5549-44e3-a3ae-2ae34026863b`.
2. Navigate to **Firestore Database** → **Data** → **Time-to-Live (TTL)**.
3. Click **Add Policy**:
   - Collection group: `presenceSessions`
   - Timestamp field: `expireAt`
4. Confirm creation. Firestore will automatically purge inactive presence session documents older than 24 hours at zero cost.
