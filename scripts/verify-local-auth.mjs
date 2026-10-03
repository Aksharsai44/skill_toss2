import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const anonKey = process.env.SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const host = supabaseUrl ? new URL(supabaseUrl).hostname : '';
const verifySeededAccounts = process.env.SKILLTOSS_VERIFY_SEEDED === 'true';
const verifyTarget = process.env.SKILLTOSS_VERIFY_TARGET ?? 'local';

if (!supabaseUrl || !anonKey || !serviceRoleKey) {
  throw new Error('Set SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY from `npx supabase status`.');
}
const isLocal = host === '127.0.0.1' || host === 'localhost';
if (verifyTarget === 'local' && !isLocal) {
  throw new Error(`Refusing local verification against non-local Supabase host: ${host}`);
}
if (verifyTarget === 'staging') {
  const expectedProjectRef = process.env.SKILLTOSS_STAGING_PROJECT_REF;
  const actualProjectRef = host.split('.')[0];
  if (
    isLocal
    || !verifySeededAccounts
    || process.env.SKILLTOSS_ALLOW_STAGING_VERIFY !== 'true'
    || !expectedProjectRef
    || actualProjectRef !== expectedProjectRef
  ) {
    throw new Error(
      'Staging verification requires seeded-account mode, SKILLTOSS_ALLOW_STAGING_VERIFY=true, and an exact SKILLTOSS_STAGING_PROJECT_REF match.',
    );
  }
}
if (verifyTarget !== 'local' && verifyTarget !== 'staging') {
  throw new Error(`Unsupported verification target: ${verifyTarget}`);
}

const runId = randomUUID();
const password = verifySeededAccounts
  ? process.env.SKILLTOSS_SEED_PASSWORD
  : `LocalOnly-${randomUUID()}-aA1!`;
if (!password) throw new Error('SKILLTOSS_SEED_PASSWORD is required when verifying seeded accounts.');
const roles = [
  ['product_admin', '/product-admin'],
  ['super_admin', '/super-admin'],
  ['admin', '/admin'],
  ['teacher', '/teacher'],
  ['student', '/student'],
  ['parent', '/student'],
];
const seededEmails = {
  product_admin: 'productadmin@skilltoss.test',
  super_admin: 'superadmin@skilltoss.test',
  admin: 'admin@skilltoss.test',
  teacher: 'teacher@skilltoss.test',
  student: 'student@skilltoss.test',
  parent: 'parent@skilltoss.test',
};
const service = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const createdUserIds = [];
let institutionId;
let vite;
let chrome;
let chromeProfile;
let accounts = [];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function client(options = {}) {
  return createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false, ...options },
  });
}

