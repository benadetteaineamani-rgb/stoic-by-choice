/* Stoic by Choice · Biggest Loser Challenge (participant and admin app)
   Talks to the secure API in netlify/functions/api.mjs. Points, rankings and awards are calculated on the
   server with the same rules file (core.js) that this app uses for display. */
import { FOODS, FOOD_BY_ID, SERVINGS, searchFoods } from "./foods.js";
import { makeEngine, finaleTime, DEFAULT_SETTINGS, DEFAULT_CONFIG, AVATARS, DAILY_TASKS, BADGES, HOLIDAYS, MOODS, SLEEP_QUALITY, JOURNAL_CHECKS, KCAL_PER_KG, todaySA, addDays, diffDays, pad, dow, holiday, emptyRecord, normRecord } from "./core.js";

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
  const ACTIVITIES = [
    ["Walking, moderate pace", 3.5, 4.8, 1300], ["Walking, brisk", 4.3, 5.6, 1250], ["Hiking", 6.0, 4.0, 1400], ["Jogging", 7.0, 8.0, 1100],
    ["Running, 10 km/h", 9.8, 10, 1000], ["Cycling, leisurely", 4.0, 15, 0], ["Cycling, moderate", 8.0, 20, 0], ["Swimming, leisurely", 6.0, 2, 0],
    ["Aerobics / dance class", 7.3, 0, 0], ["Social dancing", 4.5, 0, 0], ["Skipping rope", 11.8, 0, 0], ["Strength training", 3.5, 0, 0],
    ["Strength training, vigorous", 6.0, 0, 0], ["Yoga / stretching", 2.5, 0, 0], ["Soccer / netball, casual", 7.0, 0, 0],
    ["Stair climbing", 4.0, 0, 0], ["Gardening", 3.8, 0, 0], ["House cleaning", 3.3, 0, 0],
  ];

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
    myRecord: null, challenges: [], manualAwards: [], announcements: [], aggregates: null, admin: null, adminTab: "dashboard",
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
    state.aggregates = data.aggregates || null;
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
      const key = () => JSON.stringify([state.summaries, state.myRecord, state.settings, state.announcements, state.pending, state.challenges, state.manualAwards]);
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
    planRate, calorieFloor, energy, dayTotals, dayStatus, dayPoints, weeks, treats, challengeDay, challengeWeeks, currentWeek, challengeMonths, glasses, waterTarget, sleepTarget, sleepOn, stepGoal, daySteps, dayKm, officialWeightOn } = E;
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
  function toast(html, ms = 3800) {
    const el = $("#toast"); el.innerHTML = html; el.classList.remove("hidden");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.add("hidden"), ms);
  }
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
    const cd = challengeDay();
    $("#dateline").textContent = `${fmtDate(todayStr())}${holiday(todayStr()) ? " 🇿🇦 " + holiday(todayStr()) : ""} · ` + (cd.phase === "on" ? `Day ${cd.day} of ${cd.total} · ${cd.left} days to go` : cd.phase === "before" ? `Challenge starts in ${cd.toStart} day${cd.toStart === 1 ? "" : "s"}` : "Challenge complete 🏁");
    const a = state.account, signedIn = !!(state.session && a);
    $("#whoBtn").innerHTML = signedIn ? `${avatarImg(a.avatar)}${esc(a.name.split(" ")[0])} ▾` : "🔒 Sign in";
    document.body.classList.toggle("authed", signedIn && !state.pending);
    $("#tabAdmin").hidden = !(signedIn && a.role === "admin" && !state.pending);
    $$("#tabs button").forEach((b) => b.classList.toggle("active", b.dataset.tab === state.tab));
    if (!signedIn) { $("#view").innerHTML = viewAuth(); bindAuth(); return; }
    if (state.pending || !state.me) { $("#view").innerHTML = viewPending(); bindAuth(); return; }
    const views = { today: viewToday, challenge: viewChallenge, log: () => ({ move: viewMove, water: viewWater, sleep: viewSleep, journal: viewJournal }[state.logMode] || viewFood)(), food: viewFood, move: viewMove, board: viewBoard, awards: viewAwards, calc: viewCalc, me: viewMe, admin: viewAdmin };
    if (state.tab === "admin" && a.role !== "admin") state.tab = "today";
    $("#view").innerHTML = (views[state.tab] || viewToday)();
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

  function announcementsCard() {
    if (!state.announcements.length) return "";
    return state.announcements.slice(0, 1).map((x) => `<section class="card announce"><div class="label">📣 ${x.to === "all" ? "From the administrator" : "A message for you"} · ${shortDate(x.date)}</div>
      ${x.title ? `<h3>${esc(x.title)}</h3>` : ""}<div>${esc(x.message).replace(/\n/g, "<br>")}</div></section>`).join("");
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
  function activitiesCard() {
    const r = rec(state.me), d = state.date, st = dayStatus(r, d), isToday = d === todayStr();
    const pts = dayPoints(r, d), refl = r.reflections.find((x) => x.date === d), task = DAILY_TASKS[dow(d)];
    const items = [
      [st.ex, "Complete a movement activity", `+${POINTS.exercise}`, `data-go="move"`],
      [st.task, `Healthy habit: ${task}`, `+${POINTS.task}`, `data-hs="task" data-date="${d}"`],
      [st.reflect, refl ? `📓 Journal done ${refl.mood ? MOODS[refl.mood] : ""} ${(refl.checks || []).map((c) => (JOURNAL_CHECKS.find((j) => j[0] === c) || [, ""])[1]).slice(0, 5).join("")}` : "📓 Journal: tap what you did today", `+${POINTS.reflect}`, `data-go="journal"`],
      isWeighDay(d) ? [st.wtv, st.wtv ? "⚖️ Official weigh in recorded" : "⚖️ Official weigh in today: see the administrator", `+${POINTS.weighin}`, `data-go="me"`] : null,
    ].filter(Boolean);
    const core3 = items.slice(0, 3).filter((x) => x[0]).length, g = glasses(r, d), wt = waterTarget();
    return `<section class="card">
      <div class="row between"><h2>${isToday ? "Today's activities" : "Activities for " + shortDate(d)}</h2><span class="pill ${pts < 0 ? "warn" : pts > 0 ? "good" : ""}">${pts > 0 ? "+" : ""}${pts} pts</span></div>
      ${(() => { const sl = sleepOn(r, d), stg = sleepTarget(r), stp = daySteps(r, d), sg = stepGoal(), km = dayKm(r, d);
        return `<div class="tiles">
          <div class="tile water ${g >= wt ? "done" : ""}"><div class="tile-top" data-go="water">${glassSvg(true)}<b>${g}<small>/${wt}</small></b></div><small data-go="water">glasses</small>
            <button class="tile-plus" data-water="1" aria-label="One more glass">+ 1</button></div>
          <div class="tile sleep ${sl && sl.hours >= stg ? "done" : ""}" data-go="sleep" role="button" tabindex="0"><div class="tile-top">🌙<b>${sl ? fmt(sl.hours, 1) : "–"}<small> h</small></b></div><small>${sl ? "sleep" + (sl.quality ? " " + SLEEP_QUALITY[sl.quality] : "") : "log sleep"}</small>
            <div class="bar"><i style="width:${sl ? Math.min(100, (sl.hours / stg) * 100) : 0}%"></i></div></div>
          <div class="tile steps ${stp >= sg ? "done" : ""}" data-go="move" role="button" tabindex="0"><div class="tile-top">👟<b>${stp >= 10000 ? fmt(stp / 1000, 1) + "k" : fmt(stp)}</b></div><small>steps · ${fmt(km, 1)} km</small>
            <div class="bar"><i style="width:${Math.min(100, (stp / sg) * 100)}%"></i></div></div>
        </div>`; })()}
      <div class="checks">${items.map(([done, label, p, attr]) => `<div class="check click ${done ? "done" : ""}" ${attr} role="button" tabindex="0"><span class="tick">${done ? "✓" : ""}</span><span class="grow">${esc(label)}</span><span class="pts">${p}</span></div>`).join("")}</div>
      <p class="note">${core3} of 3 done today.</p>
    </section>`;
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

  function viewToday() {
    return `${bigCheckin()}
      ${homeScreen()}
      ${announcementsCard()}
      ${activitiesCard()}
      ${coachCard()}
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
    if (!items.length) return `<div class="empty">Nothing logged for ${shortDate(state.date)} yet.</div>`;
    const order = ["Breakfast", "Lunch", "Dinner", "Snack"];
    items.sort((a, b) => order.indexOf(a.meal) - order.indexOf(b.meal));
    return `<div class="list">${items.map((f) => `<div class="item"><div class="grow"><div class="t">${esc(f.name)}</div><div class="s">${esc(f.meal)}${f.custom ? " · your estimate" : ""}</div></div><div class="k">${fmt(f.kcal)} kcal</div><button class="del" data-del="foods" data-id="${esc(f.id)}" aria-label="Delete">✕</button></div>`).join("")}</div>`;
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
        <div class="glasses">${Array.from({ length: Math.max(wt, g) }, (_, i) => `<button class="glass ${i < g ? "full" : ""}" data-setwater="${i + 1 === g ? i : i + 1}" aria-label="${i + 1} glasses">${glassSvg(i < g)}</button>`).join("")}</div>
        <div class="row" style="justify-content:center;margin-top:12px"><button class="wbtn" data-water="-1" ${g ? "" : "disabled"}>−</button><button class="btn" data-water="1">+ 1 glass</button></div>
        <p class="note center">${g >= wt ? `Goal reached! +${POINTS.water} points 🎉` : `Reach ${wt} glasses (about 2 litres) for +${POINTS.water} points. Tap a glass to set the number.`}</p>
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
  function viewFood() {
    const r = rec(state.me);
    return `${logSeg()}
      <section class="card">
        <div class="row between wrap"><h2>Log food</h2>${dateNav()}</div>
        ${caloriesCard(r)}
        <form class="form" id="foodForm" autocomplete="off">
          <label>Meal<select id="meal">${["Breakfast", "Lunch", "Dinner", "Snack"].map((m) => `<option ${m === guessMeal() ? "selected" : ""}>${m}</option>`).join("")}</select></label>
          <label>What did you eat?<input id="fsearch" placeholder="Type a food, e.g. pap, chicken, apple" maxlength="80"></label>
          <div id="fresults" class="fresults"></div>
          <div id="fpicked" class="fpicked hidden"></div>
          <div id="fcustom" class="hidden"><div class="grid2"><label>Food name<input id="fname" maxlength="80"></label><label>Calories<input id="fkcal" type="number" inputmode="numeric" min="0" max="5000"></label></div>
            <p class="note">Custom foods are marked as your own estimate. Check the label for the calories.</p></div>
          <button class="btn full" id="fadd" disabled>Add to ${shortDate(state.date)}</button>
        </form>
        <details class="fold"><summary>⚡ Common foods</summary>
          <div class="chips" style="margin-top:8px">${["pap", "brownbread", "egg", "chickenbreast", "rice", "chakalaka", "morogo", "apple", "banana", "amasi", "teasugar", "coke"].map((id) => `<button type="button" class="chip" data-foodid="${id}">${esc(FOOD_BY_ID[id].name)}</button>`).join("")}</div></details>
        ${foodList(r)}
      </section>`;
  }
  function guessMeal() { const h = new Date().getHours(); return h < 11 ? "Breakfast" : h < 15 ? "Lunch" : h < 21 ? "Dinner" : "Snack"; }

  function viewMove() {
    const r = rec(state.me), w = latestWeight(r), st = daySteps(r, state.date), km = dayKm(r, state.date), goal = stepGoal();
    const phone = (r.steps || []).find((x) => x.date === state.date);
    return `${logSeg()}
      <section class="card">
        <div class="row between wrap"><h2>👟 Steps and distance</h2>${dateNav()}</div>
        <div class="movetotals"><div><b>${fmt(st)}</b><small>steps</small></div><div><b>${fmt(km, 1)}</b><small>km</small></div><div><b>${fmt(r.exercises.filter((x) => x.date === state.date).reduce((a, x) => a + x.minutes, 0))}</b><small>active min</small></div></div>
        <div class="bar" style="margin:8px 0 4px"><i style="width:${Math.min(100, (st / goal) * 100)}%"></i></div>
        <p class="note" style="margin-top:0">${st >= goal ? `Step goal reached! +${POINTS.steps} pts 🎉` : `${fmt(goal - st)} steps to your goal of ${fmt(goal)} (+${POINTS.steps} pts).`}</p>
        <form class="form" id="stepsForm"><label>Steps today from your phone or watch (Health / Google Fit)<div class="row"><input id="stepsIn" type="number" inputmode="numeric" min="0" max="100000" placeholder="e.g. 6420" value="${phone ? phone.steps : ""}"><button class="btn">Save</button></div></label></form>
      </section>
      <section class="card">
        <div class="row between wrap"><h2>Log an activity</h2></div>
        <form class="form" id="exForm">
          <label>Activity<select id="act">${ACTIVITIES.map(([n, m], i) => `<option value="${i}">${esc(n)}</option>`).join("")}<option value="custom">Other (enter calories)</option></select></label>
          <label id="customWrap" style="display:none">Activity name<input id="actName" maxlength="80"></label>
          <div class="grid2">
            <label>Minutes<input id="mins" type="number" inputmode="numeric" min="1" max="600" value="30" required></label>
            <label>Calories burned<input id="exkcal" type="number" inputmode="numeric" min="0" max="5000" required></label>
            <label id="kmWrap">Distance (km)<input id="exkm" type="number" inputmode="decimal" min="0" max="300" step="0.1"></label>
            <label id="stWrap">Steps<input id="exsteps" type="number" inputmode="numeric" min="0" max="100000"></label>
          </div>
          <p class="note" id="exNote">Calories, distance and steps are estimated${w ? ` for your weight of ${fmt(w, 1)} kg` : ""}; change them if your phone or watch shows exact numbers.</p>
          <button class="btn full">Add to ${shortDate(state.date)}</button>
        </form>
        ${exList(r)}
      </section>`;
  }

  const ALL_MODES = { week: "This Week", month: "This Month", overall: "Overall" };
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

  function viewBoard() {
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

      <details class="card fold"><summary>ℹ️ How scoring works</summary>
        <table>
          <tr><td>Check in (log anything)</td><td><b>+${POINTS.checkin}</b> per day</td></tr>
          <tr><td>Movement activity logged</td><td><b>+${POINTS.exercise}</b> per day</td></tr>
          <tr><td>Daily healthy habit task</td><td><b>+${POINTS.task}</b></td></tr>
          <tr><td>Journal entry</td><td><b>+${POINTS.reflect}</b></td></tr>
          <tr><td>Water goal reached</td><td><b>+${POINTS.water}</b></td></tr>
          <tr><td>Sleep goal reached</td><td><b>+${POINTS.sleep}</b></td></tr>
          <tr><td>Official weigh in (every other Saturday)</td><td><b>+${POINTS.weighin}</b></td></tr>
          <tr><td>Missed day (nothing logged)</td><td><b style="color:var(--danger)">${POINTS.missed}</b></td></tr>
          <tr><td>Check in on a public holiday</td><td><b>+${POINTS.holiday}</b> bonus (no penalty if you rest)</td></tr>
          <tr><td>Hard working week (treat token)</td><td><b>+${TREAT.bonus}</b> and a ${TREAT.kcal} kcal treat</td></tr>
          <tr><td>Steps goal reached</td><td><b>+${POINTS.steps}</b></td></tr>
          <tr><td>Weight lost at official weigh ins (safe pace)</td><td><b>+${POINTS.perPercent}</b> per 1% of starting weight</td></tr>
          <tr><td>Admin challenges</td><td>points shown on each challenge</td></tr>
        </table>
        <p class="note">Points are calculated by the server; nobody can enter their own points. Weekly and monthly awards count effort only. Only weights recorded by the administrator at the official Saturday weigh ins count, and loss faster than the safe pace earns nothing extra. <b>Two winners are revealed together at the Grand Finale:</b> the Biggest Loser (highest percentage lost) and the Greatest Effort award (most healthy habit points).</p>
      </details>
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
        <tr><th>Name</th><th>23 Nov 2024</th>${cols.map((d, i) => `<th>${i === 0 ? "Start<br><small>14 Nov 2026</small>" : shortDate(d)}</th>`).join("")}<th>Lost in<br>challenge</th><th>Lost since<br>2024</th><th>Goal</th></tr>
        ${MEMBERS.map((m) => { const r = rec(m.id), sc = score(m.id), bw = r.profile.beforeWeight, cur = latestWeight(r);
          return `<tr><td><b>${esc(nameOf(m.id))}</b></td><td class="muted">${bw ? fmt(bw, 1) : "–"}</td>${cols.map((d, i) => cell(r, d, i)).join("")}<td><b>${sc.sw ? fmt(sc.lostKg, 1) + " kg" : "–"}</b></td><td><b style="color:var(--leaf)">${bw && cur ? fmt(bw - cur, 1) + " kg" : "–"}</b></td><td>${r.profile.goalWeight ? fmt(r.profile.goalWeight, 1) : "–"}</td></tr>`; }).join("")}
      </table></div>
      <h3 style="margin-top:14px">✍🏾 Record the crew's weights</h3>
      <form class="form" id="groupForm">
        <label>Weigh in<select id="gDate">
          <option value="start">Starting weights (14 Nov 2026)</option>
          ${weighDays().map((d) => `<option value="${d}" ${d === lastWeighDay(today) ? "selected" : ""} ${d > today ? "disabled" : ""}>${fmtDate(d, { weekday: "short", day: "numeric", month: "short" })}${d > today ? " (upcoming)" : ""}</option>`).join("")}
        </select></label>
        <div class="grid2">${MEMBERS.map((m) => `<label>${esc(nameOf(m.id))} (kg)<input type="number" inputmode="decimal" step="0.1" min="20" max="400" data-gw="${m.id}"></label>`).join("")}</div>
        <button class="btn full">Save weights</button>
        <p class="note" style="margin:0">Leave a box empty to skip someone. Saving again for the same date replaces the earlier weight.</p>
      </form>
    </section>`;
  }

  function holidayCard() {
    const s = settings(), today = todayStr();
    const list = Object.entries(HOLIDAYS).filter(([d]) => d >= s.start && d <= s.end);
    if (!list.length) return "";
    return `<details class="card fold"><summary>🇿🇦 Public holidays (no penalties)</summary>
      <p class="note">No points are deducted on these days. Rest, celebrate with family, and check in if you can for a +${POINTS.holiday} bonus. Tip: fill half your plate with salad and vegetables before the festive food.</p>
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
            <label>Kilograms to lose<input id="cKg" type="number" inputmode="decimal" min="0.5" max="100" step="0.5" value="${kg}"></label>
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

      ${chartsCard()}

      ${trophyCabinet(state.me)}

      <section class="card">
        <h2>⚖️ Weigh in</h2>
        <form class="form" id="wForm"><div class="grid2">
          <label>Date<input type="text" value="Today, ${fmtDate(todayStr(), { day: "numeric", month: "short" })}" readonly></label>
          <label>Weight (kg)<input type="number" id="wKg" inputmode="decimal" step="0.1" min="20" max="400" value="${todayW ? todayW.kg : ""}" required></label></div>
          <button class="btn full">${todayW ? "Update today's weight" : "Save personal weigh in"}</button></form>
        <p class="note">Personal weigh ins are for your own chart. Official weights are recorded by the administrator at the Saturday weigh ins, and only those count towards the winners.</p>
        <div style="margin-top:14px">${weightChart(r)}</div>
        <div class="list">${sortByDate(r.weights).reverse().slice(0, 3).map((x) => `<div class="item"><div class="grow"><div class="t">${fmt(x.kg, 1)} kg</div><div class="s">${fmtDate(x.date, { weekday: "short", day: "numeric", month: "short" })}</div></div><button class="del" data-del="weights" data-id="${esc(x.id)}" aria-label="Delete">✕</button></div>`).join("")}</div>
      </section>

      <details class="card fold"><summary>⚙️ My profile and settings</summary>
        <form class="form" id="pForm">
          <div class="grid2">
            <label>Sex<select id="pSex"><option value="f" ${p.sex !== "m" ? "selected" : ""}>Female</option><option value="m" ${p.sex === "m" ? "selected" : ""}>Male</option></select></label>
            <label>Age<input id="pAge" type="number" inputmode="numeric" min="5" max="110" value="${p.age ?? ""}"></label>
            <label>Height (cm)<input id="pH" type="number" inputmode="numeric" min="90" max="230" value="${p.heightCm ?? ""}"></label>
            <label>Starting weight (kg)<input id="pSW" type="number" inputmode="decimal" step="0.1" value="${p.startWeight ?? (sc.sw ?? "")}" ${p.startWeight ? 'readonly title="Only the administrator can change a starting weight"' : ""}></label>
            <label>Goal weight (kg)<input id="pGW" type="number" inputmode="decimal" step="0.1" value="${p.goalWeight ?? ""}"></label>
          </div>
          <label>Activity level<select id="pAct">${[[1.2, "Mostly sitting"], [1.375, "Lightly active (1 to 3 days)"], [1.55, "Moderately active (3 to 5 days)"], [1.725, "Very active (6 to 7 days)"]].map(([v, l]) => `<option value="${v}" ${Number(p.activity || 1.375) === v ? "selected" : ""}>${l}</option>`).join("")}</select></label>
          ${rateField(r)}
          <button class="btn full">Save profile</button>
        </form>
        <button class="btn ghost full" style="margin-top:10px" data-go="calc">🧮 Open the burn calculator</button>
        <button class="btn ghost full" style="margin-top:10px" data-act="switch">🎭 Avatar, PIN and sign out</button>
      </details>`;
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

  const taskDone = (r, d) => (r.tasks || []).some((t) => t.date === d);

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
          ${ov(895, cy - 24, 50, 48, d ? (done ? "✓" : "") : "–", `cover chk ${done ? "on" : ""}`)}
          ${hs(172, cy - 26, 786, 52, can ? "task" : "tasknot", `${DAILY_TASKS[wd]} ${d ? shortDate(d) : ""}`, `data-date="${d || ""}"`)}`;
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
      ${cells.map(([k, x, y]) => { const b = BADGES[k], won = b.test(a), lead = !won && b.lead && b.lead(a);
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
  function viewChallenge() {
    return `${weeklyScreen()}
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
    return `${awardsScreen()}
      <details class="card award" id="aw-weekly">${head(IMG.weekly_award, "Weekly Challenge Award", `This week: ${curWeek ? names(curWeek.winners) : "–"}`)}
        ${awardImg(IMG.weekly_award, "Stoic by Choice Weekly Challenge Award")}
        <p class="note">Awarded every challenge week (Tuesday to Monday) to whoever earns the most points that week: check ins, exercise, tasks, holiday bonuses and weight lost at the official weigh in.</p>
        ${curWeek && !curWeek.done && today >= settings().start ? `<p><b>Week ${curWeek.n} leader so far:</b> ${winnerChips(curWeek.winners)} ${curWeek.top > 0 ? `<small>${fmt(curWeek.top)} pts</small>` : ""}</p>` : ""}
        <div class="list">${wr.filter((w) => w.done).reverse().map((w) => `<div class="item"><div class="grow"><div class="t">Week ${w.n}</div><div class="s">${shortDate(w.w0)} to ${shortDate(w.w1)}</div></div><div>${winnerChips(w.winners)}</div></div>`).join("") || `<div class="empty">The first Weekly Challenge Award is presented on ${fmtDate(addDays(challengeWeeks()[0].w1, 1), { weekday: "long", day: "numeric", month: "long" })}.</div>`}</div>
      </details>

      <details class="card award" id="aw-monthly">${head(IMG.monthly_award, "Monthly Challenge Award", `This month: ${curMonth ? names(curMonth.winners) : "–"}`)}
        ${awardImg(IMG.monthly_award, "Stoic by Choice Monthly Challenge Award")}
        <p class="note">Awarded at the end of every calendar month to whoever earned the most points in that month.</p>
        ${curMonth && !curMonth.done && today >= settings().start ? `<p><b>${esc(curMonth.label)} leader so far:</b> ${winnerChips(curMonth.winners)} ${curMonth.top > 0 ? `<small>${fmt(curMonth.top)} pts</small>` : ""}</p>` : ""}
        <div class="list">${mr.filter((m) => m.done).reverse().map((m) => `<div class="item"><div class="grow"><div class="t">${esc(m.label)}</div></div><div>${winnerChips(m.winners)}</div></div>`).join("") || `<div class="empty">The first Monthly Challenge Award is presented on 1 December 2026.</div>`}</div>
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
    await addEntry("tasks", { id: uid(), date: d }, `✅ ${esc(DAILY_TASKS[dow(d)])}: done.`, true);
  }

  // =====================================================================
  // Admin Control Centre (administrators only; needs PIN + email code)
  // =====================================================================
  const ADMIN_TABS = [["dashboard", "🏠", "Dashboard"], ["participants", "👥", "Participants"], ["challenges", "🎯", "Challenges"], ["scoring", "🏆", "Leaderboard & scoring"],
    ["awards", "🎖️", "Awards & badges"], ["progress", "📈", "Progress"], ["comms", "✉️", "Communications"], ["reports", "📊", "Reports"], ["settings", "⚙️", "Settings"], ["audit", "📜", "Audit log"]];
  const statusPill = (s) => `<span class="pill ${s === "active" ? "good" : s === "pending" ? "" : "warn"}">${esc(s)}</span>`;
  const memberOptions = (sel = "") => MEMBERS.map((m) => `<option value="${m.id}" ${m.id === sel ? "selected" : ""}>${esc(m.name)}</option>`).join("");

  function viewAdmin() {
    const A = state.admin;
    if (!A) return `<section class="card"><h2>Admin Control Centre</h2><p class="muted">Loading…</p></section>`;
    const t = state.adminTab;
    const body = { dashboard: admDashboard, participants: admParticipants, challenges: admChallenges, scoring: admScoring, awards: admAwards, progress: admProgress, comms: admComms, reports: admReports, settings: admSettings, audit: admAudit }[t]();
    return `<section class="card admin-head"><div class="row"><img src="img/avatars/navigator.webp" class="av lg" alt=""><div><div class="brand">Stoic by Choice</div><div class="brand-sub">Admin Control Centre</div></div></div>
      <div class="admtabs">${ADMIN_TABS.map(([k, i, l]) => `<button class="${k === t ? "on" : ""}" data-adm="${k}">${i} ${l}</button>`).join("")}</div></section>${body}`;
  }

  function admDashboard() {
    const A = state.admin, accts = A.accounts, t = todayStr();
    const active = accts.filter((a) => a.status === "active").length, pending = accts.filter((a) => a.status === "pending").length;
    const groups = new Set(accts.map((a) => a.group).filter(Boolean)).size;
    const activeCh = state.challenges.filter((c) => c.start <= t && c.end >= t).length;
    const issued = state.manualAwards.length + R().weeks.filter((w) => w.done && w.winners.length).length + R().months.filter((m) => m.done && m.winners.length).length;
    const days = []; for (let i = 6; i >= 0; i--) days.push(addDays(t, -i));
    const counts = days.map((d) => (d < settings().start ? 0 : MEMBERS.filter((m) => dayStatus(rec(m.id), d).any).length)), max = Math.max(1, MEMBERS.length);
    return `<section class="card"><div class="kpis">
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
        <p class="note">Built in every week: the 7 daily habit tasks (+${POINTS.task} each), movement, reflection and the treat token week.</p></section>`;
  }

  function admScoring() {
    const c = state.admin.config, P = c.points;
    const labels = { checkin: "Daily check in", exercise: "Movement logged", weighin: "Official weigh in", task: "Daily habit task", reflect: "Journal entry", water: "Water goal reached", sleep: "Sleep goal reached", missed: "Missed day (negative)", holiday: "Public holiday bonus", perPercent: "Per 1% of weight lost", treatBonus: "Treat token week bonus" };
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
      <section class="card"><h2>Sent messages</h2><div class="list">${(state.admin.announcements || []).map((x) => `<div class="item"><div class="grow"><div class="t">${esc(x.title || "Announcement")} <span class="pill">${x.to === "all" ? "everyone" : esc(nameOf(x.to))}</span></div><div class="s">${shortDate(x.date)}${x.until ? " · until " + shortDate(x.until) : ""} · ${esc(x.message.slice(0, 90))}</div></div><button class="del" data-rm-ann="${x.id}" aria-label="Remove">✕</button></div>`).join("") || `<div class="empty">No announcements yet.</div>`}</div></section>`;
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
        <label class="btn ghost full center" style="cursor:pointer">⬆️ Restore from a backup file<input type="file" id="restoreFile" accept=".json,application/json" hidden></label></div></section>`;
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
    on("chForm", () => adminSend({ action: "challenge", title: $("#chTitle").value, description: $("#chDesc").value, type: $("#chType").value, points: $("#chPts").value, start: $("#chStart").value, end: $("#chEnd").value }, "🎯 Challenge created."));
    $$("[data-rm-ch]", v).forEach((b) => b.addEventListener("click", () => confirm("Remove this challenge?") && adminSend({ action: "challenge", remove: b.dataset.rmCh })));
    on("scoreForm", () => { const points = {}; $$("[data-pt]", v).forEach((i) => (points[i.dataset.pt] = Number(i.value))); adminSend({ action: "config", config: { ...A.config, points, treat: { minutes: Number($("#trMin").value), kcal: Number($("#trKcal").value) }, water: { target: Number($("#wTarget").value) }, sleep: { target: Number($("#sTarget").value) } } }, "🏆 Scoring rules saved."); });
    on("adjForm", () => adminSend({ action: "adjust", memberId: $("#adjWho").value, points: $("#adjPts").value, date: $("#adjDate").value, reason: $("#adjWhy").value }, "✓ Adjustment approved."));
    $$("[data-rm-adj]", v).forEach((b) => b.addEventListener("click", () => confirm("Remove this adjustment?") && adminSend({ action: "adjust", remove: b.dataset.rmAdj })));
    on("medalForm", () => adminSend({ action: "award", memberId: $("#mdWho").value, award: $("#mdAward").value, note: $("#mdNote").value }, "🎖️ Medal issued."));
    $$("[data-rm-medal]", v).forEach((b) => b.addEventListener("click", () => confirm("Revoke this medal?") && adminSend({ action: "award", remove: b.dataset.rmMedal })));
    $$("[data-tpl]", v).forEach((b) => b.addEventListener("click", () => { $("#annMsg").value = b.dataset.tpl; }));
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
    // Group weigh in (health data)
    const gf = $("#groupForm", v);
    if (gf) {
      const fill = () => { const d = $("#gDate").value; $$("[data-gw]", gf).forEach((inp) => { const r = rec(inp.dataset.gw); inp.value = (d === "start" ? startWeight(r) : (r.weights.find((x) => x.date === d) || {}).kg) || ""; }); };
      $("#gDate").addEventListener("change", fill); fill();
      gf.addEventListener("submit", async (e) => {
        e.preventDefault();
        const entries = $$("[data-gw]", gf).filter((i) => i.value).map((i) => ({ memberId: i.dataset.gw, kg: Number(i.value) }));
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
    $$("[data-hs]", v).forEach((b) => b.addEventListener("click", (e) => { e.preventDefault(); onHotspot(b); }));
    $$("[data-log]", v).forEach((b) => b.addEventListener("click", () => { state.logMode = b.dataset.log; state.jMood = undefined; state.jChecks = null; render(); }));
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
      const r = rec(state.me), d = state.date, cur = sleepOn(r, d), stg = sleepTarget(r);
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
      let picked = null, qty = 1, custom = false;
      const showPicked = () => {
        const box = $("#fpicked");
        if (!picked) { box.classList.add("hidden"); $("#fadd").disabled = !custom; return; }
        box.classList.remove("hidden");
        box.innerHTML = `<div class="row between"><div><b>${esc(picked.name)}</b><br><small>${esc(picked.serving)} · ${picked.kcal} kcal each</small></div><button type="button" class="del" data-clear aria-label="Clear">✕</button></div>
          <div class="row between" style="margin-top:8px"><div class="seg">${SERVINGS.map((q) => `<button type="button" class="${q === qty ? "on" : ""}" data-qty="${q}">${q === 0.5 ? "½" : q === 1.5 ? "1½" : q}</button>`).join("")}</div>
          <div class="kcalbig">${Math.round(picked.kcal * qty)} <small>kcal</small></div></div>`;
        $$("[data-qty]", box).forEach((b) => b.addEventListener("click", () => { qty = Number(b.dataset.qty); showPicked(); }));
        $("[data-clear]", box).addEventListener("click", () => { picked = null; $("#fsearch").value = ""; showPicked(); $("#fsearch").focus(); });
        $("#fadd").disabled = false;
      };
      const pick = (f) => { picked = f; qty = 1; custom = false; $("#fcustom").classList.add("hidden"); $("#fresults").innerHTML = ""; $("#fsearch").value = f.name; showPicked(); };
      $("#fsearch").addEventListener("input", () => {
        const q = $("#fsearch").value; picked = null; showPicked();
        const res = searchFoods(q);
        $("#fresults").innerHTML = q.trim().length < 2 ? "" : res.map((f) => `<button type="button" class="fres" data-pick="${f.id}"><span>${esc(f.name)}<small>${esc(f.serving)}</small></span><b>${f.kcal}</b></button>`).join("")
          + `<button type="button" class="fres custom" data-customfood><span>➕ Not in the list? Add “${esc(q.trim())}” as a custom food</span></button>`;
        $$("[data-pick]", v).forEach((b) => b.addEventListener("click", () => pick(FOOD_BY_ID[b.dataset.pick])));
        $$("[data-customfood]", v).forEach((b) => b.addEventListener("click", () => { custom = true; $("#fresults").innerHTML = ""; $("#fcustom").classList.remove("hidden"); $("#fname").value = q.trim(); $("#fkcal").focus(); $("#fadd").disabled = false; }));
      });
      $$("[data-foodid]", v).forEach((b) => b.addEventListener("click", () => { pick(FOOD_BY_ID[b.dataset.foodid]); ff.scrollIntoView({ behavior: "smooth" }); }));
      ff.addEventListener("submit", async (e) => {
        e.preventDefault();
        const base = { id: uid(), date: state.date, meal: $("#meal").value };
        if (picked) return addEntry("foods", { ...base, foodId: picked.id, qty, kcal: Math.round(picked.kcal * qty), name: picked.name }, `🍽️ ${esc(picked.name)}: ${Math.round(picked.kcal * qty)} kcal logged.`);
        if (custom) { if (!$("#fname").value.trim() || $("#fkcal").value === "") return toast("Please enter the food and its calories."); return addEntry("foods", { ...base, name: $("#fname").value.trim(), kcal: Number($("#fkcal").value) }, `🍽️ ${esc($("#fname").value.trim())} logged.`); }
        toast("Type a food and choose it from the list.");
      });
    }

    // Exercise
    const exForm = $("#exForm", v);
    if (exForm) {
      const upd = () => {
        const a = $("#act").value; const custom = a === "custom", act = custom ? null : ACTIVITIES[a], mins = Number($("#mins").value) || 0;
        $("#customWrap").style.display = custom ? "grid" : "none";
        $("#kmWrap").style.display = custom || act[2] ? "grid" : "none";
        $("#stWrap").style.display = custom || act[3] ? "grid" : "none";
        if (!custom) {
          const w = latestWeight(rec(state.me)) || 70, km = Math.round(act[2] * mins / 60 * 10) / 10;
          $("#exkcal").value = Math.round(act[1] * w * mins / 60);
          $("#exkm").value = act[2] ? km : ""; $("#exsteps").value = act[3] ? Math.round(km * act[3]) : "";
        }
      };
      $("#act").addEventListener("change", upd); $("#mins").addEventListener("input", upd); upd();
      exForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const a = $("#act").value;
        const activity = a === "custom" ? ($("#actName").value.trim() || "Exercise") : ACTIVITIES[a][0];
        const entry = { id: uid(), date: state.date, activity, minutes: Number($("#mins").value), kcal: Math.round(Number($("#exkcal").value)), distanceKm: Number($("#exkm").value) || 0, steps: Number($("#exsteps").value) || 0 };
        await addEntry("exercises", entry, `💪🏾 ${esc(activity)} logged.`, true);
      });
    }

    $("#stepsForm", v)?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const n = Number($("#stepsIn").value); if (!(n >= 0)) return toast("Please enter your steps.");
      const before = daySteps(rec(state.me), state.date);
      if (await send({ action: "add", type: "steps", entry: { id: uid(), date: state.date, steps: Math.round(n) } })) {
        render(); if (n >= stepGoal() && before < stepGoal()) { confetti(); toast(`👟 Step goal reached! +${POINTS.steps} pts`); } else toast(`👟 ${fmt(n)} steps saved.`);
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
      if (await send({ member: state.me, action: "profile", profile })) { render(); toast("✓ Profile saved. Your targets are updated."); }
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
  }

  function go(tab) {
    if (tab === "home") tab = "today";
    state.jChecks = null;
    if (["food", "move", "water", "sleep", "journal"].includes(tab)) { state.logMode = tab; state.sleepH = undefined; state.sleepQ = undefined; tab = "log"; }
    state.tab = tab; render(); window.scrollTo({ top: 0, behavior: "smooth" });
    if (tab === "admin") adminSend({ action: "view" });
  }

  $("#tabs").addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) go(b.dataset.tab); });
  $("#whoBtn").addEventListener("click", () => (state.account ? accountMenu() : (state.authStep = null, render())));
  $("#modal").addEventListener("click", (e) => { if (e.target.id === "modal") closeModal(); });

  // Keep everyone in sync
  setInterval(() => { if (state.session && !state.busy && !document.hidden && state.tab !== "admin") load(); }, POLL_MS);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) { state.date = todayStr(); if (state.session) load(); }
  });

  render();
  load(true);
})();
