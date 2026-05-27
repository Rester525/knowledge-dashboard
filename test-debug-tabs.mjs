import { chromium } from "playwright";

const URL = "https://skillstack-learn.vercel.app";

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await context.addInitScript(() => {
    localStorage.setItem("kd-auth", "guest");
  });
  const page = await context.newPage();

  await page.goto(URL, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(2000);

  // Go to Study view
  await page.click('.nav-item[data-view="study"]');
  await page.waitForTimeout(1000);

  // Check what study tabs exist
  const tabs = await page.evaluate(() => {
    const buttons = document.querySelectorAll(".study-tab");
    return Array.from(buttons).map(b => ({ id: b.id, text: b.textContent.trim() }));
  });
  console.log("Study tabs found:", JSON.stringify(tabs));

  // Also check if stab-saved exists anywhere
  const hasStabSaved = await page.evaluate(() => !!document.getElementById("stab-saved"));
  console.log("Has #stab-saved:", hasStabSaved);

  // Check the study tab content area
  const studyTabContent = await page.evaluate(() => {
    const el = document.getElementById("study-tab-content");
    return el ? el.innerHTML.substring(0, 500) : "no study-tab-content";
  });
  console.log("Study tab content start:", studyTabContent);

  await browser.close();
}

run().catch((err) => {
  console.error("FAILED:", err.message);
  process.exit(1);
});
