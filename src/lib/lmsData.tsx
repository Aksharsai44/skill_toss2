import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { lmsDemoSeed } from '@/lib/mockData';
import { LmsDataContext, type ActionResult, type Feedback, type LmsDataContextValue } from '@/lib/lmsDataContext';
import type { AttendanceStatus, LmsAssignment, LmsExam, LmsResource, LmsState, LmsStudent } from '@/lib/types';

const STORAGE_KEY = 'skill-toss-lms-demo-v3';
const DEMO_NOW = '2026-08-12T12:00:00+05:30';

const cloneSeed = (): LmsState => JSON.parse(JSON.stringify(lmsDemoSeed)) as LmsState;
const loadState = (): LmsState => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return cloneSeed();
    const parsed = JSON.parse(raw) as LmsState;
    return parsed.version === lmsDemoSeed.version ? parsed : cloneSeed();
  } catch {
    return cloneSeed();
  }
};

export function LmsDataProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<LmsState>(loadState);
  const [feedback, setFeedback] = useState<Feedback>(null);

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }, [state]);
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

  const createAssignment = useCallback((input: Omit<LmsAssignment, 'id' | 'createdAt' | 'status'>) => {
    if (!input.title.trim() || !input.instructions.trim() || !input.dueDate || input.maxMarks <= 0) return result(false, 'Title, instructions, due date, and valid marks are required.');
    const id = nextId('assignment');
    const targets = state.students.filter((student) => student.batchId === input.batchId);
    setState((current) => bump({ ...current, assignments: [...current.assignments, { ...input, id, createdAt: DEMO_NOW, status: 'open' }], notifications: [...current.notifications, ...targets.map((student, index) => ({ id: `${id}_notification_${index + 1}`, userId: student.id, type: 'academic' as const, title: 'New assignment', message: `${input.title} is now available.`, timestamp: DEMO_NOW, read: false, relatedEntityId: id, path: '/student/assignments' }))] }));
    return result(true, 'Assignment created and shared with the batch.');
  }, [bump, nextId, result, state.students]);

  const saveSubmission = useCallback((assignmentId: string, studentId: string, response: string, submit: boolean, attachmentName?: string) => {
    if (!response.trim() && !attachmentName) return result(false, 'Add a response or attachment before saving.');
    const existing = state.submissions.find((item) => item.assignmentId === assignmentId && item.studentId === studentId);
    if (existing?.status === 'graded') return result(false, 'A graded submission cannot be changed.');
    const status = submit ? 'submitted' as const : 'in-progress' as const;
    setState((current) => ({ ...current, submissions: existing ? current.submissions.map((item) => item.id === existing.id ? { ...item, response, attachmentName, status, submittedAt: submit ? DEMO_NOW : item.submittedAt } : item) : [...current.submissions, { id: nextId('submission'), assignmentId, studentId, response, attachmentName, status, submittedAt: submit ? DEMO_NOW : undefined }], nextId: existing ? current.nextId : current.nextId + 1 }));
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

  const addResource = useCallback((input: Omit<LmsResource, 'id' | 'uploadedAt'>) => {
    if (!input.title.trim() || !input.description.trim()) return result(false, 'Resource title and description are required.');
    const id = nextId('resource');
    const targets = state.students.filter((student) => student.batchId === input.batchId);
    setState((current) => bump({ ...current, resources: [...current.resources, { ...input, id, uploadedAt: DEMO_NOW }], notifications: [...current.notifications, ...targets.map((student, index) => ({ id: `${id}_notification_${index}`, userId: student.id, type: 'resource' as const, title: 'New resource', message: `${input.title} was added to your resources.`, timestamp: DEMO_NOW, read: false, relatedEntityId: id, path: '/student/resources' }))] }));
    return result(true, 'Resource metadata shared with the batch.');
  }, [bump, nextId, result, state.students]);

  const scheduleExam = useCallback((input: Omit<LmsExam, 'id' | 'status'>) => {
    if (!input.title.trim() || !input.date || input.maxMarks <= 0 || input.durationMinutes <= 0) return result(false, 'Complete all exam fields with valid marks and duration.');
    const id = nextId('exam');
    const targets = state.students.filter((student) => student.batchId === input.batchId);
    setState((current) => bump({ ...current, exams: [...current.exams, { ...input, id, status: 'scheduled' }], notifications: [...current.notifications, ...targets.map((student, index) => ({ id: `${id}_notification_${index}`, userId: student.id, type: 'academic' as const, title: 'Exam scheduled', message: `${input.title} is scheduled for ${input.date}.`, timestamp: DEMO_NOW, read: false, relatedEntityId: id, path: '/student/exams' }))] }));
    return result(true, 'Exam scheduled and students notified.');
  }, [bump, nextId, result, state.students]);

  const scheduleClass = useCallback((input: { courseId: string; batchId: string; teacherId: string; date: string; startTime: string; endTime: string; mode: 'classroom' | 'online'; location: string }) => {
    if (!input.courseId || !input.batchId || !input.date || !input.startTime || !input.endTime || !input.location.trim()) return result(false, 'Complete all class schedule fields.');
    const id = nextId('class');
    setState((current) => bump({ ...current, classSessions: [...current.classSessions, { ...input, id, status: 'scheduled' }], notifications: [...current.notifications, ...current.students.filter((student) => student.batchId === input.batchId).map((student, index) => ({ id: `${id}_notification_${index}`, userId: student.id, type: 'academic' as const, title: 'Class scheduled', message: `A class is scheduled for ${input.date} at ${input.startTime}.`, timestamp: DEMO_NOW, read: false, relatedEntityId: id, path: '/student/classes' }))] }));
    return result(true, 'Class scheduled and internal reminders created.');
  }, [bump, nextId, result]);

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
    state, feedback, setFeedback, clearFeedback: () => setFeedback(null), resetDemoData: () => { setState(cloneSeed()); setFeedback({ kind: 'success', message: 'Demo data reset.' }); },
    getStudentSummary, getStudentAssignments, getStudentFees, getStudentExams, getStudentResources, searchRecords,
    addStudent, createAssignment, saveSubmission, gradeSubmission, markAttendance, recordPayment, addResource, scheduleExam, scheduleClass, updateStudentProfile, saveGoal, deleteGoal, addEvent,
    markNotificationRead: (id) => setState((current) => ({ ...current, notifications: current.notifications.map((item) => item.id === id ? { ...item, read: true } : item) })),
    markAllNotificationsRead: (userId) => setState((current) => ({ ...current, notifications: current.notifications.map((item) => item.userId === userId ? { ...item, read: true } : item) })),
  }), [addEvent, addResource, addStudent, createAssignment, deleteGoal, feedback, getStudentAssignments, getStudentExams, getStudentFees, getStudentResources, getStudentSummary, gradeSubmission, markAttendance, recordPayment, saveGoal, saveSubmission, scheduleClass, scheduleExam, searchRecords, state, updateStudentProfile]);

  return <LmsDataContext.Provider value={value}>{children}</LmsDataContext.Provider>;
}
