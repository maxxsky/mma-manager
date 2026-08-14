// Browser smoke test — catches runtime errors that unit tests cannot see.
//
// Unit tests exercise the engine (pure JS). Nothing exercises the React layer,
// so a crash like "up is not defined" survives a fully green suite. This script
// drives a real browser: it opens every tab, advances a number of weeks, and
// fails on the first console error or uncaught exception.
//
// Usage:  node tools/smoke.mjs [weeks]
// Env:    CHROME_PATH   path to a Chrome/Chromium binary (auto-detected if unset)
//         SMOKE_HEADFUL set to 1 to watch it run

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import puppeteer from "puppeteer-core";

const WEEKS = Number(process.argv[2] || 30);
const PORT = 4319;
const APP_URL = `http://localhost:${PORT}`;

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  "/opt/google/chrome/chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
  "/usr/bin/google-chrome",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
].filter(Boolean);

const chromePath = CHROME_CANDIDATES.find((p) => existsSync(p));
if (!chromePath) {
  console.error("No Chrome binary found. Set CHROME_PATH to one.");
  console.error("Tried:\n  " + CHROME_CANDIDATES.join("\n  "));
  process.exit(2);
}

// Tabs are keyed by the aria-label the sidebar renders (an i18n key).
const TABS = [
  "UI.dashboard", "UI.roster", "UI.rankings", "UI.scout", "UI.inbox",
  "UI.finance", "UI.promoters", "UI.facility", "UI.rivals",
  "UI.achievements", "UI.dynasty", "UI.world",
];

// Console noise that is not a real failure.
// "Failed to load resource" is deliberately ignored here: it carries no origin
// information, and every real instance is already reported by the network
// listener below, which only flags same-origin failures. Third-party assets
// (web fonts, analytics) may legitimately be blocked by a sandbox or firewall
// and must not fail the run.
const IGNORE = [
  /favicon/i,
  /Download the React DevTools/i,
  /Failed to load resource/i,
];

const problems = [];
const note = (kind, where, text) => {
  if (IGNORE.some((re) => re.test(text))) return;
  problems.push({ kind, where, text });
};

function waitForServer(url, timeoutMs = 60000) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const poll = async () => {
      try {
        const res = await fetch(url);
        if (res.ok) return resolve();
      } catch { /* not up yet */ }
      if (Date.now() > deadline) return reject(new Error("preview server never came up"));
      setTimeout(poll, 300);
    };
    poll();
  });
}

// Dismisses whatever modal is on screen. Returns true if it dismissed something.
async function dismissModal(page) {
  return page.evaluate(() => {
    const wanted = ["ok", "got it", "noted", "mengerti", "legendary", "impressive"];
    const btns = [...document.querySelectorAll("button")];
    const hit = btns.find((b) => wanted.includes((b.textContent || "").trim().toLowerCase()));
    if (hit) { hit.click(); return true; }
    // Weekly summary closes by clicking its backdrop.
    const backdrop = [...document.querySelectorAll("div")].find((d) => {
      const s = getComputedStyle(d);
      return s.position === "fixed" && s.zIndex === "50";
    });
    if (backdrop) { backdrop.click(); return true; }
    return false;
  });
}

// Clicks the first enabled button whose visible text matches any candidate
// (case-insensitive substring). Labels are given in both EN and ID because
// the app's language toggle is user state we do not control here.
async function clickByText(page, candidates) {
  return page.evaluate((cands) => {
    const norm = (x) => (x || "").trim().toLowerCase();
    const wanted = cands.map(norm);
    const btns = [...document.querySelectorAll("button")];
    const hit = btns.find((b) => {
      if (b.disabled) return false;
      const t = norm(b.textContent);
      return wanted.some((w) => t.includes(w));
    });
    if (!hit) return false;
    hit.click();
    return true;
  }, candidates);
}

