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
  page.on("console", (msg) => errors.push(`[${msg.type()}] ${msg.text().slice(0, 200)}`));
  page.on("pageerror", (err) => errors.push("[PAGE] " + err.message));

  // Track network requests
  const apiCalls = [];
  page.on("request", (req) => {
    if (req.url().includes("/api/")) {
      apiCalls.push({ url: req.url().slice(0, 120), method: req.method() });
    }
  });

  await page.goto(URL, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(2000);

  // Go to study view
  await page.click('.nav-item[data-view="study"]');
  await page.waitForTimeout(1000);

  // Generate a notesheet
  await page.click("#stab-notesheet");
  await page.waitForTimeout(500);
  await page.fill("#ns-topic", "Quadratic Equations");
  await page.waitForTimeout(300);
  await page.click('button:has-text("Generate Notesheet")');
  await page.waitForTimeout(5000);

  // Check what's in the result area
  const resultText = await page.evaluate(() => {
    const r = document.getElementById("ns-result");
    return r ? r.innerHTML.substring(0, 500) : "no ns-result";
  });
  console.log("NS result after generate:", resultText.substring(0, 300));

  const statusText = await page.evaluate(() => {
    const s = document.getElementById("ns-status");
    return s ? s.textContent : "no ns-status";
  });
  console.log("Status text:", statusText);

  // Wait a bit then check saved
  await page.waitForTimeout(2000);

  // Now switch to saved tab
  await page.click("#stab-saved");
  await page.waitForTimeout(5000);

  // Check what's rendered
  const savedHTML = await page.evaluate(() => {
    const c = document.getElementById("study-tab-content");
    return c ? c.innerHTML.substring(0, 2000) : "no content";
  });
  console.log("Saved tab content:", savedHTML.substring(0, 1000));

  // Check saved list
  const savedListHTML = await page.evaluate(() => {
    const l = document.getElementById("ns-saved-list");
    return l ? l.innerHTML.substring(0, 500) : "no ns-saved-list";
  });
  console.log("Saved list:", savedListHTML);

  // Check the notes fetch
  console.log("\nAPI calls:");
  apiCalls.forEach(c => console.log(`  ${c.method} ${c.url}`));

  console.log("\nErrors:");
  errors.slice(0, 5).forEach(e => console.log(`  ${e}`));

  await browser.close();
}

run().catch((err) => {
  console.error("FAILED:", err.message);
  process.exit(1);
});
