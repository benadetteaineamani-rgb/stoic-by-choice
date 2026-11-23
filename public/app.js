/* Stoic by Choice · Biggest Loser Challenge (participant and admin app)
   Talks to the secure API in netlify/functions/api.mjs. Points, rankings and awards are calculated on the
   server with the same rules file (core.js) that this app uses for display. */
import { FOODS, FOOD_BY_ID, CATEGORIES, SERVINGS, GRAM_CHIPS, foodKcal, searchFoods } from "./foods.js";
import { makeEngine, finaleTime, MOVE_MINUTES, PLANS, NOT_ALLOWED, WEIGH_MIN_PER_WEEK, DEFAULT_SETTINGS, DEFAULT_CONFIG, AVATARS, DAILY_TASKS, taskFor, BADGES, HOLIDAYS, MOODS, SLEEP_QUALITY, JOURNAL_CHECKS, KCAL_PER_KG, todaySA, addDays, diffDays, pad, dow, holiday, emptyRecord, normRecord } from "./core.js";

(() => {
  "use strict";

  let MEMBERS = []; // filled from the server: { id, name, color, avatar, group }
  // Non food rewards unlocked for every 2.5% of starting weight lost.
  const REWARDS = [
    "👟 New workout gear or trainers", "🎬 Family movie night, you choose the film", "💆🏾 Pamper or spa session",
    "🎧 A new playlist or audiobook", "🌳 Day trip or picnic at a nature reserve", "👗 Something new to wear in your new size",
    "📚 A book you have been wanting", "🏆 Crew shout out and the crown for a day",
  ];
  let POINTS = { ...DEFAULT_CONFIG.points };
  let TREAT = { ...DEFAULT_CONFIG.treat, bonus: DEFAULT_CONFIG.points.treatBonus };
  const POLL_MS = 15000;

  // Approximate calories per typical serving. Labels on packaging are more accurate.
  const QUICK_FOODS = [
    ["Pap, 1 cup", 200], ["Brown bread, 1 slice", 80], ["Oats, 1 cup cooked", 160], ["Boiled egg", 78],
    ["Rice, 1 cup", 205], ["Chicken breast, 100 g", 165], ["Grilled fish, 100 g", 130], ["Boerewors, 100 g", 290],
    ["Chakalaka, ½ cup", 90], ["Morogo / spinach, ½ cup", 40], ["Beans, ½ cup", 120], ["Mixed salad, bowl", 50],
    ["Apple", 95], ["Banana", 105], ["Peanut butter, 1 tbsp", 95], ["Amasi / maas, 250 ml", 160],
    ["Rooibos, 2 sugars", 32], ["Fizzy drink, 330 ml", 139], ["Vetkoek, 1", 300], ["Fruit juice, 250 ml", 115],
  ];

  // MET values, approximated from the Compendium of Physical Activities.
  // [name, MET (Compendium of Physical Activities), typical speed km/h (0 = no distance), steps per km (0 = no steps)]
  // Activities: [name, MET, km per hour, steps per km, group]. METs from the 2011 / 2024 Compendium of Physical Activities.
  // Distance items: [name, kcal per kg per km, minutes per km, steps per km, group, fixed km]. Running costs about 1 kcal per kg per km.
  const ACTIVITIES = [
    ["Walking, moderate pace", 3.5, 4.8, 1300, "Walking and running"], ["Walking, brisk", 4.3, 5.6, 1250, "Walking and running"], ["Hiking", 6.0, 4.0, 1400, "Walking and running"],
    ["Jogging", 7.0, 8.0, 1100, "Walking and running"], ["Running, 10 km/h", 9.8, 10, 1000, "Walking and running"], ["Running, 12 km/h", 11.5, 12, 950, "Walking and running"],
    ["Walk 3 km", 0.55, 12, 1300, "Distance", 3], ["Walk 5 km", 0.55, 12, 1300, "Distance", 5], ["Walk 10 km", 0.55, 12, 1300, "Distance", 10],
    ["Run 3 km", 1.0, 7, 1050, "Distance", 3], ["Run 5 km (parkrun)", 1.0, 7, 1050, "Distance", 5], ["Run 10 km", 1.0, 7, 1050, "Distance", 10],
    ["Run 15 km", 1.0, 7, 1050, "Distance", 15], ["Run 20 km", 1.0, 7, 1050, "Distance", 20], ["Run 21.1 km (half marathon)", 1.0, 7, 1050, "Distance", 21.1],
    ["Run 30 km", 1.0, 7, 1050, "Distance", 30], ["Run 42.2 km (marathon)", 1.0, 7, 1050, "Distance", 42.2],
    ["Cycle 10 km", 0.28, 3, 0, "Distance", 10], ["Cycle 20 km", 0.28, 3, 0, "Distance", 20], ["Cycle 30 km", 0.28, 3, 0, "Distance", 30],
    ["Spinning class (indoor cycling)", 8.5, 0, 0, "Gym"], ["Stationary bike, moderate", 6.8, 0, 0, "Gym"], ["Treadmill walk, incline", 6.0, 0, 0, "Gym"],
    ["Treadmill run", 9.0, 0, 0, "Gym"], ["Elliptical / cross trainer", 5.0, 0, 0, "Gym"], ["Rowing machine", 7.0, 0, 0, "Gym"],
    ["Stair climber machine (StairMaster)", 9.0, 0, 0, "Gym"], ["Weights / strength training", 3.5, 0, 0, "Gym"], ["Weights, vigorous", 6.0, 0, 0, "Gym"],
    ["Circuit training", 8.0, 0, 0, "Gym"], ["HIIT / bootcamp", 8.0, 0, 0, "Gym"], ["CrossFit", 8.0, 0, 0, "Gym"], ["Body pump / resistance class", 5.0, 0, 0, "Gym"],
    ["Boxing / kickboxing class", 7.8, 0, 0, "Gym"], ["Zumba", 6.5, 0, 0, "Gym"], ["Aerobics / step class", 7.3, 0, 0, "Gym"], ["Pilates", 3.0, 0, 0, "Gym"],
    ["Yoga / stretching", 2.5, 0, 0, "Gym"], ["Push ups, sit ups, squats (vigorous)", 8.0, 0, 0, "Gym"], ["Aqua aerobics", 5.3, 0, 0, "Gym"],
    ["Stairs: up to a floor and back down", 0, 0, 0, "Stairs", "floors"],
    ["Stairs up, lift back down", 0, 0, 0, "Stairs", "floors", "up"],
    ["Stairs, walking up and down", 4.0, 0, 0, "Stairs"], ["Stairs, fast climbing", 8.8, 0, 0, "Stairs"], ["Running up stairs", 15.0, 0, 0, "Stairs"],
    ["Cycling, leisurely", 4.0, 15, 0, "Other"], ["Cycling, moderate", 8.0, 20, 0, "Other"], ["Swimming, leisurely", 6.0, 2, 0, "Other"], ["Swimming laps, vigorous", 9.8, 2.5, 0, "Other"],
    ["Social dancing", 4.5, 0, 0, "Other"], ["Skipping rope", 11.8, 0, 0, "Other"], ["Soccer / netball, casual", 7.0, 0, 0, "Other"], ["Tennis", 7.3, 0, 0, "Other"],
    ["Basketball", 6.5, 0, 0, "Other"], ["Gardening", 3.8, 0, 0, "Other"], ["House cleaning", 3.3, 0, 0, "Other"],
  ];
  // One tap activities: [button label, activity name, minutes, km or floors]
  const QUICK_MOVES = [["🚶🏾 Walk 30 min", "Walking, brisk", 30], ["🏃🏾 Run 5 km", "Run 5 km (parkrun)", 35], ["🏢 Stairs to floor 15 and back", "Stairs: up to a floor and back down", 8, 15], ["🛗 Stairs up, lift down: how many times?", "Stairs up, lift back down", 0, 0, "ask"], ["🚴🏾 Spinning 45 min", "Spinning class (indoor cycling)", 45], ["🏋🏾 Gym weights 45 min", "Weights / strength training", 45], ["💃🏾 Dance 30 min", "Social dancing", 30]];
  function quickEntry(q) {
    const i = ACTIVITIES.findIndex((x) => x[0] === q[1]), act = ACTIVITIES[i], w = latestWeight(rec(state.me)) || 70, mins = q[2];
    if (act[5] === "floors") { const up = q[3] * 20; return { activity: `Stairs to floor ${q[3]} and back`, minutes: mins, kcal: Math.round(up * 0.16 * w / 70), distanceKm: 0, steps: up * 2 }; }
    if (typeof act[5] === "number") return { activity: act[0], minutes: mins, kcal: Math.round(act[1] * w * act[5]), distanceKm: act[5], steps: Math.round(act[5] * act[3]) };
    const km = act[2] ? Math.round((act[2] * mins) / 60 * 10) / 10 : 0;
    return { activity: act[0], minutes: mins, kcal: Math.round(act[1] * w * mins / 60), distanceKm: km, steps: act[3] ? Math.round(km * act[3]) : 0 };
  }
  const ACT_GROUPS = ["Walking and running", "Distance", "Gym", "Stairs", "Other"];

  // Stoic motivation. Translations: Marcus Aurelius (George Long, 1862), Seneca (R. M. Gummere, 1917), Epictetus (George Long, 1890).
  const STOIC = [
    ["In the morning when thou risest unwillingly, let this thought be present: I am rising to the work of a human being.", "Marcus Aurelius, Meditations 5.1", "Rise, weigh in, and log your first meal. The work of today starts small."],
    ["No longer talk at all about the kind of man that a good man ought to be, but be such.", "Marcus Aurelius, Meditations 10.16", "Stop planning the perfect week. Do one perfect thing today: a 20 minute walk."],
    ["Such as are thy habitual thoughts, such also will be the character of thy mind; for the soul is dyed by the thoughts.", "Marcus Aurelius, Meditations 5.16", "Habits are built in repetition. Log every meal today, even the ones you would rather forget."],
    ["The universe is change; our life is what our thoughts make it.", "Marcus Aurelius, Meditations 4.3", "Your body is already changing. Decide in which direction."],
    ["If thou art pained by any external thing, it is not this thing that disturbs thee, but thy own judgement about it.", "Marcus Aurelius, Meditations 8.47", "A heavy scale reading is information, not a verdict. Respond with action."],
    ["Nothing, Lucilius, is ours, except time.", "Seneca, Letters 1", "Thirty minutes of movement is yours to give. Spend it well today."],
    ["While we are postponing, life speeds by.", "Seneca, Letters 1", "Do not wait for Monday. Check in now and bank your points."],
    ["Everywhere means nowhere.", "Seneca, Letters 2", "Focus on one change this week: water before every meal, for example."],
    ["We suffer more often in imagination than in reality.", "Seneca, Letters 13", "The workout you dread is shorter than the dread itself. Start for five minutes."],
    ["Some things are in our control and others not.", "Epictetus, Enchiridion 1", "You cannot control the scale today. You can control your next plate."],
    ["No great thing is created suddenly, any more than a bunch of grapes or a fig.", "Epictetus, Discourses 1.15", "Healthy loss is about half a kilogram a week. Patience is part of the plan."],
    ["First say to yourself what you would be; and then do what you have to do.", "Epictetus, Discourses 3.23", "Write your goal weight in the Me tab, then do today's three check ins."],
  ];

  const TIPS = [
    "Fill half your plate with vegetables, a quarter with lean protein and a quarter with starch.",
    "Drink a glass of water before each meal. Thirst is often mistaken for hunger.",
    "Swap fizzy drinks and juice for water or unsweetened rooibos. Liquid sugar adds up fast.",
    "Aim for at least 150 minutes of moderate activity a week; that is 30 minutes, 5 days.",
    "Protein at breakfast (eggs, amasi, peanut butter) keeps you fuller for longer.",
    "Sleep 7 or more hours. Short sleep raises appetite the next day.",
    "Weigh in at the same time each day, ideally in the morning before eating.",
    "Eat slowly and put your fork down between bites. Fullness signals take about 20 minutes.",
    "Plan tomorrow's lunch tonight. Hungry decisions are rarely good ones.",
    "Add two strength sessions a week. Muscle helps you burn more energy at rest.",
    "Choose whole grains and beans for fibre; they keep blood sugar steadier.",
    "A step count is a great habit tracker. Try to beat yesterday by 500 steps.",
    "Weekends count too. Check in on Saturday and Sunday to protect your points.",
    "Keep fruit visible and snacks out of sight. Environment beats willpower.",
  ];

  // ---------- State ----------
  const store = {
    get: (k, d) => { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } },
    set: (k, v) => { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  };
  const state = {
    session: store.get("sbc_session", null), account: null, pending: false,
    me: null, tab: "today", date: todaySA(), online: false, lastSync: null, busy: false, tipShift: 0, quoteShift: 0,
    calc: { kg: null, deficit: 500 }, settings: null, config: null, participants: [], summaries: {}, results: null,
    myRecord: null, challenges: [], manualAwards: [], announcements: [], inbox: [], myFeedback: [], feedbackAreas: [], myChildren: [], aggregates: null, admin: null, adminTab: "dashboard",
    authStep: null, boardMode: "week",
  };

  // ---------- Date helpers ----------
  function todayStr() { return todaySA(); }
  function fmtDate(s, opts) { return new Date(s + "T12:00:00").toLocaleDateString("en-ZA", opts || { weekday: "long", day: "numeric", month: "long", year: "numeric" }); }
  function shortDate(s) { return fmtDate(s, { day: "numeric", month: "short" }); }

  // ---------- Generic helpers ----------
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const fmt = (n, d = 0) => (n === null || n === undefined || Number.isNaN(n) ? "–" : Number(n).toLocaleString("en-ZA", { maximumFractionDigits: d, minimumFractionDigits: d }));
  const emptyRec = emptyRecord;
  function rec(id) {
    if (id && id === state.me) return state.myRecord || (state.myRecord = emptyRecord());
    if (state.admin && state.admin.records && state.admin.records[id]) return normRecord(state.admin.records[id]);
    return emptyRecord();
  }
  const meta = (id) => MEMBERS.find((m) => m.id === id) || { id, name: "Participant", color: "#777", avatar: "climber", group: "" };
  const nameOf = (id) => meta(id).name;
  const settings = () => state.settings || DEFAULT_SETTINGS;
  const avatarSrc = (key) => `img/avatars/${AVATARS[key] ? key : "climber"}.webp`;
  const avatarImg = (key, cls = "") => `<img class="av ${cls}" src="${avatarSrc(key)}" alt="${esc(AVATARS[key]?.name || "Avatar")}">`;
  const avatar = (id, cls = "") => avatarImg(meta(id).avatar, cls);

  // ---------- Server communication ----------
  async function api(path, { method = "GET", body } = {}) {
    const h = { "content-type": "application/json" };
    if (state.session) h.authorization = "Bearer " + state.session;
    const r = await fetch("/api/" + path, { method, headers: h, body: body ? JSON.stringify(body) : undefined, cache: "no-store" });
    let data = {};
    try { data = await r.json(); } catch {}
    if (!r.ok) { const e = new Error(data.error || "Request failed (" + r.status + ")"); e.status = r.status; e.data = data; throw e; }
    return data;
  }
  function applyState(data) {
    state.settings = data.settings || null;
    state.config = data.config || null;
    if (data.config && data.config.points) { POINTS = { ...DEFAULT_CONFIG.points, ...data.config.points }; TREAT = { ...DEFAULT_CONFIG.treat, ...(data.config.treat || {}), bonus: POINTS.treatBonus }; }
    state.account = data.me || null;
    state.pending = !!data.pending;
    state.me = (data.me && data.me.status === "active" && data.me.memberId) || null;
    state.participants = data.participants || [];
    MEMBERS = state.participants.map((p) => ({ id: p.memberId, name: p.name, color: p.color, avatar: p.avatar, group: p.group }));
    state.summaries = data.summaries || {};
    state.results = data.results || null;
    state.myRecord = data.myRecord ? normRecord(data.myRecord) : null;
    state.challenges = data.challenges || [];
    state.manualAwards = data.manualAwards || [];
    state.announcements = data.announcements || [];
    state.inbox = data.inbox || []; state.myFeedback = data.myFeedback || []; state.feedbackAreas = data.feedbackAreas || []; state.myChildren = data.myChildren || [];
    state.aggregates = data.aggregates || null;
    state.buddy = data.buddy || null; state.cheers = data.cheers || { received: [], sent: [] }; state.push = data.push || null; state.syncCodeSet = !!data.syncCodeSet;
    state.finale = data.finale || state.finale || { revealed: false, revealAt: null };
    if (data.admin) state.admin = data.admin;
    state.online = true; state.lastSync = new Date();
  }
  function signedOut(msg) {
    state.session = null; store.set("sbc_session", null);
    state.account = null; state.admin = null; state.authStep = null; state.me = null;
    render(); if (msg) toast(msg);
  }
  async function load(initial = false) {
    if (!state.session) { setSync("🔒 Secure sign in"); if (initial) render(); return; }
    try {
      const data = await api("state");
      const key = () => JSON.stringify([state.summaries, state.myRecord, state.settings, state.announcements, state.inbox, state.myFeedback, state.myChildren, state.pending, state.challenges, state.manualAwards]);
      const before = key();
      applyState(data); setSync();
      if (initial || key() !== before) safeRender();
    } catch (e) {
      if (e.status === 401 || e.status === 403) return signedOut(e.status === 403 ? esc(e.message) : null);
      state.online = false; setSync("Offline. Retrying…"); if (initial) render();
    }
  }
  async function send(body) {
    state.busy = true; setSync("Saving…");
    try { applyState(await api("data", { method: "POST", body })); return true; }
    catch (e) {
      if (e.status === 401) { signedOut("Please sign in again."); return false; }
      toast(e.status ? "Could not save: " + esc(e.message) : "No connection. Your entry was not saved, please try again.");
      return false;
    } finally { state.busy = false; setSync(); }
  }
  async function adminSend(body, okMsg) {
    try { applyState(await api("admin", { method: "POST", body })); render(); if (okMsg) toast(okMsg); return true; }
    catch (e) { if (e.status === 401) { signedOut("Please sign in again."); return false; } toast("⚠️ " + esc(e.message)); return false; }
  }
  function setSync(msg) {
    const el = $("#sync");
    if (msg !== undefined) { el.textContent = msg; el.classList.toggle("off", !!msg && !state.online); return; }
    el.classList.toggle("off", !state.online);
    el.textContent = state.online && state.lastSync ? `🔒 Secure and live · synced ${state.lastSync.toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" })}` : "Offline. Retrying…";
  }

  // ---------- Rules engine (the same code the server uses for the official points) ----------
  const E = makeEngine({ settings, config: () => state.config, today: todayStr, challengeDefs: () => state.challenges, adjustments: () => [] });
  const { weighDays, isWeighDay, nextWeighDay, lastWeighDay, startWeight, weightOn, latestWeight, isMinor, isChild, habitsOnly, maxRate,
    planRate, calorieFloor, energy, dayTotals, dayStatus, dayPoints, scorecard, weighResult, activeMinutes, ledger, eating, habitsOn, HABIT_KEYS, bmi, weeks, treats, challengeDay, challengeWeeks, currentWeek, challengeMonths, glasses, waterTarget, sleepTarget, sleepOn, stepGoal, daySteps, dayKm, officialWeightOn } = E;
  const treatOn = (r, d) => (r.treats || []).some((t) => t.date === d);
  const sortByDate = (arr) => [...arr].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  const ZERO = {
    total: 0, habit: 0, checkins: 0, missed: 0, streak: 0, sw: null, cw: null, lostKg: null, pct: null, goal: null, weightPts: null,
    minor: null, habits: null, tooFast: null, treats: { earned: 0, used: 0, left: 0, current: null, usedToday: false }, rewards: 0,
    weekPts: {}, monthPts: {}, days14: [], bestStreak: 0, maxWeekMins: 0, foodDays: 0, comeback: false, weighIns: 0, weeklyWins: 0,
    monthlyWins: 0, exerciseMinutes: 0, exerciseDays: 0, isBL: false, isConsistent: false, isResilience: false, over: false, weekAllIn: [], tasksThisWeek: 0,
  };
  /** Official score, calculated by the server. Weight fields are blank for other people (privacy). */
  function score(id) { const s = state.summaries[id]; return s ? { ...ZERO, ...s, id, treats: s.treats || ZERO.treats } : { ...ZERO, id }; }

  // ---------- UI helpers ----------
  let toastTimer;
  // Messages with a Stoic quote stay up for 15 seconds so there is time to read them. Tap the message to close it.
  function toast(html, ms = 4500) {
    const el = $("#toast"), quote = html.includes("“");
    if (quote) ms = Math.max(ms, 15000);
    el.innerHTML = html + (quote ? `<span class="toastclose">Tap to close ✕</span>` : "");
    el.classList.remove("hidden");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.add("hidden"), ms);
  }
  document.getElementById("toast").addEventListener("click", () => { clearTimeout(toastTimer); document.getElementById("toast").classList.add("hidden"); });
  function confetti() {
    const box = $("#confetti"); const colors = ["#E4572E", "#F2B134", "#2E8B57", "#2F7FC1", "#D6457F"];
    for (let i = 0; i < 36; i++) {
      const p = document.createElement("i");
      p.style.left = Math.random() * 100 + "vw";
      p.style.background = colors[i % colors.length];
      p.style.animationDelay = Math.random() * 0.35 + "s";
      p.style.transform = `rotate(${Math.random() * 360}deg)`;
      box.appendChild(p);
      setTimeout(() => p.remove(), 2200);
    }
  }
  // ONE plain language guide to points, used everywhere so everyone reads the same rules.
  function pointsGuide() {
    const row = (icon, what, pts, cls = "") => `<div class="pgrow ${cls}"><span class="pgi">${icon}</span><span class="grow">${what}</span><b>${pts}</b></div>`;
    return `<div class="pguide">
      <h3>✅ Earn every day <small>(each counts once a day)</small></h3>
      ${row("👋🏾", "Check in: tap the big button or log anything", "+" + POINTS.checkin)}
      ${row("🍽️", "Eat and log 3 meals (breakfast, lunch, dinner)", "+" + POINTS.food)}
      ${row("👟", `Move: ${MOVE_MINUTES} active minutes <i>or</i> ${fmt(stepGoal())} steps`, "+" + POINTS.exercise)}
      ${row(glassSvg(true, "sm"), `Drink ${waterTarget()} glasses of water (1 glass = 250 ml, so ${fmt(waterTarget() * 0.25, 1)} litres)`, "+" + POINTS.water)}
      ${row("🌙", "Sleep 7 hours or more (8 for under 18s)", "+" + POINTS.sleep)}
      ${row("📓", "Journal: tick what you did today", "+" + POINTS.reflect)}
      ${row("🎯", "Daily challenge (Tuesday, Friday, Saturday)", "+" + POINTS.task)}
      <p class="pgnote">Best possible day: <b>20 points</b> on Tuesday, Friday and Saturday, <b>18</b> on other days (Monday, Wednesday, Thursday and Sunday's challenge is the same as Move, Water, Sleep or Journal, so it ticks itself without extra points). Logging the same thing twice never adds more.</p>
      <h3>⚠️ Lose points</h3>
      ${row("🚫", "A day with nothing logged", POINTS.missed, "neg")}
      ${row("🍽️", "Skipped meals or starving (fewer than 3 meals, or too little food)", POINTS.eatPenalty, "neg")}
      ${row("🚩", "More than 3 bad habit flags in one day (from 22 November)", POINTS.flagPenalty, "neg")}
      <p class="pgnote">Public holidays and days before you joined never lose points. 🚩 Flags are warnings (too much fruit, milk, eating after 9 PM, mixed proteins…). Up to 3 in a day cost nothing; a 4th costs ${Math.abs(POINTS.flagPenalty)} points for that day (once, not per flag).</p>
      <h3>⭐ Extras</h3>
      ${row("⚖️", "Official Saturday weigh in (entered by the administrator)", "+" + POINTS.weighin)}
      <h3>⚖️ Weigh in result <small>(from the 5 December weigh in, compared with your previous official weight)</small></h3>
      ${row("🏅", `Lost at least the minimum (${WEIGH_MIN_PER_WEEK.adult} kg a week; ${WEIGH_MIN_PER_WEEK.junior} kg for under 18s, so ${WEIGH_MIN_PER_WEEK.adult * 2} kg or ${WEIGH_MIN_PER_WEEK.junior * 2} kg per two week weigh in)`, "+" + POINTS.weighMinMet)}
      ${row("📉", "Lost weight, but less than the minimum", "+" + POINTS.weighLost)}
      ${row("➖", "No weight lost", POINTS.weighBelowMin, "neg")}
      ${row("📈", "Weight gained", POINTS.weighGain, "neg")}
      <p class="pgnote">Children under 12 (still growing): kept steady or lost <b>+${POINTS.weighMinMet}</b>; a small gain within normal growth (up to 0,25 kg a week) <b>0</b>; a bigger gain <b>${POINTS.weighBelowMin}</b>. Children are never pushed to lose weight.</p>
      ${row("🎁", `Treat week: check in every day and move ${TREAT.minutes} minutes in the week`, "+" + POINTS.treatBonus)}
      ${row("📉", "Weight lost at official weigh ins, up to a safe pace", `+${POINTS.perPercent} per 1%`)}
      <h3>🏆 How winners are decided</h3>
      <ul class="pglist">
        <li><b>Weekly award:</b> most daily points in a challenge week (Tuesday to Monday). <b>Monthly award:</b> most daily points in a challenge month of 4 weeks (Month 1 is 17 Nov to 14 Dec). Both are presented at the next weigh in, after the weights are entered.</li>
        <li><b>Biggest Loser (R${fmt(prizes().bl)}):</b> highest percentage of starting weight lost, from official weigh ins only. Revealed at the Grand Finale.</li>
        <li><b>Greatest Effort (R${fmt(prizes().effort)}):</b> most daily habit points over the whole challenge. Weight does not count. Revealed at the Grand Finale.</li>
      </ul>
      <p class="pgnote">🔒 Points are worked out by the server from what you log; nobody can type in points. You can only log today, so missed days cannot be filled in later.</p>
    </div>`;
  }
  const POINTS_GUIDE_KEY = "sbc_points_guide_v2";
  function maybeShowPointsGuide() {
    if (!state.me || !state.account) return;
    let seen = false; try { seen = localStorage.getItem(POINTS_GUIDE_KEY) === "1"; } catch {}
    if (seen || !$("#modal").classList.contains("hidden")) return;
    const m = modal(`<h2>📣 How points work</h2><p class="note" style="margin-top:0">The points were made simpler and fairer on 19 November. Please read this once.</p>${pointsGuide()}<button class="btn full" data-guideok>Got it</button>`);
    $("[data-guideok]", m).addEventListener("click", () => { try { localStorage.setItem(POINTS_GUIDE_KEY, "1"); } catch {} closeModal(); });
  }
  function modal(html) { const m = $("#modal"); m.innerHTML = `<div class="sheet">${html}</div>`; m.classList.remove("hidden"); return m; }
  function closeModal() { $("#modal").classList.add("hidden"); }

  function quoteFor(offset = 0) {
    const n = diffDays("2026-01-01", todayStr()) + offset;
    return STOIC[((n % STOIC.length) + STOIC.length) % STOIC.length];
  }
  function tipFor(offset = 0) {
    const n = diffDays("2026-01-01", todayStr()) + offset;
    return TIPS[((n % TIPS.length) + TIPS.length) % TIPS.length];
  }
  const cheer = () => quoteFor(Math.floor(Math.random() * STOIC.length));

  // ---------- Account menu ----------
  function accountMenu() {
    const a = state.account;
    if (!a) { state.authStep = null; return render(); }
    const m = modal(`
      <div class="row">${avatarImg(a.avatar, "xl")}<div><h2 style="margin:0">${esc(a.name)}</h2>
        <small>${esc(AVATARS[a.avatar]?.name || "")} · ${esc(AVATARS[a.avatar]?.value || "")}${a.role === "admin" ? " · Administrator" : ""}</small></div></div>
      <div class="form" style="margin-top:14px">
        <button class="btn ghost full" data-m="avatar">🎭 Change my avatar</button>
        <button class="btn ghost full" data-m="pin">🔢 Change my PIN</button>
        <button class="btn ghost full" data-m="feedback">💡 Send ideas or feedback</button>
        <button class="btn ghost full" data-m="rules">📜 Challenge rules and privacy policy</button>
        <button class="btn ghost full" data-m="signout">🚪 Sign out</button>
        <button class="btn full" data-m="close">Close</button>
      </div>`);
    $$("[data-m]", m).forEach((b) => b.addEventListener("click", () => {
      const k = b.dataset.m;
      if (k === "close") return closeModal();
      if (k === "avatar") return changeAvatar();
      if (k === "pin") return changePin();
      if (k === "rules") return showRules();
      if (k === "feedback") { closeModal(); go("inbox"); setTimeout(() => { $("#feedback")?.scrollIntoView({ behavior: "smooth" }); $("#fbMsg")?.focus(); }, 150); return; }
      if (k === "signout") return signOut();
    }));
  }
  function avatarGrid(current) {
    return `<div class="avgrid">${Object.entries(AVATARS).map(([k, v]) => `
      <button type="button" class="avpick ${k === current ? "on" : ""}" data-av="${k}">${avatarImg(k, "xl")}<b>${esc(v.name)}</b><small>${esc(v.value)}</small></button>`).join("")}</div>
      <div class="pledge" id="pledge">${current ? pledgeHtml(current) : `<span class="muted">Tap an avatar to see its meaning.</span>`}</div>`;
  }
  const pledgeHtml = (k) => `${avatarImg(k, "lg")}<div><b>${esc(AVATARS[k].name)} · ${esc(AVATARS[k].value)}</b><br><i>“${esc(AVATARS[k].pledge)}”</i></div>`;
  function bindAvatarGrid(root, onPick) {
    $$(".avpick", root).forEach((b) => b.addEventListener("click", () => {
      $$(".avpick", root).forEach((x) => x.classList.remove("on")); b.classList.add("on");
      $("#pledge", root).innerHTML = pledgeHtml(b.dataset.av); onPick(b.dataset.av);
    }));
  }
  function changeAvatar() {
    let pick = state.account.avatar;
    const m = modal(`<h2>Who are you choosing to become?</h2><p class="note">Your avatar is an intention, not a medal. Choose the quality you want to grow.</p>
      ${avatarGrid(pick)}<div class="row" style="margin-top:12px"><button class="btn ghost" data-x>Cancel</button><button class="btn" data-save>Save avatar</button></div>`);
    bindAvatarGrid(m, (k) => (pick = k));
    $("[data-x]", m).onclick = closeModal;
    $("[data-save]", m).onclick = async () => {
      try { applyState(await api("auth/avatar", { method: "POST", body: { avatar: pick } })); closeModal(); render(); toast(`${avatarImg(pick, "sm")} ${esc(AVATARS[pick].pledge)}`, 5000); }
      catch (e) { toast("⚠️ " + esc(e.message)); }
    };
  }
  function changePin() {
    const m = modal(`<h2>Change my PIN</h2>
      <form class="form" id="cpForm"><label>Current PIN<input type="password" inputmode="numeric" maxlength="4" pattern="\\d{4}" id="cp0" required autocomplete="current-password"></label>
      <label>New PIN<input type="password" inputmode="numeric" maxlength="4" pattern="\\d{4}" id="cp1" required autocomplete="new-password"></label>
      <label>Confirm new PIN<input type="password" inputmode="numeric" maxlength="4" pattern="\\d{4}" id="cp2" required autocomplete="new-password"></label>
      <div class="row"><button type="button" class="btn ghost" data-x>Cancel</button><button class="btn">Save PIN</button></div></form>`);
    $("[data-x]", m).onclick = closeModal;
    $("#cpForm", m).onsubmit = async (e) => {
      e.preventDefault();
      if ($("#cp1").value !== $("#cp2").value) return toast("The new PINs do not match.");
      try { await api("auth/change-pin", { method: "POST", body: { currentPin: $("#cp0").value, pin: $("#cp1").value } }); closeModal(); toast("✓ Your PIN has been changed."); }
      catch (err) { toast("⚠️ " + esc(err.message)); }
    };
  }
  async function showRules() {
    const p = state.config && state.config.rulesText ? state.config : await getPublic();
    modal(`<h2>📜 Challenge rules</h2><div class="prose">${esc(p.rulesText).replace(/\n/g, "<br>")}</div>
      <h2 style="margin-top:14px">🔒 Privacy policy (POPIA)</h2><div class="prose">${esc(p.privacyText || DEFAULT_CONFIG.privacyText).replace(/\n/g, "<br>")}</div>
      <button class="btn full" style="margin-top:12px" onclick="document.getElementById('modal').classList.add('hidden')">Close</button>`);
  }
  function signOut() { closeModal(); people = null; signedOut("You are signed out."); }

  // ---------- Join and sign in (name, avatar and PIN) ----------
  let pub = null;
  async function getPublic() { if (!pub) pub = await api("public").catch(() => ({ rulesText: DEFAULT_CONFIG.rulesText, privacyText: DEFAULT_CONFIG.privacyText })); return pub; }
  const reg = { name: "", mobile: "", avatar: null, consent: { rules: false, privacy: false, health: false } };
  let people = null, pickedPerson = null;
  async function loadPeople() { try { const r = await api("auth/people"); people = r; } catch { people = { people: [], hasAdmin: true }; } render(); }
  const pinInput = (id, label, ac = "new-password") => `<label>${label}<input class="pin" type="password" inputmode="numeric" maxlength="4" pattern="\\d{4}" id="${id}" required autocomplete="${ac}" placeholder="••••"></label>`;
  const steps = (n) => `<div class="steps">${["Name", "Avatar", "Rules", "PIN"].map((s, i) => `<span class="${i + 1 <= n ? "on" : ""}">${i + 1}. ${s}</span>`).join("")}</div>`;
  const authShell = (inner) => `<section class="card auth"><div class="auth-hero"><img src="img/avatars/climber.webp" alt="" class="hero-av"><div><div class="brand">Stoic by Choice</div><div class="brand-sub">Biggest Loser Challenge</div></div></div>${inner}</section>`;
  function finishAuth(res, msg) {
    state.session = res.session; store.set("sbc_session", res.session);
    state.authStep = null; state.tab = "today"; pickedPerson = null;
    load(true).then(() => msg && toast(msg, 5000));
  }

  function viewAuth() {
    const st = state.authStep || "welcome";
    if (st === "welcome") {
      if (!people) { loadPeople(); return authShell(`<p class="center muted">Loading…</p>`); }
      const list = people.people;
      if (!list.length) return authShell(`<h2 class="center">Welcome!</h2><p class="center">Be the first to join. The first person to join becomes the challenge administrator.</p>
        <button class="btn full" data-step="reg1">Join the challenge</button>`);
      return authShell(`<h2 class="center">Who are you?</h2>
        <div class="whogrid">${list.map((p) => `<button class="whopick ${pickedPerson === p.id ? "on" : ""}" data-person="${p.id}">${avatarImg(p.avatar, "xl")}<b>${esc(p.name)}</b></button>`).join("")}</div>
        ${pickedPerson ? `<form class="form" id="pinForm" style="margin-top:14px">${pinInput("pin", "Your PIN", "current-password")}<button class="btn full">Open</button></form>
          <p class="note center">Forgot your PIN? Ask the administrator to reset it.</p>` : ""}
        <button class="btn ghost full" style="margin-top:12px" data-step="reg1">I'm new: join the challenge</button>
        <p class="note center" style="margin-top:10px"><a href="#" data-rules>Challenge rules and privacy policy</a></p>`);
    }
    if (st === "reg1") return authShell(`${steps(1)}
      <form class="form" id="reg1"><label>Your name<input id="rName" value="${esc(reg.name)}" required maxlength="40" autocomplete="name" placeholder="e.g. Thandi Kgosana"></label>
      <label>Mobile number (optional)<input id="rMobile" type="tel" value="${esc(reg.mobile)}" maxlength="20" autocomplete="tel" placeholder="e.g. 082 123 4567"></label>
      <div class="row"><button type="button" class="btn ghost" data-step="welcome">Back</button><button class="btn">Next</button></div></form>`);
    if (st === "reg2") return authShell(`${steps(2)}<h2 class="center">Who are you choosing to become?</h2>
      <p class="note center">Pick the quality you want to grow. Your avatar is your intention; medals come later, for your actions.</p>
      ${avatarGrid(reg.avatar)}
      <div class="row" style="margin-top:12px"><button class="btn ghost" data-step="reg1">Back</button><button class="btn" id="reg2next">Next</button></div>`);
    if (st === "reg3") return authShell(`${steps(3)}<h2>Challenge rules</h2><div class="prose scroll">${esc((pub || DEFAULT_CONFIG).rulesText).replace(/\n/g, "<br>")}</div>
      <h2 style="margin-top:12px">Privacy policy</h2><div class="prose scroll">${esc((pub || DEFAULT_CONFIG).privacyText).replace(/\n/g, "<br>")}</div>
      <form class="form" id="reg3" style="margin-top:12px">
        <label class="tick-row"><input type="checkbox" id="cRules" ${reg.consent.rules ? "checked" : ""}> I agree to the challenge rules.</label>
        <label class="tick-row"><input type="checkbox" id="cPrivacy" ${reg.consent.privacy ? "checked" : ""}> I have read and accept the privacy policy.</label>
        <label class="tick-row"><input type="checkbox" id="cHealth" ${reg.consent.health ? "checked" : ""}> I consent to my weight and wellness information being stored for this challenge, visible only to me and the administrator (POPIA). Under 18s need a parent or guardian to agree for them.</label>
        <div class="row"><button type="button" class="btn ghost" data-step="reg2">Back</button><button class="btn">Next</button></div></form>`);
    if (st === "reg4") return authShell(`${steps(4)}<h2>Create your PIN</h2>
      <form class="form" id="reg4">${pinInput("p1", "Choose a 4 digit PIN")}${pinInput("p2", "Type it again")}
      <p class="note">You'll use this PIN to open the app. Avoid easy PINs like 1234.</p>
      <div class="row"><button type="button" class="btn ghost" data-step="reg3">Back</button><button class="btn">Join the challenge</button></div></form>`);
    return "";
  }
  function viewPending() {
    const a = state.account;
    return `<section class="card auth center">${avatarImg(a.avatar, "xl")}
      <h2>Thank you, ${esc(a.name.split(" ")[0])}!</h2>
      <p>You're registered. The administrator will approve you shortly.</p>
      <div class="pledge" style="justify-content:center">${pledgeHtml(a.avatar)}</div>
      <p class="note">This page refreshes by itself.</p>
      <button class="btn ghost" data-m="signout">Sign out</button></section>`;
  }
  async function authCall(path, body) {
    try { return await api("auth/" + path, { method: "POST", body }); }
    catch (e) { toast("⚠️ " + esc(e.message), 5000); return null; }
  }
  function bindAuth() {
    const v = $("#view");
    $$("[data-step]", v).forEach((b) => b.addEventListener("click", async (e) => { e.preventDefault(); state.authStep = b.dataset.step; if (b.dataset.step === "reg3") await getPublic(); render(); }));
    $$("[data-rules]", v).forEach((b) => b.addEventListener("click", (e) => { e.preventDefault(); showRules(); }));
    $$("[data-m=signout]", v).forEach((b) => b.addEventListener("click", signOut));
    $$("[data-person]", v).forEach((b) => b.addEventListener("click", () => { pickedPerson = b.dataset.person; render(); const p = $("#pin"); if (p) p.focus(); }));
    const f = (id, fn) => { const el = $("#" + id, v); if (el) el.addEventListener("submit", async (e) => { e.preventDefault(); const btn = $("button:not([type=button])", el); btn.disabled = true; try { await fn(); } finally { btn.disabled = false; } }); };
    f("pinForm", async () => { const res = await authCall("pin", { accountId: pickedPerson, pin: $("#pin").value }); if (res) finishAuth(res); else $("#pin").value = ""; });
    f("reg1", async () => {
      reg.name = $("#rName").value.trim(); reg.mobile = $("#rMobile").value.trim();
      if (reg.name.length < 2) return toast("Please enter your name.");
      state.authStep = "reg2"; render();
    });
    if ($(".avgrid", v) && state.authStep === "reg2") {
      bindAvatarGrid(v, (k) => (reg.avatar = k));
      $("#reg2next").onclick = async () => { if (!reg.avatar) return toast("Please choose your avatar."); await getPublic(); state.authStep = "reg3"; render(); };
    }
    f("reg3", async () => {
      reg.consent = { rules: $("#cRules").checked, privacy: $("#cPrivacy").checked, health: $("#cHealth").checked };
      if (!reg.consent.rules || !reg.consent.privacy || !reg.consent.health) return toast("Please tick all three boxes to continue.");
      state.authStep = "reg4"; render();
    });
    f("reg4", async () => {
      if ($("#p1").value !== $("#p2").value) return toast("The PINs do not match.");
      const res = await authCall("register", { ...reg, pin: $("#p1").value });
      if (res) { people = null; finishAuth(res, res.status === "active" ? `${avatarImg(reg.avatar, "sm")} Welcome to the challenge! ${esc(AVATARS[reg.avatar].pledge)}` : "✓ You're registered. The administrator will approve you soon."); }
    });
  }

  // ---------- Render ----------
  function safeRender() {
    const a = document.activeElement;
    if (a && ["INPUT", "SELECT"].includes(a.tagName)) return; // do not interrupt typing
    if (!$("#modal").classList.contains("hidden")) return;
    render();
  }

  function render() {
    setTimeout(maybeShowPointsGuide, 600);
    // Logging is always for today: refresh the day on every screen draw, so an app left open overnight never saves to yesterday.
    state.date = todayStr();
    const cd = challengeDay();
    $("#dateline").textContent = `${fmtDate(todayStr())}${holiday(todayStr()) ? " 🇿🇦 " + holiday(todayStr()) : ""} · ` + (cd.phase === "on" ? `Day ${cd.day} of ${cd.total} · ${(() => { const t = todayStr(), w = challengeWeeks(), m = challengeMonths(), cw = w.find((x) => x.w0 <= t && t <= x.w1), cm = m.find((x) => x.from <= t && t <= x.to); return `Week ${cw ? cw.n : "–"} of ${w.length} · Month ${cm ? cm.n : "–"} of ${m.length}`; })()} · ${cd.left} days to go` : cd.phase === "before" ? `Challenge starts in ${cd.toStart} day${cd.toStart === 1 ? "" : "s"}` : "Challenge complete 🏁");
    const a = state.account, signedIn = !!(state.session && a);
    { const ib = $("#inboxBtn"), n = signedIn && !state.pending ? unreadCount() : 0; ib.hidden = !(signedIn && !state.pending); ib.classList.toggle("on", state.tab === "inbox"); $("#inboxBadge").hidden = !n; $("#inboxBadge").textContent = n > 9 ? "9+" : n; ib.setAttribute("aria-label", n ? `Inbox, ${n} unread` : "Inbox"); }
    $("#whoBtn").innerHTML = signedIn ? `${avatarImg(a.avatar)}${esc(a.name.split(" ")[0])} ▾` : "🔒 Sign in";
    document.body.classList.toggle("authed", signedIn && !state.pending);
    $("#tabAdmin").hidden = !(signedIn && a.role === "admin" && !state.pending);
    $$("#tabs button").forEach((b) => b.classList.toggle("active", b.dataset.tab === state.tab));
    if (!signedIn) { $("#view").innerHTML = viewAuth(); bindAuth(); return; }
    if (state.pending || !state.me) { $("#view").innerHTML = viewPending(); bindAuth(); return; }
    const views = { today: viewToday, challenge: viewChallenge, log: () => ({ move: viewMove, water: viewWater, sleep: viewSleep, journal: viewJournal }[state.logMode] || viewFood)(), food: viewFood, move: viewMove, board: viewBoard, awards: viewAwards, calendar: viewCalendar, profile: viewProfile, recipes: viewRecipes, inbox: viewInbox, calc: viewCalc, me: viewMe, admin: viewAdmin };
    if (state.tab === "admin" && a.role !== "admin") state.tab = "today";
    const canBack = state.tab !== "today" || navStack.length > 0, canFwd = fwdStack.length > 0;
    $("#view").innerHTML = (canBack || canFwd ? `<div class="navrow"><button class="backbtn" data-back ${canBack ? "" : "disabled"}>‹ Back</button><button class="backbtn fwd" data-fwd ${canFwd ? "" : "disabled"}>Forward ›</button></div>` : "") + (views[state.tab] || viewToday)();
    $("[data-back]")?.addEventListener("click", () => { if (navStack.length) { try { history.back(); return; } catch {} } goBack(); });
    $("[data-fwd]")?.addEventListener("click", goForward);
    bind();
    if (state.tab === "admin") bindAdmin();
    tickCountdown();
  }

  // Logging is always for today: the date cannot be changed and missed days cannot be back dated.
  function dateNav() {
    state.date = todayStr();
    return `<span class="todaychip">📅 Today · ${fmtDate(state.date, { weekday: "short", day: "numeric", month: "short" })}</span>`;
  }


  function ring(eaten, budget) {
    const pct = budget > 0 ? Math.min(1, eaten / budget) : 0;
    const over = budget > 0 && eaten > budget;
    const R = 62, C = 2 * Math.PI * R;
    return `<svg viewBox="0 0 150 150" width="100%" role="img" aria-label="Calories eaten versus budget">
      <circle cx="75" cy="75" r="${R}" fill="none" stroke="#2A2214" stroke-width="14"/>
      <circle cx="75" cy="75" r="${R}" fill="none" stroke="${over ? "#E5533F" : "url(#g)"}" stroke-width="14" stroke-linecap="round"
        stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - pct)}" transform="rotate(-90 75 75)" style="transition:stroke-dashoffset .6s"/>
      <defs><linearGradient id="g" x1="0" x2="1"><stop offset="0" stop-color="#FFE08A"/><stop offset="1" stop-color="#C98A1B"/></linearGradient></defs>
      <text x="75" y="72" text-anchor="middle" font-family="Montserrat, sans-serif" font-weight="800" font-size="25" fill="${over ? "#E5533F" : "#FFFFFF"}">${fmt(Math.abs(budget - eaten))}</text>
      <text x="75" y="94" text-anchor="middle" font-size="11" fill="#A99F88">${over ? "kcal over" : "kcal left"}</text></svg>`;
  }

  function stoicCard() {
    const [q, who, nudge] = quoteFor(state.quoteShift);
    return `<section class="card stoic"><div class="label">Stoic word for today</div>
      <blockquote>${esc(q)}</blockquote><cite>${esc(who)}</cite>
      <div class="nudge">👉🏾 ${esc(nudge)}</div>
      <button class="linkbtn" data-act="nextQuote">Another thought ›</button></section>`;
  }

  // Inbox: messages and announcements from the administrator. "Read" is remembered on this phone.
  const SENDER = "Dr Benadette Aineamani, Stoic Teacher";
  const seenKey = () => "sbc_inbox_seen_" + (state.me || "x");
  function seenIds() { try { return new Set(JSON.parse(localStorage.getItem(seenKey()) || "[]")); } catch { return new Set(); } }
  function markSeen(ids) { const s = seenIds(); ids.forEach((i) => s.add(i)); try { localStorage.setItem(seenKey(), JSON.stringify([...s].slice(-300))); } catch {} }
  function unreadCount() { const s = seenIds(); return state.inbox.filter((x) => !s.has(x.id)).length; }
  function viewInbox() {
    const seen = seenIds(), list = state.inbox;
    setTimeout(() => { markSeen(list.map((x) => x.id)); const bd = $("#inboxBadge"); if (bd) bd.hidden = true; }, 0);
    return `<section class="card"><h2>📥 Inbox</h2><p class="note" style="margin-top:0">Messages and announcements from ${esc(SENDER)}. Newest first.</p>
      ${list.length ? `<div class="inbox">${list.map((x) => `<article class="msg ${seen.has(x.id) ? "" : "new"}">
        <div class="msghead"><span class="pill">${x.to === "all" ? "📣 Everyone" : "✉️ Just for you"}</span>${seen.has(x.id) ? "" : `<span class="pill newpill">New</span>`}<span class="msgdate">${fmtDate(x.date)}${x.time ? " · " + esc(x.time) : ""}</span></div>
        ${x.title ? `<h3>${esc(x.title)}</h3>` : ""}<div class="msgbody">${esc(x.message).replace(/\n/g, "<br>")}</div><div class="msgby">From ${esc(x.by)}</div></article>`).join("")}</div>`
        : `<div class="empty">No messages yet. Announcements from the administrator will appear here.</div>`}</section>${feedbackCard()}`;
  }
  const FB_STATUS = { new: ["📨", "Sent"], seen: ["👀", "Seen by admin"], planned: ["🛠️", "Planned"], done: ["✅", "Done"], "not now": ["⏸️", "Not for now"] };
  function feedbackCard() {
    if (!state.me) return "";
    return `<section class="card" id="feedback"><h2>💡 Ideas and feedback for the administrator</h2>
      <p class="note" style="margin-top:0">Tell Dr Benadette Aineamani, Stoic Teacher, what would make the app better or what is hard to use. Only she sees this.</p>
      <form class="form" id="fbForm"><label>About<select id="fbArea">${(state.feedbackAreas.length ? state.feedbackAreas : ["Other"]).map((a) => `<option>${esc(a)}</option>`).join("")}</select></label>
        <label>Your idea or feedback<textarea id="fbMsg" rows="4" maxlength="800" required placeholder="e.g. Please add a button to log the same lunch as yesterday."></textarea></label>
        <button class="btn full">📨 Send to the administrator</button></form>
      ${state.myFeedback.length ? `<h3 style="margin:16px 0 8px">What I sent</h3><div class="inbox">${state.myFeedback.map((f) => `<article class="msg"><div class="msghead"><span class="pill">${esc(f.area)}</span><span class="pill">${FB_STATUS[f.status]?.[0] || "📨"} ${FB_STATUS[f.status]?.[1] || "Sent"}</span><span class="msgdate">${shortDate(f.date)}</span></div>
        <div class="msgbody">${esc(f.message).replace(/\n/g, "<br>")}</div>${f.reply ? `<div class="fbreply"><b>Reply:</b> ${esc(f.reply).replace(/\n/g, "<br>")}</div>` : ""}</article>`).join("")}</div>` : ""}
    </section>`;
  }
  // Parents: their children's habits from the app logs (today so far, and yesterday in full).
  function childrenCard() {
    const kids = state.myChildren || []; if (!kids.length) return "";
    const day = state.kidDay || "today";
    const block = (c) => { const x = c[day], n = x.flags.length;
      return `<details class="kid" ${n ? "open" : ""}><summary><b>${esc(x.name)}</b><span class="pill ${n ? "warn" : "good"}">${n ? `⚠️ ${n} flag${n === 1 ? "" : "s"}` : "✅ No flags"}</span></summary>
        ${x.flags.map((f) => `<div class="kidflag">⚠️ <b>${esc(f.label)}</b><br><small>${esc(f.how)}</small></div>`).join("")}
        ${x.good.length ? `<div class="kidgood">✅ ${day === "today" ? "" : "Well done: "}${esc(x.good.join(", "))}</div>` : ""}${x.note ? `<div class="kidflag muted">${esc(x.note)}</div>` : ""}</details>`; };
    return `<section class="card kids"><h2>👨‍👩‍👧 My children's habits</h2>
      <p class="note" style="margin-top:0">From what they log in the app. ${day === "today" ? "Today so far: only bad eating habits are flagged until the day is over." : "Yesterday, the full day: meals, eating habits, water, movement and sleep."} A kind word helps more than a telling off.</p>
      <div class="seg">${[["today", "Today so far"], ["yesterday", "Yesterday"]].map(([k, l]) => `<button type="button" class="${k === day ? "on" : ""}" data-kidday="${k}">${l}</button>`).join("")}</div>
      ${kids.map(block).join("")}</section>`;
  }
  function announcementsCard() {
    const n = unreadCount();
    if (!state.announcements.length) return n ? `<section class="card announce"><button class="btn ghost full" data-go="inbox">📥 You have ${n} unread message${n === 1 ? "" : "s"}: open inbox</button></section>` : "";
    return state.announcements.slice(0, 1).map((x) => `<section class="card announce"><div class="label">📣 ${x.to === "all" ? "From " + esc(SENDER) : "A message for you from " + esc(SENDER)} · ${shortDate(x.date)}</div>
      ${x.title ? `<h3>${esc(x.title)}</h3>` : ""}<div>${esc(x.message).replace(/\n/g, "<br>")}</div>
      <button class="btn ghost full" style="margin-top:10px" data-go="inbox">📥 Open inbox${n ? ` (${n} unread)` : ""}</button></section>`).join("");
  }
  function challengeCard() {
    const a = state.account, sc = score(state.me), cw = currentWeek(), r = rec(state.me);
    const ws = weeks(r), w = ws.find((x) => x.current) || ws[0];
    const days = []; for (let d = cw.w0; d <= cw.w1 && d <= todayStr(); d = addDays(d, 1)) days.push(d);
    const tasksDone = days.filter((d) => taskDone(r, d)).length, pct = days.length ? Math.round((tasksDone / days.length) * 100) : 0;
    const prog = Math.round(((todayStr() < cw.w0 ? 0 : Math.min(diffDays(cw.w0, todayStr()) + 1, diffDays(cw.w0, cw.w1) + 1)) / (diffDays(cw.w0, cw.w1) + 1)) * 100);
    return `<section class="card yourchal">
      <div class="row">${avatarImg(a.avatar, "xl")}<div class="grow"><div class="label">Your challenge</div>
        <h2 style="margin:2px 0">Week ${cw.n} of ${challengeWeeks().length}</h2><small>Small choices. Lasting change. · ${esc(AVATARS[a.avatar].name)} · ${esc(AVATARS[a.avatar].value)}</small>
        <div class="bar" style="margin-top:8px"><i style="width:${prog}%"></i></div></div></div>
      <div class="grid3" style="margin-top:12px">
        <div class="stat"><b>🔥 ${sc.streak}</b><span>day streak</span></div>
        <div class="stat"><b>⭐ ${fmt(sc.total)}</b><span>points</span></div>
        <div class="stat"><b>🎯 ${pct}%</b><span>tasks done</span></div>
      </div></section>`;
  }
  // Today's scorecard: every point a person can earn today, in one list. Tap a line to log it.
  function activitiesCard() {
    const r = rec(state.me), d = state.date, sc = scorecard(r, d), pts = dayPoints(r, d);
    const g = glasses(r, d), wt = waterTarget(), sl = sleepOn(r, d), stg = sleepTarget(r), stp = daySteps(r, d), sg = stepGoal(), km = dayKm(r, d);
    const attr = (it) => it.k === "checkin" ? (it.done ? "" : `data-act="checkin"`) : it.k === "task" ? (it.auto ? `data-go="${({ 1: "move", 3: "water", 4: "sleep", 0: "journal" })[dow(d)]}"` : `data-hs="task" data-date="${d}"`) : it.k === "weighin" ? `data-go="me"` : `data-go="${it.k === "journal" ? "journal" : it.k}"`;
    const icon = (it) => it.icon === "glass" ? glassSvg(true, "sm") : it.icon;
    return `<section class="card scorecard">
      <div class="row between"><h2>⭐ Today's points</h2><span class="pill ${pts > 0 ? "good" : ""}">${pts} of ${sc.max}</span></div>
      <div class="scbar"><i style="width:${Math.min(100, (pts / sc.max) * 100)}%"></i></div>
      <div class="sclist">${(() => { const fl = sc.items.filter((x) => x.flag); return fl.length > 3 ? [...sc.items.filter((x) => !x.flag), ...fl.slice(0, 3), { k: "flag", flag: true, icon: "🚩", label: `${fl.length - 3} more flags`, how: "Open Food to see them all", pts: 0 }] : sc.items; })().map((it) => `<div class="scrow ${it.penalty || it.flag ? "penalty" : it.done ? "done" : ""}" ${it.penalty ? "" : it.flag ? `data-go="food"` : attr(it)} role="button" tabindex="0">
        <span class="scicon">${icon(it)}</span>
        <span class="grow"><b>${esc(it.label)}</b><small>${esc(it.how)}${it.progress ? ` · <em>${esc(it.progress)}</em>` : ""}${it.warn && d === todayStr() && it.k === "food" ? `<br><span class="warnline">⚠️ Fewer than 3 meals by tonight costs ${Math.abs(POINTS.eatPenalty)} points${saHour() >= 18 ? ". Last meal before 9 PM" : ""}</span>` : ""}</small></span>
        <span class="scpts">${it.flag ? "Bad habit" : it.penalty ? it.pts : `${it.done ? "✓ " : ""}${it.auto ? "" : "+" + it.pts}`}</span></div>`).join("")}</div>
      <div class="tiles" style="margin-top:12px">
        <div class="tile water ${g >= wt ? "done" : ""}"><div class="tile-top" data-go="water">${glassSvg(true)}<b>${g}<small>/${wt}</small></b></div><small data-go="water">glasses of 250 ml</small>
          <button class="tile-plus" data-water="1" aria-label="One more glass">+ 1</button></div>
        <div class="tile sleep ${sl && sl.hours >= stg ? "done" : ""}" data-go="sleep" role="button" tabindex="0"><div class="tile-top">🌙<b>${sl ? fmt(sl.hours, 1) : "–"}<small> h</small></b></div><small>${sl ? "sleep" + (sl.quality ? " " + SLEEP_QUALITY[sl.quality] : "") : "log sleep"}</small>
          <div class="bar"><i style="width:${sl ? Math.min(100, (sl.hours / stg) * 100) : 0}%"></i></div></div>
        <div class="tile steps ${stp >= sg ? "done" : ""}" data-go="move" role="button" tabindex="0"><div class="tile-top">👟<b>${stp >= 10000 ? fmt(stp / 1000, 1) + "k" : fmt(stp)}</b></div><small>steps · ${fmt(km, 1)} km</small>
          <div class="bar"><i style="width:${Math.min(100, (stp / sg) * 100)}%"></i></div></div>
      </div>
      <details class="fold"><summary>ℹ️ How points work</summary>${pointsGuide()}</details>
    </section>`;
  }
  // Early signs of habits forming: my last 7 days as a habit grid, my daily points, and the team's habits this week.
  const HABIT_META = { food: ["🍽️", "Food"], move: ["👟", "Move"], water: ["glass", "Water"], sleep: ["🌙", "Sleep"], journal: ["📓", "Journal"] };
  function habitsCard() {
    const r = rec(state.me), t = todayStr(), s0 = settings().start; if (t < s0) return "";
    const from0 = r.profile.joinedDate && r.profile.joinedDate > s0 ? r.profile.joinedDate : s0;
    const days = []; for (let i = 6; i >= 0; i--) { const d = addDays(t, -i); if (d >= s0) days.push(d); }
    const grid = days.map((d) => habitsOn(r, d));
    const hi = (k) => HABIT_META[k][0] === "glass" ? glassSvg(true, "sm") : HABIT_META[k][0];
    // Current run for each habit (today counts if done; otherwise the run up to yesterday still stands).
    const run = (k) => { let n = 0, d = habitsOn(r, t)[k] ? t : addDays(t, -1); while (d >= from0 && habitsOn(r, d)[k]) { n++; d = addDays(d, -1); } return n; };
    const runs = HABIT_KEYS.map((k) => [k, run(k)]).sort((a, b) => b[1] - a[1]);
    const signs = runs.filter(([, n]) => n >= 2).slice(0, 3);
    const pts = days.map((d) => Math.max(0, dayPoints(r, d)));
    const team = state.aggregates && state.aggregates.team;
    return `<section class="card">
      <h2>🌱 Habits forming</h2>
      ${signs.length ? `<div class="signs">${signs.map(([k, n]) => `<div class="sign">${hi(k)} <b>${HABIT_META[k][1]}: ${n} days in a row</b></div>`).join("")}</div>
        <p class="note" style="margin-top:6px">Research suggests a new habit takes about 66 days of repetition to feel automatic (Lally et al., 2010). Your best run is on day <b>${runs[0][1]}</b> of 66.</p>`
        : `<p class="note">Do the same healthy thing two days in a row and your first habit signs appear here.</p>`}
      <div class="hgrid" style="grid-template-columns:72px repeat(${days.length},1fr)">
        <span></span>${days.map((d) => `<small class="hday">${fmtDate(d, { weekday: "narrow" })}</small>`).join("")}
        ${HABIT_KEYS.map((k) => `<span class="hlab">${hi(k)} ${HABIT_META[k][1]}</span>${grid.map((g, i) => `<span class="hdot ${g[k] ? "on" : days[i] === t ? "today" : ""}">${g[k] ? "✓" : ""}</span>`).join("")}`).join("")}
      </div>
      ${days.length >= 3 ? `<div class="cblock" style="margin-top:10px"><div class="chead"><span class="cicon">⭐</span><div><b>My daily points</b><small>last ${days.length} days</small></div><div class="cbig">${fmt(pts.reduce((a, b) => a + b, 0))}</div></div>
        ${barChart({ days, values: pts, color: "#F2B134", goal: 15, label: "points", short: true })}</div>` : ""}
      ${team && team.people > 1 ? `<div class="cblock"><div class="chead"><span class="cicon">🤝🏾</span><div><b>Team habits</b><small>how often all ${team.people} of us reached each habit, last 7 days</small></div></div>
        <div class="teambars">${HABIT_KEYS.map((k) => { const h = team.habits[k], pc = h.possible ? Math.round((h.done / h.possible) * 100) : 0; return `<div class="tb"><span>${hi(k)} ${HABIT_META[k][1]}</span><div class="tbbar"><i style="width:${pc}%"></i></div><b>${pc}%</b></div>`; }).join("")}</div></div>` : ""}
    </section>`;
  }

  // BMI: private (only the person and the administrator). Adults use WHO categories; under 18s need a BMI for age chart.
  // Points from each official weigh in (private: only you and the administrator see your weights).
  function weighResultsCard(r) {
    const list = weighDays().filter((d) => d <= todayStr()).map((d) => [d, weighResult(r, d)]).filter(([, x]) => x).reverse();
    if (!list.length) return "";
    return `<section class="card"><h2>⚖️ My weigh in results</h2><div class="list">${list.map(([d, x]) => `<div class="item"><div class="grow"><div class="t">${esc(x.label.replace("Weigh in: ", ""))}</div><div class="s">${fmtDate(d, { weekday: "short", day: "numeric", month: "short" })} · ${esc(x.how)}</div></div><div class="k" style="color:${x.pts < 0 ? "#FF7A63" : "#8BD66B"}">${x.pts > 0 ? "+" : ""}${x.pts}</div></div>`).join("")}</div>
      <p class="note">Plus +${POINTS.weighin} for attending each official weigh in.</p></section>`;
  }
  function bmiCard(r) {
    const p = r.profile;
    if (!p.heightCm) return `<section class="card"><h2>📏 My BMI</h2><p class="note">Add your height in <b>My profile</b> below to see your body mass index (BMI) and how it changes.</p></section>`;
    const sw = startWeight(r), cw = latestWeight(r), pts = [["Nov 2024", p.beforeWeight], ["Start", sw], ["Now", cw]].filter(([, w]) => w).map(([l, w]) => [l, bmi(r, w)]);
    const now = bmi(r, cw); if (!now) return "";
    const lo = 15, hi = 45, pos = (v) => Math.max(0, Math.min(100, ((v - lo) / (hi - lo)) * 100));
    const zones = [[15, 18.5, "#5AA9E6"], [18.5, 25, "#4CC36B"], [25, 30, "#F2B134"], [30, 35, "#E98A3C"], [35, 45, "#E4572E"]];
    return `<section class="card"><h2>📏 My BMI</h2>
      <div class="row between"><div class="cbig" style="font-size:2rem">${fmt(now.value, 1)}</div><div style="text-align:right">${now.cat ? `<b>${now.cat}</b>` : `<b>Under 18</b><br><small>Read on a BMI for age chart</small>`}<br><small>Height ${fmt(p.heightCm)} cm</small></div></div>
      ${now.minor ? "" : `<div class="bmiscale">${zones.map(([a, b, c]) => `<i style="left:${pos(a)}%;width:${pos(b) - pos(a)}%;background:${c}"></i>`).join("")}${pts.map(([l, b]) => `<span class="bmimark ${l === "Now" ? "now" : ""}" style="left:${pos(b.value)}%" title="${l}: ${fmt(b.value, 1)}"></span>`).join("")}</div>
        <div class="bmilabels"><small>18.5</small><small>25</small><small>30</small><small>35</small></div>`}
      ${pts.length > 1 ? `<div class="bmisteps">${pts.map(([l, b]) => `<div><small>${l}</small><b>${fmt(b.value, 1)}</b></div>`).join("<span>→</span>")}</div>` : ""}
      <p class="note">BMI is weight (kg) divided by height (m) squared. It is a screening number, not a diagnosis. ${now.minor ? "For under 18s, the clinic reads BMI on the WHO BMI for age chart." : "Adult categories from the World Health Organization."}</p></section>`;
  }

  // ---------- Catch up "loans" and the end of week list ----------
  // A shortfall from earlier in the challenge week is a loan to cover today. It never changes past points (past days are locked).
  const MOVE_CAP = 60, WATER_EXTRA_CAP = 4, KCAL_DAY_CAP = 300;
  function loans(r) {
    const t = todayStr(), w = currentWeek(); if (t < settings().start || t <= w.w0) return null;
    const L = ledger(r, w.w0, addDays(t, -1)); if (!L.days) return null;
    const wkg = latestWeight(r) || 70, walkMin = (kcal) => Math.round(kcal / ((4.3 * wkg) / 60));
    const todayMin = activeMinutes(r, t), todaySteps = daySteps(r, t) >= stepGoal();
    const moveTarget = Math.min(MOVE_CAP, MOVE_MINUTES + L.move.owed), moveDone = todaySteps ? Math.max(todayMin, MOVE_MINUTES) : todayMin;
    const waterTarget2 = waterTarget() + Math.min(WATER_EXTRA_CAP, L.water.owed), g = glasses(r, t);
    const kcal = L.kcalOver !== null && L.kcalOver > 0 ? L.kcalOver : 0;
    return { L, moveTarget, moveDone, moveLeft: Math.max(0, moveTarget - moveDone), waterTarget: waterTarget2, water: g, kcal, kcalToday: Math.min(KCAL_DAY_CAP, kcal), walkMin: walkMin(Math.min(KCAL_DAY_CAP, kcal)), lastDay: t === w.w1 };
  }
  function loanCard() {
    const r = rec(state.me), x = loans(r); if (!x) return "";
    const { L } = x, owesMove = L.move.owed > 0, owesWater = L.water.owed > 0, owesKcal = x.kcal > 0, missedFood = L.missedFood.length;
    if (!owesMove && !owesWater && !owesKcal && !missedFood) return `<section class="card loan clear"><h2>🏦 Catch up</h2><p class="note" style="margin:0">Nothing owed from earlier this week. Well done, you are fully on track. 🎉</p></section>`;
    const row = (icon, title, sub, done, target) => `<div class="loanrow"><span class="scicon">${icon}</span><div class="grow"><b>${title}</b><small>${sub}</small>${target ? `<div class="bar"><i style="width:${Math.min(100, (done / target) * 100)}%"></i></div>` : ""}</div></div>`;
    return `<section class="card loan"><h2>🏦 Catch up: what I owe this week</h2>
      <p class="note" style="margin-top:0">What you did not complete on earlier days this week becomes a loan to cover now.</p>
      ${owesMove ? row("👟", `Move ${x.moveTarget} minutes today`, `${MOVE_MINUTES} for today + ${Math.min(L.move.owed, MOVE_CAP - MOVE_MINUTES)} owed${L.move.owed > MOVE_CAP - MOVE_MINUTES ? ` (${L.move.owed} owed in total; ${x.lastDay ? "the week closes tonight" : "spread the rest over the week"})` : ""} · done ${x.moveDone} min${x.moveLeft ? ` · ${x.moveLeft} to go` : " ✓ covered"}`, x.moveDone, x.moveTarget) : ""}
      ${owesWater ? row(glassSvg(true, "sm"), `Drink ${x.waterTarget} glasses today`, `${waterTarget()} for today + ${Math.min(L.water.owed, WATER_EXTRA_CAP)} owed · ${x.water} so far`, x.water, x.waterTarget) : ""}
      ${owesKcal ? row("🍽️", `${fmt(x.kcal)} kcal over budget this week`, `Today, cover up to ${x.kcalToday} kcal: about ${x.walkMin} minutes of brisk walking, or eat that much less. Never go below your safe minimum, and never skip a meal.`, 0, 0) : ""}
      ${missedFood ? row("📝", `Food not logged on ${missedFood} day${missedFood > 1 ? "s" : ""}`, `${L.missedFood.map((d) => fmtDate(d, { weekday: "short" })).join(", ")}. Those days cannot be filled in any more; log every meal today.`, 0, 0) : ""}
      <p class="note">Catch up does not change past points (past days are locked). It helps you keep your promise to your body.</p></section>`;
  }
  // End of week list: everything not completed in the week, from eating to exercising.
  function weekSummaryCard(w, title) {
    const r = rec(state.me), t = todayStr(), L = ledger(r, w.w0, w.w1 < t ? w.w1 : t); if (!L.days) return "";
    const sl = [];
    const item = (ok, icon, label, detail) => `<div class="wsrow ${ok ? "ok" : ""}"><span>${ok ? "✓" : icon}</span><div class="grow"><b>${label}</b><small>${detail}</small></div></div>`;
    const tasksDone = (() => { let n = 0; for (let d = w.w0; d <= w.w1 && d <= t; d = addDays(d, 1)) if (taskDone(r, d)) n++; return n; })();
    sl.push(item(!L.move.owed, "👟", "Movement", L.move.owed ? `${L.move.owed} minutes still to do (did ${L.move.done} of ${L.move.need})` : `${L.move.done} active minutes, target met`));
    sl.push(item(!L.water.owed, glassSvg(true, "sm"), "Water", L.water.owed ? `${L.water.owed} glasses short (drank ${L.water.done} of ${L.water.need})` : "Target met"));
    sl.push(item(L.foodDays === L.days, "🍽️", "Food logged", L.foodDays === L.days ? `Every day (${L.days} of ${L.days})` : `${L.foodDays} of ${L.days} days · missing ${L.missedFood.map((d) => fmtDate(d, { weekday: "short" })).join(", ")}`));
    if (L.kcalOver !== null && L.foodDays) sl.push(item(L.kcalOver <= 0, "⚖️", "Calories", L.kcalOver > 0 ? `${fmt(L.kcalOver)} kcal over your budget on logged days` : `${fmt(-L.kcalOver)} kcal under budget on logged days. Good`));
    sl.push(item(L.sleepDays === L.days, "🌙", "Sleep goal", `${L.sleepDays} of ${L.days} nights`));
    sl.push(item(L.journalDays === L.days, "📓", "Journal", `${L.journalDays} of ${L.days} days`));
    sl.push(item(tasksDone >= L.days, "🎯", "Daily challenges", `${tasksDone} of ${L.days} done`));
    const left = sl.filter((x) => !x.includes('wsrow ok')).length;
    return `<section class="card"><div class="row between"><h2>${title}</h2><span class="pill ${left ? "warn" : "good"}">${left ? left + " to finish" : "All done ✓"}</span></div>
      <p class="note" style="margin-top:0">Week ${w.n} · ${fmtDate(w.w0, { day: "numeric", month: "short" })} to ${fmtDate(w.w1, { day: "numeric", month: "short" })}</p>
      <div class="wslist">${sl.join("")}</div></section>`;
  }
  function weekEndCard() {
    const t = todayStr(), w = currentWeek(); if (t < settings().start) return "";
    if (t === w.w1) return weekSummaryCard(w, "📋 Week ends today: still to do");
    const prev = challengeWeeks().find((x) => x.n === w.n - 1);
    if (prev && t === w.w0) return weekSummaryCard(prev, "📋 Last week: left undone");
    return "";
  }

  function challengeDone(r, c, d = todayStr()) {
    const ds = r.challenges.filter((x) => x.challengeId === c.id).map((x) => x.date);
    if (c.type === "daily") return ds.includes(d);
    if (c.type === "weekly") { const w = currentWeek(); return ds.some((x) => x >= w.w0 && x <= w.w1); }
    return ds.some((x) => x.slice(0, 7) === d.slice(0, 7));
  }
  function upcomingCard() {
    const t = todayStr(), r = rec(state.me);
    const active = state.challenges.filter((c) => c.start <= t && c.end >= t), soon = state.challenges.filter((c) => c.start > t).slice(0, 3);
    if (!active.length && !soon.length) return "";
    return `<section class="card"><h2>🎯 Challenges</h2>
      <div class="list">${active.map((c) => { const done = challengeDone(r, c); return `<div class="item"><div class="grow"><div class="t">${esc(c.title)}</div><div class="s">${esc(c.type)} · ${c.points} pts · until ${shortDate(c.end)}${c.description ? " · " + esc(c.description) : ""}</div></div>
        ${done ? `<span class="pill good">Done ✓</span>` : `<button class="btn small" data-chal="${c.id}">Mark as done</button>`}</div>`; }).join("")}
      ${soon.map((c) => `<div class="item" style="opacity:.7"><div class="grow"><div class="t">${esc(c.title)}</div><div class="s">Starts ${shortDate(c.start)} · ${esc(c.type)} · ${c.points} pts</div></div><span class="pill">Upcoming</span></div>`).join("")}</div></section>`;
  }

  const nowHM = () => new Date().toLocaleTimeString("en-GB", { timeZone: "Africa/Johannesburg", hour: "2-digit", minute: "2-digit", hour12: false });
  const saHour = () => Number(new Date().toLocaleString("en-ZA", { timeZone: "Africa/Johannesburg", hour: "numeric", hour12: false })) % 24;
  /** Personal coaching: honest, habit based nudges. Never about pushing the scale. */
  function coachTips() {
    const r = rec(state.me), t = todayStr(), h = saHour(), tips = [], sc = score(state.me);
    const g = glasses(r, t), wt = waterTarget(), expected = Math.min(wt, Math.ceil(wt * Math.max(0, (h - 6) / 14)));
    if (g < expected) tips.push([3, `🥛 You're at ${g} of ${wt} glasses. Drink ${expected - g} more glass${expected - g === 1 ? "" : "es"} now to stay on track.`, "water"]);
    const sl = sleepOn(r, t), stg = sleepTarget(r);
    if (!sl && h >= 6) tips.push([2, "🌙 Log last night's sleep. It takes five seconds.", "sleep"]);
    else if (sl && sl.hours < stg) tips.push([4, `🌙 You slept ${fmt(sl.hours, 1)} hours, below your ${stg} hour goal. Aim for lights out by 22:00 tonight; good sleep steadies appetite tomorrow.`, "sleep"]);
    const stp = daySteps(r, t), sg = stepGoal();
    if (stp < sg && h >= 14) tips.push([3, `👟 ${fmt(sg - stp)} steps to your goal. A 20 minute walk adds about 2 500 steps.`, "move"]);
    const e = energy(r), tot = dayTotals(r, t);
    if (e && tot.eaten > e.target + tot.burned + (treatOn(r, t) ? TREAT.kcal : 0)) tips.push([4, `🍽️ You're ${fmt(tot.eaten - e.target - tot.burned)} kcal over today. Keep the next meal light: vegetables and lean protein, and water instead of fizzy drinks.`, "food"]);
    else if (!tot.eaten && h >= 13) tips.push([2, "🍽️ Log what you've eaten today. Honest logs lead to better choices.", "food"]);
    if (!r.reflections.some((x) => x.date === t) && h >= 19) tips.push([1, "📓 Write one line in your journal before bed: one choice you are proud of today.", "journal"]);
    const y = addDays(t, -1);
    if (y >= settings().start && y >= (r.profile.joinedDate || "") && !dayStatus(r, y).any && !holiday(y)) tips.push([5, "↩️ Yesterday was missed. Today is a fresh start: log one thing now to get back on track.", "today"]);
    // Weekly effort gap (effort points only; nobody's weight is involved)
    const cw = currentWeek().n, mine = sc.weekPts[cw] || 0, top = Math.max(0, ...MEMBERS.map((m) => score(m.id).weekPts[cw] || 0));
    if (todayStr() >= settings().start && top > 0) {
      if (mine >= top) tips.push([0, "🔥 You're leading this week's effort. Keep your habits going.", "board"]);
      else { const gap = Math.round(((top - mine) / top) * 100); tips.push([gap >= 20 ? 5 : 3, `📊 You're ${gap}% behind this week's top effort. Close the gap with honest habits: water, sleep, steps and your journal.`, "board"]); }
    }
    if (sc.tooFast) tips.push([6, "⚠️ You're losing weight faster than the safe pace. Eat enough, rest well and speak to a doctor if unsure. Faster loss earns no extra points.", "me"]);
    return tips.sort((a, b) => b[0] - a[0]).slice(0, 3);
  }
  function coachCard() {
    const tips = coachTips();
    if (!tips.length) return `<section class="card coach"><div class="label">🧭 Your coach</div><p>Everything is on track today. Well done! 🌟</p></section>`;
    return `<section class="card coach"><div class="label">🧭 Your coach</div>
      ${tips.map(([, text, go]) => `<div class="tipline" data-go="${go}" role="button" tabindex="0">${esc(text)}<span>›</span></div>`).join("")}
      <p class="note" style="margin:6px 0 0">Only official Saturday weigh ins count towards the winners, so always log honestly.</p></section>`;
  }

  // Save to home screen (installable app)
  const isStandalone = () => window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  function installSteps() {
    return isIOS()
      ? `<ol class="installsteps"><li>Open this page in <b>Safari</b>.</li><li>Tap the <b>Share</b> button <span class="ib">⬆️</span> at the bottom of the screen.</li><li>Scroll down and tap <b>Add to Home Screen</b> <span class="ib">➕</span>.</li><li>Tap <b>Add</b>. The Stoic by Choice book icon appears on your home screen.</li></ol>`
      : `<ol class="installsteps"><li>Open this page in <b>Chrome</b>.</li><li>Tap the <b>⋮ menu</b> at the top right.</li><li>Tap <b>Add to Home screen</b> or <b>Install app</b>.</li><li>Tap <b>Install</b>. The Stoic by Choice book icon appears on your home screen.</li></ol>`;
  }
  async function installApp() {
    if (isStandalone()) return toast("✅ The app is already on your home screen.");
    const ev = state.installEvt;
    if (ev) { ev.prompt(); const c = await ev.userChoice.catch(() => null); state.installEvt = null; if (c && c.outcome === "accepted") toast("📲 Installed. Find the Stoic by Choice icon on your home screen."); render(); return; }
    const m = modal(`<h2>📲 Add the app to your home screen</h2><p class="note" style="margin-top:0">It then opens full screen with one tap, like any app, and can send you reminders.</p>${installSteps()}<button class="btn full" data-closeinstall>Got it</button>`);
    $("[data-closeinstall]", m).addEventListener("click", closeModal);
  }
  function updateInstallBtn() { const b = document.getElementById("installBtn"); if (b) b.hidden = isStandalone(); }
  function installCard() {
    if (isStandalone()) return "";
    let hidden = false; try { hidden = localStorage.getItem("sbc_install_hide") === "1"; } catch {}
    if (hidden) return "";
    const how = `<button class="btn full" data-install>📲 Add to home screen</button>`;
    return `<section class="card installcard"><div class="row between"><div class="row" style="gap:10px"><img src="/icons/icon-192.png" alt="" width="44" height="44" style="border-radius:12px"><div><b>Put the app on your phone</b><br><small>Opens full screen with one tap, like any app.</small></div></div><button class="del" data-installhide aria-label="Hide">✕</button></div>${how}</section>`;
  }

  // ---------- Personal coach: a catch up challenge from yesterday, and advice learned from each person's own habits ----------
  // Advice follows widely used public health guidance: WHO (activity), NHS and CDC (safe loss of 0.5 to 1 kg a week,
  // regular meals, water, self monitoring), and sleep guidance (7 to 9 hours for adults, 8 to 10 for teenagers).
  const FLAG_ADVICE = {
    late: "Eating late: plan dinner before 9 PM and have a cup of herbal tea instead of a late snack.",
    gap: "Meals too close together: keep about 5 hours between meals; drink water or tea in between.",
    fruit: "Too much fruit: fruit sugar adds up. Keep to 2 portions and add vegetables when hungry.",
    provita: "Too many Provitas: keep to your allowance, never more than 2 at a time.",
    atonce: "More than 2 at a time: spread fruit and Provitas across the day.",
    bad: "Foods not on the plan: plan tomorrow's meals tonight and keep allowed snacks (vegetables, gum) close.",
    mixed: "Mixed proteins: choose one protein per meal and fill the rest of the plate with vegetables.",
    cheese: "Cheese twice: keep cheese to one meal a day.", feta: "Feta more than once this week: save it for one meal a week.",
    onion: "Too much onion: keep to 2 tablespoons (30 g) a day.", tomato: "Too much tomato: keep to 70 g a day.",
    mayo: "Mayonnaise: one level teaspoon of lite mayonnaise a day.", soy: "Soy sauce: one teaspoon a day; salt makes you hold water.",
    coffee: "Lots of coffee: switch to decaf or herbal tea after 8 cups.", fizzy: "Diet fizzy drinks: keep under 1 litre; water first.",
    schweppes: "Schweppes Lemon Lite: one can a day.", gum: "Gum: no more than 5 sticks a day.",
  };
  const HABIT_ADVICE = {
    food: "Log every meal as you eat it. People who keep a food record lose more weight than those who do not.",
    move: "Aim for at least 150 minutes of moderate activity a week (WHO), for example 30 minutes on 5 days. Stairs and brisk walks count.",
    water: "Drink 8 glasses (2 litres) a day. Start the morning with a glass and keep a bottle with you.",
    sleep: "Sleep 7 to 9 hours (teenagers 8 to 10). Short sleep raises hunger hormones and makes cravings harder to resist.",
    journal: "Tick your journal each evening. Noticing patterns is how habits change.",
  };
  function burnOptions(kcal, w) {
    const walk = Math.max(10, Math.round(kcal / ((4.3 * w) / 60) / 5) * 5), run = Math.max(1, Math.round((kcal / w) * 2) / 2), spin = Math.max(10, Math.round(kcal / ((8.5 * w) / 60) / 5) * 5);
    const perStairs = (15 * 20 * 0.16 * w) / 70, stairs = Math.max(1, Math.ceil(kcal / perStairs));
    const opts = [["🚶🏾", `Brisk walk ${walk} min`, /walk|hik/], ["🏃🏾", `Run ${String(run).replace(".", ",")} km`, /run|jog/], ["🏢", `Stairs to floor 15 and back ${stairs} time${stairs > 1 ? "s" : ""}`, /stair/], ["🚴🏾", `Spinning ${spin} min`, /spin|cycl|bike/]];
    const fav = String(rec(state.me).profile.favExercise || "").toLowerCase();
    return opts.sort((a, b) => b[2].test(fav) - a[2].test(fav)).map(([i, t, re]) => [i, re.test(fav) ? t + " ⭐" : t]);
  }
  // ---------- Daily routine: vitamin, 5 minute meditation, quick journal write up ----------
  const ROUTINE = [["vitamin", "💊", "Took my Centrum", "With breakfast"], ["meditate", "🧘🏾", "5 minute meditation", "Sit, breathe slowly, notice what is in your control"], ["write", "✍🏾", "Quick journal write up", "A few lines about anything, on paper or in the app"]];
  function routineDone(r, k, d = todayStr()) { return (r.routine || []).some((x) => x.date === d && x.kind === k) || (k === "vitamin" && r.foods.some((f) => f.date === d && /^(centrum|vitamins|vitc)$/.test(f.foodId || ""))); }
  function routineCard() {
    const r = rec(state.me), n = ROUTINE.filter(([k]) => routineDone(r, k)).length;
    return `<section class="card"><div class="row between"><h2>🌿 Daily routine</h2><span class="pill ${n === 3 ? "good" : ""}">${n} of 3</span></div>
      <div class="sclist">${ROUTINE.map(([k, i, l, how]) => { const d = routineDone(r, k); return `<div class="scrow ${d ? "done" : ""}" ${d ? "" : `data-routine="${k}"`} role="button" tabindex="0"><span class="scicon">${i}</span><span class="grow"><b>${l}</b><small>${how}</small></span><span class="scpts">${d ? "✓" : "Tap"}</span></div>`; }).join("")}</div>
      <p class="note">Small daily routines support weight loss: steady habits, less stress eating and better sleep. Turn on reminders in Progress.</p></section>`;
  }

  // ---------- Calorie deficit tracker ----------
  // Deficit = what your body uses in a day (TDEE) + exercise − food eaten. About 7 700 kcal is roughly 1 kg of body fat.
  function deficitCard() {
    const r = rec(state.me), e = energy(r), t = todayStr(), s0 = settings().start;
    if (!e) return `<section class="card"><h2>🔥 Calorie deficit</h2><p class="note" style="margin:0">Add your age, height and activity level in <a href="#" data-go="profile">your profile</a> to track your daily calorie deficit.</p></section>`;
    if (isMinor(r)) return `<section class="card"><h2>🔥 Energy balance</h2><p class="note" style="margin:0">Growing bodies need enough food. For under 18s the app does not push a calorie deficit: eat your 3 meals, move every day and the habits do the work.</p></section>`;
    const def = (d) => { const tt = dayTotals(r, d); return r.foods.some((f) => f.date === d) ? Math.round(e.tdee + tt.burned - tt.eaten) : null; };
    const goal = Math.round(e.tdee - e.target), today = def(t), w = currentWeek();
    const days = []; for (let d = w.w0 > s0 ? w.w0 : s0; d <= t; d = addDays(d, 1)) days.push(d);
    const vals = days.map(def), weekSum = vals.reduce((a, v) => a + (v || 0), 0), weekGoal = goal * days.length;
    const tooBig = today !== null && today > Math.max(1000, goal * 1.6);
    return `<section class="card deficit"><div class="row between"><h2>🔥 Calorie deficit</h2><span class="pill ${today !== null && today >= goal ? "good" : ""}">goal ${fmt(goal)} kcal a day</span></div>
      <div class="defrow"><div><small>Today so far</small><b style="color:${today === null ? "inherit" : today >= goal ? "#8BD66B" : today >= 0 ? "#F2B134" : "#FF7A63"}">${today === null ? "–" : fmt(today) + " kcal"}</b><small>${today === null ? "log your food" : today >= goal ? "on target ✓" : today >= 0 ? `${fmt(goal - today)} kcal to go` : "surplus: over budget"}</small></div>
        <div><small>This week</small><b>${fmt(weekSum)} kcal</b><small>of ${fmt(weekGoal)} · ≈ ${fmt(weekSum / 7700, 2)} kg</small></div></div>
      <div class="bar"><i style="width:${Math.max(0, Math.min(100, (weekSum / (weekGoal || 1)) * 100))}%"></i></div>
      ${days.length >= 2 ? barChart({ days, values: vals.map((v) => Math.max(0, v || 0)), color: "#E98A3C", goal, label: "kcal", short: true }) : ""}
      <p class="note">Your body uses about ${fmt(e.tdee)} kcal a day; eating ${fmt(e.target)} plus your exercise gives the deficit. About 7 700 kcal ≈ 1 kg.${tooBig ? " ⚠️ Today's deficit is very large: eat your full meals; going too low makes you lose muscle and rebound later." : ""} Food is counted from what you log, so log everything.</p></section>`;
  }

  function catchUpCard() {
    const r = rec(state.me), t = todayStr(), y = addDays(t, -1); if (y < settings().start || (r.profile.joinedDate && y < r.profile.joinedDate)) return "";
    const ey = eating(r, y), sy = scorecard(r, y), flags = ey.flags, w = latestWeight(r) || 70, minor = isMinor(r), e = energy(r), ty = dayTotals(r, y);
    const anyY = dayStatus(r, y).any, moved = sy.items.find((x) => x.k === "move")?.done;
    const surplus = e && !minor && ey.kcal > 0 ? Math.round(ty.eaten - e.target - ty.burned) : 0;
    const lines = [];
    if (!anyY) lines.push(["😴", "Nothing was logged yesterday. Today is a fresh start: check in, log 3 meals and move."]);
    if (ey.kcal > 0 && (ey.tooLittle || ey.meals < 3)) lines.push(["🍽️", `You ate too little yesterday (${ey.meals} of 3 meals${ey.kcal ? `, ${fmt(ey.kcal)} kcal` : ""}). Eating too little slows your metabolism and leads to overeating later. Today: eat all 3 meals; do not cut calories.`]);
    [...new Map(flags.map((f) => [f.k, f])).values()].slice(0, 4).forEach((f) => lines.push(["🚩", FLAG_ADVICE[f.k] || f.how]));
    if (anyY && !moved) lines.push(["👟", `You did not reach ${MOVE_MINUTES} active minutes yesterday. Add it to today (see Catch up).`]);
    // Calorie catch up: yesterday's surplus, or about 100 kcal per bad habit. Never for under 18s, never after under eating.
    let kcal = 0;
    if (!minor && !(ey.tooLittle || (ey.kcal > 0 && ey.meals < 3))) kcal = Math.min(500, Math.max(surplus > 0 ? surplus : 0, Math.min(400, flags.length * 100)));
    kcal = Math.round(kcal / 50) * 50;
    if (!lines.length && !kcal) return `<section class="card coach"><div class="label">🎯 Today's catch up</div><p style="margin:0">Yesterday was clean: no bad habits and nothing to catch up. Keep the streak going. 🌟</p></section>`;
    const burned = dayTotals(r, t).burned, done = kcal && burned >= kcal;
    return `<section class="card coach catchup"><div class="label">🎯 Today's catch up (from yesterday)</div>
      ${kcal ? `<div class="cuhead ${done ? "done" : ""}"><b>${done ? "✓ Done: " : ""}Create a ${fmt(kcal)} kcal deficit today</b><small>${surplus > 0 ? `Yesterday you were ${fmt(surplus)} kcal over your budget.` : `${flags.length} bad habit${flags.length > 1 ? "s" : ""} yesterday.`} Burned today so far: ${fmt(burned)} kcal.</small></div>
        <div class="cuopts">${burnOptions(kcal, w).map(([i, tx]) => `<button class="planbtn" data-go="move"><span>${i} ${tx}</span></button>`).join("")}</div>
        <p class="note">Or eat about ${fmt(Math.min(kcal, 300))} kcal less spread over the day (smaller portions, no extra snacks), but never skip a meal or go below your safe minimum.</p>` : ""}
      ${lines.map(([i, tx]) => `<div class="tipline">${i} ${esc(tx)}</div>`).join("")}
    </section>`;
  }
  // What the app has learned about you (last 14 days of your own entries).
  function insightsCard() {
    const r = rec(state.me), t = todayStr(), from = [settings().start, r.profile.joinedDate || settings().start, addDays(t, -14)].sort().pop();
    const days = []; for (let d = from; d < t; d = addDays(d, 1)) days.push(d);
    if (days.length < 4) return `<section class="card"><div class="label">🧠 Learning your habits</div><p class="note" style="margin:0">After 4 days of logging, your coach starts giving advice based on your own patterns. ${days.length} day${days.length === 1 ? "" : "s"} so far.</p></section>`;
    const rate = {}; for (const k of HABIT_KEYS) rate[k] = days.filter((d) => habitsOn(r, d)[k]).length / days.length;
    const weakest = HABIT_KEYS.slice().sort((a, b) => rate[a] - rate[b])[0], best = HABIT_KEYS.slice().sort((a, b) => rate[b] - rate[a])[0];
    const flagCount = {}; days.forEach((d) => eating(r, d).flags.forEach((f) => { flagCount[f.k] = (flagCount[f.k] || 0) + 1; }));
    const topFlag = Object.entries(flagCount).sort((a, b) => b[1] - a[1])[0];
    const dow = {}; days.forEach((d) => { const k = new Date(d + "T12:00:00").toLocaleDateString("en-GB", { weekday: "long" }); (dow[k] = dow[k] || []).push(Math.max(0, dayPoints(r, d))); });
    const avg = Object.entries(dow).filter(([, v]) => v.length >= 2).map(([k, v]) => [k, v.reduce((a, b) => a + b, 0) / v.length]).sort((a, b) => a[1] - b[1]);
    const logged = days.filter((d) => r.foods.some((f) => f.date === d)), e = energy(r);
    const avgKcal = logged.length ? Math.round(logged.reduce((a, d) => a + dayTotals(r, d).eaten, 0) / logged.length) : 0;
    const lastW = weighDays().filter((d) => d <= t).map((d) => weighResult(r, d)).filter(Boolean).pop();
    const out = [];
    out.push(["💪🏾", `Your strongest habit: <b>${HABIT_META[best][1]}</b> (${Math.round(rate[best] * 100)}% of days). Keep it.`]);
    if (rate[weakest] < 0.8) out.push(["🎯", `Your weakest habit: <b>${HABIT_META[weakest][1]}</b> (${Math.round(rate[weakest] * 100)}% of days). ${HABIT_ADVICE[weakest]}`]);
    if (topFlag && topFlag[1] >= 2) out.push(["🚩", `Your most common bad habit: <b>${esc(FLAG_ADVICE[topFlag[0]] ? FLAG_ADVICE[topFlag[0]].split(":")[0] : topFlag[0])}</b> (${topFlag[1]} times). ${esc((() => { const x = FLAG_ADVICE[topFlag[0]] ? FLAG_ADVICE[topFlag[0]].split(": ").slice(1).join(": ") : ""; return x.charAt(0).toUpperCase() + x.slice(1); })())}`]);
    if (avg.length >= 2 && avg[0][1] < avg[avg.length - 1][1] - 3) out.push(["📅", `Your hardest day is usually <b>${avg[0][0]}</b>. Plan it the night before: meals ready, walk booked.`]);
    if (e && avgKcal && !isMinor(r)) {
      if (avgKcal < calorieFloor(r) * 0.85 && !eating(r, t).onPlan) out.push(["🍽️", `You are eating about ${fmt(avgKcal)} kcal a day, below your safe minimum of ${fmt(calorieFloor(r))}. Eating too little makes weight loss harder to keep up and can cost muscle. Eat all 3 meals.`]);
      else if (avgKcal > e.target + 150) out.push(["⚖️", `You are eating about ${fmt(avgKcal)} kcal a day, ${fmt(avgKcal - e.target)} over your target of ${fmt(e.target)}. Smaller portions of starch and fill half the plate with vegetables.`]);
    }
    if (lastW && lastW.pts < 0) out.push(["📈", lastW.lost < 0 ? "You gained at the last weigh in. Check for hidden extras (oil, sugar, sauces, drinks), weigh food raw, drink your 8 glasses and keep moving. One weigh in does not define you." : "No loss at the last weigh in. Plateaus are normal; tighten portions, log everything, add 10 minutes of walking a day and sleep 7 hours or more."]);
    else if (lastW && lastW.pts > 0) out.push(["📉", "You lost weight at the last weigh in. A safe pace is 0.5 to 1 kg a week; keep doing what works."]);
    return `<section class="card coach"><div class="label">🧠 What your coach has learned about you</div><p class="note" style="margin-top:0">From your last ${days.length} days of entries.</p>
      ${out.map(([i, tx]) => `<div class="tipline insight">${i} ${tx}</div>`).join("")}</section>`;
  }

  function viewToday() {
    return `${installCard()}
      ${bigCheckin()}
      ${maintenanceCard()}
      ${activitiesCard()}
      ${deficitCard()}
      ${routineCard()}
      ${buddyCard()}
      ${weeklyReportCard()}
      ${catchUpCard()}
      ${weekEndCard()}
      ${loanCard()}
      ${insightsCard()}
      ${coachCard()}
      ${habitsCard()}
      ${homeScreen()}
      ${announcementsCard()}
      ${childrenCard()}
      ${stoicCard()}`;
  }

  function reflectModal() { return go("journal"); }
  function oldReflectModal() {
    const r = rec(state.me), d = state.date, cur = r.reflections.find((x) => x.date === d);
    const prompts = ["What is one choice you made today that you are proud of?", "Where did you choose comfort over discipline today, and what will you do differently?", "What was in your control today, and what was not?", "What small win can you build on tomorrow?"];
    const pr = prompts[(diffDays("2026-01-01", d) % prompts.length + prompts.length) % prompts.length];
    const m = modal(`<h2>🪞 Reflect on one choice</h2><p class="note">${esc(pr)} Your reflection is private.</p>
      <form class="form" id="reflForm"><textarea id="reflText" rows="5" maxlength="600" required placeholder="Write a sentence or two…">${esc(cur ? cur.text : "")}</textarea>
      <div class="row"><button type="button" class="btn ghost" data-x>Cancel</button><button class="btn">Save reflection</button></div></form>`);
    $("[data-x]", m).onclick = closeModal;
    $("#reflForm", m).onsubmit = async (e) => {
      e.preventDefault();
      if (cur) await send({ action: "delete", type: "reflections", id: cur.id });
      closeModal();
      await addEntry("reflections", { id: uid(), date: d, text: $("#reflText", m).value.trim() }, "🪞 Reflection saved.");
    };
  }

  function treatCard(tr) {
    const cw = tr.current;
    const s = settings();
    if (todayStr() < s.start) return `<section class="card treat"><h3>🍦 Treats for hard workers</h3><p class="note" style="margin:0">From ${fmtDate(s.start)}: check in every day of a challenge week (holidays excused) and exercise ${TREAT.minutes} minutes to earn a treat token and +${TREAT.bonus} points.</p></section>`;
    const pctMin = cw ? Math.min(100, (cw.mins / cw.need) * 100) : 0;
    return `<section class="card treat">
      <div class="row between"><h3>🍦 Treat tokens: ${tr.left}</h3>${tr.left > 0 && !tr.usedToday && state.date === todayStr() ? `<button class="btn small" data-act="useTreat">Use a treat today</button>` : ""}</div>
      ${cw ? `<small>Week ${cw.n} (${shortDate(cw.from)} to ${shortDate(cw.to)}): ${cw.allIn ? "every day checked in so far ✓" : `a day was missed, so no token this week.${cw.to < settings().end ? " Next week is a fresh start." : ""}`}</small>
      <div class="bar" style="margin-top:6px"><i style="width:${pctMin}%;background:linear-gradient(90deg,#D6457F,#F2B134)"></i></div>
      <small>${fmt(cw.mins)} of ${cw.need} exercise minutes this week</small>` : ""}
      <p class="note" style="margin:8px 0 0">Earn a token by checking in every day of a challenge week (holidays excused) and exercising ${TREAT.minutes} minutes. Each token gives +${TREAT.bonus} points and a guilt free treat: an extra ${TREAT.kcal} kcal on the day you choose.</p>
    </section>`;
  }

  function foodList(r) {
    const items = r.foods.filter((f) => f.date === state.date);
    if (!items.length) return `<div class="empty">Nothing logged today yet.</div>`;
    const groups = [1, 2, 3, 0].map((n) => [n, items.filter((f) => (SLOT_OF[f.meal] || 0) === n).sort((a, b) => (a.time || "99").localeCompare(b.time || "99"))]).filter(([, x]) => x.length);
    return groups.map(([n, x]) => `<details class="mealgroup"><summary class="mghead"><b>${SLOT_NAME[n]}</b><span>${x.length} item${x.length > 1 ? "s" : ""} · ${fmt(x.reduce((a, f) => a + f.kcal, 0))} kcal ▾</span></summary>
      <div class="list">${x.map((f) => `<div class="item"><div class="grow"><div class="t">${NOT_ALLOWED[f.foodId] ? "⛔ " : ""}${esc(f.name)}</div><div class="s">${f.time ? `🕒 ${esc(f.time)}` : "no time"}${f.custom ? " · your estimate" : ""}</div></div><div class="k">${fmt(f.kcal)} kcal</div><button class="del" data-del="foods" data-id="${esc(f.id)}" aria-label="Delete">✕</button></div>`).join("")}</div></details>`).join("");
  }
  function exList(r) {
    const items = r.exercises.filter((x) => x.date === state.date);
    if (!items.length) return `<div class="empty">No exercise logged for ${shortDate(state.date)} yet.</div>`;
    return `<div class="list">${items.map((x) => `<div class="item"><div class="grow"><div class="t">${esc(x.activity)}</div><div class="s">${fmt(x.minutes)} min${x.distanceKm ? ` · ${fmt(x.distanceKm, 1)} km` : ""}${x.steps ? ` · ${fmt(x.steps)} steps` : ""}</div></div><div class="k" style="color:var(--leaf)">${fmt(x.kcal)} kcal</div><button class="del" data-del="exercises" data-id="${esc(x.id)}" aria-label="Delete">✕</button></div>`).join("")}</div>`;
  }

  const glassSvg = (full = true, cls = "") => `<svg class="glass-ic ${cls}" viewBox="0 0 24 32" aria-hidden="true">
    <defs><linearGradient id="gw" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#BFE6FF"/><stop offset="1" stop-color="#3E8FD0"/></linearGradient></defs>
    ${full ? `<path d="M5.2 11 L18.8 11 L17.3 28.2 Q17.1 29.5 15.8 29.5 L8.2 29.5 Q6.9 29.5 6.7 28.2 Z" fill="url(#gw)"/><path d="M7 14 L9 14" stroke="#fff" stroke-width="1.2" stroke-linecap="round" opacity=".7"/>` : ""}
    <path d="M3.5 3 L20.5 3 L17.6 28.4 Q17.3 30.5 15.2 30.5 L8.8 30.5 Q6.7 30.5 6.4 28.4 Z" fill="none" stroke="${full ? "#9BD8FF" : "#5C6B78"}" stroke-width="1.6" stroke-linejoin="round"/></svg>`;
  const logSeg = () => { const m = state.logMode || "food"; return `<div class="seg big">${[["food", "🍽️ Food"], ["move", "🏃🏾 Move"], ["water", glassSvg(true, "sm") + " Water"], ["sleep", "🌙 Sleep"], ["journal", "📓 Journal"]].map(([k, l]) => `<button class="${m === k ? "on" : ""}" data-log="${k}">${l}</button>`).join("")}</div>`; };
  function viewWater() {
    const r = rec(state.me), d = state.date, g = glasses(r, d), wt = waterTarget();
    const days = []; for (let i = 6; i >= 0; i--) days.push(addDays(todayStr(), -i));
    return `${logSeg()}
      <section class="card">
        <div class="row between wrap"><h2>${glassSvg(true, "sm")} Water</h2>${dateNav()}</div>
        <p class="center big-num">${g} <small>of ${wt} glasses</small></p>
        <p class="center glassml">1 glass = <b>250 ml</b> · ${wt} glasses = <b>${fmt(wt * 0.25, 1)} litres</b> · you have had <b>${fmt(g * 250)} ml</b></p>
        <div class="glasses">${Array.from({ length: Math.max(wt, g) }, (_, i) => `<button class="glass ${i < g ? "full" : ""}" data-setwater="${i + 1 === g ? i : i + 1}" aria-label="${i + 1} glasses">${glassSvg(i < g)}</button>`).join("")}</div>
        <div class="row" style="justify-content:center;margin-top:12px"><button class="wbtn" data-water="-1" ${g ? "" : "disabled"}>−</button><button class="btn" data-water="1">+ 1 glass</button></div>
        <p class="note center">${g >= wt ? `Goal reached! +${POINTS.water} points 🎉` : `Reach ${wt} glasses (${fmt(wt * 250)} ml) for +${POINTS.water} points. Tap a glass to set the number.`}</p>
        <div class="minibars">${days.map((x) => { const v = glasses(r, x); return `<div><div class="mb" style="height:${Math.min(100, (v / wt) * 100)}%"></div><small>${fmtDate(x, { weekday: "narrow" })}</small></div>`; }).join("")}</div>
      </section>`;
  }
  function viewSleep() {
    const r = rec(state.me), d = state.date, cur = sleepOn(r, d), stg = sleepTarget(r);
    const h = state.sleepH !== undefined ? state.sleepH : cur ? cur.hours : stg;
    const q = state.sleepQ !== undefined ? state.sleepQ : cur ? cur.quality : null;
    const days = []; for (let i = 6; i >= 0; i--) days.push(addDays(todayStr(), -i));
    return `${logSeg()}
      <section class="card">
        <div class="row between wrap"><h2>🌙 Sleep</h2>${dateNav()}</div>
        <p class="note center" style="margin:0">Hours slept the night before ${fmtDate(d, { weekday: "long", day: "numeric", month: "short" })}</p>
        <div class="row" style="justify-content:center;gap:18px;margin:8px 0">
          <button class="wbtn moonbtn" data-sleeph="-0.5" aria-label="Half an hour less">−</button>
          <p class="center big-num sleepnum">${fmt(h, 1)} <small>hours</small></p>
          <button class="wbtn moonbtn plus" data-sleeph="0.5" aria-label="Half an hour more">+</button></div>
        <div class="chips" style="justify-content:center">${[5, 6, 7, 8, 9].map((x) => `<button class="chip ${h === x ? "on" : ""}" data-sleepset="${x}">${x} h</button>`).join("")}</div>
        <p class="note" style="margin:12px 0 6px">How rested do you feel?</p>
        <div class="moods" style="grid-template-columns:repeat(4,1fr)">${Object.entries(SLEEP_QUALITY).map(([k, e]) => `<button class="mood ${q === k ? "on" : ""}" data-sleepq="${k}">${e}<small>${k}</small></button>`).join("")}</div>
        <button class="btn full" style="margin-top:12px" data-act="saveSleep">${cur ? "Update sleep" : `Save sleep${h >= stg ? ` (+${POINTS.sleep} pts)` : ""}`}</button>
        <p class="note center">Your goal is ${stg} hours or more${stg > 7 ? " (growing bodies need more sleep)" : ""}. Good sleep steadies appetite the next day.</p>
        <div class="minibars">${days.map((x) => { const v = (sleepOn(r, x) || {}).hours || 0; return `<div><div class="mb sleepbar ${v >= stg ? "ok" : ""}" style="height:${Math.min(100, (v / 10) * 100)}%"></div><small>${fmtDate(x, { weekday: "narrow" })}</small></div>`; }).join("")}</div>
      </section>`;
  }
  const JOURNAL_PROMPTS = ["What is one choice you made today that you are proud of?", "Where did you choose comfort over discipline today, and what will you do differently?", "What was in your control today, and what was not?", "What small win can you build on tomorrow?", "What are you grateful for in your body today?", "What would the person you are becoming do tomorrow morning?", "Which Stoic thought helped you today, and how?"];
  function viewJournal() {
    const r = rec(state.me), d = state.date, cur = r.reflections.find((x) => x.date === d);
    const pr = JOURNAL_PROMPTS[((diffDays("2026-01-01", d) % JOURNAL_PROMPTS.length) + JOURNAL_PROMPTS.length) % JOURNAL_PROMPTS.length];
    const mood = state.jMood !== undefined ? state.jMood : cur ? cur.mood : null;
    if (!state.jChecks) state.jChecks = new Set(cur && cur.checks ? cur.checks : []);
    const past = sortByDate(r.reflections).reverse().filter((x) => x.date !== d).slice(0, 30);
    const pastLine = (x) => `${x.mood ? MOODS[x.mood] + " " : ""}${(x.checks || []).map((c) => (JOURNAL_CHECKS.find((j) => j[0] === c) || [, ""])[1]).join(" ")}`;
    return `${logSeg()}
      <section class="card">
        <div class="row between wrap"><h2>📓 Journal</h2>${dateNav()}</div>
        <div class="private">🔒 Private. Only you can see it.</div>
        <p class="bigq">😊 How do you feel?</p>
        <div class="moods">${Object.entries(MOODS).map(([k, e]) => `<button type="button" class="mood ${mood === k ? "on" : ""}" data-mood="${k}" aria-label="${k}">${e}<small>${k}</small></button>`).join("")}</div>
        <p class="bigq">✅ Tap what you did today</p>
        <div class="jchecks">${JOURNAL_CHECKS.map(([id, icon, label]) => `<button type="button" class="jcheck ${state.jChecks.has(id) ? "on" : ""}" data-jc="${id}" aria-pressed="${state.jChecks.has(id)}"><span class="ji">${icon}</span><small>${esc(label)}</small><span class="jtick">✓</span></button>`).join("")}</div>
        <details class="fold" style="margin-top:12px" ${cur && cur.text ? "open" : ""}><summary>✍🏾 Write more (optional)</summary>
          <label>${esc(cur && cur.prompt ? cur.prompt : pr)}<textarea id="jText" rows="4" maxlength="2000" placeholder="Write freely, or leave empty…">${esc(cur ? cur.text || "" : "")}</textarea></label></details>
        <button class="btn full big" id="jSave" style="margin-top:12px">💾 ${cur ? "Update my journal" : `Save my journal (+${POINTS.reflect} pts)`}</button>
      </section>
      ${past.length ? `<details class="card fold"><summary>📚 Past days (${past.length})</summary><div class="list">${past.map((x) => `<details class="item jentry"><summary><b>${fmtDate(x.date, { weekday: "short", day: "numeric", month: "short" })}</b><span class="s"> ${pastLine(x)}</span></summary>${x.text ? `<p>${esc(x.text).replace(/\\n/g, "<br>")}</p>` : ""}</details>`).join("")}</div></details>` : ""}`;
  }

  function caloriesCard(r) {
    const e = energy(r), t = dayTotals(r, state.date), treat = treatOn(r, state.date);
    if (!e) return `<p class="note">🔒 Add your age and height in Me to see your daily calorie target.</p>`;
    const budget = e.target + t.burned + (treat ? TREAT.kcal : 0);
    return `<div class="calrow"><div class="calring">${ring(t.eaten, budget)}</div><div class="note">🔒 Private · target <b>${fmt(e.target)}</b> kcal${t.burned ? ` + ${fmt(t.burned)} burned` : ""}${treat ? ` + ${TREAT.kcal} treat` : ""}</div></div>`;
  }
  // Personal eating plan: one tap logs a whole line (protein plus its vegetables) with the right calories.
  const myPlan = () => PLANS[state.me] || PLANS[(nameOf(state.me) || "").split(" ")[0].toLowerCase()] || null;
  function planCard(r) {
    const plan = myPlan(); if (!plan) return "";
    const d = state.date, todays = r.foods.filter((f) => f.date === d);
    const mealDone = (n) => todays.find((f) => f.meal === "Meal " + n);
    const ea = eating(r, d), prov = ea.provitas, fruit = ea.fruit;
    const kc = (items) => items.reduce((a, [id, n]) => a + (FOOD_BY_ID[id].unit ? Math.round((FOOD_BY_ID[id].kcal * n) / 100) : FOOD_BY_ID[id].kcal * n), 0);
    return `<section class="card plancard"><h2>🍽️ My eating plan</h2><p class="note" style="margin-top:0">Tap what you ate. One choice from each meal. Weigh raw.</p>
      <label class="plantime">🕒 Time eaten<input type="time" id="ptime" value="${nowHM()}" max="${nowHM()}"></label>
      ${[1, 2, 3].map((n) => { const done = mealDone(n); return `<div class="planmeal"><div class="row between"><b>Meal ${n}</b>${done ? `<span class="pill good">✓ Done</span>` : ""}</div>
        ${done ? `<p class="note" style="margin:4px 0 0">${esc(done.planLabel || done.name)}</p>` : `<div class="planopts">${plan[n].map(([label, items], i) => `<button class="planbtn" data-plan="${n}:${i}"><span>${esc(label)}</span><small>${kc(items)} kcal</small></button>`).join("")}</div>`}</div>`; }).join("")}
      <div class="planmeal"><b>Daily allowance</b>
        <div class="planopts two">
          <button class="planbtn" data-allow="provita" ${prov >= plan.provita ? "disabled" : ""}><span>🍘 1 Provita</span><small>${prov} of ${plan.provita} today</small></button>
          <button class="planbtn" data-allow="p_fruit" ${fruit >= plan.fruit ? "disabled" : ""}><span>🍊 1 Fruit</span><small>${fruit} of ${plan.fruit} today</small></button>
        </div></div>
    </section>`;
  }
  const notAllowedNote = (f) => NOT_ALLOWED[f.id] ? `<div class="flagbox" style="margin:0 0 10px">⛔ <b>Not on the eating plan</b><br><small>${esc(NOT_ALLOWED[f.id])}. You can still log it honestly; it will be flagged.</small></div>` : "";
  // The clinic's eating plan rules, shown to everyone.
  function rulesCard() {
    return `<section class="card"><details class="fold"><summary>📜 Eating plan rules (for everyone)</summary>
      <ol class="rules">
        <li>Three meals a day. Never skip a meal. Choose one option from Meal 1, Meal 2 and Meal 3, and keep the whole line together.</li>
        <li>At least 5 hours between meals. Last meal before 9 PM. Enter the <b>time eaten</b> with each meal so the app can check this.</li>
        <li>Weigh proteins and vegetables <b>raw</b>, exactly. Every gram counts.</li>
        <li>Proteins are not mixed: one protein per meal.</li>
        <li>Cheese at most once a day. Feta at most once a week.</li>
        <li>Fruit: 2 a day. Provitas: 5 or 6 a day (1 Ryvita or rice cake = 2 Provitas). Never more than 2 at a time.</li>
        <li>No oil, margarine, butter or fat. Spray and Cook or olive oil spray only.</li>
        <li>Herbs, spices, black pepper, curry and mustard powder, vinegar and garlic are fine. No spice mixes (Aromat, barbecue, chicken or meat spice). 1 teaspoon light soy sauce and 1 level teaspoon lite mayonnaise a day. Limited salt.</li>
        <li>Vegetables: onion at most 30 g a day; tomato at most 70 g a day, no cherry tomatoes; broccoli at most a third of a meal's vegetables.</li>
        <li>Coffee and tea with <b>no milk</b>; after 8 cups of coffee switch to decaf. Herbal tea is fine; no flavoured or fruit tea.</li>
        <li>Up to 1 litre of diet fizzy drinks a day (Tab, soda water, Sprite Zero); Schweppes Lemon Lite at most 1 can. No Diet Coke or Cola Lite. No alcohol.</li>
        <li>At least 2 litres of water a day. 5 sugar free gum sticks a day (no fruit flavours). Sweeteners without sucrose are fine.</li>
      </ol>
      <p class="note"><b>Not allowed:</b> any milk product (except plain fat free yoghurt and the plan cheeses), pork, lamb or mutton, shrimp, processed, smoked or pre cooked meat, meat stock, honey, sugar, ginger, red cayenne pepper, gelatine, yeast, energy drinks, flavoured diet Soda Stream, smoked mozzarella, goat's milk feta, and medicines or tonics with caffeine, fruit flavour or sugar (also amino acids, Barley Green, brewer's yeast, Cellasene, creatine, Fibrogel, Illumana, kelp, Moducure, S Mints, spirulina, vanilla essence, Velamints, Zoute drops).</p>
      <p class="note">The app flags these automatically when they are logged. Flags guide; they cost no points.</p>
    </details></section>`;
  }
  const PLAN_MEALS = (() => {
    const out = [], seen = new Set();
    for (const plan of Object.values(PLANS)) for (const n of [1, 2, 3]) for (const [label, items] of plan[n]) {
      const key = n + ":" + label; if (seen.has(key)) continue; seen.add(key);
      out.push({ id: "plan" + out.length, n, label, items, kcal: items.reduce((a, [fid, q]) => a + (FOOD_BY_ID[fid].unit ? Math.round((FOOD_BY_ID[fid].kcal * q) / 100) : FOOD_BY_ID[fid].kcal * q), 0) });
    }
    return out;
  })();
  // ⭐ My frequent foods: worked out from each person's own entries over time (foods, plan meals and own custom foods logged at least twice).
  function frequentFoods(r) {
    const tally = new Map(), seenPlan = new Set();
    for (const f of r.foods) {
      let key, item;
      if (f.planLabel) { key = "pm:" + f.planLabel; const d = f.date + f.time + f.planLabel; if (seenPlan.has(d)) continue; seenPlan.add(d); const pm = PLAN_MEALS.find((m) => m.label === f.planLabel); if (!pm) continue; item = { type: "plan", id: pm.id, label: `${pm.label} (Meal ${pm.n})`, kcal: pm.kcal }; }
      else if (f.foodId && FOOD_BY_ID[f.foodId]) { const x = FOOD_BY_ID[f.foodId]; key = "f:" + f.foodId + ":" + (f.amount || f.qty || 1); item = { type: "food", id: f.foodId, amount: f.amount, qty: f.qty, label: `${x.name}${f.amount ? ` (${f.amount} ${x.unit})` : f.qty && f.qty !== 1 ? ` × ${f.qty}` : ""}`, kcal: f.kcal }; }
      else if (f.custom) { key = "c:" + f.name.toLowerCase() + ":" + f.kcal; item = { type: "custom", name: f.name, label: `${f.name} (your food)`, kcal: f.kcal }; }
      else continue;
      const t = tally.get(key) || { ...item, key, n: 0, last: "" }; t.n++; if (f.date > t.last) t.last = f.date; tally.set(key, t);
    }
    return [...tally.values()].filter((x) => x.n >= 2).sort((a, b) => b.n - a.n || b.last.localeCompare(a.last)).slice(0, 15);
  }
  // Foods a person typed themselves (not in the list) and logged at least twice become their own list.
  function ownFoods(r) {
    const m = new Map();
    for (const f of r.foods) if (f.custom && f.name) { const k = f.name.trim().toLowerCase(), x = m.get(k) || { name: f.name.trim(), kcal: f.kcal, n: 0, last: "" }; x.n++; if (f.date >= x.last) { x.last = f.date; x.kcal = f.kcal; } m.set(k, x); }
    return [...m.values()].filter((x) => x.n >= 2).sort((a, b) => a.name.localeCompare(b.name));
  }
  function foodCats(r) {
    const fav = frequentFoods(r), list = [];
    if (fav.length) list.push(["frequent", "⭐", "My frequent foods", fav.length]);
    list.push(["plan", "🍽️", "Plan meals", PLAN_MEALS.length]);
    for (const [k, icon, name] of CATEGORIES) list.push([k, icon, name, FOODS.filter((f) => f.group === k && !f.hidden).length]);
    const own = ownFoods(r); if (own.length) list.push(["own", "✏️", "My own foods", own.length]);
    list.push(["other", "➕", "Other: type my own food", ""]);
    if (!state.foodCat || !list.some((x) => x[0] === state.foodCat)) state.foodCat = fav.length ? "frequent" : "plan";
    return list;
  }
  function catOptions(r, k) {
    const opt = (v, t) => `<option value="${v}">${t}</option>`;
    if (k === "frequent") return opt("", "Choose one of your usual foods…") + frequentFoods(r).map((x, i) => opt("fav" + i, `${esc(x.label)} · ${fmt(x.kcal)} kcal · ${x.n}×`)).join("");
    if (k === "own") return opt("", "Choose one of your own foods…") + ownFoods(r).map((x, i) => opt("own" + i, `${esc(x.name)} · ${fmt(x.kcal)} kcal · ${x.n}×`)).join("");
    if (k === "plan") return opt("", "Choose a plan meal…") + [1, 2, 3].map((n) => `<optgroup label="Meal ${n}">${PLAN_MEALS.filter((m) => m.n === n).map((m) => opt(m.id, `${esc(m.label)} · ${m.kcal} kcal`)).join("")}</optgroup>`).join("");
    return opt("", "Choose a food…") + FOODS.filter((f) => f.group === k && !f.hidden).sort((a, b) => (!!NOT_ALLOWED[a.id] - !!NOT_ALLOWED[b.id]) || a.name.localeCompare(b.name)).map((f) => opt(f.id, `${NOT_ALLOWED[f.id] ? "⛔ " : ""}${esc(f.name)} · ${f.unit ? f.kcal + " kcal per 100 " + f.unit : f.serving + ", " + f.kcal + " kcal"}`)).join("");
  }
  // ---------- Food scanner ----------
  // Runs on the phone: the photo never leaves the phone. A general food recogniser (MobileNet, trained on over a million
  // labelled photos) suggests foods from the app's list, and the scanner learns each person's own meals: every time a
  // scanned food is confirmed, its image features (numbers only) are saved with the chosen food, and later scans of
  // similar plates suggest it first.
  const SCAN_MAP = [
    [/mashed potato/, ["pap", "mash", "softpap", "samp"]], [/french loaf|bagel|pretzel|dough|bakery/, ["brownbread", "whitebread", "roll", "wholewheat"]],
    [/banana/, ["banana"]], [/orange/, ["orange", "naartjie"]], [/lemon/, ["lemon"]], [/granny smith|apple/, ["apple"]], [/strawberr/, ["strawberries"]], [/pineapple/, ["pineapple"]],
    [/pomegranate|fig|custard apple/, ["p_fruit", "apple"]], [/broccoli/, ["p_broccoli"]], [/cauliflower/, ["cauliflower"]], [/head cabbage|cabbage/, ["p_cabbage", "kimchi"]],
    [/cucumber/, ["p_cucumber", "gherkins"]], [/zucchini/, ["babymarrow"]], [/bell pepper/, ["greenpepper"]], [/mushroom|agaric|bolete/, ["mushrooms"]],
    [/corn|ear\b/, ["mealie"]], [/squash/, ["butternut", "gemsquash"]], [/artichoke|cardoon/, ["p_veg"]], [/pizza/, ["pizza"]], [/cheeseburger/, ["cheeseburger", "burger"]],
    [/hotdog|hot dog/, ["worsroll", "vienna"]], [/burrito/, ["wrap"]], [/meat loaf/, ["mince", "beefstew", "goulash"]], [/potpie/, ["pie"]], [/carbonara/, ["pasta", "spagbol"]],
    [/consomme|hot pot|soup bowl/, ["beefstew", "chickenstew", "goulash"]], [/guacamole/, ["avocado"]], [/ice cream|ice lolly|trifle/, ["icecream"]], [/chocolate sauce/, ["chocslab"]],
    [/espresso|cup|coffee mug/, ["coffeeblack", "rooibos", "greenteaplain"]], [/eggnog/, ["milkfull"]], [/red wine|wine bottle/, ["wine"]], [/beer/, ["beer"]],
    [/pop bottle|water bottle|water jug/, ["sodawater", "spritezero"]], [/plate|tray|dining table|wok|frying pan/, []],
  ];
  let scanModel = null, scanMem = null;
  const loadScript = (src) => new Promise((ok, no) => { if (document.querySelector(`script[src="${src}"]`)) return ok(); const el = document.createElement("script"); el.src = src; el.onload = ok; el.onerror = () => no(new Error("Could not load " + src)); document.head.appendChild(el); });
  async function getScanner() {
    if (window.__scanModel) return window.__scanModel; // test hook
    if (scanModel) return scanModel;
    await loadScript("/vendor/tf.min.js"); await loadScript("/vendor/mobilenet.min.js");
    try { scanModel = await window.mobilenet.load({ version: 2, alpha: 1.0 }); } catch { scanModel = await window.mobilenet.load({ version: 1, alpha: 1.0 }); }
    return scanModel;
  }
  const vecToB64 = (v) => { let n = 0; for (const x of v) n += x * x; n = Math.sqrt(n) || 1; const q = new Int8Array(v.length); v.forEach((x, i) => { q[i] = Math.max(-127, Math.min(127, Math.round((x / n) * 127 * 4))); }); let s = ""; q.forEach((b) => { s += String.fromCharCode(b & 255); }); return btoa(s); };
  const b64ToVec = (b) => { const s = atob(b), v = new Float32Array(s.length); for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); v[i] = c > 127 ? c - 256 : c; } return v; };
  const cosine = (a, b) => { let d = 0, x = 0, y = 0; for (let i = 0; i < Math.min(a.length, b.length); i++) { d += a[i] * b[i]; x += a[i] * a[i]; y += b[i] * b[i]; } return d / (Math.sqrt(x * y) || 1); };
  async function scanImage(img) {
    const m = await getScanner();
    const [preds, emb] = await Promise.all([m.classify(img, 6), Promise.resolve(m.infer(img, true))]);
    const vec = Array.from(await emb.data()); if (emb.dispose) emb.dispose();
    if (!scanMem) { try { scanMem = (await api("scan/memory")).items.map((x) => ({ label: x.label, v: b64ToVec(x.vec) })); } catch { scanMem = []; } }
    const q = b64ToVec(vecToB64(vec));
    // Personal matches: the best score per food from this person's own confirmed scans.
    const best = new Map(); for (const it of scanMem) { const k = it.label.type + ":" + (it.label.id || it.label.name); const sc = cosine(q, it.v); if (!best.has(k) || best.get(k).sc < sc) best.set(k, { sc, label: it.label }); }
    const mine = [...best.values()].filter((x) => x.sc >= 0.72).sort((a, b) => b.sc - a.sc).slice(0, 3);
    const general = []; for (const p of preds) for (const [re, ids] of SCAN_MAP) if (re.test(p.className.toLowerCase())) ids.forEach((id) => { if (FOOD_BY_ID[id] && !general.some((g) => g.id === id)) general.push({ id, why: p.className.split(",")[0], p: p.probability }); });
    const mineIds = new Set(mine.filter((x) => x.label.type === "food").map((x) => x.label.id));
    return { vec, mine, general: general.filter((g) => !mineIds.has(g.id)).slice(0, 5), seen: preds.slice(0, 3).map((p) => p.className.split(",")[0]) };
  }
  function scanModal() {
    const m = modal(`<h2>📷 Scan my food</h2><p class="note" style="margin-top:0">Take a photo of your plate. The photo stays on your phone; only the food you choose is remembered, so the scanner learns your meals.</p>
      <label class="btn full center" style="cursor:pointer">📸 Take or choose a photo<input type="file" id="scanFile" accept="image/*" capture="environment" hidden></label>
      <div id="scanOut"></div><button class="btn ghost full" data-closescan style="margin-top:10px">Close</button>`);
    $("[data-closescan]", m).addEventListener("click", closeModal);
    $("#scanFile", m).addEventListener("change", async (e) => {
      const f = e.target.files[0]; if (!f) return; const out = $("#scanOut", m);
      const url = URL.createObjectURL(f); out.innerHTML = `<img src="${url}" class="scanimg" alt=""><p class="note">🔎 Looking at your food… (the first scan downloads the recogniser, about 15 MB, once)</p>`;
      const img = $(".scanimg", out); await new Promise((ok) => { if (img.complete) ok(); else img.onload = ok; });
      try {
        const res = await scanImage(img); state.scanVec = res.vec;
        const btn = (label, sub, data) => `<button class="planbtn" ${data}><span>${label}</span><small>${sub}</small></button>`;
        const mineHtml = res.mine.map((x) => { const l = x.label; const name = l.type === "food" ? FOOD_BY_ID[l.id]?.name || l.name : l.name; return btn(`⭐ ${esc(name)}`, `you logged this before · ${Math.round(x.sc * 100)}% match`, `data-scanpick='${esc(JSON.stringify(l))}'`); }).join("");
        const genHtml = res.general.map((g) => btn(esc(FOOD_BY_ID[g.id].name), `looks like ${esc(g.why)}`, `data-scanpick='${esc(JSON.stringify({ type: "food", id: g.id, name: FOOD_BY_ID[g.id].name }))}'`)).join("");
        out.innerHTML = `<img src="${url}" class="scanimg" alt="">${mineHtml || genHtml ? `<p><b>Is it one of these?</b></p><div class="planopts scanopts">${mineHtml}${genHtml}</div>` : `<p class="note">I could not recognise this yet${res.seen.length ? ` (it looks like: ${esc(res.seen.join(", "))})` : ""}.</p>`}
          <p class="note">Not listed? Close this and choose the food from a category or search: I will remember it for your next scan of this meal.</p>`;
        $$("[data-scanpick]", out).forEach((b) => b.addEventListener("click", () => { closeModal(); applyScanPick(JSON.parse(b.dataset.scanpick)); }));
      } catch (err) { out.innerHTML = `<p class="note">⚠️ The scanner needs an internet connection the first time it is used. ${esc(err.message || "")}</p>`; }
    });
  }
  function applyScanPick(l) {
    const sel = $("#fpicklist");
    if (l.type === "plan") { state.foodCat = "plan"; render(); const s2 = $("#fpicklist"); s2.value = l.id; s2.dispatchEvent(new Event("change")); }
    else if (l.type === "custom") { $("#fcustom").classList.remove("hidden"); $("#fname").value = l.name; $("#fkcal").value = l.kcal; $("#fadd").disabled = false; }
    else { const f = FOOD_BY_ID[l.id]; if (!f) return; state.foodCat = f.group; render(); const s2 = $("#fpicklist"); s2.value = f.id; s2.dispatchEvent(new Event("change")); if (l.amount && $("#famt")) { $("#famt").value = l.amount; $("#famt").dispatchEvent(new Event("input")); } }
    state.scanVec = state.scanVec || null; $("#fadd").scrollIntoView({ behavior: "smooth", block: "center" });
    if (sel) toast("Check the amount and tap Add. The scanner will remember this meal.");
  }
  // After a scanned food is added, remember it for this person.
  async function learnScan(label) {
    const v = state.scanVec; if (!v) return; state.scanVec = null;
    try { await api("scan/learn", { method: "POST", body: { label, vec: vecToB64(v) } }); if (scanMem) scanMem.push({ label, v: b64ToVec(vecToB64(v)) }); } catch {}
  }
  const FOOD_GROUPS = ["Protein", "Vegetables", "Fruit", "Starches", "Dairy", "Drinks", "Snacks", "Takeaways", "Extras", "Supplements", "Medicines"];
  function flagBanner(r) {
    const f = eating(r, state.date).flags; if (!f.length) return "";
    return `<div class="flagbox">${f.map((x) => `<div>🚩 <b>${esc(x.label)}</b><br><small>${esc(x.how)}</small></div>`).join("")}</div>`;
  }
  const SLOT_OF = { Breakfast: 1, "Meal 1": 1, Lunch: 2, "Meal 2": 2, Dinner: 3, "Meal 3": 3 };
  const SLOT_NAME = { 1: "🌅 Breakfast", 2: "☀️ Lunch", 3: "🌙 Dinner", 0: "🍎 Snacks, drinks and medicines" };
  function mealsStrip(r) {
    const items = r.foods.filter((f) => f.date === state.date), ea = eating(r, state.date);
    const slot = (n) => items.filter((f) => (SLOT_OF[f.meal] || 0) === n);
    return `<div class="mealstrip">${[1, 2, 3].map((n) => { const x = slot(n), t = x.map((f) => f.time).filter(Boolean).sort()[0];
      return `<div class="mealtile ${x.length ? "done" : ""}"><b>${x.length ? "✓" : n}</b><span>${["", "Breakfast", "Lunch", "Dinner"][n]}</span><small>${x.length ? `${t ? "🕒 " + t + " · " : ""}${fmt(x.reduce((a, f) => a + f.kcal, 0))} kcal` : "not yet"}</small></div>`; }).join("")}
      <div class="mealtile snack"><b>${slot(0).length}</b><span>Snacks</span><small>🍊 ${ea.fruit} fruit · 🍘 ${ea.provitas}</small></div></div>`;
  }
  function viewFood() {
    const r = rec(state.me), meal = state.foodMeal || guessMeal();
    return `${logSeg()}
      <section class="card">
        <div class="row between wrap"><h2>🍽️ Today's food</h2>${dateNav()}</div>
        ${caloriesCard(r)}
        ${mealsStrip(r)}
        ${flagBanner(r)}
      </section>
      <section class="card">
        <h2>➕ Add food</h2>
        <form class="form" id="foodForm" autocomplete="off">
          <label>1. Which meal?</label>
          <div class="seg mealseg">${["Breakfast", "Lunch", "Dinner", "Snack"].map((m) => `<button type="button" class="${m === meal ? "on" : ""}" data-meal="${m}">${{ Breakfast: "🌅", Lunch: "☀️", Dinner: "🌙", Snack: "🍎" }[m]} ${m}</button>`).join("")}</div>
          <input type="hidden" id="meal" value="${meal}">
          <label>2. Time eaten<input type="time" id="ftime" value="${nowHM()}" max="${nowHM()}" required></label>
          <button type="button" class="btn ghost full scanbtn" data-scan>📷 Scan my food: the app suggests what it is</button>
          <label>3. Pick a category</label>
          <div class="catgrid">${foodCats(r).map(([k, icon, name, n]) => `<button type="button" class="catbtn ${k === state.foodCat ? "on" : ""}" data-fcat="${k}"><span>${icon}</span><b>${esc(name)}</b><small>${n}</small></button>`).join("")}</div>
          <label id="step4" class="${state.foodCat === "other" ? "hidden" : ""}">4. Choose the food<select id="fpicklist">${catOptions(r, state.foodCat)}</select></label>
          <div id="otherPanel" class="${state.foodCat === "other" ? "" : "hidden"}">
            <label>4. Type your food<input id="fsearch" placeholder="e.g. chicken stew, kimchi, mogodu" maxlength="80" autocomplete="off"></label>
            <div id="fresults" class="fresults"></div>
            <p class="note">Foods you type and log twice are added to <b>✏️ My own foods</b> automatically.</p>
          </div>
          <div id="fpicked" class="fpicked hidden"></div>
          <div id="fcustom" class="hidden"><div class="grid2"><label>Food name<input id="fname" maxlength="80"></label><label>Calories<input id="fkcal" type="number" inputmode="numeric" min="0" max="5000"></label></div>
            <p class="note">Calories: check the label, or use a similar food from the list as a guide. Your own foods are marked as your estimate.</p></div>
          <button class="btn full" id="fadd" disabled>Add to ${esc(meal)}</button>
        </form>
      </section>
      <section class="card">
        <h2>📋 What I ate today</h2>
        ${foodList(r)}
      </section>
      <button class="btn ghost full" data-go="recipes" style="margin-bottom:12px">🥗 Recipes that follow the plan</button>
      ${rulesCard()}`;
  }
  function guessMeal() { const h = saHour(); return h < 11 ? "Breakfast" : h < 15 ? "Lunch" : h < 21 ? "Dinner" : "Snack"; }

  function viewMove() {
    const r = rec(state.me), w = latestWeight(r), st = daySteps(r, state.date), km = dayKm(r, state.date), goal = stepGoal();
    const phone = (r.steps || []).find((x) => x.date === state.date);
    return `${logSeg()}
      <section class="card">
        <div class="row between wrap"><h2>👟 Steps and distance</h2>${dateNav()}</div>
        <div class="movetotals"><div><b>${fmt(st)}</b><small>steps</small></div><div><b>${fmt(km, 1)}</b><small>km</small></div><div><b>${fmt(r.exercises.filter((x) => x.date === state.date).reduce((a, x) => a + x.minutes, 0))}</b><small>active min</small></div></div>
        <div class="bar" style="margin:8px 0 4px"><i style="width:${Math.min(100, (st / goal) * 100)}%"></i></div>
        <p class="note" style="margin-top:0">${st >= goal ? `Step goal reached: your Move points (+${POINTS.exercise}) are earned 🎉` : `${fmt(goal - st)} steps to your goal of ${fmt(goal)}. Reaching it, or ${MOVE_MINUTES} active minutes, earns Move (+${POINTS.exercise}).`}</p>
        <form class="form" id="stepsForm"><label>Steps today from your phone or watch (Health / Google Fit)<div class="row"><input id="stepsIn" type="text" inputmode="numeric" data-int autocomplete="off" placeholder="e.g. 6420" value="${phone ? phone.steps : ""}"><button class="btn">Save</button></div></label></form>
      </section>
      <section class="card">
        <h2>⚡ Quick log</h2><p class="note" style="margin-top:0">One tap. Calories and steps are worked out for you.</p>
        <div class="quickmove">${QUICK_MOVES.map((q, i) => `<button class="planbtn" data-quick="${i}"><span>${q[0]}</span></button>`).join("")}</div>
      </section>
      <section class="card">
        <div class="row between wrap"><h2>Log an activity</h2></div>
        <form class="form" id="exForm">
          <label>Activity<select id="act">${ACT_GROUPS.map((g) => `<optgroup label="${g === "Distance" ? "Distance (5 km, 10 km, 20 km, 30 km…)" : g}">${ACTIVITIES.map((x, i) => x[4] === g ? `<option value="${i}">${esc(x[0])}</option>` : "").join("")}</optgroup>`).join("")}<option value="custom">Other (enter calories)</option></select></label>
          <div class="grid2" id="floorsWrap" style="display:none">
            <label>Up to floor<input id="floors" type="number" inputmode="numeric" min="1" max="100" value="15"></label>
            <label>How many times?<input id="rounds" type="number" inputmode="numeric" min="1" max="50" value="1"></label>
          </div>
          <label id="customWrap" style="display:none">Activity name<input id="actName" maxlength="80"></label>
          <div class="grid2">
            <label>Minutes<input id="mins" type="number" inputmode="numeric" min="1" max="600" value="30" required></label>
            <label>Calories burned<input id="exkcal" type="number" inputmode="numeric" min="0" max="5000" required></label>
            <label id="kmWrap">Distance (km)<input id="exkm" type="text" inputmode="decimal" autocomplete="off" min="0" max="300" step="0.1"></label>
            <label id="stWrap">Steps<input id="exsteps" type="text" inputmode="numeric" data-int autocomplete="off"></label>
          </div>
          <p class="note" id="exNote">Calories, distance and steps are estimated${w ? ` for your weight of ${fmt(w, 1)} kg` : ""}; change them if your phone or watch shows exact numbers.</p>
          <button class="btn full">Add to ${shortDate(state.date)}</button>
        </form>
        ${exList(r)}
      </section>`;
  }

  const ALL_MODES = { week: "This Week", month: "This Challenge Month", overall: "Overall" };
  const prizes = () => ({ ...DEFAULT_CONFIG.prizes, ...((state.config && state.config.prizes) || {}) });
  const rand = (n) => "R" + Math.round(n).toLocaleString("en-ZA").replace(/[,\u00a0]/g, " ");
  const prizeStrip = () => `<div class="prizes"><div class="prize big"><span>🏆</span><div><b>${rand(prizes().bl)}</b><small>Grand prize · Biggest Loser</small></div></div><div class="prize"><span>⭐</span><div><b>${rand(prizes().effort)}</b><small>Greatest effort · Most Consistent</small></div></div></div>`;
  const isSealed = () => !(state.finale && state.finale.revealed);
  const finaleLabel = () => { const at = state.finale && state.finale.revealAt ? new Date(state.finale.revealAt) : new Date(finaleTime(settings(), state.config)); return at.toLocaleString("en-ZA", { weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Johannesburg" }); };
  // While sealed, only this week's and this month's effort can be seen; the overall standings wait for the Grand Finale.
  const MODES = new Proxy({}, { get: (_, k) => ALL_MODES[k], ownKeys: () => (isSealed() ? ["week", "month"] : ["week", "month", "overall"]), getOwnPropertyDescriptor: (_, k) => ({ enumerable: true, configurable: true, value: ALL_MODES[k] }) });
  function modePts(id, mode = state.boardMode) {
    const s = score(id);
    if (mode === "week") return s.weekPts[currentWeek().n] || 0;
    if (mode === "month") { const m = challengeMonths().find((x) => x.from <= todayStr() && todayStr() <= x.to) || challengeMonths()[0]; return (m && s.monthPts[m.key]) || 0; }
    return s.total;
  }
  function ranking(mode = "overall") {
    return MEMBERS.map((m) => ({ ...score(m.id), pts: modePts(m.id, mode) })).sort((a, b) => b.pts - a.pts || b.checkins - a.checkins);
  }

  function dotsFor(id) {
    const labels = { ok: "checked in and exercised", part: "checked in", hol: "public holiday", miss: "missed", today: "today, not yet", future: "" };
    return `<div class="dots">${score(id).days14.map((x) => `<span class="dot ${x.c === "today" ? "" : x.c}" title="${shortDate(x.d)}: ${labels[x.c]}"></span>`).join("")}</div>`;
  }

  function viewBoard() { return viewBoardInner() + cheerCard(); }
  function viewBoardInner() {
    if (isSealed() && state.boardMode === "overall") state.boardMode = "week";
    const s = settings(), cd = challengeDay(), mode = state.boardMode, list = ranking(mode), overall = ranking("overall");
    const blId = R().biggestLoser, bl = blId ? score(blId) : null, leader = overall[0];
    const ag = state.aggregates || { lostKg: 0, since2024: 0 };
    const anyData = overall.some((x) => x.checkins || x.total);
    const banner = !isSealed() ? finaleCeremony() : `<section class="card winner sealed"><div class="crown">🔒</div>
          <h2>The winners are sealed</h2>
          ${prizeStrip()}
          <p>We find out together at the <b>Grand Finale</b>:<br>${esc(finaleLabel())}</p>
          <p class="note">Two winners: the <b>Biggest Loser</b> (highest percentage of starting weight lost at the official weigh ins) and the <b>Most Consistent Participant</b> award for the greatest effort (best healthy habits). Until then, only this week's and this month's effort are shown.</p>
          <p class="muted">Crew total this challenge: <b>${fmt(ag.lostKg, 1)} kg</b> lost 🎉${ag.since2024 > 0 ? ` · since November 2024: <b style="color:var(--leaf)">${fmt(ag.since2024, 1)} kg</b>` : ""}</p></section>`;
    const bannerOld = cd.phase === "after" && !anyData
      ? `<section class="card winner"><div class="crown">🏁</div><h2>Challenge complete</h2><p class="muted">No results were recorded.</p></section>`
      : cd.phase === "after"
      ? `<section class="card winner"><div class="final-label">Closing ceremony</div>
          <div class="ceremony">
            <div><img class="award-img sm" src="${IMG.consistent}" alt="Most Consistent Participant award"><b>Most Consistent Participant</b><br>${winnerChips(consistentLeaders())}</div>
            <div><img class="award-img sm" src="${IMG.resilience}" alt="Resilience Challenge award"><b>Resilience Challenge Award</b><br>${winnerChips(resilienceLeaders())}</div>
          </div>
          <img class="award-img" src="${IMG.bl_trophy}" alt="Biggest Loser Award trophy">
          <h2>Biggest Loser: ${bl ? `${avatar(blId, "sm")} ${esc(nameOf(blId))}` : "to be confirmed"}</h2>
          ${bl ? `<p>${fmt(bl.total)} points${bl.pct !== null ? ` · ${fmt(bl.pct, 1)}% of body weight lost` : ""}</p>` : ""}
          <p class="muted">The crew lost <b>${fmt(ag.lostKg, 1)} kg</b> together.</p>
          <button class="btn small" data-go="awards">See every award</button></section>`
      : `<section class="card winner"><div class="crown">🏆</div>
          <h2>${leader && leader.total > 0 ? `${avatar(leader.id, "sm")} ${esc(nameOf(leader.id))} leads the pack` : "The race is on"}</h2>
          <p>${cd.phase === "on" ? `Day ${cd.day} of ${cd.total} · ${cd.left} days left` : `Starts ${fmtDate(s.start)}`}</p>
          <p class="muted">Crew total this challenge: <b>${fmt(ag.lostKg, 1)} kg</b> lost 🎉</p>
          ${ag.since2024 > 0 ? `<p class="muted">Since 23 November 2024 the crew has lost <b style="color:var(--leaf)">${fmt(ag.since2024, 1)} kg</b> together.</p>` : ""}</section>`;

    return `${boardScreen()}
      ${banner}
      <section class="card" id="standings">
        <div class="row between wrap"><h2>Leaderboard</h2>
          <div class="seg">${Object.entries(MODES).map(([k, l]) => `<button class="${k === mode ? "on" : ""}" data-mode="${k}">${l}</button>`).join("")}</div></div>
        
        <div class="lb">${list.map((x, i) => `
          <div class="lbrow ${i === 0 ? "first" : ""} ${x.id === state.me ? "mine" : ""}">
            <div class="rank">${["🥇", "🥈", "🥉"][i] || i + 1}</div>
            ${avatar(x.id, "lg")}
            <div>
              <div class="row wrap" style="gap:6px"><b>${esc(nameOf(x.id))}</b>${x.streak >= 3 ? `<span class="pill good">🔥 ${x.streak}</span>` : ""}${x.habits ? `<span class="pill">Habits league</span>` : x.minor ? `<span class="pill">Junior plan</span>` : ""}${x.tooFast ? `<span class="pill warn">Slow down</span>` : ""}${x.treats && x.treats.earned ? `<span class="pill treatpill">🍦 ${x.treats.earned}</span>` : ""}${x.missed ? `<span class="pill warn">${x.missed} missed</span>` : ""}</div>
              <small>${esc(AVATARS[meta(x.id).avatar]?.name || "")} · ${x.checkins} check in${x.checkins === 1 ? "" : "s"}${meta(x.id).group ? " · " + esc(meta(x.id).group) : ""}${x.lostKg !== null && x.sw ? ` · <span class="mineonly">🔒 ${fmt(x.lostKg, 1)} kg, ${x.goal !== null ? fmt(x.goal) + "% to goal" : "no goal"}</span>` : ""}</small>
              ${dotsFor(x.id)}
            </div>
            <div class="score">${x.pts === null || x.pts === undefined ? "🔒" : fmt(x.pts)}<small>pts</small></div>
          </div>`).join("") || `<div class="empty">No approved participants yet.</div>`}</div>
        <div class="legend"><span><i class="dot ok"></i>Checked in + exercised</span><span><i class="dot part"></i>Checked in</span><span><i class="dot miss"></i>Missed (${POINTS.missed})</span><span><i class="dot hol"></i>Holiday rest</span></div>
      </section>

      <details class="card fold" open><summary>ℹ️ How points are awarded</summary>${pointsGuide()}</details>
      ${holidayCard()}`;
  }

  function finaleCeremony() {
    const r = R(), step = state.revealStep || 0;
    const stage = (n, img, title, body) => step >= n
      ? `<div class="stage shown"><img class="award-img" src="${img}" alt="${esc(title)}"><h2>${title}</h2>${body}</div>`
      : `<div class="stage hiddenstage"><div class="mystery">?</div><h3>${title}</h3></div>`;
    const podium = (rows, unit) => `<div class="podium">${rows.map((x, i) => `<div class="pod p${i + 1}">${avatar(x.id, i === 0 ? "xl" : "lg")}<b>${["🥇", "🥈", "🥉"][i]} ${esc(nameOf(x.id).split(" ")[0])}</b><small>${unit(x)}</small></div>`).join("")}</div>`;
    return `<section class="card winner finale"><div class="final-label">🏆 Grand Finale</div>
      ${stage(1, IMG.resilience, "Resilience Challenge Award", `<p>Most exercise minutes</p>${winnerChips(r.resilience)}`)}
      ${stage(2, IMG.consistent, "Most Consistent Participant · Greatest Effort", `<p class="prizetag">⭐ ${rand(prizes().effort)} prize</p><p>The best healthy habits: movement, steps, water, sleep, journal and check ins</p>${podium(r.effortTop || [], (x) => fmt(x.pts) + " effort pts")}`)}
      ${stage(3, IMG.bl_trophy, "Biggest Loser Award", `<p class="prizetag big">🏆 ${rand(prizes().bl)} grand prize</p><p>Highest percentage of starting weight lost at the official weigh ins</p>${podium(r.blTop || [], (x) => fmt(x.pct, 1) + "% lost")}
        <div class="grid2" style="margin-top:10px"><img class="award-img" src="${IMG.bl_medal_gold}" alt="Biggest Loser gold medal"><img class="award-img" src="${IMG.bl_plaque}" alt="Biggest Loser plaque"></div>`)}
      ${step < 3 ? `<button class="btn full" data-act="revealNext">${step === 0 ? "🎬 Start the reveal" : "Reveal the next award ▶"}</button>` : `<p class="muted">The crew lost <b>${fmt((state.aggregates || {}).lostKg || 0, 1)} kg</b> together. Congratulations, everyone! 🎉</p>`}
    </section>`;
  }

  // Full weigh in records: administrators only (health information).
  function recordsCard() {
    const s = settings(), today = todayStr();
    const cols = [s.start, ...weighDays().filter((d) => d <= today)];
    const nxt = nextWeighDay(addDays(today, isWeighDay(today) ? 1 : 0));
    const cell = (r, d, i) => {
      const w = i === 0 ? startWeight(r) : (r.weights.find((x) => x.date === d) || {}).kg;
      if (!w) return `<td class="muted">–</td>`;
      const prev = i === 0 ? null : i === 1 ? startWeight(r) : weightOn(r, cols[i - 1]);
      const ch = prev ? w - prev : 0;
      return `<td><b>${fmt(w, 1)}</b>${prev && Math.abs(ch) >= 0.05 ? `<br><small style="color:${ch < 0 ? "var(--leaf)" : "var(--danger)"}">${ch < 0 ? "▼" : "▲"} ${fmt(Math.abs(ch), 1)}</small>` : ""}</td>`;
    };
    return `<section class="card">
      <h2>⚖️ Weigh in records <span class="pill warn">🔒 Confidential</span></h2>
      <p class="note">Official weigh ins happen every other Saturday.${nxt ? ` Next one: <b>${fmtDate(nxt, { weekday: "long", day: "numeric", month: "long" })}</b>.` : ""} Viewing this page is recorded in the audit log.</p>
      <div style="overflow-x:auto"><table class="records">
        <tr><th>Name</th><th>23 Nov 2024</th>${cols.map((d, i) => `<th>${i === 0 ? "Start<br><small>14 Nov 2026</small>" : shortDate(d)}</th>`).join("")}<th>Lost in<br>challenge</th><th>Lost since<br>2024</th><th>Goal</th><th>BMI<br><small>now</small></th></tr>
        ${MEMBERS.map((m) => { const r = rec(m.id), sc = score(m.id), bw = r.profile.beforeWeight, cur = latestWeight(r);
          return `<tr><td><b>${esc(nameOf(m.id))}</b></td><td class="muted">${bw ? fmt(bw, 1) : "–"}</td>${cols.map((d, i) => cell(r, d, i)).join("")}<td><b>${sc.sw ? fmt(sc.lostKg, 1) + " kg" : "–"}</b></td><td><b style="color:var(--leaf)">${bw && cur ? fmt(bw - cur, 1) + " kg" : "–"}</b></td><td>${r.profile.goalWeight ? fmt(r.profile.goalWeight, 1) : "–"}</td><td>${(() => { const b = bmi(r, cur); return b ? `<b>${fmt(b.value, 1)}</b><br><small class="muted">${b.cat || "under 18"}</small>` : `<small class="muted">add height</small>`; })()}</td></tr>`; }).join("")}
      </table></div>
      <details class="fold" style="margin-top:10px"><summary>📏 Heights for BMI</summary>
        <form class="form" id="heightForm"><div class="grid2">${MEMBERS.map((m) => `<label>${esc(nameOf(m.id))} (cm)<input type="text" inputmode="numeric" data-int data-hcm="${m.id}" value="${rec(m.id).profile.heightCm || ""}" placeholder="e.g. 165"></label>`).join("")}</div>
          <button class="btn full">Save heights</button><p class="note">Participants can also enter their own height in My profile.</p></form></details>
      <h3 style="margin-top:14px">✍🏾 Record the crew's weights</h3>
      <form class="form" id="groupForm">
        <label>Weigh in<select id="gDate">
          <option value="start">Starting weights (14 Nov 2026)</option>
          ${weighDays().map((d) => `<option value="${d}" ${d === lastWeighDay(today) ? "selected" : ""} ${d > today ? "disabled" : ""}>${fmtDate(d, { weekday: "short", day: "numeric", month: "short" })}${d > today ? " (upcoming)" : ""}</option>`).join("")}
        </select></label>
        <div class="gwlist">${MEMBERS.map((m) => `<div class="gwrow"><b>${esc(nameOf(m.id))}</b><label>kg<input type="text" inputmode="decimal" autocomplete="off" data-gw="${m.id}"></label><label>waist cm<input type="text" inputmode="decimal" autocomplete="off" data-gwaist="${m.id}"></label><label>hips cm<input type="text" inputmode="decimal" autocomplete="off" data-ghip="${m.id}"></label></div>`).join("")}</div>
        <button class="btn full">Save weights</button>
        <p class="note" style="margin:0">Leave a box empty to skip someone. Saving again for the same date replaces the earlier weight.</p>
      </form>
    </section>
    ${weighDayResults()}`;
  }

  // Weigh in day mode: results for the chosen weigh in, awards presented, and a summary to share (no kilograms in the shared text).
  function weighDayResults() {
    const t = todayStr(), d = state.weighShow && state.weighShow !== "start" ? state.weighShow : lastWeighDay(t); if (!d) return "";
    const rows = MEMBERS.map((m) => { const r = rec(m.id), cur = r.weights.find((x) => x.verified && x.date === d); if (!cur) return null; const res = weighResult(r, d), sw = startWeight(r); return { m, r, cur, res, pct: sw ? ((sw - cur.kg) / sw) * 100 : null }; }).filter(Boolean);
    if (!rows.length) return "";
    const wk = R().weeks.filter((w) => w.done && w.presentOn === d), mo = R().months.filter((x) => x.done && x.presentOn === d);
    const name = (id) => nameOf(id).split(" ")[0];
    const lines = [`⚖️ Stoic by Choice · weigh in ${fmtDate(d, { weekday: "long", day: "numeric", month: "long" })}`, "",
      ...rows.map((x) => `${name(x.m.id)}: ${x.res ? (x.res.lost < 0 ? "📈 gained" : x.res.lost === 0 ? "➖ no change" : x.res.pts > 3 ? "🏅 minimum met" : "📉 lost") + ` (${x.res.pts > 0 ? "+" : ""}${x.res.pts} + 10 pts)` : "✅ weighed in (+10 pts)"}${x.pct !== null ? ` · ${x.pct.toFixed(1).replace(".", ",")}% since start` : ""}`),
      ...(wk.length || mo.length ? ["", "🏆 Awards presented today:", ...wk.map((w) => `Week ${w.n}: ${w.winners.map(name).join(" & ") || "–"}`), ...mo.map((x) => `${x.label.split(" ·")[0]}: ${x.winners.map(name).join(" & ") || "–"}`)] : []),
      "", "Keep going, team. 💪🏾"];
    state.weighSummary = lines.join("\n");
    return `<section class="card printable"><h2>📋 Weigh in results · ${fmtDate(d, { weekday: "short", day: "numeric", month: "short" })}</h2>
      <div style="overflow-x:auto"><table class="records"><tr><th>Name</th><th>Before</th><th>Now</th><th>Change</th><th>Result</th><th>% since start</th><th>Waist</th></tr>
      ${rows.map((x) => { const prev = x.r.weights.filter((w) => w.verified && w.date < d).sort((a, b) => a.date.localeCompare(b.date)).pop(); const ch = prev ? x.cur.kg - prev.kg : null; const ms = (x.r.measures || []).find((m) => m.date === d);
        return `<tr><td><b>${esc(nameOf(x.m.id))}</b></td><td>${prev ? fmt(prev.kg, 1) : "–"}</td><td><b>${fmt(x.cur.kg, 1)}</b></td><td style="color:${ch === null ? "inherit" : ch <= 0 ? "var(--leaf)" : "var(--danger)"}">${ch === null ? "–" : (ch > 0 ? "▲ " : "▼ ") + fmt(Math.abs(ch), 1)}</td><td>${x.res ? `${x.res.pts > 0 ? "+" : ""}${x.res.pts}` : "–"} <small class="muted">+10</small></td><td>${x.pct !== null ? fmt(x.pct, 1) + "%" : "–"}</td><td>${ms && ms.waistCm ? fmt(ms.waistCm, 1) : "–"}</td></tr>`; }).join("")}
      </table></div>
      ${wk.length || mo.length ? `<p><b>🏆 Presented today:</b> ${[...wk.map((w) => `Week ${w.n}: ${winnerChips(w.winners)}`), ...mo.map((x) => `${esc(x.label.split(" ·")[0])}: ${winnerChips(x.winners)}`)].join(" · ")}</p>` : `<p class="note">No awards are due at this weigh in.</p>`}
      <div class="grid2 noprint"><button class="btn" data-wsum>📋 Copy WhatsApp summary</button><button class="btn ghost" data-print>🖨️ Print</button></div>
      <p class="note">The WhatsApp summary shares results, points and percentages only, never anyone's kilograms.</p></section>`;
  }

  // Participant details (admin): everything about each person in one place.
  function admProfiles() {
    const buddies = (state.config && state.config.buddies) || {};
    return `<section class="card"><h2>📝 Participant details</h2><p class="note" style="margin-top:0">Private health information. Tap a name to view or edit. Participants can also edit their own profile.</p></section>
      ${MEMBERS.map((m) => { const r = rec(m.id), p = r.profile, ms = lastMeasure(r), b = bmi(r, latestWeight(r));
        return `<details class="card fold"><summary>${avatar(m.id, "sm")} <b>${esc(nameOf(m.id))}</b> <small class="muted">${p.age ? p.age + " yrs" : p.junior ? "under 18" : "age not set"}${isMinor(r) ? " · Junior plan" : ""}${b ? " · BMI " + fmt(b.value, 1) : ""}</small></summary>
          <form class="form" data-profform="${m.id}">
            <div class="grid2">
              <label>Age<input name="age" type="number" inputmode="numeric" value="${p.age ?? ""}"></label>
              <label>Sex<select name="sex"><option value="f" ${p.sex !== "m" ? "selected" : ""}>Female</option><option value="m" ${p.sex === "m" ? "selected" : ""}>Male</option></select></label>
              <label>Height (cm)<input name="heightCm" type="text" inputmode="numeric" data-int value="${p.heightCm ?? ""}"></label>
              <label>Goal weight (kg)<input name="goalWeight" type="text" inputmode="decimal" value="${p.goalWeight ?? ""}"></label>
              <label>Starting weight (kg)<input name="startWeight" type="text" inputmode="decimal" value="${p.startWeight ?? ""}"></label>
              <label>Nov 2024 weight (kg)<input name="beforeWeight" type="text" inputmode="decimal" value="${p.beforeWeight ?? ""}"></label>
              <label>Waist today (cm)<input name="waistCm" type="text" inputmode="decimal" placeholder="${ms && ms.waistCm ? "last " + fmt(ms.waistCm, 1) : ""}"></label>
              <label>Hips today (cm)<input name="hipCm" type="text" inputmode="decimal" placeholder="${ms && ms.hipCm ? "last " + fmt(ms.hipCm, 1) : ""}"></label>
            </div>
            <label class="check"><input type="checkbox" name="junior" ${p.junior ? "checked" : ""}> Under 18 (Junior plan), use when the age is not known</label>
            ${ABOUT_FIELDS.map(([k, l]) => `<label>${l}<textarea name="${k}" maxlength="200" rows="2">${esc(p[k] || "")}</textarea></label>`).join("")}
            <label>🔒 Admin notes (only you see these)<textarea name="adminNote" maxlength="500" rows="2">${esc(p.adminNote || "")}</textarea></label>
            <button class="btn full">Save ${esc(nameOf(m.id).split(" ")[0])}'s details</button>
          </form></details>`; }).join("")}
      <section class="card"><h2>🤝🏾 Buddy pairs</h2><p class="note" style="margin-top:0">Each person sees whether their buddy has checked in and can cheer them. Pairing a parent with a teenager works well.</p>
        <form class="form" id="buddyForm">${MEMBERS.map((m) => `<label>${esc(nameOf(m.id))}<select data-bud="${m.id}"><option value="">No buddy</option>${MEMBERS.filter((x) => x.id !== m.id).map((x) => `<option value="${x.id}" ${buddies[m.id] === x.id ? "selected" : ""}>${esc(x.name)}</option>`).join("")}</select></label>`).join("")}
          <button class="btn full">Save buddy pairs</button><p class="note">Pairs work both ways: choosing Thandi for Benadette also gives Benadette to Thandi.</p></form></section>`;
  }

  function holidayCard() {
    const s = settings(), today = todayStr();
    const list = Object.entries(HOLIDAYS).filter(([d]) => d >= s.start && d <= s.end);
    if (!list.length) return "";
    return `<details class="card fold"><summary>🇿🇦 Public holidays (no penalties)</summary>
      <p class="note">No points are deducted on these days. Rest and celebrate with family; check in if you can to keep your streak. Tip: fill half your plate with salad and vegetables before the festive food.</p>
      <div class="list">${list.map(([d, n]) => `<div class="item" style="${d < today ? "opacity:.55" : ""}"><div class="grow"><div class="t">${esc(n)}</div><div class="s">${fmtDate(d, { weekday: "long", day: "numeric", month: "long" })}</div></div>${d === today ? `<span class="pill good">Today</span>` : ""}</div>`).join("")}</div></details>`;
  }

  function viewCalc() {
    const r = rec(state.me), e = energy(r), w = latestWeight(r) || 70;
    const goalDiff = r.profile.goalWeight && w > r.profile.goalWeight ? +(w - r.profile.goalWeight).toFixed(1) : 5;
    const kg = state.calc.kg ?? goalDiff;
    const def = state.calc.deficit;
    const total = kg * KCAL_PER_KG, days = Math.ceil(total / def);
    const perKgMins = (met) => Math.round(KCAL_PER_KG / ((met * w) / 60));
    const sample = [["Walking, brisk", 4.3], ["Jogging", 7.0], ["Cycling, moderate", 8.0], ["Aerobics / dance class", 7.3], ["Skipping rope", 11.8]];
    return `
      <section class="card">
        <h2>🧮 Burn calculator</h2>
        <div class="result"><div class="muted">To lose 1 kg of body fat you need a deficit of about</div><div class="big">7 700 kcal</div><div class="muted">eaten less or burned more than your body uses</div></div>
      </section>
      <section class="card">
        <form class="form" id="calcForm">
          <div class="grid2">
            <label>Kilograms to lose<input id="cKg" type="text" inputmode="decimal" autocomplete="off" min="0.5" max="100" step="0.5" value="${kg}"></label>
            <label>Daily deficit (kcal)<select id="cDef">${[250, 500, 750, 1000].map((d) => `<option ${d === def ? "selected" : ""} value="${d}">${d}${d === 500 ? " (recommended)" : ""}</option>`).join("")}</select></label>
          </div>
        </form>
        <div class="grid3" style="margin-top:12px">
          <div class="stat"><b>${fmt(total)}</b><span>kcal in total</span></div>
          <div class="stat"><b>${fmt(days)}</b><span>days (≈ ${fmt(days / 7, 1)} weeks)</span></div>
          <div class="stat"><b>${shortDate(addDays(todayStr(), days))}</b><span>target date</span></div>
        </div>
        <p class="note">A ${def} kcal daily deficit could be ${Math.round(def * 0.6)} kcal less food plus ${Math.round(def * 0.4)} kcal of exercise. Combining both is easier to sustain than either alone.</p>
      </section>
      <section class="card">
        <h2>Burning 1 kg with exercise alone</h2>
        <p class="note">For a body weight of ${fmt(w, 1)} kg. Shows why food choices matter as much as movement.</p>
        <table><tr><th>Activity</th><th>Per 30 min</th><th>Total for 1 kg</th></tr>
          ${sample.map(([n, m]) => `<tr><td>${n}</td><td>${fmt((m * w) / 2)} kcal</td><td>${fmt(perKgMins(m) / 60, 1)} hours</td></tr>`).join("")}</table>
      </section>
      ${e ? `<section class="card"><h2>Your numbers</h2>
        <table>
          <tr><td>Resting burn (BMR)</td><td><b>${fmt(e.bmr)}</b> kcal/day</td></tr>
          <tr><td>Daily burn with activity (TDEE)</td><td><b>${fmt(e.tdee)}</b> kcal/day</td></tr>
          <tr><td>${e.habits ? "Daily needs" : `Target to lose ${e.rate === 0.12 ? "about 0.5 kg a month" : e.rate + " kg/week"}`}</td><td><b>${fmt(e.target)}</b> kcal/day</td></tr>
        </table>
        <p class="note">${e.habits ? "Habits only plan: energy needs are shown, not a deficit." : e.minor ? `Junior plan: the deficit is capped at 500 kcal a day and the target never drops below ${fmt(e.floor)} kcal. Adult equations are only an estimate for growing bodies, so check the plan with a doctor or clinic.` : "Your target never drops below 1 200 kcal (women) or 1 500 kcal (men) for safety."}</p></section>`
        : `<section class="card"><p class="muted">Complete your profile in the Me tab to see your personal BMR and daily target.</p></section>`}
      <section class="card"><p class="note"><b>Sources.</b> BMR uses the Mifflin St Jeor equation (Mifflin et al., 1990, American Journal of Clinical Nutrition). Exercise estimates use MET values from the Compendium of Physical Activities (pacompendium.com). The 7 700 kcal per kg figure is a rule of thumb; real loss usually slows over time as the body adapts (Hall, 2008, International Journal of Obesity). Activity guidance follows the WHO recommendation of 150 to 300 minutes of moderate activity per week.</p></section>`;
  }

  function weightChart(r) {
    const w = sortByDate(r.weights);
    if (w.length < 2) return `<div class="empty">Log at least two weigh ins to see your progress line.</div>`;
    const goal = r.profile.goalWeight;
    const vals = w.map((x) => x.kg).concat(goal ? [goal] : []);
    const min = Math.floor(Math.min(...vals) - 1), max = Math.ceil(Math.max(...vals) + 1);
    const W = 340, H = 170, P = { l: 34, r: 10, t: 12, b: 24 };
    const t0 = w[0].date, span = Math.max(1, diffDays(t0, w[w.length - 1].date));
    const x = (d) => P.l + (diffDays(t0, d) / span) * (W - P.l - P.r);
    const y = (v) => P.t + ((max - v) / (max - min)) * (H - P.t - P.b);
    const pts = w.map((p) => `${x(p.date).toFixed(1)},${y(p.kg).toFixed(1)}`).join(" ");
    const area = `${P.l},${H - P.b} ${pts} ${x(w[w.length - 1].date).toFixed(1)},${H - P.b}`;
    const c = "#F2B134";
    return `<div class="chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Weight over time">
      <defs><linearGradient id="wa" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c}" stop-opacity=".25"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></linearGradient></defs>
      ${[max, (max + min) / 2, min].map((v) => `<line x1="${P.l}" x2="${W - P.r}" y1="${y(v)}" y2="${y(v)}" stroke="#2A2214"/><text x="${P.l - 6}" y="${y(v) + 4}" font-size="10" text-anchor="end" fill="#A99F88">${fmt(v)}</text>`).join("")}
      ${goal ? `<line x1="${P.l}" x2="${W - P.r}" y1="${y(goal)}" y2="${y(goal)}" stroke="#4CC36B" stroke-dasharray="5 4" stroke-width="1.5"/><text x="${W - P.r}" y="${y(goal) - 4}" font-size="10" text-anchor="end" fill="#4CC36B">Goal ${fmt(goal, 1)} kg</text>` : ""}
      <polygon points="${area}" fill="url(#wa)"/>
      <polyline points="${pts}" fill="none" stroke="${c}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
      ${w.map((p) => `<circle cx="${x(p.date)}" cy="${y(p.kg)}" r="3.5" fill="#15120D" stroke="${c}" stroke-width="2"><title>${shortDate(p.date)}: ${p.kg} kg</title></circle>`).join("")}
      <text x="${P.l}" y="${H - 6}" font-size="10" fill="#A99F88">${shortDate(t0)}</text>
      <text x="${W - P.r}" y="${H - 6}" font-size="10" text-anchor="end" fill="#A99F88">${shortDate(w[w.length - 1].date)}</text>
    </svg></div>`;
  }

  function rateField(r) {
    const p = r.profile;
    if (isMinor(r)) {
      const opts = isChild(r)
        ? [[0.12, "Gentle: about 0.5 kg a month (ages 6 to 11)"]]
        : [[0.25, "Gentle: 0.25 kg a week (recommended)"], [0.5, "Steady: 0.5 kg a week (maximum)"]];
      const cur = Number(p.rate) || opts[0][0];
      return `<label>Junior plan<select id="pKid"><option value="controlled" ${p.kidPlan !== "habits" ? "selected" : ""}>Controlled weight loss</option><option value="habits" ${p.kidPlan === "habits" ? "selected" : ""}>Healthy habits only (no calorie cut)</option></select></label>
        <label>Pace<select id="pRate">${opts.map(([v, l]) => `<option value="${v}" ${cur === v ? "selected" : ""}>${l}</option>`).join("")}</select></label>
        <div class="note junior-note">👨🏾‍👩🏾‍👧🏾 <b>Junior plan rules:</b> a parent supervises, no skipped meals, at least 60 minutes of active play or exercise a day, and a check with a doctor or clinic nurse to confirm a healthy goal weight. Growing bodies need protein, milk or amasi, fruit and vegetables every day.</div>`;
    }
    return `<label>Weekly goal<select id="pRate">${[[0.25, "Gentle: 0.25 kg a week"], [0.5, "Steady: 0.5 kg a week (recommended)"], [0.75, "Ambitious: 0.75 kg a week"]].map(([v, l]) => `<option value="${v}" ${Number(p.rate || 0.5) === v ? "selected" : ""}>${l}</option>`).join("")}</select></label>`;
  }

  // ---------- Big daily check in (easy for everyone) ----------
  function bigCheckin() {
    const r = rec(state.me), t = todayStr(), st = dayStatus(r, t);
    if (!st.checkin) return `<button class="checkin-big" data-act="checkin"><span class="ci-icon">👋🏾</span><span><b>Check in today</b><small>Tap here. +${POINTS.checkin} points</small></span></button>`;
    return `<section class="card checked-in"><div class="row"><span class="ci-done">✅</span><div><b>You checked in today!</b><br><small>Well done. Tap a picture to add more:</small></div></div>
      <div class="quick4">
        <button data-water="1">${glassSvg(true)}<small>+1 water</small></button>
        <button data-go="journal"><span>😊</span><small>Journal</small></button>
        <button data-go="move"><span>👟</span><small>Steps</small></button>
        <button data-go="food"><span>🍽️</span><small>Food</small></button>
      </div></section>`;
  }

  // ---------- Charts: everything over time, as pictures ----------
  /** Single series bar chart with an optional goal line. Tap a bar to see its value. */
  function barChart({ days, values, color, goal, label, fmtv = (v) => fmt(v), short = false }) {
    const W = 340, H = 140, P = { l: 30, r: 8, t: 12, b: 22 };
    const max = Math.max(goal || 0, ...values, 1) * 1.12;
    const n = days.length, slot = (W - P.l - P.r) / n, bw = Math.max(3, slot - 2);
    const y = (v) => P.t + (1 - v / max) * (H - P.t - P.b), base = H - P.b;
    const every = n <= 7 ? 1 : n <= 14 ? 2 : 5;
    const bars = days.map((d, i) => {
      const v = values[i] || 0, x = P.l + i * slot + (slot - bw) / 2, top = y(v), h = base - top;
      const hit = goal && v >= goal;
      const tip = `${fmtDate(d, { weekday: "short", day: "numeric", month: "short" })}: ${fmtv(v)} ${label}`;
      const rr = Math.min(4, bw / 2, h);
      return `<g class="bar-g" data-tip="${esc(tip)}"><rect x="${x - (slot - bw) / 2}" y="${P.t}" width="${slot}" height="${base - P.t}" fill="transparent"/>
        ${v > 0 ? `<path d="M${x},${base} V${top + rr} Q${x},${top} ${x + rr},${top} H${x + bw - rr} Q${x + bw},${top} ${x + bw},${top + rr} V${base} Z" fill="${color}" opacity="${hit || !goal ? 1 : 0.55}"><title>${esc(tip)}</title></path>` : ""}
        ${i % every === 0 || i === n - 1 ? `<text x="${x + bw / 2}" y="${H - 6}" text-anchor="middle" font-size="9.5" fill="#A99F88">${short ? fmtDate(d, { weekday: "narrow" }) : new Date(d + "T12:00:00").getDate()}</text>` : ""}</g>`;
    }).join("");
    return `<div class="chartbox"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(label)} per day">
      <line x1="${P.l}" x2="${W - P.r}" y1="${base}" y2="${base}" stroke="#3A3428"/>
      <text x="${P.l - 4}" y="${y(max / 1.12) + 3}" text-anchor="end" font-size="9" fill="#A99F88">${fmtv(Math.round(max / 1.12))}</text>
      ${bars}
      ${goal ? `<line x1="${P.l}" x2="${W - P.r}" y1="${y(goal)}" y2="${y(goal)}" stroke="#4CC36B" stroke-width="1.5" stroke-dasharray="5 4"/><text x="${W - P.r}" y="${y(goal) - 4}" text-anchor="end" font-size="9.5" fill="#4CC36B">goal ${fmtv(goal)}</text>` : ""}
    </svg><div class="ctip">Tap a bar to see the number</div></div>`;
  }
  function chartsCard() {
    const r = rec(state.me), n = state.chartDays || 7, t = todayStr();
    const days = []; for (let i = n - 1; i >= 0; i--) days.push(addDays(t, -i));
    const short = n === 7, avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
    const wt = waterTarget(), stg = sleepTarget(r), sg = stepGoal(), e = energy(r);
    const water = days.map((d) => glasses(r, d)), sleep = days.map((d) => (sleepOn(r, d) || {}).hours || 0), steps = days.map((d) => daySteps(r, d));
    const food = days.map((d) => dayTotals(r, d).eaten), mins = days.map((d) => r.exercises.filter((x) => x.date === d).reduce((a, x) => a + x.minutes, 0));
    const hits = (vals, goal) => vals.filter((v) => v >= goal).length;
    const logged = (vals) => vals.filter((v) => v > 0);
    const block = (icon, title, big, sub, chart) => `<div class="cblock"><div class="chead"><span class="cicon">${icon}</span><div><b>${title}</b><small>${sub}</small></div><div class="cbig">${big}</div></div>${chart}</div>`;
    const moods = days.map((d) => { const j = r.reflections.find((x) => x.date === d); return j && j.mood ? MOODS[j.mood] : j ? "📓" : "·"; });
    return `<section class="card">
      <div class="row between wrap"><h2>📈 My charts</h2><div class="seg">${[7, 14, 30].map((k) => `<button class="${k === n ? "on" : ""}" data-cdays="${k}">${k} days</button>`).join("")}</div></div>
      ${block(glassSvg(true), "Water", fmt(avg(water), 1), `glasses a day · goal reached ${hits(water, wt)} of ${n} days`, barChart({ days, values: water, color: "#5AA9E6", goal: wt, label: "glasses", short }))}
      ${block("🌙", "Sleep", logged(sleep).length ? fmt(avg(logged(sleep)), 1) + " h" : "–", `a night · goal reached ${hits(sleep, stg)} of ${n} nights`, barChart({ days, values: sleep, color: "#8E7CFF", goal: stg, label: "hours", fmtv: (v) => fmt(v, 1), short }))}
      ${block("👟", "Steps", fmt(avg(steps)), `a day · goal reached ${hits(steps, sg)} of ${n} days`, barChart({ days, values: steps, color: "#4CC36B", goal: sg, label: "steps", short }))}
      ${block("🏃🏾", "Movement", fmt(steps.length ? mins.reduce((a, b) => a + b, 0) : 0), `active minutes in ${n} days`, barChart({ days, values: mins, color: "#F2B134", goal: 30, label: "minutes", short }))}
      ${block("🍽️", "Food", logged(food).length ? fmt(avg(logged(food))) : "–", `kcal a day${e ? ` · your target ${fmt(e.target)}` : ""}`, barChart({ days, values: food, color: "#E4572E", goal: e ? e.target : 0, label: "kcal", short }))}
      <div class="cblock"><div class="chead"><span class="cicon">😊</span><div><b>Mood</b><small>from your journal</small></div></div>
        <div class="moodrow" style="grid-template-columns:repeat(${Math.min(n, 15)},1fr)">${moods.slice(-15).map((m, i) => `<div><span>${m}</span><small>${fmtDate(days.slice(-15)[i], { day: "numeric" })}</small></div>`).join("")}</div></div>
      <div class="cblock"><div class="chead"><span class="cicon">✅</span><div><b>Check ins</b><small>${days.filter((d) => dayStatus(r, d).any).length} of ${n} days</small></div></div>
        <div class="calrowdots">${days.map((d) => { const any = dayStatus(r, d).any; return `<span class="cdot ${any ? "on" : d < (r.profile.joinedDate || "") || d < settings().start ? "off" : holiday(d) ? "hol" : "miss"}" title="${shortDate(d)}">${any ? "✓" : ""}</span>`; }).join("")}</div></div>
      <p class="note">Faded bars are below the goal. The green dashed line is your goal.</p>
    </section>`;
  }

  function viewMe() {
    const r = rec(state.me), p = r.profile, sc = score(state.me);
    const todayW = r.weights.find((x) => x.date === todayStr());
    return `
      <section class="card">
        <div class="private">🔒 Only you and the administrator can see your weights.</div>
        <div class="row">${avatar(state.me, "xl")}<div><h2 style="margin:0">${esc(nameOf(state.me))}</h2>
          <small>${esc(AVATARS[state.account.avatar]?.name || "")}: <i>${esc(AVATARS[state.account.avatar]?.pledge || "")}</i></small><br>
          <small>${sc.sw ? `Started at ${fmt(sc.sw, 1)} kg · now ${fmt(sc.cw, 1)} kg` : "Weigh in to set your starting weight"}</small></div></div>
        ${p.beforeWeight && latestWeight(r) ? `<div class="holiday" style="margin-top:12px">🌄 <b>Your journey:</b> ${fmt(p.beforeWeight, 1)} kg on 23 November 2024 → ${fmt(latestWeight(r), 1)} kg now. That is <b>${fmt(p.beforeWeight - latestWeight(r), 1)} kg</b> already behind you. The obstacle is the way.</div>` : ""}
        <div class="grid3" style="margin-top:12px">
          <div class="stat"><b>${fmt(sc.lostKg, 1)}</b><span>kg lost</span></div>
          <div class="stat"><b>${fmt(sc.total)}</b><span>points</span></div>
          <div class="stat"><b>${sc.streak}</b><span>day streak</span></div>
        </div>
        <details class="fold" style="margin-top:12px"><summary>🎁 Rewards unlocked: ${sc.rewards}</summary>
          ${sc.rewards ? `<div class="list">${REWARDS.slice(0, sc.rewards).map((x) => `<div class="item">${x}</div>`).join("")}</div>` : ""}
          <small>${sc.sw ? `Next reward at ${fmt(sc.sw * (1 - (sc.rewards + 1) * 0.025), 1)} kg (every 2.5% of your starting weight). Plan a non food treat with your family.` : "Weigh in to start unlocking rewards."}</small></details>
        ${sc.goal !== null ? `<div style="margin-top:12px"><small>${fmt(sc.goal)}% of the way to ${fmt(p.goalWeight, 1)} kg</small><div class="bar"><i style="width:${sc.goal}%"></i></div></div>` : ""}
      </section>

      ${weighResultsCard(r)}
      ${bmiCard(r)}

      ${chartsCard()}

      ${trophyCabinet(state.me)}

      <section class="card">
        <h2>⚖️ Weigh in</h2>
        <form class="form" id="wForm"><div class="grid2">
          <label>Date<input type="text" value="Today, ${fmtDate(todayStr(), { day: "numeric", month: "short" })}" readonly></label>
          <label>Weight (kg)<input type="text" id="wKg" inputmode="decimal" autocomplete="off" step="0.1" min="20" max="400" value="${todayW ? todayW.kg : ""}" required></label></div>
          <button class="btn full">${todayW ? "Update today's weight" : "Save personal weigh in"}</button></form>
        <p class="note">Personal weigh ins are for your own chart. Official weights are recorded by the administrator at the Saturday weigh ins, and only those count towards the winners.</p>
        <div style="margin-top:14px">${weightChart(r)}</div>
        <div class="list">${sortByDate(r.weights).reverse().slice(0, 3).map((x) => `<div class="item"><div class="grow"><div class="t">${fmt(x.kg, 1)} kg</div><div class="s">${fmtDate(x.date, { weekday: "short", day: "numeric", month: "short" })}</div></div><button class="del" data-del="weights" data-id="${esc(x.id)}" aria-label="Delete">✕</button></div>`).join("")}</div>
      </section>

      ${measuresCard(r)}
      ${remindersCard()}
      ${stepSyncCard()}
      <section class="card"><div class="form">
        <button class="btn full" data-go="profile">👤 Edit my profile (age, height, waist, favourites, goals)</button>
        <button class="btn ghost full" data-go="calc">🧮 Open the burn calculator</button>
        <button class="btn ghost full" data-act="switch">🎭 Avatar, PIN and sign out</button></div></section>`;
  }

  // ---------- My profile page ----------
  const ABOUT_FIELDS = [["favFoods", "🍲 Favourite foods", "e.g. grilled chicken, pawpaw, rooibos"], ["favExercise", "🏃🏾 Favourite exercise", "e.g. walking, stairs, spinning, dancing"],
    ["biggestChallenge", "🧗🏾 My biggest challenge", "e.g. late night snacking, no time to exercise"], ["motivation", "💡 Why I am doing this", "e.g. for my health and my children"], ["support", "🤝🏾 What helps me most", "e.g. reminders, a walking buddy"]];
  function viewProfile() {
    const r = rec(state.me), p = r.profile, sc = score(state.me), m = lastMeasure(r);
    return `<section class="card"><h2>👤 My profile</h2><p class="note" style="margin-top:0">Private: only you and the administrator see this. Your coach uses it to personalise your advice.</p>
        <form class="form" id="pForm">
          <h3>About me</h3>
          <div class="grid2">
            <label>Sex<select id="pSex"><option value="f" ${p.sex !== "m" ? "selected" : ""}>Female</option><option value="m" ${p.sex === "m" ? "selected" : ""}>Male</option></select></label>
            <label>Age<input id="pAge" type="number" inputmode="numeric" min="5" max="110" value="${p.age ?? ""}"></label>
            <label>Height (cm)<input id="pH" type="number" inputmode="numeric" min="90" max="230" value="${p.heightCm ?? ""}"></label>
            <label>Goal weight (kg)<input id="pGW" type="text" inputmode="decimal" autocomplete="off" value="${p.goalWeight ?? ""}"></label>
            <label>Waist today (cm)<input id="pWaist" type="text" inputmode="decimal" autocomplete="off" placeholder="${m && m.waistCm ? "last " + fmt(m.waistCm, 1) : "e.g. 92"}"></label>
            <label>Hips today (cm)<input id="pHip" type="text" inputmode="decimal" autocomplete="off" placeholder="${m && m.hipCm ? "last " + fmt(m.hipCm, 1) : "e.g. 104"}"></label>
            <label>Starting weight (kg)<input id="pSW" type="text" inputmode="decimal" autocomplete="off" value="${p.startWeight ?? (sc.sw ?? "")}" ${p.startWeight ? 'readonly title="Only the administrator can change a starting weight"' : ""}></label>
          </div>
          <label>Activity level<select id="pAct">${[[1.2, "Mostly sitting"], [1.375, "Lightly active (1 to 3 days)"], [1.55, "Moderately active (3 to 5 days)"], [1.725, "Very active (6 to 7 days)"]].map(([v, l]) => `<option value="${v}" ${Number(p.activity || 1.375) === v ? "selected" : ""}>${l}</option>`).join("")}</select></label>
          ${rateField(r)}
          <h3>My favourites and goals</h3>
          ${ABOUT_FIELDS.map(([k, l, ph]) => `<label>${l}<textarea id="ab_${k}" maxlength="200" rows="2" placeholder="${ph}">${esc(p[k] || "")}</textarea></label>`).join("")}
          <button class="btn full">Save my profile</button>
        </form></section>`;
  }

  // ---------- Waist and hip measurements ----------
  const lastMeasure = (r) => (r.measures || []).slice().sort((a, b) => a.date.localeCompare(b.date)).pop() || null;
  function whtr(r, waist) { const h = r.profile.heightCm; if (!h || !waist) return null; const v = Math.round((waist / h) * 100) / 100; return { v, label: v < 0.4 ? "below the healthy range" : v < 0.5 ? "healthy" : v < 0.6 ? "increased health risk" : "high health risk" }; }
  function measuresCard(r) {
    const list = (r.measures || []).slice().sort((a, b) => a.date.localeCompare(b.date)), last = list[list.length - 1], first = list[0];
    const w = last && last.waistCm ? whtr(r, last.waistCm) : null;
    return `<section class="card"><h2>📏 Waist and hips</h2>
      ${last ? `<div class="row between"><div><small class="muted">Latest (${fmtDate(last.date, { day: "numeric", month: "short" })})</small><div class="cbig" style="font-size:1.6rem">${last.waistCm ? fmt(last.waistCm, 1) + " cm" : "–"}<small> waist</small></div>${last.hipCm ? `<small>${fmt(last.hipCm, 1)} cm hips</small>` : ""}</div>
        <div style="text-align:right">${first && first !== last && first.waistCm && last.waistCm ? `<b style="color:${last.waistCm <= first.waistCm ? "#8BD66B" : "#FF7A63"}">${last.waistCm <= first.waistCm ? "▼" : "▲"} ${fmt(Math.abs(first.waistCm - last.waistCm), 1)} cm</b><br><small>since ${fmtDate(first.date, { day: "numeric", month: "short" })}</small>` : ""}</div></div>
        ${w ? `<p class="note">Waist to height ratio <b>${String(w.v).replace(".", ",")}</b>: ${w.label}. Keep your waist to less than half your height (NICE guidance).</p>` : `<p class="note">Add your height in your profile to see your waist to height ratio.</p>`}
        ${list.length > 1 ? barChart({ days: list.map((x) => x.date), values: list.map((x) => x.waistCm || 0), color: "#5AA9E6", label: "cm", short: true }) : ""}`
      : `<p class="note">No measurements yet. Measure your waist at the level of your belly button and add it in your profile, or at the official weigh in.</p>`}
      <p class="note">The tape often shows progress when the scale does not.</p></section>`;
  }

  // ---------- Reminders (phone notifications) ----------
  const PUSH_LABELS = { messages: "📣 Messages and announcements from the administrator", vitamin: "💊 Take your Centrum (08:30, if not ticked)", meditate: "🧘🏾 5 minute meditation (12:30)", journal: "✍🏾 Quick journal write up (21:00)", meals: "🍽️ Meal reminders (08:00, 13:00, 18:30, only if not logged)", water: "🥛 Water reminders (10:30, 14:30, 17:30, if behind)", night: "🕘 Last meal before 9 PM (20:15)", nudge: "👋🏾 Nothing logged today (20:00)", weighin: "⚖️ Weigh in tomorrow (Friday evening)", alerts: "🛡️ Safety alerts for the administrator (08:00)" };
  function remindersCard() {
    const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    const on = state.push && state.push.enabled, prefs = (state.push && state.push.prefs) || {};
    const ios = isIOS(), installed = isStandalone();
    return `<section class="card"><h2>🔔 Reminders</h2>
      ${!supported || (ios && !installed) ? `<p class="note">${ios ? "On iPhone, reminders work once the app is saved to your home screen (Share ⬆️ → Add to Home Screen). Then open it from the icon and come back here." : "This browser cannot show reminders. Try Chrome."}</p>`
      : on ? `<p class="note" style="margin-top:0">✅ Reminders are on for this phone.</p>
          <div class="pushprefs">${Object.entries(PUSH_LABELS).filter(([k]) => k !== "alerts" || state.account.role === "admin").map(([k, l]) => `<label class="check"><input type="checkbox" data-pp="${k}" ${prefs[k] !== false ? "checked" : ""}> ${l}</label>`).join("")}</div>
          <div class="grid2"><button class="btn ghost" data-push="test">Send a test</button><button class="btn ghost" data-push="off">Turn off</button></div>`
      : `<p class="note" style="margin-top:0">Gentle reminders for meals, water, the 9 PM cut off and weigh ins. Only when something is still to do.</p><button class="btn full" data-push="on">🔔 Turn on reminders</button>`}
    </section>`;
  }
  async function pushOn() {
    try {
      const perm = await Notification.requestPermission(); if (perm !== "granted") return toast("Reminders were not allowed. You can allow them in your phone settings.");
      const reg = await navigator.serviceWorker.ready, { publicKey } = await api("push/key");
      const key = Uint8Array.from(atob(publicKey.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (publicKey.length % 4)) % 4)), (c) => c.charCodeAt(0));
      const sub = (await reg.pushManager.getSubscription()) || (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key }));
      await api("push/subscribe", { method: "POST", body: { subscription: sub.toJSON() } });
      await load(); render(); toast("🔔 Reminders are on.");
    } catch (e) { toast("⚠️ Reminders could not be turned on: " + esc(e.message || "")); }
  }

  // ---------- iPhone step sync ----------
  function stepSyncCard() {
    const code = state.newSyncCode;
    return `<section class="card"><details class="fold" ${state.newSyncCode ? "open" : ""}><summary>👟 Step sync from iPhone Health (optional)</summary>
      <p class="note">An Apple Shortcut can send today's steps from the Health app (and any watch connected to it) to the challenge every evening.</p>
      ${code ? `<p>Your personal code (shown once, keep it private):</p><p class="synccode">${esc(code)}</p>` : `<button class="btn ghost full" data-sync>${state.syncCodeSet ? "Make a new code (the old one stops working)" : "Make my step sync code"}</button>`}
      <ol class="rules">
        <li>Open the <b>Shortcuts</b> app → <b>+</b>.</li>
        <li>Add <b>Find Health Samples</b>: type <b>Steps</b>, start date <b>is today</b>.</li>
        <li>Add <b>Calculate Statistics</b>: <b>Sum</b> of the Health Samples.</li>
        <li>Add <b>Get Contents of URL</b>: <code>${location.origin}/api/steps-sync</code>, method <b>POST</b>, request body <b>JSON</b> with <b>code</b> = your code and <b>steps</b> = the Sum.</li>
        <li>In <b>Automation</b>, run it every day at <b>20:30</b> and choose <b>Run Immediately</b>.</li>
      </ol></details></section>`;
  }

  // ---------- Buddies and cheers ----------
  function buddyCard() {
    const b = state.buddy, rc = state.cheers.received;
    if (!b && !rc.length) return "";
    return `<section class="card buddy">
      ${rc.length ? `<div class="cheerin">${rc.map((c) => `${c.emoji} <b>${esc(c.from.split(" ")[0])}</b> cheered you on today!`).join("<br>")}</div>` : ""}
      ${b ? `<div class="row between"><div class="row" style="gap:10px">${avatar(b.id, "md")}<div><small class="muted">🤝🏾 My buddy</small><br><b>${esc(b.name)}</b><br><small>${b.checkedIn ? `✅ Checked in today · ${b.points} pts` : "⏳ Not checked in yet"}</small></div></div>
        ${state.cheers.sent.includes(b.id) ? `<span class="pill good">Cheered ✓</span>` : `<button class="btn" data-cheer="${b.id}">👏🏾 Cheer</button>`}</div>` : ""}
    </section>`;
  }
  function cheerCard() {
    const others = MEMBERS.filter((m) => m.id !== state.me);
    if (!others.length) return "";
    return `<section class="card"><h2>👏🏾 Send a cheer</h2><p class="note" style="margin-top:0">One cheer per person a day. Encouragement works.</p>
      <div class="chips">${others.map((m) => state.cheers.sent.includes(m.id) ? `<span class="chip on">✓ ${esc(m.name.split(" ")[0])}</span>` : `<button class="chip" data-cheer="${m.id}">👏🏾 ${esc(m.name.split(" ")[0])}</button>`).join("")}</div></section>`;
  }

  // ---------- Weekly report (Tuesday) ----------
  function weeklyReportCard() {
    const t = todayStr(), w = currentWeek(); if (t !== w.w0) return "";
    const prev = challengeWeeks().find((x) => x.n === w.n - 1); if (!prev) return "";
    const r = rec(state.me), L = ledger(r, prev.w0, prev.w1), pts = (score(state.me).weekPts || {})[prev.n] || 0;
    const days = []; for (let d = prev.w0; d <= prev.w1; d = addDays(d, 1)) days.push(d);
    const rate = (k) => days.filter((d) => habitsOn(r, d)[k]).length;
    const flags = days.reduce((a, d) => a + eating(r, d).flags.length, 0);
    const text = `Stoic by Choice · my Week ${prev.n} report\n⭐ ${pts} points\n🍽️ 3 meals: ${rate("food")}/7 days\n👟 Move: ${L.move.done} active minutes\n🥛 Water goal: ${rate("water")}/7 days\n🌙 Sleep goal: ${rate("sleep")}/7 nights\n🚩 Bad habits: ${flags}\nThis week I will focus on: ${HABIT_META[HABIT_KEYS.slice().sort((a, b) => rate(a) - rate(b))[0]][1]}`;
    state.reportText = text;
    return `<section class="card report"><h2>📄 My Week ${prev.n} in one page</h2>
      <div class="kdgrid">
        <div class="kd"><span class="kdi">⭐</span><div class="grow"><small>Points</small><b>${fmt(pts)}</b></div></div>
        <div class="kd"><span class="kdi">🍽️</span><div class="grow"><small>3 meals</small><b>${rate("food")} of 7 days</b></div></div>
        <div class="kd"><span class="kdi">👟</span><div class="grow"><small>Active minutes</small><b>${fmt(L.move.done)}</b><span>target ${L.move.need}</span></div></div>
        <div class="kd"><span class="kdi">🥛</span><div class="grow"><small>Water goal</small><b>${rate("water")} of 7 days</b></div></div>
        <div class="kd"><span class="kdi">🌙</span><div class="grow"><small>Sleep goal</small><b>${rate("sleep")} of 7 nights</b></div></div>
        <div class="kd"><span class="kdi">🚩</span><div class="grow"><small>Bad habits</small><b>${flags}</b></div></div>
      </div>
      <p class="note">Focus this week: <b>${HABIT_META[HABIT_KEYS.slice().sort((a, b) => rate(a) - rate(b))[0]][1]}</b>.</p>
      <button class="btn ghost full" data-share>📤 Share my report</button></section>`;
  }

  // ---------- Maintenance mode (after the Grand Finale) ----------
  function maintenanceCard() {
    const s = settings(), t = todayStr(); if (t <= s.end) return "";
    const r = rec(state.me), base = officialWeightOn(r, s.end) || latestWeight(r), cur = latestWeight(r); if (!base) return "";
    const lo = Math.round((base - 1) * 10) / 10, hi = Math.round((base + 2) * 10) / 10, inRange = cur >= lo - 0.05 && cur <= hi + 0.05;
    return `<section class="card maint"><h2>🛡️ Maintenance: keep it off</h2>
      <p>The challenge is over. Now the most important part: keeping your results. Your range is <b>${fmt(lo, 1)} to ${fmt(hi, 1)} kg</b>.</p>
      <div class="cuhead ${inRange ? "done" : ""}"><b>${inRange ? "✓ You are in your range" : cur > hi ? "Above your range: tighten portions and move more this week" : "Below your range"}</b><small>Latest weight ${fmt(cur, 1)} kg. Weigh yourself once a month (Progress, personal weigh in).</small></div>
      <ul class="pglist"><li>Keep 3 meals a day and keep logging most days.</li><li>Stay active: 150 minutes a week or more.</li><li>8 glasses of water and 7 hours of sleep.</li><li>Your clinic's maintenance programme and follow up blood tests matter more than the diet itself.</li></ul></section>`;
  }

  // ---------- Recipes that follow the plan rules ----------
  const RECIPES = [
    ["🍗 Lemon herb chicken with greens", "Meal 2 or 3", ["Chicken breast (weighed raw, your plan amount)", "Your plan vegetables: baby marrow, green beans or broccoli (a third at most)", "Lemon, garlic, rosemary, black pepper", "Spray and Cook"], "Rub the chicken with lemon, garlic, rosemary and pepper. Grill or pan fry with Spray and Cook until cooked through. Steam the vegetables and season with lemon and herbs."],
    ["🐟 Hake parcel", "Meal 2 or 3", ["Hake (weighed raw)", "Mushrooms, baby marrow and onion (30 g at most)", "Parsley, garlic, lemon, black pepper"], "Place the fish and sliced vegetables on foil, season, fold into a parcel and bake at 200 °C for 15 to 20 minutes."],
    ["🥩 Beef and cabbage stir fry", "Meal 2 or 3", ["Lean beef, no fat (weighed raw)", "Cabbage, green pepper, mushrooms", "Garlic, curry powder, 1 teaspoon light soy sauce", "Spray and Cook"], "Slice the beef thinly and brown in a hot pan with Spray and Cook. Add the vegetables and garlic, stir fry for 4 minutes, finish with the soy sauce."],
    ["🥚 Spinach and mushroom egg", "Meal 1", ["1 egg", "Spinach and mushrooms (your Meal 1 vegetables)", "Black pepper, herbs", "Spray and Cook"], "Sauté the mushrooms and spinach with Spray and Cook, pour over the beaten egg and cook gently. Season with pepper and herbs."],
    ["🧀 Cottage cheese salad", "Meal 1 or 2 (cheese once a day)", ["Fat free cottage cheese (weighed)", "Lettuce, cucumber, tomato (70 g a day at most), gherkins", "Vinegar, black pepper"], "Arrange the vegetables, top with cottage cheese and season with vinegar and pepper."],
    ["🦑 Garlic calamari with brinjal", "Meal 2 or 3", ["Calamari (weighed raw)", "Brinjal and baby marrow", "Garlic, parsley, lemon", "Spray and Cook"], "Grill sliced brinjal and baby marrow. Cook the calamari quickly in a very hot pan with garlic (1 to 2 minutes), add parsley and lemon."],
    ["🥣 Plain yoghurt with fruit", "Meal 1", ["175 ml plain fat free yoghurt", "1 fruit from your allowance (e.g. apple or kiwi)", "Cinnamon"], "Chop the fruit, stir into the yoghurt and sprinkle with cinnamon. Counts as one of your 2 fruits."],
    ["🍵 Hot drink ideas", "Any time", ["Rooibos or green tea, no milk", "Sweetener if you like", "Lemon slice or cinnamon stick"], "Great between meals and instead of a late snack. No milk, no sugar, no honey."],
  ];
  function viewRecipes() {
    return `<section class="card"><h2>🥗 Recipes that follow the plan</h2><p class="note" style="margin-top:0">No oil (Spray and Cook only), one protein per meal, weigh raw, herbs and spices instead of spice mixes. Log the ingredients in the Food page as usual.</p></section>
      ${RECIPES.map(([t, when, ing, how]) => `<details class="card fold"><summary>${t} <small class="muted">· ${when}</small></summary><h3>Ingredients</h3><ul class="pglist">${ing.map((x) => `<li>${esc(x)}</li>`).join("")}</ul><h3>Method</h3><p>${esc(how)}</p></details>`).join("")}`;
  }

  // =====================================================================
  // Stoic by Choice: interactive screens, weekly challenge and awards
  // The designer's screen images are shown unchanged. Live values and
  // tap targets are placed on top of them using the image's own coordinates.
  // =====================================================================

  const IMG = {
    home: "img/screen-home.webp", board: "img/screen-leaderboard.webp", weekly: "img/screen-weekly-challenge.webp", awards: "img/screen-awards.webp",
    weekly_award: "img/award-weekly.webp", monthly_award: "img/award-monthly.webp", consistent: "img/award-most-consistent.webp",
    resilience: "img/award-resilience.webp", bl_medal_black: "img/award-biggest-loser-medal-black.webp",
    bl_medal_gold: "img/award-biggest-loser-medal-gold.webp", bl_trophy: "img/award-biggest-loser-trophy.webp", bl_plaque: "img/award-biggest-loser-plaque.webp",
  };

  const taskDone = (r, d) => (r.tasks || []).some((t) => t.date === d) || scorecard(r, d).taskDone;

  // Overlay helpers: coordinates are in image pixels (screens are 1024 × 1536).
  const W = 1024, H = 1536;
  const pos = (x, y, w, h) => `left:${(x / W) * 100}%;top:${(y / H) * 100}%;width:${(w / W) * 100}%;height:${(h / H) * 100}%`;
  const hs = (x, y, w, h, act, label, extra = "") => `<button class="hs" style="${pos(x, y, w, h)}" data-hs="${act}" ${extra} aria-label="${esc(label)}"></button>`;
  const ov = (x, y, w, h, html, cls = "") => `<div class="ov ${cls}" style="${pos(x, y, w, h)}">${html}</div>`;
  function ringSvg(cx, cy, rad, stroke, pct, id) {
    const C = 2 * Math.PI * rad, box = rad + stroke;
    return `<svg class="ov ring-ov" style="${pos(cx - box, cy - box, box * 2, box * 2)}" viewBox="0 0 ${box * 2} ${box * 2}">
      <defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFE08A"/><stop offset=".55" stop-color="#F2B134"/><stop offset="1" stop-color="#C98A1B"/></linearGradient></defs>
      <circle cx="${box}" cy="${box}" r="${rad}" fill="none" stroke="#2A2214" stroke-width="${stroke}"/>
      <circle cx="${box}" cy="${box}" r="${rad}" fill="none" stroke="url(#${id})" stroke-width="${stroke}" stroke-linecap="round"
        stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - Math.max(0, Math.min(1, pct)))}" transform="rotate(-90 ${box} ${box})" style="transition:stroke-dashoffset .8s"/></svg>`;
  }

  // ---------- Official results from the server ----------
  const R = () => state.results || { weeks: [], months: [], consistent: [], resilience: [], biggestLoser: null, ranking: [], over: false };
  const weekResults = () => R().weeks;
  const monthResults = () => R().months;
  const consistentLeaders = () => R().consistent;
  const resilienceLeaders = () => R().resilience;
  const biggestLoser = () => R().biggestLoser;
  const isOver = () => todayStr() > settings().end;
  const periodScore = (id, a) => { const s = score(id), w = challengeWeeks().find((x) => x.w0 === a); if (w) return s.weekPts[w.n] || 0; const m = challengeMonths().find((x) => x.from === a); return m ? s.monthPts[m.key] || 0 : 0; };
  /** Achievements for the signed in person come from their official summary. */
  const achievements = (id) => score(id);

  function badgeOverlay(key, a, x, y, w, h) {
    const b = BADGES[key], won = b.test(a), leading = !won && b.lead && b.lead(a);
    return `${won ? ov(x + w - 44, y + 4, 40, 40, "✓", "tick") : leading ? ov(x + w / 2 - 58, y + h - 30, 116, 30, "Leading", "leadpill") : ov(x, y, w, h, "🔒", "locked")}
      ${hs(x, y, w, h, "badge", b.label, `data-badge="${key}"`)}`;
  }

  function meOrFirst() { return state.me; }
  const signedTick = (n) => (n > 0 ? "−" : n < 0 ? "+" : "") + fmt(Math.abs(n), 1);

  // ---------- Home screen (Stoic by Choice dashboard) ----------
  function homeScreen() {
    const id = meOrFirst(), r = rec(id), sc = score(id), a = achievements(id);
    const cw = weeks(r).find((w) => w.current) || weeks(r)[0];
    const mins = cw ? cw.mins : 0, need = cw ? cw.need : TREAT.minutes;
    const goalKg = r.profile.goalWeight && sc.sw ? sc.sw - r.profile.goalWeight : null;
    const toGo = goalKg !== null ? Math.max(0, goalKg - sc.lostKg) : null;
    const pct = sc.goal !== null ? sc.goal : 0;
    return `<div class="screen">
      <img src="${IMG.home}" alt="Stoic by Choice Biggest Loser Challenge dashboard" width="1024" height="1536">
      ${ringSvg(811, 641, 99, 14, mins / need, "gHomeWk")}
      ${ov(745, 640, 132, 75, `<div class="ovnum" style="font-size:3.6cqw">${fmt(mins)} / ${need}</div><div class="ovsub" style="font-size:2.2cqw">minutes</div>`, "cover col")}
      ${ringSvg(200, 940, 63, 13, pct / 100, "gHomeProg")}
      ${ov(150, 905, 100, 70, `<div class="ovnum" style="font-size:4.4cqw">${fmt(pct)}%</div>`, "cover")}
      ${ov(448, 860, 112, 40, `<span class="ovval">${goalKg !== null ? "−" + fmt(goalKg, 1) + " kg" : "Set goal"}</span>`, "cover right")}
      ${ov(448, 906, 112, 40, `<span class="ovval">${sc.sw ? signedTick(sc.lostKg) + " kg" : "–"}</span>`, "cover right")}
      ${ov(448, 953, 112, 40, `<span class="ovval">${toGo !== null ? fmt(toGo, 1) + " kg" : "–"}</span>`, "cover right")}
      ${[["weekly", 108], ["consistency", 276], ["movement", 442], ["healthy", 609], ["comeback", 778]].map(([k, x]) => badgeOverlay(k, a, x, 1088, 140, 168)).join("")}
      ${hs(70, 490, 880, 230, "go:challenge", "Open the weekly challenge")}
      ${hs(338, 724, 310, 56, "go:move", "Take the challenge: log exercise")}
      ${hs(70, 820, 505, 200, "go:me", "My progress")}
      ${hs(598, 820, 360, 200, "go:me", "Track my weight")}
      ${hs(790, 1045, 145, 45, "go:awards", "View all achievements")}
      ${hs(120, 1275, 780, 95, "quote", "Another Stoic thought")}
      ${hs(70, 75, 80, 60, "go:me", "Menu")}${hs(800, 70, 70, 65, "bell", "Notifications")}${hs(880, 70, 70, 65, "who", "Switch person")}
      ${navHotspots([[80, 200, "home"], [225, 360, "challenge"], [390, 500, "me"], [540, 645, "awards"], [685, 810, "board"], [845, 945, "calc"]], 1390, 110)}
    </div>`;
  }
  function navHotspots(items, y, h) { return items.map(([x0, x1, tab]) => hs(x0, y, x1 - x0, h, "go:" + tab, "Go to " + tab)).join(""); }

  // ---------- Leaderboard screen ----------
  function boardScreen() {
    const mode = state.boardMode || "week", cw = currentWeek();
    const rows = ranking(mode).slice(0, 5);
    const daysIn = Math.max(1, Math.min(diffDays(settings().start, todayStr()) + 1, diffDays(settings().start, settings().end) + 1));
    const ys = [[550, 44, 47], [657, 40, 43], [752, 40, 41], [845, 40, 41], [937, 40, 41]];
    const me = meOrFirst(), msc = score(me), ma = achievements(me);
    const weekStreak = (() => { const ws = weeks(rec(me)); let n = 0; for (let i = ws.length - 1; i >= 0; i--) { if (ws[i].from > todayStr()) continue; if (ws[i].allIn) n++; else break; } return n; })();
    return `<div class="screen">
      <img src="${IMG.board}" alt="Stoic by Choice Biggest Loser challenge leaderboard" width="1024" height="1536">
      ${ov(785, 440, 125, 34, `<span class="ovval" style="font-size:2.3cqw">${MODES[mode]}</span>`, "cover")}
      ${hs(752, 432, 210, 50, "boardmode", "Switch between this week, this month and overall")}
      ${rows.map((x, i) => { const [cy, hh, pr] = ys[i]; return `
        ${ov(240 - pr, cy - pr, pr * 2, pr * 2, `<img src="${avatarSrc(meta(x.id).avatar)}" alt="">`, "avatar-ov")}
        ${ov(312, cy - hh, 392, hh * 2, `<div class="rowname">${esc(nameOf(x.id))}</div>
          <div class="rowsub">${esc(AVATARS[meta(x.id).avatar]?.name || "")}  |  🔥 ${x.streak} day streak</div>
          <div class="rowbar"><i style="width:${Math.min(100, Math.round((x.checkins / daysIn) * 100))}%"></i></div>`, "cover rowtext")}
        ${ov(728, cy - 34, 96, 68, `<div class="ovnum gold" style="font-size:3.3cqw">${fmt(x.pts)}</div><div class="ovsub gold" style="font-size:2cqw">pts</div>`, "cover col")}
        ${hs(60, cy - hh, 905, hh * 2, "go:me", nameOf(x.id))}`; }).join("")}
      ${ringSvg(357, 1072, 52, 11, (msc.goal || 0) / 100, "gSnap")}
      ${ov(318, 1046, 78, 36, `<div class="ovnum" style="font-size:3cqw">${fmt(msc.goal || 0)}%</div>`, "cover")}
      ${ov(450, 1052, 152, 44, `<span class="ovnum" style="font-size:3.3cqw">${msc.sw ? signedTick(msc.lostKg) + " kg" : "–"}</span>`, "cover")}
      ${ov(640, 1052, 140, 44, `<span class="ovnum" style="font-size:3.3cqw">${fmt(msc.weekPts[cw.n] || 0)}</span>`, "cover")}
      ${ov(845, 1052, 78, 44, `<span class="ovnum" style="font-size:3.3cqw">${weekStreak}</span>`, "cover")}
      ${[["weekly", 92], ["consistency", 240], ["progress", 383], ["discipline", 525], ["healthy", 670], ["team", 816]].map(([k, x]) => badgeOverlay(k, ma, x, 1192, 120, 162)).join("")}
      ${hs(305, 360, 222, 58, "go:me", "My progress")}${hs(537, 360, 212, 58, "go:challenge", "Challenges")}${hs(760, 360, 208, 58, "scroll:standings", "Community")}
      ${hs(845, 1155, 115, 40, "go:awards", "View all achievements")}
      ${hs(810, 85, 70, 65, "bell", "Notifications")}${hs(885, 85, 70, 65, "who", "Switch person")}${hs(60, 85, 80, 60, "go:me", "Menu")}
      ${navHotspots([[85, 200, "home"], [235, 405, "board"], [440, 600, "me"], [645, 750, "awards"], [810, 950, "board"]], 1390, 100)}
    </div>`;
  }

  // ---------- Weekly challenge screen ----------
  function weeklyScreen() {
    const id = meOrFirst(), r = rec(id), cw = currentWeek(), today = todayStr(), sc = score(id);
    const rows = [[1, 735], [2, 790], [3, 845], [4, 900], [5, 957], [6, 1013], [0, 1070]];
    const dates = {}; for (let d = cw.w0; d <= cw.w1; d = addDays(d, 1)) dates[dow(d)] = d;
    const doneCount = Object.values(dates).filter((d) => taskDone(r, d)).length, totalTasks = Object.keys(dates).length;
    const pct = totalTasks ? Math.round((doneCount / totalTasks) * 100) : 0;
    return `<div class="screen" id="weeklyScreen">
      <img src="${IMG.weekly}" alt="Stoic by Choice weekly challenge" width="1024" height="1536">
      ${ov(392, 348, 240, 46, `<span class="ovnum" style="font-size:3.4cqw;letter-spacing:.05em">WEEK ${cw.n} OF ${challengeWeeks().length}</span>`, "cover")}
      ${ov(313, 412, 86, 56, `<span class="cd gold" id="cdD">00</span>`, "cover")}
      ${ov(444, 412, 88, 56, `<span class="cd gold" id="cdH">00</span>`, "cover")}
      ${ov(573, 412, 94, 56, `<span class="cd gold" id="cdM">00</span>`, "cover")}
      ${ov(707, 412, 96, 56, `<span class="cd gold" id="cdS">00</span>`, "cover")}
      ${ov(226, 565, 165, 44, `<span class="ovnum left" style="font-size:3.3cqw">${sc.streak} Day${sc.streak === 1 ? "" : "s"}</span>`, "cover left")}
      ${ov(598, 558, 200, 36, `<span class="ovnum left" style="font-size:2.7cqw">${doneCount} / ${totalTasks} Tasks</span>`, "cover left")}
      ${ov(598, 594, 280, 20, `<div class="rowbar green"><i style="width:${pct}%"></i></div>`, "cover")}
      ${ov(888, 588, 76, 30, `<span class="ovval" style="font-size:2.4cqw">${pct}%</span>`, "cover")}
      ${rows.map(([wd, cy]) => {
        const d = dates[wd], done = d && taskDone(r, d), isToday = d === today, can = isToday && d >= settings().start;
        return `${isToday ? ov(172, cy - 26, 786, 52, "", "todayrow") : ""}
          ${ov(262, cy - 22, 623, 44, `<span class="tasktxt">${esc(d ? taskFor(d, settings().start) : DAILY_TASKS[wd])}</span>`, "taskcover")}
          ${ov(895, cy - 24, 50, 48, d ? (done ? "✓" : "") : "–", `cover chk ${done ? "on" : ""}`)}
          ${hs(172, cy - 26, 786, 52, can ? "task" : "tasknot", `${d ? taskFor(d, settings().start) : DAILY_TASKS[wd]} ${d ? shortDate(d) : ""}`, `data-date="${d || ""}"`)}`;
      }).join("")}
      ${hs(140, 1265, 745, 100, "taskToday", "Complete today's task")}
      ${hs(80, 1130, 864, 120, "quote", "Another Stoic thought")}
      ${hs(30, 60, 90, 70, "go:me", "Menu")}${hs(830, 55, 75, 75, "bell", "Notifications")}${hs(915, 55, 80, 75, "who", "Switch person")}
      ${navHotspots([[30, 220, "challenge"], [225, 400, "me"], [445, 565, "awards"], [635, 785, "board"], [850, 960, "calc"]], 1390, 110)}
    </div>`;
  }
  function tickCountdown() {
    const el = $("#cdD"); if (!el) return;
    const cw = currentWeek();
    const end = new Date(addDays(cw.w1, 1) + "T00:00:00").getTime();
    let ms = Math.max(0, end - Date.now());
    const D = Math.floor(ms / 864e5); ms -= D * 864e5; const Hh = Math.floor(ms / 36e5); ms -= Hh * 36e5; const M = Math.floor(ms / 6e4); ms -= M * 6e4; const S = Math.floor(ms / 1e3);
    $("#cdD").textContent = pad(D); $("#cdH").textContent = pad(Hh); $("#cdM").textContent = pad(M); $("#cdS").textContent = pad(S);
  }
  setInterval(tickCountdown, 1000);

  // ---------- Awards showcase screen ----------
  function awardsScreen() {
    const id = meOrFirst(), a = achievements(id), s = settings(), t = todayStr();
    const ws = challengeWeeks();
    const ms = [
      ["Signed Up", !!startWeight(rec(id)), false],
      ["Week 1 Complete", ws[0] && ws[0].w1 < t, ws[0] && ws[0].w0 <= t && t <= ws[0].w1],
      ["Week 4 Consistency", weeks(rec(id)).slice(0, 4).length === 4 && weeks(rec(id)).slice(0, 4).every((w) => w.done && w.allIn), ws[3] && ws[3].w0 <= t && t <= ws[3].w1],
      ["Month 1 Milestone", diffDays(s.start, t) >= 30, diffDays(s.start, t) >= 0 && diffDays(s.start, t) < 30],
      ["Month 2 Milestone", diffDays(s.start, t) >= 60, diffDays(s.start, t) >= 30 && diffDays(s.start, t) < 60],
      ["Challenge Complete", t > s.end, diffDays(s.start, t) >= 60 && t <= s.end],
    ];
    const cells = [["bl", 65, 458], ["weekly", 372, 458], ["monthly", 678, 458], ["resilienceAward", 65, 655], ["consistentAward", 372, 655], ["discipline", 678, 655], ["transformation", 65, 850], ["comeback", 372, 850], ["grand", 678, 850]];
    const target = { bl: "aw-bl", weekly: "aw-weekly", monthly: "aw-monthly", resilienceAward: "aw-resilience", consistentAward: "aw-consistent", grand: "aw-bl" };
    return `<div class="screen">
      <img src="${IMG.awards}" alt="Stoic by Choice awards and achievements" width="1024" height="1536">
      ${cells.map(([k, x, y]) => { const b = BADGES[k], won = b.test(a), lead = false; // awards are only shown once earned, never "leading" during the period
        return `${won ? ov(x + 242, y + 8, 40, 40, "✓", "tick") : lead ? ov(x + 87, y + 150, 116, 30, "Leading", "leadpill") : ov(x, y, 290, k === "grand" || k === "transformation" || k === "comeback" ? 210 : 185, "🔒", "locked soft")}
          ${hs(x, y, 290, k === "grand" || k === "transformation" || k === "comeback" ? 210 : 185, target[k] ? "scroll:" + target[k] : "badge", b.label, `data-badge="${k}"`)}`; }).join("")}
      ${ms.map(([label, done, cur], i) => { const x = [175, 312, 449, 586, 727, 868][i];
        return ov(x - 24, 1141, 48, 48, done ? "✓" : cur ? "★" : "🔒", `ms ${done ? "done" : cur ? "cur" : "lock"}`) + hs(x - 60, 1135, 120, 105, "milestone", label, `data-label="${esc(label)}" data-state="${done ? "done" : cur ? "cur" : "lock"}"`); }).join("")}
      ${hs(55, 285, 200, 55, "go:challenge", "My challenge")}${hs(575, 285, 175, 55, "go:me", "Progress")}${hs(755, 285, 215, 55, "go:board", "Leaderboard")}
      ${hs(60, 75, 80, 60, "go:me", "Menu")}${hs(825, 70, 70, 65, "bell", "Notifications")}${hs(900, 70, 70, 65, "who", "Switch person")}
      ${hs(60, 1265, 905, 110, "quote", "Another Stoic thought")}
      ${navHotspots([[80, 170, "home"], [210, 335, "challenge"], [380, 480, "me"], [512, 668, "awards"], [695, 810, "board"], [855, 945, "calc"]], 1400, 100)}
    </div>`;
  }

  // ---------- Pages ----------
  // Key dates: when each challenge week and month ends, and when its winner is revealed.
  function viewCalendar() {
    const t = todayStr(), wr = weekResults(), mr = monthResults(), s = settings();
    const cw = wr.find((w) => w.w0 <= t && t <= w.w1), cm = mr.find((m) => m.from <= t && t <= m.to), nw = nextWeighDay(t);
    const left = (d) => { const n = diffDays(t, d); return n === 0 ? "ends today" : n === 1 ? "1 day left" : n + " days left"; };
    const day = (d, o = { weekday: "short", day: "numeric", month: "short" }) => d ? new Date(d + "T12:00:00").toLocaleDateString("en-GB", o) : "–";
    const status = (x, end) => x.done ? `<span class="pill good">✓ Revealed</span>` : end < t ? `<span class="pill warn">Counted · awaiting weigh in</span>` : x.w0 <= t || x.from <= t ? `<span class="pill">⏳ Counting</span>` : `<span class="muted">Upcoming</span>`;
    const card = (icon, title, big, sub) => `<div class="kd"><span class="kdi">${icon}</span><div class="grow"><small>${title}</small><b>${big}</b><span>${sub}</span></div></div>`;
    const nW = wr.length, nM = mr.length, wDone = wr.filter((w) => w.w1 < t).length, mDone = mr.filter((m) => m.to < t).length;
    const total = diffDays(s.start, s.end) + 1, dayN = Math.min(total, Math.max(0, diffDays(s.start, t) + 1));
    const meter = (icon, label, n, of, done) => `<div class="cnt"><span>${icon}</span><b>${n}<small> of ${of}</small></b><em>${label}</em><div class="bar"><i style="width:${(done / of) * 100}%"></i></div><small>${done} completed · ${of - done} to go</small></div>`;
    return `<section class="card">
        <h2>🔢 The challenge in numbers</h2>
        <div class="cntgrid">
          ${meter("📅", "days", dayN, total, Math.max(0, dayN - 1))}
          ${meter("🗓️", "weeks", cw ? cw.n : wDone, nW, wDone)}
          ${meter("📆", "months", cm ? cm.n : mDone, nM, mDone)}
        </div>
        <p class="note">${nW} challenge weeks (Tuesday to Monday; the last one is 5 days) and ${nM} challenge months (4 weeks each; Month ${nM} is the final stretch), ${total} days from ${day(s.start, { day: "numeric", month: "long", year: "numeric" })} to ${day(s.end, { day: "numeric", month: "long", year: "numeric" })}.</p>
      </section>
      <section class="card">
        <h2>📅 Key dates</h2>
        <div class="kdgrid">
          ${cw ? card("🗓️", `Week ${cw.n} of ${nW} ends`, day(cw.w1, { weekday: "long", day: "numeric", month: "long" }), `${left(cw.w1)} · revealed ${day(cw.presentOn)}`) : ""}
          ${cm ? card("📆", `Month ${cm.n} of ${nM} ends`, day(cm.to, { weekday: "long", day: "numeric", month: "long" }), `${left(cm.to)} · revealed ${day(cm.presentOn)}`) : ""}
          ${nw ? card("⚖️", "Next official weigh in", day(nw, { weekday: "long", day: "numeric", month: "long" }), diffDays(t, nw) === 0 ? "today" : `in ${diffDays(t, nw)} day${diffDays(t, nw) === 1 ? "" : "s"}`) : ""}
          ${card("🏆", "Grand Finale", day(s.end, { weekday: "long", day: "numeric", month: "long", year: "numeric" }), `results revealed at ${new Date(state.finale && state.finale.revealAt ? state.finale.revealAt : finaleTime(settings(), state.config)).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Johannesburg" })} · ${diffDays(t, s.end)} days to go`)}
        </div>
        <p class="note">Weeks run Tuesday to Monday (7 days). Months are 4 full weeks (28 days). Winners are revealed at the next Saturday weigh in, after the administrator enters the weights.</p>
      </section>
      <section class="card"><h2>📆 All ${nM} challenge months</h2>
        <div class="kdtable">${mr.map((m) => `<div class="kdrow ${m.from <= t && t <= m.to ? "now" : ""}"><div class="grow"><b>Month ${m.n} of ${nM}${m.label.includes("final") ? " · final stretch" : ""}</b><span class="kdlen">${diffDays(m.from, m.to) + 1} days</span><small>${day(m.from)} → ends <b>${day(m.to)}</b> · reveal ${day(m.presentOn)}</small></div>${status(m, m.to)}</div>`).join("")}</div>
      </section>
      <section class="card"><h2>🗓️ All ${nW} challenge weeks</h2>
        <div class="kdtable">${wr.map((w) => `<div class="kdrow ${w.w0 <= t && t <= w.w1 ? "now" : ""}"><div class="grow"><b>Week ${w.n} of ${nW}</b><span class="kdlen">${diffDays(w.w0, w.w1) + 1} days · Month ${(mr.find((m) => m.from <= w.w0 && w.w0 <= m.to) || {}).n || "–"}</span><small>${day(w.w0)} → ends <b>${day(w.w1)}</b> · reveal ${day(w.presentOn)}</small></div>${status(w, w.w1)}</div>`).join("")}</div>
      </section>`;
  }

  function viewChallenge() {
    return `<button class="btn ghost full keydates" data-go="calendar">📅 Key dates: week and month ending dates</button>
      ${weeklyScreen()}
      ${weekSummaryCard(currentWeek(), "📒 This week so far")}
      <section class="card">${prizeStrip()}<p class="note center" style="margin:8px 0 0">Revealed together at the Grand Finale · ${esc(finaleLabel())}</p></section>
      ${upcomingCard()}
      ${treatCard(score(state.me).treats)}`;
  }


  const MEDAL_NAMES = { weekly: "Weekly Challenge Award", monthly: "Monthly Challenge Award", consistent: "Most Consistent Participant", resilience: "Resilience Challenge Award", discipline: "Discipline Champion", transformation: "Biggest Transformation", comeback: "Comeback Champion", special: "Special recognition" };
  const MEDAL_IMG = { weekly: "img/award-weekly.webp", monthly: "img/award-monthly.webp", consistent: "img/award-most-consistent.webp", resilience: "img/award-resilience.webp" };
  function winnerChips(ids) { return ids.length ? ids.map((x) => `<span class="chipwin">${avatar(x)}${esc(nameOf(x))}</span>`).join("") : `<span class="muted">No winner yet</span>`; }

  function viewAwards() {
    const wr = weekResults(), mr = monthResults(), over = isOver(), cw = currentWeek(), today = todayStr();
    const curWeek = wr.find((w) => w.n === cw.n), curMonth = mr.find((m) => m.from <= today && today <= m.to);
    const bl = biggestLoser(), cons = consistentLeaders(), res = resilienceLeaders();
    const awardImg = (src, alt) => `<img class="award-img" src="${src}" alt="${esc(alt)}" loading="lazy">`;
    const head = (src, title, line) => `<summary><img class="award-thumb" src="${src}" alt=""><div class="grow"><b>${title}</b><small>${line}</small></div><span class="chev">›</span></summary>`;
    const names = (ids) => (ids && ids.length ? ids.map((x) => esc(nameOf(x).split(" ")[0])).join(" & ") : "nobody yet");
    return `<button class="btn ghost full keydates" data-go="calendar">📅 Key dates: when each week and month ends and is revealed</button>
      ${awardsScreen()}
      <details class="card award" id="aw-weekly">${head(IMG.weekly_award, "Weekly Challenge Award", (() => { const last = wr.filter((w) => w.done).pop(); const pend = wr.find((w) => !w.done && w.presentOn && w.w0 <= today); const next = pend ? `Week ${pend.n}: presented at the weigh in on ${fmtDate(pend.presentOn, { weekday: "short", day: "numeric", month: "short" })}` : ""; return last ? `Week ${last.n}: ${names(last.winners)}${next ? " · " + next : ""}` : next || "–"; })())}
        ${awardImg(IMG.weekly_award, "Stoic by Choice Weekly Challenge Award")}
        <p class="note">For the most scorecard points in a challenge week (Tuesday to Monday). Presented at the next official Saturday weigh in, once the administrator has entered the weights. Nobody is named before then.</p>
        ${wr.filter((w) => !w.done && w.w0 <= today).map((w) => `<p class="note">⏳ Week ${w.n} (${shortDate(w.w0)} to ${shortDate(w.w1)}): ${w.closed ? "closed" : "running"} · presented at the weigh in on <b>${w.presentOn ? fmtDate(w.presentOn, { weekday: "long", day: "numeric", month: "long" }) : "–"}</b></p>`).join("")}
        <div class="list">${wr.filter((w) => w.done).reverse().map((w) => `<div class="item"><div class="grow"><div class="t">Week ${w.n}</div><div class="s">${shortDate(w.w0)} to ${shortDate(w.w1)}</div></div><div>${winnerChips(w.winners)}</div></div>`).join("") || `<div class="empty">No weekly awards presented yet.</div>`}</div>
      </details>

      <details class="card award" id="aw-monthly">${head(IMG.monthly_award, "Monthly Challenge Award", (() => { const last = mr.filter((m) => m.done).pop(); const pend = mr.find((m) => !m.done && m.presentOn && m.from <= today); const next = pend ? `${pend.label}: presented at the weigh in on ${fmtDate(pend.presentOn, { weekday: "short", day: "numeric", month: "short" })}` : ""; return last ? `${last.label}: ${names(last.winners)}${next ? " · " + next : ""}` : next || "–"; })())}
        ${awardImg(IMG.monthly_award, "Stoic by Choice Monthly Challenge Award")}
        <p class="note">For the most scorecard points in a challenge month: 4 full challenge weeks (28 days, Tuesday to Monday), so every month is equal. Each month closes on a Monday and is presented at the official weigh in that Saturday, once the administrator has entered the weights. Nobody is named before then.</p>
        <div class="list">${challengeMonths().map((m) => { const x = mr.find((y) => y.key === m.key) || {}; return `<div class="item"><div class="grow"><div class="t">${esc(m.label)}</div><div class="s">Presented ${x.presentOn ? fmtDate(x.presentOn, { weekday: "short", day: "numeric", month: "short" }) : "–"}</div></div><div>${x.done ? winnerChips(x.winners) : m.from <= today ? "⏳" : ""}</div></div>`; }).join("")}</div>
        ${mr.filter((m) => !m.done && m.from <= today).map((m) => `<p class="note">⏳ ${esc(m.label)}: ${m.closed ? "closed" : "running"} · presented at the weigh in on <b>${m.presentOn ? fmtDate(m.presentOn, { weekday: "long", day: "numeric", month: "long" }) : "–"}</b></p>`).join("")}

      </details>

      <details class="card award" id="aw-consistent">${head(IMG.consistent, "Most Consistent Participant · Greatest Effort", isSealed() ? `⭐ ${rand(prizes().effort)} · 🔒 sealed until the Grand Finale` : `⭐ ${rand(prizes().effort)} · Winner: ${names(cons)}`)}
        ${awardImg(IMG.consistent, "Stoic by Choice Greatest Effort Award")}
        <p class="prizetag center">⭐ Prize: ${rand(prizes().effort)}</p>
        <p class="note">Presented at the Grand Finale to the person with the most healthy habit points: movement, steps, water, sleep, journal, tasks and daily check ins. Weight is not part of this award.</p>
        ${isSealed() ? `<p class="center">🔒 Sealed until ${esc(finaleLabel())}</p>` : `<p><b>Winner:</b> ${winnerChips(cons)}</p>`}
      </details>

      <details class="card award" id="aw-resilience">${head(IMG.resilience, "Resilience Challenge Award", isSealed() ? "🔒 Sealed until the Grand Finale" : `Winner: ${names(res)}`)}
        ${awardImg(IMG.resilience, "Stoic by Choice Resilience Challenge Award")}
        <p class="note">Presented at the end of the challenge to whoever logged the most exercise minutes: the one who kept climbing.</p>
        ${isSealed() ? `<p class="center">🔒 Sealed until the Grand Finale</p>` : `<p><b>Winner:</b> ${winnerChips(res)}</p>`}
      </details>

      ${state.manualAwards.length ? `<details class="card fold"><summary>🎖️ Medals from the administrator (${state.manualAwards.length})</summary><div class="list">${state.manualAwards.slice().reverse().map((x) => `<div class="item">${avatar(x.memberId, "md")}<div class="grow"><div class="t">${esc(nameOf(x.memberId))}: ${esc(MEDAL_NAMES[x.award] || x.award)}</div><div class="s">${shortDate(x.date)}${x.note ? " · " + esc(x.note) : ""}</div></div></div>`).join("")}</div></details>` : ""}

      <details class="card award final" id="aw-bl">${head(!isSealed() ? IMG.bl_trophy : IMG.bl_medal_black, "Biggest Loser Award · the final award", isSealed() ? `🏆 ${rand(prizes().bl)} grand prize · 🔒 sealed` : `🏆 ${rand(prizes().bl)} · Champion: ${bl ? names([bl]) : "–"}`)}
        ${!isSealed() && bl ? `
          ${awardImg(IMG.bl_trophy, "Stoic by Choice Biggest Loser Award trophy")}
          <p class="center">${avatar(bl, "lg")}<br><b class="big">${esc(nameOf(bl))}</b><br><small>${(() => { const x = (R().blTop || []).find((y) => y.id === bl); return x ? fmt(x.pct, 1) + "% of starting weight lost" : ""; })()}</small></p>
          <div class="grid2">${awardImg(IMG.bl_medal_gold, "Stoic by Choice Biggest Loser medal")}${awardImg(IMG.bl_plaque, "Stoic by Choice Biggest Loser plaque")}</div>
          <p class="note center">The champion receives the Biggest Loser trophy, the gold medal and the plaque, and is crowned Grand Champion.</p>`
        : `
          ${awardImg(IMG.bl_medal_black, "Stoic by Choice Biggest Loser medal")}
          <p class="center">🔒 <b>Sealed until the Grand Finale</b><br>${esc(finaleLabel())}</p>
          <p class="prizetag big center">🏆 Grand prize: ${rand(prizes().bl)}</p>
          <p class="note">Presented last. The winner is the person who loses the highest percentage of their starting weight, measured only at the official Saturday weigh ins recorded by the administrator (and never faster than the safe pace). The champion receives the trophy, the gold medal and the plaque.</p>
          <div class="grid3">${awardImg(IMG.bl_trophy, "Stoic by Choice Biggest Loser trophy")}${awardImg(IMG.bl_medal_gold, "Stoic by Choice Biggest Loser gold medal")}${awardImg(IMG.bl_plaque, "Stoic by Choice Biggest Loser plaque")}</div>`}
      </details>`;
  }

  // Me tab trophy cabinet
  function trophyCabinet(id) {
    const a = achievements(id), items = [];
    if (a.weeklyWins) items.push([IMG.weekly_award, `Weekly Challenge Award × ${a.weeklyWins}`]);
    if (a.monthlyWins) items.push([IMG.monthly_award, `Monthly Challenge Award × ${a.monthlyWins}`]);
    if (isOver() && a.isConsistent) items.push([IMG.consistent, "Most Consistent Participant"]);
    if (isOver() && a.isResilience) items.push([IMG.resilience, "Resilience Challenge Award"]);
    if (isOver() && a.isBL) items.push([IMG.bl_trophy, "Biggest Loser Award"]);
    state.manualAwards.filter((x) => x.memberId === id).forEach((x) => items.push([MEDAL_IMG[x.award] || IMG.weekly_award, `${MEDAL_NAMES[x.award] || x.award}${x.note ? ": " + x.note : ""}`]));
    const badges = Object.entries(BADGES).filter(([k, b]) => !["bl", "resilienceAward", "consistentAward", "grand", "weekly", "monthly"].includes(k) && b.test(a)).map(([, b]) => b.label);
    return `<section class="card"><h2>🏆 My trophy cabinet</h2>
      ${items.length ? `<div class="cabinet">${items.map(([src, l]) => `<figure><img src="${src}" alt="${esc(l)}" loading="lazy"><figcaption>${esc(l)}</figcaption></figure>`).join("")}</div>` : `<p class="muted">No trophies yet. Win a week to earn your first Weekly Challenge Award.</p>`}
      ${badges.length ? `<div class="chips" style="margin-top:8px">${badges.map((b) => `<span class="chip on">★ ${esc(b)}</span>`).join("")}</div>` : ""}
      <button class="btn ghost small" data-go="awards" style="margin-top:10px">See all awards</button></section>`;
  }

  function onHotspot(el) {
    const act = el.dataset.hs;
    if (act.startsWith("go:")) return go(act.slice(3));
    if (act.startsWith("scroll:")) { const t = document.getElementById(act.slice(7)); if (t) { if (t.tagName === "DETAILS") t.open = true; t.scrollIntoView({ behavior: "smooth", block: "start" }); } return; }
    if (act === "who") return accountMenu();
    if (act === "bell") { const n = nextWeighDay(); return toast(`🔔 ${n ? `Next official weigh in: <b>${fmtDate(n, { weekday: "long", day: "numeric", month: "long" })}</b>.` : "No weigh ins left."} ${tipFor(state.tipShift++)}`, 6000); }
    if (act === "quote") { const [q, who] = cheer(); return toast(`“${esc(q)}”<br><small style="opacity:.8">${esc(who)}</small>`, 6000); }
    if (act === "boardmode") { const order = isSealed() ? ["week", "month"] : ["week", "month", "overall"]; state.boardMode = order[(order.indexOf(state.boardMode) + 1) % 3]; return render(); }
    if (act === "badge") { const b = BADGES[el.dataset.badge], a = achievements(meOrFirst()); const won = b.test(a);
      return toast(`${won ? "🏅 <b>Earned:</b>" : b.lead && b.lead(a) ? "🔥 <b>You are leading:</b>" : "🔒 <b>Locked:</b>"} ${esc(b.label)}<br><small>${esc(b.how)}</small>`, 5000); }
    if (act === "milestone") return toast(`${el.dataset.state === "done" ? "✅" : el.dataset.state === "cur" ? "⭐ In progress:" : "🔒"} ${esc(el.dataset.label)}`);
    if (act === "tasknot") return toast("You can only tick today's task. Past days are locked, and future days are not open yet.");
    if (act === "task" || act === "taskToday") {
      const d = todayStr();
      if (act === "task" && el.dataset.date !== d) return toast("You can only tick today's task.");
      if (d < settings().start || d > settings().end) return toast(`The challenge tasks run from ${fmtDate(settings().start, { day: "numeric", month: "long" })}.`);
      return toggleTask(d);
    }
  }
  async function toggleTask(d) {
    if (!state.me) return;
    const r = rec(state.me), existing = (r.tasks || []).find((t) => t.date === d);
    if (existing) { if (await send({ member: state.me, action: "delete", type: "tasks", id: existing.id })) { render(); toast("Task unticked."); } return; }
    await addEntry("tasks", { id: uid(), date: d }, `✅ ${esc(taskFor(d, settings().start))}: done.`, true);
  }

  // =====================================================================
  // Admin Control Centre (administrators only; needs PIN + email code)
  // =====================================================================
  const ADMIN_TABS = [["dashboard", "🏠", "Dashboard"], ["participants", "👥", "Participants"], ["profiles", "📝", "Participant details"], ["challenges", "🎯", "Challenges"], ["scoring", "🏆", "Leaderboard & scoring"],
    ["awards", "🎖️", "Awards & badges"], ["progress", "📈", "Progress"], ["comms", "✉️", "Communications"], ["feedback", "💡", "Feedback"], ["reports", "📊", "Reports"], ["settings", "⚙️", "Settings"], ["audit", "📜", "Audit log"]];
  const statusPill = (s) => `<span class="pill ${s === "active" ? "good" : s === "pending" ? "" : "warn"}">${esc(s)}</span>`;
  const memberOptions = (sel = "") => MEMBERS.map((m) => `<option value="${m.id}" ${m.id === sel ? "selected" : ""}>${esc(m.name)}</option>`).join("");

  function viewAdmin() {
    const A = state.admin;
    if (!A) return `<section class="card"><h2>Admin Control Centre</h2><p class="muted">Loading…</p></section>`;
    const t = state.adminTab;
    const body = { dashboard: admDashboard, participants: admParticipants, profiles: admProfiles, challenges: admChallenges, scoring: admScoring, awards: admAwards, progress: admProgress, comms: admComms, feedback: admFeedback, reports: admReports, settings: admSettings, audit: admAudit }[t]();
    return `<section class="card admin-head"><div class="row"><img src="img/avatars/navigator.webp" class="av lg" alt=""><div><div class="brand">Stoic by Choice</div><div class="brand-sub">Admin Control Centre</div></div></div>
      <div class="admtabs">${ADMIN_TABS.map(([k, i, l]) => { const n = k === "feedback" ? (A.feedback || []).filter((f) => f.status === "new").length : 0; return `<button class="${k === t ? "on" : ""}" data-adm="${k}">${i} ${l}${n ? ` <span class="pill newpill">${n}</span>` : ""}</button>`; }).join("")}</div></section>${body}`;
  }

  function admDashboard() {
    const A = state.admin, accts = A.accounts, t = todayStr();
    const active = accts.filter((a) => a.status === "active").length, pending = accts.filter((a) => a.status === "pending").length;
    const groups = new Set(accts.map((a) => a.group).filter(Boolean)).size;
    const activeCh = state.challenges.filter((c) => c.start <= t && c.end >= t).length;
    const issued = state.manualAwards.length + R().weeks.filter((w) => w.done && w.winners.length).length + R().months.filter((m) => m.done && m.winners.length).length;
    const days = []; for (let i = 6; i >= 0; i--) days.push(addDays(t, -i));
    const counts = days.map((d) => (d < settings().start ? 0 : MEMBERS.filter((m) => dayStatus(rec(m.id), d).any).length)), max = Math.max(1, MEMBERS.length);
    const al = A.alerts || [];
    return `<section class="card ${al.length ? "alertcard" : ""}"><h2>🛡️ Safety alerts</h2>${al.length ? `<div class="list">${al.map((x) => `<div class="item"><div class="grow"><div class="t">${x.level === "high" ? "🔴" : "🟠"} ${esc(x.text)}</div></div></div>`).join("")}</div><p class="note">Private to you. Check in kindly; for under 18s, speak to their parent and the clinic.</p>` : `<p class="note" style="margin:0">✅ No safety concerns: nobody under 18 is eating too little, nobody is losing faster than the safe pace, and everyone has logged in the last 3 days.</p>`}</section>
      <section class="card"><div class="kpis">
        <div class="kpi"><b>${active}</b><span>Participants</span></div><div class="kpi"><b>${groups}</b><span>Groups</span></div>
        <div class="kpi"><b>${activeCh}</b><span>Active challenges</span></div><div class="kpi"><b>${issued}</b><span>Awards issued</span></div></div>
        ${pending ? `<div class="holiday" style="margin-top:12px">🕓 <b>${pending} registration${pending === 1 ? "" : "s"} waiting for approval.</b> <a href="#" data-adm="participants">Review now</a></div>` : ""}
      </section>
      <section class="card"><h2>Participation this week</h2>
        <div class="bars">${days.map((d, i) => `<div class="barcol"><div class="barfill" style="height:${(counts[i] / max) * 100}%"><span>${counts[i]}</span></div><small>${fmtDate(d, { weekday: "short" })}</small></div>`).join("")}</div>
        <p class="note">Participants who checked in each day, out of ${MEMBERS.length}.</p></section>
      <section class="card"><h2>Quick actions</h2><div class="grid2">
        <button class="btn" data-adm="challenges">➕ Create challenge</button><button class="btn ghost" data-adm="comms">📣 Send announcement</button>
        <button class="btn ghost" data-adm="progress">⚖️ Record weigh in</button><button class="btn ghost" data-adm="reports">📊 Export reports</button></div></section>`;
  }

  function admParticipants() {
    const A = state.admin, seeds = A.seeds || [];
    const order = { pending: 0, active: 1, suspended: 2 };
    const accts = [...A.accounts].sort((a, b) => order[a.status] - order[b.status] || a.name.localeCompare(b.name));
    return `<section class="card"><h2>👥 Participants (${accts.length})</h2><p class="note">Approve registrations and link each person to their record. The six pre loaded records hold the weights from the notebook.</p>
      <div class="list">${accts.map((a) => {
        const locked = a.lockedUntil > Date.now();
        return `<div class="acct">
          <div class="row">${avatarImg(a.avatar, "lg")}<div class="grow"><b>${esc(a.name)}</b> ${statusPill(a.status)} ${a.role === "admin" ? '<span class="pill">admin</span>' : ""} ${locked ? '<span class="pill warn">PIN locked</span>' : ""}<br>
            <small>${a.mobile ? esc(a.mobile) + " · " : ""}joined ${shortDate(a.created.slice(0, 10))}${a.memberId ? " · record: " + esc(a.memberId) : ""}</small></div></div>
          ${a.status === "pending" ? `<div class="row wrap" style="margin-top:8px"><select data-link="${a.id}" style="flex:1">
              ${seeds.filter((x) => !x.linked).map((x) => `<option value="${x.id}" ${x.id === a.suggestedMember ? "selected" : ""}>Link to ${esc(x.name)}'s pre loaded record</option>`).join("")}
              <option value="new" ${!a.suggestedMember ? "selected" : ""}>Start a new record</option></select>
            <button class="btn small" data-act-acct="approve" data-id="${a.id}">Approve</button></div>` : ""}
          <div class="row wrap" style="margin-top:8px;gap:6px">
            <input data-group="${a.id}" value="${esc(a.group)}" placeholder="Group (e.g. Kgosana family)" style="flex:1;min-width:140px"><button class="btn small ghost" data-act-acct="group" data-id="${a.id}">Save group</button>
            ${locked ? `<button class="btn small ghost" data-act-acct="unlock" data-id="${a.id}">Unlock PIN</button>` : ""}
            ${a.id !== state.account.id ? `
              ${a.status === "suspended" ? `<button class="btn small ghost" data-act-acct="reactivate" data-id="${a.id}">Reactivate</button>` : `<button class="btn small ghost" data-act-acct="suspend" data-id="${a.id}">Suspend</button>`}
              <button class="btn small ghost" data-act-acct="resetPin" data-id="${a.id}">Reset PIN</button>
              <button class="btn small ghost" data-act-acct="${a.role === "admin" ? "removeAdmin" : "makeAdmin"}" data-id="${a.id}">${a.role === "admin" ? "Remove admin" : "Make admin"}</button>
              <button class="btn small ghost danger" data-act-acct="deleteAccount" data-id="${a.id}">Delete</button>` : ""}
          </div></div>`; }).join("") || `<div class="empty">No registrations yet. Share the site link so the crew can sign up.</div>`}</div></section>`;
  }

  function admChallenges() {
    const t = todayStr();
    return `<section class="card"><h2>🎯 Create a challenge</h2>
      <form class="form" id="chForm"><label>Title<input id="chTitle" required maxlength="80" placeholder="e.g. 10 000 steps"></label>
        <label>Description (optional)<input id="chDesc" maxlength="300" placeholder="What counts as done?"></label>
        <div class="grid2"><label>Type<select id="chType"><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option></select></label>
        <label>Points<input id="chPts" type="number" min="0" max="500" value="10" required></label>
        <label>Start<input id="chStart" type="date" value="${t}" required></label><label>End<input id="chEnd" type="date" value="${addDays(t, 6)}" required></label></div>
        <button class="btn full">Create challenge</button></form></section>
      <section class="card"><h2>Challenges</h2>
        <div class="list">${state.challenges.map((c) => `<div class="item"><div class="grow"><div class="t">${esc(c.title)} <span class="pill">${esc(c.type)}</span></div><div class="s">${shortDate(c.start)} to ${shortDate(c.end)} · ${c.points} pts${c.description ? " · " + esc(c.description) : ""}</div></div><button class="del" data-rm-ch="${c.id}" aria-label="Remove">✕</button></div>`).join("") || `<div class="empty">No custom challenges yet.</div>`}</div>
        <p class="note">Built in every week: the daily scorecard (up to 18 or 20 points a day), the 7 daily challenges and the treat token week.</p></section>`;
  }

  function admScoring() {
    const c = state.admin.config, P = c.points;
    const labels = { checkin: "Check in", food: "Eat and log 3 meals", eatPenalty: "Skipped meals / starving (negative)", flagPenalty: "More than 3 bad habit flags (negative)", weighMinMet: "Weigh in: minimum loss met", weighLost: "Weigh in: lost, below minimum", weighBelowMin: "Weigh in: no weight lost (negative)", weighGain: "Weigh in: weight gained (negative)", exercise: "Move (20 min or step goal)", water: "Water goal", sleep: "Sleep goal", reflect: "Journal", task: "Daily challenge", weighin: "Official weigh in", missed: "Missed day (negative)", perPercent: "Per 1% of weight lost", treatBonus: "Treat token week bonus" };
    return `<section class="card"><h2>🏆 Scoring rules</h2><p class="note">Points are always calculated by the server from these rules. Changes apply to everyone immediately and are recorded in the audit log.</p>
      <form class="form" id="scoreForm"><div class="grid2">${Object.keys(labels).map((k) => `<label>${labels[k]}<input type="number" data-pt="${k}" value="${P[k]}" step="1"></label>`).join("")}
        <label>Daily water goal (glasses)<input type="number" id="wTarget" min="1" max="20" value="${(c.water || {}).target || 8}"></label>
        <label>Sleep goal (hours, adults)<input type="number" id="sTarget" min="4" max="12" step="0.5" value="${(c.sleep || {}).target || 7}"></label>
        <label>Treat week exercise minutes<input type="number" id="trMin" value="${c.treat.minutes}"></label><label>Treat day extra kcal<input type="number" id="trKcal" value="${c.treat.kcal}"></label></div>
        <button class="btn full">Save scoring rules</button></form></section>
      <section class="card"><h2>⚖️ Disputes and point adjustments</h2>
        <form class="form" id="adjForm"><div class="grid2"><label>Participant<select id="adjWho">${memberOptions()}</select></label>
          <label>Points (+ or −)<input id="adjPts" type="number" required min="-1000" max="1000"></label>
          <label>Date<input id="adjDate" type="date" value="${todayStr()}"></label><label>Reason<input id="adjWhy" required maxlength="200" placeholder="e.g. Forgot to log on Tuesday, confirmed"></label></div>
          <button class="btn full">Approve adjustment</button></form>
        <div class="list">${(state.admin.adjustments || []).slice().reverse().map((x) => `<div class="item"><div class="grow"><div class="t">${esc(nameOf(x.memberId))}: ${x.points > 0 ? "+" : ""}${x.points} pts</div><div class="s">${shortDate(x.date)} · ${esc(x.reason)} · by ${esc(x.by)}</div></div><button class="del" data-rm-adj="${x.id}" aria-label="Remove">✕</button></div>`).join("") || `<div class="empty">No adjustments.</div>`}</div></section>`;
  }

  function admAwards() {
    const r = R();
    return `<section class="card"><h2>🎖️ Automatic awards</h2>
      <table><tr><th>Award</th><th>Current holder</th></tr>
        ${r.weeks.filter((w) => w.done).slice(-4).reverse().map((w) => `<tr><td>Weekly · week ${w.n}</td><td>${winnerChips(w.winners)}</td></tr>`).join("")}
        ${r.months.filter((m) => m.done).reverse().map((m) => `<tr><td>Monthly · ${esc(m.label)}</td><td>${winnerChips(m.winners)}</td></tr>`).join("")}
        <tr><td>Resilience Challenge Award</td><td>${isSealed() ? "🔒 sealed" : winnerChips(r.resilience)}</td></tr>
        <tr><td>Most Consistent Participant (Greatest Effort)</td><td>${isSealed() ? "🔒 sealed" : winnerChips(r.consistent)}</td></tr>
        <tr><td><b>Biggest Loser (presented last)</b></td><td>${isSealed() ? "🔒 sealed" : r.biggestLoser ? winnerChips([r.biggestLoser]) : "–"}</td></tr></table>
      <p class="note">Weekly and monthly awards go to the most effort points in the period. Final awards are sealed, even for you, until the Grand Finale (Settings). Biggest Loser = highest % lost at official weigh ins; Greatest Effort = most healthy habit points; Resilience = most exercise minutes.</p></section>
      <section class="card"><h2>Issue a medal</h2>
        <form class="form" id="medalForm"><div class="grid2"><label>Participant<select id="mdWho">${memberOptions()}</select></label>
          <label>Award<select id="mdAward">${Object.entries(MEDAL_NAMES).map(([k, l]) => `<option value="${k}">${esc(l)}</option>`).join("")}</select></label></div>
          <label>Note<input id="mdNote" maxlength="200" placeholder="e.g. Never missed a Saturday weigh in"></label><button class="btn full">Issue medal</button></form>
        <div class="list">${state.manualAwards.slice().reverse().map((x) => `<div class="item">${avatar(x.memberId, "md")}<div class="grow"><div class="t">${esc(nameOf(x.memberId))}: ${esc(MEDAL_NAMES[x.award] || x.award)}</div><div class="s">${shortDate(x.date)}${x.note ? " · " + esc(x.note) : ""}</div></div><button class="del" data-rm-medal="${x.id}" aria-label="Revoke">✕</button></div>`).join("")}</div></section>`;
  }

  function admProgress() {
    return `<section class="card"><h2>📈 Participation and habits</h2><div style="overflow-x:auto"><table class="records">
      <tr><th>Name</th><th>Points 🔒</th><th>Check ins</th><th>Missed</th><th>Streak</th><th>Exercise min</th><th>Tasks this week</th><th>🥛 Water goal days</th><th>🌙 Sleep goal nights</th><th>📓 Journal days</th><th>🔒 Lost</th><th>🔒 To goal</th></tr>
      ${MEMBERS.map((m) => score(m.id)).map((x) => `<tr><td><b>${esc(nameOf(x.id))}</b></td><td>${x.total === null ? "sealed" : fmt(x.total)}</td><td>${x.checkins}</td><td>${x.missed}</td><td>${x.streak}</td><td>${fmt(x.exerciseMinutes)}</td><td>${x.tasksThisWeek}</td><td>${x.waterGoalDays || 0}</td><td>${x.sleepGoalDays || 0}</td><td>${x.journalDays || 0}</td><td>${x.sw ? fmt(x.lostKg, 1) + " kg" : "–"}</td><td>${x.goal !== null ? fmt(x.goal) + "%" : "–"}</td></tr>`).join("")}
    </table></div></section>${recordsCard()}`;
  }

  function admComms() {
    return `<section class="card"><h2>✉️ Send an announcement</h2>
      <form class="form" id="annForm"><label>To<select id="annTo"><option value="all">Everyone</option>${memberOptions()}</select></label>
        <label>Title<input id="annTitle" maxlength="80" placeholder="e.g. Weigh in this Saturday at 8:00"></label>
        <label>Message<textarea id="annMsg" rows="4" maxlength="600" required placeholder="Encouragement, reminders or news…"></textarea></label>
        <label>Show until (optional)<input id="annUntil" type="date"></label>
        <div class="chips">${["Remember: official weigh in this Saturday! ⚖️", "Proud of every one of you this week. Keep going! 🔥", "Hydration challenge: 8 glasses today 🥛", "Missed a day? The obstacle is the way. Start again today."].map((x) => `<button type="button" class="chip" data-tpl="${esc(x)}">${esc(x)}</button>`).join("")}</div>
        <button class="btn full">Send</button></form></section>
      ${admParents()}
      <section class="card"><h2>Sent messages</h2><div class="list">${(state.admin.announcements || []).map((x) => `<div class="item"><div class="grow"><div class="t">${esc(x.title || "Announcement")} <span class="pill">${x.to === "all" ? "everyone" : esc(nameOf(x.to))}</span></div><div class="s">${shortDate(x.date)}${x.until ? " · until " + shortDate(x.until) : ""} · ${esc(x.message.slice(0, 90))}</div></div><button class="del" data-rm-ann="${x.id}" aria-label="Remove">✕</button></div>`).join("") || `<div class="empty">No announcements yet.</div>`}</div></section>`;
  }

  function admParents() {
    const A = state.admin, links = A.parents || {}, reps = A.parentReports || [];
    const kids = Object.keys(links);
    return `<section class="card"><h2>👨‍👩‍👧 Parent flags</h2>
      <p class="note" style="margin-top:0">Every morning at 07:30 each parent gets yesterday's habit flags for their children in their 📥 inbox (and a phone notification), only when something needs attention. Parents in the app also see "My children's habits" on Home, live. Parents not on the app yet can get the message by WhatsApp below.</p>
      ${reps.length ? reps.map((x) => `<div class="kid"><div class="msghead"><b>${esc(x.offApp ? x.parentName + " (not on the app yet)" : nameOf(x.parent))}</b><span class="pill ${x.flags ? "warn" : "good"}">${x.flags ? "⚠️ " + x.flags : "✅ 0"} · ${shortDate(x.date)}</span></div>
        <div class="msgbody" style="margin:6px 0;font-size:.9rem">${esc(x.text).replace(/\n/g, "<br>")}</div>
        <a class="btn ghost full" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(`Stoic by Choice: your children's habits for ${shortDate(x.date)}\n\n${x.text}\n\n${SENDER}`)}">💬 Send by WhatsApp</a></div>`).join("") : `<div class="empty">No parent links with active children yet.</div>`}
      <details style="margin-top:12px"><summary><b>Edit who is whose parent</b></summary>
        <form class="form" id="parentsForm"><p class="note">Type parents' first names or record names, separated by commas (e.g. thandi, thabo). A parent who joins later is matched by first name.</p>
        ${kids.map((c) => `<label>${esc(nameOf(c) || c)}<input data-par="${esc(c)}" value="${esc((links[c] || []).join(", "))}" maxlength="120"></label>`).join("")}
        <button class="btn full">Save parent links</button></form></details></section>`;
  }
  function admFeedback() {
    const all = state.admin.feedback || [], f = state.fbFilter || "open";
    const shown = all.filter((x) => f === "all" || (f === "open" ? !["done", "not now"].includes(x.status) : x.status === f));
    const areas = {}; for (const x of all) areas[x.area] = (areas[x.area] || 0) + 1;
    return `<section class="card"><h2>💡 Feedback and ideas from participants</h2>
      <p class="note" style="margin-top:0">${all.length} received · ${all.filter((x) => x.status === "new").length} new. A reply goes to that person's inbox.${Object.keys(areas).length ? " Most asked about: " + Object.entries(areas).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([a, n]) => `${esc(a)} (${n})`).join(", ") + "." : ""}</p>
      <div class="seg">${[["open", "Open"], ["new", "New"], ["planned", "Planned"], ["done", "Done"], ["all", "All"]].map(([k, l]) => `<button type="button" class="${k === f ? "on" : ""}" data-fbf="${k}">${l}</button>`).join("")}</div></section>
      ${shown.map((x) => `<section class="card fbitem"><div class="msghead"><b>${esc(x.name)}</b><span class="pill">${esc(x.area)}</span><span class="msgdate">${shortDate(x.date)}${x.time ? " · " + esc(x.time) : ""}</span></div>
        <div class="msgbody" style="margin:8px 0">${esc(x.message).replace(/\n/g, "<br>")}</div>
        ${x.reply ? `<div class="fbreply"><b>Your reply:</b> ${esc(x.reply).replace(/\n/g, "<br>")}</div>` : ""}
        <div class="form"><label>Status<select data-fbstatus="${x.id}">${Object.entries(FB_STATUS).map(([k, [i, l]]) => `<option value="${k}" ${k === x.status ? "selected" : ""}>${i} ${l === "Sent" ? "New" : l}</option>`).join("")}</select></label>
          <label>Reply (optional, goes to their inbox)<textarea data-fbreply="${x.id}" rows="2" maxlength="600" placeholder="Thank you! We will add this next week."></textarea></label>
          <div class="grid2"><button type="button" class="btn" data-fbsave="${x.id}">Save</button><button type="button" class="btn ghost" data-fbdel="${x.id}">🗑️ Remove</button></div></div></section>`).join("") || `<section class="card"><div class="empty">Nothing here yet.</div></section>`}`;
  }

  function admReports() {
    return `<section class="card"><h2>📊 Export reports</h2><p class="note">Downloads open in Excel or Google Sheets. Reports with weights are confidential; store them safely.</p>
      <div class="form"><button class="btn ghost full" data-csv="participation">Participation and points</button>
        <button class="btn ghost full" data-csv="weekly">Weekly and monthly winners</button>
        <button class="btn ghost full" data-csv="weights">🔒 Weigh in records</button>
        <button class="btn ghost full" data-csv="audit">Audit log</button></div></section>
      <section class="card"><h2>💾 Backup and restore</h2>
        <p class="note">Your data is kept safely by Netlify and is not affected when you update or redeploy the app. For extra peace of mind, download a full backup now and then (for example after each Saturday weigh in) and keep it somewhere private: it contains everyone's health information.</p>
        <div class="form"><button class="btn full" data-backup>⬇️ Download full backup</button>
        <label class="btn ghost full center" style="cursor:pointer">⬆️ Restore from a backup file<input type="file" id="restoreFile" accept=".json,application/json" hidden></label></div>
        <h3>🗓️ Automatic daily backups</h3><p class="note">The app saves a full copy every night at 02:00 and keeps the last 30 days, in the same secure store.</p>
        ${state.backups ? (state.backups.length ? `<div class="list">${state.backups.map((d) => `<div class="item"><div class="grow"><div class="t">${fmtDate(d, { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</div></div><button class="btn ghost" data-restoresnap="${d}">Restore</button></div>`).join("")}</div>` : `<p class="note">No daily backups yet; the first is made tonight at 02:00.</p>`) : `<button class="btn ghost full" data-listbackups>Show daily backups</button>`}</section>`;
  }

  function admSettings() {
    const c = state.admin.config, s = settings();
    const f = state.finale || {};
    const local = (() => { const d = new Date(f.revealAt || finaleTime(s, c)); const z = new Date(d.getTime() + 2 * 3600e3); return z.toISOString().slice(0, 16); })();
    return `<section class="card"><h2>🏆 Grand Finale reveal</h2>
      <p class="note">The final results (Biggest Loser and Greatest Effort) stay sealed for everyone, including you, until this moment. Status: <b>${f.revealed ? "revealed 🎉" : "sealed 🔒"}</b></p>
      <form class="form" id="finaleForm"><label>Reveal automatically on (South African time)<input type="datetime-local" id="fAt" value="${local}"></label><button class="btn ghost full">Save reveal time</button></form>
      <div class="row" style="margin-top:10px">${f.revealed ? `<button class="btn ghost full" data-finale="hide">🔒 Seal the results again</button>` : `<button class="btn full" data-finale="reveal">🎬 Reveal the winners now</button>`}</div>
      <form class="form" id="prizeForm" style="margin-top:12px"><div class="grid2"><label>Grand prize, Biggest Loser (R)<input type="number" id="pzBl" min="0" value="${prizes().bl}"></label><label>Greatest effort prize (R)<input type="number" id="pzEf" min="0" value="${prizes().effort}"></label></div><button class="btn ghost full">Save prizes</button></form>
      <p class="note">Tip: gather the crew, press "Reveal the winners now", then open the Board tab together and tap through the ceremony.</p></section>
    <section class="card"><h2>⚙️ Challenge settings</h2>
      <form class="form" id="datesForm"><div class="grid2"><label>Start<input type="date" id="sStart" value="${s.start}" required></label><label>End<input type="date" id="sEnd" value="${s.end}" required></label></div>
        <button class="btn ghost full">Save challenge dates</button></form></section>
      <section class="card"><h2>🔐 PIN policy and access</h2>
        <form class="form" id="polForm"><div class="grid2">
          <label>Wrong PINs before a lock<input type="number" id="pMax" min="3" max="10" value="${c.pin.maxAttempts}"></label>
          <label>Lock time (minutes)<input type="number" id="pLock" min="1" max="1440" value="${c.pin.lockMinutes}"></label>
</div>
          <label class="tick-row"><input type="checkbox" id="pAuto" ${c.autoApprove ? "checked" : ""}> Approve new registrations automatically</label>
          <label>Challenge rules<textarea id="pRules" rows="7">${esc(c.rulesText)}</textarea></label>
          <label>Privacy policy (POPIA)<textarea id="pPriv" rows="7">${esc(c.privacyText)}</textarea></label>
          <button class="btn full">Save settings</button></form>
        <p class="note">Everyone signs in with their name and PIN. If someone forgets their PIN, reset it in Participants.</p></section>`;
  }

  function admAudit() {
    return `<section class="card"><h2>📜 Audit log</h2><p class="note">Every administrator action, sign in, PIN lock and view of health data is recorded here.</p>
      <div class="list">${(state.admin.audit || []).map((x) => `<div class="item"><div class="grow"><div class="t">${esc(x.action)}${x.target ? " · " + esc(x.target) : ""}</div><div class="s">${new Date(x.at).toLocaleString("en-ZA")} · ${esc(x.by ? x.by.name : "system")}${x.detail ? " · " + esc(String(x.detail).slice(0, 120)) : ""}</div></div></div>`).join("")}</div></section>`;
  }

  function csvDownload(name, rows) {
    const csv = rows.map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv" }));
    a.download = `stoic-by-choice-${name}-${todayStr()}.csv`; document.body.appendChild(a); a.click(); a.remove();
  }

  function bindAdmin() {
    const v = $("#view"), A = state.admin;
    $$("[data-adm]", v).forEach((b) => b.addEventListener("click", (e) => { e.preventDefault(); state.adminTab = b.dataset.adm; render(); }));
    if (!A) return;
    $$("[data-act-acct]", v).forEach((b) => b.addEventListener("click", async () => {
      const action = b.dataset.actAcct, id = b.dataset.id, body = { action, accountId: id };
      if (action === "approve") body.memberId = $(`[data-link="${id}"]`).value;
      if (action === "group") body.group = $(`[data-group="${id}"]`).value;
      if (action === "resetPin") { const pin = prompt("Type a new 4 digit PIN for this person, then tell it to them privately:"); if (!pin) return; body.pin = pin.trim(); }
      if (action === "deleteAccount") { if (!confirm("Delete this account? This cannot be undone.")) return; body.deleteData = confirm("Also delete their challenge data (POPIA deletion request)? Press Cancel to keep their records."); }
      if (["suspend", "makeAdmin", "removeAdmin"].includes(action) && !confirm("Are you sure?")) return;
      await adminSend(body, "✓ Done.");
    }));
    const on = (id, fn) => { const f = $("#" + id, v); if (f) f.addEventListener("submit", (e) => { e.preventDefault(); fn(); }); };
    on("heightForm", async () => {
      const list = $$("[data-hcm]", v).map((i) => [i.dataset.hcm, Number(i.value)]).filter(([id, h]) => h >= 90 && h <= 230 && h !== rec(id).profile.heightCm);
      if (!list.length) return toast("No new heights to save (use 90 to 230 cm).");
      for (const [memberId, heightCm] of list) if (!(await adminSend({ action: "profile", memberId, profile: { heightCm } }))) return;
      toast(`📏 ${list.length} height${list.length > 1 ? "s" : ""} saved. BMI is now shown.`);
    });
    on("chForm", () => adminSend({ action: "challenge", title: $("#chTitle").value, description: $("#chDesc").value, type: $("#chType").value, points: $("#chPts").value, start: $("#chStart").value, end: $("#chEnd").value }, "🎯 Challenge created."));
    $$("[data-rm-ch]", v).forEach((b) => b.addEventListener("click", () => confirm("Remove this challenge?") && adminSend({ action: "challenge", remove: b.dataset.rmCh })));
    on("scoreForm", () => { const points = {}; $$("[data-pt]", v).forEach((i) => (points[i.dataset.pt] = Number(i.value))); adminSend({ action: "config", config: { ...A.config, points, treat: { minutes: Number($("#trMin").value), kcal: Number($("#trKcal").value) }, water: { target: Number($("#wTarget").value) }, sleep: { target: Number($("#sTarget").value) } } }, "🏆 Scoring rules saved."); });
    on("adjForm", () => adminSend({ action: "adjust", memberId: $("#adjWho").value, points: $("#adjPts").value, date: $("#adjDate").value, reason: $("#adjWhy").value }, "✓ Adjustment approved."));
    $$("[data-rm-adj]", v).forEach((b) => b.addEventListener("click", () => confirm("Remove this adjustment?") && adminSend({ action: "adjust", remove: b.dataset.rmAdj })));
    on("medalForm", () => adminSend({ action: "award", memberId: $("#mdWho").value, award: $("#mdAward").value, note: $("#mdNote").value }, "🎖️ Medal issued."));
    $$("[data-rm-medal]", v).forEach((b) => b.addEventListener("click", () => confirm("Revoke this medal?") && adminSend({ action: "award", remove: b.dataset.rmMedal })));
    $$("[data-tpl]", v).forEach((b) => b.addEventListener("click", () => { $("#annMsg").value = b.dataset.tpl; }));
    $$("[data-fbf]", v).forEach((b) => b.addEventListener("click", () => { state.fbFilter = b.dataset.fbf; render(); }));
    $$("[data-fbsave]", v).forEach((b) => b.addEventListener("click", () => { const id = b.dataset.fbsave; const reply = $(`[data-fbreply="${id}"]`, v).value.trim(); adminSend({ action: "feedback", id, status: $(`[data-fbstatus="${id}"]`, v).value, reply }, reply ? "✅ Saved. Reply sent to their inbox." : "✅ Saved."); }));
    $$("[data-fbdel]", v).forEach((b) => b.addEventListener("click", () => { if (confirm("Remove this feedback?")) adminSend({ action: "feedback", id: b.dataset.fbdel, remove: true }, "Removed."); }));
    on("parentsForm", () => { const parents = {}; $$("[data-par]", v).forEach((i) => (parents[i.dataset.par] = i.value.split(",").map((x) => x.trim().toLowerCase()).filter(Boolean))); adminSend({ action: "parents", parents }, "👨‍👩‍👧 Parent links saved."); });
    on("annForm", () => adminSend({ action: "announce", to: $("#annTo").value, title: $("#annTitle").value, message: $("#annMsg").value, until: $("#annUntil").value }, "📣 Announcement sent."));
    $$("[data-rm-ann]", v).forEach((b) => b.addEventListener("click", () => adminSend({ action: "announce", remove: b.dataset.rmAnn })));
    on("prizeForm", () => adminSend({ action: "config", config: { ...A.config, prizes: { bl: Number($("#pzBl").value), effort: Number($("#pzEf").value) } } }, "🏆 Prizes saved."));
    on("finaleForm", () => { const v2 = $("#fAt").value; adminSend({ action: "finale", revealAt: v2 ? v2 + ":00+02:00" : "" }, "🏆 Reveal time saved."); });
    $$("[data-finale]", v).forEach((b) => b.addEventListener("click", () => {
      if (b.dataset.finale === "reveal" && !confirm("Reveal the winners to everyone now? This cannot be kept secret afterwards.")) return;
      adminSend(b.dataset.finale === "reveal" ? { action: "finale", reveal: true } : { action: "finale", hide: true }, b.dataset.finale === "reveal" ? "🎉 Revealed! Open the Board tab together." : "🔒 Sealed again.");
    }));
    on("datesForm", () => adminSend({ action: "settings", start: $("#sStart").value, end: $("#sEnd").value }, "📅 Dates saved."));
    on("polForm", () => adminSend({ action: "config", config: { ...A.config, pin: { maxAttempts: Number($("#pMax").value), lockMinutes: Number($("#pLock").value), hardLockAfter: 50 }, autoApprove: $("#pAuto").checked, rulesText: $("#pRules").value, privacyText: $("#pPriv").value } }, "⚙️ Settings saved."));
    $$("[data-profform]", v).forEach((f) => f.addEventListener("submit", (e) => {
      e.preventDefault(); const id = f.dataset.profform, fd = new FormData(f), p = {};
      for (const k of ["age", "heightCm", "goalWeight", "startWeight", "beforeWeight", "waistCm", "hipCm"]) { const x = fd.get(k); if (x !== null && x !== "") p[k] = Number(String(x).replace(",", ".")); }
      p.sex = fd.get("sex"); p.junior = !!fd.get("junior");
      for (const k of [...ABOUT_FIELDS.map((x) => x[0]), "adminNote"]) p[k] = String(fd.get(k) || "").trim();
      if (!p.waistCm) delete p.waistCm; if (!p.hipCm) delete p.hipCm;
      adminSend({ action: "profile", memberId: id, profile: p }, `✓ ${esc(nameOf(id).split(" ")[0])}'s details saved.`);
    }));
    on("buddyForm", () => { const pairs = $$("[data-bud]", v).filter((x) => x.value).map((x) => [x.dataset.bud, x.value]); adminSend({ action: "buddies", pairs }, "🤝🏾 Buddy pairs saved."); });
    $("[data-wsum]", v)?.addEventListener("click", async () => { try { await navigator.clipboard.writeText(state.weighSummary || ""); toast("📋 Summary copied. Paste it in the WhatsApp group."); } catch { toast("Copy did not work on this phone."); } });
    $("[data-print]", v)?.addEventListener("click", () => window.print());
    $("[data-listbackups]", v)?.addEventListener("click", async () => { try { const d = await api("admin", { method: "POST", body: { action: "backups" } }); applyState(d); state.backups = d.backups || []; render(); } catch (e) { toast("⚠️ " + esc(e.message)); } });
    $$("[data-restoresnap]", v).forEach((b) => b.addEventListener("click", () => { if (confirm(`Restore everyone's data to the backup of ${b.dataset.restoresnap}? Anything logged after that will be replaced.`)) adminSend({ action: "restoreSnapshot", date: b.dataset.restoresnap }, "✓ Daily backup restored."); }));
    // Group weigh in (health data)
    const gf = $("#groupForm", v);
    if (gf) {
      const fill = () => { const d = $("#gDate").value; $$("[data-gw]", gf).forEach((inp) => { const r = rec(inp.dataset.gw); inp.value = (d === "start" ? startWeight(r) : (r.weights.find((x) => x.date === d) || {}).kg) || ""; }); };
      $("#gDate").addEventListener("change", fill); fill();
      gf.addEventListener("submit", async (e) => {
        e.preventDefault();
        const val = (sel, id) => { const x = $(`[${sel}="${id}"]`, gf); return x && x.value ? Number(x.value) : null; };
        const entries = $$("[data-gw]", gf).filter((i) => i.value).map((i) => ({ memberId: i.dataset.gw, kg: Number(i.value), waistCm: val("data-gwaist", i.dataset.gw), hipCm: val("data-ghip", i.dataset.gw) }));
        state.weighShow = $("#gDate").value;
        if (await adminSend({ action: "weights", date: $("#gDate").value, entries }, `⚖️ Saved ${entries.length} weights.`)) confetti();
      });
    }
    $$("[data-backup]", v).forEach((b) => b.addEventListener("click", async () => {
      try {
        const data = await api("admin", { method: "POST", body: { action: "backup" } });
        const el = document.createElement("a");
        el.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 1)], { type: "application/json" }));
        el.download = `stoic-by-choice-backup-${todayStr()}.json`; document.body.appendChild(el); el.click(); el.remove();
        toast("💾 Backup downloaded. Keep it somewhere private.");
      } catch (e) { toast("⚠️ " + esc(e.message)); }
    }));
    $("#restoreFile", v)?.addEventListener("change", async (e) => {
      const f = e.target.files[0]; if (!f) return;
      let backup; try { backup = JSON.parse(await f.text()); } catch { return toast("⚠️ That file could not be read."); }
      if (!confirm(`Restore the backup from ${backup.created || "this file"}? Current data with the same names will be replaced.`)) return;
      await adminSend({ action: "restore", backup }, "💾 Backup restored.");
    });
    // Reports
    $$("[data-csv]", v).forEach((b) => b.addEventListener("click", () => {
      const k = b.dataset.csv, s = settings();
      if (k === "participation") csvDownload("participation", [["Name", "Group", "Avatar", "Points", "Check ins", "Missed days", "Current streak", "Best streak", "Exercise minutes", "Treat tokens", "Weekly wins", "Monthly wins"],
        ...ranking("overall").map((x) => [nameOf(x.id), meta(x.id).group, AVATARS[meta(x.id).avatar]?.name, x.total, x.checkins, x.missed, x.streak, x.bestStreak, x.exerciseMinutes, x.treats ? x.treats.earned : 0, x.weeklyWins, x.monthlyWins])]);
      if (k === "weekly") csvDownload("winners", [["Period", "From", "To", "Winner(s)", "Points"], ...R().weeks.filter((w) => w.done).map((w) => [`Week ${w.n}`, w.w0, w.w1, w.winners.map(nameOf).join(" & "), w.top]), ...R().months.filter((m) => m.done).map((m) => [m.label, m.from, m.to, m.winners.map(nameOf).join(" & "), m.top])]);
      if (k === "weights") { const days = ["2026-11-14", ...weighDays()]; csvDownload("weigh-ins", [["Name", "23 Nov 2024", ...days, "Goal"], ...MEMBERS.map((m) => { const r = rec(m.id); return [m.name, r.profile.beforeWeight, ...days.map((d) => (r.weights.find((x) => x.date === d) || {}).kg ?? ""), r.profile.goalWeight]; })]); }
      if (k === "audit") csvDownload("audit", [["When", "Who", "Action", "Target", "Detail"], ...(A.audit || []).map((x) => [x.at, x.by ? x.by.name : "", x.action, x.target || "", x.detail || ""])]);
    }));
  }

  // ---------- Events ----------
  function bind() {
    const v = $("#view");
    $("[data-install]", v)?.addEventListener("click", installApp);
    $$("[data-kidday]", v).forEach((b) => b.addEventListener("click", () => { state.kidDay = b.dataset.kidday; render(); }));
    $("#fbForm", v)?.addEventListener("submit", async (e) => {
      e.preventDefault(); const msg = $("#fbMsg").value.trim(); if (msg.length < 3) return toast("Please write your idea or feedback.");
      if (await send({ action: "feedback", area: $("#fbArea").value, message: msg })) { render(); toast("💡 Thank you! Your feedback was sent to Dr Benadette."); setTimeout(() => $("#feedback")?.scrollIntoView({ behavior: "smooth" }), 50); }
    });
    $$("[data-plan]", v).forEach((b) => b.addEventListener("click", async () => {
      const [n, i] = b.dataset.plan.split(":").map(Number), [label, items] = myPlan()[n][i];
      b.disabled = true;
      const time = ($("#ptime") && $("#ptime").value) || nowHM();
      if (time > nowHM()) { b.disabled = false; return toast("The time eaten cannot be later than now."); }
      const entries = items.map(([id, amt]) => FOOD_BY_ID[id].unit ? { id: uid(), date: todayStr(), meal: "Meal " + n, foodId: id, amount: amt, time } : { id: uid(), date: todayStr(), meal: "Meal " + n, foodId: id, qty: amt, time });
      const r0 = rec(state.me), before = dayPoints(r0, todayStr()), was = dayStatus(r0, todayStr()).any;
      if (await send({ action: "addMany", type: "foods", entries, planLabel: label })) {
        const gained = dayPoints(rec(state.me), todayStr()) - before; render();
        toast(`🍽️ Meal ${n}: ${esc(label)} logged.${gained > 0 ? ` <b>+${gained} pts</b>` : ""}${was ? "" : " Checked in for the day ✓"}`);
      } else b.disabled = false;
    }));
    $$("[data-quick]", v).forEach((b) => b.addEventListener("click", () => {
      const q = QUICK_MOVES[Number(b.dataset.quick)];
      if (q[4] === "ask") { const i = ACTIVITIES.findIndex((x) => x[0] === q[1]); $("#act").value = String(i); $("#act").dispatchEvent(new Event("change")); $("#exForm").scrollIntoView({ behavior: "smooth" }); setTimeout(() => { $("#rounds").select(); $("#rounds").focus(); }, 400); return toast("🛗 Enter the floor and <b>how many times</b> you climbed, then tap Add."); }
      const e = quickEntry(q); b.disabled = true;
      addEntry("exercises", { id: uid(), date: todayStr(), ...e }, `💪🏾 ${esc(e.activity)} logged (${fmt(e.kcal)} kcal).`, true);
    }));
    $$("[data-allow]", v).forEach((b) => b.addEventListener("click", () => {
      const id = b.dataset.allow, tm = ($("#ptime") && $("#ptime").value) || nowHM();
      if (tm > nowHM()) return toast("The time eaten cannot be later than now.");
      b.disabled = true;
      addEntry("foods", { id: uid(), date: todayStr(), meal: "Snack", foodId: id, qty: 1, time: ($("#ptime") && $("#ptime").value) || nowHM() }, `${id === "provita" ? "🍘 Provita" : "🍊 Fruit"} logged.`);
    }));
    $$("[data-routine]", v).forEach((b) => b.addEventListener("click", async () => {
      const k = b.dataset.routine, [, , label] = ROUTINE.find((x) => x[0] === k);
      if (await addEntry("routine", { id: uid(), date: todayStr(), kind: k }, `✅ ${esc(label)}.`)) { if (k === "write") toast("✍🏾 Well done. If you wrote in the app, your Journal page keeps it private."); }
    }));
    $$("[data-cheer]", v).forEach((b) => b.addEventListener("click", async () => { b.disabled = true; if (await send({ action: "cheer", to: b.dataset.cheer, emoji: "👏🏾" })) { render(); toast("👏🏾 Cheer sent!"); } else b.disabled = false; }));
    $$("[data-push]", v).forEach((b) => b.addEventListener("click", async () => {
      const a = b.dataset.push;
      if (a === "on") return pushOn();
      try { if (a === "test") { await api("push/test", { method: "POST", body: {} }); toast("Test sent. It should arrive in a few seconds."); } if (a === "off") { const reg = await navigator.serviceWorker.ready, sub = await reg.pushManager.getSubscription(); if (sub) await sub.unsubscribe(); await api("push/off", { method: "POST", body: {} }); await load(); render(); toast("Reminders turned off."); } } catch (e) { toast("⚠️ " + esc(e.message)); }
    }));
    $$("[data-pp]", v).forEach((c) => c.addEventListener("change", async () => { const prefs = {}; $$("[data-pp]", v).forEach((x) => { prefs[x.dataset.pp] = x.checked; }); try { await api("push/prefs", { method: "POST", body: { prefs } }); state.push.prefs = prefs; toast("✓ Saved."); } catch (e) { toast("⚠️ " + esc(e.message)); } }));
    $("[data-sync]", v)?.addEventListener("click", async () => { try { const d = await api("data", { method: "POST", body: { action: "syncCode" } }); applyState(d); state.newSyncCode = d.syncCode; render(); } catch (e) { toast("⚠️ " + esc(e.message)); } });
    $("[data-share]", v)?.addEventListener("click", async () => { const text = state.reportText || ""; try { if (navigator.share) await navigator.share({ text }); else { await navigator.clipboard.writeText(text); toast("📋 Copied. Paste it in WhatsApp."); } } catch {} });
    $("[data-installhide]", v)?.addEventListener("click", () => { try { localStorage.setItem("sbc_install_hide", "1"); } catch {} render(); });
    $$("[data-hs]", v).forEach((b) => b.addEventListener("click", (e) => { e.preventDefault(); onHotspot(b); }));
    $$("[data-log]", v).forEach((b) => b.addEventListener("click", () => { state.jMood = undefined; state.jChecks = null; go(b.dataset.log); }));
    const setWater = async (n) => {
      const r = rec(state.me), d = state.date, wt = waterTarget(), before = glasses(r, d);
      n = Math.max(0, Math.min(30, n));
      if (await send({ action: "add", type: "water", entry: { id: uid(), date: d, glasses: n } })) {
        render();
        if (n >= wt && before < wt) { confetti(); toast(`${glassSvg(true, "sm")} Water goal reached! +${POINTS.water} pts. Well done.`); }
      }
    };
    $$("[data-water]", v).forEach((b) => b.addEventListener("click", () => setWater(glasses(rec(state.me), state.date) + Number(b.dataset.water))));
    $$("[data-setwater]", v).forEach((b) => b.addEventListener("click", () => setWater(Number(b.dataset.setwater))));
    $$("[data-sleeph]", v).forEach((b) => b.addEventListener("click", () => { const cur = sleepOn(rec(state.me), state.date); const h = state.sleepH !== undefined ? state.sleepH : cur ? cur.hours : sleepTarget(rec(state.me)); state.sleepH = Math.max(0, Math.min(16, h + Number(b.dataset.sleeph))); render(); }));
    $$("[data-sleepset]", v).forEach((b) => b.addEventListener("click", () => { state.sleepH = Number(b.dataset.sleepset); render(); }));
    $$("[data-sleepq]", v).forEach((b) => b.addEventListener("click", () => { state.sleepQ = b.dataset.sleepq; render(); }));
    $$("[data-act=saveSleep]", v).forEach((b) => b.addEventListener("click", async () => {
      const r = rec(state.me), d = todayStr(), cur = sleepOn(r, d), stg = sleepTarget(r);
      const hours = state.sleepH !== undefined ? state.sleepH : cur ? cur.hours : stg, quality = state.sleepQ !== undefined ? state.sleepQ : cur ? cur.quality : null;
      state.sleepH = undefined; state.sleepQ = undefined;
      await addEntry("sleep", { id: cur ? cur.id : uid(), date: d, hours, quality }, `🌙 ${fmt(hours, 1)} hours of sleep saved.${hours >= stg ? " Well rested!" : " Aim for an earlier night tonight."}`);
    }));
    $$("[data-mood]", v).forEach((b) => b.addEventListener("click", () => { state.jMood = b.dataset.mood; $$("[data-mood]", v).forEach((x) => x.classList.toggle("on", x === b)); }));
    $$("[data-jc]", v).forEach((b) => b.addEventListener("click", () => { const id = b.dataset.jc; state.jChecks.has(id) ? state.jChecks.delete(id) : state.jChecks.add(id); b.classList.toggle("on"); b.setAttribute("aria-pressed", state.jChecks.has(id)); }));
    $("#jSave", v)?.addEventListener("click", async () => {
      const r = rec(state.me), d = state.date, cur = r.reflections.find((x) => x.date === d);
      const mood = state.jMood !== undefined ? state.jMood : cur ? cur.mood : null, checks = [...(state.jChecks || [])], text = ($("#jText") || { value: "" }).value.trim();
      if (!mood && !checks.length && !text) return toast("😊 Tap how you feel, or tap a picture.");
      const pr = $(".fold label") ? $(".fold label").childNodes[0].textContent.trim() : "";
      const entry = { id: cur ? cur.id : uid(), date: d, text, mood, checks, prompt: pr };
      state.jMood = undefined; state.jChecks = null;
      if (cur) { if (await send({ action: "add", type: "reflections", entry })) { render(); toast("📓 Journal updated ✓"); } }
      else await addEntry("reflections", entry, `📓 Journal saved ✓ ${checks.length ? checks.length + " good things today!" : ""}`, true);
    });

    $$("[data-act=revealNext]", v).forEach((b) => b.addEventListener("click", () => { state.revealStep = (state.revealStep || 0) + 1; render(); confetti(); setTimeout(confetti, 400); const el = $$(".stage.shown").pop(); if (el) el.scrollIntoView({ behavior: "smooth", block: "center" }); }));
    $$("[data-act=checkin]", v).forEach((b) => b.addEventListener("click", async () => { b.disabled = true; await addEntry("checkins", { id: uid(), date: todayStr() }, "👋🏾 Checked in! Have a great day.", true); }));
    $$("[data-cdays]", v).forEach((b) => b.addEventListener("click", () => { state.chartDays = Number(b.dataset.cdays); render(); }));
    $$(".chartbox", v).forEach((box) => $$("[data-tip]", box).forEach((g) => g.addEventListener("click", () => { $(".ctip", box).textContent = g.dataset.tip; $$(".bar-g", box).forEach((x) => x.classList.toggle("sel", x === g)); })));
    $$("[data-act=reflect]", v).forEach((b) => b.addEventListener("click", reflectModal));
    $$("[data-mode]", v).forEach((b) => b.addEventListener("click", () => { state.boardMode = b.dataset.mode; render(); }));
    $$("[data-chal]", v).forEach((b) => b.addEventListener("click", async () => {
      const c = state.challenges.find((x) => x.id === b.dataset.chal);
      await addEntry("challenges", { id: uid(), date: todayStr(), challengeId: c.id }, `🎯 ${esc(c.title)}: done! +${c.points} pts`, true);
    }));
    $$("[data-go]", v).forEach((b) => b.addEventListener("click", () => go(b.dataset.go)));
    $$("[data-nav]", v).forEach((b) => b.addEventListener("click", () => {
      state.jChecks = null;
      const d = addDays(state.date, Number(b.dataset.nav)); if (d <= todayStr()) { state.date = d; render(); }
    }));
    $("#dateInput", v)?.addEventListener("change", (e) => { if (e.target.value && e.target.value <= todayStr()) { state.date = e.target.value; render(); } });
    $$("[data-act=nextTip]", v).forEach((b) => b.addEventListener("click", () => { state.tipShift++; render(); }));
    $$("[data-act=nextQuote]", v).forEach((b) => b.addEventListener("click", () => { state.quoteShift++; render(); }));
    $$("[data-act=useTreat]", v).forEach((b) => b.addEventListener("click", async () => {
      if (await send({ member: state.me, action: "add", type: "treats", entry: { id: uid(), date: todayStr() } })) {
        render(); confetti(); toast(`🍦 Treat unlocked for today: +${TREAT.kcal} kcal added to your target. Savour it!`);
      }
    }));
    $$("[data-act=switch]", v).forEach((b) => b.addEventListener("click", accountMenu));

    $$("[data-del]", v).forEach((b) => b.addEventListener("click", async () => {
      if (!confirmDelete()) return;
      if (await send({ member: state.me, action: "delete", type: b.dataset.del, id: b.dataset.id })) { render(); toast("Removed."); }
    }));

    // Food
    const ff = $("#foodForm", v);
    if (ff) {
      let picked = null, qty = 1, amount = 100, custom = false;
      const showPicked = () => {
        const box = $("#fpicked");
        if (!picked) { box.classList.add("hidden"); $("#fadd").disabled = !custom; return; }
        box.classList.remove("hidden");
        if (picked.unit) {
          const chips = picked.unit === "ml" ? [200, 250, 300, 330, 500] : GRAM_CHIPS;
          box.innerHTML = `${notAllowedNote(picked)}<div class="row between"><div><b>${esc(picked.name)}</b><br><small>${picked.kcal} kcal ${esc(picked.serving)}${/raw/.test(picked.serving) ? " · weigh it raw" : ""}</small></div><button type="button" class="del" data-clear aria-label="Clear">✕</button></div>
            <div class="row between" style="margin-top:8px;gap:10px"><label style="flex:1">How much (${picked.unit})<input type="text" id="famt" inputmode="numeric" data-int autocomplete="off" value="${amount}"></label>
            <div class="kcalbig" id="fkc">${foodKcal(picked, amount)} <small>kcal</small></div></div>
            <div class="chips" style="margin-top:6px">${chips.map((g) => `<button type="button" class="chip ${g === amount ? "on" : ""}" data-amt="${g}">${g} ${picked.unit}</button>`).join("")}</div>`;
          $("#famt", box).addEventListener("input", (e) => { amount = Math.max(0, Math.round(Number(e.target.value) || 0)); $("#fkc").innerHTML = `${foodKcal(picked, amount)} <small>kcal</small>`; });
          $$("[data-amt]", box).forEach((b) => b.addEventListener("click", () => { amount = Number(b.dataset.amt); showPicked(); }));
          $("[data-clear]", box).addEventListener("click", () => { picked = null; $("#fsearch").value = ""; showPicked(); $("#fsearch").focus(); });
          $("#fadd").disabled = false;
          return;
        }
        box.innerHTML = `${notAllowedNote(picked)}<div class="row between"><div><b>${esc(picked.name)}</b><br><small>${esc(picked.serving)} · ${picked.kcal} kcal each</small></div><button type="button" class="del" data-clear aria-label="Clear">✕</button></div>
          <div class="row between" style="margin-top:8px"><div class="seg">${SERVINGS.map((q) => `<button type="button" class="${q === qty ? "on" : ""}" data-qty="${q}">${q === 0.5 ? "½" : q === 1.5 ? "1½" : q}</button>`).join("")}</div>
          <div class="kcalbig">${Math.round(picked.kcal * qty)} <small>kcal</small></div></div>`;
        $$("[data-qty]", box).forEach((b) => b.addEventListener("click", () => { qty = Number(b.dataset.qty); showPicked(); }));
        $("[data-clear]", box).addEventListener("click", () => { picked = null; $("#fsearch").value = ""; showPicked(); $("#fsearch").focus(); });
        $("#fadd").disabled = false;
      };
      const pick = (f) => { pickedMeal = null; picked = f; qty = 1; amount = f.def || 100; custom = false; $("#fcustom").classList.add("hidden"); $("#fresults").innerHTML = ""; $("#fsearch").value = f.name; showPicked(); };
      $("#fsearch").addEventListener("input", () => {
        const q = $("#fsearch").value; picked = null; showPicked();
        const res = searchFoods(q);
        $("#fresults").innerHTML = q.trim().length < 2 ? "" : res.map((f) => `<button type="button" class="fres" data-pick="${f.id}"><span>${esc(f.name)}<small>${esc(f.serving)}</small></span><b>${f.unit ? f.kcal + "<small>/100" + f.unit + "</small>" : f.kcal}</b></button>`).join("")
          + `<button type="button" class="fres custom" data-customfood><span>✏️ Use “${esc(q.trim())}” as my own food</span></button>`;
        $$("[data-pick]", v).forEach((b) => b.addEventListener("click", () => pick(FOOD_BY_ID[b.dataset.pick])));
        $$("[data-customfood]", v).forEach((b) => b.addEventListener("click", () => { custom = true; $("#fresults").innerHTML = ""; $("#fcustom").classList.remove("hidden"); $("#fname").value = q.trim(); $("#fkcal").focus(); $("#fadd").disabled = false; }));
      });
      $$("[data-foodid]", v).forEach((b) => b.addEventListener("click", () => { pick(FOOD_BY_ID[b.dataset.foodid]); ff.scrollIntoView({ behavior: "smooth" }); }));
      $$("[data-meal]", v).forEach((b) => b.addEventListener("click", () => { state.foodMeal = b.dataset.meal; $("#meal").value = b.dataset.meal; $$("[data-meal]", v).forEach((x) => x.classList.toggle("on", x === b)); $("#fadd").textContent = "Add to " + b.dataset.meal; }));
      let pickedMeal = null;
      $("[data-scan]", v)?.addEventListener("click", scanModal);
      $$("[data-fcat]", v).forEach((b) => b.addEventListener("click", () => {
        state.foodCat = b.dataset.fcat; $$("[data-fcat]", v).forEach((x) => x.classList.toggle("on", x === b));
        const other = state.foodCat === "other";
        $("#step4").classList.toggle("hidden", other); $("#otherPanel").classList.toggle("hidden", !other);
        picked = null; pickedMeal = null; custom = false; $("#fpicked").classList.add("hidden"); $("#fcustom").classList.add("hidden"); $("#fadd").disabled = true;
        if (other) { $("#fsearch").value = ""; $("#fresults").innerHTML = ""; $("#fsearch").focus(); }
        else { $("#fpicklist").innerHTML = catOptions(rec(state.me), state.foodCat); $("#fpicklist").focus(); }
      }));
      $("#fpicklist", v)?.addEventListener("change", (e) => {
        let val = e.target.value;
        if (val.startsWith("own")) { const x = ownFoods(rec(state.me))[Number(val.slice(3))]; if (!x) return; picked = null; pickedMeal = null; custom = true; $("#fcustom").classList.remove("hidden"); $("#fname").value = x.name; $("#fkcal").value = x.kcal; $("#fpicked").classList.add("hidden"); $("#fadd").disabled = false; return; }
        if (val.startsWith("fav")) {
          const x = frequentFoods(rec(state.me))[Number(val.slice(3))]; if (!x) return;
          if (x.type === "plan") { val = x.id; } // continues to the plan meal branch below
          else if (x.type === "custom") { picked = null; pickedMeal = null; custom = true; $("#fcustom").classList.remove("hidden"); $("#fname").value = x.name; $("#fkcal").value = x.kcal; $("#fpicked").classList.add("hidden"); $("#fadd").disabled = false; return; }
          else { pick(FOOD_BY_ID[x.id]); if (x.amount) { amount = x.amount; } if (x.qty) { qty = x.qty; } showPicked(); return; }
        }
        const pm = PLAN_MEALS.find((m) => m.id === val);
        if (pm) { pickedMeal = pm; picked = null; custom = false; $("#fsearch").value = ""; $("#fresults").innerHTML = ""; $("#fcustom").classList.add("hidden");
          const box = $("#fpicked"); box.classList.remove("hidden");
          box.innerHTML = `<div><b>Plan Meal ${pm.n}: ${esc(pm.label)}</b><br><small>${pm.items.map(([fid, q]) => `${esc(FOOD_BY_ID[fid].name)} ${FOOD_BY_ID[fid].unit ? q + " " + FOOD_BY_ID[fid].unit : "× " + q}`).join(" + ")}</small></div><div class="kcalbig" style="margin-top:6px">${pm.kcal} <small>kcal</small></div><p class="note">Weigh raw. Logged together as one meal.</p>`;
          $("#fadd").disabled = false; return; }
        pickedMeal = null;
        const f = FOOD_BY_ID[val]; if (f) { $("#fsearch").value = ""; $("#fresults").innerHTML = ""; pick(f); }
      });
      ff.addEventListener("submit", async (e) => {
        e.preventDefault();
        const tm = $("#ftime").value || nowHM(); if (tm > nowHM()) return toast("The time eaten cannot be later than now.");
        const base = { id: uid(), date: todayStr(), meal: $("#meal").value, time: tm };
        if (pickedMeal) {
          const pm = pickedMeal, entries = pm.items.map(([fid, q]) => ({ id: uid(), date: todayStr(), meal: base.meal, time: tm, foodId: fid, ...(FOOD_BY_ID[fid].unit ? { amount: q } : { qty: q }) }));
          $("#fadd").disabled = true;
          if (await send({ action: "addMany", type: "foods", entries, planLabel: pm.label })) { pickedMeal = null; render(); toast(`🍽️ ${esc(base.meal)}: ${esc(pm.label)} logged (${pm.kcal} kcal).`); learnScan({ type: "plan", id: pm.id, name: pm.label, kcal: pm.kcal }); } else $("#fadd").disabled = false;
          return;
        }
        if (picked && picked.unit) { if (!amount) return toast("Please enter how much."); const pk = picked, am = amount; if (await addEntry("foods", { ...base, foodId: pk.id, amount: am, kcal: foodKcal(pk, am), name: pk.name }, `🍽️ ${esc(pk.name)} (${am} ${pk.unit}): ${foodKcal(pk, am)} kcal logged.`)) learnScan({ type: "food", id: pk.id, name: pk.name, amount: am, kcal: foodKcal(pk, am) }); return; }
        if (picked) { const pk = picked, q = qty; if (await addEntry("foods", { ...base, foodId: pk.id, qty: q, kcal: Math.round(pk.kcal * q), name: pk.name }, `🍽️ ${esc(pk.name)}: ${Math.round(pk.kcal * q)} kcal logged.`)) learnScan({ type: "food", id: pk.id, name: pk.name, qty: q, kcal: Math.round(pk.kcal * q) }); return; }
        if (custom) { const nm = $("#fname").value.trim(), kc = Number($("#fkcal").value); if (!nm || $("#fkcal").value === "") return toast("Please enter the food and its calories."); const prior = rec(state.me).foods.filter((f) => f.custom && (f.name || "").trim().toLowerCase() === nm.toLowerCase()).length; if (await addEntry("foods", { ...base, name: nm, kcal: kc }, `🍽️ ${esc(nm)} logged.${prior === 1 ? " ✏️ Added to <b>My own foods</b>." : ""}`)) learnScan({ type: "custom", name: nm, kcal: kc }); return; }
        toast("Type a food and choose it from the list.");
      });
    }

    // Exercise
    const exForm = $("#exForm", v);
    if (exForm) {
      const upd = () => {
        const a = $("#act").value; const custom = a === "custom", act = custom ? null : ACTIVITIES[a];
        $("#customWrap").style.display = custom ? "grid" : "none";
        $("#kmWrap").style.display = custom || act[2] ? "grid" : "none";
        $("#stWrap").style.display = custom || act[3] ? "grid" : "none";
        $("#floorsWrap").style.display = !custom && act[5] === "floors" ? "grid" : "none";
        const upOnly = !custom && act[6] === "up";
        if (!custom && act[5] === "floors") {
          // About 20 steps per floor. Energy per step: about 0.11 kcal up and 0.05 kcal down for a 70 kg adult (Teh and Aziz, 2002), scaled to body weight.
          const w = latestWeight(rec(state.me)) || 70, fl = Math.max(1, Number($("#floors").value) || 1), rounds = Math.max(1, Number($("#rounds").value) || 1);
          const stepsUp = fl * 20 * rounds;
          // Lift back down: only the climb counts (about 0.11 kcal per step up).
          $("#exkcal").value = Math.round(stepsUp * (upOnly ? 0.11 : 0.11 + 0.05) * w / 70);
          $("#exsteps").value = upOnly ? stepsUp : stepsUp * 2; $("#exkm").value = "";
          $("#stWrap").style.display = "grid"; $("#kmWrap").style.display = "none";
          if (state.lastAct !== a || state.floorsKey !== fl + "x" + rounds) { $("#mins").value = Math.max(1, Math.round(fl * rounds * (upOnly ? 0.35 : 0.55))); state.floorsKey = fl + "x" + rounds; }
          state.lastAct = a;
          return;
        }
        if (!custom && act[5]) {
          // Distance item: calories come from the distance; minutes are a suggestion based on an easy pace.
          const w = latestWeight(rec(state.me)) || 70;
          if (state.lastAct !== a) { $("#mins").value = Math.round(act[2] * act[5]); state.lastAct = a; }
          $("#kmWrap").style.display = "grid"; $("#exkm").value = act[5]; $("#exkcal").value = Math.round(act[1] * w * act[5]);
          $("#exsteps").value = act[3] ? Math.round(act[5] * act[3]) : "";
          return;
        }
        if (state.lastAct !== a && state.lastAct != null && state.lastAct !== "custom" && ACTIVITIES[state.lastAct] && ACTIVITIES[state.lastAct][5]) { $("#mins").value = 30; }
        state.lastAct = a;
        const mins = Number($("#mins").value) || 0;
        if (!custom) {
          const w = latestWeight(rec(state.me)) || 70, km = Math.round(act[2] * mins / 60 * 10) / 10;
          $("#exkcal").value = Math.round(act[1] * w * mins / 60);
          $("#exkm").value = act[2] ? km : ""; $("#exsteps").value = act[3] ? Math.round(km * act[3]) : "";
        }
      };
      // Typing a distance (decimals allowed, e.g. 2.5 or 2,5) updates the minutes, calories and steps to match.
      $("#exkm").addEventListener("input", () => {
        const a = $("#act").value; if (a === "custom") return;
        const act = ACTIVITIES[a], km = Number($("#exkm").value); if (!(km > 0) || act[5] === "floors") return;
        const w = latestWeight(rec(state.me)) || 70;
        if (typeof act[5] === "number") { $("#exkcal").value = Math.round(act[1] * w * km); $("#mins").value = Math.max(1, Math.round(act[2] * km)); }
        else if (act[2]) { const mins = Math.max(1, Math.round((km / act[2]) * 60)); $("#mins").value = mins; $("#exkcal").value = Math.round(act[1] * w * mins / 60); }
        else return;
        $("#exsteps").value = act[3] ? Math.round(km * act[3]) : "";
      });
      $("#act").addEventListener("change", upd); $("#mins").addEventListener("input", upd); $("#floors").addEventListener("input", upd); $("#rounds").addEventListener("input", upd); upd();
      exForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const a = $("#act").value;
        let activity = a === "custom" ? ($("#actName").value.trim() || "Exercise") : ACTIVITIES[a][0];
        if (a !== "custom" && ACTIVITIES[a][5] === "floors") { const fl = Number($("#floors").value) || 1, rn = Number($("#rounds").value) || 1; activity = ACTIVITIES[a][6] === "up" ? `Stairs up to floor ${fl}, lift down${rn > 1 ? ` × ${rn}` : ""}` : `Stairs to floor ${fl} and back${rn > 1 ? ` × ${rn}` : ""}`; }
        const entry = { id: uid(), date: todayStr(), activity, minutes: Number($("#mins").value), kcal: Math.round(Number($("#exkcal").value)), distanceKm: Number($("#exkm").value) || 0, steps: Number($("#exsteps").value) || 0 };
        await addEntry("exercises", entry, `💪🏾 ${esc(activity)} logged.`, true);
      });
    }

    $("#stepsForm", v)?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const raw = $("#stepsIn").value.replace(/\D/g, ""), n = Number(raw); if (!raw || !(n > 0)) return toast("Please type your steps, for example 6420."); if (n > 100000) return toast("That is more than 100 000 steps. Please check the number.");
      const before = daySteps(rec(state.me), state.date);
      if (await send({ action: "add", type: "steps", entry: { id: uid(), date: todayStr(), steps: Math.round(n) } })) {
        render(); if (n >= stepGoal() && before < stepGoal()) { confetti(); toast(`👟 Step goal reached! Move points earned.`); } else toast(`👟 ${fmt(n)} steps saved.`);
      }
    });

    // Weigh in
    $("#wForm", v)?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const r = rec(state.me), kg = Number($("#wKg").value), date = todayStr();
      const prev = weightOn(r, addDays(date, -1));
      const entry = { id: uid(), date, kg };
      let msg = `⚖️ ${fmt(kg, 1)} kg recorded.`;
      if (prev && kg < prev) msg += ` Down ${fmt(prev - kg, 1)} kg. Well done!`;
      else if (prev && kg > prev) msg += ` Up ${fmt(kg - prev, 1)} kg. One reading is not a trend. Keep going.`;
      const first = !r.profile.startWeight && !r.weights.length;
      const beforeRewards = score(state.me).rewards;
      await addEntry("weights", entry, msg, prev && kg < prev);
      const afterRewards = score(state.me).rewards;
      if (afterRewards > beforeRewards) { confetti(); setTimeout(() => toast(`🎁 <b>Reward unlocked!</b> ${REWARDS[Math.min(afterRewards, REWARDS.length) - 1]}. You have earned it.`, 6000), 1200); }
      if (first) { const p = { ...defaultProfile(), ...rec(state.me).profile, startWeight: kg }; await send({ member: state.me, action: "profile", profile: p }); render(); }
    });

    // Profile
    $("#pAge", v)?.addEventListener("change", (e) => {
      const r = rec(state.me), oldAge = r.profile.age, a = Number(e.target.value) || null;
      const band = (x) => (!x ? 2 : x < 12 ? 0 : x < 18 ? 1 : 2);
      if (band(oldAge) !== band(a)) toast("Save your profile to see the pace options for this age.");
    });
    $("#pForm", v)?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const n = (id) => { const x = $(id).value; return x === "" ? null : Number(x); };
      const profile = { ...rec(state.me).profile, sex: $("#pSex").value, age: n("#pAge"), heightCm: n("#pH"), startWeight: n("#pSW"), goalWeight: n("#pGW"), activity: Number($("#pAct").value), rate: Number($("#pRate").value), kidPlan: $("#pKid") ? $("#pKid").value : "controlled" };
      for (const [k] of ABOUT_FIELDS) profile[k] = $("#ab_" + k).value.trim();
      const waist = $("#pWaist") ? Number($("#pWaist").value) : 0, hip = $("#pHip") ? Number($("#pHip").value) : 0;
      if (await send({ member: state.me, action: "profile", profile })) {
        if (waist || hip) await send({ action: "add", type: "measures", entry: { id: uid(), date: todayStr(), waistCm: waist || null, hipCm: hip || null } });
        render(); toast("✓ Profile saved. Your coach will use it.");
      }
    });

    // Calculator
    const cf = $("#calcForm", v);
    if (cf) {
      const upd = () => { state.calc.kg = Number($("#cKg").value) || 1; state.calc.deficit = Number($("#cDef").value); render(); };
      $("#cKg").addEventListener("change", upd); $("#cDef").addEventListener("change", upd);
      cf.addEventListener("submit", (e) => { e.preventDefault(); upd(); });
    }

  }

  function defaultProfile() { return { name: meta(state.me).name, sex: "f", activity: 1.375, rate: 0.5 }; }
  function confirmDelete() { return window.confirm ? window.confirm("Delete this entry?") : true; }

  async function addEntry(type, entry, msg, party = false) {
    const r = rec(state.me);
    const wasChecked = dayStatus(r, entry.date).any;
    const before = dayPoints(r, entry.date);
    if (!(await send({ member: state.me, action: "add", type, entry }))) return;
    const gained = dayPoints(rec(state.me), entry.date) - before;
    const [q, who] = cheer();
    render();
    toast(`${msg}${gained > 0 ? ` <b>+${gained} pts</b>` : ""}${!wasChecked ? " Checked in for the day ✓" : ""}<br><small style="opacity:.8">“${esc(q)}” · ${esc(who)}</small>`, 5200);
    if (party || !wasChecked) confetti();
    return true;
  }

  // Page history for the Back button (and the phone's own back gesture).
  const navStack = [], fwdStack = [];
  function goBack() {
    const prev = navStack.pop();
    if (state.tab !== "today" || prev) { fwdStack.push({ tab: state.tab, logMode: state.logMode }); if (fwdStack.length > 30) fwdStack.shift(); }
    if (!prev) { state.tab = "today"; render(); window.scrollTo({ top: 0 }); return; }
    state.tab = prev.tab; state.logMode = prev.logMode; render(); window.scrollTo({ top: 0 });
  }
  function goForward() {
    const next = fwdStack.pop(); if (!next) return;
    navStack.push({ tab: state.tab, logMode: state.logMode }); if (navStack.length > 30) navStack.shift();
    try { history.pushState({ sbc: navStack.length }, ""); } catch {}
    state.jChecks = null; state.tab = next.tab; state.logMode = next.logMode; render(); window.scrollTo({ top: 0 });
    if (next.tab === "admin") adminSend({ action: "view" });
  }
  window.addEventListener("popstate", () => { if (navStack.length || state.tab !== "today") goBack(); });
  function go(tab) {
    if (tab === "home") tab = "today";
    const from = { tab: state.tab, logMode: state.logMode };
    state.jChecks = null;
    if (["food", "move", "water", "sleep", "journal"].includes(tab)) { state.logMode = tab; state.sleepH = undefined; state.sleepQ = undefined; tab = "log"; }
    if (from.tab !== tab || from.logMode !== state.logMode) { fwdStack.length = 0; navStack.push(from); if (navStack.length > 30) navStack.shift(); try { history.pushState({ sbc: navStack.length }, ""); } catch {} }
    state.tab = tab; render(); window.scrollTo({ top: 0, behavior: "smooth" });
    if (tab === "admin") adminSend({ action: "view" });
  }

  $("#tabs").addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) go(b.dataset.tab); });
  $("#inboxBtn").addEventListener("click", () => go("inbox"));
  $("#whoBtn").addEventListener("click", () => (state.account ? accountMenu() : (state.authStep = null, render())));
  $("#modal").addEventListener("click", (e) => { if (e.target.id === "modal") closeModal(); });

  // Keep everyone in sync
  setInterval(() => { if (state.session && !state.busy && !document.hidden && state.tab !== "admin") load(); }, POLL_MS);
  // South African phones type decimals with a comma (2,5) and may add spaces in big numbers (6 420). Accept both everywhere.
  document.addEventListener("input", (e) => {
    const t = e.target;
    if (!(t instanceof HTMLInputElement)) return;
    if (t.inputMode === "decimal" && /[, ]/.test(t.value)) t.value = t.value.replace(/,/g, ".").replace(/\s/g, "");
    else if (t.hasAttribute("data-int") && /\D/.test(t.value)) t.value = t.value.replace(/\D/g, "");
  }, true);

  document.getElementById("installBtn")?.addEventListener("click", installApp);
  updateInstallBtn(); window.matchMedia("(display-mode: standalone)").addEventListener?.("change", updateInstallBtn);
  // Links from reminders (e.g. /#food) open the right page.
  window.addEventListener("load", () => { const h = location.hash.slice(1); if (h && ["food", "water", "move", "sleep", "journal", "admin", "board", "me", "inbox"].includes(h)) setTimeout(() => { go(h); history.replaceState(null, "", "/"); }, 900); });

  // Installable app: register the service worker and catch the install prompt (Android / desktop Chrome).
  if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => {}));
  window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); state.installEvt = e; if (state.tab === "today") render(); });
  window.addEventListener("appinstalled", () => { state.installEvt = null; render(); });

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) { state.date = todayStr(); if (state.session) load(); }
  });

  render();
  load(true);
})();
