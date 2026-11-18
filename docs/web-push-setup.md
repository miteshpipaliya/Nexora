# NEXORA Web Push setup (staging first)

1. Firebase Console → Project settings → Cloud Messaging → Web Push certificates → generate a VAPID key pair. Copy the **public key only**.
2. In Vercel, set `VITE_FIREBASE_VAPID_KEY` to that public VAPID key for the appropriate environment. Do not put a Firebase service-account private key in any `VITE_` variable.
3. Ensure the existing server-side Firebase Admin service account can access Firebase Cloud Messaging and Firestore. Confirm the Firebase Cloud Messaging API is enabled in the matching Google Cloud project.
4. Test on a public HTTPS origin, not an authentication-protected preview. The website and PWA must register `/sw.js` at their own origin.
5. Sign in, click **Enable Notifications**, accept the browser permission prompt, then publish a new **Everyone** broadcast from the admin panel. Test on Android Chrome, an iOS 16.4+ Home Screen installation, and desktop Chrome/Edge.
6. Test the notification when the app is backgrounded and the phone is locked; tap it to verify it opens the NEXORA link.
7. Test **Disable Notifications** and verify delivery stops for that device.
8. Run `npm run lint`, `npm test`, and `npm run build` before merging. Confirm Vercel preview is READY.

**Limitations in this first version:** push is sent immediately for newly published, unscheduled **Everyone** broadcasts only, to the first 500 subscribed devices. Future-scheduled announcements and audience-targeted notifications still use the existing in-app broadcast feed. Do not merge until those delivery requirements are addressed if needed. Native push delivery is best effort, not guaranteed, and cannot display while a phone is fully powered off.
