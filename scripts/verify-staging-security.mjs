import { randomUUID } from 'node:crypto';
import process from 'node:process';
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const publicKey = process.env.SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const password = process.env.SKILLTOSS_SEED_PASSWORD;
const projectRef = process.env.SKILLTOSS_STAGING_PROJECT_REF;
if (!url || !publicKey || !serviceKey || !password) throw new Error('Missing staging verification credentials.');
if (
  process.env.SKILLTOSS_VERIFY_TARGET !== 'staging'
  || process.env.SKILLTOSS_ALLOW_STAGING_VERIFY !== 'true'
  || !projectRef
  || new URL(url).hostname !== `${projectRef}.supabase.co`
) throw new Error('Refusing security verification without an exact, explicitly enabled staging target.');

const service = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const client = () => createClient(url, publicKey, { auth: { persistSession: false, autoRefreshToken: false } });
const ids = {
  institution: '91000000-0000-4000-8000-000000000001',
  batch: '91000000-0000-4000-8000-000000000005',
  subject: '91000000-0000-4000-8000-000000000004',
  student: '91000000-0000-4000-8000-000000000007',
  assignment: '91000000-0000-4000-8000-00000000000d',
  submission: '91000000-0000-4000-8000-00000000000e',
};
const transientUserIds = [];
const storageObjects = [];
const metadataRows = [];
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const signIn = async (email, candidatePassword = password) => {
  const auth = client();
  const { data, error } = await auth.auth.signInWithPassword({ email, password: candidatePassword });
  if (error || !data.session) throw error ?? new Error(`No session for ${email}`);
  return auth;
};

// Remove only fixtures from interrupted runs of this verifier.
await service.from('learning_resources').delete().eq('title', 'Security resource').eq('description', 'temporary');
await service.from('student_notes').delete().eq('title', 'Security check').eq('content', 'temporary');
const priorUsers = await service.auth.admin.listUsers({ page: 1, perPage: 1000 });
if (!priorUsers.error) {
  for (const user of priorUsers.data.users.filter((candidate) => candidate.email?.endsWith('@auth-check.test'))) {
    await service.auth.admin.deleteUser(user.id);
  }
}

