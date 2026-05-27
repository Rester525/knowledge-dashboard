import { chromium } from "playwright";

const URL = "https://skillstack-learn.vercel.app";

async function run() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await ctx.addInitScript(() => {
    localStorage.setItem("kd-auth", "guest");
  });
  const page = await ctx.newPage();

  page.on("console", (msg) => {
    const t = msg.text();
    if (t.includes("[SavedNotesheets]") || t.includes("Error") || t.includes("error") || t.includes("clicked")) {
      console.log(`[${msg.type()}] ${t.slice(0, 400)}`);
    }
  });
  page.on("pageerror", (err) => console.log("[PAGE_ERROR]", err.message));

  // Abort localhost requests if not running locally
  await page.route("**://localhost:8000/**", (route) => route.abort());

  await page.goto(URL, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(3000);

  // Inject notesheets into the app's IndexedDB database
  await page.evaluate(() => {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open("kd-offline-v1", 1);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        for (const s of ["notes", "todos", "bookmarks", "syncQueue"]) {
          if (!db.objectStoreNames.contains(s))
            db.createObjectStore(s, { keyPath: "id" });
        }
      };
      req.onsuccess = () => {
        try {
          const db = req.result;

          const inject = (storeName, data) => {
            return new Promise((res, rej) => {
              const tx = db.transaction(storeName, "readwrite");
              const store = tx.objectStore(storeName);
              for (const item of data) store.put(item);
              tx.oncomplete = () => res();
              tx.onerror = (e) => rej(e);
            });
          };

          inject("notes", [
            {
              id: "notesheet-with-id-001",
              title: "Notesheet: Geometric Sequences",
              content: "# Geometric Sequences\n\nA geometric sequence is a sequence of numbers where each term after the first is found by multiplying the previous term by a constant called the common ratio.\n\n## Formula\n$$a_n = a_1 \\cdot r^{n-1}$$\n\nWhere:\n- $a_n$ is the nth term\n- $a_1$ is the first term\n- $r$ is the common ratio\n\n## Example\nFind the 10th term of: 3, 6, 12, 24, ...\n\n$a_1 = 3$, $r = 2$\n$a_{10} = 3 \\cdot 2^{9} = 3 \\cdot 512 = 1536$",
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            {
              id: "notesheet-no-id-001",
              title: "Notesheet: Without Own ID",
              content: "# No ID\n\nThis notesheet has its own id field. Testing that viewer displays correctly.",
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ]);

          resolve("done");
        } catch (e) { reject(e); }
      };
      req.onerror = (e) => reject(e);
    });
  });
  console.log("Test data injected into IndexedDB (kd-offline-v1)");

  // Go to study > saved
  await page.click('.nav-item[data-view="study"]');
  await page.waitForTimeout(500);
  await page.click("#stab-saved");
  await page.waitForTimeout(5000);

  // Check the full study tab content
  const studyContent = await page.evaluate(() => {
    const c = document.getElementById("study-content");
    if (!c) return "no study-content";
    return {
      html: c.innerHTML.substring(0, 1000),
      listExists: !!document.getElementById("ns-saved-list"),
      viewerExists: !!document.getElementById("ns-saved-viewer"),
    };
  });
  console.log("\nStudy content:", JSON.stringify(studyContent, null, 2));

  // Get cards info - being careful about data types
  const cardsInfo = await page.evaluate(() => {
    const list = document.getElementById("ns-saved-list");
    if (!list) return { error: "ns-saved-list not found", count: 0, cards: [] };
    const cards = list.querySelectorAll(".card");
    return {
      count: cards.length,
      cards: Array.from(cards).map((c, i) => ({
        index: i,
        onclick: c.getAttribute("onclick"),
        text: c.textContent.substring(0, 120),
      }))
    };
  });
  console.log("\nCards:", JSON.stringify(cardsInfo, null, 2));

  // Try clicking each card
  for (let i = 0; i < cardsInfo.cards.length; i++) {
    console.log(`\n--- Clicking card ${i} with onclick: ${cardsInfo.cards[i].onclick} ---`);

    // Click via evaluate to be more direct
    const clickResult = await page.evaluate((idx) => {
      const cards = document.querySelectorAll("#ns-saved-list > .card");
      if (!cards || !cards[idx]) return { error: "card not found" };
      // Execute the onclick directly
      const onclick = cards[idx].getAttribute("onclick");
      cards[idx].click();
      return { clicked: true, onclick };
    }, i);
    console.log("Click result:", JSON.stringify(clickResult));

    await page.waitForTimeout(2000);

    const result = await page.evaluate(() => {
      const viewer = document.getElementById("ns-saved-viewer");
      const list = document.getElementById("ns-saved-list");
      const viewContent = document.getElementById("view-content");
      const activeNav = document.querySelector(".nav-item.active");
      const activeStudyTab = document.querySelector(".study-tab.active");
      return {
        viewerDisplay: viewer ? window.getComputedStyle(viewer).display : "missing",
        viewerText: viewer ? viewer.textContent.substring(0, 300) : "missing",
        listDisplay: list ? window.getComputedStyle(list).display : "missing",
        activeView: activeNav ? activeNav.textContent.trim() : "none",
        activeStudyTab: activeStudyTab ? activeStudyTab.textContent.trim() : "none",
        viewTitle: document.getElementById("view-title")?.textContent?.trim() || "none",
      };
    });
    console.log("After click:", JSON.stringify(result, null, 2));

    // Close viewer to try next card
    if (result.viewerDisplay === "block") {
      await page.evaluate(() => window.closeSavedNotesheetViewer());
      await page.waitForTimeout(500);
    }
  }

  await browser.close();
}

run().catch((err) => {
  console.error("FAILED:", err.message);
  process.exit(1);
});
