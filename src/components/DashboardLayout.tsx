import { useState, type ReactNode, useEffect, useRef } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Building2, Tags, ToggleLeft, Palette, Inbox, Network, TrendingUp,
  Target, FileBarChart, GraduationCap, Users, Layers, CreditCard, Wallet, Fingerprint,
  CalendarOff, CalendarDays, Plug, Award, Calendar, Video, PlayCircle, CheckSquare,
  ClipboardList, FileQuestion, FolderOpen, MessagesSquare, UserCircle, NotebookPen,
  BookOpen, Sparkles, LogOut, Menu, X, Search, Bell, ChevronDown, Settings,
  LifeBuoy, Building, ShieldCheck, Leaf, Lightbulb, Megaphone, Database, Clock, Map, UserPlus
} from 'lucide-react';
import * as Icons from 'lucide-react';
import { useAuth } from '@/lib/authContext';
import { getNavigationForRole, roleLabels } from '@/lib/nav';
import type { Role } from '@/lib/types';
import { cn } from '@/lib/cn';
import { useStudentPortal } from '@/lib/studentPortalContext';
import { useLmsData } from '@/lib/lmsDataContext';
import { useNotificationPreferences } from '@/lib/notificationPreferences';
import { emphasize, enter, openPopup } from '@/lib/motion';
import { Modal } from '@/components/ui/Modal';
import { StatusBadge } from '@/components/ui/Badge';
import { ChangePasswordForm } from '@/components/ChangePasswordForm';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard, Building2, Tags, ToggleLeft, Palette, Inbox, Network, TrendingUp,
  Target, FileBarChart, GraduationCap, Users, Layers, CreditCard, Wallet, Fingerprint,
  CalendarOff, CalendarDays, Plug, Award, Calendar, Video, PlayCircle, CheckSquare,
  ClipboardList, FileQuestion, FolderOpen, MessagesSquare, UserCircle, NotebookPen,
  BookOpen, Sparkles, Settings, LifeBuoy, Building, ShieldCheck, UserPlus,
  Leaf, Lightbulb, Megaphone, Database, Clock, Map,
};

/*
 * Account-menu destinations, keyed by role. Only routes that exist in AppRoutes appear here —
 * anything missing renders as a disabled item with an explanation instead of navigating into
 * the catch-all redirect, which used to bounce admins back to the marketing page.
 */
const PROFILE_ROUTES: Partial<Record<Role, string>> = {
  teacher: '/teacher/profile',
  student: '/student/profile',
  parent: '/student/profile',
};
const SETTINGS_ROUTES: Partial<Record<Role, string>> = {
  student: '/student/settings',
  parent: '/student/settings',
};

