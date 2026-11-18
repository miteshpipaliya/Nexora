import React, { useEffect, useState } from 'react';
import { Download, Smartphone, Share2, CheckCircle2, Globe2 } from 'lucide-react';
import { isInstalledMobilePwa, getMobileInstallPrompt, clearMobileInstallPrompt, type MobileInstallPrompt } from '../../pwa/mobilePwa';


export const InstallPage: React.FC = () => {
  const [promptEvent, setPromptEvent] = useState<MobileInstallPrompt | null>(() => getMobileInstallPrompt());
  const [installed, setInstalled] = useState(() => isInstalledMobilePwa());
  const [message, setMessage] = useState('');
  useEffect(() => {
    const onPrompt = () => { setPromptEvent(getMobileInstallPrompt()); };
    const onInstalled = () => { setInstalled(true); setPromptEvent(null); };
    window.addEventListener('nexora-install-available', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => { window.removeEventListener('nexora-install-available', onPrompt); window.removeEventListener('appinstalled', onInstalled); };
  }, []);
  const installAndroid = async () => {
    if (!promptEvent) { setMessage('Your browser has not offered an automatic install prompt. Use its menu: Chrome or Brave → Install app / Add to Home screen; Firefox Android → Add to Home screen. On desktop, open this page on your phone.'); return; }
    try { await promptEvent.prompt(); const result = await promptEvent.userChoice; setMessage(result.outcome === 'accepted' ? 'Installation accepted. Check your home screen.' : 'You can install later from the Chrome menu.'); clearMobileInstallPrompt(); setPromptEvent(null); }
    catch { setMessage('Use the browser menu and choose Install app or Add to Home screen.'); }
  };
  return <section className="min-h-[75vh] bg-[#08080D] px-4 py-14 text-slate-100">
    <div className="mx-auto max-w-4xl text-center">
      <img src="/images/intro/NEXORA%20LOGO.png" alt="NEXORA purple phoenix logo" className="mx-auto h-40 w-40 object-contain sm:h-52 sm:w-52" decoding="async" />
      <p className="mt-5 text-xs font-semibold uppercase tracking-[.3em] text-violet-300">Official mobile web app</p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-5xl">Install NEXORA BVM</h1>
      <p className="mx-auto mt-4 max-w-2xl text-slate-300">The same NEXORA experience, directly on your Android or iPhone home screen. Competitions, announcements, profiles and registrations stay connected to the same live website and database.</p>
      {installed && <p role="status" className="mt-6 inline-flex items-center gap-2 rounded-full border border-emerald-500/40 px-4 py-2 text-emerald-300"><CheckCircle2 size={18}/> NEXORA is running as an installed mobile app</p>}
      <div className="mt-10 grid gap-5 text-left md:grid-cols-2">
        <article className="rounded-2xl border border-violet-500/30 bg-[#151024] p-6">
          <Smartphone className="text-violet-300" size={28}/>
          <h2 className="mt-4 text-xl font-bold">Android</h2>
          <p className="mt-2 text-sm text-slate-300">Install from Chrome or Brave when supported. Firefox on Android can add a home-screen shortcut. No APK download required.</p>
          <button type="button" onClick={installAndroid} className="mt-6 w-full rounded-xl bg-violet-600 px-5 py-3 font-semibold text-white hover:bg-violet-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-300"><Download className="mr-2 inline-block" size={18}/>{promptEvent ? 'Install NEXORA BVM' : 'Show Android install instructions'}</button>
          <p className="mt-4 text-sm text-slate-400">Chrome / Brave: browser menu (⋮) → Install app or Add to Home screen. Firefox: browser menu → Add to Home screen. If the browser cannot offer installation, use Chrome on Android.</p>
        </article>
        <article className="rounded-2xl border border-violet-500/30 bg-[#151024] p-6">
          <Share2 className="text-violet-300" size={28}/>
          <h2 className="mt-4 text-xl font-bold">iPhone / iOS</h2>
          <p className="mt-2 text-sm text-slate-300">Apple installs web apps through the browser's Add to Home Screen feature, not an IPA download.</p>
          <div className="mt-6 rounded-xl border border-violet-400/30 bg-violet-500/10 px-4 py-3 text-sm text-violet-100">1. Open this page in Safari.<br/>2. Tap Share.<br/>3. Choose Add to Home Screen.<br/>4. Tap Add.</div>
          <p className="mt-4 text-sm text-slate-400">On supported iOS versions, you can choose Open as Web App when offered.</p>
        </article>
      </div>
      {message && <p role="status" className="mt-6 text-sm text-violet-200">{message}</p>}
      <div className="mt-8 flex items-center justify-center gap-2 text-sm text-slate-400"><Globe2 size={17}/> One NEXORA account and backend across web, Android and iOS.</div>
    </div>
  </section>;
};
