import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

type ProvisionRole = 'admin' | 'teacher' | 'student' | 'parent';
type ProvisionRequest = {
  email?: string;
  fullName?: string;
  role?: ProvisionRole;
  institutionId?: string;
  employeeCode?: string;
  batchId?: string;
  subjectId?: string;
  rollNo?: string;
  studentId?: string;
  relationship?: string;
  redirectTo?: string;
};

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const publishableKey = Deno.env.get('SUPABASE_ANON_KEY');
const allowedOrigins = (Deno.env.get('SITE_URL') ?? '')
  .split(',')
  .map((value) => value.trim().replace(/\/$/, ''))
  .filter(Boolean);

function json(origin: string, status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Vary': 'Origin',
    },
  });
}

function clean(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

Deno.serve(async (request) => {
  const origin = request.headers.get('origin')?.replace(/\/$/, '') ?? '';
  const allowedOrigin = allowedOrigins.includes(origin) ? origin : '';
  if (!supabaseUrl || !serviceRoleKey || !publishableKey || allowedOrigins.length === 0) {
    return json(allowedOrigin || 'null', 500, { error: 'The provisioning service is not configured.' });
  }
  if (!allowedOrigin) return json('null', 403, { error: 'This origin is not allowed.' });
  if (request.method === 'OPTIONS') return json(allowedOrigin, 200, { ok: true });
  if (request.method !== 'POST') return json(allowedOrigin, 405, { error: 'Method not allowed.' });

  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) return json(allowedOrigin, 401, { error: 'Authentication is required.' });
  const token = authorization.slice('Bearer '.length);
  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const authCheck = await admin.auth.getUser(token);
  if (authCheck.error || !authCheck.data.user) return json(allowedOrigin, 401, { error: 'The session is invalid or expired.' });

  let input: ProvisionRequest;
  try { input = await request.json(); } catch { return json(allowedOrigin, 400, { error: 'Request body must be valid JSON.' }); }
  const email = clean(input.email).toLowerCase();
  const fullName = clean(input.fullName);
  const role = clean(input.role) as ProvisionRole;
  const institutionId = clean(input.institutionId);
  const redirectTo = clean(input.redirectTo);
  if (!email || !fullName || !role || !institutionId || !redirectTo) {
    return json(allowedOrigin, 400, { error: 'Full name, email, role, institution, and setup URL are required.' });
  }
  let redirectOrigin = '';
  try { redirectOrigin = new URL(redirectTo).origin.replace(/\/$/, ''); } catch { /* handled below */ }
  if (!allowedOrigins.includes(redirectOrigin)) return json(allowedOrigin, 400, { error: 'The password setup URL is not allowed.' });

  const actorProfile = await admin.from('profiles')
    .select('id,institution_id,role,is_active')
    .eq('id', authCheck.data.user.id)
    .maybeSingle();
  if (actorProfile.error || !actorProfile.data?.is_active) return json(allowedOrigin, 403, { error: 'An active administrator profile is required.' });
  const permittedRoles = actorProfile.data.role === 'super_admin'
    ? ['admin', 'teacher', 'student', 'parent']
    : actorProfile.data.role === 'admin'
      ? ['teacher', 'student', 'parent']
      : [];
  if (!permittedRoles.includes(role)) return json(allowedOrigin, 403, { error: 'You are not allowed to create that role.' });
  if (actorProfile.data.institution_id !== institutionId) return json(allowedOrigin, 403, { error: 'You may create users only in your own institution.' });

  if (role === 'student' && (!clean(input.rollNo) || !clean(input.batchId))) {
    return json(allowedOrigin, 400, { error: 'Student roll number and batch are required.' });
  }
  if (role === 'parent' && (!clean(input.studentId) || !clean(input.relationship))) {
    return json(allowedOrigin, 400, { error: 'A linked student and relationship are required for a Parent.' });
  }

  const invitation = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo,
    data: { full_name: fullName, invited_by: authCheck.data.user.id },
  });
  if (invitation.error || !invitation.data.user) {
    const duplicate = /already|registered|exists/i.test(invitation.error?.message ?? '');
    return json(allowedOrigin, duplicate ? 409 : 400, {
      error: duplicate ? 'An account with this email already exists.' : (invitation.error?.message ?? 'The invitation could not be sent.'),
    });
  }

  const userId = invitation.data.user.id;
  const provision = await admin.rpc('provision_invited_user', {
    actor_profile_id: authCheck.data.user.id,
    target_profile_id: userId,
    target_email: email,
    target_full_name: fullName,
    target_role: role,
    target_institution_id: institutionId,
    teacher_employee_code: clean(input.employeeCode) || null,
    target_batch_id: clean(input.batchId) || null,
    target_subject_id: clean(input.subjectId) || null,
    student_roll_no: clean(input.rollNo) || null,
    parent_student_id: clean(input.studentId) || null,
    parent_relationship: clean(input.relationship) || null,
  });
  if (provision.error) {
    const cleanup = await admin.auth.admin.deleteUser(userId);
    console.error('User provisioning failed', {
      actorId: authCheck.data.user.id,
      targetUserId: userId,
      role,
      provisionError: provision.error.message,
      compensationError: cleanup.error?.message ?? null,
    });
    return json(allowedOrigin, 400, {
      error: cleanup.error
        ? 'Provisioning failed and automatic cleanup also failed. Contact support with the account email.'
        : `Provisioning failed: ${provision.error.message}`,
    });
  }

  return json(allowedOrigin, 201, {
    user: {
      id: userId,
      email,
      role,
      institutionId,
      invitationSent: true,
      relationships: provision.data,
    },
  });
});
