// Stoic by Choice · Biggest Loser Challenge · secure API (Netlify Function + Netlify Blobs)
//
// Security model (kept simple on purpose)
// * Join with a name, avatar, agreement to the rules and a 4 digit PIN. The first person to join is the administrator.
// * Sign in by choosing your name and typing your PIN. PINs are stored as salted scrypt hashes.
// * Wrong PINs are counted and lock the account for a while; the administrator can reset a PIN.
// * Points are calculated here on the server with the shared rules in public/core.js.
// * Weights are only returned to their owner and to administrators; journals only to their owner.
//   Every administrator view of health data is written to the audit log.
//
// Required environment variable (Netlify > Project configuration > Environment variables):
//   SESSION_SECRET  long random text used to sign sign in tokens
import crypto from "node:crypto";
import { getStore } from "@netlify/blobs";
import { JOURNAL_CHECKS, makeEngine, DEFAULT_CONFIG, DEFAULT_SETTINGS, AVATARS, PRIVATE_FIELDS, SEALED_FIELDS, finaleTime, normRecord, POINTS_VERSION, todaySA as realToday, addDays } from "../../public/core.js";
import { FOOD_BY_ID } from "../../public/foods.js";
import webpush from "web-push";

const env = (k) => (globalThis.Netlify?.env?.get?.(k) ?? process.env[k] ?? "");
// TEST_TODAY lets a test server pretend to be on another date. Never set it on the live site.
const todaySA = () => env("TEST_TODAY") || realToday();
const SECRET = () => { const s = env("SESSION_SECRET"); if (!s || s.length < 16) throw httpErr(500, "Server not configured: set SESSION_SECRET"); return s; };
const COLORS = ["#E4572E", "#7B5CD6", "#F2A516", "#2E8B57", "#2F7FC1", "#D6457F", "#14A3A3", "#B8801A", "#8E44AD", "#C0392B", "#27AE60", "#2980B9"];
const SESSION_DAYS = 30;

// Starting data from the crew's notebook (23 Nov 2024 "before" and Saturday 14 Nov 2026 start), with target weights.
const SEED = {
  benadette: { name: "Benadette", sex: "f", before: 100.9, start: 70.9, goal: 62, age: 43 },
  thandi: { name: "Thandi", sex: "f", before: 118.5, start: 88.5, goal: 70 },
  kgotso: { name: "Kgotso", sex: "m", before: 76.4, start: 52.8, goal: 45, age: 10 },
  judith: { name: "Judith", sex: "f", before: 94.0, start: 77.6, goal: 60, age: 15 }, // ages from the printed eating plans
  patrick: { name: "Patrick", sex: "m", before: 79.8, start: 64.4, goal: 50, age: 13 }, // 13 years old: Junior plan
  thabo: { name: "Thabo", sex: "m", before: 116.3, start: 99.3, goal: 85 },
  peter: { name: "Peter", sex: "m", before: 129.0, start: 143.0, goal: 85 },
  // Under 18s (ages to be confirmed): the Junior plan applies.
  limi: { name: "Limi", junior: true, age: 10 }, lichume: { name: "Lichume", junior: true, age: 13 }, lihlumelo: { name: "Lihlumelo", junior: true, age: 13 }, // Peter Kisembo, 23 Nov 2024 (no 14 Nov 2026 weight on record)
};
function seeded(m) {
  const x = SEED[m], r = normRecord({});
  if (!x) return r;
  r.profile = { name: x.name, sex: x.sex || "", junior: !!x.junior, age: x.age || null, heightCm: null, startWeight: x.start, goalWeight: x.goal, activity: 1.375, rate: 0.5, kidPlan: "controlled", beforeWeight: x.before, beforeDate: "2024-11-23" };
  r.weights = x.start ? [{ id: "start-2026-11-14", date: "2026-11-14", kg: x.start, verified: true }] : [];
  return r;
}

