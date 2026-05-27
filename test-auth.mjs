import { chromium } from "playwright";

const URL = "http://localhost:8000";

async function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
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

  // Check supabase loaded
  console.log("Supabase loaded:", await page.evaluate(() => !!window.supabase));

  // Click "Create Account" directly on landing page
  const createBtn = page.locator('#login-landing button:has-text("Create Account")');
  await createBtn.click();
  await wait(500);

  // Check we're in signup mode
  const mode = await page.evaluate(() =>
    document.getElementById("login-auth-mode")?.dataset.mode
  );
  console.log("Auth mode:", mode);

  // Fill credentials
  const testEmail = "test-" + Date.now() + "@example.com";
  const testPass = "testPass123!";
  console.log("Test email:", testEmail);

  await page.fill("#auth-email", testEmail);
  await page.fill("#auth-password", testPass);
  await page.fill("#auth-confirm", testPass);

  // Submit signup
  await page.click("#auth-submit-btn");
  await wait(5000);

  let authError = await page.textContent("#auth-error");
  console.log("Signup auth error:", authError);

  let overlayDisplay = await page.evaluate(() =>
    document.getElementById("login-overlay")?.style.display
  );
  console.log("Overlay after signup:", overlayDisplay);

  if (overlayDisplay === "none") {
    console.log("*** SIGNUP SUCCESS ***");

    // Sign out
    await page.evaluate(() =>
      document.querySelector('[data-view="settings"]')?.click()
    );
    await wait(1000);
    await page.click('button:has-text("Sign Out")');
    await wait(2000);

    // Sign back in
    await page.click('#login-landing button:has-text("Sign In")');
    await wait(500);

    await page.fill("#auth-email", testEmail);
    await page.fill("#auth-password", testPass);
    await page.click("#auth-submit-btn");
    await wait(5000);

    authError = await page.textContent("#auth-error");
    console.log("Signin auth error:", authError);
    overlayDisplay = await page.evaluate(() =>
      document.getElementById("login-overlay")?.style.display
    );
    console.log("Overlay after signin:", overlayDisplay);

    if (overlayDisplay === "none") {
      console.log("*** SIGNIN SUCCESS ***");
    } else {
      console.log("*** SIGNIN FAILED ***");
    }
  } else if (authError) {
    console.log("Signup showed error: '" + authError + "'");
    // Check what view we ended up in
    const visible = await page.evaluate(() => ({
      landing: document.getElementById("login-landing")?.style.display,
      form: document.getElementById("login-auth-form")?.style.display,
      confirm: document.getElementById("login-confirmation")?.style.display,
    }));
    console.log("Visible elements:", JSON.stringify(visible));
  }

  console.log("\nPage errors:", pageErrors.join(" | "));
  await browser.close();
  process.exit(overlayDisplay === "none" ? 0 : 1);
}

run().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
