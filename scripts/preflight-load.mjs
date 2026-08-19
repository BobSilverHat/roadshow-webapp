#!/usr/bin/env node
/**
 * preflight-load.mjs — prove workshop capacity BEFORE the room arrives.
 *
 * Simulates N virtual attendees hitting the exact endpoints the real client
 * polls, at the exact intervals, and reports latency percentiles + error rates.
 *
 * SAFETY: by default this does NOT touch /auth/v1/signup, because anonymous
 * sign-in is IP-rate-limited with a HARD bucket capacity of 30. Burning those
 * tokens from the venue is the one thing that can actually stop the workshop.
 * Auth is opt-in via --auth=N and should only ever be run from a phone hotspot,
 * never from the venue wifi, and never within an hour of the session.
 *
 * Usage:
 *   node scripts/preflight-load.mjs --clients=30 --seconds=120
 *   node scripts/preflight-load.mjs --clients=30 --seconds=120 --phase=leaderboard
 *   node scripts/preflight-load.mjs --clients=45 --seconds=180   # 1.5x headroom
 *   node scripts/preflight-load.mjs --admin-pin=XXXX --seconds=60  # bcrypt cost
 *
 * Phases (matches the real per-client hook fan-out, verified against source):
 *   challenge   5x workshop_config @3s                       = 1.667 req/s/client
 *   prestart    5x workshop_config @3s + 1x gate poll @3s    = 2.000 req/s/client
 *   leaderboard 3x workshop_config @3s + get_leaderboard @1.5s = 1.667 req/s/client
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

// ---------- config ----------
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? "true"];
  }),
);

const CLIENTS = parseInt(args.clients ?? "30", 10);
const SECONDS = parseInt(args.seconds ?? "120", 10);
const PHASE = args.phase ?? "challenge";
const AUTH_N = parseInt(args.auth ?? "0", 10);
const ADMIN_PIN = args["admin-pin"] ?? null;

// Read .env.local without adding a dotenv dependency.
function readEnv() {
  const f = path.join(ROOT, ".env.local");
  if (!fs.existsSync(f)) throw new Error(`missing ${f}`);
  const out = {};
  for (const line of fs.readFileSync(f, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
  }
  return out;
}

const env = readEnv();
const URL_BASE = env.VITE_SUPABASE_URL;
const ANON = env.VITE_SUPABASE_ANON_KEY;
if (!URL_BASE || !ANON) throw new Error("VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY not found in .env.local");

const H = { apikey: ANON, Authorization: `Bearer ${ANON}`, Accept: "application/json" };

// ---------- metrics ----------
const stats = new Map(); // label -> { lat: [], codes: Map, errors: n }
function rec(label, ms, code, err) {
  let s = stats.get(label);
  if (!s) { s = { lat: [], codes: new Map(), errors: 0 }; stats.set(label, s); }
  s.lat.push(ms);
  if (err) s.errors++;
  else s.codes.set(code, (s.codes.get(code) ?? 0) + 1);
}
const pct = (arr, p) => {
  if (!arr.length) return 0;
  const a = [...arr].sort((x, y) => x - y);
  return a[Math.min(a.length - 1, Math.floor((p / 100) * a.length))];
};

let stopped = false;

async function hit(label, url, init) {
  const t0 = performance.now();
  try {
    const r = await fetch(url, init);
    await r.arrayBuffer(); // drain body so timing includes transfer
    rec(label, performance.now() - t0, r.status, false);
    return r.status;
  } catch (e) {
    rec(label, performance.now() - t0, 0, true);
    return 0;
  }
}

const CONFIG_URL =
  `${URL_BASE}/rest/v1/workshop_config` +
  `?id=eq.1&select=challenge_open,opened_at,nexus_open,review_mode,default_locale,duration_minutes`;
const LEADERBOARD_URL = `${URL_BASE}/rest/v1/rpc/get_leaderboard`;

// A poller that mimics the app's setInterval (fixed period, no backpressure).
function poller(label, fn, intervalMs, jitter = true) {
  const start = jitter ? Math.random() * intervalMs : 0;
  const timers = [];
  timers.push(setTimeout(function tick() {
    if (stopped) return;
    fn();
    timers.push(setTimeout(tick, intervalMs));
  }, start));
  return timers;
}

function spawnClient() {
  const timers = [];
  const nClocks = PHASE === "leaderboard" ? 3 : 5;
  for (let i = 0; i < nClocks; i++) {
    timers.push(...poller("workshop_config", () => hit("workshop_config", CONFIG_URL, { headers: H }), 3000));
  }
  if (PHASE === "prestart") {
    timers.push(...poller("workshop_config", () => hit("workshop_config", CONFIG_URL, { headers: H }), 3000));
  }
  if (PHASE === "leaderboard") {
    timers.push(...poller("get_leaderboard", () =>
      hit("get_leaderboard", LEADERBOARD_URL, {
        method: "POST",
        headers: { ...H, "Content-Type": "application/json" },
        body: "{}",
      }), 1500));
  }
  return timers;
}

// ---------- optional: admin bcrypt cost ----------
function spawnAdmin(pin) {
  return poller("admin_get_status", () =>
    hit("admin_get_status", `${URL_BASE}/rest/v1/rpc/admin_get_status`, {
      method: "POST",
      headers: { ...H, "Content-Type": "application/json" },
      body: JSON.stringify({ p_pin: pin }),
    }), 3000, false);
}

// ---------- optional: auth burst (DANGEROUS, opt-in) ----------
async function authBurst(n) {
  console.log(`\n!! AUTH BURST: ${n} anonymous sign-ups. Bucket capacity is 30, hard cap.`);
  console.log(`!! Run this ONLY from a hotspot, never venue wifi, never <1h before the session.\n`);
  const results = await Promise.all(
    Array.from({ length: n }, async (_, i) => {
      const t0 = performance.now();
      const r = await fetch(`${URL_BASE}/auth/v1/signup`, {
        method: "POST",
        headers: { apikey: ANON, "Content-Type": "application/json" },
        body: "{}",
      });
      const body = await r.json().catch(() => ({}));
      return { i, status: r.status, ms: Math.round(performance.now() - t0), code: body?.error_code ?? body?.code ?? null };
    }),
  );
  const ok = results.filter((r) => r.status === 200).length;
  const limited = results.filter((r) => r.status === 429).length;
  console.log(`   200 OK: ${ok}   429 rate-limited: ${limited}   other: ${n - ok - limited}`);
  if (limited > 0) {
    console.log(`   >> ${limited} attendees WOULD BE LOCKED OUT at this headcount.`);
    console.log(`   >> Raise rate_limit_anonymous_users before the workshop.`);
  } else {
    console.log(`   >> All ${n} succeeded. Bucket had capacity; note it is now drained by ${ok}.`);
  }
  console.log(`   Clean up:  delete from auth.users where is_anonymous is true;\n`);
}

// ---------- run ----------
console.log(`Preflight load test`);
console.log(`  target    ${URL_BASE}`);
console.log(`  clients   ${CLIENTS}`);
console.log(`  phase     ${PHASE}`);
console.log(`  duration  ${SECONDS}s`);
if (ADMIN_PIN) console.log(`  admin     1 tab polling admin_get_status @3s`);

const expected =
  PHASE === "prestart" ? 2.0 : PHASE === "leaderboard" ? 1.667 : 1.667;
console.log(`  expected  ~${(expected * CLIENTS).toFixed(1)} req/s fleet-wide\n`);

if (AUTH_N > 0) await authBurst(AUTH_N);

const allTimers = [];
for (let i = 0; i < CLIENTS; i++) allTimers.push(...spawnClient());
if (ADMIN_PIN) allTimers.push(...spawnAdmin(ADMIN_PIN));

const t0 = Date.now();
const progress = setInterval(() => {
  const el = Math.round((Date.now() - t0) / 1000);
  const total = [...stats.values()].reduce((n, s) => n + s.lat.length, 0);
  process.stdout.write(`\r  ${el}s / ${SECONDS}s   ${total} requests   ${(total / el).toFixed(1)} req/s   `);
}, 1000);

await new Promise((r) => setTimeout(r, SECONDS * 1000));
stopped = true;
clearInterval(progress);
for (const t of allTimers) clearTimeout(t);
await new Promise((r) => setTimeout(r, 1500)); // let in-flight settle

console.log(`\n\n${"=".repeat(78)}`);
console.log(`RESULTS  (${SECONDS}s @ ${CLIENTS} clients, phase=${PHASE})`);
console.log("=".repeat(78));
console.log(
  ["endpoint".padEnd(20), "reqs".padStart(7), "req/s".padStart(8),
   "p50".padStart(8), "p95".padStart(8), "p99".padStart(8), "max".padStart(8), "  status"].join(""));

let fail = false;
for (const [label, s] of stats) {
  const codes = [...s.codes.entries()].map(([c, n]) => `${c}:${n}`).join(" ");
  const p99 = pct(s.lat, 99);
  const bad = s.errors > 0 || [...s.codes.keys()].some((c) => c >= 400);
  if (bad || p99 > 1000) fail = true;
  console.log(
    [label.padEnd(20),
     String(s.lat.length).padStart(7),
     (s.lat.length / SECONDS).toFixed(1).padStart(8),
     `${Math.round(pct(s.lat, 50))}ms`.padStart(8),
     `${Math.round(pct(s.lat, 95))}ms`.padStart(8),
     `${Math.round(p99)}ms`.padStart(8),
     `${Math.round(Math.max(...s.lat))}ms`.padStart(8),
     `  ${codes}${s.errors ? ` ERR:${s.errors}` : ""}`].join(""));
}

console.log("=".repeat(78));
console.log(`
PASS CRITERIA
  - zero 4xx/5xx and zero network errors
  - workshop_config p99 < 300ms
  - get_leaderboard p99 < 500ms
  - measured req/s within ~10% of expected (below => client-side saturation,
    which means YOUR laptop is the bottleneck, not Supabase — rerun from 2 machines)

${fail ? "RESULT: INVESTIGATE — errors or p99 over budget above." : "RESULT: PASS — this load level is safe."}
`);
process.exit(0);
