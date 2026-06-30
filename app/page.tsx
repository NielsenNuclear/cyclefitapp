"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SignalCard {
  label: string;
  value: string;
  delta: string;
  deltaPositive: boolean;
  icon: React.ReactNode;
}

interface CoachCard {
  badge: string;
  badgeColor: string;
  title: string;
  body: string;
  signals: string[];
  score: number;
  scoreColor: string;
}

// ─── Icons (inline SVG to avoid import dependencies) ──────────────────────────

function IconMoon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}
function IconBolt() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}
function IconActivity() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}
function IconBrain() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-1.98-3 2.5 2.5 0 0 1-1.32-4.24 3 3 0 0 1 .34-5.58 2.5 2.5 0 0 1 1.96-3.42A2.5 2.5 0 0 1 9.5 2z" />
      <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 1.98-3 2.5 2.5 0 0 0 1.32-4.24 3 3 0 0 0-.34-5.58 2.5 2.5 0 0 0-1.96-3.42A2.5 2.5 0 0 0 14.5 2z" />
    </svg>
  );
}
function IconArrowRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}
function IconCpu() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <rect x="9" y="9" width="6" height="6" />
      <line x1="9" y1="1" x2="9" y2="4" /><line x1="15" y1="1" x2="15" y2="4" />
      <line x1="9" y1="20" x2="9" y2="23" /><line x1="15" y1="20" x2="15" y2="23" />
      <line x1="20" y1="9" x2="23" y2="9" /><line x1="20" y1="14" x2="23" y2="14" />
      <line x1="1" y1="9" x2="4" y2="9" /><line x1="1" y1="14" x2="4" y2="14" />
    </svg>
  );
}
function IconCheck() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
function IconTrendingUp() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  );
}
function IconBarbell() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 5v14M18 5v14M2 9h4M18 9h4M2 15h4M18 15h4M6 9h12M6 15h12" />
    </svg>
  );
}
function IconLeaf() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z" />
      <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
    </svg>
  );
}
function IconZap() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

// ─── Readiness Ring SVG ───────────────────────────────────────────────────────

function ReadinessRing({ score, size = 88 }: { score: number; size?: number }) {
  const r = (size / 2) - 7;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(83,74,183,0.12)" strokeWidth="5" />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke="#534AB7" strokeWidth="5"
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(.4,0,.2,1)" }}
      />
    </svg>
  );
}

// ─── Animated counter ─────────────────────────────────────────────────────────

function AnimatedNumber({ target, duration = 1200 }: { target: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  const raf = useRef<number>(0);
  useEffect(() => {
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(ease * target));
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target, duration]);
  return <>{display}</>;
}

// ─── Subtle noise texture via inline SVG data-URI ─────────────────────────────
const NOISE = `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E")`;

// ─── Data ─────────────────────────────────────────────────────────────────────

const SIGNAL_CARDS: SignalCard[] = [
  { label: "Sleep",    value: "7.8h",  delta: "+0.6h",  deltaPositive: true,  icon: <IconMoon />   },
  { label: "Energy",   value: "8/10",  delta: "+2 pts", deltaPositive: true,  icon: <IconBolt />   },
  { label: "Soreness", value: "3/10",  delta: "low",    deltaPositive: true,  icon: <IconActivity /> },
  { label: "Stress",   value: "3/10",  delta: "stable", deltaPositive: true,  icon: <IconBrain />  },
];

