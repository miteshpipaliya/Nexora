import { app, auth } from './firebase';
import { getMessaging, getToken, deleteToken, isSupported, onMessage } from 'firebase/messaging';

const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined;

export async function enableNexoraPush(): Promise<void> {
  if (!auth.currentUser) throw new Error('Sign in to enable notifications.');
  if (!vapidKey) throw new Error('Firebase Web Push VAPID key is not configured.');
  if (!('Notification' in window) || !('serviceWorker' in navigator) || !(await isSupported())) {
    throw new Error('Push notifications are not supported in this browser.');
  }
  if (Notification.permission !== 'granted') {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') throw new Error('Notification permission was not granted.');
  }
  const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
  const token = await getToken(getMessaging(app), { vapidKey, serviceWorkerRegistration: registration });
  if (!token) throw new Error('Could not register this device for notifications.');
  const idToken = await auth.currentUser.getIdToken();
  const response = await fetch('/api/push/subscriptions', {
    method: 'POST', cache: 'no-store',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + idToken },
    body: JSON.stringify({ token })
  });
  if (!response.ok) throw new Error('Could not save notification subscription.');
}
export async function disableNexoraPush(): Promise<void> {
  if (!auth.currentUser) return;
  if (!(await isSupported())) return;
  const messaging = getMessaging(app);
  const registration = await navigator.serviceWorker.ready;
  const token = vapidKey ? await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration }).catch(() => null) : null;
  if (token) {
    const idToken = await auth.currentUser.getIdToken();
    const response = await fetch('/api/push/subscriptions', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + idToken },
      body: JSON.stringify({ token })
    });
    if (!response.ok) throw new Error('Could not remove notification subscription.');
  }
  await deleteToken(messaging);
}

/** Show a notification when the web app is focused; background delivery uses /sw.js. */
export async function listenForForegroundPush(): Promise<() => void> {
  if (!(await isSupported())) return () => {};
  return onMessage(getMessaging(app), payload => {
    const data = payload.data || {};
    if (Notification.permission !== 'granted') return;
    const title = String(data.title || payload.notification?.title || 'NEXORA BVM');
    const url = typeof data.url === 'string' && data.url.startsWith('/') && !data.url.startsWith('//') ? data.url : '/';
    navigator.serviceWorker.ready.then(registration =>
      registration.showNotification(title, {
        body: String(data.body || payload.notification?.body || ''),
        icon: '/pwa-phoenix-192.png',
        tag: String(data.broadcastId || 'nexora-broadcast'),
        data: { url }
      })
    ).catch(error => console.warn('Foreground push display unavailable:', error));
  });
}
