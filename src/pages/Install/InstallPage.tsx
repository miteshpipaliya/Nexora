import React from 'react';
import { Smartphone, Share2, CheckCircle2, Globe2, ShieldCheck } from 'lucide-react';
import { isInstalledMobilePwa } from '../../pwa/mobilePwa';

export const InstallPage: React.FC = () => {
  const installed = isInstalledMobilePwa();
  return (
    <section className="min-h-[75vh] bg-[#08080D] px-4 py-14 text-slate-100">
      <div className="mx-auto max-w-4xl text-center">
        <img src="/images/intro/NEXORA%20LOGO.png" alt="NEXORA purple phoenix logo" className="mx-auto h-40 w-40 object-contain sm:h-52 sm:w-52" decoding="async" />
        <p className="mt-5 text-xs font-semibold uppercase tracking-[.3em] text-violet-300">Official mobile web app</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-5xl">NEXORA BVM — Mobile PWA Guide</h1>
        <p className="mx-auto mt-4 max-w-2xl text-slate-300">Add NEXORA to your Android or iPhone home screen using your browser. No APK, IPA, or separate account is needed. The website and installed app share the same live competitions, announcements and registrations.</p>
        {installed && <p role="status" className="mt-6 inline-flex items-center gap-2 rounded-full border border-emerald-500/40 px-4 py-2 text-emerald-300"><CheckCircle2 size={18}/> Running as an installed mobile app</p>}
        <div className="mt-10 grid gap-5 text-left md:grid-cols-2">
          <article className="rounded-2xl border border-violet-500/30 bg-[#151024] p-6">
            <Smartphone className="text-violet-300" size={28}/>
            <h2 className="mt-4 text-xl font-bold">Android — Chrome or Brave</h2>
            <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-6 text-slate-300">
              <li>Open the official NEXORA website in Chrome or Brave on your Android phone.</li>
              <li>Tap the browser's three-dot menu (⋮).</li>
              <li>Select <strong className="text-white">Install app</strong> or <strong className="text-white">Add to Home screen</strong>.</li>
              <li>Choose <strong className="text-white">Install</strong> if offered, and confirm.</li>
              <li>Open the NEXORA BVM icon from your phone's home screen.</li>
            </ol>
            <p className="mt-5 rounded-lg bg-violet-500/10 p-3 text-xs leading-5 text-violet-200">Firefox Android: use its menu → Add to Home screen. Some browsers create a shortcut rather than a standalone app. If Chrome says “This app cannot be installed,” do not mistake Create shortcut for a successful PWA installation.</p>
          </article>
          <article className="rounded-2xl border border-violet-500/30 bg-[#151024] p-6">
            <Share2 className="text-violet-300" size={28}/>
            <h2 className="mt-4 text-xl font-bold">iPhone / iOS — Safari</h2>
            <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-6 text-slate-300">
              <li>Open the official NEXORA website in Safari.</li>
              <li>Tap <strong className="text-white">Share</strong> (square with upward arrow).</li>
              <li>Choose <strong className="text-white">Add to Home Screen</strong>.</li>
              <li>Enable <strong className="text-white">Open as Web App</strong> if shown, then tap <strong className="text-white">Add</strong>.</li>
              <li>Launch NEXORA BVM from your home screen.</li>
            </ol>
            <p className="mt-5 rounded-lg bg-violet-500/10 p-3 text-xs leading-5 text-violet-200">iOS uses Add to Home Screen, not an APK or IPA download. Available menu options depend on iOS and browser version.</p>
          </article>
        </div>
        <div className="mx-auto mt-8 max-w-2xl rounded-xl border border-violet-500/20 bg-[#151024] p-5 text-left">
          <h2 className="flex items-center gap-2 font-semibold"><ShieldCheck size={19} className="text-violet-300"/> Installation troubleshooting</h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">Use the official production domain after PWA release. Temporary Vercel previews may be protected and cannot always be installed. If installation fails, confirm that the website loads normally and that its manifest and app icons are publicly accessible. A shortcut is not the same as a standalone PWA.</p>
        </div>
        <p className="mt-8 flex items-center justify-center gap-2 text-sm text-slate-400"><Globe2 size={17}/> One NEXORA backend across website, Android and iOS.</p>
      </div>
    </section>
  );
};
