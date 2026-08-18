import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { lmsDemoSeed } from '@/lib/mockData';
import { LmsDataContext, type ActionResult, type Feedback, type LmsDataContextValue } from '@/lib/lmsDataContext';
import type { AttendanceStatus, LmsAssignment, LmsClassSession, LmsExam, LmsResource, LmsState, LmsStudent, OnlineAttendanceSession } from '@/lib/types';
import { generateDeterministicRoomName } from '@/lib/jitsiConfig';
import { supabase } from '@/lib/supabase';
import { putAttachment } from '@/lib/attachmentStorage';
import type { SubmissionAttachment } from '@/lib/types';

const STORAGE_KEY = 'skill-toss-lms-demo-v4';
const DEMO_NOW = '2026-08-12T12:00:00+05:30';


const cloneSeed = (): LmsState => JSON.parse(JSON.stringify(lmsDemoSeed)) as LmsState;
const loadState = (): LmsState => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return cloneSeed();
    const parsed = JSON.parse(raw) as LmsState;
    if (parsed.version !== lmsDemoSeed.version) return cloneSeed();
    return {
      ...parsed,
      onlineAttendance: parsed.onlineAttendance || [],
      classSessions: (parsed.classSessions || []).map((session) => ({
        ...session,
        jitsiRoomName: session.jitsiRoomName || (session.mode === 'jitsi' || session.mode === 'online' ? generateDeterministicRoomName(parsed.institution?.id || 'demo', session.id) : undefined),
      })),
    };
  } catch {
    return cloneSeed();
  }
};

