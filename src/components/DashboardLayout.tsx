import { useState, type ReactNode } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Building2, Tags, ToggleLeft, Palette, Inbox, Network, TrendingUp,
  Target, FileBarChart, GraduationCap, Users, Layers, CreditCard, Wallet, Fingerprint,
  CalendarOff, CalendarDays, Plug, Award, Calendar, Video, PlayCircle, CheckSquare,
  ClipboardList, FileQuestion, FolderOpen, MessagesSquare, UserCircle, NotebookPen,
  BookOpen, Sparkles, LogOut, Menu, X, Search, Bell, ChevronDown, Settings,
} from 'lucide-react';
import * as Icons from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { navConfig, roleLabels } from '@/lib/nav';
import { cn } from '@/lib/cn';
import type { Role } from '@/lib/types';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard, Building2, Tags, ToggleLeft, Palette, Inbox, Network, TrendingUp,
  Target, FileBarChart, GraduationCap, Users, Layers, CreditCard, Wallet, Fingerprint,
  CalendarOff, CalendarDays, Plug, Award, Calendar, Video, PlayCircle, CheckSquare,
  ClipboardList, FileQuestion, FolderOpen, MessagesSquare, UserCircle, NotebookPen,
  BookOpen, Sparkles, Settings,
};

export function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  if (!user) return null;
  const groups = navConfig[user.role] || [];

  return (
    <div className="min-h-screen bg-ink-50 flex">
      {/* Sidebar */}
      <aside
        className={cn(
          'fixed lg:sticky top-0 left-0 z-40 h-screen w-64 bg-white border-r border-ink-200 flex flex-col transition-transform duration-300',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
      >
        <div className="flex items-center gap-2.5 px-5 h-16 border-b border-ink-100 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-600 to-accent-600 flex items-center justify-center text-white font-bold font-display">
            ST
          </div>
          <div>
            <p className="font-bold font-display text-ink-900 leading-none">Skill Toss</p>
            <p className="text-[10px] text-ink-400 mt-0.5">{roleLabels[user.role]} Portal</p>
          </div>
          <button onClick={() => setMobileOpen(false)} className="lg:hidden ml-auto p-1 text-ink-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto scrollbar-thin px-3 py-4 space-y-6">
          {groups.map((group) => (
            <div key={group.group}>
              <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider text-ink-400">{group.group}</p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = iconMap[item.icon] || Icons.Circle;
                  const isActive = location.pathname === item.path;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileOpen(false)}
                      className={cn('sidebar-link', isActive && 'sidebar-link-active')}
                    >
                      <Icon className="w-[18px] h-[18px] shrink-0" />
                      <span>{item.label}</span>
                      {item.badge && (
                        <span className="ml-auto badge bg-primary-100 text-primary-700 text-[10px] px-1.5 py-0.5">
                          {item.badge}
                        </span>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-ink-100 p-3 shrink-0">
          <button
            onClick={() => { logout(); navigate('/'); }}
            className="sidebar-link w-full text-error-600 hover:bg-error-50 hover:text-error-700"
          >
            <LogOut className="w-[18px] h-[18px]" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {mobileOpen && <div className="fixed inset-0 z-30 bg-ink-950/30 lg:hidden" onClick={() => setMobileOpen(false)} />}

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-20 h-16 bg-white/80 backdrop-blur-md border-b border-ink-100 flex items-center px-4 lg:px-6 gap-4">
          <button onClick={() => setMobileOpen(true)} className="lg:hidden p-2 text-ink-500 hover:bg-ink-100 rounded-lg">
            <Menu className="w-5 h-5" />
          </button>

          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
            <input
              placeholder="Search students, batches, fees..."
              className="w-full pl-9 pr-4 py-2 text-sm bg-ink-50 border border-transparent rounded-xl focus:bg-white focus:border-ink-200 focus:outline-none transition"
            />
          </div>

          <button className="relative p-2 text-ink-500 hover:bg-ink-100 rounded-xl transition">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-error-500 rounded-full ring-2 ring-white" />
          </button>

          <div className="relative">
            <button
              onClick={() => setShowProfile(!showProfile)}
              className="flex items-center gap-2.5 p-1 pr-2 hover:bg-ink-100 rounded-xl transition"
            >
              <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-lg bg-ink-100" />
              <div className="hidden sm:block text-left">
                <p className="text-sm font-semibold text-ink-800 leading-none">{user.name}</p>
                <p className="text-[11px] text-ink-400 mt-0.5">{user.institution}</p>
              </div>
              <ChevronDown className="w-4 h-4 text-ink-400 hidden sm:block" />
            </button>
            {showProfile && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowProfile(false)} />
                <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-pop border border-ink-100 py-2 z-20 animate-scale-in">
                  <div className="px-4 py-2 border-b border-ink-50">
                    <p className="text-sm font-semibold text-ink-800">{user.name}</p>
                    <p className="text-xs text-ink-400">{user.email}</p>
                  </div>
                  <button className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-ink-600 hover:bg-ink-50 transition">
                    <UserCircle className="w-4 h-4" /> My Profile
                  </button>
                  <button className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-ink-600 hover:bg-ink-50 transition">
                    <Settings className="w-4 h-4" /> Settings
                  </button>
                  <button
                    onClick={() => { logout(); navigate('/'); }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-error-600 hover:bg-error-50 transition border-t border-ink-50 mt-1 pt-2"
                  >
                    <LogOut className="w-4 h-4" /> Sign Out
                  </button>
                </div>
              </>
            )}
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 lg:p-6 max-w-[1400px] w-full mx-auto animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  );
}

export { iconMap };
export type { Role };
