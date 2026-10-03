import { supabase } from '@/lib/supabase';

export type Assignment = {
  id: string;
  institution_id: string;
  batch_id: string;
  subject_id: string;
  title: string;
  instructions: string;
  due_at: string;
  max_marks: number;
  status: 'draft' | 'published' | 'archived';
  created_by_profile_id: string;
  created_at: string;
  updated_at: string;
};

export type AssignmentSubmission = {
  id: string;
  institution_id: string;
  assignment_id: string;
  student_id: string;
  response: string;
  status: 'draft' | 'submitted' | 'graded';
  submitted_at: string | null;
  marks: number | null;
  feedback: string | null;
  graded_by_profile_id: string | null;
  graded_at: string | null;
  created_at: string;
  updated_at: string;
};

function assertSuccess(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

export async function createAssignment(input: {
  institutionId: string;
  batchId: string;
  subjectId: string;
  title: string;
  instructions: string;
  dueAt: string;
  maxMarks: number;
  publish?: boolean;
}): Promise<Assignment> {
  const { data, error } = await supabase.from('assignments').insert({
    institution_id: input.institutionId,
    batch_id: input.batchId,
    subject_id: input.subjectId,
    title: input.title.trim(),
    instructions: input.instructions.trim(),
    due_at: input.dueAt,
    max_marks: input.maxMarks,
    status: input.publish ? 'published' : 'draft',
  }).select('*').single();
  assertSuccess(error);
  if (!data) throw new Error('Supabase did not return the assignment.');
  return data as Assignment;
}

export async function updateAssignment(assignmentId: string, updates: Partial<Pick<
  Assignment,
  'title' | 'instructions' | 'due_at' | 'max_marks' | 'status'
>>) {
  const { error } = await supabase.from('assignments').update(updates).eq('id', assignmentId);
  assertSuccess(error);
}

export async function listAssignments(filters: { batchId?: string; status?: Assignment['status'] } = {}) {
  let query = supabase.from('assignments').select('*').order('due_at');
  if (filters.batchId) query = query.eq('batch_id', filters.batchId);
  if (filters.status) query = query.eq('status', filters.status);
  const { data, error } = await query;
  assertSuccess(error);
  return (data ?? []) as Assignment[];
}

export async function saveSubmission(input: {
  institutionId: string;
  assignmentId: string;
  studentId: string;
  response: string;
  submit: boolean;
}): Promise<AssignmentSubmission> {
  const { data, error } = await supabase.from('assignment_submissions').upsert({
    institution_id: input.institutionId,
    assignment_id: input.assignmentId,
    student_id: input.studentId,
    response: input.response,
    status: input.submit ? 'submitted' : 'draft',
  }, { onConflict: 'assignment_id,student_id' }).select('*').single();
  assertSuccess(error);
  if (!data) throw new Error('Supabase did not return the submission.');
  return data as AssignmentSubmission;
}

export async function listSubmissions(assignmentId: string) {
  const { data, error } = await supabase.from('assignment_submissions')
    .select('*').eq('assignment_id', assignmentId).order('submitted_at');
  assertSuccess(error);
  return (data ?? []) as AssignmentSubmission[];
}

export async function evaluateSubmission(input: {
  submissionId: string;
  marks: number;
  feedback: string;
}): Promise<AssignmentSubmission> {
  const { data, error } = await supabase.from('assignment_submissions').update({
    status: 'graded',
    marks: input.marks,
    feedback: input.feedback.trim() || null,
  }).eq('id', input.submissionId).select('*').single();
  assertSuccess(error);
  if (!data) throw new Error('Supabase did not return the evaluated submission.');
  return data as AssignmentSubmission;
}
