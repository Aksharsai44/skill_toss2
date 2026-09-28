import React, { useState, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  Filter,
  Clock,
  BookOpen,
  Layers,
  Bell,
  AlertTriangle,
  Video,
  FileText,
  CheckCircle2,
  MapPin,
} from 'lucide-react';
import { useLmsData } from '@/lib/lmsDataContext';
import type { AcademicEvent, AcademicEventType } from '@/lib/types';
import { Card } from '@/components/ui/Layout';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/cn';
import { CreateEventModal } from '@/components/CreateEventModal';
import { EventDetailsModal } from '@/components/EventDetailsModal';

interface AcademicCalendarViewProps {
  currentUserRole?: string;
  currentUserId?: string;
  currentStudentBatchId?: string;
}

type CalendarViewMode = 'month' | 'week' | 'today';

export function AcademicCalendarView({
  currentUserRole = 'teacher',
  currentUserId,
  currentStudentBatchId,
}: AcademicCalendarViewProps) {
  const { state, getAcademicEvents, createAcademicEvent, deleteAcademicEvent, checkScheduleConflict } = useLmsData();

  // State
  const [viewMode, setViewMode] = useState<CalendarViewMode>('month');
  const [currentDate, setCurrentDate] = useState(new Date(2026, 8, 3)); // Sept 3, 2026 default demo date
  const [searchQuery, setSearchQuery] = useState('');
  const [courseFilter, setCourseFilter] = useState('ALL');
  const [batchFilter, setBatchFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<AcademicEvent | null>(null);

  // Fetch aggregated role-filtered academic events from database & LMS context
  const rawEvents = getAcademicEvents(currentUserRole, currentUserId, currentStudentBatchId);

  // Apply Search & Filters
  const filteredEvents = useMemo(() => {
    return rawEvents.filter((event) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = event.title.toLowerCase().includes(q);
        const matchesCourse = (event.courseTitle || '').toLowerCase().includes(q);
        const matchesSubject = (event.subject || '').toLowerCase().includes(q);
        const matchesBatch = (event.batchName || event.batchId || '').toLowerCase().includes(q);
        if (!matchesTitle && !matchesCourse && !matchesSubject && !matchesBatch) {
          return false;
        }
      }

      // Course Filter
      if (courseFilter !== 'ALL' && event.courseId !== courseFilter) {
        return false;
      }

      // Batch Filter
      if (batchFilter !== 'ALL' && event.batchId !== batchFilter && event.batchName !== batchFilter && event.batchId !== 'all') {
        return false;
      }

      // Type Filter
      if (typeFilter !== 'ALL' && event.type !== typeFilter) {
        return false;
      }

      return true;
    });
  }, [rawEvents, searchQuery, courseFilter, batchFilter, typeFilter]);

  // Map events by date (YYYY-MM-DD)
  const eventsByDate = useMemo(() => {
    const map: Record<string, AcademicEvent[]> = {};
    filteredEvents.forEach((event) => {
      const d = event.date;
      if (!map[d]) map[d] = [];
      map[d].push(event);
    });
    return map;
  }, [filteredEvents]);

  // Date Navigation Helpers
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToToday = () => setCurrentDate(new Date(2026, 8, 3)); // Sept 3, 2026

  const monthName = currentDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });

  // Generate Month Grid Days
  const monthGridDays = useMemo(() => {
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    const days: Array<{ dateStr: string; dayNum: number; isCurrentMonth: boolean }> = [];

    // Prev month padding
    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      const prevDate = new Date(year, month - 1, prevMonthDays - i);
      const dateStr = prevDate.toISOString().split('T')[0];
      days.push({ dateStr, dayNum: prevMonthDays - i, isCurrentMonth: false });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const currDate = new Date(year, month, d);
      // Local ISO YYYY-MM-DD
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({ dateStr, dayNum: d, isCurrentMonth: true });
    }

    // Next month padding to fill 35 or 42 grid cells
    const remaining = (7 - (days.length % 7)) % 7;
    for (let j = 1; j <= remaining; j++) {
      const nextDate = new Date(year, month + 1, j);
      const dateStr = nextDate.toISOString().split('T')[0];
      days.push({ dateStr, dayNum: j, isCurrentMonth: false });
    }

    return days;
  }, [year, month]);

  // Generate Week View Days (7 days around currentDate)
  const weekDays = useMemo(() => {
    const startOfWeek = new Date(currentDate);
    const dayOfWeek = startOfWeek.getDay();
    startOfWeek.setDate(startOfWeek.getDate() - dayOfWeek);

    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      days.push({
        date: d,
        dateStr,
        dayName: d.toLocaleString('en-US', { weekday: 'short' }),
        dayNum: d.getDate(),
      });
    }
    return days;
  }, [currentDate]);

  // Today Date string
  const todayDateStr = '2026-09-03';
  const selectedDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;

  // Color Mapping for Event Pills & Badges
  const typePillStyles: Record<string, string> = {
    class: 'bg-primary-100/90 text-primary-800 border-primary-200 hover:bg-primary-200',
    exam: 'bg-error-100/90 text-error-800 border-error-200 hover:bg-error-200',
    assignment: 'bg-warning-100/90 text-warning-800 border-warning-200 hover:bg-warning-200',
    meeting: 'bg-accent-100/90 text-accent-800 border-accent-200 hover:bg-accent-200',
    holiday: 'bg-success-100/90 text-success-800 border-success-200 hover:bg-success-200',
    other: 'bg-ink-100 text-ink-800 border-ink-200 hover:bg-ink-200',
  };

  const typeDotColors: Record<string, string> = {
    class: 'bg-primary-500',
    exam: 'bg-error-500',
    assignment: 'bg-warning-500',
    meeting: 'bg-accent-500',
    holiday: 'bg-success-500',
    other: 'bg-ink-500',
  };

  // Dynamic Upcoming Events (Sorted by date and start time)
  const upcomingEvents = useMemo(() => {
    return rawEvents
      .filter((e) => e.date >= todayDateStr && e.status !== 'cancelled')
      .sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return (a.startTime || '').localeCompare(b.startTime || '');
      })
      .slice(0, 6);
  }, [rawEvents]);

  // Dynamic Smart Reminders
  const smartReminders = useMemo(() => {
    const reminders = [];
    const todayEvts = rawEvents.filter((e) => e.date === todayDateStr && e.status !== 'cancelled');

    const liveOrUpcomingClass = todayEvts.find((e) => e.type === 'class');
    if (liveOrUpcomingClass) {
      reminders.push({
        id: 'rem_1',
        icon: Video,
        title: 'Class starting soon',
        desc: `${liveOrUpcomingClass.title} (${liveOrUpcomingClass.startTime || '09:00 AM'})`,
        variant: 'primary',
      });
    }

    const dueAssignment = rawEvents.find((e) => e.type === 'assignment' && e.date >= todayDateStr && e.status !== 'cancelled');
    if (dueAssignment) {
      reminders.push({
        id: 'rem_2',
        icon: FileText,
        title: 'Assignment deadline near',
        desc: `${dueAssignment.title} · Due ${dueAssignment.date === todayDateStr ? 'Today' : dueAssignment.date}`,
        variant: 'warning',
      });
    }

    const upcomingExam = rawEvents.find((e) => e.type === 'exam' && e.date >= todayDateStr && e.status !== 'cancelled');
    if (upcomingExam) {
      reminders.push({
        id: 'rem_3',
        icon: Bell,
        title: 'Upcoming Assessment',
        desc: `${upcomingExam.title} scheduled for ${upcomingExam.date}`,
        variant: 'error',
      });
    }

    return reminders;
  }, [rawEvents]);

  const isTeacherOrAdmin = currentUserRole === 'teacher' || currentUserRole === 'admin' || currentUserRole === 'super_admin' || currentUserRole === 'product_admin';

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Header & Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-ink-100 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary-50 text-primary-600">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-ink-900 leading-tight">Academic Calendar</h1>
            <p className="text-xs text-ink-500">Real-time synchronized schedule across classes, exams, & deadlines</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Navigation Controls */}
          <div className="flex items-center bg-ink-50 rounded-xl p-1 border border-ink-200">
            <button
              onClick={prevMonth}
              className="p-1.5 rounded-lg text-ink-600 hover:text-ink-900 hover:bg-white transition"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="px-3 text-xs font-semibold text-ink-900 min-w-28 text-center">
              {monthName}
            </span>

            <button
              onClick={nextMonth}
              className="p-1.5 rounded-lg text-ink-600 hover:text-ink-900 hover:bg-white transition"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={goToToday}
            className="btn-secondary text-xs px-3 py-1.5 font-medium hover:bg-ink-100"
          >
            Today
          </button>

          {/* View Mode Switcher */}
          <div className="flex items-center bg-ink-100/80 rounded-xl p-1">
            {(['month', 'week', 'today'] as CalendarViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={cn(
                  'px-3 py-1 text-xs font-semibold rounded-lg capitalize transition-all',
                  viewMode === mode
                    ? 'bg-white text-primary-600 shadow-xs'
                    : 'text-ink-600 hover:text-ink-900'
                )}
              >
                {mode}
              </button>
            ))}
          </div>

          {/* Create Event Button */}
          {isTeacherOrAdmin && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary text-xs px-3.5 py-1.5 flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Create Event
            </button>
          )}
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white rounded-2xl border border-ink-100 shadow-xs">
        <div className="flex items-center gap-2 flex-wrap flex-1">
          {/* Search Box */}
          <div className="relative min-w-56 flex-1 max-w-xs">
            <Search className="w-3.5 h-3.5 text-ink-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search classes, exams, assignments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-8 py-1.5 text-xs bg-ink-50/50"
            />
          </div>

          {/* Course Filter */}
          <select
            value={courseFilter}
            onChange={(e) => setCourseFilter(e.target.value)}
            className="input py-1.5 text-xs w-auto bg-white border-ink-200 text-ink-700"
          >
            <option value="ALL">All Courses</option>
            {state.courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>

          {/* Batch Filter */}
          <select
            value={batchFilter}
            onChange={(e) => setBatchFilter(e.target.value)}
            className="input py-1.5 text-xs w-auto bg-white border-ink-200 text-ink-700"
          >
            <option value="ALL">All Batches</option>
            {state.batches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="input py-1.5 text-xs w-auto bg-white border-ink-200 text-ink-700"
          >
            <option value="ALL">All Event Types</option>
            <option value="class">Classes</option>
            <option value="exam">Exams</option>
            <option value="assignment">Assignments</option>
            <option value="meeting">Meetings</option>
            <option value="holiday">Holidays</option>
          </select>
        </div>

        <div className="text-xs text-ink-500 font-medium shrink-0">
          Showing <span className="text-ink-900 font-bold">{filteredEvents.length}</span> synchronized events
        </div>
      </div>

      {/* Main Grid & Sidebar Layout */}
      <div className="grid lg:grid-cols-4 gap-4">
        {/* Left 3 Columns: Calendar Grid Views */}
        <Card className="lg:col-span-3 p-4 flex flex-col min-h-[600px]">
          {/* MONTH VIEW */}
          {viewMode === 'month' && (
            <div className="flex-1 flex flex-col">
              {/* Day Name Headers */}
              <div className="grid grid-cols-7 gap-1 mb-1">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <div key={day} className="text-center text-xs font-bold text-ink-400 py-1.5 uppercase tracking-wider">
                    {day}
                  </div>
                ))}
              </div>

              {/* Month Grid Cells */}
              <div className="grid grid-cols-7 gap-1 flex-1 auto-rows-fr">
                {monthGridDays.map(({ dateStr, dayNum, isCurrentMonth }, idx) => {
                  const dayEvents = eventsByDate[dateStr] || [];
                  const isToday = dateStr === todayDateStr;

                  return (
                    <div
                      key={`${dateStr}-${idx}`}
                      className={cn(
                        'min-h-24 rounded-xl p-1.5 border transition-all flex flex-col justify-between overflow-hidden',
                        isToday
                          ? 'border-primary-500 bg-primary-50/40 ring-1 ring-primary-400/30'
                          : !isCurrentMonth
                          ? 'border-transparent bg-ink-50/40 text-ink-300'
                          : 'border-ink-100 hover:border-ink-200 hover:bg-ink-50/30'
                      )}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className={cn(
                            'text-xs font-semibold w-5 h-5 flex items-center justify-center rounded-full',
                            isToday ? 'bg-primary-600 text-white shadow-xs' : isCurrentMonth ? 'text-ink-700' : 'text-ink-300'
                          )}
                        >
                          {dayNum}
                        </span>

                        {dayEvents.length > 0 && (
                          <span className="text-[10px] font-medium text-ink-400">
                            {dayEvents.length} {dayEvents.length === 1 ? 'event' : 'events'}
                          </span>
                        )}
                      </div>

                      {/* Event Badges list */}
                      <div className="space-y-1 flex-1 overflow-y-auto max-h-20 scrollbar-none pr-0.5">
                        {dayEvents.slice(0, 3).map((event) => (
                          <button
                            key={event.id}
                            onClick={() => setSelectedEvent(event)}
                            className={cn(
                              'w-full text-left px-1.5 py-0.5 rounded-md text-[10px] font-semibold border truncate flex items-center gap-1 transition-transform hover:scale-[1.02]',
                              typePillStyles[event.type] || 'bg-ink-100 text-ink-800 border-ink-200'
                            )}
                            title={`${event.title} (${event.startTime || 'All day'})`}
                          >
                            <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', typeDotColors[event.type] || 'bg-ink-500')} />
                            <span className="truncate">{event.title}</span>
                          </button>
                        ))}

                        {dayEvents.length > 3 && (
                          <button
                            onClick={() => {
                              setSelectedEvent(dayEvents[3]);
                            }}
                            className="text-[10px] font-semibold text-primary-600 hover:underline pl-1"
                          >
                            +{dayEvents.length - 3} more
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* WEEK VIEW */}
          {viewMode === 'week' && (
            <div className="flex-1 flex flex-col">
              <div className="grid grid-cols-7 gap-2 mb-2 border-b border-ink-100 pb-2">
                {weekDays.map((w) => {
                  const isToday = w.dateStr === todayDateStr;
                  const dayEvts = eventsByDate[w.dateStr] || [];

                  return (
                    <div
                      key={w.dateStr}
                      className={cn(
                        'p-2 rounded-xl text-center border',
                        isToday ? 'bg-primary-600 text-white border-primary-600 shadow-sm' : 'bg-ink-50 border-ink-100 text-ink-800'
                      )}
                    >
                      <p className="text-xs font-medium uppercase opacity-80">{w.dayName}</p>
                      <p className="text-base font-bold leading-tight">{w.dayNum}</p>
                      <p className="text-[10px] opacity-75 mt-0.5">{dayEvts.length} events</p>
                    </div>
                  );
                })}
              </div>

              <div className="grid grid-cols-7 gap-2 flex-1 min-h-[450px]">
                {weekDays.map((w) => {
                  const dayEvts = eventsByDate[w.dateStr] || [];

                  return (
                    <div key={w.dateStr} className="p-2 rounded-xl bg-ink-50/50 border border-ink-100 space-y-2 overflow-y-auto max-h-[500px]">
                      {dayEvts.length > 0 ? (
                        dayEvts.map((e) => (
                          <div
                            key={e.id}
                            onClick={() => setSelectedEvent(e)}
                            className={cn(
                              'p-2 rounded-lg border text-xs cursor-pointer shadow-2xs hover:shadow-xs transition',
                              typePillStyles[e.type] || 'bg-white border-ink-200'
                            )}
                          >
                            <span className="text-[10px] font-bold block opacity-75">{e.startTime || '09:00'}</span>
                            <p className="font-semibold text-ink-900 line-clamp-2 mt-0.5">{e.title}</p>
                            {e.batchName && <span className="text-[10px] opacity-80 block mt-1">({e.batchName})</span>}
                          </div>
                        ))
                      ) : (
                        <div className="h-full flex items-center justify-center text-[11px] text-ink-400 italic">No events</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TODAY VIEW */}
          {viewMode === 'today' && (
            <div className="flex-1 space-y-4">
              <div className="flex items-center justify-between border-b border-ink-100 pb-3">
                <div>
                  <h3 className="font-bold text-base text-ink-900 uppercase tracking-wide">
                    TODAY — {new Date(2026, 8, 3).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </h3>
                  <p className="text-xs text-ink-500">Chronological class and event schedule for your active batch</p>
                </div>
                <Badge variant="primary" size="md">
                  {eventsByDate[todayDateStr]?.length || 0} Events Today
                </Badge>
              </div>

              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {(eventsByDate[todayDateStr] || []).length > 0 ? (
                  (eventsByDate[todayDateStr] || [])
                    .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''))
                    .map((e) => (
                      <div
                        key={e.id}
                        onClick={() => setSelectedEvent(e)}
                        className="p-4 rounded-xl border border-ink-100 bg-white hover:border-primary-300 hover:shadow-sm transition cursor-pointer flex items-start justify-between gap-4"
                      >
                        <div className="flex items-start gap-3">
                          <div className={cn('p-2.5 rounded-xl text-white font-bold text-xs shrink-0 mt-0.5', typeDotColors[e.type] || 'bg-primary-600')}>
                            <Clock className="w-4 h-4" />
                          </div>

                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-ink-900">{e.startTime} {e.endTime ? `– ${e.endTime}` : ''}</span>
                              <Badge variant={e.type === 'exam' ? 'error' : e.type === 'assignment' ? 'warning' : 'primary'} size="sm">
                                {e.type}
                              </Badge>
                            </div>
                            <h4 className="font-bold text-sm text-ink-900 mt-1">{e.title}</h4>
                            <p className="text-xs text-ink-500 mt-0.5">
                              {e.courseTitle || 'General Course'} · {e.batchName || 'CS-2024-A'}
                              {e.roomOrLink ? ` · ${e.roomOrLink}` : ''}
                            </p>
                          </div>
                        </div>

                        <button className="btn-secondary text-xs px-3 py-1.5 self-center shrink-0">
                          Class Details
                        </button>
                      </div>
                    ))
                ) : (
                  <div className="py-16 text-center text-ink-400 space-y-2">
                    <CalendarIcon className="w-10 h-10 mx-auto text-ink-300" />
                    <p className="text-sm font-medium">No events scheduled for today.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </Card>

        {/* Right Column: Upcoming Events & Smart Reminders Sidebar */}
        <div className="space-y-4">
          {/* Smart Reminders */}
          <Card className="p-4 space-y-3 border-primary-100 bg-gradient-to-br from-white to-primary-50/30">
            <h3 className="font-semibold text-xs text-ink-700 uppercase tracking-wider flex items-center gap-1.5">
              <Bell className="w-4 h-4 text-primary-600" /> Smart Academic Reminders
            </h3>

            <div className="space-y-2">
              {smartReminders.map((rem) => {
                const Icon = rem.icon;
                return (
                  <div key={rem.id} className="p-2.5 rounded-xl border border-ink-100 bg-white flex items-start gap-2.5 shadow-2xs">
                    <div className={cn('p-1.5 rounded-lg shrink-0 mt-0.5', rem.variant === 'error' ? 'bg-error-50 text-error-600' : rem.variant === 'warning' ? 'bg-warning-50 text-warning-600' : 'bg-primary-50 text-primary-600')}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-ink-900">{rem.title}</p>
                      <p className="text-[11px] text-ink-500 mt-0.5 line-clamp-2">{rem.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Dynamic Upcoming Events List */}
          <Card className="p-4 space-y-3">
            <h3 className="font-semibold text-xs text-ink-700 uppercase tracking-wider flex items-center justify-between">
              <span>Upcoming Schedule</span>
              <span className="text-[10px] text-ink-400 font-mono">Real-time</span>
            </h3>

            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
              {upcomingEvents.length > 0 ? (
                upcomingEvents.map((evt) => (
                  <div
                    key={evt.id}
                    onClick={() => setSelectedEvent(evt)}
                    className="p-2.5 rounded-xl border border-ink-100 bg-white hover:border-primary-200 hover:bg-ink-50/50 transition cursor-pointer flex items-start gap-2.5"
                  >
                    <div className={cn('w-2.5 h-2.5 rounded-full mt-1.5 shrink-0', typeDotColors[evt.type] || 'bg-primary-500')} />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-ink-900 truncate">{evt.title}</p>
                      <p className="text-[11px] text-ink-400 mt-0.5">
                        {evt.date === todayDateStr ? 'Today' : evt.date} · {evt.startTime || '09:00 AM'}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-ink-400 text-center py-6">No upcoming events scheduled.</p>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Create Event Modal */}
      <CreateEventModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        courses={state.courses}
        batches={state.batches}
        currentTeacherName={state.teachers[0]?.name}
        currentTeacherId={currentUserId || state.teachers[0]?.id}
        onSave={createAcademicEvent}
        checkConflict={checkScheduleConflict}
      />

      {/* Event Details Modal */}
      <EventDetailsModal
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
        userRole={currentUserRole}
        onDeleteEvent={deleteAcademicEvent}
      />
    </div>
  );
}