// ---------- helpers ----------
function httpErr(status, message, extra = {}) { const e = new Error(message); e.status = status; e.extra = extra; return e; }
const json = (data, status = 200) => Response.json(data, { status, headers: { "cache-control": "no-store" } });
const isDate = (s) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
const str = (s, n) => String(s ?? "").trim().slice(0, n);
const num = (v, min, max) => { if (v === null || v === undefined || v === "") return null; const x = Number(v); if (!Number.isFinite(x)) return null; return Math.min(max, Math.max(min, Math.round(x * 10) / 10)); };
const normEmail = (e) => str(e, 120).toLowerCase();
const validEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);
const sha = (s) => crypto.createHash("sha256").update(s).digest("hex");
const rid = (n = 12) => crypto.randomBytes(n).toString("base64url");
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const unb64 = (s) => JSON.parse(Buffer.from(s, "base64url").toString());
const sign = (payload) => { const body = b64(payload); return body + "." + crypto.createHmac("sha256", SECRET()).update(body).digest("base64url"); };
function verify(token) {
  if (!token || typeof token !== "string" || !token.includes(".")) return null;
  const [body, sig] = token.split(".");
  const good = crypto.createHmac("sha256", SECRET()).update(body).digest("base64url");
  if (sig.length !== good.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(good))) return null;
  try { const p = unb64(body); return p.e && p.e < Date.now() ? null : p; } catch { return null; }
}
const WEAK_PINS = new Set(["0000", "1111", "2222", "3333", "4444", "5555", "6666", "7777", "8888", "9999", "1234", "4321", "1212", "0123", "2580", "1122", "6969", "1004", "2000", "1010"]);
function checkPin(pin) {
  if (!/^\d{4}$/.test(String(pin || ""))) throw httpErr(400, "Your PIN must be exactly 4 digits.");
  if (WEAK_PINS.has(pin)) throw httpErr(400, "That PIN is too easy to guess. Please choose another one.");
}
const hashPin = (pin, salt) => crypto.scryptSync(pin + SECRET(), salt, 32).toString("hex");
function pinMatches(acct, pin) {
  const h = Buffer.from(hashPin(String(pin || ""), acct.pinSalt), "hex"), s = Buffer.from(acct.pinHash, "hex");
  return h.length === s.length && crypto.timingSafeEqual(h, s);
}
const clientIp = (req) => req.headers.get("x-nf-client-connection-ip") || (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "local";

// ---------- storage ----------
// IMPORTANT: all participant data lives in this site wide Netlify Blobs store. It survives every redeploy.
// Never rename "kilocrew" or switch to getDeployStore, or the app will stop seeing the existing data.
const db = () => getStore({ name: "kilocrew", consistency: "strong" });
const getJ = async (k, d = null) => (await db().get(k, { type: "json" })) ?? d;
const setJ = (k, v) => db().setJSON(k, v);
async function listAccounts() {
  const { blobs } = await db().list({ prefix: "acct/" });
  return (await Promise.all(blobs.map((b) => getJ(b.key)))).filter(Boolean);
}
const getAccount = (id) => getJ("acct/" + id);
const saveAccount = (a) => setJ("acct/" + a.id, a);
const getConfig = async () => { const c = (await getJ("_config")) || {}; return { ...DEFAULT_CONFIG, ...c, points: { ...DEFAULT_CONFIG.points, ...(c.pointsVersion === POINTS_VERSION ? c.points || {} : {}) }, pointsVersion: POINTS_VERSION, treat: { ...DEFAULT_CONFIG.treat, ...(c.treat || {}) }, water: { ...DEFAULT_CONFIG.water, ...(c.water || {}) }, sleep: { ...DEFAULT_CONFIG.sleep, ...(c.sleep || {}) }, steps: { ...DEFAULT_CONFIG.steps, ...(c.steps || {}) }, finale: { ...DEFAULT_CONFIG.finale, ...(c.finale || {}) }, prizes: { ...DEFAULT_CONFIG.prizes, ...(c.prizes || {}) }, pin: { ...DEFAULT_CONFIG.pin, ...(c.pin || {}) } }; };
const getSettings = async () => (await getJ("_settings")) || DEFAULT_SETTINGS;
async function getRecord(memberId) { return normRecord((await getJ("member/" + memberId)) || (await getJ(memberId)) || seeded(memberId)); }
const saveRecord = (memberId, r) => setJ("member/" + memberId, r);

async function audit(by, action, detail = {}) {
  const log = (await getJ("_audit")) || [];
  log.push({ at: new Date().toISOString(), by: by ? { id: by.id, name: by.name } : null, action, ...detail });
  await setJ("_audit", log.slice(-3000));
}

// Simple fixed window rate limiter stored in Blobs.
async function rateLimit(key, max, windowMin) {
  const k = "rl/" + sha(key), now = Date.now();
  let r = (await getJ(k)) || { n: 0, t: now };
  if (now - r.t > windowMin * 60000) r = { n: 0, t: now };
  r.n++;
  await setJ(k, r);
  if (r.n > max) throw httpErr(429, `Too many attempts. Please wait ${Math.ceil((r.t + windowMin * 60000 - now) / 60000)} minutes and try again.`);
}

// ---------- sessions ----------
const newSession = (acct) => sign({ a: acct.id, r: acct.role, m: true, v: acct.tokenVersion || 0, e: Date.now() + SESSION_DAYS * 864e5 });
async function requireSession(req, { admin = false } = {}) {
  const tok = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const p = verify(tok);
  if (!p || !p.a) throw httpErr(401, "Please sign in.", { signin: true });
  const acct = await getAccount(p.a);
  if (!acct || (acct.tokenVersion || 0) !== p.v) throw httpErr(401, "Please sign in again.", { signin: true });
  if (acct.status === "suspended") throw httpErr(403, "Your account is suspended. Please contact the administrator.");
  if (admin && acct.role !== "admin") throw httpErr(403, "Only the administrator can do this.");
  return acct;
}
const publicAccount = (a) => ({ id: a.id, name: a.name, mobile: a.mobile || "", avatar: a.avatar, role: a.role, status: a.status, group: a.group || "", memberId: a.memberId || null, created: a.created, failedPins: a.failedPins || 0, lockedUntil: a.lockedUntil || 0, suggestedMember: a.suggestedMember || null });

// ---------- the official state ----------
async function buildState(viewer, { adminView = false } = {}) {
  const [settings, config, accounts] = await Promise.all([getSettings(), getConfig(), listAccounts()]);
  const challenges = (await getJ("_challenges")) || [], adjustments = (await getJ("_adjustments")) || [];
  const manualAwards = (await getJ("_manualAwards")) || [], announcements = (await getJ("_announcements")) || [];
  const active = accounts.filter((a) => a.status === "active" && a.memberId).sort((a, b) => a.created.localeCompare(b.created));
  const participants = active.map((a, i) => ({ memberId: a.memberId, name: a.name, avatar: a.avatar, group: a.group || "", color: COLORS[i % COLORS.length], accountId: a.id }));
  const records = {};
  await Promise.all(participants.map(async (p) => { records[p.memberId] = await getRecord(p.memberId); }));
  // Fill in a "before" record (23 Nov 2024) for anyone whose first name matches the notebook, without changing anything they logged.
  await Promise.all(participants.map(async (p) => {
    const x = SEED[p.name.split(/\s+/)[0].toLowerCase()], r = records[p.memberId];
    if (!x || !r) return;
    const needStart = x.start && !r.weights.some((w) => w.verified && w.date <= "2026-11-14");
    if (x.age && !r.profile.ageSeeded) { r.profile.age = x.age; r.profile.ageSeeded = true; await saveRecord(p.memberId, r); }
    if (x.junior && !r.profile.junior) { r.profile.junior = true; r.profile.kidPlan = r.profile.kidPlan || "controlled"; await saveRecord(p.memberId, r); }
    if ((r.profile.beforeWeight || !x.before) && (r.profile.age || !x.age) && !needStart) return;
    if (needStart) { r.weights.push({ id: "start-2026-11-14", date: "2026-11-14", kg: x.start, verified: true }); r.profile.startWeight = x.start; }
    if (!r.profile.beforeWeight && x.before) { r.profile.beforeWeight = x.before; r.profile.beforeDate = "2024-11-23"; }
    if (!r.profile.age && x.age) r.profile.age = x.age;
    if (!r.profile.startWeight && x.start) r.profile.startWeight = x.start;
    if (!r.profile.goalWeight && x.goal) r.profile.goalWeight = x.goal;
    await saveRecord(p.memberId, r);
  }));
  const today = todaySA();
  const engine = makeEngine({ settings: () => settings, config: () => config, today: () => today, challengeDefs: () => challenges, adjustments: () => adjustments });
  const { summaries, results } = engine.computeAll(participants, records);
  const isAdmin = viewer.role === "admin" && adminView;
  // The Grand Finale: final standings stay sealed for everyone (administrator included) until the reveal.
  const revealAt = finaleTime(settings, config);
  const revealed = !!config.finale.revealed || Date.now() >= Date.parse(revealAt);
  const cwk = engine.currentWeek().n, cmonth = (engine.challengeMonths().find((m) => m.from <= today && today <= m.to) || engine.challengeMonths()[0] || {}).key;
  const shared = {};
  for (const [id, s] of Object.entries(summaries)) {
    const c = { ...s };
    if (!(isAdmin || id === viewer.memberId)) { for (const f of PRIVATE_FIELDS) c[f] = null; delete c.treats; }
    if (!revealed) {
      for (const f of ["isBL", "isConsistent", "isResilience"]) c[f] = false;
      if (id !== viewer.memberId) {
        for (const f of SEALED_FIELDS) c[f] = null;
        c.weekPts = { [cwk]: s.weekPts[cwk] || 0 }; c.monthPts = { [cmonth]: s.monthPts[cmonth] || 0 };
      }
    }
    shared[id] = c;
  }
  // Week in review: the top 3 points scorers of every closed challenge week, for the celebration and the Review tab.
  // (The official weekly trophy is still presented at the next weigh in, once the weights are in.)
  const weekReview = weekReviewFrom(engine, participants, records, summaries, results, today);
  if (!revealed) Object.assign(results, { biggestLoser: null, consistent: [], resilience: [], ranking: [], blRank: [], effortRank: [] });
  else {
    // Podiums for the ceremony: percentage lost (official weigh ins) and effort points.
    results.blTop = results.blRank.slice(0, 3).map((id) => ({ id, pct: Math.round(summaries[id].pctSafe * 10) / 10 }));
    results.effortTop = results.effortRank.slice(0, 3).map((id) => ({ id, pts: summaries[id].habit }));
  }
  const t = today;
  const aggregates = { lostKg: 0, since2024: 0 };
  // Team habits over the last 7 days (effort only, no weights): how often the group reached each habit.
  {
    const t = engine.challengeDay().phase === "before" ? null : today, st = settings.start;
    if (t) {
      const from = addDays(t, -6) > st ? addDays(t, -6) : st, team = {};
      for (const k of engine.HABIT_KEYS) team[k] = { done: 0, possible: 0 };
      for (const p of participants) { const r = records[p.memberId]; for (let d = from; d <= t; d = addDays(d, 1)) { if (engine.beforeJoin(r, d)) continue; const h = engine.habitsOn(r, d); for (const k of engine.HABIT_KEYS) { team[k].possible++; if (h[k]) team[k].done++; } } }
      aggregates.team = { from, to: t, habits: team, people: participants.length };
    }
  }
  for (const p of participants) { const sm = summaries[p.memberId], r = records[p.memberId]; if (sm.lostKg > 0) aggregates.lostKg += sm.lostKg; const bw = r.profile.beforeWeight, cw = engine.latestWeight(r); if (bw && cw && bw > cw) aggregates.since2024 += bw - cw; }
  const out = {
    aggregates,
    serverToday: today, settings, finale: { revealed, revealAt }, config: { points: config.points, pointsVersion: config.pointsVersion, treat: config.treat, water: config.water, sleep: config.sleep, steps: config.steps, prizes: config.prizes, rulesText: config.rulesText, privacyText: config.privacyText, monthAwards: config.monthAwards || {} },
    me: publicAccount(viewer), participants, summaries: shared, results,
    myRecord: viewer.memberId ? records[viewer.memberId] || (await getRecord(viewer.memberId)) : null,
    challenges: challenges.filter((c) => c.end >= addDays(t, -31)),
    manualAwards: manualAwards.map((x) => ({ id: x.id, memberId: x.memberId, award: x.award, note: x.note, date: x.date })),
    announcements: announcements.filter((x) => (!x.until || x.until >= t) && (x.to === "all" || x.to === viewer.memberId)).slice(-10).reverse(),
    // Inbox: every message ever sent to this person or to everyone (kept even after the Home banner date ends).
    myFeedback: viewer.memberId ? ((await getJ("_feedback")) || []).filter((f) => f.memberId === viewer.memberId).slice(-30).reverse().map((f) => ({ id: f.id, area: f.area, message: f.message, date: f.date, status: f.status, reply: f.reply })) : [],
    weekReview,
    feedbackAreas: FEEDBACK_AREAS,
    myChildren: await (async () => {
      const kids = (viewer.memberId && childrenByParent(config, accounts)[viewer.memberId]) || [];
      const out = [];
      for (const k of kids) { const r = records[k] || (await getRecord(k)); out.push({ memberId: k, today: childDay(engine, r, t, true), yesterday: childDay(engine, r, addDays(t, -1)) }); }
      return out;
    })(),
    inbox: announcements.filter((x) => x.to === "all" || x.to === viewer.memberId).slice(-60).reverse().map((x) => ({ id: x.id, title: x.title, message: x.message, to: x.to === "all" ? "all" : "me", date: x.date, time: x.time || "", by: SENDER_SIGNATURE })),
  };
  // Buddy and cheers (effort only: checked in or not, never weights).
  {
    const buddies = config.buddies || {}, cheers = (await getJ("_cheers")) || [], me = viewer.memberId, nameOf = (id) => (participants.find((p) => p.memberId === id) || {}).name || "";
    const bid = me && buddies[me];
    if (bid && records[bid]) out.buddy = { id: bid, name: nameOf(bid), checkedIn: engine.dayStatus(records[bid], t).any, points: Math.max(0, engine.dayPoints(records[bid], t)) };
    out.cheers = { received: cheers.filter((c) => c.to === me && c.date === t).map((c) => ({ from: nameOf(c.from), emoji: c.emoji })), sent: cheers.filter((c) => c.from === me && c.date === t).map((c) => c.to) };
    out.config.buddies = buddies;
  }
  const pushRec = await getJ("push/" + viewer.id);
  out.push = { enabled: !!(pushRec && pushRec.subs && pushRec.subs.length), prefs: (pushRec && pushRec.prefs) || DEFAULT_PUSH_PREFS };
  out.syncCodeSet = !!viewer.syncHash;
  if (isAdmin) {
    out.admin = {
      accounts: accounts.map(publicAccount), records: Object.fromEntries(Object.entries(records).map(([k, r]) => [k, { ...r, reflections: r.reflections.map((x) => ({ id: x.id, date: x.date })) }])), config, adjustments, announcements: announcements.slice().reverse(),
      alerts: await safetyAlerts(engine, today),
      feedback: ((await getJ("_feedback")) || []).slice().reverse(),
      parents: parentLinks(config),
      parentReports: await (async () => {
        const map = childrenByParent(config, accounts), y = addDays(t, -1), out = [];
        const unresolved = [...new Set(Object.values(parentLinks(config)).flat())].filter((k) => !resolveParent(k, accounts));
        for (const [pid, kids] of Object.entries(map)) { const reps = []; for (const k of kids) reps.push(childDay(engine, records[k] || (await getRecord(k)), y)); out.push({ parent: pid, date: y, text: parentMessage(reps), flags: reps.reduce((a, c) => a + c.flags.length, 0) }); }
        // Parents not on the app yet (e.g. Ali): a ready message to send by WhatsApp.
        for (const k of unresolved) { const kids = Object.entries(parentLinks(config)).filter(([, ps]) => ps.includes(k)).map(([c]) => c).filter((c) => records[c]); if (!kids.length) continue; const reps = kids.map((c) => childDay(engine, records[c], y)); out.push({ parentName: k[0].toUpperCase() + k.slice(1), offApp: true, date: y, text: parentMessage(reps), flags: reps.reduce((a, c) => a + c.flags.length, 0) }); }
        return out;
      })(),
      audit: ((await getJ("_audit")) || []).slice(-400).reverse(), seeds: Object.keys(SEED).map((k) => ({ id: k, name: SEED[k].name, linked: accounts.some((a) => a.memberId === k) })),
    };
  }
  return out;
}

// Missed day penalties only start from the day someone joins (never before the challenge start).
async function markJoined(memberId) {
  const r = await getRecord(memberId), t = todaySA(), start = (await getSettings()).start;
  if (!r.profile.joinedDate) { r.profile.joinedDate = t > start ? t : start; await saveRecord(memberId, r); }
}

// ---------- validation of participant entries ----------
const ABOUT_KEYS = ["favFoods", "favExercise", "biggestChallenge", "motivation", "support"];
const TYPES = ["foods", "exercises", "weights", "treats", "tasks", "reflections", "challenges", "water", "sleep", "steps", "checkins", "measures", "routine"];
function cleanEntry(type, e = {}, today) {
  const base = { id: str(e.id, 40) || rid(6), date: isDate(e.date) ? e.date : null };
  if (!base.date || base.date > today || base.date < "2026-11-01") throw httpErr(400, "That date cannot be used.");
  if (type === "foods") return { ...cleanFood(e, base, today), time: eatenTime(e.time) };
  return cleanOther(type, e, base, today);
}
// Time eaten (HH:MM, South African time). Defaults to now; cannot be later than now.
const nowSAtime = () => new Date().toLocaleTimeString("en-GB", { timeZone: "Africa/Johannesburg", hour: "2-digit", minute: "2-digit", hour12: false });
function eatenTime(t) {
  const now = nowSAtime();
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(String(t || ""))) return now;
  if (!env("TEST_TODAY")) { const [h, m] = now.split(":").map(Number), lim = Math.min(23 * 60 + 59, h * 60 + m + 10); const [th, tm] = t.split(":").map(Number); if (th * 60 + tm > lim) throw httpErr(400, "The time eaten cannot be later than now."); }
  return t;
}
function cleanFood(e, base, today) {
  {
    const meal = str(e.meal, 20) || "Snack", qty = Math.min(5, Math.max(0.25, Number(e.qty) || 1));
    const f = FOOD_BY_ID[e.foodId];
    // Known foods: the standard calorie count is applied here on the server, whatever the app sends.
    if (f && f.unit) {
      const amount = Math.round(Math.min(2000, Math.max(1, Number(e.amount) || f.def || 100)));
      return { ...base, meal, foodId: f.id, amount, unit: f.unit, name: `${f.name.replace(/ \(plan[^)]*\)/, "")} (${amount} ${f.unit})`, kcal: Math.round((f.kcal * amount) / 100) };
    }
    if (f) return { ...base, meal, foodId: f.id, qty, name: `${f.name} (${qty === 1 ? "" : qty + " × "}${f.serving})`, kcal: Math.round(f.kcal * qty) };
    const kcal = num(e.kcal, 0, 5000);
    if (kcal === null || !str(e.name, 80)) throw httpErr(400, "Please choose a food from the list, or enter a custom food with its calories.");
    return { ...base, meal, name: str(e.name, 80), kcal, custom: true };
  }
}
function cleanOther(type, e, base, today) {
  if (type === "routine") {
    const kind = ["vitamin", "meditate", "write"].includes(e.kind) ? e.kind : null;
    if (!kind) throw httpErr(400, "Unknown routine.");
    return { ...base, kind };
  }
  if (type === "measures") {
    const waistCm = num(e.waistCm, 40, 220), hipCm = num(e.hipCm, 40, 250);
    if (!waistCm && !hipCm) throw httpErr(400, "Please enter your waist or hip measurement in cm.");
    return { ...base, waistCm, hipCm, verified: false };
  }
  if (type === "exercises") {
    const kcal = num(e.kcal, 0, 5000), minutes = num(e.minutes, 1, 600);
    if (kcal === null || minutes === null || !str(e.activity, 80)) throw httpErr(400, "Please enter the activity and minutes.");
    return { ...base, activity: str(e.activity, 80), minutes, kcal, distanceKm: num(e.distanceKm, 0, 300) || 0, steps: Math.round(num(e.steps, 0, 100000) || 0) };
  }
  if (type === "steps") { const steps = num(e.steps, 0, 100000); if (steps === null) throw httpErr(400, "Please enter your steps."); return { ...base, steps: Math.round(steps) }; }
  if (type === "weights") { const kg = num(e.kg, 20, 400); if (kg === null) throw httpErr(400, "Please enter a weight between 20 and 400 kg."); return { ...base, kg, verified: false }; }
  if (type === "reflections") {
    const ok = new Set(JOURNAL_CHECKS.map((c) => c[0])), checks = Array.isArray(e.checks) ? [...new Set(e.checks.filter((c) => ok.has(c)))] : [];
    const text = str(e.text, 2000);
    if (!text && !checks.length && !e.mood) throw httpErr(400, "Tap at least one picture, or choose how you feel.");
    return { ...base, text, checks, mood: ["great", "good", "okay", "low", "tough"].includes(e.mood) ? e.mood : null, prompt: str(e.prompt, 200) }; }
  if (type === "sleep") { const hours = num(e.hours, 0, 16); if (hours === null) throw httpErr(400, "Please enter how many hours you slept."); return { ...base, hours: Math.round(hours * 2) / 2, quality: ["great", "good", "okay", "poor"].includes(e.quality) ? e.quality : null }; }
  if (type === "water") { const glasses = num(e.glasses, 0, 30); if (glasses === null) throw httpErr(400, "Please enter the number of glasses."); return { ...base, glasses: Math.round(glasses) }; }
  if (type === "challenges") return { ...base, challengeId: str(e.challengeId, 40) };
  return base; // treats, tasks
}

