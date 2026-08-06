import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles, Video, CreditCard, MessageCircle, Calendar, Award, Fingerprint,
  Users, TrendingUp, Shield, Zap, ArrowRight, Check, Star, Building2,
  GraduationCap, BookOpen, Brain, Cloud, Bell, ChevronRight,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { ROLES } from '@/lib/types';
import { cn } from '@/lib/cn';

export function LandingPage() {
  const [showLogin, setShowLogin] = useState(false);
  return (
    <div className="min-h-screen bg-white">
      <Nav onLogin={() => setShowLogin(true)} />
      <Hero onLogin={() => setShowLogin(true)} />
      <TrustBar />
      <Features />
      <RolesSection onLogin={() => setShowLogin(true)} />
      <AutomationSection />
      <StatsSection />
      <CTASection onLogin={() => setShowLogin(true)} />
      <Footer />
      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
    </div>
  );
}

function Nav({ onLogin }: { onLogin: () => void }) {
  return (
    <nav className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-ink-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-600 to-accent-600 flex items-center justify-center text-white font-bold font-display">ST</div>
          <span className="font-bold font-display text-lg text-ink-900">Skill Toss</span>
        </div>
        <div className="hidden md:flex items-center gap-7 text-sm font-medium text-ink-600">
          <a href="#features" className="hover:text-ink-900 transition">Features</a>
          <a href="#roles" className="hover:text-ink-900 transition">Roles</a>
          <a href="#automation" className="hover:text-ink-900 transition">Automation</a>
          <a href="#pricing" className="hover:text-ink-900 transition">Pricing</a>
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
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-primary-50/50 via-white to-white" />
      <div className="absolute top-20 right-0 w-96 h-96 bg-accent-200/20 rounded-full blur-3xl" />
      <div className="absolute top-40 left-0 w-80 h-80 bg-primary-200/20 rounded-full blur-3xl" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-20 pb-24 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-50 border border-primary-100 text-primary-700 text-sm font-medium mb-6 animate-slide-up">
          <Sparkles className="w-4 h-4" />
          AI-Powered Learning Management System
        </div>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold font-display text-ink-900 max-w-4xl mx-auto leading-[1.1] animate-slide-up">
          The complete LMS that <span className="bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent">automates everything</span> for schools, colleges & training institutes
        </h1>
        <p className="mt-6 text-lg text-ink-500 max-w-2xl mx-auto animate-slide-up">
          Live classes, auto-recordings, AI exams, fee management, WhatsApp automation, salary, attendance, certifications — all in one intelligent platform.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 animate-slide-up">
          <button onClick={onLogin} className="btn-primary px-6 py-3 text-base">
            Explore Portals <ArrowRight className="w-5 h-5" />
          </button>
          <a href="#features" className="btn-secondary px-6 py-3 text-base">See Features</a>
        </div>

        {/* Hero dashboard preview */}
        <div className="mt-16 max-w-5xl mx-auto animate-slide-up">
          <div className="card p-2 shadow-pop">
            <div className="rounded-xl bg-gradient-to-br from-ink-900 to-ink-800 p-6 sm:p-8">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: 'Total Revenue', value: '₹2.43L', icon: TrendingUp, color: 'text-success-400' },
                  { label: 'Active Students', value: '3,520', icon: Users, color: 'text-primary-400' },
                  { label: 'Classes Today', value: '28', icon: Video, color: 'text-accent-400' },
                  { label: 'Auto Messages', value: '1,240', icon: MessageCircle, color: 'text-warning-400' },
                ].map((s) => (
                  <div key={s.label} className="bg-white/5 rounded-xl p-4 border border-white/10">
                    <s.icon className={cn('w-5 h-5 mb-2', s.color)} />
                    <p className="text-2xl font-bold font-display text-white">{s.value}</p>
                    <p className="text-xs text-ink-400 mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 grid grid-cols-12 gap-3">
                <div className="col-span-7 bg-white/5 rounded-xl p-4 border border-white/10 h-32 flex items-end gap-1.5">
                  {[40, 55, 45, 65, 58, 72, 68, 80, 75, 90, 85, 95].map((h, i) => (
                    <div key={i} className="flex-1 bg-gradient-to-t from-primary-600 to-accent-400 rounded-t" style={{ height: `${h}%` }} />
                  ))}
                </div>
                <div className="col-span-5 bg-white/5 rounded-xl p-4 border border-white/10 h-32 flex flex-col justify-center gap-2">
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
    <section id="features" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold font-display text-ink-900">Everything automated, end to end</h2>
          <p className="mt-3 text-ink-500 max-w-2xl mx-auto">From scheduling a class to sending the recording, collecting fees to generating salary slips — Skill Toss automates it all.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map((f) => (
            <div key={f.title} className="card card-hover p-6 group">
              <div className="w-12 h-12 rounded-xl bg-primary-50 group-hover:bg-primary-100 transition-colors flex items-center justify-center mb-4">
                <f.icon className="w-6 h-6 text-primary-600" />
              </div>
              <h3 className="font-semibold text-ink-900 mb-1.5">{f.title}</h3>
              <p className="text-sm text-ink-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function RolesSection({ onLogin }: { onLogin: () => void }) {
  return (
    <section id="roles" className="py-20 bg-ink-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold font-display text-ink-900">Five powerful portals, one platform</h2>
          <p className="mt-3 text-ink-500 max-w-2xl mx-auto">Each role gets a tailored experience with exactly the tools they need.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {ROLES.map((role, i) => {
            const colors = [
              'from-primary-600 to-primary-800',
              'from-accent-600 to-accent-800',
              'from-success-600 to-success-800',
              'from-warning-600 to-warning-800',
              'from-ink-700 to-ink-900',
            ];
            return (
              <button
                key={role.id}
                onClick={onLogin}
                className="card card-hover p-6 text-left group cursor-pointer"
              >
                <div className={cn('w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center text-white font-bold font-display text-lg mb-4', colors[i])}>
                  {i + 1}
                </div>
                <h3 className="font-semibold text-ink-900 mb-1.5 group-hover:text-primary-700 transition">{role.label}</h3>
                <p className="text-xs text-ink-500 leading-relaxed">{role.description}</p>
                <div className="mt-4 flex items-center gap-1 text-xs font-medium text-primary-600 group-hover:gap-2 transition-all">
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
    <section id="automation" className="py-20 bg-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent-50 border border-accent-100 text-accent-700 text-sm font-medium mb-4">
            <Zap className="w-4 h-4" /> Automation Engine
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold font-display text-ink-900">How a single class triggers a chain of automation</h2>
        </div>
        <div className="space-y-0">
          {steps.map((step, i) => (
            <div key={i} className="flex gap-5 group">
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white shrink-0 shadow-soft group-hover:scale-110 transition-transform">
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
    <section className="py-16 bg-gradient-to-br from-primary-700 to-accent-700">
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
    <section id="pricing" className="py-20 bg-ink-50">
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
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white font-bold text-sm">ST</div>
          <span className="font-semibold text-white">Skill Toss</span>
        </div>
        <p className="text-sm">AI-Powered LMS for Schools, Colleges & Training Institutes</p>
      </div>
    </footer>
  );
}

function LoginModal({ onClose }: { onClose: () => void }) {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState<typeof ROLES[number] | null>(null);

  const handleLogin = (roleId: typeof ROLES[number]['id']) => {
    login(roleId);
    navigate(`/${roleId === 'product-admin' ? 'product-admin' : roleId}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-ink-950/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-pop animate-scale-in max-h-[90vh] overflow-y-auto scrollbar-thin">
        <div className="px-6 py-5 border-b border-ink-100">
          <h2 className="text-xl font-bold font-display text-ink-900">Sign in to Skill Toss</h2>
          <p className="text-sm text-ink-500 mt-1">Choose your role to explore the demo portal</p>
        </div>
        <div className="p-6 space-y-3">
          {ROLES.map((role) => (
            <button
              key={role.id}
              onClick={() => setSelectedRole(role)}
              className={cn(
                'w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left',
                selectedRole?.id === role.id
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-ink-200 hover:border-ink-300 hover:bg-ink-50',
              )}
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-600 to-accent-600 flex items-center justify-center text-white font-bold font-display shrink-0">
                {ROLES.indexOf(role) + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-ink-900">{role.label}</p>
                <p className="text-xs text-ink-500 mt-0.5">{role.description}</p>
              </div>
              {selectedRole?.id === role.id && <Check className="w-5 h-5 text-primary-600 shrink-0" />}
            </button>
          ))}
        </div>
        <div className="px-6 pb-6 flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button
            onClick={() => selectedRole && handleLogin(selectedRole.id)}
            disabled={!selectedRole}
            className="btn-primary flex-1"
          >
            Continue <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
