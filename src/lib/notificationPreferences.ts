import { useCallback, useEffect, useState } from 'react';
import type { LmsNotification } from '@/lib/types';

/*
 * Per-browser mute preferences for in-app notifications.
 *
 * The Settings toggles previously wrote these localStorage keys and nothing ever read them, so the
 * switches moved but no notification behaviour changed. There is no delivery backend (no email, SMS
 * or push is configured), so the only preference this product can honestly honour is which
 * notification types appear in the app — which is what this module does, applied consistently to
 * both the header bell and the Notifications page so the unread count and the list never disagree.
 *
 * Keys keep their original names so a browser that already stored a choice keeps it.
 */
export type MutableNotificationType = Extract<LmsNotification['type'], 'assignment' | 'exam'>;

export const NOTIFICATION_PREFERENCES: Array<{
  type: MutableNotificationType;
  storageKey: string;
  label: string;
  description: string;
}> = [
  {
    type: 'assignment',
    storageKey: 'skill-toss-assignment-notifications',
    label: 'Assignment notifications',
    description: 'New assignments, due-date reminders and grading updates.',
  },
  {
    type: 'exam',
    storageKey: 'skill-toss-exam-reminders',
    label: 'Exam reminders',
    description: 'Scheduled exams, syllabus updates and published results.',
  },
];

/** Fired after a write so every mounted subscriber in this tab re-reads at once. */
const CHANGE_EVENT = 'skill-toss:notification-preferences';

const readEnabled = (): Record<MutableNotificationType, boolean> => Object.fromEntries(
  // Absent key means "on": muting is opt-in, so a fresh browser sees everything.
  NOTIFICATION_PREFERENCES.map((preference) => [preference.type, localStorage.getItem(preference.storageKey) !== 'false']),
) as Record<MutableNotificationType, boolean>;

export function useNotificationPreferences() {
  const [enabled, setEnabled] = useState(readEnabled);

  useEffect(() => {
    const sync = () => setEnabled(readEnabled());
    window.addEventListener(CHANGE_EVENT, sync);
    // `storage` covers the same site open in another tab; it does not fire in the writing tab.
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(CHANGE_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const setPreference = useCallback((type: MutableNotificationType, next: boolean) => {
    const preference = NOTIFICATION_PREFERENCES.find((item) => item.type === type);
    if (!preference) return;
    localStorage.setItem(preference.storageKey, String(next));
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  const isMuted = useCallback(
    (type: LmsNotification['type']) => enabled[type as MutableNotificationType] === false,
    [enabled],
  );

  return { enabled, setPreference, isMuted, mutedCount: Object.values(enabled).filter((value) => !value).length };
}
