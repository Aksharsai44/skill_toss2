import process from 'node:process';
import puppeteer from 'puppeteer';

const frontendUrl = process.env.SKILLTOSS_FRONTEND_URL ?? 'http://127.0.0.1:5173';
const uid = process.env.SKILLTOSS_INVITE_UID;
const token = process.env.SKILLTOSS_INVITE_TOKEN;
const password = process.env.SKILLTOSS_INVITE_PASSWORD;
if (!uid || !token || !password) throw new Error('Invite UID, token, and password are required.');

const browser = await puppeteer.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.goto(`${frontendUrl}/set-password?uid=${encodeURIComponent(uid)}&token=${encodeURIComponent(token)}`, { waitUntil: 'domcontentloaded' });
  await page.type('#link-new-password', password);
  await page.type('#link-confirm-password', password);
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => window.location.pathname === '/login' && document.body.textContent?.includes('Password set successfully'), { timeout: 20_000 });
  console.log('PASS: invitation link completed through the browser.');
} finally {
  await browser.close();
}
