// Stoic by Choice · Biggest Loser Challenge
// Shared rules and scoring. The SAME file is used by the browser (for display) and by the
// server (for the official points, rankings and awards), so the two can never disagree.

export const DEFAULT_SETTINGS = { start: "2026-11-17", end: "2027-04-24", title: "Stoic by Choice Biggest Loser Challenge" };

export const DEFAULT_CONFIG = {
  points: { checkin: 5, exercise: 3, weighin: 10, task: 2, reflect: 2, water: 2, sleep: 2, missed: -10, holiday: 3, perPercent: 100, treatBonus: 15 },
  water: { target: 8 },
  sleep: { target: 7 },
  treat: { minutes: 150, kcal: 300 },
  pin: { maxAttempts: 5, lockMinutes: 15, hardLockAfter: 10 },
  autoApprove: false,
  rulesText:
    "1. Check in every day by logging food, exercise, a task or a reflection.\n2. Official weigh ins are every other Saturday.\n3. Points are calculated automatically by the app; nobody can enter their own points.\n4. Weight loss only earns points up to a safe weekly pace. Crash dieting never pays.\n5. Under 18s follow the Junior plan with a parent's supervision.\n6. Encourage each other. Weights are private; only points and badges are shared.",
  privacyText:
    "We collect your name, email, optional mobile number, avatar, PIN (stored only as a secure hash) and the wellness information you choose to record (weight, food, exercise and reflections). Your weight and personal wellness details are visible only to you and to the challenge administrator. Other participants see your name, avatar, points, streak and badges. Your information is used only to run this challenge, is not sold or shared, and you may ask the administrator to correct or delete it at any time, in line with South Africa's Protection of Personal Information Act (POPIA).",
};

// South African public holidays (Public Holidays Act 36 of 1994; a Sunday holiday moves to Monday). Source: gov.za
export const HOLIDAYS = {
  "2026-01-01": "New Year's Day", "2026-03-21": "Human Rights Day", "2026-04-03": "Good Friday", "2026-04-06": "Family Day",
  "2026-04-27": "Freedom Day", "2026-05-01": "Workers' Day", "2026-06-16": "Youth Day", "2026-08-09": "National Women's Day",
  "2026-08-10": "Women's Day holiday", "2026-09-24": "Heritage Day", "2026-11-04": "Election Day", "2026-12-16": "Day of Reconciliation",
  "2026-12-25": "Christmas Day", "2026-12-26": "Day of Goodwill",
  "2027-01-01": "New Year's Day", "2027-03-21": "Human Rights Day", "2027-03-22": "Human Rights Day holiday", "2027-03-26": "Good Friday",
  "2027-03-29": "Family Day", "2027-04-27": "Freedom Day", "2027-05-01": "Workers' Day", "2027-06-16": "Youth Day",
  "2027-08-09": "National Women's Day", "2027-09-24": "Heritage Day", "2027-12-16": "Day of Reconciliation",
  "2027-12-25": "Christmas Day", "2027-12-26": "Day of Goodwill", "2027-12-27": "Day of Goodwill holiday",
};

// The 12 symbolic avatars: they represent the quality a participant chooses to develop.
export const AVATARS = {
  climber: { name: "The Climber", value: "Perseverance", pledge: "I choose perseverance. I will keep climbing, one step at a time, even when the path is steep." },
  lion: { name: "The Lion", value: "Courage", pledge: "I choose courage. I will do what is right for my wellbeing, even when it is difficult." },
  baobab: { name: "The Baobab", value: "Resilience", pledge: "I choose resilience. Like the baobab, I will stand firm through every season." },
  eagle: { name: "The Eagle", value: "Focus", pledge: "I choose focus. I will keep my eyes on what matters and let distractions pass." },
  lotus: { name: "The Lotus", value: "Balance", pledge: "I choose balance. I will care for my body and mind without extremes." },
  torch: { name: "The Torch", value: "Discipline", pledge: "I choose discipline. I will keep my promises to myself, especially when no one is watching." },
  navigator: { name: "The Navigator", value: "Purpose", pledge: "I choose purpose. I will remember why I started and let it guide each choice." },
  guardian: { name: "The Guardian", value: "Self control", pledge: "I choose self control. I will pause before I act and choose what serves me." },
  strider: { name: "The Strider", value: "Consistency", pledge: "I choose consistency. Small steps, every day, will carry me far." },
  wave: { name: "The Wave", value: "Adaptability", pledge: "I choose adaptability. When plans change, I will adjust and keep moving." },
  sunrise: { name: "The Sunrise", value: "New beginnings", pledge: "I choose new beginnings. Every morning is a fresh chance to do well." },
  transformer: { name: "The Transformer", value: "Growth", pledge: "I choose growth. I will become stronger, wiser and kinder through this journey." },
};

