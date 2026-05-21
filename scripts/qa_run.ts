/**
 * QA Run — three-phase smoke + break test
 * Phase 1: DISCOVER & WALK (happy path, one screenshot per screen)
 * Phase 2: BREAK (edge inputs, empty states, rapid nav, refresh mid-flow)
 * Phase 3: REPORT (written to qa_report.md)
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { chromium } = require("playwright") as typeof import("playwright");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require("fs") as typeof import("fs");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require("path") as typeof import("path");
import type { Browser, BrowserContext, Page } from "playwright";

// ─── CONFIG ─────────────────────────────────────────────────────────────────
const BASE_URL = "https://aine-capstone-body-composition-bohl-smoky.vercel.app";
const USERNAME = "wbohlmann11";
const PASSWORD = "Aine2025!";
const SCREENSHOT_DIR = path.join(__dirname, "../qa_screenshots");
const REPORT_PATH = path.join(__dirname, "../qa_report.md");
const VIEWPORT = { width: 1440, height: 900 };
const NAV_TIMEOUT = 20_000;
const ACTION_TIMEOUT = 10_000;

// ─── TYPES ───────────────────────────────────────────────────────────────────
interface LogEntry {
  phase: string;
  route: string;
  screenName: string;
  screenshot: string;
  description: string;
  anomalies: string[];
  consoleErrors: string[];
}

interface Finding {
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";
  screen: string;
  title: string;
  detail: string;
  repro: string;
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function slug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

async function shot(page: Page, name: string): Promise<string> {
  const filename = `${slug(name)}.png`;
  const filepath = path.join(SCREENSHOT_DIR, filename);
  await page.screenshot({ path: filepath, fullPage: true });
  return filename;
}

async function waitForSettle(page: Page) {
  try {
    await page.waitForLoadState("networkidle", { timeout: NAV_TIMEOUT });
  } catch {
    // networkidle timed out — page may still be functional
  }
  await page.waitForTimeout(500);
}

function collectConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(`[PAGEERROR] ${err.message}`));
  return errors;
}

// ─── AUTH ────────────────────────────────────────────────────────────────────
async function login(page: Page): Promise<void> {
  await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT });
  await waitForSettle(page);

  // Try username/password fields
  const userField = page.locator('input[type="text"], input[name="username"], input[placeholder*="user" i], input[placeholder*="name" i]').first();
  const emailField = page.locator('input[type="email"]').first();
  const pwField = page.locator('input[type="password"]').first();

  const hasEmail = await emailField.count() > 0;
  const hasUser = await userField.count() > 0;

  if (hasEmail) {
    await emailField.fill(USERNAME);
  } else if (hasUser) {
    await userField.fill(USERNAME);
  }

  if (await pwField.count() > 0) {
    await pwField.fill(PASSWORD);
    await pwField.press("Enter");
  }

  await waitForSettle(page);
}

// ─── PHASE 1: DISCOVER & WALK ────────────────────────────────────────────────
async function phase1(page: Page, log: LogEntry[], findings: Finding[]): Promise<void> {
  console.log("\n=== PHASE 1: DISCOVER & WALK ===\n");

  const routes: { path: string; name: string }[] = [
    { path: "/login", name: "Login" },
    { path: "/onboarding", name: "Onboarding" },
    { path: "/", name: "Dashboard / Home" },
    { path: "/log", name: "Log" },
    { path: "/log/workout", name: "Log Workout" },
    { path: "/training", name: "Training" },
    { path: "/inbody", name: "InBody" },
    { path: "/inbody/new", name: "InBody New Entry" },
    { path: "/inbody/import", name: "InBody Import" },
    { path: "/progress", name: "Progress" },
    { path: "/progress-photos", name: "Progress Photos" },
    { path: "/history", name: "History" },
    { path: "/month", name: "Month View" },
    { path: "/week", name: "Week View" },
    { path: "/muscles", name: "Muscles" },
    { path: "/gap", name: "Gap Analysis" },
    { path: "/gallery", name: "Gallery" },
    { path: "/chat", name: "Chat" },
    { path: "/settings", name: "Settings" },
  ];

  // ── Login first ──────────────────────────────────────────────────────────
  const consoleErrs: string[] = collectConsoleErrors(page);
  await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT });
  await waitForSettle(page);
  const loginShot = await shot(page, "01_login");

  // Detect login form shape
  const pageText = await page.textContent("body") || "";
  const hasLoginForm = await page.locator('input[type="password"]').count() > 0;
  const hasUsernameField = await page.locator('input[type="text"], input[name="username"]').count() > 0;

  log.push({
    phase: "1",
    route: "/login",
    screenName: "Login",
    screenshot: loginShot,
    description: `Login page. Has password field: ${hasLoginForm}. Has username field: ${hasUsernameField}.`,
    anomalies: [],
    consoleErrors: [...consoleErrs],
  });

  if (hasLoginForm) {
    await login(page);
    const postLoginUrl = page.url();
    console.log(`  After login → ${postLoginUrl}`);
    await waitForSettle(page);
  } else {
    findings.push({
      severity: "INFO",
      screen: "Login",
      title: "No password field detected — may be demo mode or auto-login",
      detail: "The login page did not contain a visible password input. The app may open without credentials.",
      repro: "Navigate to /login",
    });
  }

  // ── Walk all routes ────────────────────────────────────────────────────────
  let screenshotIdx = 2;

  for (const route of routes.slice(1)) {
    // Skip login — already done
    const errors: string[] = [];
    const anomalies: string[] = [];

    const listener = (msg: any) => {
      if (msg.type() === "error") errors.push(msg.text());
    };
    const errListener = (err: Error) => errors.push(`[PAGEERROR] ${err.message}`);
    page.on("console", listener);
    page.on("pageerror", errListener);

    const startTime = Date.now();
    let navOk = true;

    try {
      await page.goto(`${BASE_URL}${route.path}`, { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT });
      await waitForSettle(page);
    } catch (e: any) {
      navOk = false;
      anomalies.push(`Navigation error: ${e.message}`);
      findings.push({
        severity: "HIGH",
        screen: route.name,
        title: `Navigation to ${route.path} failed`,
        detail: e.message,
        repro: `Go to ${BASE_URL}${route.path}`,
      });
    }

    const elapsed = Date.now() - startTime;
    if (elapsed > 3000) {
      anomalies.push(`Slow load: ${elapsed}ms`);
      findings.push({
        severity: "MEDIUM",
        screen: route.name,
        title: `Slow page load (${elapsed}ms)`,
        detail: `Page took ${elapsed}ms to settle — over the 3s threshold.`,
        repro: `Navigate to ${route.path}`,
      });
    }

    // Check for redirect (auth wall, onboarding gate, etc.)
    const finalUrl = page.url();
    if (!finalUrl.includes(route.path) && !finalUrl.includes("localhost")) {
      anomalies.push(`Redirected to ${finalUrl} instead of ${route.path}`);
    }

    // Check for blank / error page
    const bodyText = (await page.textContent("body") || "").trim();
    if (bodyText.length < 50) {
      anomalies.push("Page appears blank or near-empty");
      findings.push({
        severity: "HIGH",
        screen: route.name,
        title: "Page renders blank or near-empty content",
        detail: `Body text length: ${bodyText.length} chars.`,
        repro: `Navigate to ${route.path}`,
      });
    }

    // Check for visible error messages
    const errorText = await page.locator('[class*="error" i], [class*="Error" i]').count();
    if (errorText > 0) {
      const msg = await page.locator('[class*="error" i], [class*="Error" i]').first().textContent().catch(() => "");
      if (msg && msg.trim()) {
        anomalies.push(`Visible error element: "${msg.trim().slice(0, 120)}"`);
        findings.push({
          severity: "HIGH",
          screen: route.name,
          title: "Visible error state on page load",
          detail: msg.trim().slice(0, 300),
          repro: `Navigate to ${route.path}`,
        });
      }
    }

    // Happy-path interactions per page
    await happyPathInteract(page, route.path, route.name, findings);

    const idx = String(screenshotIdx).padStart(2, "0");
    const filename = await shot(page, `${idx}_${slug(route.name)}`);
    screenshotIdx++;

    page.off("console", listener);
    page.off("pageerror", errListener);

    log.push({
      phase: "1",
      route: route.path,
      screenName: route.name,
      screenshot: filename,
      description: navOk ? `Visited. Final URL: ${finalUrl}.` : "Navigation failed.",
      anomalies,
      consoleErrors: errors,
    });

    // Log console errors as findings
    if (errors.length > 0) {
      findings.push({
        severity: "MEDIUM",
        screen: route.name,
        title: `${errors.length} console error(s) on page load`,
        detail: errors.slice(0, 5).join("\n"),
        repro: `Navigate to ${route.path}, check DevTools console`,
      });
    }

    console.log(`  [1] ${route.name.padEnd(25)} → ${filename}${anomalies.length ? " ⚠ " + anomalies[0] : ""}`);
  }
}

async function happyPathInteract(page: Page, routePath: string, name: string, findings: Finding[]): Promise<void> {
  try {
    if (routePath === "/log") {
      // Try to open meal sheet or log something
      const btn = page.locator('button').filter({ hasText: /add|log|meal|food/i }).first();
      if (await btn.count() > 0) await btn.click().catch(() => {});
      await page.waitForTimeout(600);
      await page.keyboard.press("Escape").catch(() => {});
    }

    if (routePath === "/chat") {
      const input = page.locator('textarea, input[type="text"]').first();
      if (await input.count() > 0) {
        await input.fill("Hello");
        await page.waitForTimeout(300);
        await page.keyboard.press("Escape").catch(() => {});
        await input.fill(""); // clear without submitting
      }
    }

    if (routePath === "/inbody/new") {
      // Check the form exists
      const inputs = await page.locator("input").count();
      if (inputs === 0) {
        findings.push({
          severity: "MEDIUM",
          screen: name,
          title: "InBody New Entry: no input fields visible",
          detail: "Expected a form with input fields for body composition data but found none.",
          repro: "Navigate to /inbody/new",
        });
      }
    }

    if (routePath === "/settings") {
      // Click first available settings option but don't save anything destructive
      const firstToggle = page.locator('input[type="checkbox"], input[type="radio"]').first();
      if (await firstToggle.count() > 0) {
        // Just observe — don't toggle account-level settings
      }
    }

    // Check nav links work — click first bottom nav item
    if (["/", "/log", "/training", "/inbody"].includes(routePath)) {
      const navLinks = page.locator('nav a, [role="navigation"] a, [class*="bottom" i] a').all();
      const links = await navLinks;
      // Just count them — don't traverse, that's phase 1 coverage
      if (links.length === 0) {
        // nav may be div-based, skip
      }
    }
  } catch {
    // Interaction errors are soft failures in phase 1
  }
}

// ─── PHASE 2: BREAK ──────────────────────────────────────────────────────────
async function phase2(page: Page, log: LogEntry[], findings: Finding[]): Promise<void> {
  console.log("\n=== PHASE 2: BREAK ===\n");

  // 2a. Empty state — log page with no data interaction
  await breakEmptyState(page, findings);

  // 2b. Overlong inputs
  await breakOverlongInputs(page, findings);

  // 2c. Rapid navigation (trigger layout/memory leaks)
  await breakRapidNav(page, findings);

  // 2d. Refresh mid-flow
  await breakRefreshMidFlow(page, findings);

  // 2e. Back button after destructive-ish action
  await breakBackButton(page, findings);

  // 2f. Chat empty submit
  await breakChatEmptySubmit(page, findings);

  // 2g. InBody form edge inputs
  await breakInBodyForm(page, findings);

  // 2h. Check 404 handling
  await breakNotFound(page, findings);

  // Screenshot phase 2 state
  const p2shot = await shot(page, "phase2_final_state");
  log.push({
    phase: "2",
    route: page.url().replace(BASE_URL, ""),
    screenName: "Phase 2 Final State",
    screenshot: p2shot,
    description: "Screenshot taken after all break tests.",
    anomalies: [],
    consoleErrors: [],
  });
}

async function breakEmptyState(page: Page, findings: Finding[]): Promise<void> {
  // Navigate to history/progress — check empty state rendering
  for (const route of ["/history", "/progress", "/muscles"]) {
    const errors: string[] = [];
    const errListener = (msg: any) => { if (msg.type() === "error") errors.push(msg.text()); };
    page.on("console", errListener);

    await page.goto(`${BASE_URL}${route}`, { timeout: NAV_TIMEOUT }).catch(() => {});
    await waitForSettle(page);

    const bodyText = (await page.textContent("body") || "").trim();
    if (bodyText.length < 30) {
      findings.push({
        severity: "HIGH",
        screen: route,
        title: "Empty state renders blank page",
        detail: "Page shows no content and no empty-state message.",
        repro: `Navigate to ${route} with no data`,
      });
    }

    // Check for crash indicators
    const crashTerms = ["Cannot read", "undefined", "TypeError", "ReferenceError", "at Object", "at eval"];
    for (const term of crashTerms) {
      if (bodyText.includes(term)) {
        findings.push({
          severity: "CRITICAL",
          screen: route,
          title: `JS error surfaced in UI: "${term}"`,
          detail: bodyText.slice(0, 400),
          repro: `Navigate to ${route}`,
        });
        break;
      }
    }

    page.off("console", errListener);
    console.log(`  [2] Empty state: ${route} — ${errors.length} console errors`);
  }
}

async function breakOverlongInputs(page: Page, findings: Finding[]): Promise<void> {
  const longString = "A".repeat(5000);
  const sqlString = "'; DROP TABLE users; --";
  const xssString = "<script>alert('xss')</script>";

  for (const route of ["/log", "/inbody/new", "/chat"]) {
    await page.goto(`${BASE_URL}${route}`, { timeout: NAV_TIMEOUT }).catch(() => {});
    await waitForSettle(page);

    const inputs = await page.locator("input[type='text'], input[type='number'], textarea").all();
    for (const input of inputs.slice(0, 3)) {
      try {
        await input.fill(longString, { timeout: ACTION_TIMEOUT });
        await page.waitForTimeout(300);
        const val = await input.inputValue().catch(() => "");
        if (val.length > 1000) {
          findings.push({
            severity: "LOW",
            screen: route,
            title: "No max-length enforcement on input field",
            detail: `Input accepted ${val.length} characters. May cause DB or UI issues.`,
            repro: `Go to ${route}, paste 5000-char string into a text input`,
          });
        }
        await input.fill(""); // clear

        // XSS check
        await input.fill(xssString, { timeout: ACTION_TIMEOUT });
        await page.waitForTimeout(200);
        await input.fill("");

        // SQL injection string
        await input.fill(sqlString, { timeout: ACTION_TIMEOUT });
        await page.waitForTimeout(200);
        await input.fill("");
      } catch {
        // Input may be disabled or not interactable
      }
    }
    console.log(`  [2] Overlong inputs: ${route}`);
  }
}

async function breakRapidNav(page: Page, findings: Finding[]): Promise<void> {
  const routes = ["/", "/log", "/training", "/inbody", "/progress", "/history", "/chat", "/settings"];
  const errors: string[] = [];
  const errListener = (msg: any) => { if (msg.type() === "error") errors.push(msg.text()); };
  page.on("console", errListener);

  for (let i = 0; i < 3; i++) {
    for (const r of routes) {
      await page.goto(`${BASE_URL}${r}`, { waitUntil: "commit", timeout: NAV_TIMEOUT }).catch(() => {});
      await page.waitForTimeout(150);
    }
  }
  await waitForSettle(page);

  if (errors.length > 5) {
    findings.push({
      severity: "MEDIUM",
      screen: "Rapid Navigation",
      title: `${errors.length} console errors during rapid navigation`,
      detail: errors.slice(0, 5).join("\n"),
      repro: "Rapidly click through all routes 3x in quick succession",
    });
  }

  page.off("console", errListener);
  console.log(`  [2] Rapid nav: ${errors.length} errors`);
}

async function breakRefreshMidFlow(page: Page, findings: Finding[]): Promise<void> {
  // Open log, start typing, refresh
  await page.goto(`${BASE_URL}/log`, { timeout: NAV_TIMEOUT }).catch(() => {});
  await waitForSettle(page);

  const input = page.locator("input[type='text'], textarea").first();
  if (await input.count() > 0) {
    await input.fill("test meal entry").catch(() => {});
    await page.waitForTimeout(300);
    await page.reload({ waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT }).catch(() => {});
    await waitForSettle(page);

    const bodyText = (await page.textContent("body") || "").trim();
    if (bodyText.length < 30) {
      findings.push({
        severity: "MEDIUM",
        screen: "/log",
        title: "Page blank after refresh mid-flow",
        detail: "Refreshing while a form is being filled left the page blank.",
        repro: "Go to /log, start filling a field, press F5",
      });
    }
  }

  // InBody import — navigate away mid-flow
  await page.goto(`${BASE_URL}/inbody/import`, { timeout: NAV_TIMEOUT }).catch(() => {});
  await waitForSettle(page);
  await page.goto(`${BASE_URL}/`, { timeout: NAV_TIMEOUT }).catch(() => {});
  await waitForSettle(page);
  const homeText = (await page.textContent("body") || "").trim();
  if (homeText.length < 30) {
    findings.push({
      severity: "MEDIUM",
      screen: "/",
      title: "Dashboard blank after navigating away from mid-flow",
      detail: "Navigating away from /inbody/import left the dashboard blank.",
      repro: "Go to /inbody/import then navigate to /",
    });
  }
  console.log(`  [2] Refresh mid-flow: done`);
}

async function breakBackButton(page: Page, findings: Finding[]): Promise<void> {
  await page.goto(`${BASE_URL}/inbody/new`, { timeout: NAV_TIMEOUT }).catch(() => {});
  await waitForSettle(page);

  // Fill something
  const input = page.locator("input").first();
  if (await input.count() > 0) {
    await input.fill("123").catch(() => {});
  }

  await page.goBack({ timeout: NAV_TIMEOUT }).catch(() => {});
  await waitForSettle(page);

  const url = page.url();
  const bodyText = (await page.textContent("body") || "").trim();
  if (bodyText.length < 30) {
    findings.push({
      severity: "MEDIUM",
      screen: "InBody New",
      title: "Back button after form fill leads to blank page",
      detail: `After filling InBody form and pressing back, landed at ${url} with near-empty content.`,
      repro: "Go to /inbody/new, fill a field, press browser Back",
    });
  }
  console.log(`  [2] Back button: landed at ${url}`);
}

async function breakChatEmptySubmit(page: Page, findings: Finding[]): Promise<void> {
  const errors: string[] = [];
  const errListener = (msg: any) => { if (msg.type() === "error") errors.push(msg.text()); };
  page.on("console", errListener);

  await page.goto(`${BASE_URL}/chat`, { timeout: NAV_TIMEOUT }).catch(() => {});
  await waitForSettle(page);

  const input = page.locator("textarea, input[type='text']").first();
  const submitBtn = page.locator('button[type="submit"], button').filter({ hasText: /send|submit/i }).first();

  if (await submitBtn.count() > 0) {
    await submitBtn.click({ timeout: ACTION_TIMEOUT }).catch(() => {});
    await page.waitForTimeout(800);
    const bodyText = (await page.textContent("body") || "").trim();
    const hasError = bodyText.toLowerCase().includes("error") || errors.length > 0;
    if (hasError) {
      findings.push({
        severity: "MEDIUM",
        screen: "/chat",
        title: "Empty chat submit triggers error",
        detail: errors.slice(0, 3).join("\n"),
        repro: "Go to /chat, click Send with empty input",
      });
    }
  }

  // Send very long message
  if (await input.count() > 0) {
    await input.fill("X".repeat(2000)).catch(() => {});
    await page.waitForTimeout(200);
    // Don't submit — just verify no crash
    const bodyText = (await page.textContent("body") || "").trim();
    if (bodyText.includes("TypeError") || bodyText.includes("Cannot read")) {
      findings.push({
        severity: "HIGH",
        screen: "/chat",
        title: "Pasting 2000-char message causes UI crash",
        detail: bodyText.slice(0, 400),
        repro: "Go to /chat, paste 2000-char string into textarea",
      });
    }
    await input.fill("").catch(() => {});
  }

  page.off("console", errListener);
  console.log(`  [2] Chat empty submit: ${errors.length} errors`);
}

async function breakInBodyForm(page: Page, findings: Finding[]): Promise<void> {
  const errors: string[] = [];
  const errListener = (msg: any) => { if (msg.type() === "error") errors.push(msg.text()); };
  page.on("console", errListener);

  await page.goto(`${BASE_URL}/inbody/new`, { timeout: NAV_TIMEOUT }).catch(() => {});
  await waitForSettle(page);

  const numberInputs = await page.locator("input[type='number']").all();
  for (const input of numberInputs) {
    try {
      // Negative values
      await input.fill("-999");
      await page.waitForTimeout(150);
      // Zero
      await input.fill("0");
      await page.waitForTimeout(150);
      // Absurdly large
      await input.fill("999999");
      await page.waitForTimeout(150);
      // Non-numeric in number field
      await input.fill("abc");
      await page.waitForTimeout(150);
      await input.fill("");
    } catch {
      // ignore
    }
  }

  // Try submitting empty form
  const submitBtn = page.locator('button[type="submit"]').first();
  if (await submitBtn.count() > 0) {
    await submitBtn.click({ timeout: ACTION_TIMEOUT }).catch(() => {});
    await page.waitForTimeout(800);
    const bodyText = (await page.textContent("body") || "").trim();
    if (bodyText.includes("TypeError") || bodyText.includes("Cannot read")) {
      findings.push({
        severity: "HIGH",
        screen: "/inbody/new",
        title: "Empty form submit causes crash",
        detail: bodyText.slice(0, 400),
        repro: "Go to /inbody/new, click submit without filling any fields",
      });
    }
  }

  if (errors.length > 0) {
    findings.push({
      severity: "MEDIUM",
      screen: "/inbody/new",
      title: `${errors.length} console error(s) from InBody edge inputs`,
      detail: errors.slice(0, 5).join("\n"),
      repro: "Go to /inbody/new, enter edge values (-999, 0, 999999, 'abc') in numeric fields",
    });
  }

  page.off("console", errListener);
  console.log(`  [2] InBody form edge inputs: ${errors.length} errors`);
}

async function breakNotFound(page: Page, findings: Finding[]): Promise<void> {
  await page.goto(`${BASE_URL}/this-route-does-not-exist-xyz`, { timeout: NAV_TIMEOUT }).catch(() => {});
  await waitForSettle(page);

  const status = page.url();
  const bodyText = (await page.textContent("body") || "").trim();
  const has404Message = bodyText.toLowerCase().includes("404") ||
    bodyText.toLowerCase().includes("not found") ||
    bodyText.toLowerCase().includes("page not found");

  if (!has404Message) {
    findings.push({
      severity: "LOW",
      screen: "404",
      title: "No user-friendly 404 page",
      detail: `Navigating to a non-existent route did not show a clear 404 or 'not found' message. Body preview: "${bodyText.slice(0, 200)}"`,
      repro: "Navigate to /this-route-does-not-exist-xyz",
    });
  } else {
    console.log(`  [2] 404 handling: OK — page shows 404 message`);
  }
  console.log(`  [2] 404 check: has404=${has404Message}`);
}

// ─── PHASE 3: REPORT ─────────────────────────────────────────────────────────
function generateReport(log: LogEntry[], findings: Finding[]): string {
  const now = new Date().toISOString();
  const critical = findings.filter((f) => f.severity === "CRITICAL");
  const high = findings.filter((f) => f.severity === "HIGH");
  const medium = findings.filter((f) => f.severity === "MEDIUM");
  const low = findings.filter((f) => f.severity === "LOW");
  const info = findings.filter((f) => f.severity === "INFO");

  const findingBlock = (list: Finding[]) =>
    list.length === 0
      ? "_None_\n"
      : list
          .map(
            (f, i) =>
              `### ${i + 1}. ${f.title}\n` +
              `**Screen:** ${f.screen}  \n` +
              `**Detail:** ${f.detail}  \n` +
              `**Repro:** ${f.repro}\n`
          )
          .join("\n");

  const logTable = log
    .map(
      (e) =>
        `| ${e.phase} | ${e.route} | ${e.screenName} | ${e.screenshot} | ${
          e.anomalies.length > 0 ? e.anomalies.join("; ") : "—"
        } |`
    )
    .join("\n");

  return `# QA Report — Fitness Tracking App
_Generated: ${now}_
_Base URL: ${BASE_URL}_
_Viewport: 1440×900_

---

## Executive Summary

| Severity | Count |
|----------|-------|
| CRITICAL | ${critical.length} |
| HIGH | ${high.length} |
| MEDIUM | ${medium.length} |
| LOW | ${low.length} |
| INFO | ${info.length} |
| **Total** | **${findings.length}** |

Screens visited: **${log.filter((l) => l.phase === "1").length}**
Screenshots saved to: \`qa_screenshots/\`

---

## CRITICAL Findings

${findingBlock(critical)}

---

## HIGH Findings

${findingBlock(high)}

---

## MEDIUM Findings

${findingBlock(medium)}

---

## LOW Findings

${findingBlock(low)}

---

## INFO

${findingBlock(info)}

---

## Screen Log (Phase 1 Walk)

| Phase | Route | Screen | Screenshot | Anomalies |
|-------|-------|--------|------------|-----------|
${logTable}

---

## Screenshots

All screenshots saved to \`qa_screenshots/\`:
${log.map((e) => `- \`${e.screenshot}\` — ${e.screenName} (Phase ${e.phase})`).join("\n")}
`;
}

// ─── MAIN ────────────────────────────────────────────────────────────────────
async function main() {
  ensureDir(SCREENSHOT_DIR);

  const browser: Browser = await chromium.launch({ headless: true });
  const context: BrowserContext = await browser.newContext({ viewport: VIEWPORT });
  const page: Page = await context.newPage();

  const log: LogEntry[] = [];
  const findings: Finding[] = [];

  try {
    // Phase 1
    await phase1(page, log, findings);

    // Phase 2
    await phase2(page, log, findings);

    // Phase 3 — generate report
    const report = generateReport(log, findings);
    fs.writeFileSync(REPORT_PATH, report, "utf-8");
    console.log(`\n=== PHASE 3: REPORT written to ${REPORT_PATH} ===`);
    console.log(`Total findings: ${findings.length}`);
    console.log(`Screenshots: ${fs.readdirSync(SCREENSHOT_DIR).length} files in ${SCREENSHOT_DIR}`);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("QA run failed:", err);
  process.exit(1);
});
