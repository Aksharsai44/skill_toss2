import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { join } from 'node:path';
import process from 'node:process';
import puppeteer from 'puppeteer';
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const publicKey = process.env.SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const seedPassword = process.env.SKILLTOSS_SEED_PASSWORD;
const projectRef = process.env.SKILLTOSS_STAGING_PROJECT_REF;
const verifyTarget = process.env.SKILLTOSS_VERIFY_TARGET;
const origin = 'http://127.0.0.1:4179';
if (!url || !publicKey || !serviceKey || !seedPassword) {
  throw new Error('Missing provisioning verification credentials.');
}
const apiHost = new URL(url).hostname;
const isAllowedStaging = verifyTarget === 'staging'
  && process.env.SKILLTOSS_ALLOW_STAGING_VERIFY === 'true'
  && projectRef
  && apiHost === `${projectRef}.supabase.co`;
const isAllowedLocal = verifyTarget === 'local'
  && process.env.SKILLTOSS_ALLOW_LOCAL_VERIFY === 'true'
  && (apiHost === '127.0.0.1' || apiHost === 'localhost');
if (!isAllowedStaging && !isAllowedLocal) {
  throw new Error('Refusing provisioning verification without an exact, explicitly enabled local or staging target.');
}

const ids = {
  institution: '91000000-0000-4000-8000-000000000001',
  batch: '91000000-0000-4000-8000-000000000005',
  subject: '91000000-0000-4000-8000-000000000004',
};
const runId = randomUUID().slice(0, 8);
const accounts = {
  teacher: { email: `ui-teacher-${runId}@example.com`, name: `UI Teacher ${runId}`, password: `Teacher-${randomUUID()}-aA1!` },
  student: { email: `ui-student-${runId}@example.com`, name: `UI Student ${runId}`, password: `Student-${randomUUID()}-aA1!` },
  parent: { email: `ui-parent-${runId}@example.com`, name: `UI Parent ${runId}`, password: `Parent-${randomUUID()}-aA1!` },
};
const expectedRoutes = { teacher: '/teacher', student: '/student', parent: '/student' };
const service = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const client = () => createClient(url, publicKey, { auth: { persistSession: false, autoRefreshToken: false } });
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const createdIds = [];
let server;
let browser;

async function findUser(email) {
  for (let page = 1; page <= 10; page += 1) {
    const result = await service.auth.admin.listUsers({ page, perPage: 100 });
    if (result.error) throw result.error;
    const match = result.data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase());
    if (match) return match;
    if (result.data.users.length < 100) return null;
  }
  throw new Error(`Auth lookup exceeded the safe page limit for ${email}.`);
}

async function cleanupUser(userId) {
  const teacher = await service.from('teachers').select('id').eq('profile_id', userId).maybeSingle();
  const student = await service.from('students').select('id').eq('profile_id', userId).maybeSingle();
  await service.from('parent_student_links').delete().eq('parent_profile_id', userId);
  if (student.data?.id) {
    await service.from('parent_student_links').delete().eq('student_id', student.data.id);
    await service.from('student_enrollments').delete().eq('student_id', student.data.id);
    await service.from('students').delete().eq('id', student.data.id);
  }
  if (teacher.data?.id) {
    await service.from('teacher_batch_assignments').delete().eq('teacher_id', teacher.data.id);
    await service.from('teachers').delete().eq('id', teacher.data.id);
  }
  await service.auth.admin.deleteUser(userId);
}

async function removeInterruptedFixtures() {
  for (let page = 1; page <= 10; page += 1) {
    const result = await service.auth.admin.listUsers({ page, perPage: 100 });
    if (result.error) throw result.error;
    const stale = result.data.users.filter((user) => /^ui-(teacher|student|parent)-.*@example\.com$/i.test(user.email ?? ''));
    for (const user of stale) await cleanupUser(user.id);
    if (result.data.users.length < 100) break;
  }
}

async function waitForServer() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try { if ((await fetch(origin)).ok) return; } catch { /* Vite is still starting. */ }
    await sleep(500);
  }
  throw new Error('Timed out waiting for the local verification UI.');
}

async function replaceValue(page, selector, value) {
  await page.waitForSelector(selector, { visible: true });
  await page.$eval(selector, (element) => { element.value = ''; });
  await page.type(selector, value);
}

async function selectOption(page, selector, value) {
  await page.waitForFunction(
    (targetSelector, targetValue) => [...document.querySelectorAll(`${targetSelector} option`)].some((option) => option.value === targetValue),
    { timeout: 30000 }, selector, value,
  );
  const selected = await page.select(selector, value);
  assert(selected.includes(value), `Could not select ${value} in ${selector}.`);
}

async function login(page, email, password, expectedRoute) {
  await page.goto(`${origin}/login`, { waitUntil: 'networkidle0' });
  await replaceValue(page, '#email', email);
  await replaceValue(page, '#password', password);
  await Promise.all([
    page.waitForFunction((route) => window.location.pathname === route, { timeout: 30000 }, expectedRoute),
    page.click('button[type="submit"]'),
  ]);
}

