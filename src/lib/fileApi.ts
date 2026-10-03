import { ACCEPTED_ATTACHMENT_EXTENSIONS, MAX_ATTACHMENT_SIZE, attachmentExtension } from '@/lib/attachmentConfig';
import { supabase } from '@/lib/supabase';

export type PrivateBucket = 'student-notes' | 'learning-resources' | 'assignment-submissions';

export type StudentNote = {
  id: string;
  institution_id: string;
  student_id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
};

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain', 'application/zip', 'image/jpeg', 'image/png', 'image/webp',
]);

function safeFileName(name: string) {
  const cleaned = name.normalize('NFKC').replace(/[^a-zA-Z0-9._-]/g, '_').replace(/\.{2,}/g, '.');
  return cleaned.replace(/^\.+/, '').slice(-120) || 'file';
}

function validateFile(file: File) {
  if (file.size <= 0 || file.size > MAX_ATTACHMENT_SIZE) throw new Error('File must be between 1 byte and 10 MB.');
  if (!ACCEPTED_ATTACHMENT_EXTENSIONS.includes(attachmentExtension(file.name))) throw new Error('This file extension is not allowed.');
  if (!ALLOWED_MIME_TYPES.has(file.type)) throw new Error('This file type is not allowed.');
}

async function upload(bucket: PrivateBucket, path: string, file: File) {
  validateFile(file);
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: '3600',
    contentType: file.type,
    upsert: false,
  });
  if (error) throw new Error(error.message);
}

async function rollbackUpload(bucket: PrivateBucket, path: string) {
  await supabase.storage.from(bucket).remove([path]).catch(() => undefined);
}

export async function listStudentNotes(studentId: string) {
  const { data, error } = await supabase.from('student_notes')
    .select('*').eq('student_id', studentId).order('updated_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as StudentNote[];
}

export async function saveStudentNote(input: {
  id?: string; institutionId: string; studentId: string; title: string; content: string;
}) {
  const payload = {
    institution_id: input.institutionId,
    student_id: input.studentId,
    title: input.title.trim(),
    content: input.content,
  };
  const query = input.id
    ? supabase.from('student_notes').update(payload).eq('id', input.id)
    : supabase.from('student_notes').insert(payload);
  const { data, error } = await query.select('*').single();
  if (error) throw new Error(error.message);
  if (!data) throw new Error('Supabase did not return the note.');
  return data as StudentNote;
}

export async function uploadNoteFile(input: {
  institutionId: string; studentId: string; noteId: string; file: File;
}) {
  const path = `${input.institutionId}/${input.studentId}/${crypto.randomUUID()}-${safeFileName(input.file.name)}`;
  await upload('student-notes', path, input.file);
  const { data, error } = await supabase.from('note_files').insert({
    institution_id: input.institutionId,
    note_id: input.noteId,
    student_id: input.studentId,
    file_name: input.file.name,
    mime_type: input.file.type,
    file_size: input.file.size,
    storage_path: path,
  }).select('*').single();
  if (error) { await rollbackUpload('student-notes', path); throw new Error(error.message); }
  return data;
}

export async function uploadLearningResource(input: {
  institutionId: string; batchId: string; subjectId: string; title: string; description: string; file: File;
}) {
  const path = `${input.institutionId}/${input.batchId}/${crypto.randomUUID()}-${safeFileName(input.file.name)}`;
  await upload('learning-resources', path, input.file);
  const { data, error } = await supabase.from('learning_resources').insert({
    institution_id: input.institutionId,
    batch_id: input.batchId,
    subject_id: input.subjectId,
    title: input.title.trim(),
    description: input.description.trim(),
    file_name: input.file.name,
    mime_type: input.file.type,
    file_size: input.file.size,
    storage_path: path,
  }).select('*').single();
  if (error) { await rollbackUpload('learning-resources', path); throw new Error(error.message); }
  return data;
}

export async function uploadSubmissionFile(input: {
  institutionId: string; assignmentId: string; submissionId: string; studentId: string; file: File;
}) {
  const path = `${input.institutionId}/${input.assignmentId}/${input.studentId}/${crypto.randomUUID()}-${safeFileName(input.file.name)}`;
  await upload('assignment-submissions', path, input.file);
  const { data, error } = await supabase.from('submission_files').insert({
    institution_id: input.institutionId,
    submission_id: input.submissionId,
    file_name: input.file.name,
    mime_type: input.file.type,
    file_size: input.file.size,
    storage_path: path,
  }).select('*').single();
  if (error) { await rollbackUpload('assignment-submissions', path); throw new Error(error.message); }
  return data;
}

export async function createPrivateDownloadUrl(bucket: PrivateBucket, path: string, expiresInSeconds = 60) {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresInSeconds);
  if (error) throw new Error(error.message);
  return data.signedUrl;
}