async function queryRows(auth, table, columns, filters = []) {
  let query = auth.from(table).select(columns);
  for (const [column, value] of filters) query = query.eq(column, value);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

async function verifySeededRls(accountsByRole) {
  const seedInstitution = '91000000-0000-4000-8000-000000000001';
  const seedBatch = '91000000-0000-4000-8000-000000000005';
  const seedStudent = '91000000-0000-4000-8000-000000000007';
  const transient = {
    institution: randomUUID(), department: randomUUID(), course: randomUUID(),
    crossTenantBatch: randomUUID(), unrelatedBatch: randomUUID(), unrelatedStudent: randomUUID(),
  };
  try {
    let result = await service.from('institutions').insert({ id: transient.institution, name: 'Ephemeral RLS Tenant', code: `RLS-${runId}` });
    if (result.error) throw result.error;
    result = await service.from('departments').insert([
      { id: transient.department, institution_id: transient.institution, name: 'Ephemeral Department', code: 'RLS' },
    ]);
    if (result.error) throw result.error;
    result = await service.from('academic_courses').insert({
      id: transient.course, institution_id: transient.institution, department_id: transient.department,
      code: 'RLS-COURSE', title: 'Ephemeral RLS Course',
    });
    if (result.error) throw result.error;
    result = await service.from('batches').insert({
      id: transient.crossTenantBatch, institution_id: transient.institution,
      academic_course_id: transient.course, name: 'Ephemeral Cross-Tenant Batch',
    });
    if (result.error) throw result.error;
    result = await service.from('batches').insert({
      id: transient.unrelatedBatch, institution_id: seedInstitution,
      academic_course_id: '91000000-0000-4000-8000-000000000003', name: `Ephemeral Unrelated ${runId}`,
    });
    if (result.error) throw result.error;
    result = await service.from('students').insert({
      id: transient.unrelatedStudent, institution_id: seedInstitution, profile_id: null,
      roll_no: `RLS-${runId}`, is_active: true,
    });
    if (result.error) throw result.error;

    const clients = {};
    for (const [role] of roles) {
      clients[role] = client();
      const { error } = await clients[role].auth.signInWithPassword({ email: accountsByRole[role].email, password });
      if (error) throw error;
    }

    assert((await queryRows(clients.teacher, 'batches', 'id', [['id', seedBatch]])).length === 1, 'teacher cannot read assigned batch');
    assert((await queryRows(clients.teacher, 'batches', 'id', [['id', transient.unrelatedBatch]])).length === 0, 'teacher can read unrelated batch');
    assert((await queryRows(clients.student, 'students', 'id', [['id', seedStudent]])).length === 1, 'student cannot read own identity');
    assert((await queryRows(clients.student, 'students', 'id', [['id', transient.unrelatedStudent]])).length === 0, 'student can read another student');
    assert((await queryRows(clients.student, 'attendance_records', 'id', [['id', '91000000-0000-4000-8000-00000000000c']])).length === 1, 'student cannot read own attendance');
    assert((await queryRows(clients.student, 'assignments', 'id', [['id', '91000000-0000-4000-8000-00000000000d']])).length === 1, 'student cannot read assigned work');
    assert((await queryRows(clients.student, 'assignment_submissions', 'id', [['id', '91000000-0000-4000-8000-00000000000e']])).length === 1, 'student cannot read own submission');
    assert((await queryRows(clients.student, 'daily_tasks', 'id', [['id', '91000000-0000-4000-8000-000000000010']])).length === 1, 'student cannot read own tracker item');
    assert((await queryRows(clients.parent, 'students', 'id', [['id', seedStudent]])).length === 1, 'parent cannot read linked child');
    assert((await queryRows(clients.parent, 'students', 'id', [['id', transient.unrelatedStudent]])).length === 0, 'parent can read unrelated child');
    assert((await queryRows(clients.admin, 'batches', 'id', [['id', seedBatch]])).length === 1, 'admin cannot read own tenant batch');
    assert((await queryRows(clients.admin, 'batches', 'id', [['id', transient.crossTenantBatch]])).length === 0, 'admin can read cross-tenant batch');
    assert((await queryRows(clients.super_admin, 'batches', 'id', [['id', transient.crossTenantBatch]])).length === 0, 'super admin exceeded current tenant contract');
    assert((await queryRows(clients.product_admin, 'institutions', 'id', [['id', seedInstitution]])).length === 1, 'product admin cannot read platform institution metadata');
    assert((await queryRows(clients.product_admin, 'batches', 'id', [['id', seedBatch]])).length === 0, 'product admin can read educational records');
    for (const auth of Object.values(clients)) await auth.auth.signOut();
  } finally {
    await service.from('students').delete().eq('id', transient.unrelatedStudent);
    await service.from('batches').delete().eq('id', transient.unrelatedBatch);
    await service.from('batches').delete().eq('id', transient.crossTenantBatch);
    await service.from('academic_courses').delete().eq('id', transient.course);
    await service.from('departments').delete().eq('id', transient.department);
    await service.from('institutions').delete().eq('id', transient.institution);
  }
}

async function waitForServer(url, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // Vite is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

class DevToolsPage {
  constructor(socket) {
    this.socket = socket;
    this.nextId = 1;
    this.pending = new Map();
    socket.addEventListener('message', ({ data }) => {
      const message = JSON.parse(data);
      if (!message.id) return;
      const callback = this.pending.get(message.id);
      if (!callback) return;
      this.pending.delete(message.id);
      if (message.error) callback.reject(new Error(message.error.message));
      else callback.resolve(message.result);
    });
  }

  send(method, params = {}) {
    const id = this.nextId++;
    this.socket.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));
  }

  async evaluate(expression) {
    const result = await this.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
    return result.result.value;
  }

  async waitFor(expression, timeoutMs = 15_000) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      if (await this.evaluate(expression)) return;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new Error(`Browser condition timed out: ${expression}`);
  }
}