export function LmsDataProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<LmsState>(loadState);
  const [feedback, setFeedback] = useState<Feedback>(null);

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }, [state]);
  useEffect(() => {
    const channel = supabase.channel('skill-toss-class-sessions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'class_sessions' }, (payload) => {
        const row = payload.new as { id?: string; status?: LmsClassSession['status']; started_at?: string | null; ended_at?: string | null; ended_by?: string | null };
        if (!row.id || !row.status) return;
        if (import.meta.env.DEV) console.info('[Skill Toss session realtime] received', { channel: 'skill-toss-class-sessions', sessionId: row.id, status: row.status, endedAt: row.ended_at });
        setState((current) => ({
          ...current,
          classSessions: current.classSessions.map((session) => session.id === row.id ? {
            ...session, status: row.status as LmsClassSession['status'], startedAt: row.started_at ?? session.startedAt,
            endedAt: row.ended_at ?? session.endedAt, endedBy: row.ended_by ?? session.endedBy,
          } : session),
          onlineAttendance: row.status === 'completed' ? (current.onlineAttendance || []).map((record) => {
            if (record.classSessionId !== row.id || record.leftAt) return record;
            const leftAt = row.ended_at || new Date().toISOString();
            return { ...record, leftAt, durationMinutes: Math.max(1, Math.round((new Date(leftAt).getTime() - new Date(record.joinedAt).getTime()) / 60000)) };
          }) : current.onlineAttendance,
        }));
      }).subscribe((status) => {
        if (import.meta.env.DEV) console.info('[Skill Toss session realtime] subscription state', { channel: 'skill-toss-class-sessions', status });
      });
    return () => { void supabase.removeChannel(channel); };
  }, []);
  useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(() => setFeedback(null), 4000);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  const result = useCallback((ok: boolean, message: string): ActionResult => {
    setFeedback({ kind: ok ? 'success' : 'error', message });
    return ok ? { ok: true, message } : { ok: false, message };
  }, []);
  const nextId = useCallback((prefix: string) => `${prefix}_${String(state.nextId).padStart(4, '0')}`, [state.nextId]);
  const bump = useCallback((next: LmsState) => ({ ...next, nextId: next.nextId + 1 }), []);

  const getStudentAssignments = useCallback((studentId: string) => {
    const student = state.students.find((item) => item.id === studentId);
    if (!student) return [];
    return state.assignments.filter((item) => item.batchId === student.batchId).map((assignment) => ({
      ...assignment,
      courseTitle: state.courses.find((course) => course.id === assignment.courseId)?.title ?? 'Course',
      submission: state.submissions.find((submission) => submission.assignmentId === assignment.id && submission.studentId === studentId),
    })).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  }, [state]);

  const getStudentFees = useCallback((studentId: string) => {
    const invoices = state.feeInvoices.filter((item) => item.studentId === studentId).map((invoice) => {
      const paid = state.payments.filter((payment) => payment.invoiceId === invoice.id && payment.status === 'completed').reduce((sum, payment) => sum + payment.amount, 0);
      return { ...invoice, paid, pending: Math.max(0, invoice.total - paid), status: paid >= invoice.total ? 'paid' : invoice.dueDate < DEMO_NOW.slice(0, 10) ? 'overdue' : 'pending' };
    });
    return { invoices, total: invoices.reduce((sum, item) => sum + item.total, 0), paid: invoices.reduce((sum, item) => sum + item.paid, 0), pending: invoices.reduce((sum, item) => sum + item.pending, 0) };
  }, [state.feeInvoices, state.payments]);

  const getStudentExams = useCallback((studentId: string) => {
    const batchId = state.students.find((item) => item.id === studentId)?.batchId;
    return state.exams.filter((exam) => exam.batchId === batchId).sort((a, b) => a.date.localeCompare(b.date));
  }, [state.exams, state.students]);

  const getStudentResources = useCallback((studentId: string) => {
    const batchId = state.students.find((item) => item.id === studentId)?.batchId;
    return state.resources.filter((item) => item.batchId === batchId).sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
  }, [state.resources, state.students]);

  const getStudentSummary = useCallback((studentId: string) => {
    const student = state.students.find((item) => item.id === studentId);
    if (!student) return null;
    const records = state.attendance.filter((item) => item.studentId === studentId);
    const attended = records.filter((item) => item.status === 'present' || item.status === 'late').length;
    const conducted = records.filter((item) => item.status !== 'excused').length;
    const attendance = conducted ? Math.round((attended / conducted) * 100) : 0;
    const recoveryClasses = attendance >= 75 ? 0 : Math.ceil((0.75 * conducted - attended) / 0.25);
    const fees = getStudentFees(studentId);
    const assignmentViews = getStudentAssignments(studentId);
    const pendingAssignments = assignmentViews.filter((item) => !item.submission || !['submitted', 'graded'].includes(item.submission.status)).length;
    const exams = getStudentExams(studentId);
    const upcomingExams = exams.filter((item) => item.status === 'scheduled' && new Date(item.date) >= new Date(DEMO_NOW.slice(0, 10))).length;
    const results = state.examResults.filter((item) => item.studentId === studentId).map((item) => {
      const exam = state.exams.find((entry) => entry.id === item.examId);
      const course = state.courses.find((entry) => entry.id === exam?.courseId);
      return { percentage: exam ? (item.marks / exam.maxMarks) * 100 : 0, subject: course?.title ?? 'Course' };
    });
    const graded = assignmentViews.filter((item) => item.submission?.status === 'graded' && item.submission.marks !== undefined).map((item) => ({ percentage: ((item.submission?.marks ?? 0) / item.maxMarks) * 100, subject: item.courseTitle }));
    const assessments = [...results, ...graded];
    const overallPerformance = assessments.length ? Math.round(assessments.reduce((sum, item) => sum + item.percentage, 0) / assessments.length) : 0;
    const bySubject = new Map<string, number[]>();
    assessments.forEach((item) => bySubject.set(item.subject, [...(bySubject.get(item.subject) ?? []), item.percentage]));
    const ranked = [...bySubject].map(([subject, values]) => ({ subject, average: values.reduce((sum, value) => sum + value, 0) / values.length })).sort((a, b) => b.average - a.average);
    return { student, attendance, attended, conducted, recoveryClasses, feeTotal: fees.total, feePaid: fees.paid, feePending: fees.pending, pendingAssignments, upcomingExams, overallPerformance, strongestSubject: ranked[0]?.subject ?? 'No results yet', needsAttention: ranked[ranked.length - 1]?.subject ?? 'No results yet' };
  }, [getStudentAssignments, getStudentExams, getStudentFees, state.attendance, state.courses, state.examResults, state.exams, state.students]);

  const addStudent = useCallback((input: Omit<LmsStudent, 'id' | 'avatar'> & { initialFeeTotal: number }) => {
    if (!input.name.trim() || !input.rollNo.trim() || !input.email.trim()) return result(false, 'Name, roll number, and email are required.');
    if (state.students.some((student) => student.rollNo.toLowerCase() === input.rollNo.toLowerCase() || student.email.toLowerCase() === input.email.toLowerCase())) return result(false, 'A student with this roll number or email already exists.');
    if (input.initialFeeTotal <= 0) return result(false, 'Initial fee total must be greater than zero.');
    const id = nextId('student');
    const { initialFeeTotal, ...studentInput } = input;
    setState((current) => bump({ ...current, students: [...current.students, { ...studentInput, id, avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(input.name)}` }], feeInvoices: [...current.feeInvoices, { id: `${id}_invoice_001`, studentId: id, title: 'Semester Fee', total: initialFeeTotal, dueDate: '2026-08-31', status: 'open' }] }));
    return result(true, `${input.name} was added successfully.`);
  }, [bump, nextId, result, state.students]);

  const createAssignment = useCallback(async (input: Omit<LmsAssignment, 'id' | 'createdAt' | 'status'> & { attachmentFiles?: Array<{ metadata: SubmissionAttachment; file?: File }> }) => {
    if (!input.title.trim() || !input.instructions.trim() || !input.dueDate || input.maxMarks <= 0) return result(false, 'Title, instructions, due date, and valid marks are required.');
    const id = nextId('assignment');
    const attachments = (input.attachmentFiles || []).map((entry) => ({ ...entry, metadata: { ...entry.metadata, ownerType: 'assignment' as const, ownerId: id, uploadedBy: input.teacherId } }));
    try { await Promise.all(attachments.filter((entry) => Boolean(entry.file)).map((entry) => putAttachment(entry.metadata, entry.file as File))); } catch { return result(false, 'Assignment materials could not be saved locally.'); }
    const targets = state.students.filter((student) => student.batchId === input.batchId);
    setState((current) => bump({ ...current, assignments: [...current.assignments, { ...input, attachments: attachments.map((entry) => entry.metadata), id, createdAt: DEMO_NOW, status: 'open' }], notifications: [...current.notifications, ...targets.map((student, index) => ({ id: `${id}_notification_${index + 1}`, userId: student.id, type: 'academic' as const, title: 'New assignment', message: `${input.title} is now available.`, timestamp: DEMO_NOW, read: false, relatedEntityId: id, path: '/student/assignments' }))] }));
    return result(true, 'Assignment created and shared with the batch.');
  }, [bump, nextId, result, state.students]);

  const saveSubmission = useCallback(async (assignmentId: string, studentId: string, response: string, submit: boolean, attachments: Array<{ metadata: SubmissionAttachment; file?: File }> = []) => {
    if (!response.trim() && attachments.length === 0) return result(false, 'Add a response or attachment before saving.');
    const existing = state.submissions.find((item) => item.assignmentId === assignmentId && item.studentId === studentId);
    if (existing?.status === 'graded') return result(false, 'A graded submission cannot be changed.');
    const submissionId = existing?.id || nextId('submission');
    const normalizedAttachments = attachments.map((item) => ({ ...item, metadata: { ...item.metadata, submissionId } }));
    try {
      await Promise.all(normalizedAttachments.filter((item): item is { metadata: SubmissionAttachment; file: File } => Boolean(item.file)).map((item) => putAttachment(item.metadata, item.file)));
    } catch (error) {
      if (import.meta.env.DEV) console.error('[Skill Toss attachments] local save failed', error);
      return result(false, 'The attachment could not be saved locally. Please try again.');
    }
    const status = submit ? 'submitted' as const : 'in-progress' as const;
    setState((current) => ({ ...current, submissions: existing ? current.submissions.map((item) => item.id === existing.id ? { ...item, response, attachments: normalizedAttachments.map((entry) => entry.metadata), status, updatedAt: new Date().toISOString(), submittedAt: submit ? DEMO_NOW : item.submittedAt } : item) : [...current.submissions, { id: submissionId, assignmentId, studentId, response, attachments: normalizedAttachments.map((entry) => entry.metadata), status, updatedAt: new Date().toISOString(), submittedAt: submit ? DEMO_NOW : undefined }], nextId: existing ? current.nextId : current.nextId + 1 }));
    return result(true, submit ? 'Assignment submitted successfully.' : 'Draft saved.');
  }, [nextId, result, state.submissions]);

  const gradeSubmission = useCallback((submissionId: string, marks: number, feedbackText: string) => {
    const submission = state.submissions.find((item) => item.id === submissionId);
    const assignment = state.assignments.find((item) => item.id === submission?.assignmentId);
    if (!submission || !assignment) return result(false, 'Submission not found.');
    if (marks < 0 || marks > assignment.maxMarks || !feedbackText.trim()) return result(false, `Enter marks between 0 and ${assignment.maxMarks} and include feedback.`);
    setState((current) => bump({ ...current, submissions: current.submissions.map((item) => item.id === submissionId ? { ...item, status: 'graded', marks, feedback: feedbackText, gradedAt: DEMO_NOW } : item), notifications: [...current.notifications, { id: nextId('notification'), userId: submission.studentId, type: 'academic', title: 'Assignment graded', message: `${assignment.title}: ${marks}/${assignment.maxMarks}`, timestamp: DEMO_NOW, read: false, relatedEntityId: assignment.id, path: '/student/assignments' }] }));
    return result(true, 'Grade published to the student and parent view.');
  }, [bump, nextId, result, state.assignments, state.submissions]);

  const markAttendance = useCallback((studentId: string, courseId: string, batchId: string, date: string, status: AttendanceStatus) => {
    if (!date) return result(false, 'Select an attendance date.');
    const existing = state.attendance.find((item) => item.studentId === studentId && item.courseId === courseId && item.date === date);
    setState((current) => ({ ...current, attendance: existing ? current.attendance.map((item) => item.id === existing.id ? { ...item, status } : item) : [...current.attendance, { id: `${nextId('attendance')}_${studentId}_${date}`, studentId, courseId, batchId, date, status }], nextId: existing ? current.nextId : current.nextId + 1 }));
    return result(true, 'Attendance updated across student, parent, and reports.');
  }, [nextId, result, state.attendance]);

  const recordPayment = useCallback((invoiceId: string, studentId: string, amount: number, method: 'cash' | 'bank-transfer' | 'demo-card', reference: string, date: string) => {
    const invoice = state.feeInvoices.find((item) => item.id === invoiceId && item.studentId === studentId);
    const pending = getStudentFees(studentId).invoices.find((item) => item.id === invoiceId)?.pending ?? 0;
    if (!invoice) return result(false, 'Invoice not found.');
    if (amount <= 0 || amount > pending) return result(false, `Enter an amount between ₹1 and ₹${pending.toLocaleString('en-IN')}.`);
    if (!reference.trim() || !date) return result(false, 'Reference and payment date are required.');
    const paymentId = nextId('payment');
    const receiptId = `${paymentId}_receipt`;
    setState((current) => bump({ ...current, feeInvoices: current.feeInvoices.map((item) => item.id === invoiceId && amount === pending ? { ...item, status: 'paid' } : item), payments: [...current.payments, { id: paymentId, invoiceId, studentId, amount, method, reference, date, status: 'completed', demo: true }], receipts: [...current.receipts, { id: receiptId, paymentId, invoiceId, studentId, amount, date, method, reference, status: 'completed', demo: true }], notifications: [...current.notifications, { id: `${paymentId}_notification`, userId: studentId, type: 'fees', title: 'Demo payment recorded', message: `₹${amount.toLocaleString('en-IN')} was recorded for ${invoice.title}.`, timestamp: DEMO_NOW, read: false, relatedEntityId: receiptId, path: '/student/fees' }] }));
    return result(true, 'Demo payment recorded and receipt created.');
  }, [bump, getStudentFees, nextId, result, state.feeInvoices]);

  const addResource = useCallback(async (input: Omit<LmsResource, 'id' | 'uploadedAt'> & { attachmentFiles?: Array<{ metadata: SubmissionAttachment; file?: File }> }) => {
    if (!input.title.trim() || !input.description.trim()) return result(false, 'Resource title and description are required.');
    const id = nextId('resource');
    const attachments = (input.attachmentFiles || []).map((entry) => ({ ...entry, metadata: { ...entry.metadata, ownerType: 'resource' as const, ownerId: id, uploadedBy: input.uploadedBy } }));
    try { await Promise.all(attachments.filter((entry) => Boolean(entry.file)).map((entry) => putAttachment(entry.metadata, entry.file as File))); } catch { return result(false, 'Resource files could not be saved locally.'); }
    const targets = state.students.filter((student) => student.batchId === input.batchId);
    setState((current) => bump({ ...current, resources: [...current.resources, { ...input, attachments: attachments.map((entry) => entry.metadata), id, uploadedAt: DEMO_NOW }], notifications: [...current.notifications, ...targets.map((student, index) => ({ id: `${id}_notification_${index}`, userId: student.id, type: 'resource' as const, title: 'New resource', message: `${input.title} was added to your resources.`, timestamp: DEMO_NOW, read: false, relatedEntityId: id, path: '/student/resources' }))] }));
    return result(true, 'Resource metadata shared with the batch.');
  }, [bump, nextId, result, state.students]);

  const scheduleExam = useCallback((input: Omit<LmsExam, 'id' | 'status'>) => {
    if (!input.title.trim() || !input.date || input.maxMarks <= 0 || input.durationMinutes <= 0) return result(false, 'Complete all exam fields with valid marks and duration.');
    const id = nextId('exam');
    const targets = state.students.filter((student) => student.batchId === input.batchId);
    setState((current) => bump({ ...current, exams: [...current.exams, { ...input, id, status: 'scheduled' }], notifications: [...current.notifications, ...targets.map((student, index) => ({ id: `${id}_notification_${index}`, userId: student.id, type: 'academic' as const, title: 'Exam scheduled', message: `${input.title} is scheduled for ${input.date}.`, timestamp: DEMO_NOW, read: false, relatedEntityId: id, path: '/student/exams' }))] }));
    return result(true, 'Exam scheduled and students notified.');
  }, [bump, nextId, result, state.students]);

  const scheduleClass = useCallback((input: Omit<LmsClassSession, 'id' | 'status'> & { id?: string; status?: LmsClassSession['status'] }) => {
    if (!input.courseId || !input.batchId || !input.date || !input.startTime || !input.endTime) return result(false, 'Complete all class schedule fields.');
    const id = input.id || nextId('class');
    const isJitsi = input.mode === 'jitsi' || input.mode === 'online';
    const roomName = input.jitsiRoomName || (isJitsi ? generateDeterministicRoomName(state.institution?.id || 'institution_001', id) : undefined);
    const location = input.location?.trim() || (isJitsi ? 'Jitsi Live Meeting' : 'Classroom');
    const sessionRecord: LmsClassSession = {
      ...input,
      id,
      mode: isJitsi ? 'jitsi' : 'classroom',
      location,
      meetingProvider: isJitsi ? 'jitsi' : undefined,
      jitsiRoomName: roomName,
      status: input.status || 'scheduled',
    };

    const course = state.courses.find((c) => c.id === input.courseId);
    const courseTitle = course?.title || 'Class';

    setState((current) => bump({
      ...current,
      classSessions: [...current.classSessions, sessionRecord],
      notifications: [
        ...current.notifications,
        ...current.students.filter((student) => student.batchId === input.batchId).map((student, index) => ({
          id: `${id}_notification_${index}`,
          userId: student.id,
          type: 'academic' as const,
          title: isJitsi ? 'New live class scheduled' : 'Class scheduled',
          message: `${courseTitle} is scheduled on ${input.date} at ${input.startTime}${isJitsi ? ' via Jitsi Meet.' : '.'}`,
          timestamp: DEMO_NOW,
          read: false,
          relatedEntityId: id,
          path: '/student/classes',
        })),
      ],
    }));
    return result(true, isJitsi ? 'Live class scheduled with Jitsi Meet.' : 'Class scheduled.');
  }, [bump, nextId, result, state.courses, state.institution?.id]);

  const updateClassSessionStatus = useCallback((sessionId: string, status: LmsClassSession['status'], metadata?: Pick<LmsClassSession, 'startedAt' | 'endedAt' | 'endedBy'>) => {
    const session = state.classSessions.find((s) => s.id === sessionId);
    if (!session) return result(false, 'Class session not found.');

    const course = state.courses.find((c) => c.id === session.courseId);
    const courseTitle = course?.title || 'Class';

    setState((current) => {
      let notifications = current.notifications;
      if (status === 'cancelled') {
        const batchStudents = current.students.filter((s) => s.batchId === session.batchId);
        notifications = [
          ...notifications,
          ...batchStudents.map((s, idx) => ({
            id: `cancel_${sessionId}_${idx}`,
            userId: s.id,
            type: 'academic' as const,
            title: 'Class cancelled',
            message: `${courseTitle} scheduled for ${session.date} at ${session.startTime} has been cancelled.`,
            timestamp: new Date().toISOString(),
            read: false,
            relatedEntityId: sessionId,
            path: '/student/classes',
          })),
        ];
      }
      return {
        ...current,
        classSessions: current.classSessions.map((s) => (s.id === sessionId ? { ...s, status, ...metadata } : s)),
        notifications,
      };
    });
    return result(true, `Class status updated to ${status}.`);
  }, [result, state.classSessions, state.courses]);

  const syncClassSession = useCallback(async (session: LmsClassSession) => {
    const { data: existing, error: readError } = await supabase.from('class_sessions').select('status, started_at, ended_at, ended_by').eq('id', session.id).maybeSingle();
    if (readError && import.meta.env.DEV) console.warn('[Skill Toss session realtime]', readError.message);
    if (existing?.status === 'completed' && session.status !== 'completed') {
      setState((current) => ({ ...current, classSessions: current.classSessions.map((item) => item.id === session.id ? {
        ...item, status: 'completed', endedAt: existing.ended_at, endedBy: existing.ended_by,
      } : item) }));
      return true;
    }
    const { error } = await supabase.from('class_sessions').upsert({
      id: session.id, course_id: session.courseId, teacher_id: session.teacherId, batch_id: session.batchId,
      status: session.status, jitsi_room_name: session.jitsiRoomName, scheduled_start: `${session.date}T${session.startTime}`,
      scheduled_end: `${session.date}T${session.endTime}`, started_at: session.startedAt ?? null, ended_at: session.endedAt ?? null,
      ended_by: session.endedBy ?? null, updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });
    if (error) {
      if (import.meta.env.DEV) console.error('[Skill Toss session realtime] session write failed', { sessionId: session.id, status: session.status, message: error.message });
      return false;
    }
    return true;
  }, []);

  const recordOnlineJoin = useCallback((sessionId: string, studentId: string, jitsiParticipantId?: string) => {
    if (!sessionId || !studentId) return;
    const nowIso = new Date().toISOString();
    setState((current) => {
      // Create new join entry (supports multiple joins if reconnected)
      const newAttendanceRecord: OnlineAttendanceSession = {
        id: `att_${sessionId}_${studentId}_${Date.now()}`,
        classSessionId: sessionId,
        studentId,
        jitsiParticipantId,
        joinedAt: nowIso,
      };
      return {
        ...current,
        onlineAttendance: [...(current.onlineAttendance || []), newAttendanceRecord],
      };
    });
  }, []);

  const recordOnlineLeave = useCallback((sessionId: string, studentId: string) => {
    if (!sessionId || !studentId) return;
    const nowIso = new Date().toISOString();
    setState((current) => {
      const records = current.onlineAttendance || [];
      // Find latest unclosed session for this student and class session
      const matchingIdx = [...records].reverse().findIndex((r) => r.classSessionId === sessionId && r.studentId === studentId && !r.leftAt);
      if (matchingIdx === -1) return current;
      const actualIdx = records.length - 1 - matchingIdx;
      const target = records[actualIdx];
      const joinedTime = new Date(target.joinedAt).getTime();
      const leftTime = new Date(nowIso).getTime();
      const durationMinutes = Math.max(1, Math.round((leftTime - joinedTime) / (1000 * 60)));

      const updated = [...records];
      updated[actualIdx] = {
        ...target,
        leftAt: nowIso,
        durationMinutes,
      };
      return {
        ...current,
        onlineAttendance: updated,
      };
    });
  }, []);

  const getOnlineAttendanceForSession = useCallback((sessionId: string) => {
    return (state.onlineAttendance || []).filter((item) => item.classSessionId === sessionId);
  }, [state.onlineAttendance]);

  const updateStudentProfile = useCallback((studentId: string, updates: Pick<LmsStudent, 'phone' | 'email' | 'address' | 'emergencyContact'>) => {
    if (!updates.email.includes('@') || !updates.phone.trim() || !updates.emergencyContact.trim()) return result(false, 'Enter a valid email, phone, and emergency contact.');
    setState((current) => ({ ...current, students: current.students.map((student) => student.id === studentId ? { ...student, ...updates } : student) }));
    return result(true, 'Profile updated.');
  }, [result]);

  const saveGoal = useCallback((input: { id?: string; studentId: string; title: string; category: string; target: string; deadline: string; progress: number }) => {
    if (!input.title.trim() || !input.target.trim() || !input.deadline || input.progress < 0 || input.progress > 100) return result(false, 'Complete all goal fields and use progress from 0 to 100.');
    if (input.id) setState((current) => ({ ...current, goals: current.goals.map((goal) => goal.id === input.id ? { ...goal, ...input, status: input.progress === 100 ? 'completed' : 'active' } : goal) }));
    else setState((current) => bump({ ...current, goals: [...current.goals, { ...input, id: nextId('goal'), status: input.progress === 100 ? 'completed' : 'active' }] }));
    return result(true, input.id ? 'Goal updated.' : 'Goal created.');
  }, [bump, nextId, result]);

  const deleteGoal = useCallback((id: string) => {
    setState((current) => ({ ...current, goals: current.goals.filter((goal) => goal.id !== id) }));
    return result(true, 'Goal deleted.');
  }, [result]);

  const addEvent = useCallback((input: { title: string; date: string; type: 'class' | 'exam' | 'event' | 'holiday' | 'meeting'; batch?: string }) => {
    if (!input.title.trim() || !input.date) return result(false, 'Event title and date are required.');
    setState((current) => bump({ ...current, events: [...current.events, { ...input, id: nextId('event') }] }));
    return result(true, 'Event published to shared calendars.');
  }, [bump, nextId, result]);

  const searchRecords = useCallback((query: string, studentId?: string) => {
    const term = query.trim().toLowerCase();
    if (term.length < 2) return [];
    const student = state.students.find((item) => item.id === studentId);
    const batchId = student?.batchId;
    return [
      ...state.courses.filter((item) => (!batchId || item.batchIds.includes(batchId)) && `${item.code} ${item.title}`.toLowerCase().includes(term)).map((item) => ({ id: item.id, type: 'course' as const, title: item.title, subtitle: item.code, path: '/student/courses' })),
      ...state.assignments.filter((item) => (!batchId || item.batchId === batchId) && `${item.title} ${state.courses.find((course) => course.id === item.courseId)?.title}`.toLowerCase().includes(term)).map((item) => ({ id: item.id, type: 'assignment' as const, title: item.title, subtitle: 'Assignment', path: '/student/assignments' })),
      ...state.resources.filter((item) => (!batchId || item.batchId === batchId) && `${item.title} ${item.description}`.toLowerCase().includes(term)).map((item) => ({ id: item.id, type: 'resource' as const, title: item.title, subtitle: item.type, path: '/student/resources' })),
      ...state.exams.filter((item) => (!batchId || item.batchId === batchId) && `${item.title} ${item.syllabus}`.toLowerCase().includes(term)).map((item) => ({ id: item.id, type: 'exam' as const, title: item.title, subtitle: item.date, path: '/student/exams' })),
      ...state.students.filter((item) => `${item.name} ${item.rollNo} ${item.email}`.toLowerCase().includes(term)).map((item) => ({ id: item.id, type: 'student' as const, title: item.name, subtitle: item.rollNo, path: '/admin/students' })),
      ...state.batches.filter((item) => item.name.toLowerCase().includes(term)).map((item) => ({ id: item.id, type: 'batch' as const, title: item.name, subtitle: state.departments.find((department) => department.id === item.departmentId)?.name ?? 'Batch', path: '/admin/batches' })),
    ].slice(0, 12);
  }, [state]);

  const value = useMemo<LmsDataContextValue>(() => ({
    state, feedback, clearFeedback: () => setFeedback(null), resetDemoData: () => { setState(cloneSeed()); setFeedback({ kind: 'success', message: 'Demo data reset.' }); },
    getStudentSummary, getStudentAssignments, getStudentFees, getStudentExams, getStudentResources, getOnlineAttendanceForSession, searchRecords, syncClassSession,
    addStudent, createAssignment, saveSubmission, gradeSubmission, markAttendance, recordPayment, addResource, scheduleExam, scheduleClass, updateClassSessionStatus, recordOnlineJoin, recordOnlineLeave, updateStudentProfile, saveGoal, deleteGoal, addEvent,
    markNotificationRead: (id) => setState((current) => ({ ...current, notifications: current.notifications.map((item) => item.id === id ? { ...item, read: true } : item) })),
    markAllNotificationsRead: (userId) => setState((current) => ({ ...current, notifications: current.notifications.map((item) => item.userId === userId ? { ...item, read: true } : item) })),
  }), [addEvent, addResource, addStudent, createAssignment, deleteGoal, feedback, getOnlineAttendanceForSession, getStudentAssignments, getStudentExams, getStudentFees, getStudentResources, getStudentSummary, gradeSubmission, markAttendance, recordOnlineJoin, recordOnlineLeave, recordPayment, saveGoal, saveSubmission, scheduleClass, scheduleExam, searchRecords, state, syncClassSession, updateClassSessionStatus, updateStudentProfile]);

  return <LmsDataContext.Provider value={value}>{children}</LmsDataContext.Provider>;
}
