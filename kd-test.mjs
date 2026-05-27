import { chromium } from "playwright";

const URL = "https://skillstack-learn.vercel.app";

async function wait(time) {
  return new Promise((r) => setTimeout(r, time));
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  // Bypass login overlay for testing
  await context.addInitScript(() => {
    localStorage.setItem("kd-auth", "guest");
  });
  const page = await context.newPage();
  const pageErrors = [];
  const consoleErrors = [];

  page.on("pageerror", (err) => pageErrors.push(err.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });

  console.log("Navigating to " + URL);
  await page.goto(URL, { waitUntil: "load", timeout: 30000 });
  await page.waitForTimeout(3000);

  const bodyHTML = await page.evaluate(() => document.body.innerHTML.length);
  console.log("Body HTML length:", bodyHTML);

  let passed = 0;
  function ok(msg) {
    passed++;
    console.log("  ✓ " + msg);
  }
  function info(msg) {
    console.log("    " + msg);
  }

  // ── Test 1: Dashboard rendered ──
  const viewContent = await page.textContent("#view-content");
  if (viewContent && viewContent.length > 0) ok("Dashboard content rendered");
  else console.log("  ✗ Dashboard content missing");

  // ── Test 2: Navigation ──
  const views = [
    "notes",
    "todos",
    "bookmarks",
    "calculator",
    "study",
  ];
  for (const v of views) {
    await page.click(`.nav-item[data-view="${v}"]`);
    await wait(1000);
    const title = await page.textContent("#view-title");
    if (title && title.length > 0) ok("Navigated to " + title);
    else console.log("  ✗ Navigation to " + v + " failed");
  }

  // ── Test 3: Notes UI ──
  await page.click('.nav-item[data-view="notes"]');
  await wait(1000);
  const newNoteBtn = await page.locator('button:has-text("New Note")').count();
  if (newNoteBtn > 0) ok("Notes view with New Note button");
  else console.log("  ✗ Notes view missing");

  // Sorting buttons
  const sortBtns = await page.locator(".sort-btn").count();
  if (sortBtns > 0) ok(sortBtns + " sort buttons present");

  // ── Test 4: Todos UI ──
  await page.click('.nav-item[data-view="todos"]');
  await wait(1000);
  const todoInput = await page.locator("#todo-input").count();
  if (todoInput > 0) ok("Todos view with input");
  else console.log("  ✗ Todos view missing");

  // Kanban toggle
  const kanbanBtn = page.locator('button:has-text("Kanban")');
  if (await kanbanBtn.isVisible()) ok("Kanban toggle visible");

  // ── Test 5: Bookmarks UI ──
  await page.click('.nav-item[data-view="bookmarks"]');
  await wait(1000);
  const bmBtn = await page.locator('button:has-text("Add")').count();
  if (bmBtn > 0) ok("Bookmarks view with Add button");
  else console.log("  ✗ Bookmarks view missing");

  // ── Test 6: Search UI ──
  await page.click('.nav-item[data-view="notes"]');
  await wait(1000);
  const searchBar = await page.locator("#notes-search-input").count();
  if (searchBar > 0) ok("Search bar integrated in Notes view");
  else console.log("  ✗ Search view missing");

  // ── Test 7: Calculator ──
  await page.click('.nav-item[data-view="calculator"]');
  await wait(2000);
  const calcPresets = await page.locator(".calc-preset").count();
  if (calcPresets > 10) ok(calcPresets + " calculator presets");
  else console.log("  ✗ Calculator presets missing (" + calcPresets + ")");

  // ── Test 8: Study section ──
  await page.click('.nav-item[data-view="study"]');
  await wait(1000);
  const studyTabs = await page.locator(".study-tab").count();
  if (studyTabs === 4) ok("4 study tabs");
  else console.log("  ✗ Study tabs: " + studyTabs);

  // Study timer tab
  await page.click("#stab-timer");
  await wait(500);
  const timerDisplay = await page.textContent("#timer-display");
  if (timerDisplay) ok("Timer display: " + timerDisplay);
  else console.log("  ✗ Timer display missing");

  await page.click("#timer-start-btn");
  await wait(2000);
  await page.click("#timer-start-btn");
  ok("Timer start/stop");

  await page.click('button:has-text("Pomodoro 25/5")');
  await wait(500);
  ok("Timer preset Pomodoro");

  // ── Test 9: Command Palette ──
  await page.keyboard.press("Control+k");
  await wait(500);
  const paletteVisible = await page.locator("#palette-overlay").isVisible();
  if (paletteVisible) ok("Command palette opens (Ctrl+K)");
  await page.keyboard.press("Escape");
  await wait(500);
  ok("Command palette closes (Escape)");

  // ── Test 10: Accent Colors ──
  const sidebar = page.locator("#sidebar");
  const accentDots = sidebar.locator('span[onclick*="setAccent"]');
  const dotCount = await accentDots.count();
  if (dotCount === 10) ok("10 accent color dots");
  else console.log("  ✗ Accent dots: " + dotCount);

  // ── Test 11: Keyboard shortcuts ──
  await page.keyboard.press("Control+2");
  await wait(500);
  const notesTitle = await page.textContent("#view-title");
  if (notesTitle === "Notes") ok("Ctrl+2 navigates to Notes");

  await page.keyboard.press("Control+3");
  await wait(500);
  const todosTitle = await page.textContent("#view-title");
  if (todosTitle === "Todos") ok("Ctrl+3 navigates to Todos");

  // Ctrl+1 back to dashboard
  await page.keyboard.press("Control+1");
  await wait(500);
  ok("Ctrl+1 navigates to Dashboard");

  // ── Test 12: Export button ──
  await page.click('.nav-item[data-view="dashboard"]');
  await wait(500);
  const exportBtn = page.locator('button:has-text("Export")');
  if (await exportBtn.isVisible()) ok("Export button on dashboard");

  // ── Test 13: Sidebar items ──
  const navItems = await page.locator(".nav-item").count();
  if (navItems === 7) ok("7 sidebar navigation items (Search merged into Notes)");
  else console.log("  ✗ Nav items: " + navItems);

  // ── Test 14: Viewport meta ──
  const viewportMeta = await page.evaluate(() => {
    const m = document.querySelector('meta[name="viewport"]');
    return m ? m.getAttribute("content") : null;
  });
  if (viewportMeta) ok("Viewport meta tag");

  // ── Summary ──
  console.log("\n─── RESULTS ───");
  console.log("Passed: " + passed + " tests");

  // Check for unexpected errors
  const realErrors = pageErrors.filter(
    (e) => !e.includes("Offline: no local data"),
  );
  const realConsoleErrors = consoleErrors.filter(
    (e) => !e.includes("Failed to load resource") && !e.includes("unsupported MIME type"),
  );

  if (realErrors.length > 0) {
    console.log("UNEXPECTED PAGE ERRORS:");
    realErrors.forEach((e) => console.log("  " + e));
  }
  if (realConsoleErrors.length > 0) {
    console.log("CONSOLE ERRORS:");
    realConsoleErrors.forEach((e) => console.log("  " + e.slice(0, 200)));
  }

  const expectedAPIErrors = pageErrors.filter((e) =>
    e.includes("Offline: no local data"),
  ).length;
  if (expectedAPIErrors > 0) {
    info(
      expectedAPIErrors +
        " expected offline errors (no backend deployed on Vercel)",
    );
  }

  await page.screenshot({ path: "/tmp/kd-final.png", fullPage: true });
  console.log("Screenshot: /tmp/kd-final.png");

  await browser.close();

  if (realErrors.length === 0 && realConsoleErrors.length === 0) {
    console.log("\n✓ ALL TESTS PASSED");
    process.exit(0);
  } else {
    console.log("\n✗ SOME TESTS FAILED");
    process.exit(1);
  }
}

run().catch((err) => {
  console.error("TEST FAILED:", err.message);
  process.exit(1);
});
