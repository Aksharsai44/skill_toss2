import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Video, CreditCard, MessageCircle, Calendar, Award, Fingerprint,
  Users, TrendingUp, Zap, ArrowRight, Building2,
  GraduationCap, BookOpen, Brain, Cloud, Bell, ChevronRight,
} from 'lucide-react';
import { ROLES } from '@/lib/types';
import { cn } from '@/lib/cn';
import { enter, prefersReducedMotion, reveal } from '@/lib/motion';

export function LandingPage() {
  const navigate = useNavigate();
  const handleLogin = () => navigate('/login');

  useEffect(() => {
    document.documentElement.classList.add('landing-scroll');
    const sections = Array.from(document.querySelectorAll<HTMLElement>('.landing-reveal'));
    const heroGroups = Array.from(document.querySelectorAll<HTMLElement>('.landing-hero-group'));
    const heroAnimation = enter(heroGroups, { offset: 16, duration: 420, staggerMs: 50 });
    if (prefersReducedMotion()) sections.forEach((section) => { section.style.opacity = '1'; });
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          reveal(entry.target as HTMLElement);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    sections.forEach((section) => observer.observe(section));
    return () => {
      observer.disconnect();
      heroAnimation.revert();
      document.documentElement.classList.remove('landing-scroll');
    };
  }, []);

  return (
    <div className="min-h-screen bg-white landing-page">
      <Nav onLogin={handleLogin} />
      <Hero onLogin={handleLogin} />
      <TrustBar />
      <Features />
      <RolesSection onLogin={handleLogin} />
      <AutomationSection />
      <StatsSection />
      <CTASection onLogin={handleLogin} />
      <Footer />
    </div>
  );
}

function Nav({ onLogin }: { onLogin: () => void }) {
  return (
    <nav className="app-chrome sticky top-0 z-30 bg-white border-b border-ink-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-primary-600 flex items-center justify-center text-white font-bold font-display">ST</div>
          <span className="font-bold font-display text-lg text-ink-900">Skill Toss</span>
        </div>
        <div className="hidden md:flex items-center gap-7 text-sm font-medium text-ink-600">
          <a href="#features" className="hover:text-ink-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30 rounded">Features</a>
          <a href="#roles" className="hover:text-ink-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30 rounded">Roles</a>
          <a href="#automation" className="hover:text-ink-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30 rounded">Automation</a>
          <a href="#pricing" className="hover:text-ink-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30 rounded">Pricing</a>
        </div>
        <button onClick={onLogin} className="btn-primary text-sm">
          Sign In <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </nav>
  );
}

