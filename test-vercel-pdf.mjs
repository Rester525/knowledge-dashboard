import { chromium } from "playwright";
import { writeFileSync } from "fs";

const URL = "https://skillstack-learn.vercel.app";

async function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  await context.addInitScript(() => {
    localStorage.setItem("kd-auth", "guest");
  });
  const page = await context.newPage();
  const pageErrors = [];

  page.on("pageerror", (err) => pageErrors.push(err.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") console.log("  [console.error]", msg.text());
  });

  console.log("Navigating to " + URL);
  await page.goto(URL, { waitUntil: "load", timeout: 15000 });
  await wait(2000);

  let passed = 0;
  let failed = 0;
  function ok(msg) { passed++; console.log("  ✓ " + msg); }
  function fail(msg) { failed++; console.log("  ✗ " + msg); }

  // Navigate to Study
  await page.click('.nav-item[data-view="study"]');
  await wait(1000);

  // Create test PDF
  const pdfPath = "/tmp/playwright-test-quad.pdf";
  const pdfContent = Buffer.from(
    "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj\n4 0 obj<</Length 145>>stream\nBT /F1 14 Tf 50 730 Td (Quadratic Equations) Tj ET\nBT /F1 11 Tf 50 700 Td (A quadratic equation is ax^2 + bx + c = 0 where a != 0.) Tj ET\nBT /F1 11 Tf 50 680 Td (The quadratic formula: x = (-b +/- sqrt(b^2 - 4ac)) / (2a)) Tj ET\nBT /F1 11 Tf 50 660 Td (Example: x^2 - 5x + 6 = 0) Tj ET\nBT /F1 11 Tf 50 640 Td (Discriminant = 25 - 24 = 1) Tj ET\nBT /F1 11 Tf 50 620 Td (x = (5 +/- 1)/2 = 3 or 2) Tj ET\nendstream\nendobj\n5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\nxref\n0 6\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000314 00000 n \n0000000483 00000 n \ntrailer<</Size 6/Root 1 0 R>>\nstartxref\n546\n%%EOF"
  );
  writeFileSync(pdfPath, pdfContent);

  // Upload PDF
  const fileInput = page.locator("#ns-pdf");
  await fileInput.setInputFiles(pdfPath);
  await wait(500);

  const dropLabel = await page.textContent("#ns-drop-label");
  if (dropLabel && dropLabel.includes("PDF selected")) ok("PDF file accepted");
  else fail("Dropzone did not update");

  // Click Generate
  await page.click('button:has-text("Generate Notesheet")');
  await wait(1000);

  // Check result
  let resultFound = false;
  for (let i = 0; i < 120; i++) {
    await wait(1000);
    const statusText = await page.textContent("#ns-status");
    if (statusText && statusText.includes("Saved")) {
      resultFound = true;
      ok("PDF notesheet generated and saved");
      break;
    }
    if (statusText && (statusText.includes("Failed") || statusText.includes("Error"))) {
      resultFound = true;
      fail("PDF notesheet failed: " + statusText);
      const resultText = await page.textContent("#ns-result");
      console.log("    Result area:", resultText?.substring(0, 1000));
      // Check browser console for errors
      const netReqs = await page.evaluate(() => JSON.stringify(window.performance.getEntriesByType('resource').filter(r => r.name.includes('pdf-notesheet'))));
      console.log("    Network requests:", netReqs);
      break;
    }
  }
  if (!resultFound) fail("PDF notesheet timed out after 120s");

  const relevantErrors = pageErrors.filter(e =>
    !e.includes("no local data") && !e.includes("Offline") && !e.includes("404")
  );
  if (relevantErrors.length === 0) ok("No unexpected JS errors");
  else fail("JS errors: " + relevantErrors.join(" | "));

  const summary = `${passed}/${passed + failed} passed` + (failed > 0 ? `, ${failed} failed` : "");
  console.log(`\nResults: ${summary}`);
  await browser.close();
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(err => { console.error("Fatal:", err); process.exit(1); });