// ---------- route handlers ----------
async function handleAuth(path, req, body) {
  // List of people for the sign in screen: first name and avatar only.
  if (path === "people") {
    const accounts = (await listAccounts()).filter((a) => a.status !== "suspended").sort((a, b) => a.name.localeCompare(b.name));
    return json({ people: accounts.map((a) => ({ id: a.id, name: a.name.split(" ")[0], avatar: a.avatar })), hasAdmin: accounts.some((a) => a.role === "admin") });
  }
  if (path === "register") {
    const name = str(body.name, 40);
    if (name.length < 2) throw httpErr(400, "Please enter your name.");
    if (!AVATARS[body.avatar]) throw httpErr(400, "Please choose your avatar.");
    if (!body.consent?.rules || !body.consent?.privacy || !body.consent?.health) throw httpErr(400, "Please accept the challenge rules and the privacy policy.");
    checkPin(body.pin);
    await rateLimit("reg:" + clientIp(req), 10, 60);
    const accounts = await listAccounts();
    if (accounts.some((a) => a.name.toLowerCase() === name.toLowerCase())) throw httpErr(409, "Someone with this name has already joined. Add your surname to tell you apart.");
    const config = await getConfig();
    const isFirst = accounts.length === 0; // the first person to join becomes the administrator
    const first = name.split(/\s+/)[0].toLowerCase();
    const suggested = Object.keys(SEED).find((k) => k === first && !accounts.some((a) => a.memberId === k)) || null;
    const salt = rid(16);
    const acct = {
      id: rid(9), name, mobile: str(body.mobile, 20), avatar: body.avatar, role: isFirst ? "admin" : "participant",
      status: isFirst || config.autoApprove ? "active" : "pending", group: "", memberId: null, suggestedMember: suggested,
      pinSalt: salt, pinHash: hashPin(body.pin, salt), failedPins: 0, lockedUntil: 0, tokenVersion: 0, created: new Date().toISOString(),
      consent: { rules: true, privacy: true, health: true, at: new Date().toISOString() },
    };
    if (acct.status === "active") { acct.memberId = suggested || acct.id; await markJoined(acct.memberId); }
    await saveAccount(acct);
    await audit(acct, isFirst ? "registered as administrator" : "registered", { target: acct.name, detail: acct.status });
    return json({ ok: true, session: newSession(acct), status: acct.status });
  }
  if (path === "pin") {
    const acct = await getAccount(str(body.accountId, 20));
    if (!acct) throw httpErr(400, "Please choose your name.");
    if (acct.status === "suspended") throw httpErr(403, "Your account is suspended. Please contact the administrator.");
    const cfg = (await getConfig()).pin;
    if (acct.lockedUntil > Date.now()) throw httpErr(423, `Too many wrong PINs. Try again in ${Math.ceil((acct.lockedUntil - Date.now()) / 60000)} minutes, or ask the administrator to reset your PIN.`);
    if (!pinMatches(acct, body.pin)) {
      acct.failedPins = (acct.failedPins || 0) + 1;
      let msg;
      if (acct.failedPins >= cfg.maxAttempts) { acct.lockedUntil = Date.now() + cfg.lockMinutes * 60000; acct.failedPins = 0; msg = `Too many wrong PINs. Locked for ${cfg.lockMinutes} minutes.`; await audit(acct, "pin temporarily locked"); }
      else { const left = cfg.maxAttempts - acct.failedPins; msg = `Wrong PIN. ${left} attempt${left === 1 ? "" : "s"} left.`; }
      await saveAccount(acct);
      throw httpErr(401, msg);
    }
    acct.failedPins = 0; acct.lockedUntil = 0;
    await saveAccount(acct); await audit(acct, "signed in");
    return json({ ok: true, session: newSession(acct), status: acct.status });
  }
  if (path === "change-pin") {
    const acct = await requireSession(req);
    if (!pinMatches(acct, body.currentPin)) throw httpErr(400, "Your current PIN is not correct.");
    checkPin(body.pin);
    acct.pinSalt = rid(16); acct.pinHash = hashPin(body.pin, acct.pinSalt);
    await saveAccount(acct); await audit(acct, "changed pin");
    return json({ ok: true });
  }
  if (path === "avatar") {
    const acct = await requireSession(req);
    if (!AVATARS[body.avatar]) throw httpErr(400, "Unknown avatar.");
    acct.avatar = body.avatar; await saveAccount(acct); await audit(acct, "changed avatar", { detail: body.avatar });
    return json(await buildState(acct, { adminView: false }));
  }
  throw httpErr(404, "Not found");
}