// Daily tasks of the weekly challenge, by weekday (0 = Sunday).
export const DAILY_TASKS = {
  1: "Move for 30 minutes", 2: "Eat one extra fruit or vegetable", 3: "Drink 8 glasses of water", 4: "Get at least 7 hours of sleep",
  5: "Do a 5 minute mind reset (breathe, reflect, plan)", 6: "Be active with someone (walk, dance, sport)", 0: "Reflect: What did I learn about my discipline?",
};

export const KCAL_PER_KG = 7700;

// ---------- Dates (date strings are YYYY-MM-DD, interpreted at noon to avoid time zone edges) ----------
export const pad = (n) => String(n).padStart(2, "0");
export const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export function addDays(s, n) { const d = new Date(s + "T12:00:00"); d.setDate(d.getDate() + n); return ymd(d); }
export function diffDays(a, b) { return Math.round((new Date(b + "T12:00:00") - new Date(a + "T12:00:00")) / 86400000); }
export const dow = (d) => new Date(d + "T12:00:00").getDay();
/** Today's date in South Africa, wherever the code runs. */
export function todaySA(now = new Date()) {
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Johannesburg", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const g = (t) => p.find((x) => x.type === t).value;
  return `${g("year")}-${g("month")}-${g("day")}`;
}
export const holiday = (d) => HOLIDAYS[d] || null;
export const emptyRecord = () => ({ profile: {}, foods: [], exercises: [], weights: [], treats: [], tasks: [], reflections: [], challenges: [], water: [], sleep: [] });
export const SLEEP_QUALITY = { great: "😴", good: "🙂", okay: "😐", poor: "🥱" };
export const MOODS = { great: "😄", good: "🙂", okay: "😐", low: "😔", tough: "😣" };
export function normRecord(r) { const e = emptyRecord(); r = r || {}; for (const k of Object.keys(e)) if (!r[k]) r[k] = e[k]; return r; }
const sortByDate = (arr) => [...arr].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

/**
 * Build the rule engine for a given challenge.
 * ctx: { settings: () => ({start,end}), config: () => config, today: () => "YYYY-MM-DD", challengeDefs: () => [...], adjustments: () => [...] }
 */
