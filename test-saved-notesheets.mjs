import { chromium } from "playwright";

const URL = "https://skillstack-learn.vercel.app";

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await context.addInitScript(() => {
    localStorage.setItem("kd-auth", "guest");
  });
  const page = await context.newPage();

  const errors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push("[CONSOLE] " + msg.text().slice(0, 300));
  });
  page.on("pageerror", (err) => errors.push("[PAGE] " + err.message));

  await page.goto(URL, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(2000);

  // 1. Generate a notesheet so we have something saved
  await page.click('.nav-item[data-view="study"]');
  await page.waitForTimeout(1000);
  await page.click("#stab-notesheet");
  await page.waitForTimeout(500);
  await page.fill("#ns-topic", "Quadratic Equations");
  await page.waitForTimeout(300);
  await page.click('button:has-text("Generate Notesheet")');

  // Wait for the notesheet to appear
  try {
    await page.waitForSelector(".notesheet", { timeout: 90000 });
    console.log("✓ Notesheet generated");
  } catch {
    console.log("✗ Notesheet never rendered");
  }
  await page.waitForTimeout(2000);

  // 2. Navigate to Saved Notesheets tab
  await page.click("#stab-saved");

  // Wait for the saved notesheets data to load (poll for list or "No saved" message)
  console.log("Waiting for saved notesheets to load...");
  let savedState = null;
  for (let i = 0; i < 15; i++) {
    await page.waitForTimeout(1000);
    savedState = await page.evaluate(() => {
      // After renderSavedNotesheets runs, it puts content in #study-content
      const studyContent = document.getElementById("study-content");
      if (!studyContent) return { state: "no-content" };
      const text = studyContent.innerText || "";
      // Check for the ns-saved-list or empty state
      const list = document.getElementById("ns-saved-list");
      if (list && list.querySelectorAll('[onclick*="openSavedNotesheet"]').length > 0) {
        return { state: "loaded", count: list.querySelectorAll('[onclick*="openSavedNotesheet"]').length };
      }
      if (text.includes("No saved notesheets yet")) return { state: "empty" };
      return { state: "loading" };
    });
    if (savedState.state === "loaded" || savedState.state === "empty") {
      break;
    }
  }
  console.log(`Saved notesheets state: ${JSON.stringify(savedState)}`);
  let viewerChecks = {};

  // If saved notesheets exist, test the viewer
  if (savedState.state === "loaded" && savedState.count > 0) {
    console.log(`✓ ${savedState.count} saved notesheet(s) found`);

    // Click first card
    const firstCard = await page.$('[onclick*="openSavedNotesheet"]');
    if (firstCard) {
      await firstCard.click();
      await page.waitForTimeout(2000);

      viewerChecks = await page.evaluate(() => {
        const v = document.getElementById("ns-saved-viewer");
        const viewerVisible = v && v.style.display !== "none";
        const hasRendered = !!document.querySelector("#ns-saved-viewer .notesheet");
        // Use Array.from + innerText instead of :has-text() pseudo-selector
        const allBtns = Array.from(document.querySelectorAll("#ns-saved-viewer button"));
        const hasPDF = allBtns.some(b => b.innerText.includes("Download PDF"));
        const hasDrive = allBtns.some(b => b.innerText.includes("Save to Google"));
        const hasEditTA = !!document.querySelector("#ns-edit-input");
        const hasEditBtn = allBtns.some(b => b.innerText.includes("Apply Edit"));
        const hasDelete = allBtns.some(b => b.innerText.includes("Delete"));
        return { viewerVisible, hasRendered, hasPDF, hasDrive, hasEditTA, hasEditBtn, hasDelete };
      });
      console.log(`✓ Viewer visible: ${viewerChecks.viewerVisible}`);
      console.log(`✓ Rendered notesheet: ${viewerChecks.hasRendered}`);
      console.log(`✓ Download PDF button: ${viewerChecks.hasPDF}`);
      console.log(`✓ Save to Google button: ${viewerChecks.hasDrive}`);
      console.log(`✓ AI edit textarea: ${viewerChecks.hasEditTA}`);
      console.log(`✓ Apply Edit button: ${viewerChecks.hasEditBtn}`);
      console.log(`✓ Delete button: ${viewerChecks.hasDelete}`);
    }
  } else if (savedState.state === "empty") {
    console.log("⚠ No saved notesheets found (empty state)");
  }

  // 3. Check Settings bulk delete UI
  await page.click('.nav-item[data-view="settings"]');
  await page.waitForTimeout(1000);
  const hasBulkDelete = await page.evaluate(() => {
    const sel = document.getElementById("settings-delete-age");
    const btn = document.getElementById("btn-delete-old");
    return !!(sel && btn);
  });
  console.log(`✓ Bulk delete UI in Settings: ${hasBulkDelete}`);

  // 4. Summary
  const viewerOK = viewerChecks.viewerVisible && viewerChecks.hasRendered && viewerChecks.hasPDF && viewerChecks.hasDrive && viewerChecks.hasEditTA && viewerChecks.hasEditBtn && viewerChecks.hasDelete;
  const allOK = (savedState.state === "loaded") && viewerOK && hasBulkDelete;

  if (savedState.state === "loaded") {
    console.log(`\n${allOK ? "✓ ALL CHECKS PASSED" : "✗ SOME CHECKS FAILED"}`);
  } else {
    console.log(`\n⚠ Saved notesheets tab was ${savedState.state} - viewer couldn't be tested`);
  }

  if (errors.length) {
    console.log("\nConsole errors:");
    errors.forEach((e, i) => console.log(`  ${i + 1}. ${e.slice(0, 150)}`));
  }

  await browser.close();
}

run().catch((err) => {
  console.error("FAILED:", err.message);
  process.exit(1);
});
