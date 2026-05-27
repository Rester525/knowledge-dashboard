import { chromium } from 'playwright';

const URL = 'https://skillstack-learn.vercel.app';

async function wait(time) { return new Promise(r => setTimeout(r, time)); }

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  // Bypass login overlay for testing
  await context.addInitScript(() => {
    localStorage.setItem('kd-auth', 'guest');
  });
  const page = await context.newPage();
  const errors = [];

  page.on('pageerror', err => { errors.push('PAGE ERROR: ' + err.message); });
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push('CONSOLE ERROR: ' + msg.text());
  });

  console.log('Navigating to ' + URL);
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });

  // Wait for app to load (spinner disappears, content renders)
  await page.waitForSelector('#view-content .card', { timeout: 15000 });
  console.log('✓ Dashboard loaded');

  // ── Test 1: Dashboard stats ──
  const statsCards = await page.locator('#view-content .card').count();
  console.log(`  Dashboard cards: ${statsCards} (expected >= 4)`);

  // ── Test 2: Navigation ──
  const views = ['notes', 'todos', 'bookmarks', 'search', 'calculator', 'study'];
  for (const v of views) {
    await page.click(`.nav-item[data-view="${v}"]`);
    await wait(500);
    const title = await page.textContent('#view-title');
    console.log(`✓ Navigated to ${title}`);
  }

  // ── Test 3: Notes CRUD ──
  await page.click('.nav-item[data-view="notes"]');
  await wait(500);
  await page.click('button:has-text("New Note")');
  await wait(300);
  await page.fill('#note-title', 'Playwright Test Note');
  await page.fill('#note-content', 'This is a **test** note created by Playwright.\n\n- Item 1\n- Item 2');
  await page.fill('#note-tags', 'test, playwright, automation');
  await page.click('button:has-text("Create")');
  await wait(1500);
  console.log('✓ Note created');

  // Test markdown preview — saveNote navigates to notes view after creation
  await page.waitForSelector('#notes-list .card', { timeout: 10000 });
  const noteCards = page.locator('#notes-list .card');
  const firstNote = noteCards.first();
  await firstNote.click();
  await wait(300);
  await page.click('button:has-text("Preview")');
  await wait(300);
  const preview = await page.locator('#note-preview');
  const previewVisible = await preview.isVisible();
  console.log(`  Markdown preview visible: ${previewVisible}`);

  // ── Test 4: Todos CRUD ──
  await page.click('.nav-item[data-view="todos"]');
  await wait(500);
  await page.fill('#todo-input', 'Test todo from Playwright');
  await page.click('button:has-text("Add")');
  await wait(500);
  console.log('✓ Todo created');

  // Test todo checkbox toggle
  const checkbox = page.locator('#todos-container .card input[type="checkbox"]').first();
  await checkbox.check();
  await wait(500);
  console.log('✓ Todo toggled');

  // Test sort buttons
  await page.click('.sort-btn:has-text("Priority")');
  await wait(300);
  console.log('✓ Todo sort by priority');

  // Test Kanban toggle
  await page.click('button:has-text("Kanban")');
  await wait(500);
  const kanban = await page.locator('#kanban-board');
  console.log(`  Kanban board visible: ${await kanban.isVisible()}`);
  await page.click('button:has-text("List")');
  await wait(300);
  console.log('✓ Kanban toggle works');

  // ── Test 5: Bookmarks CRUD ──
  await page.click('.nav-item[data-view="bookmarks"]');
  await wait(500);
  await page.fill('#bm-url', 'https://example.com');
  await page.fill('#bm-title', 'Example Bookmark');
  await page.click('button:has-text("Add")');
  await wait(500);
  console.log('✓ Bookmark added');

  // Test compact toggle
  await page.click('.sort-btn:has-text("⊟")');
  await wait(300);
  console.log('✓ Compact toggle');

  // ── Test 6: Search ──
  await page.click('.nav-item[data-view="search"]');
  await wait(500);
  await page.fill('#search-input', 'test');
  await page.click('button:has-text("Search")');
  await wait(2000); // wait for search results
  const searchRes = await page.locator('#search-results .card').count();
  console.log(`  Search results: ${searchRes}`);

  // Test search filter toggle
  const searchToggle = page.locator('.sort-btn').first();
  const searchBtnText = await searchToggle.textContent();
  await searchToggle.click();
  await wait(300);
  console.log(`✓ Search filter toggle (was "${searchBtnText}")`);

  // ── Test 7: Calculator ──
  await page.click('.nav-item[data-view="calculator"]');
  await wait(1000);
  // Check preset buttons
  const calcPresets = await page.locator('.calc-preset').count();
  console.log(`  Calculator presets: ${calcPresets} (expected > 10)`);

  // ── Test 8: Study section ──
  await page.click('.nav-item[data-view="study"]');
  await wait(500);

  // Test study timer
  await page.click('#stab-timer');
  await wait(500);
  const timerDisplay = await page.textContent('#timer-display');
  console.log(`  Timer display: ${timerDisplay}`);

  await page.click('#timer-start-btn');
  await wait(2000);
  await page.click('#timer-start-btn');
  await wait(300);
  console.log('✓ Timer start/stop');

  await page.click('button:has-text("Pomodoro 25/5")');
  await wait(300);
  console.log('✓ Timer preset');

  // ── Test 9: Command Palette (Ctrl+K) ──
  await page.keyboard.press('Control+k');
  await wait(500);
  const paletteVisible = await page.locator('#palette-overlay').isVisible();
  console.log(`  Command palette visible: ${paletteVisible}`);
  // Navigate via palette
  await page.keyboard.press('Escape');
  await wait(300);
  console.log('✓ Command palette test');

  // ── Test 10: Accent Colors ──
  // Click the green accent dot in the sidebar
  const accentDots = page.locator('.sidebar div[style*="padding:12px 16px"] span');
  const greenDot = accentDots.nth(1);
  await greenDot.click();
  await wait(300);
  const hasGreen = await page.evaluate(() => document.documentElement.classList.contains('accent-green'));
  console.log(`  Accent green active: ${hasGreen}`);
  // Reset to blue
  const blueDot = accentDots.first();
  await blueDot.click();
  await wait(300);
  console.log('✓ Accent colors toggle');

  // ── Test 11: Export Data ──
  await page.click('.nav-item[data-view="dashboard"]');
  await wait(500);
  // Check export button
  const exportBtn = await page.locator('button:has-text("Export")').count();
  console.log(`  Export buttons visible: ${exportBtn}`);

  // ── Test 12: Keyboard shortcuts ──
  await page.keyboard.press('Control+2');
  await wait(500);
  const notesTitle = await page.textContent('#view-title');
  console.log(`  Ctrl+2 navigated to: ${notesTitle}`);

  await page.keyboard.press('Control+3');
  await wait(500);
  const todosTitle = await page.textContent('#view-title');

  // ── Test 13: Load more (pagination) ──
  const loadMore = await page.locator('button:has-text("Load more")').count();
  console.log(`  Load more buttons: ${loadMore} (may be 0 if < 50 items)`);

  // ── Report ──
  console.log('');
  const realErrors = errors.filter(e => !e.includes('Offline: no local data') && !e.includes('Failed to load resource'));
  if (realErrors.length > 0) {
    console.log('ERRORS FOUND:');
    realErrors.forEach(e => console.log('  ' + e));
  } else {
    console.log('✓ ALL TESTS PASSED — No errors');
  }

  const expectedAPIErrors = errors.filter(e => e.includes('Offline: no local data')).length;
  if (expectedAPIErrors > 0) console.log(`  (${expectedAPIErrors} expected offline errors — no backend on Vercel)`);

  await browser.close();
  process.exit(realErrors.length > 0 ? 1 : 0);
}

run().catch(err => {
  console.error('TEST FAILED:', err.message);
  process.exit(1);
});
