import { chromium } from "playwright";
import * as fs from "fs";

const URL = "https://skillstack-learn.vercel.app";

async function waitForDownload(page, timeout = 15000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Download timed out")), timeout);
    page.on("download", async (download) => {
      clearTimeout(timer);
      const path = await download.path();
      const { size } = await fs.promises.stat(path);
      console.log("  Download size:", size, "bytes");
      resolve({ path, size, url: download.url(), suggestion: download.suggestedFilename() });
    });
  });
}

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

  // Navigate to Study → notesheet tab
  await page.click('.nav-item[data-view="study"]');
  await page.waitForTimeout(1000);
  await page.click("#stab-notesheet");
  await page.waitForTimeout(500);

  // Enter a topic and generate
  await page.fill("#ns-topic", "Quadratic Equations");
  await page.waitForTimeout(300);
  await page.click('button:has-text("Generate Notesheet")');
  await page.waitForTimeout(3000);

  // Wait for ns-result to have content
  try {
    await page.waitForSelector(".notesheet", { timeout: 60000 });
    console.log("Notesheet rendered");
  } catch {
    console.log("Notesheet never rendered");
  }
  await page.waitForTimeout(1000);

  // Check if html2pdf is loaded
  const hasHtml2pdf = await page.evaluate(() => typeof html2pdf !== "undefined");
  console.log("html2pdf loaded:", hasHtml2pdf);

  // Click Download PDF and verify it has content
  console.log("\nClicking Download PDF...");
  const pdfPromise = waitForDownload(page);
  try {
    await page.click('button:has-text("Download PDF")', { timeout: 3000 });
    const pdf = await pdfPromise;
    if (pdf.size > 2000) {
      console.log("  ✓ PDF has content (" + pdf.size + " bytes)");
    } else {
      console.log("  ✗ PDF appears blank (" + pdf.size + " bytes)");
    }
  } catch (e) {
    console.log("Error downloading PDF:", e.message.slice(0, 200));
  }

  // Now test "Save to Google Docs"
  console.log("\nClicking Save to Google Docs...");
  const htmlPromise = waitForDownload(page);
  try {
    await page.click('button:has-text("Save to Google")', { timeout: 3000 });
    const html = await htmlPromise;
    if (html.size > 2000) {
      console.log("  ✓ HTML fallback has content (" + html.size + " bytes)");
    } else {
      console.log("  ✗ HTML fallback appears blank (" + html.size + " bytes)");
    }
  } catch (e) {
    console.log("Error downloading HTML:", e.message.slice(0, 200));
  }

  if (errors.length) {
    console.log("\nAll errors captured:");
    errors.forEach((e, i) => console.log(`  ${i + 1}. ${e}`));
  }

  await browser.close();
}

run().catch((err) => {
  console.error("FAILED:", err.message);
  process.exit(1);
});