const L = {
  accept:    ["accept", "terima"],
  staredown: ["continue to weigh-in", "lanjut ke penimbangan"],
  ringBell:  ["ring the bell", "bunyikan bel"],
  endRound:  ["end of round", "akhir ronde"],
  seeFinish: ["see the finish", "lihat akhir pertarungan"],
  seeResult: ["see the result", "lihat hasil"],
  decision:  ["go to decision", "ke keputusan"],
  backToCamp:["back to camp", "kembali ke camp"],
  enterCage: ["enter the cage"],
  cornerAny: ["push the pace", "work the body", "conserve", "dorong", "serang badan", "hemat"],
};

// Walks a booked fight end to end. Returns "completed" | "not-started" | "stalled".
async function playFight(page, setPhase) {
  setPhase("fight:prep");
  if (!(await clickByText(page, L.enterCage))) return "not-started";
  await new Promise((r) => setTimeout(r, 500));

  setPhase("fight:staredown");
  // Attitude must be picked before Continue enables.
  await page.evaluate(() => {
    const chips = [...document.querySelectorAll("button.chip")];
    if (chips.length) chips[0].click();
  });
  await new Promise((r) => setTimeout(r, 250));
  await clickByText(page, L.staredown);
  await new Promise((r) => setTimeout(r, 400));

  setPhase("fight:weighin");
  // A game plan may already be seeded from the booking; pick one anyway.
  await page.evaluate(() => {
    const chips = [...document.querySelectorAll("button.chip")];
    if (chips.length) chips[0].click();
  });
  await new Promise((r) => setTimeout(r, 250));
  await clickByText(page, L.ringBell);
  await new Promise((r) => setTimeout(r, 900));

  // Rounds, corner decisions, knockdown and result screens, in whatever order
  // the simulation produces them. Bounded so a stuck fight cannot hang the run.
  for (let step = 0; step < 60; step++) {
    setPhase(`fight:step${step}`);
    const done = await clickByText(page, L.backToCamp);
    if (done) { await new Promise((r) => setTimeout(r, 600)); return "completed"; }

    const moved =
      (await clickByText(page, L.seeResult)) ||
      (await clickByText(page, L.seeFinish)) ||
      (await clickByText(page, L.endRound)) ||
      (await clickByText(page, L.decision)) ||
      (await clickByText(page, L.cornerAny));

    await new Promise((r) => setTimeout(r, moved ? 500 : 900));
  }
  return "stalled";
}

let server;
let browser;
let exitCode = 0;

