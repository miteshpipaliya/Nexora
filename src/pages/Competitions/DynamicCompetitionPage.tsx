import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Clock, 
  Sparkles, 
  Trophy, 
  Calendar, 
  MapPin, 
  Users, 
  CheckCircle2, 
  HelpCircle, 
  ShieldAlert, 
  FileText, 
  Gift, 
  AlertCircle,
  ExternalLink,
  Edit,
  Mail,
  Phone
} from 'lucide-react';
import { dataService } from '../../services/dataService';
import { CompetitionEvent } from '../../types';
import { EventRegistrationModal } from '../../components/forms/EventRegistrationModal';
import { useAuth } from '../../context/AuthContext';

export const DynamicCompetitionPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  const [event, setEvent] = useState<CompetitionEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [brokenImage, setBrokenImage] = useState(false);

  useEffect(() => {
    if (!slug) return;

    // Real-time listener so any admin edit propagates immediately
    const unsubscribe = dataService.subscribeEvents((allEvents) => {
      const match = allEvents.find((e) => e.slug.toLowerCase() === slug.toLowerCase());
      if (match) {
        setEvent(match);
        setNotFound(false);
        setLoading(false);
      } else {
        // Attempt single fetch fallback
        dataService.getEventBySlug(slug)
          .then((ev) => {
            if (ev) {
              setEvent(ev);
              setNotFound(false);
            } else {
              setNotFound(true);
            }
          })
          .catch(() => setNotFound(true))
          .finally(() => setLoading(false));
      }
    });

    return () => unsubscribe();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 space-y-4">
        <div className="w-10 h-10 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-mono text-slate-400">Loading competition specifications...</span>
      </div>
    );
  }

  // If unpublished or draft and not admin, hide
  const isUnpublished = event && (event.status === 'Draft' || event.status === 'Archived');
  if (notFound || !event || (isUnpublished && !isAdmin)) {
    return (
      <div className="py-24 px-4 max-w-md mx-auto text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-violet-950/60 border border-violet-500/30 flex items-center justify-center mx-auto text-violet-400">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Competition Unavailable</h1>
        <p className="text-sm text-slate-300 font-light leading-relaxed">
          The requested challenge is currently in private draft status or has concluded.
        </p>
        <Link
          to="/competitions"
          className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-violet-600 rounded-xl hover:bg-violet-500 transition-colors shadow-md"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Browse Available Competitions</span>
        </Link>
      </div>
    );
  }

  const isRegistrationClosed = !event.registration_open || (event.capacity > 0 && event.registered_count >= event.capacity);
  const bannerSrc = event.cover_image || event.banner_image || '/images/competitions/zerocode.jpg';

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-16">
      
      {/* Navigation & Admin Bar */}
      <div className="flex items-center justify-between">
        <Link
          to="/competitions"
          className="inline-flex items-center gap-2 text-xs font-mono text-slate-400 hover:text-white transition-colors user-select-none"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to All Competitions</span>
        </Link>

        {isAdmin && (
          <Link
            to="/admin"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono text-violet-300 bg-violet-950/70 border border-violet-500/30 rounded-xl hover:text-white hover:border-violet-400 transition-colors"
          >
            <Edit className="w-3.5 h-3.5" />
            <span>Edit in Founder Dashboard</span>
          </Link>
        )}
      </div>

      {/* Hero Header */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        <div className="lg:col-span-7 space-y-5">
          <div className="inline-flex items-center gap-2 px-3 py-1 text-xs font-mono text-violet-300 bg-[#171426] border border-violet-500/25 rounded-full user-select-none">
            <span className="w-2 h-2 rounded-full bg-violet-400" />
            <span>{event.category}</span>
            <span>·</span>
            <span>{event.difficulty}</span>
            <span>·</span>
            <span className="uppercase text-amber-300">{event.status}</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight user-select-none">
            {event.title.toUpperCase()}
          </h1>

          <p className="text-sm font-mono text-violet-400 tracking-wider uppercase">
            {event.tagline}
          </p>

          <p className="text-base sm:text-lg text-slate-300 leading-relaxed font-light select-text">
            {event.description || event.short_description}
          </p>

          <div className="flex flex-wrap gap-4 text-xs font-mono text-slate-400 pt-2 user-select-none">
            {event.duration && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#171426] border border-violet-500/20 rounded-lg">
                <Clock className="w-4 h-4 text-violet-400" />
                <span>Duration: {event.duration}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#171426] border border-violet-500/20 rounded-lg">
              <Users className="w-4 h-4 text-violet-400" />
              <span>Format: {event.team_size || event.format || 'Individual'}</span>
            </div>
            {event.venue && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#171426] border border-violet-500/20 rounded-lg">
                <MapPin className="w-4 h-4 text-violet-400" />
                <span>{event.venue}</span>
              </div>
            )}
          </div>
        </div>

        {/* Action Registration Card */}
        <div className="lg:col-span-5">
          <div className="p-6 sm:p-8 rounded-2xl bg-[#171426] border border-violet-500/30 space-y-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-violet-600/10 rounded-full blur-2xl pointer-events-none" />

            {/* Banner preview if available */}
            <div className="relative h-44 rounded-xl overflow-hidden bg-violet-950/40 border border-violet-500/20">
              {!brokenImage ? (
                <img
                  src={bannerSrc}
                  alt={event.title}
                  onError={() => setBrokenImage(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs font-mono text-violet-400">
                  {event.title}
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#171426] via-transparent to-transparent" />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                <span>Registration Quota</span>
                <span className="text-white font-semibold">
                  {event.registered_count || 0} / {event.capacity} seats filled
                </span>
              </div>
              <div className="w-full h-1.5 bg-[#11101B] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-violet-500 transition-all duration-500"
                  style={{ width: `${Math.min(100, ((event.registered_count || 0) / (event.capacity || 1)) * 100)}%` }}
                />
              </div>
            </div>

            <div className="p-4 bg-[#11101B] rounded-xl border border-violet-500/15 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-mono">Participation Fee:</span>
                <span className="text-white font-bold text-sm">
                  {event.fee_per_participant === 0 ? 'Free Entry' : `₹${event.fee_per_participant} per participant`}
                </span>
              </div>
              {event.event_date && (
                <div className="flex items-center justify-between text-xs pt-1 border-t border-violet-500/10">
                  <span className="text-slate-400 font-mono">Event Date:</span>
                  <span className="text-slate-300 font-mono">{event.event_date}</span>
                </div>
              )}
              {event.registration_deadline && (
                <div className="flex items-center justify-between text-xs pt-1 border-t border-violet-500/10">
                  <span className="text-slate-400 font-mono">Deadline:</span>
                  <span className="text-amber-300 font-mono">{event.registration_deadline}</span>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setModalOpen(true)}
              disabled={isRegistrationClosed}
              className={`w-full py-3.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer ${
                isRegistrationClosed
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                  : 'bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white shadow-violet-500/25'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isRegistrationClosed ? 'Registration Closed' : 'Register for Competition'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Rewards & Recognition */}
      <div className="p-8 rounded-2xl bg-gradient-to-br from-[#171426] to-[#11101B] border border-amber-500/20 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-950/60 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Prize Pool &amp; Recognition</h2>
            <p className="text-xs text-slate-400 font-mono">Verified rewards for top standing participants</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-[#08080D]/70 rounded-xl border border-amber-500/30 space-y-1">
            <span className="text-[10px] font-mono text-amber-400 uppercase tracking-wider">1st Place Winner</span>
            <div className="text-lg font-bold text-white">{event.prizes?.first_place || '₹2,000 Cash Prize'}</div>
            <p className="text-[11px] text-slate-400">Official Gold Certificate of Excellence</p>
          </div>

          {event.prizes?.second_place && (
            <div className="p-4 bg-[#08080D]/70 rounded-xl border border-violet-500/20 space-y-1">
              <span className="text-[10px] font-mono text-violet-300 uppercase tracking-wider">2nd Place</span>
              <div className="text-lg font-bold text-white">{event.prizes.second_place}</div>
              <p className="text-[11px] text-slate-400">Silver Certificate of Distinction</p>
            </div>
          )}

          {event.prizes?.third_place && (
            <div className="p-4 bg-[#08080D]/70 rounded-xl border border-violet-500/20 space-y-1">
              <span className="text-[10px] font-mono text-violet-300 uppercase tracking-wider">3rd Place</span>
              <div className="text-lg font-bold text-white">{event.prizes.third_place}</div>
              <p className="text-[11px] text-slate-400">Bronze Certificate of Merit</p>
            </div>
          )}

          <div className="p-4 bg-[#08080D]/70 rounded-xl border border-violet-500/20 space-y-1">
            <span className="text-[10px] font-mono text-violet-400 uppercase tracking-wider">All Participants</span>
            <div className="text-base font-bold text-white">{event.prizes?.special_rewards || 'Top Performer Gifts'}</div>
            <p className="text-[11px] text-slate-400">Verified Certificate of Participation</p>
          </div>
        </div>
      </div>

      {/* Rules & Guidelines */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <FileText className="w-5 h-5 text-violet-400" />
          <span>Competition Rules &amp; Protocols</span>
        </h2>

        <div className="bg-[#171426] border border-violet-500/20 rounded-2xl p-6 sm:p-8 space-y-3">
          {event.rules && event.rules.length > 0 ? (
            event.rules.map((rule, idx) => (
              <div key={idx} className="flex items-start gap-3 text-xs sm:text-sm text-slate-300 leading-relaxed select-text">
                <span className="w-5 h-5 rounded-full bg-violet-950/80 border border-violet-500/30 text-violet-300 text-xs font-mono flex items-center justify-center shrink-0 mt-0.5">
                  {idx + 1}
                </span>
                <span>{rule}</span>
              </div>
            ))
          ) : (
            <p className="text-xs text-slate-400">Standard ethical competition guidelines apply.</p>
          )}
        </div>
      </div>

      {/* Judging Criteria */}
      {event.judging_criteria && event.judging_criteria.length > 0 && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-violet-400" />
            <span>Judging &amp; Evaluation Rubric</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {event.judging_criteria.map((crit, idx) => (
              <div key={idx} className="p-6 bg-[#171426] border border-violet-500/20 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-white">{crit.label}</span>
                  <span className="px-2 py-0.5 text-xs font-mono font-bold text-violet-300 bg-violet-950/80 rounded border border-violet-500/30">
                    {crit.percentage}%
                  </span>
                </div>
                <div className="w-full h-1 bg-[#11101B] rounded-full overflow-hidden">
                  <div className="h-full bg-violet-500" style={{ width: `${crit.percentage}%` }} />
                </div>
                <p className="text-xs text-slate-300 font-light leading-relaxed select-text">{crit.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Frequently Asked Questions */}
      {event.faq && event.faq.length > 0 && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-violet-400" />
            <span>Frequently Asked Questions</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {event.faq.map((item, idx) => (
              <div key={idx} className="p-5 bg-[#171426] border border-violet-500/20 rounded-2xl space-y-2 select-text">
                <h4 className="text-sm font-bold text-white">{item.question}</h4>
                <p className="text-xs text-slate-300 leading-relaxed font-light">{item.answer}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Organizer Contact Info */}
      <div className="p-6 bg-[#11101B] border border-violet-500/20 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs font-mono text-slate-400">
        <div>
          <span className="text-slate-500 uppercase block text-[10px]">Organizing Desk</span>
          <span className="text-white font-medium">Birla Vishvakarma Mahavidyalaya (BVM) · NEXORA Team</span>
        </div>
        <div className="flex items-center gap-4">
          <a href="mailto:nexora.bvm@gmail.com" className="hover:text-violet-300 transition-colors flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5 text-violet-400" />
            <span>nexora.bvm@gmail.com</span>
          </a>
          <a href="tel:+918200243606" className="hover:text-violet-300 transition-colors flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5 text-violet-400" />
            <span>+91 8200243606</span>
          </a>
        </div>
      </div>

      {/* Registration Modal */}
      {modalOpen && (
        <EventRegistrationModal
          event={event}
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  );
};
