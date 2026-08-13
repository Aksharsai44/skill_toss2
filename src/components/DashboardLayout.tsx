import { useState, type ReactNode, useEffect, useRef } from 'react';
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
import { useAuth } from '@/lib/authContext';
import { getNavigationForRole, roleLabels } from '@/lib/nav';
import { cn } from '@/lib/cn';
import { useStudentPortal } from '@/lib/studentPortalContext';
import { useLmsData } from '@/lib/lmsDataContext';
import { emphasize, enter, openPopup } from '@/lib/motion';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard, Building2, Tags, ToggleLeft, Palette, Inbox, Network, TrendingUp,
  Target, FileBarChart, GraduationCap, Users, Layers, CreditCard, Wallet, Fingerprint,
  CalendarOff, CalendarDays, Plug, Award, Calendar, Video, PlayCircle, CheckSquare,
  ClipboardList, FileQuestion, FolderOpen, MessagesSquare, UserCircle, NotebookPen,
  BookOpen, Sparkles, Settings, LifeBuoy, Building, ShieldCheck,
};

export function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, profile, signOut } = useAuth();
  const { permissions, activeStudentId } = useStudentPortal();
  const { state, feedback, clearFeedback, searchRecords, markNotificationRead, markAllNotificationsRead } = useLmsData();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchOpen = searchQuery.trim().length >= 2;

  const notificationsRef = useRef<HTMLDivElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const searchResultsRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLElement>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (showNotifications && notificationsRef.current) {
      notificationsRef.current.focus();
      openPopup(notificationsRef.current);
    }
  }, [showNotifications]);

  useEffect(() => {
    if (showProfile && profileMenuRef.current) {
      profileMenuRef.current.focus();
      openPopup(profileMenuRef.current);
    }
  }, [showProfile]);

  useEffect(() => {
    if (searchOpen && searchResultsRef.current) openPopup(searchResultsRef.current);
  }, [searchOpen]);

  useEffect(() => {
    if (!contentRef.current) return;
    const heading = contentRef.current.querySelector<HTMLElement>('h1');
    const sections = Array.from(contentRef.current.querySelectorAll<HTMLElement>('.card')).slice(0, 6);
    const targets = heading ? [heading, ...sections] : sections.length ? sections : [contentRef.current];
    const animation = enter(targets, { offset: 8, duration: 280, staggerMs: 40 });
    return () => { animation.pause(); };
  }, [location.pathname, activeStudentId]);

  useEffect(() => {
    if (!feedback || !feedbackRef.current) return;
    const animation = emphasize(feedbackRef.current);
    const values = contentRef.current ? Array.from(contentRef.current.querySelectorAll<HTMLElement>('[data-kpi-value]')) : [];
    const valueAnimation = values.length ? emphasize(values) : null;
    return () => { animation.pause(); valueAnimation?.pause(); };
  }, [feedback]);

  const notificationUserId = activeStudentId ?? profile?.id ?? '';
  const notifications = state.notifications.filter((notification) => notification.userId === notificationUserId).sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  const unreadCount = notifications.filter((notification) => !notification.read).length;
  const searchResults = searchRecords(searchQuery, activeStudentId ?? undefined);

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
    <div className="min-h-screen bg-ink-50/80 flex">
      {/* Sidebar */}
      <aside
        className={cn(
          'fixed lg:sticky top-0 left-0 z-40 h-screen w-64 bg-white border-r border-ink-200/80 flex flex-col transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
      >
        <div className="flex items-center gap-2.5 px-5 h-16 border-b border-ink-100 shrink-0">
          <div className="w-9 h-9 rounded-lg bg-primary-600 flex items-center justify-center text-white font-bold font-display">
            ST
          </div>
          <div>
            <p className="font-bold font-display text-ink-900 leading-none">Skill Toss</p>
            <p className="text-[10px] text-ink-400 mt-0.5">{roleLabels[profile.role]} Portal</p>
          </div>
          <button aria-label="Close navigation" onClick={() => setMobileOpen(false)} className="btn-ghost lg:hidden ml-auto p-2 text-ink-500">
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
        <header className="app-chrome sticky top-0 z-20 h-16 bg-white border-b border-ink-200 flex items-center px-3 sm:px-4 lg:px-6 gap-3 lg:gap-4">
          <button aria-label="Open navigation" aria-expanded={mobileOpen} onClick={() => setMobileOpen(true)} className="btn-ghost lg:hidden p-2 text-ink-500">
            <Menu className="w-5 h-5" />
          </button>

          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
            <input
              aria-label={profile.role === 'student' || profile.role === 'parent' ? 'Search courses, assignments, resources…' : 'Search students, batches, records…'}
              placeholder={profile.role === 'student' || profile.role === 'parent' ? 'Search courses, assignments, resources…' : 'Search students, batches, records…'}
              className="w-full min-h-10 pl-9 pr-4 py-2 text-sm bg-ink-50 border border-ink-200 rounded-control placeholder:text-ink-400 focus:bg-white focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/15 transition-colors duration-150"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
            {searchOpen && (
              <div ref={searchResultsRef} className="absolute left-0 right-0 top-full mt-2 z-30 bg-white border border-ink-200 rounded-xl shadow-pop overflow-hidden origin-top" role="listbox" aria-label="Search results">
                {searchResults.length ? searchResults.map((item) => (
                  <button key={`${item.type}-${item.id}`} onClick={() => { navigate(item.path); setSearchQuery(''); }} className="w-full px-4 py-3 text-left hover:bg-ink-50 border-b border-ink-50 last:border-0">
                    <span className="block text-sm font-semibold text-ink-800">{item.title}</span>
                    <span className="block text-xs text-ink-400 capitalize">{item.type} · {item.subtitle}</span>
                  </button>
                )) : <p className="p-4 text-sm text-ink-500">No matching courses, assignments, resources, or exams.</p>}
              </div>
            )}
          </div>

          <div className="relative flex items-center gap-1.5">
            <button
              aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
              aria-expanded={showNotifications}
              onClick={() => setShowNotifications((open) => !open)}
              className="relative p-2 text-ink-500 hover:bg-ink-100 rounded-xl transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-0.5 right-0.5 min-w-4 h-4 px-1 bg-error-500 text-white text-[10px] leading-4 rounded-full ring-2 ring-white">{unreadCount}</span>
              )}
            </button>
            {showNotifications && (
              <>
                <button aria-label="Close notifications" className="fixed inset-0 z-10 cursor-default" onClick={() => setShowNotifications(false)} />
                <section
                  role="dialog"
                  aria-modal="true"
                  aria-label="Notification center"
                  ref={notificationsRef}
                  tabIndex={-1}
                  onKeyDown={(e) => { if (e.key === 'Escape') setShowNotifications(false); }}
                  className="absolute right-0 top-full mt-2 w-[min(22rem,calc(100vw-1.5rem))] bg-white rounded-dialog shadow-pop border border-ink-200 z-20 overflow-hidden origin-top-right"
                >
                  <div className="p-4 border-b border-ink-100 flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-bold">Notifications</h2>
                      <p className="text-xs text-ink-400">Academic, fees and class updates</p>
                    </div>
                    {unreadCount > 0 && (
                      <button onClick={() => markAllNotificationsRead(notificationUserId)} className="text-xs font-semibold text-primary-600">
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="p-6 text-sm text-center text-ink-500">No notifications.</p>
                    ) : (
                      notifications.map((notification) => {
                        const unread = !notification.read;
                        return (
                          <button
                            key={notification.id}
                            onClick={() => {
                              markNotificationRead(notification.id);
                              setShowNotifications(false);
                              if (notification.path) navigate(notification.path);
                            }}
                            className={cn('w-full text-left p-4 border-b border-ink-50 hover:bg-ink-50 flex gap-3', unread && 'bg-primary-50/50')}
                          >
                            <span className={cn('mt-1 w-2 h-2 rounded-full shrink-0', unread ? 'bg-primary-600' : 'bg-ink-200')} />
                            <span className="min-w-0">
                              <span className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-ink-800">{notification.title}</span>
                                <span className="text-[10px] text-primary-700 bg-primary-100 rounded-full px-2 py-0.5 capitalize">{notification.type}</span>
                              </span>
                              <span className="block text-xs text-ink-500 mt-0.5">{notification.message}</span>
                              <span className="block text-[10px] text-ink-400 mt-1">{new Date(notification.timestamp).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                            </span>
                          </button>
                        );
                      })
                    )}
                  </div>
                </section>
              </>
            )}

            <button
              onClick={() => setShowProfile(!showProfile)}
              aria-label="Open account menu"
              aria-expanded={showProfile}
              className="flex items-center gap-2.5 p-1 pr-2 hover:bg-ink-100 rounded-xl transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30"
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
                <div
                  ref={profileMenuRef}
                  tabIndex={-1}
                  onKeyDown={(e) => { if (e.key === 'Escape') setShowProfile(false); }}
                  className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-pop border border-ink-200 py-2 z-20 origin-top-right"
                >
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
        <main ref={contentRef} className="flex-1 p-4 sm:p-5 lg:p-7 max-w-[1440px] w-full mx-auto" id="main-content">
          {feedback && <div ref={feedbackRef} role="status" aria-live="polite" className={cn('mb-4 rounded-xl border px-4 py-3 text-sm font-medium flex items-center justify-between', feedback.kind === 'success' ? 'bg-success-50 border-success-200 text-success-700' : 'bg-error-50 border-error-200 text-error-700')}><span>{feedback.message}</span><button onClick={clearFeedback} aria-label="Dismiss message"><X className="w-4 h-4" /></button></div>}
          {children}
        </main>
      </div>
    </div>
  );
}