export function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, profile, signOut } = useAuth();
  const { permissions, activeStudentId, isParent, linkedStudents, selectedStudentId, selectedStudent, selectStudent } = useStudentPortal();
  const { state, feedback, clearFeedback, searchRecords, markNotificationRead, markAllNotificationsRead } = useLmsData();
  const { isMuted } = useNotificationPreferences();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchOpen = searchQuery.trim().length >= 2;

  const notificationsRef = useRef<HTMLDivElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const searchResultsRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLElement>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLButtonElement>(null);
  const accountRef = useRef<HTMLButtonElement>(null);
  const menuToggleRef = useRef<HTMLButtonElement>(null);
  const sidebarCloseRef = useRef<HTMLButtonElement>(null);

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

  // The sidebar is a mobile overlay, so opening it moves focus in and closing it hands focus
  // back to the trigger rather than dropping the caret at the top of the document.
  useEffect(() => {
    if (mobileOpen) sidebarCloseRef.current?.focus();
  }, [mobileOpen]);

  const closeSidebar = () => {
    setMobileOpen(false);
    menuToggleRef.current?.focus({ preventScroll: true });
  };
  const closeNotifications = () => {
    setShowNotifications(false);
    bellRef.current?.focus({ preventScroll: true });
  };
  const closeProfile = () => {
    setShowProfile(false);
    accountRef.current?.focus({ preventScroll: true });
  };

  useEffect(() => {
    if (searchOpen && searchResultsRef.current) openPopup(searchResultsRef.current);
  }, [searchOpen]);

  useEffect(() => {
    if (!contentRef.current) return;
    const heading = contentRef.current.querySelector<HTMLElement>('h1');
    const sections = Array.from(contentRef.current.querySelectorAll<HTMLElement>('.card')).slice(0, 6);
    const targets = heading ? [heading, ...sections] : sections.length ? sections : [contentRef.current];
    const animation = enter(targets, { offset: 8, duration: 280, staggerMs: 40 });
    return () => { 
      animation.pause(); 
      targets.forEach(t => {
        if (t) {
          t.style.opacity = '';
          t.style.transform = '';
        }
      });
    };
  }, [location.pathname, activeStudentId]);

  useEffect(() => {
    if (!feedback || !feedbackRef.current) return;
    const animation = emphasize(feedbackRef.current);
    const values = contentRef.current ? Array.from(contentRef.current.querySelectorAll<HTMLElement>('[data-kpi-value]')) : [];
    const valueAnimation = values.length ? emphasize(values) : null;
    return () => { animation.pause(); valueAnimation?.pause(); };
  }, [feedback]);

  const notificationUserId = activeStudentId ?? profile?.id ?? '';
  // Muted types are dropped here so the bell badge cannot disagree with the Notifications page.
  const notifications = state.notifications.filter((notification) => notification.userId === notificationUserId && !isMuted(notification.type)).sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  const unreadCount = notifications.filter((notification) => !notification.read).length;
  const searchResults = searchRecords(searchQuery, { studentId: activeStudentId ?? undefined, role: profile?.role });

  if (!profile) return null;
  const groups = getNavigationForRole(profile.role, permissions);
  const displayName = profile.fullName || user?.email?.split('@')[0] || 'User';
  const displayAvatar = profile.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(displayName)}&backgroundColor=2563eb,0891b2,16a34a,d97706&textColor=ffffff`;
  // Product Admin legitimately has no tenant (profiles_product_admin_has_no_tenant), so fall
  // back to the role label rather than naming an institution this account is not part of.
  const displayInstitution = profile.institutionId
    ? (profile.institutionId === state.institution.id ? state.institution.name : profile.institutionId)
    : roleLabels[profile.role];
  const profileRoute = PROFILE_ROUTES[profile.role];
  const settingsRoute = SETTINGS_ROUTES[profile.role];

  const handleSignOut = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-ink-50 flex">
      {/* Sidebar */}
      <aside
        onKeyDown={(event) => { if (event.key === 'Escape' && mobileOpen) closeSidebar(); }}
        className={cn(
          'fixed lg:sticky top-0 left-0 z-40 h-screen w-64 bg-white border-r border-ink-200 flex flex-col transition-[transform,visibility] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]',
          // `invisible` (not just the off-screen transform) keeps the closed mobile drawer out of
          // the tab order; transitioning visibility defers the hide until the slide-out finishes.
          mobileOpen ? 'translate-x-0' : '-translate-x-full invisible lg:visible lg:translate-x-0',
        )}
      >
        <div className="flex items-center gap-2.5 px-5 h-16 border-b border-ink-100 shrink-0">
          <div className="w-9 h-9 rounded-lg bg-primary-600 flex items-center justify-center text-white font-bold font-display shrink-0">
            ST
          </div>
          <div className="min-w-0">
            <p className="font-bold font-display text-ink-900 leading-none">Skill Toss</p>
            <p className="text-[11px] text-ink-500 mt-1 truncate">{roleLabels[profile.role]} Portal</p>
          </div>
          <button ref={sidebarCloseRef} aria-label="Close navigation" onClick={closeSidebar} className="btn-icon lg:hidden ml-auto -mr-2 text-ink-500">
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto scrollbar-thin px-3 py-4 space-y-6">
          {groups.map((group) => (
            <div key={group.group}>
              <p className="px-3 mb-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-400">{group.group}</p>
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
                      <Icon className="w-[18px] h-[18px] shrink-0" aria-hidden="true" />
                      <span className="truncate">{item.label}</span>
                      {item.badge && (
                        <span className="ml-auto badge bg-primary-100 text-primary-700 text-[11px] px-1.5 py-0.5 tabular-nums shrink-0">
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
            className="sidebar-link w-full hover:bg-error-50 hover:text-error-700"
          >
            <LogOut className="w-[18px] h-[18px]" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {mobileOpen && <div className="fixed inset-0 z-30 bg-ink-950/30 lg:hidden" aria-hidden="true" onClick={closeSidebar} />}

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Topbar */}
        <header className="app-chrome sticky top-0 z-20 h-16 bg-white border-b border-ink-200 flex items-center px-3 sm:px-4 lg:px-6 gap-3 lg:gap-4">
          <button ref={menuToggleRef} aria-label="Open navigation" aria-expanded={mobileOpen} onClick={() => setMobileOpen(true)} className="btn-icon lg:hidden -ml-2 text-ink-500">
            <Menu className="w-5 h-5" aria-hidden="true" />
          </button>

          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" aria-hidden="true" />
            <input
              aria-label={profile.role === 'student' || profile.role === 'parent' ? 'Search courses, assignments, resources…' : 'Search students, batches, records…'}
              placeholder={profile.role === 'student' || profile.role === 'parent' ? 'Search courses, assignments, resources…' : 'Search students, batches, records…'}
              className="w-full min-h-10 pl-9 pr-4 py-2 text-sm bg-ink-50 border border-ink-200 rounded-control text-ink-900 placeholder:text-ink-400 focus:bg-white focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-colors duration-150"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              onKeyDown={(event) => { if (event.key === 'Escape' && searchQuery) { event.stopPropagation(); setSearchQuery(''); } }}
              aria-expanded={searchOpen}
              aria-controls="global-search-results"
              aria-describedby="global-search-status"
            />
            {/*
              Results are ordinary buttons in document order, so they are reachable with Tab
              without listbox/option roles that would have to fake their own keyboard model.
              The status line is what tells a screen reader the list changed.
            */}
            <p id="global-search-status" role="status" className="sr-only">
              {searchOpen ? `${searchResults.length} result${searchResults.length === 1 ? '' : 's'} for ${searchQuery.trim()}` : ''}
            </p>
            {searchOpen && (
              <div id="global-search-results" ref={searchResultsRef} className="absolute left-0 right-0 top-full mt-2 z-30 bg-white border border-ink-200 rounded-dialog shadow-pop overflow-hidden origin-top">
                {searchResults.length ? searchResults.map((item) => (
                  <button key={`${item.type}-${item.id}`} onClick={() => { navigate(item.path); setSearchQuery(''); }} className="w-full px-4 py-3 text-left hover:bg-ink-50 focus-visible:outline-none focus-visible:bg-ink-100 border-b border-ink-100 last:border-0 transition-colors">
                    <span className="block text-sm font-semibold text-ink-800">{item.title}</span>
                    <span className="block text-xs text-ink-500 mt-0.5 capitalize">{item.type} · {item.subtitle}</span>
                  </button>
                )) : <p className="p-4 text-sm text-ink-500">No matching records.</p>}
              </div>
            )}
          </div>

          {isParent && selectedStudent && <div className="hidden md:flex items-center gap-2 border-l border-ink-200 pl-3">
            <GraduationCap className="w-4 h-4 text-primary-700 shrink-0" aria-hidden="true" />
            <div><p className="text-[11px] uppercase tracking-[0.06em] font-semibold text-ink-500">Viewing student</p>{linkedStudents.length > 1 ? <select aria-label="Select linked student" value={selectedStudentId ?? ''} onChange={(event) => selectStudent(event.target.value)} className="max-w-40 bg-transparent text-xs font-semibold text-ink-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded-control"><option value="" disabled>Select student</option>{linkedStudents.map((student) => <option key={student.id} value={student.id}>{student.name}</option>)}</select> : <p className="max-w-40 truncate text-xs font-semibold text-ink-800">{selectedStudent.name}</p>}</div>
          </div>}

          <div className="relative flex items-center gap-1.5">
            <button
              ref={bellRef}
              aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
              aria-expanded={showNotifications}
              onClick={() => (showNotifications ? closeNotifications() : setShowNotifications(true))}
              className="btn-icon relative text-ink-500"
            >
              <Bell className="w-5 h-5" aria-hidden="true" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 min-w-4 h-4 px-1 bg-error-500 text-white text-[10px] leading-4 rounded-full ring-2 ring-white">{unreadCount}</span>
              )}
            </button>
            {showNotifications && (
              <>
                <div className="fixed inset-0 z-10" aria-hidden="true" onClick={closeNotifications} />
                {/*
                  A popover, not a dialog: focus is not trapped and the page behind stays usable,
                  so it must not claim aria-modal. Escape closes it and returns focus to the bell.
                */}
                <section
                  aria-label="Notification center"
                  ref={notificationsRef}
                  tabIndex={-1}
                  onKeyDown={(e) => { if (e.key === 'Escape') closeNotifications(); }}
                  className="absolute right-0 top-full mt-2 w-[min(22rem,calc(100vw-1.5rem))] bg-white rounded-dialog shadow-pop border border-ink-200 z-20 overflow-hidden origin-top-right focus-visible:outline-none"
                >
                  <div className="p-4 border-b border-ink-100 flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-sm font-semibold text-ink-900">Notifications</h2>
                      <p className="text-xs text-ink-500 mt-0.5">Academic, fees and class updates</p>
                    </div>
                    {unreadCount > 0 && (
                      <button onClick={() => markAllNotificationsRead(notificationUserId)} className="text-xs font-semibold text-primary-600 hover:text-primary-700 rounded focus-ring">
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
                            className={cn('w-full text-left p-4 border-b border-ink-100 last:border-0 hover:bg-ink-50 focus-visible:outline-none focus-visible:bg-ink-100 transition-colors flex gap-3', unread && 'bg-primary-50/50')}
                          >
                            <span className={cn('mt-1.5 w-2 h-2 rounded-full shrink-0', unread ? 'bg-primary-600' : 'bg-ink-300')} aria-hidden="true" />
                            <span className="min-w-0">
                              <span className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-ink-800">{notification.title}</span>
                                <span className="text-[11px] font-medium text-ink-600 bg-ink-100 rounded-md px-1.5 py-0.5 capitalize shrink-0">{notification.type}</span>
                              </span>
                              <span className="block text-xs leading-5 text-ink-500 mt-1">{notification.message}</span>
                              <span className="block text-[11px] text-ink-500 mt-1.5 tabular-nums">{new Date(notification.timestamp).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
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
              ref={accountRef}
              onClick={() => (showProfile ? closeProfile() : setShowProfile(true))}
              aria-label="Open account menu"
              aria-expanded={showProfile}
              className="flex items-center gap-2.5 min-h-11 p-1 pr-2 hover:bg-ink-100 rounded-lg transition-colors duration-150 focus-ring"
            >
              <img src={displayAvatar} alt="" className="w-8 h-8 rounded-lg bg-ink-100 object-cover shrink-0" />
              <div className="hidden sm:block text-left min-w-0">
                <p className="text-sm font-semibold text-ink-800 leading-none truncate">{displayName}</p>
                <p className="text-[11px] text-ink-500 mt-1 truncate">{displayInstitution}</p>
              </div>
              <ChevronDown className="w-4 h-4 text-ink-400 hidden sm:block shrink-0" aria-hidden="true" />
            </button>
            {showProfile && (
              <>
                <div className="fixed inset-0 z-10" aria-hidden="true" onClick={closeProfile} />
                <div
                  ref={profileMenuRef}
                  tabIndex={-1}
                  onKeyDown={(e) => { if (e.key === 'Escape') closeProfile(); }}
                  className="absolute right-0 top-full mt-2 w-60 bg-white rounded-dialog shadow-pop border border-ink-200 py-2 z-20 origin-top-right focus-visible:outline-none"
                >
                  <div className="px-4 py-2 mb-1 border-b border-ink-100">
                    <p className="text-sm font-semibold text-ink-800 truncate">{displayName}</p>
                    <p className="text-xs text-ink-500 truncate">{user?.email}</p>
                  </div>
                  {profileRoute ? (
                    <button onClick={() => { setShowProfile(false); navigate(profileRoute); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-ink-600 hover:bg-ink-50 hover:text-ink-900 focus-visible:outline-none focus-visible:bg-ink-100 transition-colors">
                      <UserCircle className="w-4 h-4" aria-hidden="true" /> My Profile
                    </button>
                  ) : (
                    <button onClick={() => { setShowProfile(false); setShowAccountModal(true); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-ink-600 hover:bg-ink-50 hover:text-ink-900 focus-visible:outline-none focus-visible:bg-ink-100 transition-colors">
                      <UserCircle className="w-4 h-4" aria-hidden="true" /> My Account Overview
                    </button>
                  )}
                  {settingsRoute ? (
                    <button onClick={() => { setShowProfile(false); navigate(settingsRoute); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-ink-600 hover:bg-ink-50 hover:text-ink-900 focus-visible:outline-none focus-visible:bg-ink-100 transition-colors">
                      <Settings className="w-4 h-4" aria-hidden="true" /> Settings
                    </button>
                  ) : (
                    <button onClick={() => { setShowProfile(false); setShowAccountModal(true); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-ink-600 hover:bg-ink-50 hover:text-ink-900 focus-visible:outline-none focus-visible:bg-ink-100 transition-colors">
                      <Settings className="w-4 h-4" aria-hidden="true" /> System Settings
                    </button>
                  )}
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-ink-600 hover:bg-error-50 hover:text-error-700 focus-visible:outline-none focus-visible:bg-error-50 transition-colors border-t border-ink-100 mt-1 pt-2.5"
                  >
                    <LogOut className="w-4 h-4" aria-hidden="true" /> Sign Out
                  </button>
                </div>
              </>
            )}
          </div>
        </header>

        {/* Content */}
        <main ref={contentRef} className="flex-1 p-4 sm:p-5 lg:p-7 max-w-[1440px] w-full mx-auto" id="main-content">
          {isParent && selectedStudent && <div className="md:hidden mb-4 rounded-card border border-ink-200 bg-white shadow-soft p-3 flex items-center gap-3"><GraduationCap className="w-5 h-5 text-primary-700 shrink-0" aria-hidden="true" /><div className="flex-1 min-w-0"><label htmlFor="mobile-linked-student" className="block text-[11px] uppercase tracking-[0.06em] font-semibold text-ink-500">Viewing student</label>{linkedStudents.length > 1 ? <select id="mobile-linked-student" value={selectedStudentId ?? ''} onChange={(event) => selectStudent(event.target.value)} className="mt-0.5 w-full bg-transparent text-sm font-semibold text-ink-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded-control"><option value="" disabled>Select student</option>{linkedStudents.map((student) => <option key={student.id} value={student.id}>{student.name} · {student.batch}</option>)}</select> : <p className="text-sm font-semibold text-ink-900 truncate">{selectedStudent.name}</p>}</div></div>}
          {feedback && <div ref={feedbackRef} role="status" aria-live="polite" className={cn('mb-5 rounded-card border px-4 py-3 text-sm font-medium flex items-start justify-between gap-3', feedback.kind === 'success' ? 'bg-success-50 border-success-200 text-success-700' : feedback.kind === 'info' ? 'bg-primary-50 border-primary-200 text-primary-700' : 'bg-error-50 border-error-200 text-error-700')}><span className="leading-6">{feedback.message}</span><button onClick={clearFeedback} aria-label="Dismiss message" className="shrink-0 rounded-md p-0.5 hover:opacity-70 transition-opacity"><X className="w-4 h-4" aria-hidden="true" /></button></div>}
          {children}
        </main>
      </div>

      <Modal open={showAccountModal} onClose={() => setShowAccountModal(false)} title="Account Overview & Profile" size="md">
        <div className="space-y-4">
          <div className="flex items-center gap-4 p-4 rounded-card bg-ink-50 border border-ink-200">
            <img src={displayAvatar} alt="" className="w-14 h-14 rounded-card bg-white object-cover border border-ink-200" />
            <div>
              <h4 className="font-bold text-ink-900 text-base">{displayName}</h4>
              <p className="text-sm text-ink-500">{user?.email}</p>
              <div className="mt-1 flex items-center gap-2">
                <StatusBadge status={profile.isActive ? 'active' : 'inactive'} />
                <span className="text-xs font-semibold text-primary-700 bg-primary-50 px-2 py-0.5 rounded border border-primary-200">{roleLabels[profile.role]}</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="p-3 rounded-control border border-ink-200 bg-white">
              <p className="text-xs text-ink-500 font-medium">Institution</p>
              <p className="font-semibold text-ink-900 mt-0.5 truncate">{displayInstitution}</p>
            </div>
            <div className="p-3 rounded-control border border-ink-200 bg-white">
              <p className="text-xs text-ink-500 font-medium">Account ID</p>
              <p className="font-mono text-xs text-ink-700 mt-0.5 truncate">{profile.id}</p>
            </div>
          </div>
          <div className="border-t border-ink-100 pt-4">
            <h4 className="font-semibold text-ink-900">Change password</h4>
            <p className="mb-4 mt-1 text-sm text-ink-600">Confirm your current password, then choose a new one. SkillToss sends it only to the Django account service.</p>
            <ChangePasswordForm />
          </div>
          <div className="pt-3 border-t border-ink-100 flex justify-end">
            <button onClick={() => setShowAccountModal(false)} className="btn-secondary text-sm">Close</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
