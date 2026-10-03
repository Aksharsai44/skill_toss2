import { apiRequest } from '@/lib/djangoApi';

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

type DjangoAttendanceSession = {
  id: string; institution: string; batch: string; subject: string; attendance_date: string;
  status: 'open' | 'closed'; notes: string | null; created_by: string; created_at: string; updated_at: string;
};
type DjangoAttendanceRecord = {
  id: string; institution: string; session: string; student: string; status: AttendanceStatus;
  marked_by: string; marked_at: string; updated_at: string;
};

export type AttendanceSession = {
  id: string; institution_id: string; batch_id: string; subject_id: string; attendance_date: string;
  status: 'open' | 'closed'; notes: string | null; created_by_profile_id: string; created_at: string; updated_at: string;
};
export type AttendanceRecord = {
  id: string; institution_id: string; attendance_session_id: string; student_id: string;
  status: AttendanceStatus; marked_by_profile_id: string; marked_at: string; updated_at: string;
};
export type AttendanceSummary = {
  institution_id: string; student_id: string; subject_id: string; subject_code: string; subject_title: string;
  total_sessions: number; attended_sessions: number; absent_sessions: number; late_sessions: number;
  excused_sessions: number; attendance_percentage: number;
};

const adaptSession = (item: DjangoAttendanceSession): AttendanceSession => ({
  id: item.id, institution_id: item.institution, batch_id: item.batch, subject_id: item.subject,
  attendance_date: item.attendance_date, status: item.status, notes: item.notes,
  created_by_profile_id: item.created_by, created_at: item.created_at, updated_at: item.updated_at,
});
const adaptRecord = (item: DjangoAttendanceRecord): AttendanceRecord => ({
  id: item.id, institution_id: item.institution, attendance_session_id: item.session,
  student_id: item.student, status: item.status, marked_by_profile_id: item.marked_by,
  marked_at: item.marked_at, updated_at: item.updated_at,
});

const pendingSessions = new Map<string, Promise<AttendanceSession>>();

export async function createAttendanceSession(input: {
  institutionId?: string; batchId: string; subjectId: string; date: string; notes?: string;
}): Promise<AttendanceSession> {
  const key = `${input.batchId}:${input.subjectId}:${input.date}`;
  const existing = pendingSessions.get(key);
  if (existing) return existing;
  const request = apiRequest<DjangoAttendanceSession>('/api/attendance-sessions/', {
    method: 'POST',
    body: { batch: input.batchId, subject: input.subjectId, attendance_date: input.date, notes: input.notes?.trim() || '' },
  }).then(adaptSession).finally(() => pendingSessions.delete(key));
  pendingSessions.set(key, request);
  return request;
}

export async function listAttendanceSessions(filters: { batchId?: string; date?: string } = {}) {
  const sessions = (await apiRequest<DjangoAttendanceSession[]>('/api/attendance-sessions/')).map(adaptSession);
  return sessions.filter((item) => (!filters.batchId || item.batch_id === filters.batchId) && (!filters.date || item.attendance_date === filters.date));
}

export async function markAttendance(input: {
  institutionId?: string; sessionId: string; studentId: string; status: AttendanceStatus;
}): Promise<AttendanceRecord> {
  const existing = (await listAttendanceRecords(input.sessionId)).find((item) => item.student_id === input.studentId);
  const item = existing
    ? await apiRequest<DjangoAttendanceRecord>(`/api/attendance-records/${existing.id}/`, { method: 'PATCH', body: { status: input.status } })
    : await apiRequest<DjangoAttendanceRecord>('/api/attendance-records/', { method: 'POST', body: { session: input.sessionId, student: input.studentId, status: input.status } });
  return adaptRecord(item);
}

export async function closeAttendanceSession(sessionId: string) {
  await apiRequest(`/api/attendance-sessions/${sessionId}/`, { method: 'PATCH', body: { status: 'closed' } });
}

export async function listAttendanceRecords(sessionId?: string) {
  const records = (await apiRequest<DjangoAttendanceRecord[]>('/api/attendance-records/')).map(adaptRecord);
  return sessionId ? records.filter((item) => item.attendance_session_id === sessionId) : records;
}

export async function getStudentAttendanceSummary(studentId: string) {
  const [sessions, records] = await Promise.all([listAttendanceSessions(), listAttendanceRecords()]);
  const sessionById = new Map(sessions.map((item) => [item.id, item]));
  const grouped = new Map<string, AttendanceRecord[]>();
  for (const record of records.filter((item) => item.student_id === studentId)) {
    const subjectId = sessionById.get(record.attendance_session_id)?.subject_id;
    if (subjectId) grouped.set(subjectId, [...(grouped.get(subjectId) ?? []), record]);
  }
  return [...grouped.entries()].map(([subjectId, items]): AttendanceSummary => {
    const attended = items.filter((item) => item.status === 'present' || item.status === 'late').length;
    const conducted = items.filter((item) => item.status !== 'excused').length;
    return {
      institution_id: items[0]?.institution_id ?? '', student_id: studentId, subject_id: subjectId,
      subject_code: '', subject_title: '', total_sessions: items.length, attended_sessions: attended,
      absent_sessions: items.filter((item) => item.status === 'absent').length,
      late_sessions: items.filter((item) => item.status === 'late').length,
      excused_sessions: items.filter((item) => item.status === 'excused').length,
      attendance_percentage: conducted ? Math.round((attended / conducted) * 100) : 0,
    };
  });
}
