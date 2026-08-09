import { useState, type ReactNode } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Building2, Tags, ToggleLeft, Palette, Inbox, Network, TrendingUp,
  Target, FileBarChart, GraduationCap, Users, Layers, CreditCard, Wallet, Fingerprint,
  CalendarOff, CalendarDays, Plug, Award, Calendar, Video, PlayCircle, CheckSquare,
  ClipboardList, FileQuestion, FolderOpen, MessagesSquare, UserCircle, NotebookPen,
  BookOpen, Sparkles, LogOut, Menu, X, Search, Bell, ChevronDown, Settings,
  LifeBuoy, Building, ShieldCheck,
} from 'lucide-react';
import * as Icons from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { getNavigationForRole, roleLabels } from '@/lib/nav';
import { cn } from '@/lib/cn';
import type { Role } from '@/lib/types';
import { useStudentPortal } from '@/lib/studentPortal';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard, Building2, Tags, ToggleLeft, Palette, Inbox, Network, TrendingUp,
  Target, FileBarChart, GraduationCap, Users, Layers, CreditCard, Wallet, Fingerprint,
  CalendarOff, CalendarDays, Plug, Award, Calendar, Video, PlayCircle, CheckSquare,
  ClipboardList, FileQuestion, FolderOpen, MessagesSquare, UserCircle, NotebookPen,
  BookOpen, Sparkles, Settings, LifeBuoy, Building, ShieldCheck,
};

export function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, profile, signOut } = useAuth();
  const { permissions } = useStudentPortal();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [readNotifications, setReadNotifications] = useState<string[]>([]);

  const notifications = profile?.role === 'student' || profile?.role === 'parent' ? [
    { id: 'attendance', category: 'Academic', title: 'Attendance warning', detail: 'Operating Systems attendance is 74%', time: '20 min ago', path: '/student/classes' },
    { id: 'grade', category: 'Academic', title: 'Assignment graded', detail: 'Data Structures · 18 / 20', time: '2 hours ago', path: '/student/assignments' },
    { id: 'fee', category: 'Fees', title: 'Fee reminder', detail: '₹15,000 due 12 Aug', time: 'Yesterday', path: '/student/fees' },
  ] : [];
  const unreadCount = notifications.filter((notification) => !readNotifications.includes(notification.id)).length;

  if (!profile) return null;
  const groups = getNavigationForRole(profile.role, permissions);
  const displayName = profile.fullName || user?.email?.split('@')[0] || 'User';
  const displayAvatar = profile.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(displayName)}&backgroundColor=2563eb,0891b2,16a34a,d97706&textColor=ffffff`;
  const displayInstitution = profile.institutionId || 'Bright Future College';

  const handleSignOut = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

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
            <p className="text-[10px] text-ink-400 mt-0.5">{roleLabels[profile.role]} Portal</p>
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
            onClick={handleSignOut}
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

          <div className="relative">
            <button
              aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
              aria-expanded={showNotifications}
              onClick={() => setShowNotifications((open) => !open)}
              className="relative p-2 text-ink-500 hover:bg-ink-100 rounded-xl transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && <span className="absolute top-0.5 right-0.5 min-w-4 h-4 px-1 bg-error-500 text-white text-[10px] leading-4 rounded-full ring-2 ring-white">{unreadCount}</span>}
            </button>
            {showNotifications && (
              <>
                <button aria-label="Close notifications" className="fixed inset-0 z-10 cursor-default" onClick={() => setShowNotifications(false)} />
                <section className="absolute right-0 top-full mt-2 w-[min(22rem,calc(100vw-2rem))] bg-white rounded-2xl shadow-pop border border-ink-100 z-20 overflow-hidden" aria-label="Notification center">
                  <div className="p-4 border-b border-ink-100 flex items-center justify-between">
                    <div><h2 className="text-sm font-bold">Notifications</h2><p className="text-xs text-ink-400">Academic, fees and class updates</p></div>
                    {unreadCount > 0 && <button onClick={() => setReadNotifications(notifications.map((item) => item.id))} className="text-xs font-semibold text-primary-600">Mark all read</button>}
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? <p className="p-6 text-sm text-center text-ink-500">No notifications.</p> : notifications.map((notification) => {
                      const unread = !readNotifications.includes(notification.id);
                      return <button key={notification.id} onClick={() => { setReadNotifications((items) => items.includes(notification.id) ? items : [...items, notification.id]); setShowNotifications(false); navigate(notification.path); }} className={cn('w-full text-left p-4 border-b border-ink-50 hover:bg-ink-50 flex gap-3', unread && 'bg-primary-50/50')}>
                        <span className={cn('mt-1 w-2 h-2 rounded-full shrink-0', unread ? 'bg-primary-600' : 'bg-ink-200')} />
                        <span className="min-w-0"><span className="flex items-center gap-2"><span className="text-sm font-semibold text-ink-800">{notification.title}</span><span className="text-[10px] text-primary-700 bg-primary-100 rounded-full px-2 py-0.5">{notification.category}</span></span><span className="block text-xs text-ink-500 mt-0.5">{notification.detail}</span><span className="block text-[10px] text-ink-400 mt-1">{notification.time}</span></span>
                      </button>;
                    })}
                  </div>
                </section>
              </>
            )}
          </div>

          <div className="relative">
            <button
              onClick={() => setShowProfile(!showProfile)}
              className="flex items-center gap-2.5 p-1 pr-2 hover:bg-ink-100 rounded-xl transition"
            >
              <img src={displayAvatar} alt={displayName} className="w-8 h-8 rounded-lg bg-ink-100 object-cover" />
              <div className="hidden sm:block text-left">
                <p className="text-sm font-semibold text-ink-800 leading-none">{displayName}</p>
                <p className="text-[11px] text-ink-400 mt-0.5">{displayInstitution}</p>
              </div>
              <ChevronDown className="w-4 h-4 text-ink-400 hidden sm:block" />
            </button>
            {showProfile && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowProfile(false)} />
                <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-pop border border-ink-100 py-2 z-20 animate-scale-in">
                  <div className="px-4 py-2 border-b border-ink-50">
                    <p className="text-sm font-semibold text-ink-800">{displayName}</p>
                    <p className="text-xs text-ink-400">{user?.email}</p>
                  </div>
                  <button className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-ink-600 hover:bg-ink-50 transition">
                    <UserCircle className="w-4 h-4" /> My Profile
                  </button>
                  <button className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-ink-600 hover:bg-ink-50 transition">
                    <Settings className="w-4 h-4" /> Settings
                  </button>
                  <button
                    onClick={handleSignOut}
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
