import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, MapPin, Building, Send, CheckCircle2, AlertCircle } from 'lucide-react';
import { dataService } from '../../services/dataService';
import { NexoraLogo } from '../ui/NexoraLogo';

export const Footer: React.FC = () => {
  const [contactSubject, setContactSubject] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [senderName, setSenderName] = useState('');
  const [senderEmail, setSenderEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleQuickContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!senderName.trim() || !senderEmail.trim() || !contactMessage.trim()) return;

    setSubmitting(true);
    setErrorMsg(null);
    try {
      await dataService.submitContactMessage({
        sender_name: senderName.trim(),
        sender_email: senderEmail.trim(),
        subject: contactSubject.trim() || 'NEXORA General Inquiry',
        message: contactMessage.trim()
      });
      setSubmitted(true);
      setSenderName('');
      setSenderEmail('');
      setContactSubject('');
      setContactMessage('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Unable to dispatch message at this time.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <footer className="w-full bg-[#08080D]/80 backdrop-blur-md border-t border-violet-500/15 pt-16 pb-12 text-slate-400 relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-violet-500/10">
          
          {/* Brand & Purpose Column */}
          <div className="lg:col-span-2 space-y-4">
            <Link to="/" className="inline-block user-select-none" aria-label="NEXORA Home">
              <NexoraLogo size="md" />
            </Link>

            <p className="text-sm text-slate-300 max-w-sm leading-relaxed user-select-none">
              Beyond a Club. The Beginning of a New Tech Era. Proposed student innovation platform at Birla Vishvakarma Mahavidyalaya (BVM).
            </p>

            <div className="pt-2 text-xs text-slate-400 space-y-2 font-mono">
              <div className="flex items-center gap-2 user-select-none">
                <Building className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                <span>Birla Vishvakarma Mahavidyalaya</span>
              </div>
              <div className="flex items-center gap-2 user-select-none">
                <MapPin className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                <span>Vallabh Vidyanagar, Gujarat, India</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                <a
                  href="mailto:nexora.bvm@gmail.com"
                  className="hover:text-violet-300 transition-colors selectable-content select-text text-slate-200"
                >
                  nexora.bvm@gmail.com
                </a>
              </div>
            </div>

            <div className="pt-3">
              <a
                href="mailto:nexora.bvm@gmail.com?subject=NEXORA%20Student%20Innovation%20Inquiry"
                className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium text-violet-200 bg-violet-950/60 border border-violet-500/25 rounded-lg hover:bg-violet-900/60 transition-colors"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Draft Direct Email to Organizer</span>
              </a>
            </div>
          </div>

          {/* Navigation Links (Store removed) */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider font-mono user-select-none">
              Platform
            </h4>
            <ul className="space-y-2 text-sm user-select-none">
              <li>
                <Link to="/" className="hover:text-white transition-colors">Home</Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-white transition-colors">About NEXORA</Link>
              </li>
              <li>
                <Link to="/competitions" className="hover:text-white transition-colors">Competitions Hub</Link>
              </li>
              <li>
                <Link to="/team" className="hover:text-white transition-colors">Founding Team</Link>
              </li>
              <li>
                <Link to="/profile" className="hover:text-white transition-colors">Student Profile</Link>
              </li>
            </ul>
          </div>

          {/* Competitions */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider font-mono user-select-none">
              Competitions
            </h4>
            <ul className="space-y-2 text-sm user-select-none">
              <li>
                <Link to="/competitions/zerocode" className="hover:text-white transition-colors">ZeroCode Challenge</Link>
              </li>
              <li>
                <Link to="/competitions/ctf" className="hover:text-white transition-colors">Capture The Flag (CTF)</Link>
              </li>
              <li>
                <Link to="/competitions/hackathon" className="hover:text-white transition-colors">NEXORA Hackathon</Link>
              </li>
              <li>
                <Link to="/competitions/coderush" className="hover:text-white transition-colors">CodeRush Algorithmic</Link>
              </li>
              <li>
                <Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
              </li>
              <li>
                <Link to="/terms" className="hover:text-white transition-colors">Terms of Participation</Link>
              </li>
            </ul>
          </div>

          {/* Quick Connect & Institutional Transparency */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider font-mono user-select-none">
              Message the Initiative
            </h4>
            {submitted ? (
              <div className="p-3 bg-violet-950/40 border border-violet-500/30 rounded-lg text-xs text-violet-200 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
                <span>Thank you. Your message has been saved for review by the student founder.</span>
              </div>
            ) : (
              <form onSubmit={handleQuickContact} className="space-y-2">
                {errorMsg && (
                  <div className="p-2 bg-red-950/40 border border-red-500/30 rounded text-[11px] text-red-300 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}
                <input
                  type="text"
                  placeholder="Your Name"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  required
                  className="w-full px-2.5 py-1.5 text-xs bg-[#11101B] border border-violet-500/20 rounded-md text-white placeholder-slate-500 focus:outline-none focus:border-violet-400 select-text"
                />
                <input
                  type="email"
                  placeholder="Your Email"
                  value={senderEmail}
                  onChange={(e) => setSenderEmail(e.target.value)}
                  required
                  className="w-full px-2.5 py-1.5 text-xs bg-[#11101B] border border-violet-500/20 rounded-md text-white placeholder-slate-500 focus:outline-none focus:border-violet-400 select-text"
                />
                <textarea
                  placeholder="Your thoughts, questions, or faculty inquiry..."
                  rows={2}
                  value={contactMessage}
                  onChange={(e) => setContactMessage(e.target.value)}
                  required
                  className="w-full px-2.5 py-1.5 text-xs bg-[#11101B] border border-violet-500/20 rounded-md text-white placeholder-slate-500 focus:outline-none focus:border-violet-400 select-text"
                />
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-1.5 text-xs font-medium text-white bg-violet-600 rounded-md hover:bg-violet-500 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-60 cursor-pointer"
                >
                  <Send className="w-3 h-3" />
                  <span>{submitting ? 'Sending...' : 'Send Message'}</span>
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 user-select-none">
          <p className="font-mono text-center sm:text-left text-slate-400">
            Built by Students. Driven by Innovation.
          </p>
          <p className="text-center sm:text-right text-[11px] text-slate-500">
            NEXORA is a proposed student initiative at Birla Vishvakarma Mahavidyalaya (BVM).
          </p>
        </div>
      </div>
    </footer>
  );
};