const COACH_CARDS: CoachCard[] = [
  {
    badge: "Push",
    badgeColor: "teal",
    title: "Progressive overload — upper body",
    body: "Sleep and energy are both elevated this week. Recovery from Monday's session is complete. Conditions support progressive overload — target top of rep ranges and add one working set.",
    signals: ["Sleep 7.8h", "Energy 8/10", "Soreness low"],
    score: 78,
    scoreColor: "#534AB7",
  },
  {
    badge: "Recover",
    badgeColor: "amber",
    title: "Active recovery recommended",
    body: "Multiple signals are below threshold — sleep was disrupted and soreness is high. Pushing intensity today would likely extend recovery time. A walk and mobility session is the higher-performance choice.",
    signals: ["Sleep 5.2h", "Soreness 8/10", "Stress elevated"],
    score: 34,
    scoreColor: "#854F0B",
  },
  {
    badge: "Fuel",
    badgeColor: "purple",
    title: "Luteal phase nutrition shift",
    body: "Progesterone is now dominant. Appetite is expected to rise — this is physiological, not behavioural. Prioritise complex carbohydrates and magnesium-rich foods. Caloric restriction now would worsen mood signals.",
    signals: ["Luteal day 19", "Energy 6/10", "Cravings logged"],
    score: 61,
    scoreColor: "#534AB7",
  },
];

const FEATURE_PILLS = [
  "Multi-signal readiness scoring",
  "Physiology-aware training",
  "Adaptive nutrition guidance",
  "Recovery-led periodisation",
  "Evidence-based coaching",
  "Progressive overload tracking",
];

const STATS = [
  { value: 94, suffix: "%", label: "of users report improved training consistency within 4 weeks" },
  { value: 5,  suffix: "×", label: "more data signals than cycle-only tracking apps" },
  { value: 28, suffix: "d", label: "to a fully personalised readiness model" },
];

// ─── Component: SignalPill ────────────────────────────────────────────────────

function SignalPill({ text }: { text: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#F1EFE8] text-[#5F5E5A] border border-[#E0DDD4]">
      {text}
    </span>
  );
}

// ─── Component: CoachingCard ──────────────────────────────────────────────────

