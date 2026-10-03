import process from 'node:process';
import puppeteer from 'puppeteer';

const frontendUrl = process.env.SKILLTOSS_FRONTEND_URL ?? 'http://127.0.0.1:5173';
const password = process.env.SKILLTOSS_TEST_USER_PASSWORD;
const runId = process.env.SKILLTOSS_AUTH_SMOKE_ID;
if (!password) throw new Error('SKILLTOSS_TEST_USER_PASSWORD is required.');

const emailFor = (role) => runId
  ? `${role.replaceAll('_', '-')}-${runId}@browser.test`
  : `${role.replace('_', '')}@skilltoss.test`;

const accounts = [
  ['product_admin', emailFor('product_admin'), '/product-admin'],
  ['super_admin', emailFor('super_admin'), '/super-admin'],
  ['admin', emailFor('admin'), '/admin'],
  ['teacher', emailFor('teacher'), '/teacher'],
  ['student', emailFor('student'), '/student'],
  ['parent', emailFor('parent'), '/student'],
];
const sessionKey = 'skill-toss-django-session-v1';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function waitForPath(page, expected) {
  await page.waitForFunction((path) => window.location.pathname === path, { timeout: 20_000 }, expected);
}

async function login(page, email, expectedPath, loginPassword = password) {
  await page.goto(`${frontendUrl}/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#email');
  await page.type('#email', email);
  await page.type('#password', loginPassword);
  await Promise.all([
    page.click('button[type="submit"]'),
    waitForPath(page, expectedPath),
  ]);
  const stored = await page.evaluate((key) => JSON.parse(sessionStorage.getItem(key)), sessionKey);
  assert(stored && typeof stored.access === 'string' && typeof stored.refresh === 'string', `${email} did not store a JWT session`);
  assert(Object.keys(stored).sort().join(',') === 'access,refresh', `${email} stored non-token authority in its session`);
}

const browser = await puppeteer.launch({ headless: true });
try {
  const publicPage = await browser.newPage();
  await publicPage.goto(`${frontendUrl}/login`, { waitUntil: 'domcontentloaded' });
  await publicPage.type('#email', emailFor('teacher'));
  await publicPage.evaluate(() => [...document.querySelectorAll('button')].find((item) => item.textContent?.includes('Forgot password'))?.click());
  await publicPage.evaluate(() => [...document.querySelectorAll('button')].find((item) => item.textContent?.includes('Send reset link'))?.click());
  await publicPage.waitForFunction(() => document.body.textContent?.includes('If an account exists'));
  await publicPage.goto(`${frontendUrl}/reset-password?uid=invalid&token=invalid`, { waitUntil: 'domcontentloaded' });
  await publicPage.type('#link-new-password', 'Invalid-Link-Password-91!');
  await publicPage.type('#link-confirm-password', 'Invalid-Link-Password-91!');
  await publicPage.click('button[type="submit"]');
  await publicPage.waitForFunction(() => document.body.textContent?.includes('invalid or expired'));
  await publicPage.close();

  for (const [role, email, expectedPath] of accounts) {
    const page = await browser.newPage();
    await page.goto(frontendUrl, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    await login(page, email, expectedPath);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitForPath(page, expectedPath);

    const forbidden = role === 'teacher' ? '/admin'
      : role === 'student' ? '/teacher'
        : role === 'parent' ? '/admin'
          : role === 'admin' ? '/product-admin'
            : role === 'super_admin' ? '/product-admin'
              : '/super-admin';
    await page.evaluate((path) => {
      localStorage.setItem('skill-toss-role', 'product_admin');
      window.location.assign(path);
    }, forbidden);
    await waitForPath(page, expectedPath);

    if (role === 'student') {
      const oldAccess = await page.evaluate((key) => {
        const session = JSON.parse(sessionStorage.getItem(key));
        const access = session.access;
        session.access = 'expired-access-token';
        sessionStorage.setItem(key, JSON.stringify(session));
        return access;
      }, sessionKey);
      await page.reload({ waitUntil: 'domcontentloaded' });
      await waitForPath(page, expectedPath);
      const refreshedAccess = await page.evaluate((key) => JSON.parse(sessionStorage.getItem(key)).access, sessionKey);
      assert(refreshedAccess !== oldAccess && refreshedAccess !== 'expired-access-token', 'expired access token was not refreshed');

      await page.evaluate((key) => {
        sessionStorage.setItem(key, JSON.stringify({ access: 'invalid', refresh: 'invalid' }));
        window.location.reload();
      }, sessionKey);
      await waitForPath(page, '/login');
      assert(await page.evaluate((key) => sessionStorage.getItem(key) === null, sessionKey), 'invalid refresh token was not cleared');
    }

    if (role === 'teacher') {
      await page.click('button[aria-label="Open account menu"]');
      await page.evaluate(() => {
        const button = [...document.querySelectorAll('button')].find((item) => item.textContent?.includes('System Settings'));
        if (!button) throw new Error('System Settings button not found');
        button.click();
      });
      await page.waitForSelector('#account-current-password');
      await page.type('#account-current-password', 'incorrect-password');
      await page.type('#account-new-password', 'Browser-Changed-Password-86!');
      await page.type('#account-confirm-password', 'Browser-Changed-Password-86!');
      await page.$eval('#account-current-password', (input) => input.form.querySelector('button[type="submit"]').click());
      await page.waitForFunction(() => document.body.textContent?.includes('current password is incorrect'));
      await page.$eval('#account-current-password', (input) => { input.value = ''; input.dispatchEvent(new Event('input', { bubbles: true })); });
      await page.type('#account-current-password', password);
      await page.$eval('#account-current-password', (input) => input.form.querySelector('button[type="submit"]').click());
      await waitForPath(page, '/login');
      await login(page, email, expectedPath, 'Browser-Changed-Password-86!');
    }

    if (role === 'admin') {
      await page.goto(`${frontendUrl}/admin/users/new`, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => document.body.textContent?.includes('User Management'));
      await page.waitForFunction(
        (value) => document.body.textContent?.includes(value),
        { timeout: 20_000 },
        emailFor('teacher'),
      );

      for (const targetRole of ['teacher', 'student']) {
        const targetEmail = `created-${targetRole}-${runId ?? 'seed'}@browser.test`;
        await page.type('#provision-name', `Created ${targetRole}`);
        await page.type('#provision-email', targetEmail);
        await page.select('#provision-role', targetRole);
        await page.click('button[type="submit"]');
        await page.waitForFunction((value) => document.body.textContent?.includes(value), { timeout: 20_000 }, `${targetEmail} was created`);
      }
      const parentEmail = `created-parent-${runId ?? 'seed'}@browser.test`;
      await page.type('#provision-name', 'Created parent');
      await page.type('#provision-email', parentEmail);
      await page.select('#provision-role', 'parent');
      const studentValue = await page.$eval('#provision-student', (select) => [...select.options].find((option) => option.value)?.value ?? '');
      assert(studentValue, 'No active Django student was available for parent provisioning');
      await page.select('#provision-student', studentValue);
      await page.click('button[type="submit"]');
      await page.waitForFunction((value) => document.body.textContent?.includes(value), { timeout: 20_000 }, `${parentEmail} was created`);

      const teacherEmail = emailFor('teacher');
      await page.evaluate((value) => {
        const row = [...document.querySelectorAll('tbody tr')].find((item) => [...item.querySelectorAll('p')].some((text) => text.textContent === value));
        const button = row && [...row.querySelectorAll('button')].find((item) => item.textContent?.includes('Disable'));
        if (!button) throw new Error('Teacher disable button not found');
        button.click();
      }, teacherEmail);
      await page.waitForFunction((value) => {
        const row = [...document.querySelectorAll('tbody tr')].find((item) => [...item.querySelectorAll('p')].some((text) => text.textContent === value));
        return row?.textContent?.includes('Reactivate');
      }, { timeout: 20_000 }, teacherEmail);
      await page.evaluate((value) => {
        const row = [...document.querySelectorAll('tbody tr')].find((item) => [...item.querySelectorAll('p')].some((text) => text.textContent === value));
        const button = row && [...row.querySelectorAll('button')].find((item) => item.textContent?.includes('Reactivate'));
        if (!button) throw new Error('Teacher reactivate button not found');
        button.click();
      }, teacherEmail);
      await page.waitForFunction((value) => {
        const row = [...document.querySelectorAll('tbody tr')].find((item) => [...item.querySelectorAll('p')].some((text) => text.textContent === value));
        return row?.textContent?.includes('Disable');
      }, { timeout: 20_000 }, teacherEmail);

      let logoutCalled = false;
      page.on('request', (request) => {
        if (request.url().endsWith('/api/auth/logout/') && request.method() === 'POST') logoutCalled = true;
      });
      await page.evaluate(() => {
        const button = [...document.querySelectorAll('button')].find((item) => item.textContent?.includes('Sign Out'));
        if (!button) throw new Error('Sign Out button not found');
        button.click();
      });
      await waitForPath(page, '/login');
      assert(logoutCalled, 'backend logout endpoint was not called');
      assert(await page.evaluate((key) => sessionStorage.getItem(key) === null, sessionKey), 'logout did not clear tokens');
    }
    await page.close();
  }
  console.log('PASS: Django six-role auth, restore/refresh/logout, password request/change/error flows, role redirects, provisioning, and account status.');
} finally {
  await browser.close();
}
