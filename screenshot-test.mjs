import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

const URL = 'http://127.0.0.1:8081';

async function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

async function run() {
  const browser = await chromium.launch({ headless: true });

  // ── Screenshot Set 1: Auth Screens ──
  console.log('\n=== Auth Screens ===');
  {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();
    await page.goto(URL, { waitUntil: 'load', timeout: 15000 });
    await wait(2000);
    await page.screenshot({ path: 'screenshots/01-login-landing.png', fullPage: true });
    console.log('  ✓ 01-login-landing.png');

    // Click "Create Account"
    const createBtn = page.locator('button:has-text("Create Account")').last();
    await createBtn.click();
    await wait(500);
    await page.screenshot({ path: 'screenshots/02-create-account.png', fullPage: true });
    console.log('  ✓ 02-create-account.png');

    // Click back button in auth form
    const backBtn = page.locator('button:has-text("Back to Login")');
    await backBtn.click();
    await wait(500);
    await page.screenshot({ path: 'screenshots/03-signin-form.png', fullPage: true });
    console.log('  ✓ 03-signin-form.png');

    await context.close();
  }

  // ── Screenshot Set 2: Guest Mode — Settings ──
  console.log('\n=== Guest Mode: Settings ===');
  {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await context.addInitScript(() => {
      localStorage.setItem('kd-auth', 'guest');
    });
    const page = await context.newPage();
    await page.goto(URL, { waitUntil: 'load', timeout: 15000 });
    await wait(2000);

    // Navigate to Settings
    await page.click('.nav-item[data-view="settings"]');
    await wait(1000);
    await page.screenshot({ path: 'screenshots/04-settings-guest.png', fullPage: true });
    console.log('  ✓ 04-settings-guest.png');

    // Theme cards are in first .theme-grid within settings
    const themeGrid = page.locator('.settings-section .theme-grid').first();
    // Retro theme (card index 1: Standard=0, Retro=1, 8-Bit=2)
    await themeGrid.locator('.theme-card').nth(1).click();
    await wait(500);
    await page.screenshot({ path: 'screenshots/05-theme-retro.png', fullPage: true });
    console.log('  ✓ 05-theme-retro.png');

    // 8-Bit theme (card index 2)
    await themeGrid.locator('.theme-card').nth(2).click();
    await wait(500);
    await page.screenshot({ path: 'screenshots/06-theme-8bit.png', fullPage: true });
    console.log('  ✓ 06-theme-8bit.png');

    // Standard theme (card index 0)
    await themeGrid.locator('.theme-card').nth(0).click();
    await wait(500);

    // Background cards are in second .theme-grid
    const bgGrid = page.locator('.settings-section .theme-grid').nth(1);
    // Glass background (index 2: Solid=0, Gradient=1, Glass=2, Synthwave=3)
    await bgGrid.locator('.theme-card').nth(2).click();
    await wait(500);
    await page.screenshot({ path: 'screenshots/07-bg-glass.png', fullPage: true });
    console.log('  ✓ 07-bg-glass.png');

    // Synthwave background (index 3)
    await bgGrid.locator('.theme-card').nth(3).click();
    await wait(500);
    await page.screenshot({ path: 'screenshots/08-bg-synthwave.png', fullPage: true });
    console.log('  ✓ 08-bg-synthwave.png');

    // Solid background (index 0)
    await bgGrid.locator('.theme-card').nth(0).click();
    await wait(500);

    // Change accent color to green
    const greenSwatch = page.locator('.color-swatch[title="Green"]');
    await greenSwatch.click();
    await wait(300);
    await page.screenshot({ path: 'screenshots/09-accent-green.png', fullPage: true });
    console.log('  ✓ 09-accent-green.png');

    // Change accent to purple
    const purpleSwatch = page.locator('.color-swatch[title="Purple"]');
    await purpleSwatch.click();
    await wait(300);

    // Navigate to Dashboard to see accent applied
    await page.click('.nav-item[data-view="dashboard"]');
    await wait(800);
    await page.screenshot({ path: 'screenshots/10-dashboard-accent-purple.png', fullPage: true });
    console.log('  ✓ 10-dashboard-accent-purple.png');

    // Navigate to Notes to see notes view
    await page.click('.nav-item[data-view="notes"]');
    await wait(800);
    await page.screenshot({ path: 'screenshots/11-notes-view.png', fullPage: true });
    console.log('  ✓ 11-notes-view.png');

    await context.close();
  }

  // ── Screenshot Set 3: Sidebar and Palette ──
  console.log('\n=== Sidebar & Palette ===');
  {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await context.addInitScript(() => {
      localStorage.setItem('kd-auth', 'guest');
    });
    const page = await context.newPage();
    await page.goto(URL, { waitUntil: 'load', timeout: 15000 });
    await wait(2000);

    // Screenshot the sidebar with guest mode indicator
    await page.screenshot({ path: 'screenshots/12-sidebar-guest.png', fullPage: true });
    console.log('  ✓ 12-sidebar-guest.png');

    // Open command palette
    await page.keyboard.press('Control+k');
    await wait(500);
    await page.screenshot({ path: 'screenshots/13-command-palette.png', fullPage: true });
    console.log('  ✓ 13-command-palette.png');
    await page.keyboard.press('Escape');
    await wait(300);

    await context.close();
  }

  await browser.close();
  console.log('\n=== All screenshots captured ===');
}

run().catch(e => {
  console.error('Test failed:', e);
  process.exit(1);
});