async function logoutBrowser(page) {
  await page.evaluate(async () => {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('sb-') && key.endsWith('-auth-token')) localStorage.removeItem(key);
    }
    sessionStorage.clear();
  });
  await page.goto(`${origin}/login`, { waitUntil: 'networkidle0' });
}

async function submitProvisionForm(page, role, account, extra = {}) {
  await page.goto(`${origin}/admin/users/new`, { waitUntil: 'networkidle0' });
  assert(new URL(page.url()).pathname === '/admin/users/new', `Admin could not reach Add User for ${role}.`);
  await replaceValue(page, '#provision-name', account.name);
  await replaceValue(page, '#provision-email', account.email);
  await selectOption(page, '#provision-role', role);
  if (role === 'teacher') {
    await replaceValue(page, '#teacher-code', `EMP-${runId}`);
    await selectOption(page, '#teacher-batch', ids.batch);
    await page.waitForSelector('#teacher-subject');
    await selectOption(page, '#teacher-subject', ids.subject);
  }
  if (role === 'student') {
    await replaceValue(page, '#student-roll', `ROLL-${runId}`);
    await selectOption(page, '#student-batch', ids.batch);
  }
  if (role === 'parent') {
    await page.waitForFunction((studentId) => [...document.querySelectorAll('#parent-child option')].some((option) => option.value === studentId), { timeout: 30000 }, extra.studentId);
    await selectOption(page, '#parent-child', extra.studentId);
    await replaceValue(page, '#parent-relationship', 'Guardian');
  }
  await page.click('button[type="submit"]');
  await page.waitForFunction((email) => (
    document.querySelector('[role="status"]')?.textContent?.includes(email)
    || Boolean(document.querySelector('[role="alert"]'))
  ), { timeout: 30000 }, account.email);
  const alert = await page.$eval('[role="alert"]', (element) => element.textContent).catch(() => null);
  if (alert) throw new Error(`${role} UI provisioning failed: ${alert.trim()}`);
}

async function verifyDatabaseContract(role, account) {
  const user = await findUser(account.email);
  assert(user, `No Auth user exists for the UI-created ${role}.`);
  createdIds.push(user.id);
  const profile = await service.from('profiles').select('id,email,role,institution_id,is_active,created_at').eq('id', user.id).single();
  assert(!profile.error, `${role} profile lookup failed: ${profile.error?.message}`);
  assert(profile.data.id === user.id, `${role} Auth/profile UUIDs differ.`);
  assert(profile.data.email === account.email && profile.data.role === role, `${role} profile identity or role is wrong.`);
  assert(profile.data.institution_id === ids.institution && profile.data.is_active, `${role} tenant or activation is wrong.`);
  assert(Boolean(profile.data.created_at), `${role} profile has no created_at.`);
  account.id = user.id;
  if (role === 'teacher' || role === 'student') {
    const identity = await service.from(role === 'teacher' ? 'teachers' : 'students').select('id,profile_id').eq('profile_id', user.id).single();
    assert(!identity.error && identity.data.profile_id === user.id, `${role} identity does not match the profile UUID.`);
    account.entityId = identity.data.id;
  }
}

async function setPasswordThroughUi(page, role, account) {
  const link = await service.auth.admin.generateLink({
    type: 'invite', email: account.email,
    options: { redirectTo: `${origin}/login?mode=setup` },
  });
  assert(!link.error && link.data?.properties?.action_link, `Could not generate ${role} setup link: ${link.error?.message ?? 'missing link'}`);
  await page.goto(link.data.properties.action_link, { waitUntil: 'networkidle0' });
  await page.waitForSelector('#recovery-password', { visible: true, timeout: 30000 });
  await replaceValue(page, '#recovery-password', account.password);
  await replaceValue(page, '#recovery-confirmation', account.password);
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => document.body.textContent?.includes('Password updated.'), { timeout: 30000 });
  await login(page, account.email, account.password, expectedRoutes[role]);
  await logoutBrowser(page);
}

async function signIn(email, password = seedPassword) {
  const auth = client();
  const result = await auth.auth.signInWithPassword({ email, password });
  if (result.error || !result.data.session) throw result.error ?? new Error(`No session for ${email}.`);
  return { auth, token: result.data.session.access_token };
}

async function invoke(token, body) {
  const response = await fetch(`${url}/functions/v1/provision-user`, {
    method: 'POST',
    headers: { apikey: publicKey, authorization: `Bearer ${token}`, origin, 'content-type': 'application/json' },
    body: JSON.stringify({ ...body, redirectTo: `${origin}/login?mode=setup` }),
  });
  return { status: response.status, body: await response.json() };
}