async function openDevToolsPage(debugPort, url) {
  const target = await fetch(`http://127.0.0.1:${debugPort}/json/new?${encodeURIComponent(url)}`, { method: 'PUT' }).then((response) => response.json());
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });
  const page = new DevToolsPage(socket);
  await page.send('Runtime.enable');
  await page.waitFor("document.readyState === 'complete'");
  return { page, socket, targetId: target.id };
}

try {
  if (verifySeededAccounts) {
    const { data, error } = await service.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (error) throw error;
    for (const [role, route] of roles) {
      const email = seededEmails[role];
      const user = data.users.find((candidate) => candidate.email?.toLowerCase() === email);
      if (!user) throw new Error(`Seeded Auth user not found: ${email}`);
      accounts.push({ id: user.id, email, role, route });
    }
  } else {
    const { data: institution, error: institutionError } = await service
      .from('institutions')
      .insert({ name: `Local Auth Check ${runId}`, code: `AUTH-${runId}` })
      .select('id')
      .single();
    if (institutionError) throw institutionError;
    institutionId = institution.id;

    for (const [role, route] of roles) {
      const email = `${role.replaceAll('_', '-')}-${runId}@auth-check.test`;
      const { data, error } = await service.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { role: 'super_admin', institution_id: randomUUID() },
      });
      if (error || !data.user) throw error ?? new Error(`Could not create ${role}`);
      createdUserIds.push(data.user.id);

      const { data: provisioned, error: provisionedError } = await service
        .from('profiles')
        .select('role, institution_id, is_active')
        .eq('id', data.user.id)
        .single();
      if (provisionedError) throw provisionedError;
      assert(
        provisioned.role === 'student' && provisioned.institution_id === null && provisioned.is_active === false,
        `signup metadata influenced the ${role} authoritative profile`,
      );

      const { error: profileError } = await service
        .from('profiles')
        .update({
          role,
          institution_id: role === 'product_admin' ? null : institutionId,
          full_name: `Local ${role}`,
          is_active: true,
        })
        .eq('id', data.user.id);
      if (profileError) throw profileError;
      accounts.push({ id: data.user.id, email, role, route });
    }
  }

  for (const account of accounts) {
    const auth = client();
    const { data, error } = await auth.auth.signInWithPassword({ email: account.email, password });
    if (error || !data.session) throw error ?? new Error(`No session for ${account.role}`);
    assert(data.user.id === account.id, `${account.role} did not authenticate as its expected UUID`);

    const { data: profile, error: profileError } = await auth
      .from('profiles')
      .select('id, role, is_active')
      .eq('id', account.id)
      .single();
    if (profileError) throw profileError;
    assert(profile.id === account.id && profile.role === account.role && profile.is_active, `wrong profile for ${account.role}`);
    await auth.auth.signOut();
  }

  if (verifySeededAccounts) {
    await verifySeededRls(Object.fromEntries(accounts.map((account) => [account.role, account])));
  }

  const invalid = client();
  assert(
    (await invalid.auth.signInWithPassword({ email: accounts[0].email, password: 'incorrect-password' })).error,
    'incorrect password was accepted',
  );
  assert(
    (await invalid.auth.signInWithPassword({ email: `missing-${runId}@auth-check.test`, password })).error,
    'nonexistent account was accepted',
  );

  const storageState = new Map();
  const storage = {
    getItem: (key) => storageState.get(key) ?? null,
    setItem: (key, value) => storageState.set(key, value),
    removeItem: (key) => storageState.delete(key),
  };
  const firstClient = client({ persistSession: true, storage });
  const { data: firstLogin, error: firstLoginError } = await firstClient.auth.signInWithPassword({
    email: accounts[4].email,
    password,
  });
  if (firstLoginError || !firstLogin.session) throw firstLoginError ?? new Error('session login failed');
  const restoredClient = client({ persistSession: true, storage });
  assert((await restoredClient.auth.getSession()).data.session?.user.id === accounts[4].id, 'session was not restored');
  assert((await restoredClient.auth.refreshSession()).data.session?.user.id === accounts[4].id, 'token refresh failed');
  await restoredClient.auth.signOut();
  assert((await restoredClient.auth.getSession()).data.session === null, 'logout did not clear the session');

  const port = 4179;
  const baseUrl = `http://127.0.0.1:${port}`;
  vite = spawn(process.execPath, [join('node_modules', 'vite', 'bin', 'vite.js'), '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
    env: { ...process.env, VITE_SUPABASE_URL: supabaseUrl, VITE_SUPABASE_ANON_KEY: anonKey },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  await waitForServer(baseUrl);
  const chromeCandidates = [
    process.env.CHROME_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
  ].filter(Boolean);
  const chromePath = chromeCandidates.find((candidate) => existsSync(candidate));
  if (!chromePath) throw new Error('Chrome was not found. Set CHROME_PATH to run browser routing checks.');
  const debugPort = 9339;
  chromeProfile = mkdtempSync(join(tmpdir(), 'skilltoss-auth-check-'));
  chrome = spawn(chromePath, [
    '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    `--remote-debugging-port=${debugPort}`, `--user-data-dir=${chromeProfile}`, 'about:blank',
  ], { stdio: 'ignore' });
  await waitForServer(`http://127.0.0.1:${debugPort}/json/version`);

  for (const account of accounts) {
    const { page, socket, targetId } = await openDevToolsPage(debugPort, `${baseUrl}/login`);
    await page.waitFor(`window.location.origin === ${JSON.stringify(baseUrl)}`);
    await page.evaluate("localStorage.clear(); sessionStorage.clear(); window.location.replace('/login')");
    await page.waitFor("Boolean(document.querySelector('#email') && document.querySelector('#password'))");
    await page.evaluate(`(() => {
      const setValue = (selector, value) => {
        const input = document.querySelector(selector);
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, value);
        input.dispatchEvent(new Event('input', { bubbles: true }));
      };
      setValue('#email', ${JSON.stringify(account.email)});
      setValue('#password', ${JSON.stringify(password)});
      document.querySelector('button[type="submit"]').click();
    })()`);
    await page.waitFor(`window.location.pathname === ${JSON.stringify(account.route)}`);

    const forbiddenRoute = account.role === 'teacher'
      ? '/admin'
      : account.role === 'student'
        ? '/teacher'
        : account.role === 'parent'
          ? '/admin'
          : null;
    if (forbiddenRoute) {
      await page.evaluate(`window.location.assign(${JSON.stringify(forbiddenRoute)})`);
      await page.waitFor(`window.location.pathname === ${JSON.stringify(account.route)}`);
    }
    if (account.role === 'student') {
      await page.evaluate(`(() => {
        const key = Object.keys(localStorage).find((item) => item.startsWith('sb-') && item.endsWith('-auth-token'));
        if (!key) throw new Error('Supabase session storage key not found');
        const expired = JSON.parse(localStorage.getItem(key));
        expired.expires_at = 1;
        expired.access_token = 'expired-access-token';
        expired.refresh_token = 'invalid-refresh-token';
        localStorage.setItem(key, JSON.stringify(expired));
        window.location.replace('/student');
      })()`);
      await page.waitFor("window.location.pathname === '/login'");
    }
    socket.close();
    await fetch(`http://127.0.0.1:${debugPort}/json/close/${targetId}`);
  }

  console.log('PASS: six-role login, profile authority, session restore/refresh/logout, expired session, invalid login, role routing, and forbidden routing');
} finally {
  if (chrome?.exitCode === null) {
    chrome.kill();
    await new Promise((resolve) => chrome.once('exit', resolve));
  }
  if (chromeProfile) {
    try { rmSync(chromeProfile, { recursive: true, force: true }); } catch { /* OS cleanup will remove temp data later. */ }
  }
  if (vite) {
    if (vite.exitCode === null) {
      vite.kill();
      await new Promise((resolve) => vite.once('exit', resolve));
    }
  }
  for (const userId of createdUserIds.reverse()) {
    await service.auth.admin.deleteUser(userId).catch(() => undefined);
  }
  if (institutionId) await service.from('institutions').delete().eq('id', institutionId);
}
