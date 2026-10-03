import process from 'node:process';
import puppeteer from 'puppeteer';

const frontendUrl = process.env.SKILLTOSS_FRONTEND_URL ?? 'http://127.0.0.1:5173';
const password = process.env.SKILLTOSS_TEST_USER_PASSWORD;
const smokeDate = process.env.SKILLTOSS_ATTENDANCE_SMOKE_DATE ?? '2099-12-31';
if (!password) throw new Error('SKILLTOSS_TEST_USER_PASSWORD is required.');

const sessionKey = 'skill-toss-django-session-v1';
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const waitForPath = (page, path) => page.waitForFunction((expected) => location.pathname === expected, { timeout: 20_000 }, path);

async function login(page, email, path) {
  await page.goto(`${frontendUrl}/login`, { waitUntil: 'domcontentloaded' });
  await page.type('#email', email);
  await page.type('#password', password);
  await Promise.all([page.click('button[type="submit"]'), waitForPath(page, path)]);
}

async function api(page, path) {
  return page.evaluate(async (target, key) => {
    const session = JSON.parse(sessionStorage.getItem(key));
    const response = await fetch(`http://127.0.0.1:8000${target}`, { headers: { Authorization: `Bearer ${session.access}` } });
    return { status: response.status, body: await response.json() };
  }, path, sessionKey);
}

const browser = await puppeteer.launch({ headless: true });
try {
  const teacher = await browser.newPage();
  teacher.on('response', async (response) => {
    if (response.url().includes('/api/attendance-') && response.status() >= 400) {
      console.error(`Attendance API ${response.status()}: ${await response.text()}`);
    }
  });
  await login(teacher, 'teacher@skilltoss.test', '/teacher');
  await teacher.goto(`${frontendUrl}/teacher/batches`, { waitUntil: 'domcontentloaded' });
  await teacher.waitForFunction(() => document.body.textContent?.includes('CSE Development A'));
  await teacher.goto(`${frontendUrl}/teacher/attendance`, { waitUntil: 'domcontentloaded' });
  await teacher.waitForFunction(() => document.body.textContent?.includes('SkillToss Student'));
  await teacher.$eval('input[type="date"]', (input, value) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    setter.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, smokeDate);
  await teacher.evaluate(() => {
    const absent = [...document.querySelectorAll('button')].find((button) => button.textContent?.trim() === 'absent');
    if (!absent) throw new Error('Attendance status control was not rendered.');
    absent.click();
  });
  await teacher.evaluate(() => {
    const save = [...document.querySelectorAll('button')].find((button) => button.textContent?.includes('Save Attendance'));
    if (!save || save.disabled) throw new Error('Attendance save was unavailable.');
    save.click();
  });
  await teacher.waitForFunction(() => document.body.textContent?.includes('Attendance updated'), { timeout: 20_000 });
  const teacherRecords = await api(teacher, '/api/attendance-records/');
  const marked = teacherRecords.body.find((item) => item.status === 'absent');
  assert(marked, 'Teacher browser action did not create an absent record.');
  await teacher.close();

  const student = await browser.newPage();
  await login(student, 'student@skilltoss.test', '/student');
  await student.goto(`${frontendUrl}/student/attendance`, { waitUntil: 'domcontentloaded' });
  await student.waitForFunction(() => document.body.textContent?.includes('Attendance across subjects'));
  const studentMe = await api(student, '/api/auth/me/');
  const studentRecords = await api(student, '/api/attendance-records/');
  assert(studentRecords.status === 200 && studentRecords.body.every((item) => item.student === studentMe.body.id), 'Student received another student\'s attendance.');
  if (process.env.SKILLTOSS_UNRELATED_RECORD_ID) {
    const unrelatedStudent = await api(student, `/api/attendance-records/${process.env.SKILLTOSS_UNRELATED_RECORD_ID}/`);
    assert(unrelatedStudent.status === 404, 'Student could access another student\'s attendance record.');
  }
  await student.close();

  const parent = await browser.newPage();
  await login(parent, 'parent@skilltoss.test', '/student');
  await parent.goto(`${frontendUrl}/student/attendance`, { waitUntil: 'domcontentloaded' });
  await parent.waitForFunction(() => document.body.textContent?.includes('Read only'));
  const parentRecords = await api(parent, '/api/attendance-records/');
  assert(parentRecords.status === 200 && parentRecords.body.every((item) => item.student === studentMe.body.id), 'Parent received unrelated child attendance.');
  if (process.env.SKILLTOSS_UNRELATED_RECORD_ID) {
    const unrelatedParent = await api(parent, `/api/attendance-records/${process.env.SKILLTOSS_UNRELATED_RECORD_ID}/`);
    assert(unrelatedParent.status === 404, 'Parent could access unrelated child attendance.');
  }
  await parent.close();

  for (const [email, portal, expectedBatches, expectedAttendance] of [
    ['admin@skilltoss.test', '/admin', true, true],
    ['productadmin@skilltoss.test', '/product-admin', false, false],
  ]) {
    const page = await browser.newPage();
    await login(page, email, portal);
    const batches = await api(page, '/api/batches/');
    const records = await api(page, '/api/attendance-records/');
    assert(batches.status === 200 && (expectedBatches ? batches.body.length > 0 : batches.body.length === 0), `${email} batch scope was incorrect.`);
    assert(records.status === 200 && (expectedAttendance ? records.body.length > 0 : records.body.length === 0), `${email} attendance scope was incorrect.`);
    await page.close();
  }

  console.log(`PASS: Django academic/batch scopes and browser attendance write for ${smokeDate}.`);
} finally {
  await browser.close();
}
