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
import { JOURNAL_CHECKS, makeEngine, DEFAULT_CONFIG, DEFAULT_SETTINGS, AVATARS, PRIVATE_FIELDS, SEALED_FIELDS, finaleTime, normRecord, todaySA as realToday, addDays } from "../../public/core.js";
import { FOOD_BY_ID } from "../../public/foods.js";

const env = (k) => (globalThis.Netlify?.env?.get?.(k) ?? process.env[k] ?? "");
// TEST_TODAY lets a test server pretend to be on another date. Never set it on the live site.
const todaySA = () => env("TEST_TODAY") || realToday();
const SECRET = () => { const s = env("SESSION_SECRET"); if (!s || s.length < 16) throw httpErr(500, "Server not configured: set SESSION_SECRET"); return s; };
const COLORS = ["#E4572E", "#7B5CD6", "#F2A516", "#2E8B57", "#2F7FC1", "#D6457F", "#14A3A3", "#B8801A", "#8E44AD", "#C0392B", "#27AE60", "#2980B9"];
const SESSION_DAYS = 30;

// Starting data from the crew's notebook (23 Nov 2024 "before" and Saturday 14 Nov 2026 start), with target weights.
const SEED = {
  benadette: { name: "Benadette", sex: "f", before: 100.9, start: 70.9, goal: 62 },
  thandi: { name: "Thandi", sex: "f", before: 118.5, start: 88.5, goal: 70 },
  kgotso: { name: "Kgotso", sex: "m", before: 76.4, start: 52.8, goal: 45 },
  judith: { name: "Judith", sex: "f", before: 94.0, start: 77.6, goal: 60 },
  patrick: { name: "Patrick", sex: "m", before: 79.8, start: 64.4, goal: 50 },
  thabo: { name: "Thabo", sex: "m", before: 116.3, start: 99.3, goal: 85 },
};
function seeded(m) {
  const x = SEED[m], r = normRecord({});
  if (!x) return r;
  r.profile = { name: x.name, sex: x.sex, age: null, heightCm: null, startWeight: x.start, goalWeight: x.goal, activity: 1.375, rate: 0.5, kidPlan: "controlled", beforeWeight: x.before, beforeDate: "2024-11-23" };
  r.weights = [{ id: "start-2026-11-14", date: "2026-11-14", kg: x.start, verified: true }];
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
const getConfig = async () => { const c = (await getJ("_config")) || {}; return { ...DEFAULT_CONFIG, ...c, points: { ...DEFAULT_CONFIG.points, ...(c.points || {}) }, treat: { ...DEFAULT_CONFIG.treat, ...(c.treat || {}) }, water: { ...DEFAULT_CONFIG.water, ...(c.water || {}) }, sleep: { ...DEFAULT_CONFIG.sleep, ...(c.sleep || {}) }, steps: { ...DEFAULT_CONFIG.steps, ...(c.steps || {}) }, finale: { ...DEFAULT_CONFIG.finale, ...(c.finale || {}) }, prizes: { ...DEFAULT_CONFIG.prizes, ...(c.prizes || {}) }, pin: { ...DEFAULT_CONFIG.pin, ...(c.pin || {}) } }; };
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
  const today = todaySA();
  const engine = makeEngine({ settings: () => settings, config: () => config, today: () => today, challengeDefs: () => challenges, adjustments: () => adjustments });
  const { summaries, results } = engine.computeAll(participants, records);
  const isAdmin = viewer.role === "admin" && adminView;
  // The Grand Finale: final standings stay sealed for everyone (administrator included) until the reveal.
  const revealAt = finaleTime(settings, config);
  const revealed = !!config.finale.revealed || Date.now() >= Date.parse(revealAt);
  const cwk = engine.currentWeek().n, cmonth = today.slice(0, 7);
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
  if (!revealed) Object.assign(results, { biggestLoser: null, consistent: [], resilience: [], ranking: [], blRank: [], effortRank: [] });
  else {
    // Podiums for the ceremony: percentage lost (official weigh ins) and effort points.
    results.blTop = results.blRank.slice(0, 3).map((id) => ({ id, pct: Math.round(summaries[id].pctSafe * 10) / 10 }));
    results.effortTop = results.effortRank.slice(0, 3).map((id) => ({ id, pts: summaries[id].habit }));
  }
  const t = today;
  const aggregates = { lostKg: 0, since2024: 0 };
  for (const p of participants) { const sm = summaries[p.memberId], r = records[p.memberId]; if (sm.lostKg > 0) aggregates.lostKg += sm.lostKg; const bw = r.profile.beforeWeight, cw = engine.latestWeight(r); if (bw && cw && bw > cw) aggregates.since2024 += bw - cw; }
  const out = {
    aggregates,
    serverToday: today, settings, finale: { revealed, revealAt }, config: { points: config.points, treat: config.treat, water: config.water, sleep: config.sleep, steps: config.steps, prizes: config.prizes, rulesText: config.rulesText, privacyText: config.privacyText },
    me: publicAccount(viewer), participants, summaries: shared, results,
    myRecord: viewer.memberId ? records[viewer.memberId] || (await getRecord(viewer.memberId)) : null,
    challenges: challenges.filter((c) => c.end >= addDays(t, -31)),
    manualAwards: manualAwards.map((x) => ({ id: x.id, memberId: x.memberId, award: x.award, note: x.note, date: x.date })),
    announcements: announcements.filter((x) => (!x.until || x.until >= t) && (x.to === "all" || x.to === viewer.memberId)).slice(-10).reverse(),
  };
  if (isAdmin) {
    out.admin = {
      accounts: accounts.map(publicAccount), records: Object.fromEntries(Object.entries(records).map(([k, r]) => [k, { ...r, reflections: r.reflections.map((x) => ({ id: x.id, date: x.date })) }])), config, adjustments, announcements: announcements.slice().reverse(),
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
const TYPES = ["foods", "exercises", "weights", "treats", "tasks", "reflections", "challenges", "water", "sleep", "steps", "checkins"];
function cleanEntry(type, e = {}, today) {
  const base = { id: str(e.id, 40) || rid(6), date: isDate(e.date) ? e.date : null };
  if (!base.date || base.date > today || base.date < "2026-11-01") throw httpErr(400, "That date cannot be used.");
  if (type === "foods") {
    const meal = str(e.meal, 20) || "Snack", qty = Math.min(5, Math.max(0.25, Number(e.qty) || 1));
    const f = FOOD_BY_ID[e.foodId];
    // Known foods: the standard calorie count is applied here on the server, whatever the app sends.
    if (f) return { ...base, meal, foodId: f.id, qty, name: `${f.name} (${qty === 1 ? "" : qty + " × "}${f.serving})`, kcal: Math.round(f.kcal * qty) };
    const kcal = num(e.kcal, 0, 5000);
    if (kcal === null || !str(e.name, 80)) throw httpErr(400, "Please choose a food from the list, or enter a custom food with its calories.");
    return { ...base, meal, name: str(e.name, 80), kcal, custom: true };
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
  } else if (body.action === "add" && TYPES.includes(body.type)) {
    const e = cleanEntry(body.type, body.entry, today);
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
      points: P, treat: { minutes: num(c.treat?.minutes ?? cur.treat.minutes, 30, 1000), kcal: num(c.treat?.kcal ?? cur.treat.kcal, 0, 1000) },
      pin: { maxAttempts: num(c.pin?.maxAttempts ?? cur.pin.maxAttempts, 3, 10), lockMinutes: num(c.pin?.lockMinutes ?? cur.pin.lockMinutes, 1, 1440), hardLockAfter: num(c.pin?.hardLockAfter ?? cur.pin.hardLockAfter, 5, 50) },
      water: { target: num(c.water?.target ?? cur.water?.target ?? 8, 1, 20) },
      sleep: { target: num(c.sleep?.target ?? cur.sleep?.target ?? 7, 4, 12) },
      steps: { goal: num(c.steps?.goal ?? cur.steps?.goal ?? 7500, 1000, 30000) },
      finale: cur.finale,
      prizes: { bl: num(c.prizes?.bl ?? cur.prizes?.bl ?? 10000, 0, 1000000), effort: num(c.prizes?.effort ?? cur.prizes?.effort ?? 2000, 0, 1000000) },
      autoApprove: !!(c.autoApprove ?? cur.autoApprove), rulesText: str(c.rulesText ?? cur.rulesText, 4000), privacyText: str(c.privacyText ?? cur.privacyText, 6000),
    };
    await setJ("_config", next); await log("changed settings and scoring", { detail: JSON.stringify(next.points) });
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
  } else if (a === "announce") {
    const l = await list("_announcements");
    if (body.remove) { await setJ("_announcements", l.filter((x) => x.id !== body.remove)); await log("removed announcement"); }
    else {
      const x = { id: rid(6), title: str(body.title, 80), message: str(body.message, 600), to: str(body.to, 40) || "all", until: isDate(body.until) ? body.until : null, date: todaySA(), by: admin.name };
      if (!x.message) throw httpErr(400, "Please write a message.");
      l.push(x); await setJ("_announcements", l.slice(-200)); await log("sent announcement", { detail: `${x.to}: ${x.title}` });
    }
  } else if (a === "weights") {
    const date = body.date === "start" ? null : body.date;
    if (date && (!isDate(date) || date > todaySA())) throw httpErr(400, "Please choose a valid weigh in date.");
    let n = 0;
    for (const e of body.entries || []) {
      const kg = num(e.kg, 20, 400); if (!kg || !e.memberId) continue;
      const r = await getRecord(e.memberId);
      if (!date) { r.profile.startWeight = kg; r.weights = r.weights.filter((w) => w.date !== "2026-11-14"); r.weights.push({ id: "start-2026-11-14", date: "2026-11-14", kg, verified: true }); }
      else { r.weights = r.weights.filter((w) => w.date !== date); r.weights.push({ id: rid(6), date, kg, verified: true }); }
      await saveRecord(e.memberId, r); n++;
    }
    await log("recorded group weigh in", { detail: `${n} weights for ${date || "starting weights"}` });
  } else if (a === "profile") {
    const r = await getRecord(str(body.memberId, 40)), p = body.profile || {};
    for (const k of ["startWeight", "goalWeight", "beforeWeight"]) if (k in p) r.profile[k] = num(p[k], 10, 400);
    await saveRecord(str(body.memberId, 40), r); await log("corrected participant record", { target: body.memberId, detail: JSON.stringify(p) });
  } else throw httpErr(400, "Unknown admin action.");
  return json(await buildState(admin, { adminView: true }));
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
    if (path === "public" && req.method === "GET") { const c = await getConfig(); return json({ settings: await getSettings(), rulesText: c.rulesText, privacyText: c.privacyText, avatars: AVATARS }); }
    return json({ error: "Not found" }, 404);
  } catch (e) {
    if (!e.status) console.error(e);
    return json({ error: e.status ? e.message : "Something went wrong on the server.", ...(e.extra || {}) }, e.status || 500);
  }
};

export const config = { path: "/api/*" };
