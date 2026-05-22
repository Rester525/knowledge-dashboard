import { chromium } from 'playwright';

const URL = 'https://knowledge-dashboard-zeta.vercel.app';

async function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

async function run() {
  const browser = await chromium.launch({ headless: true });
  let passed = 0;
  function ok(msg) { passed++; console.log('  ✓ ' + msg); }
  function fail(msg) { console.log('  ✗ ' + msg); }

  // ── Main context: authenticated (guest mode) ──
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await context.addInitScript(() => localStorage.setItem('kd-auth', 'guest'));
  const page = await context.newPage();

  await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForSelector('#view-content .card', { timeout: 15000 });

  // ── Test 1: Navigate to Settings ──
  await page.click('.nav-item[data-view="settings"]');
  await wait(1000);
  const settingsTitle = await page.textContent('#view-title');
  if (settingsTitle === 'Settings') ok('Settings view title');
  else fail('Settings title: ' + settingsTitle);

  // ── Test 2: Settings renders theme cards ──
  const themeCards = await page.locator('.theme-card').count();
  if (themeCards === 3) ok('3 theme cards visible');
  else fail('Theme cards: ' + themeCards);

  // ── Test 3: Settings renders accent color swatches ──
  const colorSwatches = await page.locator('.color-swatch').count();
  if (colorSwatches === 10) ok('10 color swatches');
  else fail('Color swatches: ' + colorSwatches);

  // ── Test 4: Settings shows Export button ──
  const exportBtn = await page.locator('button:has-text("Export All Data")').count();
  if (exportBtn > 0) ok('Export button in settings');
  else fail('Export button missing');

  // ── Test 5: Click Retro theme card ──
  const retroCard = page.locator('.theme-card').nth(1);
  await retroCard.click();
  await wait(500);
  const hasRetro = await page.evaluate(() => document.documentElement.classList.contains('theme-retro'));
  if (hasRetro) ok('Retro theme applied');
  else fail('Retro theme not applied');

  // ── Test 6: Theme persists in localStorage ──
  const storedTheme = await page.evaluate(() => localStorage.getItem('kd-theme'));
  if (storedTheme === 'retro') ok('Theme saved to localStorage');
  else fail('Stored theme: ' + storedTheme);

  // ── Test 7: Click 8-Bit theme card ──
  const bitCard = page.locator('.theme-card').nth(2);
  await bitCard.click();
  await wait(500);
  const has8Bit = await page.evaluate(() => document.documentElement.classList.contains('theme-8bit'));
  if (has8Bit) ok('8-Bit theme applied');
  else fail('8-Bit theme not applied');

  // ── Test 8: Click Standard theme ──
  const stdCard = page.locator('.theme-card').first();
  await stdCard.click();
  await wait(500);
  const noTheme = await page.evaluate(() => !document.documentElement.classList.contains('theme-retro') && !document.documentElement.classList.contains('theme-8bit'));
  if (noTheme) ok('Standard theme applied (no theme class)');
  else fail('Standard theme not applied');

  // ── Test 9: Color swatch click toggles accent ──
  const greenSwatch = page.locator('.color-swatch').nth(1);
  await greenSwatch.click();
  await wait(300);
  const accentGreen = await page.evaluate(() => document.documentElement.classList.contains('accent-green'));
  if (accentGreen) ok('Accent green from settings');
  else fail('Accent green not applied');

  // ── Test 10: Ctrl+8 navigates to Settings ──
  await page.keyboard.press('Control+8');
  await wait(500);
  const sTitle = await page.textContent('#view-title');
  if (sTitle === 'Settings') ok('Ctrl+8 navigates to Settings');
  else fail('Ctrl+8 title: ' + sTitle);

  await context.close();

  // ── Login overlay tests: fresh context WITHOUT auto-auth ──
  const cleanContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const cleanPage = await cleanContext.newPage();

  await cleanPage.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
  await wait(2000);
  const overlayVisible = await cleanPage.locator('#login-overlay').isVisible();
  if (overlayVisible) ok('Login overlay visible on fresh load');
  else fail('Login overlay not visible on fresh load');

  // ── Test 12: "Continue as Guest" hides overlay ──
  await cleanPage.click('button:has-text("Continue as Guest")');
  await wait(1000);
  const overlayGone = await cleanPage.evaluate(() => document.getElementById('login-overlay').style.display === 'none');
  if (overlayGone) ok('Guest button hides overlay');
  else fail('Overlay visible after guest click');

  // ── Test 13: Sign In -> auth form -> toggle -> back to landing ──
  await cleanPage.evaluate(() => localStorage.removeItem('kd-auth'));
  await cleanPage.reload({ waitUntil: 'networkidle' });
  await wait(2000);

  await cleanPage.click('button:has-text("Sign In")');
  await wait(500);
  const authFormVisible = await cleanPage.locator('#login-auth-form').isVisible();
  if (authFormVisible) ok('Sign In shows auth form');
  else fail('Auth form not visible');

  // Toggle to sign-up
  await cleanPage.click('#auth-toggle-text span');
  await wait(300);
  const isSignUp = await cleanPage.evaluate(() => document.getElementById('login-auth-mode').dataset.mode === 'signup');
  const confirmVisible = await cleanPage.locator('#auth-confirm').isVisible();
  if (isSignUp && confirmVisible) ok('Toggle to sign-up shows confirm field');
  else fail('Sign-up toggle: ' + isSignUp + ' confirm:' + confirmVisible);

  // Back to landing
  await cleanPage.click('button:has-text("Back")');
  await wait(300);
  const landingVisible = await cleanPage.evaluate(() => document.getElementById('login-landing').style.display !== 'none');
  if (landingVisible) ok('Back button returns to landing');
  else fail('Back button did not show landing');

  await cleanContext.close();

  // ── Report ──
  console.log('\n─── FEATURE TESTS ───');
  console.log('Passed: ' + passed + '/14');
  await browser.close();
  process.exit(passed >= 14 ? 0 : 1);
}

run().catch(err => {
  console.error('TEST FAILED:', err.message);
  process.exit(1);
});