try {
  const student = await signIn('student@skilltoss.test');
  const teacher = await signIn('teacher@skilltoss.test');
  const productAdmin = await signIn('productadmin@skilltoss.test');
  const anonymous = client();

  assert((await anonymous.from('profiles').select('id').limit(1)).error, 'Anonymous profile read was accepted.');
  const rawRest = await fetch(`${url}/rest/v1/profiles?select=id&limit=1`, { headers: { apikey: publicKey } });
  assert(!rawRest.ok, 'Direct anonymous REST request bypassed grants/RLS.');

  const { data: currentStudent } = await student.auth.getUser();
  assert(currentStudent.user, 'Student session has no user.');
  const forgedTenant = randomUUID();
  const forged = await student.auth.updateUser({ data: { role: 'super_admin', institution_id: forgedTenant } });
  assert(!forged.error, 'User metadata update unexpectedly failed.');
  const authoritative = await student.from('profiles').select('role,institution_id,is_active').single();
  assert(!authoritative.error && authoritative.data.role === 'student' && authoritative.data.is_active, 'Forged metadata changed profile authority.');
  assert((await student.from('institutions').select('id').eq('id', forgedTenant)).data?.length === 0, 'Forged metadata granted cross-tenant access.');
  await service.auth.admin.updateUserById(currentStudent.user.id, { user_metadata: { seed_label: 'SkillToss local/staging fixture' } });

  await student.from('profiles').update({ role: 'super_admin' }).eq('id', currentStudent.user.id);
  const roleAfterUpdate = await student.from('profiles').select('role').eq('id', currentStudent.user.id).single();
  assert(!roleAfterUpdate.error && roleAfterUpdate.data.role === 'student', 'Student changed authoritative role.');
  await student.from('profiles').delete().eq('id', currentStudent.user.id);
  assert(!(await service.from('profiles').select('id').eq('id', currentStudent.user.id).single()).error, 'Student deleted a profile.');

  const publicEmail = `public-${randomUUID()}@auth-check.test`;
  const publicPassword = `Tmp-${randomUUID()}-aA1!`;
  let publicSignup = await anonymous.auth.signUp({
    email: publicEmail,
    password: publicPassword,
    options: { data: { role: 'super_admin', institution_id: forgedTenant } },
  });
  const signupRateLimited = publicSignup.error?.message.toLowerCase().includes('rate limit') ?? false;
  if (signupRateLimited) {
    const fallback = await service.auth.admin.createUser({
      email: publicEmail, password: publicPassword, email_confirm: true,
      user_metadata: { role: 'super_admin', institution_id: forgedTenant },
    });
    publicSignup = fallback;
  }
  assert(!publicSignup.error && publicSignup.data.user, `Signup fixture failed: ${publicSignup.error?.message ?? 'no user'}`);
  transientUserIds.push(publicSignup.data.user.id);
  const publicProfile = await service.from('profiles').select('role,institution_id,is_active').eq('id', publicSignup.data.user.id).single();
  assert(
    !publicProfile.error && publicProfile.data.role === 'student' && publicProfile.data.institution_id === null && !publicProfile.data.is_active,
    'Public signup metadata provisioned privilege or tenant access.',
  );
  await service.auth.admin.updateUserById(publicSignup.data.user.id, { email_confirm: true });
  const inactive = await signIn(publicEmail, publicPassword);
  const inactiveBatches = await inactive.from('batches').select('id');
  assert(!inactiveBatches.error && inactiveBatches.data.length === 0, 'Inactive user read educational data.');
  await inactive.auth.signOut();

  const recoveryRequest = await anonymous.auth.resetPasswordForEmail(publicEmail, { redirectTo: 'http://127.0.0.1:4179/login' });
  const recoveryRateLimited = recoveryRequest.error?.message.toLowerCase().includes('rate limit') ?? false;
  assert(!recoveryRequest.error || recoveryRateLimited, `Recovery request was rejected: ${recoveryRequest.error?.message}`);
  const recoveryLink = await service.auth.admin.generateLink({ type: 'recovery', email: publicEmail });
  const tokenHash = recoveryLink.data?.properties?.hashed_token;
  assert(!recoveryLink.error && tokenHash, 'Recovery link did not provide a token hash.');
  const recoveryClient = client();
  const recoverySession = await recoveryClient.auth.verifyOtp({ type: 'recovery', token_hash: tokenHash });
  assert(!recoverySession.error && recoverySession.data.session, 'Recovery callback did not establish a session.');
  const recoveredPassword = `Recovered-${randomUUID()}-aA1!`;
  assert(!(await recoveryClient.auth.updateUser({ password: recoveredPassword })).error, 'Recovery password update failed.');
  await recoveryClient.auth.signOut();
  await (await signIn(publicEmail, recoveredPassword)).auth.signOut();

  const suffix = randomUUID();
  const noteId = randomUUID();
  const notePath = `${ids.institution}/${ids.student}/${suffix}-note.txt`;
  const noteInsert = await student.from('student_notes').insert({ id: noteId, institution_id: ids.institution, student_id: ids.student, title: 'Security check', content: 'temporary' });
  assert(!noteInsert.error, `Could not create storage note: ${noteInsert.error?.message}`);
  metadataRows.push(['student_notes', noteId]);
  const noteUpload = await student.storage.from('student-notes').upload(notePath, new Blob(['private note'], { type: 'text/plain' }));
  assert(!noteUpload.error, `Authorized note upload failed: ${noteUpload.error?.message}`);
  storageObjects.push(['student-notes', notePath]);
  const noteMetadata = await student.from('note_files').insert({
    institution_id: ids.institution, note_id: noteId, student_id: ids.student,
    file_name: 'note.txt', mime_type: 'text/plain', file_size: 12, storage_path: notePath,
  });
  assert(!noteMetadata.error, `Note metadata failed: ${noteMetadata.error?.message}`);
  assert(!(await student.storage.from('student-notes').download(notePath)).error, 'Student could not download own note.');
  assert((await teacher.storage.from('student-notes').download(notePath)).error, 'Teacher downloaded a private note.');

  const resourcePath = `${ids.institution}/${ids.batch}/${suffix}-resource.txt`;
  const resourceUpload = await teacher.storage.from('learning-resources').upload(resourcePath, new Blob(['learning resource'], { type: 'text/plain' }));
  assert(!resourceUpload.error, `Teacher resource upload failed: ${resourceUpload.error?.message}`);
  storageObjects.push(['learning-resources', resourcePath]);
  const resourceMetadata = await teacher.from('learning_resources').insert({
    institution_id: ids.institution, batch_id: ids.batch, subject_id: ids.subject,
    title: 'Security resource', description: 'temporary', file_name: 'resource.txt',
    mime_type: 'text/plain', file_size: 17, storage_path: resourcePath,
  }).select('id').single();
  assert(!resourceMetadata.error, `Resource metadata failed: ${resourceMetadata.error?.message}`);
  metadataRows.push(['learning_resources', resourceMetadata.data.id]);
  assert(!(await student.storage.from('learning-resources').download(resourcePath)).error, 'Student could not download resource.');
  assert((await productAdmin.storage.from('learning-resources').download(resourcePath)).error, 'Product admin bypassed file scope.');
  const signed = await student.storage.from('learning-resources').createSignedUrl(resourcePath, 30);
  assert(!signed.error && (await fetch(signed.data.signedUrl)).ok, 'Signed private download failed.');
  const unsignedUrl = student.storage.from('learning-resources').getPublicUrl(resourcePath).data.publicUrl;
  assert(!(await fetch(unsignedUrl)).ok, 'Private object was publicly downloadable.');

  const submissionPath = `${ids.institution}/${ids.assignment}/${ids.student}/${suffix}-submission.txt`;
  const submissionUpload = await student.storage.from('assignment-submissions').upload(submissionPath, new Blob(['submission'], { type: 'text/plain' }));
  assert(!submissionUpload.error, `Submission upload failed: ${submissionUpload.error?.message}`);
  storageObjects.push(['assignment-submissions', submissionPath]);
  const submissionFileId = randomUUID();
  const submissionMetadata = await student.from('submission_files').insert({
    id: submissionFileId, institution_id: ids.institution, submission_id: ids.submission, file_name: 'submission.txt',
    mime_type: 'text/plain', file_size: 10, storage_path: submissionPath,
  });
  assert(!submissionMetadata.error, `Submission metadata failed: ${submissionMetadata.error?.message}`);
  metadataRows.push(['submission_files', submissionFileId]);
  assert(!(await teacher.storage.from('assignment-submissions').download(submissionPath)).error, 'Teacher could not read submission.');
  await teacher.storage.from('assignment-submissions').remove([submissionPath]);
  assert(!(await student.storage.from('assignment-submissions').download(submissionPath)).error, 'Teacher deleted student submission.');

  const badMime = await student.storage.from('student-notes').upload(
    `${ids.institution}/${ids.student}/${suffix}-bad.exe`, new Blob(['bad'], { type: 'application/x-msdownload' }),
  );
  assert(badMime.error, 'Disallowed MIME upload was accepted.');
  const oversize = await student.storage.from('student-notes').upload(
    `${ids.institution}/${ids.student}/${suffix}-large.txt`,
    new Blob([new Uint8Array(10 * 1024 * 1024 + 1)], { type: 'text/plain' }),
  );
  assert(oversize.error, 'Upload above 10 MB was accepted.');

  await Promise.all([student.auth.signOut(), teacher.auth.signOut(), productAdmin.auth.signOut()]);
  console.log('PASS: signup authority, forgery/REST denial, role/delete denial, inactive/recovery behavior, and private Storage boundaries');
  if (signupRateLimited || recoveryRateLimited) console.log('LIMITATION: hosted email rate limiting prevented end-to-end delivery verification; generated recovery-token callback still passed.');
} finally {
  for (const [bucket, path] of storageObjects.reverse()) {
    try { await service.storage.from(bucket).remove([path]); } catch { /* Best-effort fixture cleanup. */ }
  }
  for (const [table, id] of metadataRows.reverse()) {
    try { await service.from(table).delete().eq('id', id); } catch { /* Best-effort fixture cleanup. */ }
  }
  for (const userId of transientUserIds.reverse()) {
    try { await service.auth.admin.deleteUser(userId); } catch { /* Best-effort fixture cleanup. */ }
  }
}