function Hero({ onLogin }: { onLogin: () => void }) {
  return (
    <section className="border-b border-ink-200 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24 lg:py-28 grid lg:grid-cols-12 gap-12 lg:gap-16 items-center">
        <div className="lg:col-span-7 landing-hero-group">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary-700 mb-6">
          Learning operations, unified
        </p>
        <h1 className="text-4xl sm:text-5xl lg:text-[4.25rem] font-semibold font-display text-ink-950 leading-[1.02] tracking-[-0.045em]">
          Run your institution from one accountable system.
        </h1>
        <p className="mt-7 text-base sm:text-lg leading-8 text-ink-600 max-w-xl">
          Skill Toss connects teaching, attendance, fees, assessments and parent communication without adding another layer of administrative work.
        </p>
        <div className="mt-9 flex flex-col sm:flex-row sm:items-center gap-3">
          <button onClick={onLogin} className="btn-primary px-5 py-3 text-sm">
            Explore the platform <ArrowRight className="w-4 h-4" />
          </button>
          <a href="#features" className="btn-ghost px-4 py-3 text-sm">Review capabilities</a>
        </div>

        <div className="mt-12 pt-6 border-t border-ink-200 grid grid-cols-3 gap-5 max-w-xl">
          {[["5", "Role-specific portals"], ["24/7", "Operational visibility"], ["1", "Institutional record"]].map(([value, label]) => (
            <div key={label}>
              <p className="text-xl font-semibold text-ink-950 tabular-nums">{value}</p>
              <p className="text-xs leading-5 text-ink-500 mt-1">{label}</p>
            </div>
          ))}
        </div>
        </div>

        {/* Hero dashboard preview */}
        <div className="lg:col-span-5 landing-hero-group">
          <div className="border border-ink-300 bg-ink-950 p-5 sm:p-6 shadow-card">
            <div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: 'Total Revenue', value: '₹2.43L', icon: TrendingUp, color: 'text-success-400' },
                  { label: 'Active Students', value: '3,520', icon: Users, color: 'text-primary-400' },
                  { label: 'Classes Today', value: '28', icon: Video, color: 'text-accent-400' },
                  { label: 'Auto Messages', value: '1,240', icon: MessageCircle, color: 'text-warning-400' },
                ].map((s) => (
                  <div key={s.label} className="py-3 border-t border-white/15">
                    <s.icon className={cn('w-5 h-5 mb-2', s.color)} />
                    <p className="text-2xl font-bold font-display text-white">{s.value}</p>
                    <p className="text-xs text-ink-400 mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 grid grid-cols-12 gap-3">
                <div className="col-span-7 border-t border-white/15 pt-4 h-32 flex items-end gap-1.5">
                  {[40, 55, 45, 65, 58, 72, 68, 80, 75, 90, 85, 95].map((h, i) => (
                    <div key={i} className="flex-1 bg-primary-500 rounded-t" style={{ height: `${h}%` }} />
                  ))}
                </div>
                <div className="col-span-5 border-t border-white/15 pt-4 h-32 flex flex-col justify-center gap-2">
                  {[
                    { label: 'Recordings auto-synced', val: '12 today', icon: Cloud },
                    { label: 'WhatsApp sent', val: '340 today', icon: MessageCircle },
                    { label: 'Fees collected', val: '₹48k today', icon: CreditCard },
                  ].map((r) => (
                    <div key={r.label} className="flex items-center gap-2.5 text-xs">
                      <r.icon className="w-4 h-4 text-accent-400 shrink-0" />
                      <span className="text-ink-300">{r.label}</span>
                      <span className="ml-auto text-white font-semibold">{r.val}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function TrustBar() {
  return (
    <div className="border-y border-ink-100 bg-ink-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <p className="text-center text-xs uppercase tracking-wider text-ink-400 font-semibold mb-4">Built for every type of institution</p>
        <div className="flex flex-wrap items-center justify-center gap-8">
          {[
            { icon: Building2, label: 'Schools' },
            { icon: GraduationCap, label: 'Colleges' },
            { icon: BookOpen, label: 'Training Institutes' },
            { icon: Users, label: 'Coaching Centers' },
            { icon: Award, label: 'Certification Bodies' },
          ].map((t) => (
            <div key={t.label} className="flex items-center gap-2 text-ink-500">
              <t.icon className="w-5 h-5" />
              <span className="font-medium text-sm">{t.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Features() {
  const features = [
    { icon: Video, title: 'Live Classes & Auto-Recordings', desc: 'Zoom, Meet & Teams integration. Recordings auto-sync to dashboards within minutes of class ending.' },
    { icon: MessageCircle, title: 'WhatsApp & Email Automation', desc: 'Auto-send recordings, notes, fee reminders, salary slips & certificates via WhatsApp, email & SMS.' },
    { icon: Brain, title: 'AI Exam Generator', desc: 'Upload documents and let AI create questions — MCQs, true/false, descriptive — with auto-grading.' },
    { icon: CreditCard, title: 'Fee Management', desc: 'Term/semester-based fees, Razorpay integration, auto-invoices to parents, overdue tracking & analytics.' },
    { icon: Fingerprint, title: 'Biometric Attendance', desc: 'Hardware integration for staff attendance with hours tracked, synced to salary calculations.' },
    { icon: Award, title: 'Certification Courses', desc: 'Udemy-style course builder with video uploads, AI exams & auto-generated certificates.' },
    { icon: Calendar, title: 'Google Calendar Sync', desc: 'Two-way sync with Google Calendar. Color-coded events, exams, holidays & meetings.' },
    { icon: Users, title: 'Community & Forum', desc: 'WhatsApp-style community chats & Quora-style discussion forums across all branches.' },
  ];
  return (
    <section id="features" className="landing-reveal py-20 sm:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid lg:grid-cols-12 gap-5 lg:gap-12 items-end mb-12">
          <h2 className="lg:col-span-5 text-3xl sm:text-4xl font-semibold font-display text-ink-950 tracking-tight">One operational layer for the entire institution.</h2>
          <p className="lg:col-span-5 lg:col-start-8 text-ink-500 leading-7">From scheduling a class to issuing a receipt, every workflow stays attached to the same student and institutional record.</p>
        </div>
        <div className="grid md:grid-cols-2 border-y border-ink-200 md:divide-x divide-ink-200">
          {features.map((f) => (
            <div key={f.title} className="grid grid-cols-[2.5rem_1fr] gap-4 py-6 md:px-6 border-b border-ink-100 last:border-b-0 md:[&:nth-last-child(-n+2)]:border-b-0">
              <div className="w-10 h-10 rounded-lg bg-primary-50 border border-primary-100 flex items-center justify-center">
                <f.icon className="w-5 h-5 text-primary-600" />
              </div>
              <div><h3 className="font-semibold text-ink-900 mb-1.5">{f.title}</h3>
              <p className="text-sm text-ink-500 leading-relaxed">{f.desc}</p></div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function RolesSection({ onLogin }: { onLogin: () => void }) {
  return (
    <section id="roles" className="landing-reveal py-20 sm:py-24 bg-ink-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid lg:grid-cols-12 gap-5 lg:gap-12 items-end mb-12">
          <h2 className="lg:col-span-6 text-3xl sm:text-4xl font-semibold font-display text-ink-950 tracking-tight">Different responsibilities. One source of truth.</h2>
          <p className="lg:col-span-4 lg:col-start-9 text-ink-500 leading-7">Each role sees the tools and records relevant to its work—without duplicating the platform.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {ROLES.map((role, i) => {
            return (
              <button
                key={role.id}
                onClick={onLogin}
                className="p-5 text-left group cursor-pointer border-t border-ink-300 hover:bg-white transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30"
              >
                <div className="w-9 h-9 rounded-lg bg-ink-900 flex items-center justify-center text-white font-bold font-display text-sm mb-4">
                  {i + 1}
                </div>
                <h3 className="font-semibold text-ink-900 mb-1.5 group-hover:text-primary-700 transition">{role.label}</h3>
                <p className="text-xs text-ink-500 leading-relaxed">{role.description}</p>
                <div className="mt-4 flex items-center gap-1 text-xs font-medium text-primary-600">
                  Explore <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function AutomationSection() {
  const steps = [
    { icon: Video, title: 'Teacher schedules a class', desc: 'Zoom link auto-created and sent to all batch students via WhatsApp & email.' },
    { icon: Cloud, title: 'Class ends — recording syncs', desc: 'Within 10-15 minutes, the recording appears in every student & teacher dashboard automatically.' },
    { icon: Bell, title: 'Auto-notifications fire', desc: 'Students get WhatsApp + email with the recording link, notes & PPTs uploaded by the teacher.' },
    { icon: CreditCard, title: 'Fees & invoices automated', desc: 'Overdue fees trigger reminders to parents via WhatsApp, email & SMS. Pay online via Razorpay.' },
    { icon: Award, title: 'Course complete — certificate', desc: 'AI generates certificate, sends it to student\'s WhatsApp & email with congratulations.' },
  ];
  return (
    <section id="automation" className="landing-reveal py-20 sm:py-24 bg-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="mb-14 border-b border-ink-200 pb-8">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary-700 mb-4">
            <Zap className="w-4 h-4" /> Automation engine
          </p>
          <h2 className="text-3xl sm:text-4xl font-semibold font-display text-ink-950 tracking-tight max-w-3xl">A class ends. The administrative work continues automatically.</h2>
        </div>
        <div className="space-y-0">
          {steps.map((step, i) => (
            <div key={i} className="flex gap-5 group">
              <div className="flex flex-col items-center">
                <div className="w-11 h-11 rounded-xl bg-primary-600 flex items-center justify-center text-white shrink-0 shadow-soft">
                  <step.icon className="w-5 h-5" />
                </div>
                {i < steps.length - 1 && <div className="w-0.5 flex-1 bg-gradient-to-b from-primary-200 to-transparent my-1 min-h-[40px]" />}
              </div>
              <div className="pb-8 pt-2">
                <h3 className="font-semibold text-ink-900">{step.title}</h3>
                <p className="text-sm text-ink-500 mt-1 max-w-lg">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function StatsSection() {
  const stats = [
    { value: '3,500+', label: 'Students managed' },
    { value: '₹2.4L', label: 'Monthly revenue tracked' },
    { value: '1,200+', label: 'Auto-messages daily' },
    { value: '99.9%', label: 'Uptime guaranteed' },
  ];
  return (
    <section className="landing-reveal py-16 bg-primary-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-3xl sm:text-4xl font-bold font-display text-white">{s.value}</p>
              <p className="text-sm text-primary-200 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTASection({ onLogin }: { onLogin: () => void }) {
  return (
    <section id="pricing" className="landing-reveal py-20 bg-ink-50 border-t border-ink-200">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
        <h2 className="text-3xl sm:text-4xl font-bold font-display text-ink-900">Ready to automate your institution?</h2>
        <p className="mt-3 text-ink-500">Sign in to explore each portal with rich demo data — see exactly how Skill Toss works for your role.</p>
        <button onClick={onLogin} className="btn-primary px-6 py-3 text-base mt-6">
          Get Started <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="py-10 bg-ink-900 text-ink-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center text-white font-bold text-sm">ST</div>
          <span className="font-semibold text-white">Skill Toss</span>
        </div>
        <p className="text-sm">AI-Powered LMS for Schools, Colleges & Training Institutes</p>
      </div>
    </footer>
  );
}