function CoachingCard({ card, index }: { card: CoachCard; index: number }) {
  const badgeStyles: Record<string, string> = {
    teal:   "bg-[#E1F5EE] text-[#085041] border-[#A8DFC8]",
    amber:  "bg-[#FAEEDA] text-[#633806] border-[#E4C88A]",
    purple: "bg-[#EEEDFE] text-[#3C3489] border-[#C4C0EE]",
  };

  const accentStyles: Record<string, string> = {
    teal:   "border-l-[#0F6E56]",
    amber:  "border-l-[#854F0B]",
    purple: "border-l-[#534AB7]",
  };

  return (
    <div
      className={`relative bg-white rounded-2xl border border-[#EAE7DE] p-5 shadow-[0_2px_20px_rgba(0,0,0,0.04)] border-l-[3px] ${accentStyles[card.badgeColor]} transition-all duration-300 hover:shadow-[0_8px_32px_rgba(83,74,183,0.10)] hover:-translate-y-0.5`}
      style={{ animationDelay: `${index * 120}ms` }}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${badgeStyles[card.badgeColor]}`}>
            <IconTrendingUp />
            {card.badge}
          </span>
        </div>
        <div className="relative flex-shrink-0" style={{ width: 40, height: 40 }}>
          <ReadinessRing score={card.score} size={40} />
          <span
            className="absolute inset-0 flex items-center justify-center text-[11px] font-semibold"
            style={{ color: card.scoreColor, transform: "rotate(0deg)" }}
          >
            {card.score}
          </span>
        </div>
      </div>

      <h4 className="text-sm font-semibold text-[#1C1B18] mb-2 leading-snug">{card.title}</h4>
      <p className="text-[12px] text-[#6B6860] leading-relaxed mb-3 italic">"{card.body}"</p>

      <div className="flex items-center gap-2 flex-wrap">
        {card.signals.map((s) => <SignalPill key={s} text={s} />)}
      </div>

      <div className="mt-3 pt-3 border-t border-[#F0EDE4] flex items-center gap-1.5">
        <span className="text-[#534AB7]"><IconCpu /></span>
        <span className="text-[10px] text-[#8A8880]">{card.signals.length} signals combined · adaptive engine</span>
      </div>
    </div>
  );
}

// ─── Component: StatCard ──────────────────────────────────────────────────────

function StatCard({ value, suffix, label, delay }: { value: number; suffix: string; label: string; delay: number }) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold: 0.5 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={ref} className="text-center" style={{ animationDelay: `${delay}ms` }}>
      <div className="text-4xl font-semibold text-[#1C1B18] tracking-tight mb-1" style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}>
        {visible ? <AnimatedNumber target={value} /> : 0}{suffix}
      </div>
      <div className="text-[12px] text-[#8A8880] leading-relaxed max-w-[160px] mx-auto">{label}</div>
    </div>
  );
}

// ─── Main page component ──────────────────────────────────────────────────────

export default function HomePage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [heroVisible, setHeroVisible] = useState(false);
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [ctaHover, setCtaHover] = useState(false);

  function getDestination(): string {
    return localStorage.getItem("axis_onboarding") ? "/dashboard" : "/onboarding";
  }

  function handleCta() {
    router.push(getDestination());
  }

  function handleHowItWorks() {
    document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" });
  }

  useEffect(() => {
    setMounted(true);
    const t = setTimeout(() => setHeroVisible(true), 100);
    const cardTimer = setInterval(() => {
      setActiveCardIndex((i) => (i + 1) % COACH_CARDS.length);
    }, 4000);
    return () => { clearTimeout(t); clearInterval(cardTimer); };
  }, []);

  if (!mounted) return null;

  return (
    <main
      className="min-h-screen bg-[#FAF9F6] overflow-x-hidden"
      style={{ fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif" }}
    >

      {/* ── Google Fonts loader ─────────────────────────────── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,300;1,9..40,400&family=DM+Serif+Display:ital@0;1&display=swap');

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes slideRight {
          from { width: 0; }
          to   { width: 100%; }
        }
        @keyframes pulseRing {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50%       { transform: scale(1.08); opacity: 0.3; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-6px); }
        }
        @keyframes gradientShift {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        .animate-fadeUp   { animation: fadeUp 0.7s cubic-bezier(.4,0,.2,1) both; }
        .animate-fadeIn   { animation: fadeIn 0.8s ease both; }
        .animate-float    { animation: float 4s ease-in-out infinite; }
        .delay-100 { animation-delay: 100ms; }
        .delay-200 { animation-delay: 200ms; }
        .delay-300 { animation-delay: 300ms; }
        .delay-400 { animation-delay: 400ms; }
        .delay-500 { animation-delay: 500ms; }
        .delay-600 { animation-delay: 600ms; }
        .delay-700 { animation-delay: 700ms; }
        .delay-800 { animation-delay: 800ms; }

        .gradient-text {
          background: linear-gradient(135deg, #534AB7 0%, #0F6E56 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .hero-gradient {
          background: radial-gradient(ellipse at 20% 50%, rgba(83,74,183,0.07) 0%, transparent 60%),
                      radial-gradient(ellipse at 80% 20%, rgba(15,110,86,0.05) 0%, transparent 50%),
                      radial-gradient(ellipse at 60% 80%, rgba(83,74,183,0.04) 0%, transparent 50%);
        }
        .card-grid-bg {
          background-image: radial-gradient(rgba(83,74,183,0.06) 1px, transparent 1px);
          background-size: 24px 24px;
        }
        .score-ring-pulse {
          animation: pulseRing 3s ease-in-out infinite;
        }
        .cta-gradient {
          background: linear-gradient(135deg, #534AB7 0%, #3D35A0 100%);
          background-size: 200% 200%;
        }
        .cta-gradient:hover {
          background: linear-gradient(135deg, #3D35A0 0%, #534AB7 100%);
        }
        .secondary-btn {
          transition: all 0.2s ease;
        }
        .secondary-btn:hover {
          background: rgba(83,74,183,0.06);
        }
        .signal-card {
          transition: all 0.25s cubic-bezier(.4,0,.2,1);
        }
        .signal-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(83,74,183,0.08);
        }
        .feature-pill {
          transition: all 0.2s ease;
        }
        .feature-pill:hover {
          background: #EEEDFE;
          border-color: #C4C0EE;
          color: #3C3489;
        }
        .nav-blur {
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }
      `}</style>

      {/* ── Navigation ─────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 nav-blur bg-[rgba(250,249,246,0.88)] border-b border-[rgba(211,209,199,0.5)]">
        <div className="max-w-6xl mx-auto px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#534AB7] flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 17l10 5 10-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 12l10 5 10-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="font-semibold text-[15px] text-[#1C1B18] tracking-tight">Axis</span>
            <span className="hidden sm:inline-block text-[11px] font-medium px-2 py-0.5 rounded-full bg-[#EEEDFE] text-[#3C3489] border border-[#C4C0EE]">Beta</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleCta} className="text-[13px] text-[#6B6860] hover:text-[#1C1B18] transition-colors">Sign in</button>
            <button onClick={handleCta} className="text-[13px] font-medium px-4 py-1.5 rounded-full bg-[#1C1B18] text-white hover:bg-[#2C2B28] transition-colors">
              Get started
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────── */}
      <section className="hero-gradient relative pt-28 pb-20 px-5 overflow-hidden">

        {/* Background noise */}
        <div className="absolute inset-0 opacity-40 pointer-events-none" style={{ backgroundImage: NOISE }} />

        {/* Decorative orbs */}
        <div className="absolute top-16 right-8 w-64 h-64 rounded-full opacity-30 pointer-events-none animate-float"
          style={{ background: "radial-gradient(circle, rgba(83,74,183,0.15) 0%, transparent 70%)", animationDelay: "0s" }} />
        <div className="absolute bottom-8 left-4 w-48 h-48 rounded-full opacity-20 pointer-events-none animate-float"
          style={{ background: "radial-gradient(circle, rgba(15,110,86,0.2) 0%, transparent 70%)", animationDelay: "1.5s" }} />

        <div className="max-w-6xl mx-auto relative">
          <div className="max-w-2xl">

            {/* Label */}
            <div
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#C4C0EE] bg-[#EEEDFE] mb-6 animate-fadeUp ${heroVisible ? "" : "opacity-0"}`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#534AB7] animate-pulse" />
              <span className="text-[11px] font-semibold text-[#3C3489] uppercase tracking-widest">Adaptive performance</span>
            </div>

            {/* Headline */}
            <h1
              className={`text-[clamp(2.4rem,6vw,4rem)] font-light leading-[1.1] text-[#1C1B18] mb-6 animate-fadeUp delay-100 ${heroVisible ? "" : "opacity-0"}`}
              style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
            >
              Your body is not{" "}
              <span className="gradient-text italic">static.</span>
              <br />
              Your training{" "}
              <br className="sm:hidden" />
              shouldn't be either.
            </h1>

            {/* Sub */}
            <p
              className={`text-[16px] text-[#6B6860] leading-relaxed mb-8 max-w-lg animate-fadeUp delay-200 ${heroVisible ? "" : "opacity-0"}`}
            >
              Axis is an adaptive coaching platform that reads your physiology in real time —
              sleep, recovery, stress, and hormonal context — and adjusts every training, nutrition,
              and recovery recommendation to match your actual readiness today.
            </p>

            {/* CTAs */}
            <div className={`flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-10 animate-fadeUp delay-300 ${heroVisible ? "" : "opacity-0"}`}>
              <button
                onClick={handleCta}
                className="cta-gradient text-white text-[14px] font-semibold px-6 py-3 rounded-full flex items-center gap-2 shadow-[0_4px_24px_rgba(83,74,183,0.3)] hover:shadow-[0_6px_32px_rgba(83,74,183,0.4)] transition-all duration-200 hover:-translate-y-0.5"
                onMouseEnter={() => setCtaHover(true)}
                onMouseLeave={() => setCtaHover(false)}
              >
                Start your assessment
                <span className={`transition-transform duration-200 ${ctaHover ? "translate-x-1" : ""}`}>
                  <IconArrowRight />
                </span>
              </button>
              <button onClick={handleHowItWorks} className="secondary-btn text-[14px] text-[#534AB7] font-medium px-4 py-3 rounded-full flex items-center gap-2 hover:gap-3 transition-all">
                See how it works
                <IconArrowRight />
              </button>
            </div>

            {/* Trust line */}
            <div className={`flex items-center gap-2 animate-fadeUp delay-400 ${heroVisible ? "" : "opacity-0"}`}>
              <div className="flex -space-x-2">
                {["#534AB7","#0F6E56","#854F0B","#1C1B18"].map((c, i) => (
                  <div key={i} className="w-7 h-7 rounded-full border-2 border-[#FAF9F6]" style={{ background: c }} />
                ))}
              </div>
              <span className="text-[12px] text-[#8A8880]">Trusted by 2,400+ athletes in early access</span>
            </div>
          </div>

          {/* Hero readiness card — floats right on desktop */}
          <div className={`mt-12 lg:mt-0 lg:absolute lg:top-0 lg:right-0 lg:w-72 animate-fadeIn delay-500 ${heroVisible ? "" : "opacity-0"}`}>
            <div className="bg-white rounded-2xl border border-[#EAE7DE] p-5 shadow-[0_8px_40px_rgba(0,0,0,0.07)]">

              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-[10px] font-semibold text-[#8A8880] uppercase tracking-wider mb-0.5">Today · Wednesday</div>
                  <div className="text-[13px] font-semibold text-[#1C1B18]">Good morning, Sarah</div>
                </div>
                <div className="w-8 h-8 rounded-full bg-[#EEEDFE] flex items-center justify-center text-[12px] font-bold text-[#534AB7]">SC</div>
              </div>

              {/* Readiness score */}
              <div className="flex items-center gap-4 mb-4 p-3 rounded-xl bg-[#FAF9F6] border border-[#F0EDE4]">
                <div className="relative">
                  <div className="score-ring-pulse absolute inset-[-4px] rounded-full border border-[#534AB7] opacity-20" />
                  <ReadinessRing score={78} size={56} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[17px] font-semibold text-[#534AB7]" style={{ transform: "rotate(0deg)" }}>78</span>
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-[#8A8880] mb-0.5">Readiness</div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-semibold text-[#085041] bg-[#E1F5EE] px-2 py-0.5 rounded-full border border-[#A8DFC8] flex items-center gap-1">
                      <IconTrendingUp /> Push
                    </span>
                  </div>
                  <div className="text-[10px] text-[#8A8880] mt-1">4-day upward trend</div>
                </div>
              </div>

              {/* Signal cards */}
              <div className="grid grid-cols-2 gap-2 mb-4">
                {SIGNAL_CARDS.map((sig) => (
                  <div key={sig.label} className="signal-card bg-[#FAF9F6] border border-[#F0EDE4] rounded-xl p-2.5">
                    <div className="text-[#8A8880] mb-1.5">{sig.icon}</div>
                    <div className="text-[14px] font-semibold text-[#1C1B18]">{sig.value}</div>
                    <div className="text-[9px] text-[#8A8880]">{sig.label}</div>
                    <div className={`text-[9px] font-medium mt-0.5 ${sig.deltaPositive ? "text-[#0F6E56]" : "text-[#854F0B]"}`}>{sig.delta}</div>
                  </div>
                ))}
              </div>

              {/* Coach insight */}
              <div className="border-l-2 border-[#534AB7] pl-3 bg-[#EEEDFE] rounded-r-lg py-2 pr-3">
                <div className="text-[11px] text-[#3C3489] italic leading-relaxed">
                  "Sleep and energy are elevated. Recovery from Monday is complete. Today supports progressive overload."
                </div>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <span className="text-[#534AB7]"><IconCpu /></span>
                  <span className="text-[9px] text-[#7F77DD]">4 signals · adaptive engine</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Feature pills strip ──────────────────────────────── */}
      <section className="py-6 px-5 border-y border-[#EAE7DE] bg-[#F5F3EE] overflow-hidden">
        <div className="flex gap-2 flex-wrap max-w-6xl mx-auto justify-center">
          {FEATURE_PILLS.map((pill) => (
            <span key={pill} className="feature-pill text-[11px] font-medium text-[#5F5E5A] px-3 py-1.5 rounded-full bg-white border border-[#E0DDD4] cursor-default">
              {pill}
            </span>
          ))}
        </div>
      </section>

      {/* ── What Axis is not ─────────────────────────────────── */}
      <section className="py-20 px-5">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-xl mb-14">
            <div className="text-[11px] font-semibold text-[#8A8880] uppercase tracking-widest mb-3">The difference</div>
            <h2
              className="text-[clamp(1.8rem,4vw,2.8rem)] font-light text-[#1C1B18] leading-tight"
              style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
            >
              Not a period tracker.{" "}
              <span className="gradient-text italic">A performance system.</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {/* What it's NOT */}
            <div className="bg-[#FAF9F6] rounded-2xl border border-[#EAE7DE] p-6">
              <div className="text-[11px] font-semibold text-[#854F0B] uppercase tracking-wider mb-4">What Axis is not</div>
              {[
                "A period tracker with workout suggestions",
                "Phase-based programming on a fixed schedule",
                "Deterministic hormone rules (\"always train hard at ovulation\")",
                "A wellness lifestyle app with self-care aesthetics",
                "Generic fitness advice with a cycle calendar attached",
              ].map((item) => (
                <div key={item} className="flex items-start gap-3 py-2.5 border-b border-[#F0EDE4] last:border-0">
                  <div className="w-4 h-4 rounded-full border border-[#E4C88A] bg-[#FAEEDA] flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg width="8" height="8" viewBox="0 0 12 12"><line x1="2" y1="2" x2="10" y2="10" stroke="#854F0B" strokeWidth="2" strokeLinecap="round"/><line x1="10" y1="2" x2="2" y2="10" stroke="#854F0B" strokeWidth="2" strokeLinecap="round"/></svg>
                  </div>
                  <span className="text-[13px] text-[#6B6860] leading-snug">{item}</span>
                </div>
              ))}
            </div>

            {/* What it IS */}
            <div className="bg-white rounded-2xl border border-[#EAE7DE] p-6 shadow-[0_2px_20px_rgba(83,74,183,0.04)]">
              <div className="text-[11px] font-semibold text-[#0F6E56] uppercase tracking-wider mb-4">What Axis is</div>
              {[
                "A multi-signal adaptive coaching engine",
                "Readiness-led recommendations that update daily",
                "Cycle phase as one signal — weighted alongside sleep, energy, stress, and recovery",
                "Progressive overload tracking with intelligent load decisions",
                "Evidence-based nutrition guidance that adapts to your physiology",
              ].map((item) => (
                <div key={item} className="flex items-start gap-3 py-2.5 border-b border-[#F0EDE4] last:border-0">
                  <div className="w-4 h-4 rounded-full border border-[#A8DFC8] bg-[#E1F5EE] flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-[#085041]"><IconCheck /></span>
                  </div>
                  <span className="text-[13px] text-[#1C1B18] leading-snug">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Adaptive coaching preview ────────────────────────── */}
      <section className="py-20 px-5 bg-[#F5F3EE] border-y border-[#EAE7DE]">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col lg:flex-row gap-14">

            {/* Left copy */}
            <div className="lg:w-80 flex-shrink-0">
              <div className="text-[11px] font-semibold text-[#8A8880] uppercase tracking-widest mb-3">Adaptive coaching</div>
              <h2
                className="text-[clamp(1.8rem,3.5vw,2.4rem)] font-light text-[#1C1B18] leading-tight mb-5"
                style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
              >
                Every recommendation shows its reasoning.
              </h2>
              <p className="text-[14px] text-[#6B6860] leading-relaxed mb-6">
                Axis doesn't just tell you what to do. It surfaces which signals drove the decision,
                so you understand your body rather than following instructions blindly.
              </p>

              <div className="space-y-3">
                {[
                  { icon: <IconBarbell />, title: "Training adapts daily", body: "Load increases on high-readiness days. Volume reduces when recovery signals are low." },
                  { icon: <IconLeaf />, title: "Nutrition shifts with physiology", body: "Luteal-phase caloric needs are higher. Caloric restriction during this phase worsens mood — Axis never recommends it." },
                  { icon: <IconZap />, title: "Recovery is a performance lever", body: "Rest days are recommended, not apologised for. The coaching system treats recovery as training." },
                ].map(({ icon, title, body }) => (
                  <div key={title} className="flex items-start gap-3 p-3.5 bg-white rounded-xl border border-[#EAE7DE]">
                    <div className="w-8 h-8 rounded-lg bg-[#EEEDFE] flex items-center justify-center text-[#534AB7] flex-shrink-0">
                      {icon}
                    </div>
                    <div>
                      <div className="text-[13px] font-semibold text-[#1C1B18] mb-0.5">{title}</div>
                      <div className="text-[12px] text-[#6B6860] leading-snug">{body}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: coaching cards */}
            <div className="flex-1">
              <div className="flex gap-1.5 mb-5">
                {COACH_CARDS.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveCardIndex(i)}
                    className={`h-1 rounded-full transition-all duration-400 ${i === activeCardIndex ? "bg-[#534AB7] w-8" : "bg-[#D3D1C7] w-4"}`}
                  />
                ))}
              </div>

              <div className="space-y-3">
                {COACH_CARDS.map((card, i) => (
                  <div
                    key={i}
                    className={`transition-all duration-500 ${i === activeCardIndex ? "opacity-100 scale-100" : "opacity-40 scale-[0.98]"}`}
                    onClick={() => setActiveCardIndex(i)}
                  >
                    <CoachingCard card={card} index={i} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats ───────────────────────────────────────────────── */}
      <section className="py-20 px-5">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-10 text-center">
            {STATS.map((s, i) => (
              <StatCard key={i} value={s.value} suffix={s.suffix} label={s.label} delay={i * 150} />
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────── */}
      <section id="how-it-works" className="py-20 px-5 bg-[#F5F3EE] border-y border-[#EAE7DE]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <div className="text-[11px] font-semibold text-[#8A8880] uppercase tracking-widest mb-3">The method</div>
            <h2
              className="text-[clamp(1.8rem,4vw,2.8rem)] font-light text-[#1C1B18]"
              style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
            >
              Built on five signal layers.
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { num: "01", label: "Physiology", body: "Cycle phase, symptoms, temperature trends", color: "#EEEDFE", textColor: "#534AB7" },
              { num: "02", label: "Performance", body: "Strength progression, volume, load tracking", color: "#E1F5EE", textColor: "#0F6E56" },
              { num: "03", label: "Recovery",    body: "Sleep, soreness, stress, HRV (future)", color: "#F1EFE8", textColor: "#5F5E5A" },
              { num: "04", label: "Nutrition",   body: "Macro targets, micronutrients, timing", color: "#FAEEDA", textColor: "#854F0B" },
              { num: "05", label: "Adaptive AI", body: "Combines all signals into a readiness score", color: "#EEEDFE", textColor: "#534AB7" },
            ].map(({ num, label, body, color, textColor }) => (
              <div key={num} className="bg-white rounded-2xl border border-[#EAE7DE] p-5 hover:shadow-[0_4px_24px_rgba(83,74,183,0.07)] transition-shadow">
                <div className="text-[11px] font-semibold mb-3" style={{ color: textColor }}>{num}</div>
                <div
                  className="w-8 h-8 rounded-lg mb-3 flex items-center justify-center text-[11px] font-bold"
                  style={{ background: color, color: textColor }}
                >
                  {label[0]}
                </div>
                <div className="text-[13px] font-semibold text-[#1C1B18] mb-1.5">{label}</div>
                <div className="text-[12px] text-[#6B6860] leading-snug">{body}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Onboarding CTA ─────────────────────────────────────── */}
      <section className="py-24 px-5">
        <div className="max-w-2xl mx-auto text-center">

          {/* Readiness score preview */}
          <div className="relative inline-block mb-8">
            <div className="w-24 h-24 mx-auto">
              <ReadinessRing score={0} size={96} />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[14px] font-semibold text-[#8A8880]">—</span>
            </div>
            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-medium text-[#8A8880] bg-[#F1EFE8] border border-[#E0DDD4] px-2.5 py-0.5 rounded-full">
              Your score builds here
            </div>
          </div>

          <h2
            className="text-[clamp(1.8rem,4.5vw,3rem)] font-light text-[#1C1B18] leading-tight mb-5 mt-4"
            style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
          >
            Start training with{" "}
            <span className="gradient-text italic">your actual physiology.</span>
          </h2>

          <p className="text-[15px] text-[#6B6860] leading-relaxed mb-8 max-w-md mx-auto">
            Answer six questions. We'll build your adaptive coaching profile and generate your first personalised readiness score within 3 days of check-ins.
          </p>

          {/* Onboarding step indicators */}
          <div className="flex items-center justify-center gap-2 mb-8">
            {["Goals", "Training level", "Cycle info", "Symptoms", "Training types", "Summary"].map((step, i) => (
              <div key={step} className="flex flex-col items-center gap-1">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold transition-colors ${i === 0 ? "bg-[#534AB7] text-white" : "bg-[#F1EFE8] text-[#8A8880] border border-[#E0DDD4]"}`}>
                  {i + 1}
                </div>
                <span className="hidden sm:block text-[9px] text-[#8A8880] font-medium">{step}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button onClick={handleCta} className="cta-gradient text-white text-[15px] font-semibold px-8 py-3.5 rounded-full flex items-center gap-2.5 shadow-[0_4px_32px_rgba(83,74,183,0.35)] hover:shadow-[0_8px_40px_rgba(83,74,183,0.45)] transition-all duration-200 hover:-translate-y-0.5 w-full sm:w-auto justify-center">
              Begin assessment
              <IconArrowRight />
            </button>
            <div className="flex items-center gap-2 text-[12px] text-[#8A8880]">
              <IconCheck />
              <span>Free · No credit card · 6 questions</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Science callout ─────────────────────────────────────── */}
      <section className="py-16 px-5 bg-[#1C1B18]" style={{ backgroundImage: NOISE }}>
        <div className="max-w-3xl mx-auto text-center">
          <div className="text-[11px] font-semibold text-[#534AB7] uppercase tracking-widest mb-4">The science</div>
          <blockquote
            className="text-[clamp(1.1rem,3vw,1.5rem)] font-light text-[#EAE7DE] leading-relaxed italic mb-6"
            style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
          >
            "Women should not be forced into static training systems designed around average physiology.
            The menstrual cycle is one important input — not the sole determinant of performance."
          </blockquote>
          <div className="text-[12px] text-[#6B6860]">Axis adaptive engine · clinical evidence base · 5 physiological layers</div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <footer className="py-10 px-5 border-t border-[#EAE7DE]">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-[#534AB7] flex items-center justify-center">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 17l10 5 10-5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="text-[13px] font-semibold text-[#1C1B18]">Axis</span>
          </div>
          <div className="flex items-center gap-5 text-[12px] text-[#8A8880]">
            <a href="#" className="hover:text-[#1C1B18] transition-colors">Privacy</a>
            <a href="#" className="hover:text-[#1C1B18] transition-colors">Science</a>
            <a href="#" className="hover:text-[#1C1B18] transition-colors">Clinical basis</a>
          </div>
          <div className="text-[11px] text-[#8A8880]">
            Axis is guidance — not medical advice. Consult a clinician for health decisions.
          </div>
        </div>
      </footer>

    </main>
  );
}
