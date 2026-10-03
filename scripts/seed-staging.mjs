import process from 'node:process';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const anonKey = process.env.SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const seedPassword = process.env.SKILLTOSS_SEED_PASSWORD;
const requestedTarget = process.env.SKILLTOSS_SEED_TARGET ?? 'local';

if (!supabaseUrl || !anonKey || !serviceRoleKey || !seedPassword) {
  throw new Error('Set SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, and SKILLTOSS_SEED_PASSWORD.');
}
if (seedPassword.length < 12) throw new Error('SKILLTOSS_SEED_PASSWORD must contain at least 12 characters.');

const endpoint = new URL(supabaseUrl);
const isLocal = endpoint.hostname === '127.0.0.1' || endpoint.hostname === 'localhost';
if (requestedTarget === 'local' && !isLocal) {
  throw new Error(`Refusing local seed against non-local host: ${endpoint.hostname}`);
}
if (requestedTarget === 'staging') {
  const expectedProjectRef = process.env.SKILLTOSS_STAGING_PROJECT_REF;
  const actualProjectRef = endpoint.hostname.split('.')[0];
  if (isLocal || process.env.SKILLTOSS_ALLOW_STAGING_SEED !== 'true' || !expectedProjectRef || actualProjectRef !== expectedProjectRef) {
    throw new Error('Staging seed requires SKILLTOSS_ALLOW_STAGING_SEED=true and an exact SKILLTOSS_STAGING_PROJECT_REF match.');
  }
}
if (requestedTarget !== 'local' && requestedTarget !== 'staging') {
  throw new Error(`Unsupported seed target: ${requestedTarget}`);
}

const service = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const ids = {
  institution: '91000000-0000-4000-8000-000000000001',
  department: '91000000-0000-4000-8000-000000000002',
  course: '91000000-0000-4000-8000-000000000003',
  subject: '91000000-0000-4000-8000-000000000004',
  batch: '91000000-0000-4000-8000-000000000005',
  teacher: '91000000-0000-4000-8000-000000000006',
  student: '91000000-0000-4000-8000-000000000007',
  teacherAssignment: '91000000-0000-4000-8000-000000000008',
  enrollment: '91000000-0000-4000-8000-000000000009',
  parentLink: '91000000-0000-4000-8000-00000000000a',
  attendanceSession: '91000000-0000-4000-8000-00000000000b',
  attendanceRecord: '91000000-0000-4000-8000-00000000000c',
  assignment: '91000000-0000-4000-8000-00000000000d',
  submission: '91000000-0000-4000-8000-00000000000e',
  dailyGoal: '91000000-0000-4000-8000-00000000000f',
  dailyTask: '91000000-0000-4000-8000-000000000010',
  announcement: '91000000-0000-4000-8000-000000000011',
};

const accountSpecs = [
  { role: 'super_admin', email: 'superadmin@skilltoss.test', fullName: 'Staging Super Admin' },
  { role: 'product_admin', email: 'productadmin@skilltoss.test', fullName: 'Staging Product Admin' },
  { role: 'admin', email: 'admin@skilltoss.test', fullName: 'Staging Institution Admin' },
  { role: 'teacher', email: 'teacher@skilltoss.test', fullName: 'Staging Teacher' },
  { role: 'student', email: 'student@skilltoss.test', fullName: 'Staging Student' },
  { role: 'parent', email: 'parent@skilltoss.test', fullName: 'Staging Parent' },
];

async function requireSuccess(result, label) {
  const resolved = await result;
  if (resolved.error) throw new Error(`${label}: ${resolved.error.message}`);
  return resolved.data;
}

async function findAuthUser(email) {
  for (let page = 1; page <= 10; page += 1) {
    const data = await requireSuccess(service.auth.admin.listUsers({ page, perPage: 100 }), `list Auth users page ${page}`);
    const match = data.users.find((user) => user.email?.toLowerCase() === email);
    if (match) return match;
    if (data.users.length < 100) return null;
  }
  throw new Error(`Could not safely finish Auth lookup for ${email}`);
}

async function ensureAuthUser(spec) {
  const existing = await findAuthUser(spec.email);
  if (existing) {
    const updated = await requireSuccess(
      service.auth.admin.updateUserById(existing.id, {
        password: seedPassword,
        email_confirm: true,
        user_metadata: { seed_label: 'SkillToss local/staging fixture' },
      }),
      `update Auth user ${spec.email}`,
    );
    return updated.user;
  }
  const created = await requireSuccess(
    service.auth.admin.createUser({
      email: spec.email,
      password: seedPassword,
      email_confirm: true,
      user_metadata: { seed_label: 'SkillToss local/staging fixture' },
    }),
    `create Auth user ${spec.email}`,
  );
  return created.user;
}

async function signIn(email) {
  const auth = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const data = await requireSuccess(auth.auth.signInWithPassword({ email, password: seedPassword }), `sign in ${email}`);
  if (!data.session) throw new Error(`No session returned for ${email}`);
  return auth;
}

async function upsert(client, table, row, label) {
  await requireSuccess(client.from(table).upsert(row, { onConflict: 'id' }), label);
}

// Actor-owned tables have both INSERT and UPDATE RLS policies. An explicit existence check keeps
// reruns on the intended policy branch; PostgREST upsert can evaluate the UPDATE branch even when
// the deterministic row does not exist yet.
async function actorUpsert(client, table, row, label) {
  const existing = await requireSuccess(client.from(table).select('id').eq('id', row.id).maybeSingle(), `${label} lookup`);
  const mutation = existing
    ? client.from(table).update(row).eq('id', row.id)
    : client.from(table).insert(row);
  await requireSuccess(mutation, label);
}

