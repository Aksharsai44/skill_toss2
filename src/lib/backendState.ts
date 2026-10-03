import { lmsDemoSeed } from '@/lib/mockData';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type { LmsState, UserProfile } from '@/lib/types';
import { getAcademicCatalog } from '@/lib/batchApi';
import { listAttendanceRecords, listAttendanceSessions } from '@/lib/attendanceApi';

const avatar = (name: string) => `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundColor=2563eb&textColor=ffffff`;

export function emptyBackendState(): LmsState {
  const state = structuredClone(lmsDemoSeed);
  for (const [key, value] of Object.entries(state)) {
    if (Array.isArray(value)) (state as unknown as Record<string, unknown>)[key] = [];
  }
  state.institution = { id: '', name: '' };
  state.nextId = 1;
  return state;
}

// PostgREST queries here intentionally span unrelated tables before generated database types exist.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;
const rows = (result: { data: unknown[] | null; error: { message: string } | null }, label: string) => {
  // Deferred Supabase domains must not erase successfully loaded Django academic data.
  if (result.error) {
    if (import.meta.env.DEV) console.warn(`${label} data is temporarily unavailable.`);
    return [];
  }
  return (result.data ?? []) as Row[];
};

export async function loadBackendState(profile: UserProfile): Promise<LmsState> {
  const emptyResult = Promise.resolve({ data: [] as unknown[], error: null });
  const [catalog, sessions, attendance, assignmentsResult, submissionsResult,
    goalsResult, notesResult, resourcesResult, announcementsResult] = await Promise.all([
    getAcademicCatalog(),
    listAttendanceSessions(),
    listAttendanceRecords(),
    isSupabaseConfigured ? supabase.from('assignments').select('*').order('due_at') : emptyResult,
    isSupabaseConfigured ? supabase.from('assignment_submissions').select('*') : emptyResult,
    isSupabaseConfigured ? supabase.from('daily_goals').select('*') : emptyResult,
    isSupabaseConfigured ? supabase.from('student_notes').select('*') : emptyResult,
    isSupabaseConfigured ? supabase.from('learning_resources').select('*') : emptyResult,
    isSupabaseConfigured ? supabase.from('announcements').select('*').order('published_at', { ascending: false }) : emptyResult,
  ]);
  const { institutions, departments, courses: academicCourses, subjects, batches: batchDetails, parentLinks } = catalog;
  const assignments = rows(assignmentsResult, 'assignments');
  const submissions = rows(submissionsResult, 'submissions');
  const state = emptyBackendState();
  const institution = institutions.find((item) => item.id === profile.institutionId) ?? institutions[0];
  state.institution = institution ? { id: institution.id, name: institution.name } : { id: profile.institutionId ?? '', name: 'SkillToss' };
  state.departments = departments.map((item) => ({ id: item.id, name: item.name }));
  state.batches = batchDetails.map((item) => ({
    id: item.id, name: item.name, departmentId: item.department_id,
    teacherId: item.teachers?.find((teacher: Row) => teacher.is_primary)?.teacher_id ?? item.teachers?.[0]?.teacher_id ?? '',
    schedule: item.schedule ?? '',
  }));
  state.courses = subjects.map((subject) => ({
    id: subject.id, code: subject.code, title: subject.title,
    departmentId: academicCourses.find((course) => course.id === subject.course)?.department ?? '',
    teacherId: batchDetails.flatMap((batch) => batch.teachers ?? []).find((teacher: Row) => teacher.subject_id === subject.id)?.teacher_id ?? '',
    batchIds: batchDetails.filter((batch) => batch.academic_course_id === subject.course).map((batch) => batch.id),
  }));
  const batchStudents: Row[] = batchDetails.flatMap((batch) => (batch.students ?? []).map((student) => ({ ...student, batch_id: batch.id, department_id: batch.department_id }) as Row));
  const studentById = new Map(batchStudents.map((student) => [student.student_id, student]));
  state.students = [...studentById.values()].map((student) => ({
    id: student.student_id, profileId: student.profile_id ?? undefined,
    name: student.full_name ?? (student.profile_id === profile.id ? profile.fullName : student.roll_no),
    rollNo: student.roll_no, batchId: student.batch_id ?? '', departmentId: student.department_id ?? '',
    email: '', phone: '', parentPhone: '', address: '', emergencyContact: '',
    avatar: student.avatar_url ?? avatar(student.full_name ?? student.roll_no), status: student.status === 'removed' || student.is_active === false ? 'inactive' : 'active',
  }));
  const batchTeachers: Row[] = batchDetails.flatMap((batch) => (batch.teachers ?? []).map((teacher) => ({ ...teacher, batch_id: batch.id }) as Row));
  const teacherById = new Map(batchTeachers.map((teacher) => [teacher.teacher_id, teacher]));
  state.teachers = [...teacherById.values()].map((teacher) => ({
    id: teacher.teacher_id, name: teacher.full_name ?? (teacher.profile_id === profile.id ? profile.fullName : teacher.employee_code),
    email: '', phone: '', avatar: teacher.avatar_url ?? avatar(teacher.full_name ?? teacher.employee_code),
    courseIds: batchTeachers.filter((item) => item.teacher_id === teacher.teacher_id && item.subject_id).map((item) => item.subject_id),
    batchIds: batchTeachers.filter((item) => item.teacher_id === teacher.teacher_id).map((item) => item.batch_id),
    status: teacher.is_active === false ? 'on-leave' : 'active',
  }));
  state.parentLinks = parentLinks.map((link) => ({
    id: link.id, parentId: link.parent_id, studentId: link.student_id,
    studentName: state.students.find((student) => student.id === link.student_id)?.name ?? 'Student',
    studentBatch: state.batches.find((batch) => batch.id === state.students.find((student) => student.id === link.student_id)?.batchId)?.name ?? '',
    relationship: (String(link.relationship).toLowerCase() === 'parent' ? 'guardian' : String(link.relationship).toLowerCase()) as 'father' | 'mother' | 'guardian' | 'other',
    isPrimary: link.is_primary, avatar: avatar(link.student_id),
  }));
  state.assignments = assignments.map((item) => ({
    id: item.id, title: item.title, courseId: item.subject_id, batchId: item.batch_id,
    teacherId: item.created_by_profile_id, instructions: item.instructions, dueDate: item.due_at,
    maxMarks: Number(item.max_marks), status: item.status === 'archived' ? 'archived' : 'open', createdAt: item.created_at,
  }));
  state.submissions = submissions.map((item) => ({
    id: item.id, assignmentId: item.assignment_id, studentId: item.student_id, response: item.response,
    status: item.status === 'draft' ? 'in-progress' : item.status, submittedAt: item.submitted_at ?? undefined,
    updatedAt: item.updated_at, marks: item.marks ?? undefined, feedback: item.feedback ?? undefined, gradedAt: item.graded_at ?? undefined,
  }));
  const sessionById = new Map(sessions.map((item) => [item.id, item]));
  state.attendance = attendance.map((item) => ({
    id: item.id, studentId: item.student_id, courseId: sessionById.get(item.attendance_session_id)?.subject_id ?? '',
    batchId: sessionById.get(item.attendance_session_id)?.batch_id ?? '',
    date: sessionById.get(item.attendance_session_id)?.attendance_date ?? item.marked_at.slice(0, 10), status: item.status,
  }));
  state.goals = rows(goalsResult, 'goals').map((item) => ({
    id: item.id, studentId: item.student_id, title: item.title, category: item.category, target: item.target,
    deadline: item.target_date ?? '', progress: item.status === 'completed' ? 100 : 0,
    status: item.status === 'completed' ? 'completed' : 'active',
  }));
  state.notes = rows(notesResult, 'notes').map((item) => ({ id: item.id, studentId: item.student_id, title: item.title, content: item.content, createdAt: item.created_at, updatedAt: item.updated_at }));
  state.resources = rows(resourcesResult, 'resources').map((item) => ({
    id: item.id, title: item.title, description: item.description, courseId: item.subject_id, batchId: item.batch_id,
    type: item.mime_type.includes('pdf') ? 'PDF' : item.mime_type.includes('presentation') ? 'PPT' : 'DOC',
    uploadedBy: item.uploaded_by_profile_id, uploadedAt: item.created_at,
  }));
  state.notifications = rows(announcementsResult, 'announcements').map((item) => ({
    id: item.id, userId: profile.id, type: 'announcement', title: item.title, message: item.body,
    timestamp: item.published_at ?? item.created_at, read: false,
  }));
  return state;
}
