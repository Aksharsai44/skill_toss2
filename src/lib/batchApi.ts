import { apiRequest } from '@/lib/djangoApi';

type DjangoUserSummary = { id: string; name: string; email: string };
type DjangoTeacherAssignment = {
  id: string; teacher_id: string; teacher_details: DjangoUserSummary; subject: string | null;
  is_primary: boolean; is_active: boolean;
};
type DjangoStudentEnrollment = {
  id: string; student_id: string; student_details: DjangoUserSummary; status: 'active' | 'removed';
  enrolled_at: string; removed_at: string | null;
};
type DjangoBatch = {
  id: string; institution: string; course: string; course_code: string; course_title: string;
  department: string; department_name: string; name: string; schedule: string | null;
  status: 'active' | 'archived'; archived_at: string | null; created_at: string; updated_at: string;
  teachers: DjangoTeacherAssignment[]; students: DjangoStudentEnrollment[];
};

export type AcademicInstitution = { id: string; name: string; code: string; is_active: boolean };
export type AcademicDepartment = { id: string; institution: string; name: string; code: string; is_active: boolean };
export type AcademicCourse = { id: string; institution: string; department: string; department_name: string; code: string; title: string; description: string; is_active: boolean };
export type AcademicSubject = { id: string; institution: string; course: string; course_title: string; code: string; title: string; is_active: boolean };
export type ParentStudentLink = { id: string; institution: string; parent_id: string; student_id: string; student_details: DjangoUserSummary; relationship: string; is_primary: boolean };

export type BatchTeacher = {
  assignment_id: string; teacher_id: string; employee_code: string | null; profile_id: string | null;
  full_name: string | null; avatar_url: string | null; subject_id: string | null;
  is_primary: boolean; is_active: boolean;
};

export type BatchStudent = {
  enrollment_id: string; student_id: string; roll_no: string; profile_id: string | null;
  full_name: string | null; avatar_url: string | null; status: 'active' | 'removed';
  enrolled_at: string; removed_at: string | null;
};

export type BatchDetail = {
  id: string; institution_id: string; academic_course_id: string; name: string; schedule: string | null;
  status: 'active' | 'archived'; archived_at: string | null; created_at: string; updated_at: string;
  course_code: string; course_title: string; department_id: string; department_code: string;
  department_name: string; teachers: BatchTeacher[]; students: BatchStudent[];
};

const adaptBatch = (batch: DjangoBatch): BatchDetail => ({
  id: batch.id,
  institution_id: batch.institution,
  academic_course_id: batch.course,
  name: batch.name,
  schedule: batch.schedule,
  status: batch.status,
  archived_at: batch.archived_at,
  created_at: batch.created_at,
  updated_at: batch.updated_at,
  course_code: batch.course_code,
  course_title: batch.course_title,
  department_id: batch.department,
  department_code: '',
  department_name: batch.department_name,
  teachers: batch.teachers.map((item) => ({
    assignment_id: item.id, teacher_id: item.teacher_id, employee_code: null,
    profile_id: item.teacher_id, full_name: item.teacher_details.name, avatar_url: null,
    subject_id: item.subject, is_primary: item.is_primary, is_active: item.is_active,
  })),
  students: batch.students.map((item) => ({
    enrollment_id: item.id, student_id: item.student_id, roll_no: item.student_id.slice(0, 8),
    profile_id: item.student_id, full_name: item.student_details.name, avatar_url: null,
    status: item.status, enrolled_at: item.enrolled_at, removed_at: item.removed_at,
  })),
});

export async function getAcademicCatalog() {
  const [institutions, departments, courses, subjects, batches, parentLinks] = await Promise.all([
    apiRequest<AcademicInstitution[]>('/api/institutions/'),
    apiRequest<AcademicDepartment[]>('/api/departments/'),
    apiRequest<AcademicCourse[]>('/api/courses/'),
    apiRequest<AcademicSubject[]>('/api/subjects/'),
    apiRequest<DjangoBatch[]>('/api/batches/'),
    apiRequest<ParentStudentLink[]>('/api/parent-student-links/'),
  ]);
  return { institutions, departments, courses, subjects, batches: batches.map(adaptBatch), parentLinks };
}

export async function listBatches(): Promise<BatchDetail[]> {
  return (await apiRequest<DjangoBatch[]>('/api/batches/')).map(adaptBatch);
}

export async function getBatch(batchId: string): Promise<BatchDetail> {
  return adaptBatch(await apiRequest<DjangoBatch>(`/api/batches/${batchId}/`));
}

export async function createBatch(input: {
  institutionId?: string; academicCourseId: string; name: string; schedule?: string;
}): Promise<string> {
  const created = await apiRequest<DjangoBatch>('/api/batches/', {
    method: 'POST',
    body: { course: input.academicCourseId, name: input.name.trim(), schedule: input.schedule?.trim() || '' },
  });
  return created.id;
}

export async function updateBatch(batchId: string, updates: { name?: string; schedule?: string | null }) {
  await apiRequest<DjangoBatch>(`/api/batches/${batchId}/`, {
    method: 'PATCH',
    body: {
      ...(updates.name === undefined ? {} : { name: updates.name.trim() }),
      ...(updates.schedule === undefined ? {} : { schedule: updates.schedule?.trim() || '' }),
    },
  });
}

export async function archiveBatch(batchId: string) {
  await apiRequest<DjangoBatch>(`/api/batches/${batchId}/`, { method: 'PATCH', body: { status: 'archived' } });
}

export async function assignTeacher(input: {
  institutionId?: string; batchId: string; teacherId: string; subjectId?: string; isPrimary?: boolean;
}) {
  await apiRequest('/api/teacher-assignments/', {
    method: 'POST', body: { batch: input.batchId, teacher: input.teacherId, subject: input.subjectId ?? null, is_primary: input.isPrimary ?? false, is_active: true },
  });
}

export async function removeTeacher(assignmentId: string) {
  await apiRequest(`/api/teacher-assignments/${assignmentId}/`, { method: 'PATCH', body: { is_active: false } });
}

export async function enrollStudent(input: { institutionId?: string; batchId: string; studentId: string }) {
  await apiRequest('/api/student-enrollments/', { method: 'POST', body: { batch: input.batchId, student: input.studentId, status: 'active' } });
}

export async function removeStudent(enrollmentId: string) {
  await apiRequest(`/api/student-enrollments/${enrollmentId}/`, { method: 'PATCH', body: { status: 'removed' } });
}