async function handleData(req, body) {
  const acct = await requireSession(req);
  if (acct.status !== "active" || !acct.memberId) throw httpErr(403, "Your registration is waiting for the administrator's approval.");
  const [settings, config, challenges] = [await getSettings(), await getConfig(), (await getJ("_challenges")) || []];
  const today = todaySA();
  const r = await getRecord(acct.memberId);
  if (body.action === "profile") {
    const p = body.profile || {};
    r.profile = {
      ...r.profile, sex: p.sex === "m" ? "m" : "f", age: num(p.age, 5, 110), heightCm: num(p.heightCm, 90, 230), goalWeight: num(p.goalWeight, 20, 400),
      activity: [1.2, 1.375, 1.55, 1.725].includes(Number(p.activity)) ? Number(p.activity) : 1.375,
      rate: [0.12, 0.25, 0.5, 0.75].includes(Number(p.rate)) ? Number(p.rate) : 0.5, kidPlan: p.kidPlan === "habits" ? "habits" : "controlled",
    };
    if (!r.profile.startWeight && num(p.startWeight, 20, 400)) r.profile.startWeight = num(p.startWeight, 20, 400); // only the first time
    for (const k of ABOUT_KEYS) if (k in p) r.profile[k] = str(p[k], 200);
  } else if (body.action === "add" && TYPES.includes(body.type)) {
    const e = cleanEntry(body.type, body.entry, today);
    if (body.type === "routine") r.routine = (r.routine || []).filter((x) => !(x.date === e.date && x.kind === e.kind));
    // Honesty rule: entries can only be made for today (South African time). No back dating, no future dates.
    if (e.date !== today) throw httpErr(400, "You can only log things for today. Missed days cannot be filled in afterwards.");
    if (body.type === "treats") {
      const eng = makeEngine({ settings: () => settings, config: () => config, today: () => today });
      if (eng.treats(r).left < 1) throw httpErr(400, "You have no treat tokens left.");
    }
    if (body.type === "challenges") {
      const def = challenges.find((c) => c.id === e.challengeId);
      if (!def || e.date < def.start || e.date > def.end) throw httpErr(400, "That challenge is not open.");
    }
    if (body.type === "weights" && r.weights.some((w) => w.date === e.date && w.verified)) throw httpErr(400, "The administrator has already recorded your official weight for this day.");
    if (["weights", "treats", "tasks", "water", "reflections", "sleep", "steps", "checkins"].includes(body.type)) r[body.type] = r[body.type].filter((w) => w.date !== e.date);
    if (body.type === "challenges") r.challenges = r.challenges.filter((x) => !(x.date === e.date && x.challengeId === e.challengeId));
    r[body.type].push(e);
    r[body.type] = r[body.type].slice(-5000);
  } else if (body.action === "feedback") {
    const fb = (await getJ("_feedback")) || [];
    const x = { id: rid(6), memberId: acct.memberId, accountId: acct.id, name: acct.name, area: FEEDBACK_AREAS.includes(body.area) ? body.area : "Other", message: str(body.message, 800), date: today, time: saTime(), status: "new", reply: "" };
    if (x.message.length < 3) throw httpErr(400, "Please write your idea or feedback.");
    if (fb.filter((f) => f.memberId === acct.memberId && f.date === today).length >= 5) throw httpErr(429, "Thank you! You have sent 5 today; please send more tomorrow.");
    fb.push(x); await setJ("_feedback", fb.slice(-500));
    // Let the administrator know on their phone.
    try {
      for (const ad of (await listAccounts()).filter((y) => y.role === "admin")) {
        const rec = await getJ("push/" + ad.id); if (!rec || !rec.subs || !rec.subs.length) continue;
        if ({ ...DEFAULT_PUSH_PREFS, ...(rec.prefs || {}) }.messages === false) continue;
        await sendPush(ad.id, rec, { title: "💡 Feedback from " + acct.name.split(" ")[0], body: `${x.area}: ${x.message.slice(0, 120)}`, url: "/#admin" });
      }
    } catch (e) { console.log("feedback push failed", e.message); }
    return json(await buildState(acct));
  } else if (body.action === "cheer") {
    const to = str(body.to, 40), cheers = (await getJ("_cheers")) || [];
    if (!to || to === acct.memberId) throw httpErr(400, "Choose someone to cheer.");
    if (cheers.some((c) => c.from === acct.memberId && c.to === to && c.date === today)) throw httpErr(400, "You already cheered them today.");
    cheers.push({ from: acct.memberId, to, date: today, emoji: ["👏🏾", "💪🏾", "🔥", "🌟"].includes(body.emoji) ? body.emoji : "👏🏾", at: new Date().toISOString() });
    await setJ("_cheers", cheers.slice(-3000));
    return json(await buildState(acct));
  } else if (body.action === "syncCode") {
    // Personal code for the iPhone step sync shortcut. Only a hash is stored; the code is shown once.
    const code = rid(9); acct.syncHash = sha(code); await saveAccount(acct);
    return json({ ...(await buildState(acct)), syncCode: code });
  } else if (body.action === "addMany" && body.type === "foods" && Array.isArray(body.entries) && body.entries.length && body.entries.length <= 8) {
    // One tap plan meal: the protein and its vegetables are saved together.
    const label = str(body.planLabel, 60);
    const list = body.entries.map((x) => ({ ...cleanEntry("foods", x, today), ...(label ? { planLabel: label } : {}) }));
    if (list.some((e) => e.date !== today)) throw httpErr(400, "You can only log things for today. Missed days cannot be filled in afterwards.");
    r.foods.push(...list); r.foods = r.foods.slice(-5000);
  } else if (body.action === "delete" && TYPES.includes(body.type)) {
    const target = r[body.type].find((e) => e.id === body.id);
    if (target && target.date !== today) throw httpErr(400, "Only today's entries can be removed. Past days are locked.");
    r[body.type] = r[body.type].filter((e) => e.id !== body.id || (body.type === "weights" && e.verified));
  } else throw httpErr(400, "Unknown action.");
  await saveRecord(acct.memberId, r);
  return json(await buildState(acct));
}