try {
  await removeInterruptedFixtures();
  server = spawn(process.execPath, [join(process.cwd(), 'node_modules', 'vite', 'bin', 'vite.js'), '--host', '127.0.0.1', '--port', '4179'], {
    cwd: process.cwd(),
    env: { ...process.env, VITE_SUPABASE_URL: url, VITE_SUPABASE_PUBLISHABLE_KEY: publicKey },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let serverError = '';
  server.stderr.on('data', (chunk) => { serverError += chunk.toString(); });
  await waitForServer();
  browser = await puppeteer.launch({ headless: true, channel: 'chrome' });
  const page = await browser.newPage();
  page.on('console', (message) => { if (message.type() === 'error') process.stderr.write(`Browser console: ${message.text()}\n`); });

  const studentSession = await signIn('student@skilltoss.test');
  const parentSession = await signIn('parent@skilltoss.test');
  const teacherSession = await signIn('teacher@skilltoss.test');
  const adminSession = await signIn('admin@skilltoss.test');
  const baseRequest = { fullName: 'Forbidden User', email: `forbidden-${randomUUID()}@example.com`, institutionId: ids.institution, role: 'teacher' };
  assert((await invoke(studentSession.token, baseRequest)).status === 403, 'Student provisioning attempt was not forbidden.');
  assert((await invoke(parentSession.token, baseRequest)).status === 403, 'Parent provisioning attempt was not forbidden.');
  assert((await invoke(teacherSession.token, { ...baseRequest, role: 'admin' })).status === 403, 'Teacher admin-provisioning attempt was not forbidden.');
  assert((await invoke(adminSession.token, { ...baseRequest, role: 'super_admin' })).status === 403, 'Institution Admin created a Super Admin.');
  assert((await invoke(adminSession.token, { ...baseRequest, institutionId: randomUUID() })).status === 403, 'Institution Admin crossed tenant scope.');
  await Promise.all([studentSession.auth.auth.signOut(), parentSession.auth.auth.signOut(), teacherSession.auth.auth.signOut(), adminSession.auth.auth.signOut()]);
  await login(page, 'teacher@skilltoss.test', seedPassword, '/teacher');
  await page.evaluate(() => localStorage.setItem('skill-toss-user-role', 'admin'));
  await page.goto(`${origin}/admin/users/new`, { waitUntil: 'networkidle0' });
  await page.waitForFunction(() => window.location.pathname === '/teacher', { timeout: 30000 });
  assert(new URL(page.url()).pathname === '/teacher', 'Browser role tampering bypassed protected routing.');
  await logoutBrowser(page);
  console.log('PASS: deployed role, elevated-role, cross-tenant, and browser-tampering denials');

  await login(page, 'admin@skilltoss.test', seedPassword, '/admin');
  await submitProvisionForm(page, 'teacher', accounts.teacher);
  await verifyDatabaseContract('teacher', accounts.teacher);
  await submitProvisionForm(page, 'student', accounts.student);
  await verifyDatabaseContract('student', accounts.student);
  await page.reload({ waitUntil: 'networkidle0' });
  await submitProvisionForm(page, 'parent', accounts.parent, { studentId: accounts.student.entityId });
  await verifyDatabaseContract('parent', accounts.parent);

  const teacherAssignment = await service.from('teacher_batch_assignments').select('teacher_id,batch_id,subject_id').eq('teacher_id', accounts.teacher.entityId).eq('batch_id', ids.batch).eq('subject_id', ids.subject).single();
  assert(!teacherAssignment.error, `Teacher assignment was not created: ${teacherAssignment.error?.message}`);
  const studentEnrollment = await service.from('student_enrollments').select('student_id,batch_id,status').eq('student_id', accounts.student.entityId).eq('batch_id', ids.batch).single();
  assert(!studentEnrollment.error && studentEnrollment.data.status === 'active', `Student enrollment was not created: ${studentEnrollment.error?.message}`);
  const parentLink = await service.from('parent_student_links').select('parent_profile_id,student_id,relationship').eq('parent_profile_id', accounts.parent.id).eq('student_id', accounts.student.entityId).single();
  assert(!parentLink.error && parentLink.data.relationship === 'Guardian', `Parent relationship was not created: ${parentLink.error?.message}`);

  await logoutBrowser(page);
  for (const role of ['teacher', 'student', 'parent']) await setPasswordThroughUi(page, role, accounts[role]);

  const duplicateSession = await signIn('admin@skilltoss.test');
  assert([400, 409].includes((await invoke(duplicateSession.token, { ...baseRequest, email: accounts.teacher.email })).status), 'Duplicate email was accepted.');
  await duplicateSession.auth.auth.signOut();

  console.log('PASS: real Admin UI provisioning, Auth/profile UUID contract, Teacher/Student/Parent relationships, invite setup, role login routing, and denial cases');
} catch (error) {
  if (server && server.exitCode !== null) throw new Error(`${error.message}; Vite exited early: ${server.exitCode}`);
  throw error;
} finally {
  if (browser) await browser.close().catch(() => undefined);
  for (const userId of [...new Set(createdIds)].reverse()) {
    try { await cleanupUser(userId); } catch { /* Best-effort cleanup is followed by account discovery on the next run. */ }
  }
  if (server && server.exitCode === null) server.kill();
}
