import { useState, useMemo } from 'react';
import {
  Bell,
  Video,
  ClipboardList,
  CheckSquare,
  CheckCircle2,
  Info,
  Layers,
  Filter,
  FileText,
  AlertTriangle,
} from 'lucide-react';
import { useLmsData } from '@/lib/lmsDataContext';
import { useAuth } from '@/lib/authContext';
import { PageHeader, Card, EmptyState } from '@/components/ui/Layout';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/cn';
import type { LmsNotification } from '@/lib/types';

export function TeacherNotificationsView() {
  const { user } = useAuth();
  const { state, markNotificationRead } = useLmsData();

  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const notifications = useMemo(() => {
    return state.notifications.filter((n) => !user || n.userId === user.id || true);
  }, [state.notifications, user]);

  const filteredNotifications = useMemo(() => {
    if (categoryFilter === 'all') return notifications;
    return notifications.filter((n) => n.type === categoryFilter || (categoryFilter === 'academic' && (n.type === 'academic' || (n as any).category === 'class')));
  }, [notifications, categoryFilter]);

  const categoryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
    academic: Video,
    assignment: ClipboardList,
    attendance: CheckSquare,
    announcement: Bell,
    resource: FileText,
    fees: AlertTriangle,
    system: Info,
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <PageHeader
        title="Teacher Notifications"
        subtitle="Categorized real-time notification alerts across classes, assignments, and submissions."
      />

      {/* Filter Tabs */}
      <div className="bg-white rounded-2xl p-4 border border-ink-200/80 shadow-xs flex flex-wrap items-center gap-2">
        {['all', 'academic', 'attendance', 'announcement', 'resource', 'fees'].map((cat) => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            className={cn(
              'px-3.5 py-1.5 rounded-xl text-xs font-semibold capitalize transition',
              categoryFilter === cat
                ? 'bg-primary-600 text-white shadow-xs'
                : 'bg-ink-100 text-ink-600 hover:bg-ink-200'
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Notification List */}
      <Card className="overflow-hidden border-ink-200/80 shadow-xs">
        <div className="divide-y divide-ink-100 bg-white">
          {filteredNotifications.length > 0 ? (
            filteredNotifications.map((notif) => {
              const Icon = categoryIcons[notif.type || 'system'] || Bell;
              return (
                <div
                  key={notif.id}
                  onClick={() => markNotificationRead(notif.id)}
                  className={cn(
                    'p-4 flex items-start gap-4 transition cursor-pointer hover:bg-primary-50/20',
                    !notif.read ? 'bg-primary-50/30 font-medium' : 'bg-white'
                  )}
                >
                  <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center text-primary-600 shrink-0 mt-0.5">
                    <Icon className="w-5 h-5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-sm font-bold text-ink-950 truncate">{notif.title}</h4>
                      <span className="text-[11px] text-ink-400 font-medium shrink-0">
                        {new Date(notif.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <p className="text-xs text-ink-600 mt-1">{notif.message}</p>

                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant={notif.read ? 'neutral' : 'primary'} size="sm">
                        {(notif.type || 'SYSTEM').toUpperCase()}
                      </Badge>
                      {!notif.read && <span className="text-[10px] text-primary-600 font-bold">Unread</span>}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <EmptyState
              icon={Bell}
              title="No notifications found"
              description="No notifications match the selected category filter."
            />
          )}
        </div>
      </Card>
    </div>
  );
}