async function handleAdmin(req, body) {
  const admin = await requireSession(req, { admin: true });
  const a = body.action;
  const log = (action, detail) => audit(admin, action, detail);
  const acctFor = async (id) => { const x = await getAccount(id); if (!x) throw httpErr(404, "Participant not found."); return x; };
  const list = async (key) => (await getJ(key)) || [];
  if (a === "backup") {
    // Full copy of the challenge data (accounts with hashed PINs, records, settings, awards, audit log).
    const { blobs } = await db().list();
    const data = {};
    for (const b of blobs) if (!b.key.startsWith("rl/") && !b.key.startsWith("code/")) data[b.key] = await getJ(b.key);
    await log("downloaded a full backup");
    return json({ app: "stoic-by-choice", version: 1, created: new Date().toISOString(), data });
  }
  if (a === "restore") {
    const d = body.backup;
    if (!d || d.app !== "stoic-by-choice" || typeof d.data !== "object") throw httpErr(400, "That file is not a Stoic by Choice backup.");
    let n = 0;
    for (const [k, v] of Object.entries(d.data)) {
      if (!/^(acct\/|member\/|_)/.test(k) && !/^[a-z]+$/.test(k)) continue;
      if (k === "_audit") continue;
      await setJ(k, v); n++;
    }
    await log("restored a backup", { detail: `${n} items from ${d.created}` });
  } else if (a === "buddies") {
    const pairs = Array.isArray(body.pairs) ? body.pairs : [], map = {};
    for (const [x, y] of pairs) { if (x && y && x !== y) { map[x] = y; map[y] = x; } }
    const cur = (await getJ("_config")) || {}; cur.buddies = map; await setJ("_config", cur);
    await log("set buddy pairs", { detail: `${Object.keys(map).length / 2} pairs` });
  } else if (a === "backups") {
    const { blobs } = await db().list({ prefix: "backup/" });
    return json({ ...(await buildState(admin, { adminView: true })), backups: blobs.map((b) => b.key.slice(7)).sort().reverse() });
  } else if (a === "restoreSnapshot") {
    const snap = await getJ("backup/" + str(body.date, 10));
    if (!snap || !snap.data) throw httpErr(404, "That daily backup was not found.");
    let n = 0; for (const [k, v] of Object.entries(snap.data)) { if (k === "_audit" || !/^(acct\/|member\/|_)/.test(k)) continue; await setJ(k, v); n++; }
    await log("restored a daily backup", { detail: `${n} items from ${body.date}` });
  } else if (a === "view") { await log("viewed admin centre and health data"); return json(await buildState(admin, { adminView: true })); }
  else if (a === "approve") {
    const x = await acctFor(body.accountId);
    const accounts = await listAccounts();
    let mid = body.memberId === "new" || !body.memberId ? x.id : String(body.memberId);
    if (accounts.some((o) => o.id !== x.id && o.memberId === mid)) throw httpErr(400, "That record is already linked to someone else.");
    x.status = "active"; x.memberId = mid; await saveAccount(x);
    await markJoined(mid);
    await log("approved participant", { target: x.name, detail: "record " + mid });
  } else if (a === "suspend" || a === "reactivate") {
    const x = await acctFor(body.accountId);
    if (x.id === admin.id) throw httpErr(400, "You cannot suspend yourself.");
    x.status = a === "suspend" ? "suspended" : x.memberId ? "active" : "pending"; x.tokenVersion = (x.tokenVersion || 0) + 1; await saveAccount(x);
    await log(a === "suspend" ? "suspended participant" : "reactivated participant", { target: x.name });
  } else if (a === "group") {
    const x = await acctFor(body.accountId); x.group = str(body.group, 40); await saveAccount(x); await log("assigned group", { target: x.name, detail: x.group });
  } else if (a === "unlock") {
    const x = await acctFor(body.accountId); x.failedPins = 0; x.lockedUntil = 0; await saveAccount(x); await log("unlocked pin", { target: x.name });
  } else if (a === "resetPin") {
    const x = await acctFor(body.accountId); checkPin(String(body.pin || ""));
    x.pinSalt = rid(16); x.pinHash = hashPin(String(body.pin), x.pinSalt); x.failedPins = 0; x.lockedUntil = 0; x.tokenVersion = (x.tokenVersion || 0) + 1;
    await saveAccount(x); await log("reset pin", { target: x.name });
  } else if (a === "makeAdmin" || a === "removeAdmin") {
    const x = await acctFor(body.accountId); if (x.id === admin.id) throw httpErr(400, "You cannot change your own role.");
    x.role = a === "makeAdmin" ? "admin" : "participant"; x.tokenVersion = (x.tokenVersion || 0) + 1; await saveAccount(x); await log(a === "makeAdmin" ? "granted admin role" : "removed admin role", { target: x.name });
  } else if (a === "deleteAccount") {
    const x = await acctFor(body.accountId); if (x.id === admin.id) throw httpErr(400, "You cannot delete yourself.");
    await db().delete("acct/" + x.id);
    if (body.deleteData && x.memberId) await saveRecord(x.memberId, normRecord({}));
    await log("deleted participant (POPIA request)", { target: x.name, detail: body.deleteData ? "account and data" : "account only" });
  } else if (a === "config") {
    const c = body.config || {}, cur = await getConfig(), P = {};
    for (const k of Object.keys(DEFAULT_CONFIG.points)) P[k] = num(c.points?.[k] ?? cur.points[k], -100, 1000);
    const next = {
      points: P, pointsVersion: POINTS_VERSION, treat: { minutes: num(c.treat?.minutes ?? cur.treat.minutes, 30, 1000), kcal: num(c.treat?.kcal ?? cur.treat.kcal, 0, 1000) },
      pin: { maxAttempts: num(c.pin?.maxAttempts ?? cur.pin.maxAttempts, 3, 10), lockMinutes: num(c.pin?.lockMinutes ?? cur.pin.lockMinutes, 1, 1440), hardLockAfter: num(c.pin?.hardLockAfter ?? cur.pin.hardLockAfter, 5, 50) },
      water: { target: num(c.water?.target ?? cur.water?.target ?? 8, 1, 20) },
      sleep: { target: num(c.sleep?.target ?? cur.sleep?.target ?? 7, 4, 12) },
      steps: { goal: num(c.steps?.goal ?? cur.steps?.goal ?? 7500, 1000, 30000) },
      finale: cur.finale,
      prizes: { bl: num(c.prizes?.bl ?? cur.prizes?.bl ?? 10000, 0, 1000000), effort: num(c.prizes?.effort ?? cur.prizes?.effort ?? 2000, 0, 1000000) },
      autoApprove: !!(c.autoApprove ?? cur.autoApprove), rulesText: str(c.rulesText ?? cur.rulesText, 4000), privacyText: str(c.privacyText ?? cur.privacyText, 6000),
    };
    // Keep everything else saved in the config (buddies, parent links, monthly award results).
    await setJ("_config", { ...((await getJ("_config")) || {}), ...next }); await log("changed settings and scoring", { detail: JSON.stringify(next.points) });
  } else if (a === "finale") {
    const cur = await getConfig();
    if (body.reveal) { cur.finale = { ...cur.finale, revealed: true }; await setJ("_config", cur); await log("revealed the Grand Finale results"); }
    else if (body.hide) { cur.finale = { ...cur.finale, revealed: false }; await setJ("_config", cur); await log("sealed the Grand Finale results again"); }
    else {
      const at = str(body.revealAt, 40);
      if (at && Number.isNaN(Date.parse(at))) throw httpErr(400, "Please choose a valid date and time.");
      cur.finale = { ...cur.finale, revealAt: at || null }; await setJ("_config", cur); await log("set the Grand Finale reveal time", { detail: at || "default" });
    }
  } else if (a === "settings") {
    if (!isDate(body.start) || !isDate(body.end) || body.end <= body.start) throw httpErr(400, "The end date must be after the start date.");
    await setJ("_settings", { start: body.start, end: body.end, title: DEFAULT_SETTINGS.title }); await log("changed challenge dates", { detail: body.start + " to " + body.end });
  } else if (a === "challenge") {
    const l = await list("_challenges");
    if (body.remove) { await setJ("_challenges", l.filter((c) => c.id !== body.remove)); await log("removed challenge", { detail: body.remove }); }
    else {
      const c = { id: rid(6), title: str(body.title, 80), description: str(body.description, 300), type: ["daily", "weekly", "monthly"].includes(body.type) ? body.type : "daily", start: body.start, end: body.end, points: num(body.points, 0, 500) || 0 };
      if (!c.title || !isDate(c.start) || !isDate(c.end) || c.end < c.start) throw httpErr(400, "Please give the challenge a title and valid dates.");
      l.push(c); await setJ("_challenges", l); await log("created challenge", { detail: `${c.title} (${c.type}, ${c.points} pts)` });
    }
  } else if (a === "adjust") {
    const l = await list("_adjustments");
    if (body.remove) { await setJ("_adjustments", l.filter((x) => x.id !== body.remove)); await log("removed point adjustment", { detail: body.remove }); }
    else {
      const x = { id: rid(6), memberId: str(body.memberId, 40), points: num(body.points, -1000, 1000), reason: str(body.reason, 200), date: isDate(body.date) ? body.date : todaySA(), by: admin.name };
      if (!x.memberId || !x.points || !x.reason) throw httpErr(400, "Choose a participant, the points and a reason.");
      l.push(x); await setJ("_adjustments", l); await log("adjusted points", { target: x.memberId, detail: `${x.points} pts: ${x.reason}` });
    }
  } else if (a === "award") {
    const l = await list("_manualAwards");
    if (body.remove) { await setJ("_manualAwards", l.filter((x) => x.id !== body.remove)); await log("revoked medal", { detail: body.remove }); }
    else {
      const x = { id: rid(6), memberId: str(body.memberId, 40), award: str(body.award, 40), note: str(body.note, 200), date: todaySA() };
      if (!x.memberId || !x.award) throw httpErr(400, "Choose a participant and an award.");
      l.push(x); await setJ("_manualAwards", l); await log("issued medal", { target: x.memberId, detail: x.award });
    }
  } else if (a === "parents") {
    const config = await getConfig(), links = {};
    for (const [c, ps] of Object.entries(body.parents || {})) { const cc = str(c, 40); if (!cc) continue; links[cc] = [...new Set((Array.isArray(ps) ? ps : []).map((x) => str(x, 40).toLowerCase()).filter(Boolean))].slice(0, 4); }
    config.parents = links; await setJ("_config", { ...((await getJ("_config")) || {}), parents: links }); await log("updated parent links");
  } else if (a === "feedback") {
    const fb = await list("_feedback"), x = fb.find((f) => f.id === body.id);
    if (!x) throw httpErr(404, "Feedback not found.");
    if (body.remove) { await setJ("_feedback", fb.filter((f) => f.id !== body.id)); await log("removed feedback"); }
    else {
      if (["new", "seen", "planned", "done", "not now"].includes(body.status)) x.status = body.status;
      const reply = str(body.reply, 600);
      if (reply) {
        x.reply = reply; if (x.status === "new") x.status = "seen";
        // The reply also goes to the person's inbox.
        const l = await list("_announcements");
        l.push({ id: rid(6), title: "Reply to your feedback", message: `You wrote (${x.area}): "${x.message.slice(0, 160)}"\n\n${reply}`, to: x.memberId, until: null, date: todaySA(), time: saTime(), by: admin.name });
        await setJ("_announcements", l.slice(-200));
        try { const rec = await getJ("push/" + x.accountId); if (rec && rec.subs && rec.subs.length && { ...DEFAULT_PUSH_PREFS, ...(rec.prefs || {}) }.messages !== false) await sendPush(x.accountId, rec, { title: "📣 Reply to your feedback", body: reply.slice(0, 140), url: "/#inbox" }); } catch (e) { console.log("reply push failed", e.message); }
      }
      await setJ("_feedback", fb); await log("updated feedback", { target: x.memberId, detail: `${x.status}${reply ? " + reply" : ""}` });
    }
  } else if (a === "announce") {
    const l = await list("_announcements");
    if (body.remove) { await setJ("_announcements", l.filter((x) => x.id !== body.remove)); await log("removed announcement"); }
    else {
      const x = { id: rid(6), title: str(body.title, 80), message: str(body.message, 600), to: str(body.to, 40) || "all", until: isDate(body.until) ? body.until : null, date: todaySA(), time: saTime(), by: admin.name };
      if (!x.message) throw httpErr(400, "Please write a message.");
      l.push(x); await setJ("_announcements", l.slice(-200)); await log("sent announcement", { detail: `${x.to}: ${x.title}` });
      // Phone notification to everyone it was sent to (if they turned reminders on and kept "Messages" ticked).
      try {
        const { blobs } = await db().list({ prefix: "push/" });
        for (const b of blobs) {
          const rec = await getJ(b.key); if (!rec || !rec.subs || !rec.subs.length) continue;
          if (x.to !== "all" && rec.memberId !== x.to) continue;
          if ({ ...DEFAULT_PUSH_PREFS, ...(rec.prefs || {}) }.messages === false) continue;
          await sendPush(b.key.slice(5), rec, { title: "📣 " + (x.title || "New message from Dr Benadette"), body: x.message.slice(0, 120) + " · Dr Benadette Aineamani, Stoic Teacher", url: "/#inbox" });
        }
      } catch (e) { console.log("announce push failed", e.message); }
    }
  } else if (a === "weights") {
    const date = body.date === "start" ? null : body.date;
    if (date && (!isDate(date) || date > todaySA())) throw httpErr(400, "Please choose a valid weigh in date.");
    let n = 0;
    for (const e of body.entries || []) {
      const kg = num(e.kg, 20, 400); if (!kg || !e.memberId) continue;
      const r = await getRecord(e.memberId);
      if (!date) { r.profile.startWeight = kg; r.weights = r.weights.filter((w) => w.date !== "2026-11-14"); r.weights.push({ id: "start-2026-11-14", date: "2026-11-14", kg, verified: true }); }
      else {
        r.weights = r.weights.filter((w) => w.date !== date); r.weights.push({ id: rid(6), date, kg, verified: true });
        const waistCm = num(e.waistCm, 40, 220), hipCm = num(e.hipCm, 40, 250);
        if (waistCm || hipCm) { r.measures = (r.measures || []).filter((m) => !(m.date === date && m.verified)); r.measures.push({ id: rid(6), date, waistCm, hipCm, verified: true }); }
      }
      await saveRecord(e.memberId, r); n++;
    }
    await log("recorded group weigh in", { detail: `${n} weights for ${date || "starting weights"}` });
  } else if (a === "profile") {
    const r = await getRecord(str(body.memberId, 40)), p = body.profile || {};
    for (const k of ["startWeight", "goalWeight", "beforeWeight"]) if (k in p) r.profile[k] = num(p[k], 10, 400);
    if ("heightCm" in p) r.profile.heightCm = num(p.heightCm, 90, 230);
    if ("age" in p) r.profile.age = num(p.age, 5, 100);
    if ("junior" in p) r.profile.junior = !!p.junior;
    if ("sex" in p) r.profile.sex = p.sex === "m" ? "m" : "f";
    for (const k of [...ABOUT_KEYS, "adminNote"]) if (k in p) r.profile[k] = str(p[k], k === "adminNote" ? 500 : 200);
    if (p.waistCm || p.hipCm) { const t = todaySA(); r.measures = (r.measures || []).filter((m) => !(m.date === t && m.verified)); r.measures.push({ id: rid(6), date: t, waistCm: num(p.waistCm, 40, 220), hipCm: num(p.hipCm, 40, 250), verified: true }); }
    await saveRecord(str(body.memberId, 40), r); await log("corrected participant record", { target: body.memberId, detail: JSON.stringify(p) });
  } else throw httpErr(400, "Unknown admin action.");
  return json(await buildState(admin, { adminView: true }));
}

