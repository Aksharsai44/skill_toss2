import process from 'node:process';
import puppeteer from 'puppeteer';

const frontendUrl = process.env.SKILLTOSS_FRONTEND_URL ?? 'http://127.0.0.1:5173';
const password = process.env.SKILLTOSS_TEST_USER_PASSWORD;
if (!password) throw new Error('SKILLTOSS_TEST_USER_PASSWORD is required.');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function login(page, email, destination) {
  await page.goto(`${frontendUrl}/login`, { waitUntil: 'domcontentloaded' });
  await page.type('#email', email);
  await page.type('#password', password);
  await page.click('button[type="submit"]');
  await page.waitForFunction((path) => window.location.pathname === path, { timeout: 20_000 }, destination);
}

async function createUser(page, { name, email, role, configure }) {
  await page.type('#provision-name', name);
  await page.type('#provision-email', email);
  await page.select('#provision-role', role);
  if (configure) await configure(page);
  await page.click('button[type="submit"]');
  await page.waitForFunction((value) => document.body.textContent?.includes(`${value} was created successfully`), { timeout: 20_000 }, email);
  const rowText = await page.evaluate((value) => [...document.querySelectorAll('tbody tr')].find((row) => row.textContent?.includes(value))?.textContent ?? '', email);
  assert(rowText.includes('Pending Setup'), `${role} was not shown as Pending Setup`);
  assert(rowText.includes('Resend Invite'), `${role} did not show Resend Invite`);
  assert(!rowText.includes('Reactivate'), `${role} incorrectly showed Reactivate`);
}

const browser = await puppeteer.launch({ headless: true });
try {
  const adminPage = await browser.newPage();
  await login(adminPage, 'admin@skilltoss.test', '/admin');
  await adminPage.goto(`${frontendUrl}/admin/users/new`, { waitUntil: 'domcontentloaded' });
  await adminPage.waitForFunction(() => document.body.textContent?.includes('User Management'));

  await createUser(adminPage, {
    name: 'Browser Student', email: 'created-student-seed@browser.test', role: 'student',
    configure: async (page) => {
      const batch = await page.$eval('#provision-batch', (select) => [...select.options].find((option) => option.value)?.value ?? '');
      assert(batch, 'No authorized batch was available');
      await page.select('#provision-batch', batch);
    },
  });
  await createUser(adminPage, {
    name: 'Browser Teacher', email: 'created-teacher-seed@browser.test', role: 'teacher',
    configure: async (page) => {
      const batch = await page.$eval('#provision-batch', (select) => [...select.options].find((option) => option.value)?.value ?? '');
      assert(batch, 'No authorized batch was available');
      await page.select('#provision-batch', batch);
      await page.waitForSelector('#provision-subject');
      const subject = await page.$eval('#provision-subject', (select) => [...select.options].find((option) => option.value)?.value ?? '');
      assert(subject, 'No compatible subject was available');
      await page.select('#provision-subject', subject);
    },
  });
  await createUser(adminPage, {
    name: 'Browser Parent', email: 'created-parent-seed@browser.test', role: 'parent',
    configure: async (page) => {
      const student = await page.$eval('#provision-student', (select) => [...select.options].find((option) => option.value)?.value ?? '');
      assert(student, 'No authorized active student was available');
      await page.select('#provision-student', student);
      await page.type('#provision-relationship', 'Guardian');
    },
  });

  await adminPage.evaluate(() => {
    const row = [...document.querySelectorAll('tbody tr')].find((item) => item.textContent?.includes('created-parent-seed@browser.test'));
    const button = row && [...row.querySelectorAll('button')].find((item) => item.textContent?.includes('Resend Invite'));
    if (!button) throw new Error('Resend Invite action was unavailable');
    button.click();
  });
  await adminPage.waitForFunction(() => document.body.textContent?.includes('fresh setup invitation was generated'));

  await adminPage.type('#provision-name', 'Duplicate Student');
  await adminPage.type('#provision-email', 'created-student-seed@browser.test');
  await adminPage.select('#provision-role', 'student');
  await adminPage.$eval('#provision-email', (input) => input.form.requestSubmit());
  await adminPage.waitForFunction(() => document.body.textContent?.toLowerCase().includes('already exists'));

  const superPage = await browser.newPage();
  await login(superPage, 'superadmin@skilltoss.test', '/super-admin');
  await superPage.goto(`${frontendUrl}/super-admin/admins`, { waitUntil: 'domcontentloaded' });
  await superPage.waitForFunction(() => document.body.textContent?.includes('User Management'));
  await createUser(superPage, { name: 'Browser Admin', email: 'created-admin-seed@browser.test', role: 'admin' });

  console.log('PASS: Admin Student/Teacher/Parent and Super Admin Admin provisioning, Pending Setup display, scoped relationships, duplicate errors, and resend invite.');
} finally {
  await browser.close();
}
