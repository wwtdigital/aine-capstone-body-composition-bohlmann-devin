/**
 * Session Recording — 5-minute simulated user session
 * Records a realistic walkthrough of the fitness tracking app:
 * 1. Login
 * 2. Today page — slow scroll, observe nutrition ring + recovery + meals
 * 3. Log page — observe meal list and summary cards
 * 4. Log > Text mode — type meal, wait for analyze button
 * 5. Nutrition (history) tab — observe day groupings
 * 6. Training page — scroll through
 * 7. Settings — scroll through
 * 8. Return to Today page — final scroll
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { chromium } = require("playwright") as typeof import("playwright");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require("fs") as typeof import("fs");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require("path") as typeof import("path");
import type { Browser, BrowserContext, Page } from "playwright";

// ─── CONFIG ──────────────────────────────────────────────────────────────────
const BASE_URL = "https://aine-capstone-body-composition-bohl-smoky.vercel.app";
const USERNAME = "wbohlmann11";
const PASSWORD = "Aine2025!";
const RECORDINGS_DIR = path.join(__dirname, "../qa_screenshots/recordings");
const NAV_TIMEOUT = 30_000;
const SETTLE_TIMEOUT = 20_000;

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function waitForSettle(page: Page, ms = 1000) {
  try {
    await page.waitForLoadState("networkidle", { timeout: SETTLE_TIMEOUT });
  } catch {
    // networkidle timed out — page may still be functional
  }
  await page.waitForTimeout(ms);
}

async function smoothScroll(page: Page, totalPx: number, steps = 10, delayMs = 200) {
  const stepPx = Math.floor(totalPx / steps);
  for (let i = 0; i < steps; i++) {
    await page.mouse.wheel(0, stepPx);
    await page.waitForTimeout(delayMs);
  }
}

async function scrollToTop(page: Page) {
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  await page.waitForTimeout(600);
}

function log(step: string, detail = "") {
  const ts = new Date().toISOString().slice(11, 19);
  console.log(`[${ts}] ${step}${detail ? " — " + detail : ""}`);
}

// ─── MAIN ────────────────────────────────────────────────────────────────────
async function main() {
  ensureDir(RECORDINGS_DIR);

  const browser: Browser = await chromium.launch({ headless: false, slowMo: 50 });
  const context: BrowserContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: {
      dir: RECORDINGS_DIR,
      size: { width: 1440, height: 900 },
    },
  });

  const page: Page = await context.newPage();

  // Track any JS errors for the report
  const jsErrors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") jsErrors.push(msg.text());
  });
  page.on("pageerror", (err) => jsErrors.push(`[PAGEERROR] ${err.message}`));

  let failedStep = "";
  let failedError = "";
  let sessionComplete = false;

  try {
    // ── STEP 1: Login ─────────────────────────────────────────────────────────
    log("STEP 1", "Login");
    await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT });
    await waitForSettle(page, 1500);

    // Fill username — try email field first, then text field
    const emailInput = page.locator('input[type="email"]').first();
    const textInput = page.locator('input[type="text"], input[name="username"]').first();
    const pwInput = page.locator('input[type="password"]').first();

    if (await emailInput.count() > 0) {
      log("Login", "filling email field");
      await emailInput.fill(USERNAME);
    } else if (await textInput.count() > 0) {
      log("Login", "filling text/username field");
      await textInput.fill(USERNAME);
    } else {
      throw new Error("No username/email field found on login page");
    }

    await page.waitForTimeout(500);

    if (await pwInput.count() > 0) {
      await pwInput.fill(PASSWORD);
      await page.waitForTimeout(500);
      await pwInput.press("Enter");
    } else {
      throw new Error("No password field found on login page");
    }

    await waitForSettle(page, 2000);
    log("Login", `landed at ${page.url()}`);

    // ── STEP 2: Today page — slow scroll ─────────────────────────────────────
    log("STEP 2", "Today page — navigate and observe");

    // Navigate to root (Today) if we aren't already there
    const currentUrl = page.url();
    if (!currentUrl.endsWith("/") && !currentUrl.endsWith(BASE_URL)) {
      await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT });
    }
    await waitForSettle(page, 2000);
    log("Today page", "observing nutrition ring and recovery card");

    // Pause to let the viewer see the top of the page
    await page.waitForTimeout(2000);

    // Slowly scroll down — 2–3 seconds of scrolling
    log("Today page", "slow scroll down");
    await smoothScroll(page, 1200, 12, 220);

    // Pause mid-page to observe recovery card / meals
    await page.waitForTimeout(1500);

    // Continue scrolling to bottom
    await smoothScroll(page, 800, 8, 200);
    await page.waitForTimeout(1000);

    // Scroll back to top
    await scrollToTop(page);
    await page.waitForTimeout(1000);

    // ── STEP 3: Log page — observe meal list and summary cards ───────────────
    log("STEP 3", "Log page");

    // Find and click the Log nav link
    const logLink = page.locator('a[href="/log"], a[href*="/log"]').first();
    if (await logLink.count() > 0) {
      await logLink.click();
    } else {
      await page.goto(`${BASE_URL}/log`, { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT });
    }
    await waitForSettle(page, 2000);
    log("Log page", `landed at ${page.url()}`);

    // Pause to observe summary cards at top
    await page.waitForTimeout(2000);

    // Scroll down to see meal list
    await smoothScroll(page, 800, 8, 200);
    await page.waitForTimeout(1500);

    // Scroll back up
    await scrollToTop(page);
    await page.waitForTimeout(1000);

    // ── STEP 4: Switch to Text mode — type meal ───────────────────────────────
    log("STEP 4", "Log > Text mode — type meal description");

    // Look for a Text / tab button on the log page
    const textModeBtn = page.locator(
      'button:has-text("Text"), [role="tab"]:has-text("Text"), button:has-text("text"), a:has-text("Text")'
    ).first();

    if (await textModeBtn.count() > 0) {
      log("Text mode", "clicking Text tab/button");
      await textModeBtn.click();
      await page.waitForTimeout(1000);
    } else {
      // Try looking for an Add / Log button that might reveal a text input
      const addBtn = page.locator('button').filter({ hasText: /add|log meal|new/i }).first();
      if (await addBtn.count() > 0) {
        log("Text mode", "clicking add/log button to open input");
        await addBtn.click();
        await page.waitForTimeout(1000);
      }
    }

    // Find text area or text input and type the meal
    const mealTextArea = page.locator("textarea").first();
    const mealInput = page.locator('input[type="text"]').first();

    const mealDescription = "grilled chicken breast, 1 cup white rice, steamed broccoli";

    if (await mealTextArea.count() > 0) {
      log("Text mode", "typing into textarea");
      await mealTextArea.click();
      await page.waitForTimeout(300);
      await mealTextArea.fill(mealDescription);
    } else if (await mealInput.count() > 0) {
      log("Text mode", "typing into text input");
      await mealInput.click();
      await page.waitForTimeout(300);
      await mealInput.fill(mealDescription);
    } else {
      log("Text mode", "WARNING: no text input found — skipping typing step");
    }

    // Wait for analyze button to appear (up to 4s)
    await page.waitForTimeout(500);
    const analyzeBtn = page.locator(
      'button:has-text("Analyze"), button:has-text("analyze"), button:has-text("Submit"), button:has-text("Log"), button[type="submit"]'
    ).first();

    if (await analyzeBtn.count() > 0) {
      log("Text mode", "analyze/submit button visible — pausing to observe");
      await page.waitForTimeout(2000);
    } else {
      log("Text mode", "analyze button not found — waiting 2s");
      await page.waitForTimeout(2000);
    }

    // ── STEP 5: Nutrition (history) tab ───────────────────────────────────────
    log("STEP 5", "Nutrition history tab");

    // Look for a Nutrition or History tab on the log page
    const nutritionTab = page.locator(
      'a[href*="nutrition"], a[href*="history"], [role="tab"]:has-text("History"), [role="tab"]:has-text("Nutrition"), button:has-text("History"), button:has-text("Nutrition")'
    ).first();

    if (await nutritionTab.count() > 0) {
      log("Nutrition tab", "clicking Nutrition/History tab");
      await nutritionTab.click();
      await waitForSettle(page, 1500);
    } else {
      // Try navigating directly to /history
      log("Nutrition tab", "no tab found — navigating to /history");
      await page.goto(`${BASE_URL}/history`, { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT });
      await waitForSettle(page, 1500);
    }

    log("Nutrition tab", `landed at ${page.url()}`);

    // Observe day groupings — scroll slowly
    await page.waitForTimeout(1500);
    await smoothScroll(page, 700, 7, 220);
    await page.waitForTimeout(1000);
    await scrollToTop(page);
    await page.waitForTimeout(800);

    // ── STEP 6: Training page ─────────────────────────────────────────────────
    log("STEP 6", "Training page");

    const trainingLink = page.locator('a[href="/training"], a[href*="/training"]').first();
    if (await trainingLink.count() > 0) {
      await trainingLink.click();
    } else {
      await page.goto(`${BASE_URL}/training`, { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT });
    }
    await waitForSettle(page, 2000);
    log("Training page", `landed at ${page.url()}`);

    // Pause to observe top content
    await page.waitForTimeout(2000);

    // Scroll through
    await smoothScroll(page, 1000, 10, 200);
    await page.waitForTimeout(1500);
    await smoothScroll(page, 600, 6, 180);
    await page.waitForTimeout(1000);
    await scrollToTop(page);
    await page.waitForTimeout(800);

    // ── STEP 7: Settings page ─────────────────────────────────────────────────
    log("STEP 7", "Settings page");

    const settingsLink = page.locator('a[href="/settings"], a[href*="/settings"]').first();
    if (await settingsLink.count() > 0) {
      await settingsLink.click();
    } else {
      await page.goto(`${BASE_URL}/settings`, { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT });
    }
    await waitForSettle(page, 2000);
    log("Settings page", `landed at ${page.url()}`);

    // Pause at top
    await page.waitForTimeout(2000);

    // Scroll through settings
    await smoothScroll(page, 800, 8, 200);
    await page.waitForTimeout(1500);
    await smoothScroll(page, 500, 5, 180);
    await page.waitForTimeout(1000);
    await scrollToTop(page);
    await page.waitForTimeout(800);

    // ── STEP 8: Return to Today page — final scroll ───────────────────────────
    log("STEP 8", "Return to Today page — final scroll");

    const homeLink = page.locator('a[href="/"], nav a').first();
    if (await homeLink.count() > 0) {
      await homeLink.click();
    } else {
      await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT });
    }
    await waitForSettle(page, 2000);
    log("Today page (final)", `landed at ${page.url()}`);

    // Final pause at top
    await page.waitForTimeout(2000);

    // Final slow scroll down
    await smoothScroll(page, 1500, 15, 200);
    await page.waitForTimeout(1500);

    // Scroll back to top and hold
    await scrollToTop(page);
    await page.waitForTimeout(3000);

    sessionComplete = true;
    log("SESSION COMPLETE", "all 8 steps finished");

  } catch (err: unknown) {
    failedStep = "unknown";
    if (err instanceof Error) {
      failedError = err.message;
      // Try to extract the step from stack or rethrow context
      const currentPageUrl = page.url();
      failedStep = currentPageUrl;
      log("SESSION FAILED", `at ${currentPageUrl} — ${err.message}`);
    }
  } finally {
    // Close page first so the video is flushed
    await page.close();
    await context.close();
    await browser.close();

    // Find the video file
    const recordings = fs.readdirSync(RECORDINGS_DIR)
      .filter((f: string) => f.endsWith(".webm"))
      .map((f: string) => ({
        name: f,
        mtime: fs.statSync(path.join(RECORDINGS_DIR, f)).mtimeMs,
      }))
      .sort((a: { name: string; mtime: number }, b: { name: string; mtime: number }) => b.mtime - a.mtime);

    const videoFile = recordings[0]
      ? path.join(RECORDINGS_DIR, recordings[0].name)
      : null;

    console.log("\n========================================");
    console.log("SESSION RECORDING SUMMARY");
    console.log("========================================");
    console.log(`Status:       ${sessionComplete ? "COMPLETE" : "FAILED"}`);
    if (!sessionComplete) {
      console.log(`Failed at:    ${failedStep}`);
      console.log(`Error:        ${failedError}`);
    }
    console.log(`Video file:   ${videoFile || "(not found)"}`);
    if (videoFile) {
      const size = fs.statSync(videoFile).size;
      console.log(`Video size:   ${(size / 1024 / 1024).toFixed(2)} MB`);
    }
    console.log(`JS errors:    ${jsErrors.length}`);
    if (jsErrors.length > 0) {
      jsErrors.slice(0, 5).forEach((e, i) => console.log(`  [${i + 1}] ${e}`));
    }
    console.log("========================================\n");

    if (!sessionComplete) {
      process.exit(1);
    }
  }
}

main().catch((err) => {
  console.error("Recording script failed:", err);
  process.exit(1);
});