// ---------- reminders (web push) ----------
// The keys for signing notifications are made once and kept in the private store, so no extra setup is needed.
// How the administrator's messages are signed in everyone's inbox.
const SENDER_SIGNATURE = "Dr Benadette Aineamani, Stoic Teacher";
// Parents who get their children's habit flags (child record → parent records). "ali" is matched by first name once Ali joins.
const DEFAULT_PARENTS = { judith: ["benadette"], patrick: ["benadette"], kgotso: ["thandi", "thabo"], limi: ["ali"], lichume: ["ali"], lihlumelo: ["ali"] };
const parentLinks = (config) => ({ ...DEFAULT_PARENTS, ...(config.parents || {}) });
/** Resolves a parent key to the record id of a linked, active account (by record id, or by first name for parents who join later). */
function resolveParent(key, accounts) {
  const act = accounts.filter((a) => a.status === "active" && a.memberId);
  const hit = act.find((a) => a.memberId === key) || act.find((a) => a.name.split(" ")[0].toLowerCase() === key);
  return hit ? hit.memberId : null;
}
/** One child's habits for one day, as the app logged them: what needs a parent's attention, and what went well. */
function childDay(engine, r, d, partial = false) {
  const flags = [], good = [], e = engine.eating(r, d), st = engine.dayStatus(r, d), first = (r.profile.name || "").split(" ")[0];
  if (!st.any && partial) return { name: first, date: d, flags: [], good, none: true, note: "Nothing logged yet today" };
  if (!st.any) return { name: first, date: d, flags: [{ label: "Nothing logged", how: "No food, water, movement or sleep was recorded" }], good, none: true };
  if (partial) { if (e.meals) good.push(`${e.meals} meal${e.meals === 1 ? "" : "s"} so far`); }
  else if (e.meals < 3) flags.push({ label: e.meals ? `Only ${e.meals} of 3 meals logged` : "No meals logged", how: "Growing children need 3 meals; check they are not skipping" });
  else good.push("3 meals");
  if (e.tooLittle && !partial) flags.push({ label: "Ate too little", how: `${Math.round(e.kcal)} kcal logged, below ${e.minKcal} kcal: too little for a growing child` });
  for (const f of e.flags) flags.push({ label: f.label, how: f.how });
  const g = engine.glasses(r, d), wt = engine.waterTarget(r);
  if (partial) { if (g) good.push(`${g} of ${wt} glasses so far`); }
  else if (g < wt) flags.push({ label: "Not enough water", how: `${g} of ${wt} glasses` }); else good.push(`${g} glasses of water`);
  const mins = engine.activeMinutes(r, d), steps = engine.daySteps(r, d);
  if (partial && mins < 20 && steps < engine.stepGoal()) { if (mins || steps) good.push(`${mins} active minutes so far`); }
  else if (mins < 20 && steps < engine.stepGoal()) flags.push({ label: "Not enough movement", how: mins || steps ? `${mins} active minutes, ${steps.toLocaleString("en-ZA")} steps (goal 20 minutes or ${engine.stepGoal().toLocaleString("en-ZA")} steps)` : "No movement logged" });
  else good.push(mins >= 20 ? `${mins} active minutes` : `${steps.toLocaleString("en-ZA")} steps`);
  const sl = engine.sleepOn(r, d), stg = engine.sleepTarget(r);
  if (!sl) flags.push({ label: "Sleep not logged", how: `Aim for ${stg} hours` }); else if (sl.hours < stg) flags.push({ label: "Short sleep", how: `${sl.hours} of ${stg} hours` }); else good.push(`${sl.hours} hours of sleep`);
  return { name: first, date: d, flags, good };
}
/** Which children each parent sees: { parentRecordId: [childRecordId...] }. */
function childrenByParent(config, accounts) {
  const out = {}, active = new Set(accounts.filter((a) => a.status === "active" && a.memberId).map((a) => a.memberId));
  for (const [child, parents] of Object.entries(parentLinks(config))) {
    if (!active.has(child)) continue;
    for (const k of parents) { const p = resolveParent(k, accounts); if (p && p !== child) (out[p] = out[p] || []).push(child); }
  }
  return out;
}
/** Week in review for every closed challenge week: most points, and most weight lost (% of body weight, adults only). */
function weekReviewFrom(engine, participants, records, summaries, results, today) {
  return engine.challengeWeeks().filter((w) => w.w1 < today).map((w) => {
    const ranked = participants.map((p) => ({ id: p.memberId, pts: summaries[p.memberId] ? summaries[p.memberId].weekPts[w.n] || 0 : 0 })).filter((x) => x.pts > 0).sort((a, b) => b.pts - a.pts);
    const top = ranked.length ? ranked[0].pts : 0, res = (results.weeks || []).find((x) => x.n === w.n) || {};
    // Under 18s are ranked too. To keep it safe for growing bodies, their loss counts for ranking up to 1% of body weight a week
    // (faster loss is not rewarded); the percentage shown is still their real one.
    // Weight winners come from the shared engine (same rule as the Weekly Biggest Loser badge).
    return { n: w.n, w0: w.w0, w1: w.w1, top, winners: ranked.filter((x) => x.pts === top).map((x) => x.id), podium: ranked.slice(0, 5), presentOn: res.presentOn || null, trophyDone: !!res.done,
      topPct: res.topPct || 0, weightWinners: res.weightWinners || [], weightPodium: res.weightPodium || [] };
  });
}
const fmtDay = (d) => new Date(d + "T12:00:00Z").toLocaleDateString("en-ZA", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
function parentMessage(reports) {
  return reports.map((c) => `${c.name}: ${c.flags.length ? c.flags.length + " flag" + (c.flags.length === 1 ? "" : "s") : "no flags ✅"}\n` + c.flags.map((f) => `⚠️ ${f.label}: ${f.how}`).join("\n") + (c.good.length ? `\n✅ Well done: ${c.good.join(", ")}` : "")).join("\n\n");
}
const FEEDBACK_AREAS = ["Food logging", "Exercise", "Water and sleep", "Points and awards", "Leaderboard", "Reminders", "Coach and challenges", "Profile and progress", "Something is not working", "New feature idea", "Other"];
const DEFAULT_PUSH_PREFS = { messages: true, meals: true, water: true, night: true, weighin: true, nudge: true, vitamin: true, meditate: true, journal: true, alerts: true };
const cleanPrefs = (p) => Object.fromEntries(Object.keys(DEFAULT_PUSH_PREFS).map((k) => [k, p[k] !== false]));
async function vapid() {
  let v = await getJ("_vapid");
  if (!v) { v = webpush.generateVAPIDKeys(); await setJ("_vapid", v); }
  return v;
}
async function sendPush(accountId, rec, payload) {
  const v = await vapid();
  if (env("PUSH_DRY_RUN")) { console.log("PUSH", accountId, JSON.stringify(payload)); return 1; }
  webpush.setVapidDetails("mailto:noreply@stoicbychoice.app", v.publicKey, v.privateKey);
  let ok = 0; const keep = [];
  for (const sub of rec.subs) {
    try { await webpush.sendNotification(sub, JSON.stringify(payload), { TTL: 3600 }); ok++; keep.push(sub); }
    catch (e) { if (e.statusCode !== 404 && e.statusCode !== 410) keep.push(sub); }
  }
  if (keep.length !== rec.subs.length) { rec.subs = keep; await setJ("push/" + accountId, rec); }
  return ok;
}
const saTime = () => new Date().toLocaleTimeString("en-GB", { timeZone: "Africa/Johannesburg", hour: "2-digit", minute: "2-digit", hour12: false });
const mins = (hm) => +hm.slice(0, 2) * 60 + +hm.slice(3, 5);
/** Runs every 15 minutes (netlify/functions/reminders.mjs): sends due reminders and makes the daily backup. */
export async function runScheduled(nowHM = env("TEST_TIME") || saTime()) {
  const today = todaySA(), now = mins(nowHM), due = (hm) => now >= mins(hm) && now < mins(hm) + 15;
  const [settings, config] = [await getSettings(), await getConfig()];
  const engine = makeEngine({ settings: () => settings, config: () => config, today: () => today, challengeDefs: () => [], adjustments: () => [] });
  const out = { sent: [], backup: null };
  // Daily automatic backup at 02:00, keeping the last 30 days.
  if (due("02:00")) {
    const { blobs } = await db().list(), data = {};
    for (const b of blobs) if (!/^(rl\/|code\/|backup\/|push\/)/.test(b.key)) data[b.key] = await getJ(b.key);
    await setJ("backup/" + today, { app: "stoic-by-choice", version: 1, created: new Date().toISOString(), data });
    const { blobs: old } = await db().list({ prefix: "backup/" });
    for (const b of old.map((x) => x.key).sort().slice(0, -30)) await db().delete(b);
    out.backup = today;
  }
  if (today < settings.start) return out;
  // Every Tuesday (the first day of a challenge week) from 07:00: one message to everyone celebrating last week's two winners.
  const cwk = engine.currentWeek();
  if (cwk.w0 === today && cwk.n > 1 && now >= mins("07:00") && (await getJ("_weekMsgSent")) !== cwk.n) {
    await setJ("_weekMsgSent", cwk.n);
    const accounts = await listAccounts(), active = accounts.filter((a) => a.status === "active" && a.memberId);
    const participants = active.map((a) => ({ memberId: a.memberId, name: a.name })), records = {};
    for (const p of participants) records[p.memberId] = await getRecord(p.memberId);
    const { summaries, results } = engine.computeAll(participants, records);
    const w = weekReviewFrom(engine, participants, records, summaries, results, today).find((x) => x.n === cwk.n - 1);
    if (w) {
      const nm = (id) => (active.find((a) => a.memberId === id) || {}).name || id, list = (ids) => ids.map(nm).join(" and ");
      const msg = [
        `🎉 Week ${w.n} is done and Week ${cwk.n} starts today!`,
        w.winners.length ? `🏆 Most points: ${list(w.winners)} with ${w.top} points.` : "🏆 Most points: nobody scored points last week.",
        w.weightWinners.length ? `⚖️ Most weight lost: ${list(w.weightWinners)}, ${String(w.topPct).replace(".", ",")}% of body weight. Biggest Loser badge unlocked. Treat yourself! 🎁` : "⚖️ Most weight lost: no weight loss was logged last week. Log your weight this week!",
        "Congratulations! 👏🏾",
        `Week ${cwk.n} runs ${fmtDay(cwk.w0)} to ${fmtDay(cwk.w1)}. Everyone starts on 0 points. Anyone can win this week. Let's go! 💪🏾`,
        w.winners.length ? `🏅 Weekly Challenge badge unlocked for ${list(w.winners)}. See the Awards page.` : "",
      ].filter(Boolean).join("\n\n");
      const x = { id: rid(6), title: `🎉 Week ${cwk.n} starts! Congratulations to Week ${w.n}'s winners`, message: msg, to: "all", until: cwk.w0, date: today, time: nowHM, by: SENDER_SIGNATURE, kind: "newweek" };
      const anns = (await getJ("_announcements")) || []; anns.push(x); await setJ("_announcements", anns.slice(-200));
      out.newWeek = cwk.n;
      const { blobs } = await db().list({ prefix: "push/" });
      for (const b of blobs) {
        const rec = await getJ(b.key); if (!rec || !rec.subs || !rec.subs.length) continue;
        if ({ ...DEFAULT_PUSH_PREFS, ...(rec.prefs || {}) }.messages === false) continue;
        await sendPush(b.key.slice(5), rec, { title: x.title, body: `${w.winners.length ? "🏆 " + list(w.winners) : ""}${w.weightWinners.length ? " · ⚖️ " + list(w.weightWinners) : ""}. Anyone can win this week. Let's go!`, url: "/#review" });
      }
    }
  }
  // 21:00 on the last day of a challenge month: announce the monthly winner to everyone and save it, so it never changes.
  const cmon = engine.challengeMonths().find((m) => m.to === today);
  if (cmon && now >= mins("21:00") && !((config.monthAwards || {})[cmon.key])) {
    const accounts = await listAccounts(), active = accounts.filter((a) => a.status === "active" && a.memberId);
    const participants = active.map((a) => ({ memberId: a.memberId, name: a.name })), records = {};
    for (const p of participants) records[p.memberId] = await getRecord(p.memberId);
    const { summaries } = engine.computeAll(participants, records);
    const pts = participants.map((p) => ({ id: p.memberId, v: (summaries[p.memberId] || { monthPts: {} }).monthPts[cmon.key] || 0 })), top = Math.max(0, ...pts.map((x) => x.v));
    const lost = participants.map((p) => { const r = records[p.memberId], pct = engine.weekLoss(r, cmon.from, cmon.to), junior = engine.isMinor(r); return { id: p.memberId, pct, rank: junior ? Math.min(pct || 0, 4) : pct }; }).filter((x) => x.pct > 0).sort((a, b) => b.rank - a.rank);
    const wWin = lost.length ? lost.filter((x) => x.rank === lost[0].rank) : [];
    const snap = { date: today, top, winners: top > 0 ? pts.filter((x) => x.v === top).map((x) => x.id) : [], topPct: wWin.length ? Math.max(...wWin.map((x) => x.pct)) : 0, weightWinners: wWin.map((x) => x.id) };
    const cur = (await getJ("_config")) || {}; cur.monthAwards = { ...(cur.monthAwards || {}), [cmon.key]: snap }; await setJ("_config", cur);
    const nm = (id) => (active.find((a) => a.memberId === id) || {}).name || id, list = (ids) => ids.map(nm).join(" and ");
    const msg = [
      `🎉 ${cmon.label} ends today!`,
      snap.winners.length ? `🏆 Monthly Challenge winner: ${list(snap.winners)} with ${snap.top} points. Monthly Challenge badge unlocked!` : "🏆 Nobody scored points this month.",
      snap.weightWinners.length ? `⚖️ Most weight lost this month: ${list(snap.weightWinners)}, ${String(snap.topPct).replace(".", ",")}% of body weight. Treat yourself! 🎁` : "",
      "Congratulations! 👏🏾",
      "A new month starts tomorrow. Everyone starts on 0. Anyone can win. Let's go! 💪🏾",
    ].filter(Boolean).join("\n\n");
    const x = { id: rid(6), title: `🏆 ${cmon.label}: congratulations to the winner!`, message: msg, to: "all", until: addDays(today, 1), date: today, time: nowHM, by: SENDER_SIGNATURE, kind: "newmonth" };
    const anns = (await getJ("_announcements")) || []; anns.push(x); await setJ("_announcements", anns.slice(-200));
    out.month = cmon.key;
    const { blobs } = await db().list({ prefix: "push/" });
    for (const b of blobs) {
      const rec = await getJ(b.key); if (!rec || !rec.subs || !rec.subs.length) continue;
      if ({ ...DEFAULT_PUSH_PREFS, ...(rec.prefs || {}) }.messages === false) continue;
      await sendPush(b.key.slice(5), rec, { title: x.title, body: snap.winners.length ? `🏆 ${list(snap.winners)} · ${snap.top} points. Tap to celebrate!` : "Tap to see the month in review.", url: "/#review" });
    }
  }
  // 07:30: yesterday's habit flags for each child go to their parent's inbox (and phone), only when something needs attention.
  if (due("07:30") && (await getJ("_parentSent")) !== today) {
    await setJ("_parentSent", today);
    const accounts = await listAccounts(), y = addDays(today, -1), anns = (await getJ("_announcements")) || [];
    out.parents = [];
    for (const [pid, kids] of Object.entries(childrenByParent(config, accounts))) {
      const reps = []; for (const k of kids) reps.push(childDay(engine, await getRecord(k), y));
      const n = reps.reduce((a, c) => a + c.flags.length, 0); if (!n) continue;
      const x = { id: rid(6), title: `👨‍👩‍👧 For your attention: ${reps.filter((c) => c.flags.length).map((c) => c.name).join(", ")} (${fmtDay(y)})`, message: parentMessage(reps) + "\n\nFrom the app logs. A kind word helps more than a telling off.", to: pid, until: null, date: today, time: nowHM, by: SENDER_SIGNATURE, kind: "parent" };
      anns.push(x); out.parents.push([pid, n]);
      const acct = accounts.find((a) => a.memberId === pid), rec = acct && (await getJ("push/" + acct.id));
      if (rec && rec.subs && rec.subs.length && { ...DEFAULT_PUSH_PREFS, ...(rec.prefs || {}) }.messages !== false) await sendPush(acct.id, rec, { title: x.title, body: `${n} habit flag${n === 1 ? "" : "s"} from yesterday. Tap to see.`, url: "/#inbox" });
    }
    await setJ("_announcements", anns.slice(-200));
  }
  const { blobs } = await db().list({ prefix: "push/" });
  const wd = engine.isWeighDay(addDays(today, 1));
  for (const b of blobs) {
    const id = b.key.slice(5), rec = await getJ(b.key); if (!rec || !rec.subs || !rec.subs.length) continue;
    const prefs = { ...DEFAULT_PUSH_PREFS, ...(rec.prefs || {}) }, sent = (rec.sent && rec.sent[today]) || [];
    const send = async (key, title, body, url = "/") => { if (sent.includes(key)) return; if (await sendPush(id, rec, { title, body, url })) { sent.push(key); out.sent.push([rec.name, key]); } };
    const r = rec.memberId ? await getRecord(rec.memberId) : null;
    if (r) {
      const ea = engine.eating(r, today), slots = new Set(r.foods.filter((f) => f.date === today).map((f) => ({ Breakfast: 1, "Meal 1": 1, Lunch: 2, "Meal 2": 2, Dinner: 3, "Meal 3": 3 })[f.meal]).filter(Boolean));
      const g = engine.glasses(r, today), wt = engine.waterTarget(), any = engine.dayStatus(r, today).any;
      if (prefs.meals) {
        if (due("08:00") && !slots.has(1)) await send("m1", "🌅 Breakfast", "Log your breakfast (Meal 1) with the time you ate it.", "/#food");
        if (due("13:00") && !slots.has(2)) await send("m2", "☀️ Lunch", "Log your lunch (Meal 2). About 5 hours after breakfast.", "/#food");
        if (due("18:30") && !slots.has(3)) await send("m3", "🌙 Dinner", "Log your dinner (Meal 3). Last meal before 9 PM.", "/#food");
      }
      if (prefs.water) for (const [hm, part] of [["10:30", 2], ["14:30", 4], ["17:30", 6]]) if (due(hm) && g < part) await send("w" + hm, "🥛 Water", `${g} of ${wt} glasses so far. Time for a glass (250 ml).`, "/#water");
      if (prefs.night && due("20:15") && ea.meals < 3) await send("night", "🕘 Last meal before 9 PM", `You have logged ${ea.meals} of 3 meals. Eat and log dinner before 9 PM.`, "/#food");
      if (prefs.nudge && due("20:00") && !any) await send("nudge", "👋🏾 Check in today", "Nothing logged yet today. A day with nothing logged costs 10 points at midnight.", "/");
      const done = (k) => (r.routine || []).some((x) => x.date === today && x.kind === k);
      const vit = done("vitamin") || r.foods.some((f) => f.date === today && /^(centrum|vitamins|vitc)$/.test(f.foodId || ""));
      if (prefs.vitamin && due("08:30") && !vit) await send("vit", "💊 Vitamin time", "Take your Centrum (or daily vitamin) with breakfast and tick it in the app.", "/");
      if (prefs.meditate && due("12:30") && !done("meditate")) await send("med", "🧘🏾 5 minute pause", "Take 5 minutes: sit still, breathe slowly, notice what is in your control.", "/");
      if (prefs.journal && due("21:00") && !done("write")) await send("write", "✍🏾 Quick journal", "Write a few lines about anything today, on paper or in the app. Then tick it.", "/");
      if (prefs.weighin && wd && due("19:00")) await send("weighin", "⚖️ Weigh in tomorrow", "Official weigh in tomorrow morning. Drink your water and sleep well tonight.", "/");
    }
    if (rec.role === "admin" && prefs.alerts && due("08:00")) {
      const alerts = await safetyAlerts(engine, today);
      if (alerts.length) await send("alerts", "🛡️ Safety alerts", alerts.slice(0, 3).map((x) => x.text).join(" · "), "/#admin");
    }
    rec.sent = { [today]: sent }; await setJ(b.key, rec);
  }
  return out;
}
/** Private alerts for the administrator: under 18s eating too little, losing too fast, or anyone not logging. */
async function safetyAlerts(engine, today) {
  const accounts = (await listAccounts()).filter((a) => a.status === "active" && a.memberId), out = [];
  for (const a of accounts) {
    const r = await getRecord(a.memberId), name = a.name.split(" ")[0];
    const y1 = addDays(today, -1), y2 = addDays(today, -2), y3 = addDays(today, -3);
    if (engine.isMinor(r)) {
      const low = [y1, y2].filter((d) => { const e = engine.eating(r, d); return e.kcal > 0 && e.kcal < 1200; });
      if (low.length === 2) out.push({ level: "high", who: name, text: `${name} (under 18) ate under 1 200 kcal on 2 days in a row` });
    }
    const wv = r.weights.filter((w) => w.verified).sort((x, y) => x.date.localeCompare(y.date));
    if (wv.length >= 2) { const [p, c] = wv.slice(-2), weeks = Math.max(1, (new Date(c.date) - new Date(p.date)) / 6048e5), rate = (p.kg - c.kg) / weeks; if (rate > engine.maxRate(r) + 0.05) out.push({ level: "high", who: name, text: `${name} lost ${rate.toFixed(1)} kg a week (safe pace ${engine.maxRate(r)} kg)` }); }
    if (r.profile.joinedDate && r.profile.joinedDate <= y3 && ![y1, y2, y3].some((d) => engine.dayStatus(r, d).any)) out.push({ level: "medium", who: name, text: `${name} has not logged for 3 days` });
  }
  return out;
}

export default async (req) => {
  try {
    const url = new URL(req.url);
    const path = url.pathname.replace(/^\/api\/?/, "");
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    if (path.startsWith("auth/")) return await handleAuth(path.slice(5), req, body);
    if (path === "state" && req.method === "GET") {
      const acct = await requireSession(req);
      if (acct.status !== "active") return json({ me: publicAccount(acct), pending: true, settings: await getSettings(), config: { rulesText: (await getConfig()).rulesText } });
      return json(await buildState(acct));
    }
    if (path === "data" && req.method === "POST") return await handleData(req, body);
    if (path === "admin" && req.method === "POST") return await handleAdmin(req, body);
    if (path === "push/key" && req.method === "GET") return json({ publicKey: (await vapid()).publicKey });
    if (path === "push/subscribe" && req.method === "POST") {
      const acct = await requireSession(req), sub = body.subscription;
      if (!sub || typeof sub.endpoint !== "string" || !/^https:\/\//.test(sub.endpoint)) throw httpErr(400, "Notifications could not be turned on on this phone.");
      const rec = (await getJ("push/" + acct.id)) || { subs: [], prefs: DEFAULT_PUSH_PREFS, sent: {} };
      rec.subs = [...rec.subs.filter((x) => x.endpoint !== sub.endpoint), { endpoint: sub.endpoint, keys: sub.keys || {} }].slice(-4);
      if (body.prefs) rec.prefs = cleanPrefs(body.prefs);
      rec.memberId = acct.memberId; rec.role = acct.role; rec.name = acct.name;
      await setJ("push/" + acct.id, rec);
      return json({ ok: true, prefs: rec.prefs });
    }
    if (path === "push/prefs" && req.method === "POST") {
      const acct = await requireSession(req), rec = (await getJ("push/" + acct.id)) || { subs: [], sent: {} };
      rec.prefs = cleanPrefs(body.prefs || {}); await setJ("push/" + acct.id, rec); return json({ ok: true, prefs: rec.prefs });
    }
    if (path === "push/off" && req.method === "POST") { const acct = await requireSession(req); await db().delete("push/" + acct.id); return json({ ok: true }); }
    if (path === "push/test" && req.method === "POST") {
      const acct = await requireSession(req), rec = await getJ("push/" + acct.id);
      if (!rec || !rec.subs.length) throw httpErr(400, "Turn on reminders first.");
      await sendPush(acct.id, rec, { title: "Stoic by Choice", body: "✅ Reminders are working on this phone.", url: "/" });
      return json({ ok: true });
    }
    if (path === "scan/memory" && req.method === "GET") {
      const acct = await requireSession(req); if (!acct.memberId) return json({ items: [] });
      return json({ items: ((await getJ("scan/" + acct.memberId)) || []).map((x) => ({ label: x.label, vec: x.vec })) });
    }
    if (path === "scan/learn" && req.method === "POST") {
      // Personal food scanner memory: image features (numbers, never the photo) with the food the person chose.
      const acct = await requireSession(req); if (!acct.memberId) throw httpErr(403, "Please join first.");
      const l = body.label || {}, vec = str(body.vec, 6000);
      if (!/^[A-Za-z0-9+/=]{100,}$/.test(vec)) throw httpErr(400, "Scan data was not valid.");
      const label = { type: ["food", "plan", "custom"].includes(l.type) ? l.type : "food", id: str(l.id, 40), name: str(l.name, 80), kcal: num(l.kcal, 0, 5000) || 0, amount: num(l.amount, 0, 2000), qty: num(l.qty, 0, 5) };
      if (label.type === "food" && !FOOD_BY_ID[label.id]) throw httpErr(400, "Unknown food.");
      const list = (await getJ("scan/" + acct.memberId)) || [];
      list.push({ label, vec, at: new Date().toISOString() });
      await setJ("scan/" + acct.memberId, list.slice(-80));
      return json({ ok: true, count: Math.min(80, list.length) });
    }
    if (path === "steps-sync" && req.method === "POST") {
      // Used by the iPhone Shortcut: { code, steps }. Saves today's step total for the owner of the code.
      await rateLimit("sync:" + clientIp(req), 30, 60);
      const code = str(body.code, 40), steps = Math.round(Number(String(body.steps).replace(/[^\d.]/g, "")));
      if (!code || !(steps >= 0 && steps <= 100000)) throw httpErr(400, "Send a valid code and step count.");
      const acct = (await listAccounts()).find((a) => a.syncHash && a.syncHash === sha(code) && a.status === "active" && a.memberId);
      if (!acct) throw httpErr(403, "Unknown sync code. Make a new one in the app (Progress, Step sync).");
      const r = await getRecord(acct.memberId), today = todaySA();
      r.steps = r.steps.filter((x) => x.date !== today); r.steps.push({ id: rid(6), date: today, steps, source: "shortcut" });
      await markJoined(acct.memberId); await saveRecord(acct.memberId, r);
      return json({ ok: true, message: `Saved ${steps} steps for today.` });
    }
    if (path === "public" && req.method === "GET") { const c = await getConfig(); return json({ settings: await getSettings(), rulesText: c.rulesText, privacyText: c.privacyText, avatars: AVATARS }); }
    return json({ error: "Not found" }, 404);
  } catch (e) {
    if (!e.status) console.error(e);
    return json({ error: e.status ? e.message : "Something went wrong on the server.", ...(e.extra || {}) }, e.status || 500);
  }
};

export const config = { path: "/api/*" };