export function makeEngine(ctx) {
  const S = () => ctx.settings() || DEFAULT_SETTINGS;
  const P = () => ({ ...DEFAULT_CONFIG.points, ...((ctx.config() || {}).points || {}) });
  const T = () => ({ ...DEFAULT_CONFIG.treat, ...((ctx.config() || {}).treat || {}) });
  const waterTarget = () => ((ctx.config() || {}).water || DEFAULT_CONFIG.water).target || 8;
  const sleepTarget = (r) => Math.max(((ctx.config() || {}).sleep || DEFAULT_CONFIG.sleep).target || 7, r && r.profile && r.profile.age && r.profile.age < 18 ? 8 : 0);
  const sleepOn = (r, d) => (r.sleep || []).find((x) => x.date === d) || null;
  const glasses = (r, d) => ((r.water || []).find((x) => x.date === d) || {}).glasses || 0;
  const today = () => ctx.today();
  const defs = () => (ctx.challengeDefs ? ctx.challengeDefs() : []) || [];

  function weighDays() {
    const s = S(), out = [];
    let d = s.start;
    while (dow(d) !== 6) d = addDays(d, 1);
    for (; d <= s.end; d = addDays(d, 14)) out.push(d);
    return out;
  }
  const isWeighDay = (d) => weighDays().includes(d);
  const nextWeighDay = (from = today()) => weighDays().find((d) => d >= from) || null;
  const lastWeighDay = (upTo) => { const w = weighDays().filter((d) => d <= upTo); return w.length ? w[w.length - 1] : null; };

  const startWeight = (r) => { if (r.profile.startWeight) return r.profile.startWeight; const w = sortByDate(r.weights); return w.length ? w[0].kg : null; };
  const weightOn = (r, d) => { const w = sortByDate(r.weights).filter((x) => x.date <= d); return w.length ? w[w.length - 1].kg : startWeight(r); };
  const latestWeight = (r) => weightOn(r, "9999-12-31");
  const isMinor = (r) => !!(r.profile.age && r.profile.age < 18);
  const isChild = (r) => !!(r.profile.age && r.profile.age < 12);
  const habitsOnly = (r) => isMinor(r) && r.profile.kidPlan === "habits";
  // Safe weekly pace. Children 6 to 11: about 0.5 kg a month; teens: 0.5 kg a week; adults: 1 kg a week.
  const maxRate = (r) => (isChild(r) ? 0.12 : isMinor(r) ? 0.5 : 1);
  function planRate(r) {
    if (habitsOnly(r)) return 0;
    if (isChild(r)) return 0.12;
    return Math.min(r.profile.rate || (isMinor(r) ? 0.25 : 0.5), isMinor(r) ? 0.5 : 0.75);
  }
  function calorieFloor(r) { const m = r.profile.sex === "m"; if (isChild(r)) return 1400; if (isMinor(r)) return m ? 1800 : 1600; return m ? 1500 : 1200; }
  function energy(r) {
    const p = r.profile, w = latestWeight(r);
    if (!w || !p.heightCm || !p.age) return null;
    const bmr = 10 * w + 6.25 * p.heightCm - 5 * p.age + (p.sex === "m" ? 5 : -161); // Mifflin St Jeor
    const tdee = bmr * (p.activity || 1.375);
    const minor = isMinor(r), habits = habitsOnly(r), rate = planRate(r);
    let deficit = (rate * KCAL_PER_KG) / 7;
    if (minor) deficit = Math.min(deficit, 500);
    const floor = calorieFloor(r);
    const target = habits ? Math.round(tdee / 10) * 10 : Math.max(Math.round((tdee - deficit) / 10) * 10, floor);
    return { bmr: Math.round(bmr), tdee: Math.round(tdee), target, minor, habits, rate, floor, weight: w };
  }
  const dayTotals = (r, d) => ({
    eaten: r.foods.filter((f) => f.date === d).reduce((s, f) => s + f.kcal, 0),
    burned: r.exercises.filter((e) => e.date === d).reduce((s, e) => s + e.kcal, 0),
  });
  function dayStatus(r, d) {
    const food = r.foods.some((x) => x.date === d), ex = r.exercises.some((x) => x.date === d), wt = r.weights.some((x) => x.date === d);
    const task = r.tasks.some((x) => x.date === d), reflect = r.reflections.some((x) => x.date === d), chal = r.challenges.some((x) => x.date === d);
    const g = glasses(r, d), water = g > 0, waterGoal = g >= waterTarget();
    const sl = sleepOn(r, d), slept = !!sl, sleepGoal = !!sl && sl.hours >= sleepTarget(r);
    return { food, ex, wt, task, reflect, chal, water, waterGoal, glasses: g, slept, sleepGoal, any: food || ex || wt || task || reflect || chal || water || slept };
  }
  function dayPoints(r, d, t = today()) {
    const st = dayStatus(r, d), p = P();
    if (st.any) return p.checkin + (st.ex ? p.exercise : 0) + (st.wt && isWeighDay(d) ? p.weighin : 0) + (st.task ? p.task : 0) + (st.reflect ? p.reflect : 0) + (st.waterGoal ? p.water : 0) + (st.sleepGoal ? p.sleep : 0) + (holiday(d) ? p.holiday : 0);
    return d < t && !holiday(d) && !beforeJoin(r, d) ? p.missed : 0;
  }
  // Nobody is penalised for days before they joined the challenge.
  const beforeJoin = (r, d) => !!(r.profile.joinedDate && d < r.profile.joinedDate);

  // ---------- Periods ----------
  function challengeWeeks() {
    const s = S(), out = [];
    for (let w0 = s.start, n = 1; w0 <= s.end; w0 = addDays(w0, 7), n++) out.push({ n, w0, w1: addDays(w0, 6) < s.end ? addDays(w0, 6) : s.end });
    return out;
  }
  function currentWeek() {
    const ws = challengeWeeks(), t = today();
    return ws.find((w) => w.w0 <= t && t <= w.w1) || (t < ws[0].w0 ? ws[0] : ws[ws.length - 1]);
  }
  function challengeMonths() {
    const s = S(), out = [];
    let d = s.start;
    while (d <= s.end) {
      const dt = new Date(d + "T12:00:00");
      const next = dt.getMonth() === 11 ? `${dt.getFullYear() + 1}-01-01` : `${dt.getFullYear()}-${pad(dt.getMonth() + 2)}-01`;
      const to = addDays(next, -1) < s.end ? addDays(next, -1) : s.end;
      out.push({ key: d.slice(0, 7), from: d, to, label: dt.toLocaleDateString("en-ZA", { month: "long", year: "numeric" }) });
      d = next;
    }
    return out;
  }
  // Challenge week index containing date d (or null).
  const weekOf = (d) => challengeWeeks().find((w) => w.w0 <= d && d <= w.w1) || null;

  function weeks(r) {
    const t = today(), tr = T();
    return challengeWeeks().map(({ n, w0, w1 }) => {
      let allIn = true, mins = 0;
      for (let d = w0; d <= w1; d = addDays(d, 1)) {
        if (d < t && !holiday(d) && !beforeJoin(r, d) && !dayStatus(r, d).any) allIn = false;
        mins += r.exercises.filter((x) => x.date === d).reduce((a, x) => a + x.minutes, 0);
      }
      const done = w1 < t, need = Math.ceil((tr.minutes * (diffDays(w0, w1) + 1)) / 7);
      return { n, from: w0, to: w1, done, current: w0 <= t && t <= w1, allIn, mins, need, earned: done && allIn && mins >= need };
    });
  }
  function treats(r) {
    const ws = weeks(r), earned = ws.filter((w) => w.earned).length, used = r.treats.length;
    return { earned, used, left: Math.max(0, earned - used), current: ws.find((w) => w.current) || null, usedToday: r.treats.some((x) => x.date === today()) };
  }

  // Points for admin created challenges completed between a and b (each counted once per day, week or month).
  function challengePoints(r, a, b) {
    const t = today(), seen = new Set();
    let pts = 0;
    for (const c of sortByDate(r.challenges)) {
      if (c.date < a || c.date > b || c.date > t) continue;
      const def = defs().find((x) => x.id === c.challengeId);
      if (!def || c.date < def.start || c.date > def.end) continue;
      const period = def.type === "daily" ? c.date : def.type === "weekly" ? "w" + ((weekOf(c.date) || {}).n || c.date) : c.date.slice(0, 7);
      const key = def.id + "|" + period;
      if (seen.has(key)) continue;
      seen.add(key);
      pts += Number(def.points) || 0;
    }
    return pts;
  }
  const adjustmentsFor = (memberId, a, b) => ((ctx.adjustments ? ctx.adjustments() : []) || []).filter((x) => x.memberId === memberId && x.date >= a && x.date <= b).reduce((s, x) => s + (Number(x.points) || 0), 0);

  // Weight points earned at official weigh ins between a and b (capped at the safe pace).
  function weightPeriodPoints(r, a, b) {
    if (habitsOnly(r)) return 0;
    const sw = startWeight(r), wds = weighDays(), t = today();
    let pts = 0;
    wds.filter((x) => x >= a && x <= b && x <= t).forEach((wd) => {
      const prevWd = wds.filter((x) => x < wd).pop();
      const prevW = prevWd ? weightOn(r, prevWd) : sw;
      const cur = (r.weights.find((x) => x.date === wd) || {}).kg;
      if (sw && prevW && cur) { const lost = Math.min(prevW - cur, maxRate(r) * 2); pts += Math.round((lost / sw) * 100 * P().perPercent); }
    });
    return pts;
  }
  function periodScore(r, memberId, a, b) {
    const s = S(), t = today();
    let pts = 0;
    for (let d = a < s.start ? s.start : a; d <= b && d <= t && d <= s.end; d = addDays(d, 1)) pts += dayPoints(r, d, t);
    return pts + weightPeriodPoints(r, a, b) + challengePoints(r, a, b) + adjustmentsFor(memberId, a, b);
  }

  function score(r, memberId) {
    const s = S(), t = today(), p = P();
    const last = t < s.end ? t : s.end;
    let habit = 0, checkins = 0, missed = 0, streak = 0;
    for (let d = s.start; d <= last; d = addDays(d, 1)) {
      const st = dayStatus(r, d);
      if (st.any) checkins++; else if (d < t && !holiday(d) && !beforeJoin(r, d)) missed++;
      habit += dayPoints(r, d, t);
    }
    const tr = treats(r);
    habit += tr.earned * p.treatBonus + challengePoints(r, s.start, s.end) + adjustmentsFor(memberId, "0000-00-00", "9999-12-31");
    let d = dayStatus(r, t).any ? t : addDays(t, -1);
    while (d >= s.start && (dayStatus(r, d).any || holiday(d))) { if (dayStatus(r, d).any) streak++; d = addDays(d, -1); }
    const lw = lastWeighDay(last);
    const sw = startWeight(r), cw = lw ? weightOn(r, lw) : sw;
    const lostKg = sw && cw ? sw - cw : 0;
    const pct = sw ? (lostKg / sw) * 100 : 0;
    const minor = isMinor(r), habits = habitsOnly(r);
    const wk = Math.max(1, (diffDays(s.start, last) + 1) / 7), safeKg = maxRate(r) * wk;
    const countedKg = lostKg > 0 ? Math.min(lostKg, safeKg) : lostKg;
    const weightPts = habits || t < s.start ? 0 : Math.round((sw ? (countedKg / sw) * 100 : 0) * p.perPercent);
    const tooFast = diffDays(s.start, last) >= 13 && lostKg > safeKg;
    const goal = r.profile.goalWeight && sw && sw > r.profile.goalWeight ? Math.min(100, Math.max(0, (lostKg / (sw - r.profile.goalWeight)) * 100)) : null;
    return { id: memberId, habit, checkins, missed, streak, sw, cw, lostKg, pct, weightPts, total: habit + weightPts, minor, habits, tooFast, goal, treats: tr, rewards: sw ? Math.max(0, Math.floor(pct / 2.5)) : 0 };
  }

  function bestStreak(r) {
    const s = S(), t = today();
    let best = 0, cur = 0;
    for (let d = s.start; d <= s.end && d <= t; d = addDays(d, 1)) {
      if (dayStatus(r, d).any) { cur++; best = Math.max(best, cur); } else if (!holiday(d) && d < t && !beforeJoin(r, d)) cur = 0;
    }
    return best;
  }
  const exerciseMinutes = (r) => { const s = S(); return r.exercises.filter((x) => x.date >= s.start && x.date <= s.end).reduce((a, x) => a + x.minutes, 0); };
  const exerciseDays = (r) => { const s = S(); return new Set(r.exercises.filter((x) => x.date >= s.start && x.date <= s.end).map((x) => x.date)).size; };
  function last14(r) {
    const s = S(), t = today(), out = [];
    const from = addDays(t, -13) > s.start ? addDays(t, -13) : s.start;
    for (let i = 0, d = from; i < 14 && d <= s.end; i++, d = addDays(d, 1)) {
      let c = "future";
      if (d <= t) { const st = dayStatus(r, d); c = st.any && st.ex ? "ok" : st.any ? "part" : holiday(d) ? "hol" : beforeJoin(r, d) ? "future" : d < t ? "miss" : "today"; }
      out.push({ d, c });
    }
    return out;
  }
  function challengeDay() {
    const s = S(), t = today(), total = diffDays(s.start, s.end) + 1;
    if (t < s.start) return { phase: "before", total, toStart: diffDays(t, s.start) };
    if (t > s.end) return { phase: "after", total };
    return { phase: "on", total, day: diffDays(s.start, t) + 1, left: diffDays(t, s.end) };
  }

  /**
   * Official computation for everyone (server side).
   * participants: [{ memberId, ... }], records: { memberId: record }
   * Returns per member summaries and group results (weekly, monthly and final awards).
   */
  function computeAll(participants, records) {
    const t = today(), s = S();
    const ids = participants.map((p) => p.memberId);
    const R = (id) => normRecord(records[id]);
    const summaries = {};
    const cws = challengeWeeks(), ms = challengeMonths();
    for (const id of ids) {
      const r = R(id), sc = score(r, id), ws = weeks(r);
      const missedBefore = (d) => { for (let x = s.start; x < d; x = addDays(x, 1)) if (!holiday(x) && !beforeJoin(r, x) && !dayStatus(r, x).any) return true; return false; };
      summaries[id] = {
        ...sc,
        weekPts: Object.fromEntries(cws.map((w) => [w.n, periodScore(r, id, w.w0, w.w1)])),
        monthPts: Object.fromEntries(ms.map((m) => [m.key, periodScore(r, id, m.from, m.to)])),
        exerciseMinutes: exerciseMinutes(r), exerciseDays: exerciseDays(r), bestStreak: bestStreak(r), days14: last14(r),
        foodDays: new Set(r.foods.filter((f) => f.date >= s.start).map((f) => f.date)).size,
        maxWeekMins: Math.max(0, ...ws.map((w) => w.mins)),
        comeback: ws.some((w) => w.earned && missedBefore(w.from)),
        weighIns: weighDays().filter((d) => r.weights.some((x) => x.date === d)).length,
        weekAllIn: ws.map((w) => (w.from > t ? null : w.allIn)),
        waterGoalDays: new Set(r.water.filter((x) => x.date >= s.start && x.glasses >= waterTarget()).map((x) => x.date)).size,
        sleepGoalDays: new Set(r.sleep.filter((x) => x.date >= s.start && x.hours >= sleepTarget(r)).map((x) => x.date)).size,
        journalDays: new Set(r.reflections.filter((x) => x.date >= s.start).map((x) => x.date)).size,
        tasksThisWeek: (() => { const cw = currentWeek(); return r.tasks.filter((x) => x.date >= cw.w0 && x.date <= cw.w1).length; })(),
      };
    }
    const winners = (getPts) => { const v = ids.map((id) => ({ id, pts: getPts(id) })); const top = Math.max(-Infinity, ...v.map((x) => x.pts)); return { top, winners: top > 0 ? v.filter((x) => x.pts === top).map((x) => x.id) : [] }; };
    const weeksRes = cws.map((w) => ({ ...w, done: w.w1 < t, ...winners((id) => summaries[id].weekPts[w.n]) }));
    const monthsRes = ms.map((m) => ({ ...m, done: m.to < t, ...winners((id) => summaries[id].monthPts[m.key]) }));
    const leaders = (metric) => { const v = ids.map((id) => ({ id, v: metric(id) })); const top = Math.max(-Infinity, ...v.map((x) => x.v)); return top > 0 ? v.filter((x) => x.v === top).map((x) => x.id) : []; };
    const consistent = leaders((id) => summaries[id].checkins * 1000 + summaries[id].exerciseDays);
    const resilience = leaders((id) => summaries[id].exerciseMinutes);
    const ranking = [...ids].sort((a, b) => summaries[b].total - summaries[a].total || summaries[b].checkins - summaries[a].checkins);
    const eligible = ranking.filter((id) => !summaries[id].habits);
    const biggestLoser = eligible.length && (summaries[eligible[0]].total > 0 || summaries[eligible[0]].lostKg > 0) ? eligible[0] : null;
    const over = t > s.end;
    for (const id of ids) {
      const x = summaries[id];
      x.weeklyWins = weeksRes.filter((w) => w.done && w.winners.includes(id)).length;
      x.monthlyWins = monthsRes.filter((m) => m.done && m.winners.includes(id)).length;
      x.isConsistent = consistent.includes(id);
      x.isResilience = resilience.includes(id);
      x.isBL = biggestLoser === id;
      x.over = over;
    }
    return { summaries, results: { weeks: weeksRes, months: monthsRes, consistent, resilience, biggestLoser, ranking, over } };
  }

  return {
    weighDays, isWeighDay, nextWeighDay, lastWeighDay, startWeight, weightOn, latestWeight, isMinor, isChild, habitsOnly, maxRate, planRate,
    calorieFloor, energy, dayTotals, dayStatus, dayPoints, challengeWeeks, currentWeek, challengeMonths, weeks, treats, score, periodScore,
    bestStreak, challengeDay, computeAll, P, T, glasses, waterTarget, sleepTarget, sleepOn,
  };
}