const users = {};
for (const spec of accountSpecs) users[spec.role] = await ensureAuthUser(spec);

await upsert(service, 'institutions', {
  id: ids.institution,
  name: 'SkillToss Staging Academy',
  code: 'SKILLTOSS-STAGING',
  is_active: true,
}, 'upsert institution');

for (const spec of accountSpecs) {
  await requireSuccess(
    service.from('profiles').update({
      institution_id: spec.role === 'product_admin' ? null : ids.institution,
      role: spec.role,
      full_name: spec.fullName,
      is_active: true,
    }).eq('id', users[spec.role].id),
    `provision ${spec.role} profile`,
  );
}

await upsert(service, 'departments', {
  id: ids.department, institution_id: ids.institution, name: 'Computer Science', code: 'CSE', is_active: true,
}, 'upsert department');
await upsert(service, 'academic_courses', {
  id: ids.course, institution_id: ids.institution, department_id: ids.department,
  code: 'BSC-CS', title: 'B.Sc. Computer Science', description: 'Minimal staging course fixture', is_active: true,
}, 'upsert course');
await upsert(service, 'subjects', {
  id: ids.subject, institution_id: ids.institution, academic_course_id: ids.course,
  code: 'CS101', title: 'Programming Fundamentals', is_active: true,
}, 'upsert subject');
await upsert(service, 'batches', {
  id: ids.batch, institution_id: ids.institution, academic_course_id: ids.course,
  name: 'CSE Staging A', schedule: 'Mon-Fri 09:00-11:00', status: 'active', archived_at: null,
}, 'upsert batch');
await upsert(service, 'teachers', {
  id: ids.teacher, institution_id: ids.institution, profile_id: users.teacher.id,
  employee_code: 'STG-TCH-001', is_active: true,
}, 'upsert teacher identity');
await upsert(service, 'students', {
  id: ids.student, institution_id: ids.institution, profile_id: users.student.id,
  roll_no: 'STG-STU-001', is_active: true,
}, 'upsert student identity');
await upsert(service, 'teacher_batch_assignments', {
  id: ids.teacherAssignment, institution_id: ids.institution, batch_id: ids.batch,
  teacher_id: ids.teacher, subject_id: ids.subject, is_primary: true, is_active: true,
}, 'upsert teacher batch assignment');
await upsert(service, 'student_enrollments', {
  id: ids.enrollment, institution_id: ids.institution, batch_id: ids.batch,
  student_id: ids.student, status: 'active', removed_at: null,
}, 'upsert student enrollment');
await upsert(service, 'parent_student_links', {
  id: ids.parentLink, institution_id: ids.institution, parent_profile_id: users.parent.id,
  student_id: ids.student, relationship: 'Parent', is_primary: true,
}, 'upsert parent-child link');

const teacher = await signIn('teacher@skilltoss.test');
await actorUpsert(teacher, 'attendance_sessions', {
  id: ids.attendanceSession, institution_id: ids.institution, batch_id: ids.batch, subject_id: ids.subject,
  attendance_date: '2026-09-30', status: 'open', notes: 'Reproducible staging attendance',
  created_by_profile_id: users.teacher.id,
}, 'upsert attendance session');
await actorUpsert(teacher, 'attendance_records', {
  id: ids.attendanceRecord, institution_id: ids.institution, attendance_session_id: ids.attendanceSession,
  student_id: ids.student, status: 'present', marked_by_profile_id: users.teacher.id,
}, 'upsert attendance record');
await actorUpsert(teacher, 'assignments', {
  id: ids.assignment, institution_id: ids.institution, batch_id: ids.batch, subject_id: ids.subject,
  title: 'Programming Fundamentals Staging Assignment',
  instructions: 'Explain variables and submit one short example.', due_at: '2035-01-31T18:00:00.000Z',
  max_marks: 20, status: 'published', created_by_profile_id: users.teacher.id,
}, 'upsert assignment');

const student = await signIn('student@skilltoss.test');
await actorUpsert(student, 'assignment_submissions', {
  id: ids.submission, institution_id: ids.institution, assignment_id: ids.assignment,
  student_id: ids.student, response: 'A variable stores a value that a program can use.', status: 'submitted',
}, 'upsert assignment submission');
await actorUpsert(student, 'daily_goals', {
  id: ids.dailyGoal, institution_id: ids.institution, student_id: ids.student,
  title: 'Complete CS101 revision', category: 'Academic', target: 'Review the first module',
  target_date: '2035-01-31', status: 'active', completed_at: null,
}, 'upsert daily goal');
await actorUpsert(student, 'daily_tasks', {
  id: ids.dailyTask, institution_id: ids.institution, student_id: ids.student, goal_id: ids.dailyGoal,
  activity_date: '2026-10-01', title: 'Review variables and data types', status: 'pending', completed_at: null,
}, 'upsert daily task');

const admin = await signIn('admin@skilltoss.test');
await actorUpsert(admin, 'announcements', {
  id: ids.announcement, institution_id: ids.institution, batch_id: ids.batch,
  title: 'Welcome to the staging classroom', body: 'This announcement verifies tenant and batch visibility.',
  audience_roles: ['teacher', 'student', 'parent'], status: 'published', author_profile_id: users.admin.id,
  published_at: '2026-10-01T09:00:00.000Z',
}, 'upsert announcement');

for (const client of [teacher, student, admin]) await client.auth.signOut();

console.log(JSON.stringify({
  target: requestedTarget,
  institution: { id: ids.institution, code: 'SKILLTOSS-STAGING' },
  accounts: accountSpecs.map(({ role, email }) => ({ role, email, profile_status: 'active' })),
  records: Object.fromEntries(Object.entries(ids).filter(([key]) => !['institution', 'department'].includes(key))),
}, null, 2));