try {
  console.log(`Chrome:  ${chromePath}`);
  console.log(`Weeks:   ${WEEKS}`);

  server = spawn("npx", ["vite", "preview", "--port", String(PORT), "--strictPort"], {
    cwd: new URL("../app/", import.meta.url).pathname,
    stdio: "ignore",
  });
  await waitForServer(APP_URL);
  console.log(`Server:  ${APP_URL}\n`);

  browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: !process.env.SMOKE_HEADFUL,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });

  const page = await browser.newPage();
  let phase = "boot";
  const setPhase = (p) => { phase = p; };

  page.on("console", (msg) => {
    if (msg.type() === "error") note("console.error", phase, msg.text());
  });
  page.on("pageerror", (err) => note("uncaught", phase, err.message));
  page.on("requestfailed", (req) => {
    // Only our own assets matter. A blocked web font is an environment issue.
    if (!req.url().startsWith(APP_URL)) return;
    note("network", phase, `${req.failure()?.errorText} ${req.url()}`);
  });

  // Always start from a clean save so runs are reproducible.
  await page.goto(APP_URL, { waitUntil: "networkidle2" });
  await page.evaluate(() => localStorage.clear());
  await page.goto(APP_URL, { waitUntil: "networkidle2" });
  await new Promise((r) => setTimeout(r, 1500));

  // --- Pass 1: every tab renders -------------------------------------------
  for (const tab of TABS) {
    phase = `tab:${tab}`;
    const sel = `[aria-label="${tab}"]`;
    const el = await page.$(sel);
    if (!el) { note("missing", phase, `no nav item with aria-label="${tab}"`); continue; }
    await el.click();
    await new Promise((r) => setTimeout(r, 400));
    const blank = await page.evaluate(() => document.body.innerText.trim().length < 40);
    if (blank) note("blank", phase, "page rendered almost no text — likely a crashed render");
    console.log(`  tab ok   ${tab}`);
  }

  // --- Pass 2: advance week after week --------------------------------------
  await page.click('[aria-label="UI.dashboard"]');
  await new Promise((r) => setTimeout(r, 300));

  for (let w = 1; w <= WEEKS; w++) {
    phase = `week:${w}`;
    const before = problems.length;

    // Clear anything blocking input, then advance via the Space shortcut.
    for (let i = 0; i < 6; i++) {
      if (!(await dismissModal(page))) break;
      await new Promise((r) => setTimeout(r, 200));
    }
    await page.keyboard.press("Space");
    await new Promise((r) => setTimeout(r, 700));

    const week = await page.evaluate(() => {
      const m = document.body.innerText.match(/Y(\d+)\s*·\s*M(\d+)\s*·\s*W(\d+)/);
      return m ? `Y${m[1]} M${m[2]} W${m[3]}` : "?";
    });
    const fresh = problems.length - before;
    console.log(`  week ${String(w).padStart(3)}  ${week}${fresh ? `   ${fresh} PROBLEM(S)` : ""}`);
  }

  // --- Pass 2b: accept a fight and play it to the final bell ----------------
  // This is the point of the whole script. FightNight is the most complex UI
  // in the game and nothing else exercises it.
  let fightsPlayed = 0;
  for (let attempt = 1; attempt <= 40 && fightsPlayed < 2; attempt++) {
    phase = `fight-hunt:${attempt}`;
    for (let i = 0; i < 6; i++) {
      if (!(await dismissModal(page))) break;
      await new Promise((r) => setTimeout(r, 200));
    }

    // Take any offer sitting in the inbox.
    await page.click('[aria-label="UI.inbox"]');
    await new Promise((r) => setTimeout(r, 400));
    if (await clickByText(page, L.accept)) {
      await new Promise((r) => setTimeout(r, 400));
      console.log(`  accepted a fight offer (attempt ${attempt})`);
    }

    await page.click('[aria-label="UI.dashboard"]');
    await new Promise((r) => setTimeout(r, 300));

    const outcome = await playFight(page, setPhase);
    if (outcome === "completed") {
      fightsPlayed++;
      console.log(`  FIGHT ${fightsPlayed} played to completion`);
      continue;
    }
    if (outcome === "stalled") {
      note("stalled", phase, "FightNight did not reach a result within 60 steps");
      break;
    }

    phase = `fight-hunt:${attempt}`;
    await page.keyboard.press("Space");
    await new Promise((r) => setTimeout(r, 700));
  }
  if (fightsPlayed === 0) {
    note("coverage", "fight", "no fight was played — FightNight went untested this run");
  }

  // --- Pass 3: tabs again, now with a populated world -----------------------
  for (const tab of TABS) {
    phase = `tab-late:${tab}`;
    const el = await page.$(`[aria-label="${tab}"]`);
    if (!el) continue;
    await el.click();
    await new Promise((r) => setTimeout(r, 400));
  }
  console.log("  tabs re-checked after simulation");
} catch (err) {
  problems.push({ kind: "harness", where: "runner", text: err.message });
} finally {
  if (browser) await browser.close().catch(() => {});
  if (server) server.kill();
}

console.log("\n" + "=".repeat(64));
if (problems.length === 0) {
  console.log("SMOKE PASSED — no console errors, no uncaught exceptions.");
} else {
  exitCode = 1;
  console.log(`SMOKE FAILED — ${problems.length} problem(s):\n`);
  const seen = new Set();
  for (const p of problems) {
    const key = `${p.kind}|${p.text.slice(0, 120)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    console.log(`  [${p.kind}] at ${p.where}`);
    console.log(`    ${p.text.split("\n")[0].slice(0, 300)}\n`);
  }
  if (seen.size < problems.length) {
    console.log(`  (${problems.length - seen.size} duplicate occurrence(s) collapsed)`);
  }
}
console.log("=".repeat(64));
process.exit(exitCode);