// Badges (achievements) derived from a member's official summary.
export const BADGES = {
  weekly: { label: "Weekly Challenge", test: (a) => a.weeklyWins > 0, how: "Score the most points in a challenge week." },
  monthly: { label: "Monthly Challenge", test: (a) => a.monthlyWins > 0, how: "Score the most points in a calendar month." },
  consistency: { label: "Consistency Star", test: (a) => a.bestStreak >= 7, how: "Check in 7 days in a row." },
  movement: { label: "Movement Hero", test: (a) => a.maxWeekMins >= 150, how: "Exercise 150 minutes in one challenge week." },
  hydration: { label: "Hydration Hero", test: (a) => a.waterGoalDays >= 7, how: "Reach your water goal on 7 days." },
  sleep: { label: "Well Rested", test: (a) => a.sleepGoalDays >= 7, how: "Reach your sleep goal on 7 nights." },
  journal: { label: "Thoughtful Stoic", test: (a) => a.journalDays >= 7, how: "Write in your journal on 7 days." },
  healthy: { label: "Healthy Choice", test: (a) => a.foodDays >= 7, how: "Log your food on 7 different days." },
  comeback: { label: "Resilience Champion", test: (a) => a.comeback, how: "Miss a day, then come back and earn a treat token week." },
  progress: { label: "Progress Pro", test: (a) => a.pct >= 2.5, how: "Lose 2.5% of your starting weight." },
  discipline: { label: "Discipline Champion", test: (a) => a.bestStreak >= 14, how: "Check in 14 days in a row." },
  team: { label: "Team Player", test: (a) => a.weighIns >= 3, how: "Attend 3 official Saturday weigh ins." },
  transformation: { label: "Biggest Transformation", test: (a) => a.pct >= 5, how: "Lose 5% of your starting weight." },
  bl: { label: "Biggest Loser Award", test: (a) => a.isBL && a.over, lead: (a) => a.isBL, how: "Finish the challenge with the highest score." },
  resilienceAward: { label: "Resilience Challenge Award", test: (a) => a.isResilience && a.over, lead: (a) => a.isResilience, how: "Log the most exercise minutes by the end of the challenge." },
  consistentAward: { label: "Most Consistent Participant", test: (a) => a.isConsistent && a.over, lead: (a) => a.isConsistent, how: "Check in on the most days by the end of the challenge." },
  grand: { label: "Grand Champion", test: (a) => a.isBL && a.over, how: "Win the Biggest Loser Award at the end of the challenge." },
};

// Fields of a summary that reveal health information; removed before sharing with other participants.
export const PRIVATE_FIELDS = ["sw", "cw", "lostKg", "pct", "goal", "rewards", "tooFast", "weightPts", "minor", "habits"];
