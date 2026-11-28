// Stoic by Choice · Biggest Loser Challenge
// Shared rules and scoring. The SAME file is used by the browser (for display) and by the
// server (for the official points, rankings and awards), so the two can never disagree.

import { FOOD_BY_ID } from "./foods.js";

export const DEFAULT_SETTINGS = { start: "2026-11-17", end: "2027-04-24", title: "Stoic by Choice Biggest Loser Challenge" };

export const DEFAULT_CONFIG = {
  // Scoring version 2 (19 Nov 2026): one clear daily scorecard worth 20 points, each item counted once per day.
  points: { checkin: 4, food: 3, exercise: 5, water: 3, sleep: 2, reflect: 1, task: 2, weighin: 10, missed: -10, eatPenalty: -5, flagPenalty: -3, weighGain: -10, weighBelowMin: -5, weighLost: 3, weighMinMet: 5, perPercent: 100, treatBonus: 15 },
  water: { target: 8 },
  sleep: { target: 7 },
  steps: { goal: 7500 },
  finale: { revealAt: null, revealed: false },
  prizes: { bl: 10000, effort: 2000 },
  treat: { minutes: 150, kcal: 300 },
  pin: { maxAttempts: 5, lockMinutes: 15, hardLockAfter: 10 },
  autoApprove: false,
  rulesText:
    "1. Check in every day by logging food, exercise, a task or a reflection.\n2. Official weigh ins are every other Saturday.\n3. Points are calculated automatically by the app; nobody can enter their own points.\n4. Weight loss only earns points up to a safe weekly pace. Crash dieting never pays.\n5. Under 18s follow the Junior plan with a parent's supervision.\n6. Encourage each other. Weights are private; only points and badges are shared.",
  privacyText:
    "We collect your name, optional mobile number, avatar, PIN (stored only as a secure hash) and the wellness information you choose to record (weight, food, exercise and reflections). Your weight and personal wellness details are visible only to you and to the challenge administrator. Other participants see your name, avatar, points, streak and badges. Your information is used only to run this challenge, is not sold or shared, and you may ask the administrator to correct or delete it at any time, in line with South Africa's Protection of Personal Information Act (POPIA).",
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
// The daily tasks match the Weekly Challenge picture. Monday, Wednesday, Thursday and Sunday overlap with a scorecard
// line, so on those days the task ticks itself when that habit is done and earns no extra points (nothing is counted twice).
export const DAILY_TASKS = {
  1: "Move for 30 minutes", 2: "Eat one extra fruit or vegetable", 3: "Drink 8 glasses of water", 4: "Get at least 7 hours of sleep",
  5: "Do a 5 minute mind reset (breathe, reflect, plan)", 6: "Be active with someone (walk, dance, sport)", 0: "Reflect: What did I learn about my discipline?",
};
// A new set of daily challenges every challenge week (week 1 is the original set). Index = challenge week − 1.
// Mon (move), Wed (water), Thu (sleep) and Sun (journal) stay linked to that habit, so they still tick themselves.
export const WEEKLY_TASKS = {
  1: ["Move for 30 minutes", "Take the stairs instead of the lift all day", "Walk 10 minutes after every meal", "Try a new exercise for 20 minutes", "Reach 8 000 steps today", "3 rounds: 10 squats, 10 lunges, 10 sit ups", "Dance for 20 minutes to your favourite songs", "Walk or cycle somewhere you would normally drive", "Stretch for 10 minutes, then move for 20", "Climb the stairs 5 times today", "Brisk 30 minute walk outdoors", "Do a 20 minute home workout video", "Park far away and walk the extra distance", "Skip, jog or run for 20 minutes", "50 squats spread through the day", "Walk while you are on a phone call", "A 2 km walk before breakfast", "Plank 3 × 30 seconds, then a 20 minute walk", "Try spinning, swimming or a new class", "Beat last Monday's active minutes", "Walk 10 000 steps today", "Move for 45 minutes", "Finish strong: your best workout yet"],
  2: ["Eat one extra fruit or vegetable", "Half your plate vegetables at lunch and supper", "No added sugar today: check every label", "Swap white bread or rice for a vegetable", "Eat breakfast before 9 AM", "Cook at home: no takeaways today", "Try a vegetable you have not had this month", "No eating after 7 PM", "Weigh every portion today", "No fizzy drinks or juice today", "Pack a healthy lunch the night before", "Eat slowly: fork down between bites", "Protein at every meal", "No snacking between meals", "Read the label before eating anything packaged", "Have a big salad as one meal", "Plan tomorrow's three meals tonight", "No fried food today", "Eat a rainbow: 3 colours of vegetables", "Half the usual starch at supper", "No sweets, biscuits or chips today", "Prepare your meals for the next 2 days", "Eat exactly to your plan all day"],
  3: ["Drink 8 glasses of water", "A glass of water before every meal", "Start the day with 2 glasses of water", "Replace every other drink with water", "Carry a water bottle everywhere today", "8 glasses before 6 PM", "Add lemon, mint or cucumber to your water", "Water first whenever you feel hungry", "No tea or coffee after 2 PM: water instead", "2 glasses before lunch, 2 before supper", "Log every glass as you drink it", "Water instead of any sweet drink", "A glass of water every 2 hours", "Finish 1 litre before lunch", "Swap your afternoon snack for water", "Drink 8 glasses and log them as you go", "Green or rooibos tea, no sugar, plus water", "Drink a glass when you sit down at your desk", "Drink 10 glasses today", "A glass on waking and one before bed", "No juice or fizzy drink: water only", "8 glasses before 7 PM", "Your best water day: 8 glasses or more"],
  4: ["Get at least 7 hours of sleep", "In bed by 10 PM", "No phone for 30 minutes before bed", "No caffeine after 2 PM", "Same bedtime as last night", "Dim the lights an hour before bed", "Read a book instead of a screen in bed", "No eating 3 hours before bed", "Wake up at the same time as yesterday", "Phone out of the bedroom tonight", "Write tomorrow's to do list before bed", "A short walk after supper for better sleep", "Cool, dark, quiet bedroom tonight", "In bed 30 minutes earlier than usual", "Slow breathing for 2 minutes in bed", "No TV in the last hour before bed", "Sleep 7 to 9 hours", "Lights out by 10:30 PM", "Skip the nap: sleep well tonight", "A warm shower before bed", "Gentle stretches before sleep", "Log your sleep quality honestly", "Rest well: 8 hours tonight"],
  5: ["Do a 5 minute mind reset (breathe, reflect, plan)", "Write 3 things you are grateful for", "5 minutes of quiet breathing at lunch", "Read one Stoic quote and think about it", "Say no to one thing that does not serve your goal", "Write down what triggers your cravings", "One screen free hour", "Write your goal and why it matters to you", "Notice when you eat from emotion, not hunger", "10 minutes outside with no phone", "Write a kind note to yourself", "Plan the weekend's meals and movement", "Breathe in 4, hold 4, out 4: five rounds", "Write one habit you have built so far", "Name one fear about the challenge and face it", "Picture yourself at your goal for 2 minutes", "Forgive yourself for one slip this week", "Tidy one space at home or work", "Write what you will do differently next week", "5 minute body scan meditation", "List 5 wins since the challenge started", "Write a letter to your future self", "Think about how far you have come"],
  6: ["Be active with someone (walk, dance, sport)", "Walk with a family member or friend", "Play a game outside with the children", "Invite someone on your weigh in walk", "Do a workout with your buddy", "Cook a healthy meal together", "Dance together for 15 minutes", "A hike or park walk together", "Cheer three people in the app", "Swim, cycle or play a sport together", "Teach someone one healthy habit", "A family walk after supper", "Do the stairs with a partner", "Shop for healthy food together", "Join a parkrun or group walk", "Ball games, skipping or tag outside", "Plan next week with your buddy", "Walk and talk: 30 minutes with someone", "Garden or clean together for 30 minutes", "Challenge someone to a step race", "A gym session or class with a friend", "Prepare a healthy picnic together", "Celebrate together: an active day out"],
  0: ["Reflect: What did I learn about my discipline?", "Reflect: What was my biggest win this week?", "Reflect: When was I most tempted, and why?", "Reflect: What will I do better next week?", "Reflect: Which habit feels easier now?", "Reflect: Who helped me this week?", "Reflect: What did my body tell me this week?", "Reflect: Where did I make excuses?", "Reflect: What am I proud of today?", "Reflect: Which food choice changed my week?", "Reflect: How did I handle a bad day?", "Reflect: What does discipline mean to me now?", "Reflect: One rule I will keep next week", "Reflect: How has my energy changed?", "Reflect: What would my future self thank me for?", "Reflect: What did the scale teach me?", "Reflect: What gave me strength this week?", "Reflect: Which habit do I still struggle with?", "Reflect: How have I helped someone else?", "Reflect: What surprised me about myself?", "Reflect: My plan for the final weeks", "Reflect: Who have I become in this challenge?", "Reflect: What will I keep doing after the finale?"],
};
/** The daily challenge for a date: changes every challenge week (weeks start on the challenge start day). */
export function taskFor(d, start = DEFAULT_SETTINGS.start) {
  const list = WEEKLY_TASKS[dow(d)] || [DAILY_TASKS[dow(d)]], n = Math.max(0, Math.floor(diffDays(start, d) / 7));
  return list[n % list.length] || DAILY_TASKS[dow(d)];
}
export const TASK_LINK = { 1: ["move", "Move"], 3: ["water", "Water"], 4: ["sleep", "Sleep"], 0: ["journal", "Journal"] };
// Personal eating plans (from each person's printed plan). One tap logs the whole line: protein plus its vegetables.
// Each option: [label, [[foodId, grams or count], ...]]
const veg = (g) => ["p_veg", g];
export const PLANS = {
  judith: {
    1: [["1 egg + 65 g veg", [["egg", 1], veg(65)]], ["50 g cheese + 65 g veg", [["p_cheese", 50], veg(65)]], ["60 g fish + 70 g veg", [["p_hake", 60], veg(70)]], ["175 ml yoghurt", [["yoghurtff", 1]]]],
    2: [["120 g chicken + 125 g veg", [["p_chicken", 120], veg(125)]], ["110 g meat + 100 g veg", [["p_beef", 110], veg(100)]], ["110 g fish + 100 g veg", [["p_hake", 110], veg(100)]], ["75 g cheese + 125 g veg", [["p_cheese", 75], veg(125)]], ["55 g feta + 125 g veg (once a week)", [["p_feta", 55], veg(125)]]],
    3: [["125 g chicken + 120 g veg", [["p_chicken", 125], veg(120)]], ["115 g meat + 110 g veg", [["p_beef", 115], veg(110)]], ["105 g fish + 95 g veg", [["p_hake", 105], veg(95)]]],
    provita: 5, fruit: 2,
  },
  benadette: {
    1: [["1 egg + 65 g veg", [["egg", 1], veg(65)]], ["60 g cheese + 75 g veg", [["p_cheese", 60], veg(75)]], ["50 g fish + 60 g veg", [["p_hake", 50], veg(60)]], ["175 ml yoghurt", [["yoghurtff", 1]]]],
    2: [["115 g chicken + 120 g veg", [["p_chicken", 115], veg(120)]], ["110 g meat + 100 g veg", [["p_beef", 110], veg(100)]], ["105 g fish + 100 g veg", [["p_hake", 105], veg(100)]], ["70 g cheese + 115 g veg", [["p_cheese", 70], veg(115)]], ["55 g feta + 125 g veg (once a week)", [["p_feta", 55], veg(125)]]],
    3: [["120 g chicken + 120 g veg", [["p_chicken", 120], veg(120)]], ["115 g meat + 110 g veg", [["p_beef", 115], veg(110)]], ["100 g fish + 90 g veg", [["p_hake", 100], veg(90)]]],
    provita: 5, fruit: 2,
  },
};
export const MOVE_MINUTES = 20;
// Weigh in result: minimum loss expected between official weigh ins (kg per week; under 18s half, per the Junior plan's gentler pace).
export const WEIGH_MIN_PER_WEEK = { adult: 0.5, junior: 0.25 };
export const WEIGH_RESULT_FROM = "2026-12-05"; // weigh in result points start at the next weigh in, not the one of 21 November
// Eat enough rule (from 19 Nov 2026): three meals a day, never a starvation day.
// Under 800 kcal a day is a very low calorie diet, which should only be done under medical supervision (NICE obesity guidance);
// under 18s should not go below about 1 200 kcal. People on a clinic eating plan follow its rule instead: three meals, never skip one.
export const EAT_RULE_FROM = "2026-11-19";
export const FLAG_RULE_FROM = "2026-11-22"; // more than 3 bad habit flags in a day costs points from this date
export const FLAG_LIMIT = 3;
export const MEALS_NEEDED = 3;
const NOT_A_MEAL = new Set(["Drinks", "Supplements", "Medicines"]);
export const FRUIT_ALLOWANCE = 2; // fruit portions a day (eating plans: 2)
// ---------- Eating plan rules (from the clinic's RULES and NOT ALLOWED sheets), applied to everyone as flags ----------
const tag = (ids, why) => Object.fromEntries(ids.split(" ").map((id) => [id, why]));
export const NOT_ALLOWED = {
  ...tag("milkfull milklow milkskim amasi teasugar coffeesugar cappuccino hotchoc icecream smoothie", "Milk products are not allowed (no milk in tea or coffee)"),
  ...tag("cheese", "Only cottage, ricotta, mozzarella or feta (once a week) are on the plan"),
  ...tag("yoghurtfruit", "Only plain low fat or fat free yoghurt is allowed"),
  ...tag("sugar honey jam sweets chocbar chocslab cookies cake doughnut koeksister muffin scone mariebiscuits rusk cordial juice coke coke500 pumpkinsweet tomsauce driedfruit mageu", "Sugar and honey are not allowed"),
  ...tag("butter oil mayo friedchicken friedfish friedegg chips slapchips vetkoek vetkoekmince crisps crispsbig samoosa springroll chickenmeal kota bunny burger cheeseburger pizza pie sausageroll worsroll saladdressed coleslaw potatosalad morogo chickenroast peanuts peanutbutter atchar", "No oil, butter, margarine, fat or fried food (Spray and Cook only)"),
  ...tag("gravy", "Meat stock and gravy are not allowed"),
  ...tag("porkchop bacon", "Pork is not allowed"),
  ...tag("lambchop", "Lamb and mutton are not allowed"),
  ...tag("polony vienna boerewors droewors biltong pilchards", "No processed, smoked or pre cooked meat"),
  ...tag("beer cider wine spirits", "No alcohol"),
  ...tag("energy", "Energy drinks are not allowed"),
  ...tag("diet", "No Diet Coke or Cola Lite (Sprite Zero, Tab, soda water and Schweppes Lemon Lite are fine)"),
  ...tag("panadosyrup benylin", "Medicines with sugar or fruit flavour are not allowed: ask the clinic for a sugar free option"),
  ...tag("grandpa", "Medicines with caffeine are not allowed: ask the clinic for an alternative"),
};
const CHEESE = new Set("p_cheese p_cottage p_ricotta p_mozzarella p_feta cheese".split(" "));
const PROTEIN_GROUP = {
  ...tag("p_chicken p_turkey p_ostrich chickenbreast chickenroast chickenstew livers friedchicken", "poultry"),
  ...tag("p_beef p_veal p_game p_mince goulash mince beefstew steak mogodu", "meat"),
  ...tag("p_hake p_kingklip p_whiting p_sole p_tuna p_calamari p_prawn p_crayfish hake tuna pilchards friedfish", "fish"),
  ...tag("egg friedegg scrambled", "egg"),
  ...tag("p_cheese p_cottage p_ricotta p_mozzarella p_feta cheese yoghurtff yoghurtplain", "dairy"),
};
const COFFEE = { coffeeblack: 1, coffeesw: 1, coffeesugar: 1, cappuccino: 1 };
const DIET_ML = { spritezero: "ml", tab: 330, schweppeslite: 330, diet: 330 };
/** All rule flags for a day (no points; they guide). */
function planFlags(r, d, foods, weekFoods) {
  const out = [], add = (k, label, how) => out.push({ k, label, how });
  const sum = (pred, val = (f) => f.qty || 1) => foods.filter(pred).reduce((a, f) => a + val(f), 0);
  const seen = new Set();
  for (const f of foods) { const why = NOT_ALLOWED[f.foodId]; if (why && !seen.has(f.foodId)) { seen.add(f.foodId); add("bad", `Not on the eating plan: ${(FOOD_BY_ID[f.foodId] || {}).name || f.name}`, why); } }
  if (foods.filter((f) => CHEESE.has(f.foodId)).length > 1) add("cheese", "Cheese more than once today", "Cheese maximum once a day");
  const feta = weekFoods.filter((f) => f.foodId === "p_feta").length; if (feta > 1) add("feta", "Feta more than once this week", "Feta maximum once a week");
  const slots = {}; for (const f of foods) { const g = PROTEIN_GROUP[f.foodId], m = MEAL_SLOT[f.meal] || f.meal; if (g) (slots[m] = slots[m] || new Set()).add(g); }
  if (Object.values(slots).some((x) => x.size > 1)) add("mixed", "Proteins mixed in one meal", "Proteins are not to be mixed: one protein per meal");
  if (foods.some((f) => ((FOOD_BY_ID[f.foodId] || {}).cat === "Fruit" && portions(f) > 2) || (PROVITA_EQ[f.foodId] || 0) * (f.qty || 1) > 2)) add("atonce", "More than 2 at a time", "Fruit and Provitas: never more than 2 at a time");
  const g = (id) => foods.filter((f) => f.foodId === id).reduce((a, f) => a + (f.amount || 0), 0);
  if (g("onion") > 30) add("onion", "Too much onion", `${g("onion")} g today; no more than 30 g a day`);
  if (g("p_tomato") > 70) add("tomato", "Too much tomato", `${g("p_tomato")} g today; no more than 70 g a day, no cherry tomatoes`);
  const mayo = sum((f) => f.foodId === "litemayo"); if (mayo > 1) add("mayo", "Too much mayonnaise", "1 level teaspoon of lite mayonnaise a day");
  const soy = sum((f) => f.foodId === "soysauce"); if (soy > 1) add("soy", "Too much soy sauce", "1 teaspoon of light soy sauce a day; limited salt");
  const coffee = sum((f) => COFFEE[f.foodId]); if (coffee > 8) add("coffee", "More than 8 cups of coffee", "After 8 cups, switch to decaffeinated");
  const dietMl = foods.reduce((a, f) => a + (DIET_ML[f.foodId] === "ml" ? f.amount || 0 : (DIET_ML[f.foodId] || 0) * (f.qty || 1)), 0);
  if (dietMl > 1000) add("fizzy", "More than 1 litre of diet fizzy drinks", "1 litre of diet fizzy drinks a day at most");
  if (sum((f) => f.foodId === "schweppeslite") > 1) add("schweppes", "More than 1 can of Schweppes Lemon Lite", "Maximum 1 can a day");
  // Timing (only for food with a time eaten): last meal before 9 PM, at least 5 hours between meals.
  const isFood = (f) => f.time && !NOT_A_MEAL.has((FOOD_BY_ID[f.foodId] || {}).cat);
  const anytime = (f) => (FOOD_BY_ID[f.foodId] || {}).cat === "Fruit" || PROVITA_EQ[f.foodId];
  const late = foods.filter((f) => isFood(f) && !anytime(f) && f.time >= "21:00");
  if (late.length) add("late", "Ate after 9 PM", `${[...new Set(late.map((f) => `${MEAL_SLOT[f.meal] ? f.meal : (f.name || "").replace(/ \(.*\)$/, "")} at ${f.time}`))].slice(0, 2).join(", ")}. Last meal before 9 PM`);
  const first = {}; for (const f of foods) { const sl = MEAL_SLOT[f.meal]; if (sl && isFood(f) && !anytime(f) && (!first[sl] || f.time < first[sl].time)) first[sl] = { time: f.time, meal: f.meal }; }
  const times = Object.values(first).sort((a, b) => a.time.localeCompare(b.time)), mins = (t) => +t.slice(0, 2) * 60 + +t.slice(3);
  for (let i = 1; i < times.length; i++) {
    const gap = mins(times[i].time) - mins(times[i - 1].time);
    if (gap < 300) { add("gap", "Meals less than 5 hours apart", `${times[i - 1].meal} at ${times[i - 1].time}, ${times[i].meal} at ${times[i].time}: ${Math.floor(gap / 60)} h ${gap % 60} min. Wait at least 5 hours`); break; }
  }
  if (sum((f) => f.foodId === "gum") > 5) add("gum", "More than 5 sticks of gum", "5 sugar free gum sticks a day, no fruit flavours");
  return out;
}
const PROVITA_EQ = { provita: 1, provita2: 2, ryvita: 2, ricecake: 2 }; // 1 Ryvita or rice cake = 2 Provitas
/** Portions in one logged item, e.g. "2 medium" oranges = 2. */
const portions = (f) => { const x = FOOD_BY_ID[f.foodId]; const n = x ? parseFloat(x.serving) : NaN; return (Number.isFinite(n) && n >= 1 && n <= 5 && !x.unit ? n : 1) * (f.qty || 1); };
const MEAL_SLOT = { Breakfast: 1, "Meal 1": 1, Lunch: 2, "Meal 2": 2, Dinner: 3, "Meal 3": 3 }; // active minutes needed for the Move points (or reach the step goal)
export const POINTS_VERSION = 2;
// Bumped with every release. The server (same deploy) reports its version; a phone running an older copy reloads itself.
export const APP_VERSION = "37";

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
export const emptyRecord = () => ({ profile: {}, foods: [], exercises: [], weights: [], treats: [], tasks: [], reflections: [], challenges: [], water: [], sleep: [], steps: [], checkins: [], measures: [], routine: [], quick: [] });
// Picture journal: tap what you did today, no writing needed.
export const JOURNAL_CHECKS = [
  ["veg", "🥦", "I ate vegetables"], ["fruit", "🍎", "I ate fruit"], ["water", "🥛", "I drank water"], ["moved", "🏃🏾", "I moved my body"],
  ["slept", "😴", "I slept well"], ["nofizzy", "🚫🥤", "No fizzy drinks"], ["nosweets", "🚫🍬", "No sweets"], ["breakfast", "🍳", "I ate breakfast"],
  ["smallplate", "🍽️", "Smaller portions"], ["helped", "🤝🏾", "I helped someone"], ["calm", "🧘🏾", "I stayed calm"], ["proud", "💪🏾", "I am proud of today"],
];
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
  const P = () => { const c = ctx.config() || {}; return { ...DEFAULT_CONFIG.points, ...(c.pointsVersion === POINTS_VERSION ? c.points || {} : {}) }; };
  const T = () => ({ ...DEFAULT_CONFIG.treat, ...((ctx.config() || {}).treat || {}) });
  const waterTarget = () => ((ctx.config() || {}).water || DEFAULT_CONFIG.water).target || 8;
  const sleepTarget = (r) => Math.max(((ctx.config() || {}).sleep || DEFAULT_CONFIG.sleep).target || 7, r && r.profile && r.profile.age && r.profile.age < 18 ? 8 : 0);
  // Junior easy check (under 18s): one tap per habit instead of detailed logging. Each answer stands in for the detailed log.
  const QUICK = {
    food: { much: "😋 Too much", ok: "👍 On point", little: "🥺 Too little" },
    move: { yes: "🏃🏾 Yes, 20+ minutes", bit: "🚶🏾 A little", no: "🛋️ Not yet" },
    water: { lots: "💧 8 glasses or more", some: "🥤 A few glasses", little: "🌵 Hardly any" },
    sleep: { good: "😴 Slept well", ok: "🙂 Okay", bad: "🥱 Badly" },
    mood: { great: "😀 Great", good: "🙂 Good", meh: "😐 So so", sad: "😞 Not good" },
    gap: { yes: "✅ Yes, 5 hours", no: "❌ No, I ate in between" },
    meal: { little: "🥺 Too little", ok: "👍 Enough", much: "😋 Too much", skip: "⏭️ Skipped" },
    snack: { little: "🥺 Too little", ok: "👍 Enough", much: "😋 Too much", none: "🚫 No snack" },
  };
  // Juniors tap each meal; snack is optional. Foods off the plan are counted ("how many?").
  const QUICK_MEALS = [["breakfast", "🍳", "Breakfast"], ["lunch", "🥪", "Lunch"], ["dinner", "🍲", "Dinner"], ["snack", "🍎", "Snack"]];
  // [key, icon, label, plural, singular]
  const OFF_PLAN = [["sweets", "🍬", "Sweets", "sweets", "sweet"], ["chocolate", "🍫", "Chocolate", "chocolates", "chocolate"], ["chips", "🍟", "Chips or crisps", "packets of chips", "packet of chips"], ["cooldrink", "🥤", "Cool drink or juice", "cool drinks", "cool drink"], ["biscuits", "🍪", "Biscuits or cake", "biscuits or slices of cake", "biscuit or slice of cake"], ["icecream", "🍦", "Ice cream", "ice creams", "ice cream"], ["takeaway", "🍔", "Takeaway or fast food", "takeaways", "takeaway"]];
  const quickOn = (r, d, kind) => { const q = (r.quick || []).find((x) => x.date === d && x.kind === kind); return q ? q.value : null; };
  const QUICK_SLEEP = { good: 9, ok: 8, bad: 5 }, QUICK_WATER = { lots: 8, some: 4, little: 1 };
  const sleepOn = (r, d) => (r.sleep || []).find((x) => x.date === d) || (quickOn(r, d, "sleep") ? { date: d, hours: QUICK_SLEEP[quickOn(r, d, "sleep")], quick: true } : null);
  const stepGoal = () => ((ctx.config() || {}).steps || DEFAULT_CONFIG.steps).goal || 7500;
  /** Steps for a day: the phone's daily total if logged, otherwise steps recorded with activities. */
  // The phone's daily total already includes steps taken during activities, so take the larger of the two (never add them).
  const daySteps = (r, d) => { const x = (r.steps || []).find((s) => s.date === d); const act = r.exercises.filter((e) => e.date === d).reduce((a, e) => a + (e.steps || 0), 0); return Math.max(x ? x.steps : 0, act); };
  const dayKm = (r, d) => { const k = r.exercises.filter((e) => e.date === d).reduce((a, e) => a + (e.distanceKm || 0), 0); return k || Math.round(daySteps(r, d) * 0.00075 * 10) / 10; };
  const glasses = (r, d) => Math.max(((r.water || []).find((x) => x.date === d) || {}).glasses || 0, quickOn(r, d, "water") === "lots" ? waterTarget() : QUICK_WATER[quickOn(r, d, "water")] || 0);
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
  /** Official weight: the latest weight recorded by the administrator at or before d (or the starting weight). */
  const officialWeightOn = (r, d) => { const w = sortByDate(r.weights).filter((x) => x.verified && x.date <= d); return w.length ? w[w.length - 1].kg : startWeight(r); };
  // Weight lost in one challenge week, as a percentage of body weight (never kg, for privacy). Everyone is
  // ranked, under 18s included (their ranking is capped for safety in the week review). Uses the last weight logged in the week
  // (an official weigh in first) against the last weight before the week (or the starting weight).
  const weekLoss = (r, w0, w1) => {
    const ws = sortByDate(r.weights), inWeek = ws.filter((x) => x.date >= w0 && x.date <= w1); if (!inWeek.length) return null;
    const after = (inWeek.filter((x) => x.verified).pop() || inWeek[inWeek.length - 1]).kg;
    const prev = ws.filter((x) => x.date < w0), before = prev.length ? (prev.filter((x) => x.verified).pop() || prev[prev.length - 1]).kg : startWeight(r);
    if (!before || !after || after >= before) return 0;
    return Math.round(((before - after) / before) * 1000) / 10;
  };
  const hasOfficial = (r) => r.weights.some((x) => x.verified && weighDays().includes(x.date));
  // Under 18 when the age is below 18, or when marked as a junior by the administrator (age not known).
  const isMinor = (r) => !!((r.profile.age && r.profile.age < 18) || (!r.profile.age && r.profile.junior));
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
    const food = r.foods.some((x) => x.date === d) || !!quickOn(r, d, "food") || ["breakfast", "lunch", "dinner", "snack"].some((k) => quickOn(r, d, k)), ex = r.exercises.some((x) => x.date === d), wt = r.weights.some((x) => x.date === d);
    const task = r.tasks.some((x) => x.date === d), reflect = r.reflections.some((x) => x.date === d) || !!quickOn(r, d, "mood"), chal = r.challenges.some((x) => x.date === d);
    const g = glasses(r, d), water = g > 0, waterGoal = g >= waterTarget();
    const sl = sleepOn(r, d), slept = !!sl, sleepGoal = !!sl && sl.hours >= sleepTarget(r);
    const stp = daySteps(r, d), stepsGoal = stp >= stepGoal(), wtv = r.weights.some((x) => x.date === d && x.verified);
    const checkin = (r.checkins || []).some((x) => x.date === d);
    return { food, ex, wt, wtv, task, reflect, chal, water, waterGoal, glasses: g, slept, sleepGoal, steps: stp, stepsGoal, checkin, any: checkin || food || ex || wt || task || reflect || chal || water || slept || stp > 0 || (r.routine || []).some((x) => x.date === d) || (r.quick || []).some((x) => x.date === d) };
  }
  const activeMinutes = (r, d) => r.exercises.filter((e) => e.date === d).reduce((a, e) => a + (e.minutes || 0), 0) + ({ yes: MOVE_MINUTES, bit: 10 }[quickOn(r, d, "move")] || 0);
  /** The daily scorecard: the ONLY source of daily points. Each item counts once per day. */
  /** Meals logged on a day (Breakfast or Meal 1, Lunch or Meal 2, Dinner or Meal 3; snacks do not count) and whether it was too little food. */
  function eating(r, d) {
    const foods = r.foods.filter((f) => f.date === d);
    // Drinks, supplements and medicines do not make a meal (a Panado or a coffee at breakfast is not breakfast).
    const meals = new Set(foods.filter((f) => !NOT_A_MEAL.has((FOOD_BY_ID[f.foodId] || {}).cat)).map((f) => MEAL_SLOT[f.meal]).filter(Boolean)).size;
    const kcal = foods.reduce((a, f) => a + (f.kcal || 0), 0), onPlan = !!PLANS[(r.profile.name || "").split(" ")[0].toLowerCase()];
    const minKcal = onPlan ? 0 : isMinor(r) ? 1200 : 800;
    const fruit = foods.filter((f) => (FOOD_BY_ID[f.foodId] || {}).cat === "Fruit").reduce((a, f) => a + portions(f), 0);
    const plan = PLANS[(r.profile.name || "").split(" ")[0].toLowerCase()];
    const provitas = foods.reduce((a, f) => a + (PROVITA_EQ[f.foodId] || 0) * (f.qty || 1), 0);
    const flags = [];
    if (fruit > (plan ? plan.fruit : FRUIT_ALLOWANCE)) flags.push({ k: "fruit", label: "Too much fruit", how: `${fruit} fruits today. The allowance is ${plan ? plan.fruit : FRUIT_ALLOWANCE}: fruit sugar adds up` });
    const provMax = plan ? plan.provita : 6;
    if (provitas > provMax) flags.push({ k: "provita", label: "Too many Provitas", how: `${provitas} today. The allowance is ${provMax}` });
    const w = weekOf(d), weekFoods = w ? r.foods.filter((f) => f.date >= w.w0 && f.date <= w.w1) : foods;
    flags.push(...planFlags(r, d, foods, weekFoods));
    // Junior easy check: an honest one tap answer counts as logging the day's food (no starving penalty); too much or too little is flagged gently.
    const qf = quickOn(r, d, "food");
    const qm = {}; for (const [k] of QUICK_MEALS) qm[k] = quickOn(r, d, k);
    const off = OFF_PLAN.map(([k, i, l, pl, one]) => { const n = Number(quickOn(r, d, "off_" + k) || 0); return [n === 1 ? one : pl, n]; }).filter(([, n]) => n > 0);
    if (!foods.length && (QUICK_MEALS.some(([k]) => qm[k]) || off.length)) {
      const main = ["breakfast", "lunch", "dinner"], name = { breakfast: "breakfast", lunch: "lunch", dinner: "dinner", snack: "snack" }, and = (a) => a.length > 1 ? a.slice(0, -1).join(", ") + " and " + a[a.length - 1] : a[0];
      const eaten = main.filter((k) => qm[k] && qm[k] !== "skip").length;
      const much = QUICK_MEALS.map(([k]) => k).filter((k) => qm[k] === "much"), little = QUICK_MEALS.map(([k]) => k).filter((k) => qm[k] === "little");
      const qflags = [];
      if (much.length) qflags.push({ k: "quickmuch", label: `Too much at ${and(much.map((k) => name[k]))}`, how: "Tomorrow: smaller portions, water before meals, vegetables first" });
      if (little.length) qflags.push({ k: "quicklittle", label: `Too little at ${and(little.map((k) => name[k]))}`, how: "Growing bodies need proper meals. Tell a parent if you were not hungry or could not eat" });
      if (quickOn(r, d, "gap") === "no") qflags.push({ k: "quickgap", label: "Did not wait 5 hours between meals", how: "Leave about 5 hours between meals, with only water in between" });
      if (off.length) qflags.push({ k: "offplan", label: "Foods off the plan", how: off.map(([pl, n]) => `${n} ${pl}`).join(", ") });
      return { meals: eaten, kcal: 0, minKcal: 0, onPlan, fruit: 0, provitas: 0, flags: qflags, tooLittle: false, enough: eaten >= MEALS_NEEDED, quick: "meals", quickMeals: qm, off };
    }
    if (qf && !foods.length) {
      const qflags = qf === "much" ? [{ k: "quickmuch", label: "Ate too much today", how: "Tomorrow: smaller portions, water before meals, vegetables first" }] : qf === "little" ? [{ k: "quicklittle", label: "Ate too little today", how: "Growing bodies need 3 proper meals. Tell a parent if you were not hungry or could not eat" }] : [];
      return { meals: MEALS_NEEDED, kcal: 0, minKcal: 0, onPlan, fruit: 0, provitas: 0, flags: qflags, tooLittle: false, enough: true, quick: qf };
    }
    return { meals, kcal, minKcal, onPlan, fruit, provitas, flags, tooLittle: foods.length > 0 && kcal < minKcal, enough: meals >= MEALS_NEEDED && !(kcal < minKcal) };
  }
  /** Result of an official weigh in compared with the previous official weight. Gain −10, no loss or less than the minimum −5 / +3, minimum met +5. */
  function weighResult(r, d) {
    if (d < WEIGH_RESULT_FROM) return null;
    const cur = sortByDate(r.weights).filter((x) => x.verified && x.date === d).pop(); if (!cur || !isWeighDay(d)) return null;
    const prev = sortByDate(r.weights).filter((x) => x.verified && x.date < d).pop(); if (!prev) return null;
    const p = P(), weeksN = diffDays(prev.date, d) / 7, min = Math.round((isMinor(r) ? WEIGH_MIN_PER_WEEK.junior : WEIGH_MIN_PER_WEEK.adult) * weeksN * 10) / 10;
    const lost = Math.round((prev.kg - cur.kg) * 10) / 10, f = (n) => n.toFixed(1).replace(".", ",");
    // Children under 12 are still growing: keeping their weight steady is the goal, so they are never pushed to lose.
    if (isChild(r)) {
      const growth = Math.round(0.25 * weeksN * 10) / 10;
      if (lost >= 0) return { pts: p.weighMinMet, lost, min: 0, label: lost > 0 ? "Weigh in: weight lost (child plan)" : "Weigh in: weight kept steady (child plan)", how: lost > 0 ? `Down ${f(lost)} kg. For children, steady is the goal` : "Steady weight while growing taller is a win" };
      if (-lost <= growth) return { pts: 0, lost, min: 0, label: "Weigh in: normal growth (child plan)", how: `Up ${f(-lost)} kg: within normal growth, no points lost` };
      return { pts: p.weighBelowMin, lost, min: 0, label: "Weigh in: weight gained (child plan)", how: `Up ${f(-lost)} kg, more than normal growth. Focus on water, vegetables and active play` };
    }
    if (lost < 0) return { pts: p.weighGain, lost, min, label: "Weigh in: weight gained", how: `Up ${f(-lost)} kg since ${prev.date.slice(8)}/${prev.date.slice(5, 7)}` };
    if (lost === 0) return { pts: p.weighBelowMin, lost, min, label: "Weigh in: no weight lost", how: `Minimum was ${f(min)} kg` };
    if (lost < min) return { pts: p.weighLost, lost, min, label: "Weigh in: weight lost, below the minimum", how: `Lost ${f(lost)} kg; the minimum was ${f(min)} kg` };
    return { pts: p.weighMinMet, lost, min, label: "Weigh in: minimum loss met", how: `Lost ${f(lost)} kg (minimum ${f(min)} kg)` };
  }
  function scorecard(r, d) {
    const st = dayStatus(r, d), p = P(), mins = activeMinutes(r, d), ruleOn = d >= EAT_RULE_FROM, eat = eating(r, d);
    const items = [
      { k: "checkin", icon: "👋🏾", label: "Check in", how: "Tap the big button, or log anything", pts: p.checkin, done: st.any },
      ruleOn
        ? { k: "food", icon: "🍽️", label: eat.quick ? "Food check" : "Eat and log 3 meals", how: eat.quick === "meals" ? "Tap breakfast, lunch and dinner" : eat.quick ? `You said: ${QUICK.food[eat.quick]}` : eat.minKcal ? `Breakfast, lunch and dinner, at least ${eat.minKcal.toLocaleString("en-ZA")} kcal` : "Meal 1, Meal 2 and Meal 3 from your plan", pts: p.food, done: eat.enough, progress: eat.enough ? "" : `${eat.meals} of ${MEALS_NEEDED} meals${eat.tooLittle && eat.meals >= MEALS_NEEDED ? ` · only ${eat.kcal} kcal` : ""}`, warn: !eat.enough }
        : { k: "food", icon: "🍽️", label: "Log your food", how: "At least one meal", pts: p.food, done: st.food },
      { k: "move", icon: "👟", label: "Move", how: `${MOVE_MINUTES} active minutes or ${stepGoal().toLocaleString("en-ZA")} steps`, pts: p.exercise, done: mins >= MOVE_MINUTES || st.stepsGoal, progress: mins >= MOVE_MINUTES || st.stepsGoal ? "" : mins ? `${mins} of ${MOVE_MINUTES} min` : st.steps ? `${st.steps.toLocaleString("en-ZA")} steps` : "" },
      { k: "water", icon: "glass", label: "Drink water", how: `${waterTarget()} glasses of 250 ml (${(waterTarget() * 0.25).toString().replace(".", ",")} litres)`, pts: p.water, done: st.waterGoal, progress: st.glasses && !st.waterGoal ? `${st.glasses} of ${waterTarget()}` : "" },
      { k: "sleep", icon: "🌙", label: "Sleep well", how: `${sleepTarget(r)} hours or more`, pts: p.sleep, done: st.sleepGoal },
      { k: "journal", icon: "📓", label: "Journal", how: "Tick what you did today", pts: p.reflect, done: st.reflect },
    ];
    const link = TASK_LINK[dow(d)];
    if (link) {
      const linkedDone = link[0] === "move" ? mins >= 30 || st.task : (items.find((x) => x.k === link[0]) || {}).done || st.task;
      items.push({ k: "task", icon: "🎯", label: "Daily challenge", how: `${taskFor(d, S().start)} · ticks itself with ${link[1]}, no extra points`, pts: 0, done: !!linkedDone, auto: true });
    } else items.push({ k: "task", icon: "🎯", label: "Daily challenge", how: taskFor(d, S().start), pts: p.task, done: st.task });
    if (isWeighDay(d)) items.push({ k: "weighin", icon: "⚖️", label: "Official weigh in", how: "Recorded by the administrator", pts: p.weighin, done: st.wtv, adminOnly: true });
    const wr = weighResult(r, d); if (wr) items.push({ k: "wresult", icon: wr.pts > 0 ? "📉" : "📈", label: wr.label, how: wr.how, pts: wr.pts, done: true, adminOnly: true, penalty: wr.pts < 0, bonus: wr.pts > 0 });
    // Starving or skipping meals costs points once the day is over (only from the rule date, never on days with nothing logged: those are missed days).
    if (ruleOn && d < today() && st.any && !eat.enough) items.push({ k: "eat", icon: "⚠️", label: eat.meals < MEALS_NEEDED ? "Skipped meals" : "Too little food", how: eat.meals < MEALS_NEEDED ? `Only ${eat.meals} of ${MEALS_NEEDED} meals logged` : `Only ${eat.kcal} kcal: starving slows progress and harms health`, pts: p.eatPenalty, done: true, penalty: true });
    // Bad habit flags (no points): e.g. more than the daily fruit allowance.
    for (const f of eat.flags) items.push({ k: "flag", icon: "🚩", label: f.label, how: f.how, pts: 0, flag: true, done: false });
    if (d >= FLAG_RULE_FROM && eat.flags.length > FLAG_LIMIT) items.push({ k: "flagpen", icon: "🚩", label: `${eat.flags.length} bad habits today`, how: `More than ${FLAG_LIMIT} flags in one day costs points. Remove a wrong entry if it was a mistake.`, pts: p.flagPenalty, done: true, penalty: true });
    const max = items.filter((x) => !x.adminOnly && !x.penalty && !x.flag && x.k !== "wresult").reduce((a, x) => a + x.pts, 0);
    return { items, max, taskDone: !!(items.find((x) => x.k === "task") || {}).done, earned: st.any ? items.filter((x) => x.done).reduce((a, x) => a + x.pts, 0) : 0 };
  }
  /** The five healthy habits for a day (used for the habit charts). */
  const HABIT_KEYS = ["food", "move", "water", "sleep", "journal"];
  function habitsOn(r, d) { const it = scorecard(r, d).items, o = {}; for (const k of HABIT_KEYS) o[k] = !!(it.find((x) => x.k === k) || {}).done; return o; }
  /** Body mass index = kg / m². Adult categories (WHO); under 18s need a BMI for age chart instead. */
  function bmi(r, kg) {
    const h = r.profile.heightCm; if (!h || !kg) return null;
    const v = kg / Math.pow(h / 100, 2), minor = isMinor(r);
    const cat = minor ? null : v < 18.5 ? "Underweight" : v < 25 ? "Healthy weight" : v < 30 ? "Overweight" : v < 35 ? "Obesity class I" : v < 40 ? "Obesity class II" : "Obesity class III";
    return { value: Math.round(v * 10) / 10, cat, minor };
  }
  /**
   * Weekly catch up ledger (information only: it never changes points, because past days are locked).
   * For days a..b it adds up what was needed and what was done. A shortfall becomes a "loan" to cover later in the week.
   */
  function ledger(r, a, b) {
    const s = S(), from = [a, s.start, r.profile.joinedDate || a].sort().pop(), to = b < s.end ? b : s.end;
    const e = energy(r), minor = isMinor(r), wt = waterTarget(), stg = sleepTarget(r), sg = stepGoal();
    const L = { days: 0, move: { need: 0, done: 0 }, water: { need: 0, done: 0 }, foodDays: 0, sleepDays: 0, journalDays: 0, kcalOver: null, missedFood: [], missedMove: [] };
    if (e && !minor && !habitsOnly(r)) L.kcalOver = 0;
    for (let d = from; d <= to; d = addDays(d, 1)) {
      if (holiday(d)) continue;
      L.days++;
      const mins = activeMinutes(r, d), stepsOk = daySteps(r, d) >= sg;
      L.move.need += MOVE_MINUTES; L.move.done += stepsOk ? Math.max(mins, MOVE_MINUTES) : mins;
      if (!stepsOk && mins < MOVE_MINUTES) L.missedMove.push(d);
      L.water.need += wt; L.water.done += Math.min(glasses(r, d), wt + 4);
      const t = dayTotals(r, d);
      if (r.foods.some((f) => f.date === d)) { L.foodDays++; if (L.kcalOver !== null) L.kcalOver += t.eaten - e.target - t.burned; } else L.missedFood.push(d);
      const sl = sleepOn(r, d); if (sl && sl.hours >= stg) L.sleepDays++;
      if (r.reflections.some((x) => x.date === d)) L.journalDays++;
    }
    L.move.owed = Math.max(0, L.move.need - L.move.done);
    L.water.owed = Math.max(0, L.water.need - L.water.done);
    if (L.kcalOver !== null) L.kcalOver = Math.round(L.kcalOver);
    return L;
  }
  function dayPoints(r, d, t = today()) {
    const st = dayStatus(r, d);
    if (st.any) return scorecard(r, d).earned;
    return d < t && !holiday(d) && !beforeJoin(r, d) ? P().missed : 0;
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
  // Challenge months: 4 full challenge weeks each (Tuesday to Monday, 28 days), so every month is the same length
  // and closes on a Monday, five days before an official Saturday weigh in. The last one is the final stretch to the Grand Finale.
  function challengeMonths() {
    const s = S(), out = [], short = (d) => new Date(d + "T12:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" });
    let d = s.start, n = 1;
    while (d <= s.end) {
      const end = addDays(d, 27), to = end < s.end ? end : s.end, last = to === s.end;
      out.push({ key: "M" + n, n, from: d, to, label: `Month ${n}${last && diffDays(d, to) < 27 ? " (final stretch)" : ""} · ${short(d)} to ${short(to)}` });
      d = addDays(to, 1); n++;
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
      const prevW = prevWd ? officialWeightOn(r, prevWd) : sw;
      const cur = (r.weights.find((x) => x.date === wd && x.verified) || {}).kg;
      if (sw && prevW && cur) { const lost = Math.min(prevW - cur, maxRate(r) * 2); pts += Math.round((lost / sw) * 100 * P().perPercent); }
    });
    return pts;
  }
  function periodScore(r, memberId, a, b) {
    const s = S(), t = today();
    let pts = 0;
    for (let d = a < s.start ? s.start : a; d <= b && d <= t && d <= s.end; d = addDays(d, 1)) pts += dayPoints(r, d, t);
    // Weekly and monthly awards are for effort only: weight points are kept out so nobody's weight can be guessed.
    return pts + challengePoints(r, a, b) + adjustmentsFor(memberId, a, b);
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
    const sw = startWeight(r), cw = lw ? officialWeightOn(r, lw) : sw;
    const lostKg = sw && cw ? sw - cw : 0;
    const pct = sw ? (lostKg / sw) * 100 : 0;
    const minor = isMinor(r), habits = habitsOnly(r);
    const wk = Math.max(1, (diffDays(s.start, last) + 1) / 7), safeKg = maxRate(r) * wk;
    const countedKg = lostKg > 0 ? Math.min(lostKg, safeKg) : lostKg;
    const weightPts = habits || t < s.start ? 0 : Math.round((sw ? (countedKg / sw) * 100 : 0) * p.perPercent);
    const tooFast = diffDays(s.start, last) >= 13 && lostKg > safeKg;
    const goal = r.profile.goalWeight && sw && sw > r.profile.goalWeight ? Math.min(100, Math.max(0, (lostKg / (sw - r.profile.goalWeight)) * 100)) : null;
    const pctSafe = sw ? (countedKg / sw) * 100 : 0; // final Biggest Loser measure: % lost at official weigh ins, capped at the safe pace
    return { id: memberId, pctSafe, official: hasOfficial(r), habit, checkins, missed, streak, sw, cw, lostKg, pct, weightPts, total: habit + weightPts, minor, habits, tooFast, goal, treats: tr, rewards: sw ? Math.max(0, Math.floor(pct / 2.5)) : 0 };
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
        stepGoalDays: (() => { let n = 0; for (let d = s.start; d <= t && d <= s.end; d = addDays(d, 1)) if (daySteps(r, d) >= stepGoal()) n++; return n; })(),
        sleepGoalDays: new Set(r.sleep.filter((x) => x.date >= s.start && x.hours >= sleepTarget(r)).map((x) => x.date)).size,
        journalDays: new Set(r.reflections.filter((x) => x.date >= s.start).map((x) => x.date)).size,
        tasksThisWeek: (() => { const cw = currentWeek(); return r.tasks.filter((x) => x.date >= cw.w0 && x.date <= cw.w1).length; })(),
      };
    }
    const winners = (getPts) => { const v = ids.map((id) => ({ id, pts: getPts(id) })); const top = Math.max(-Infinity, ...v.map((x) => x.pts)); return { top, winners: top > 0 ? v.filter((x) => x.pts === top).map((x) => x.id) : [] }; };
    // Weekly and monthly awards are presented at the first official weigh in after the period closes,
    // and only once the administrator has entered the weights for that weigh in. Until then nobody is named.
    const recorded = new Set(weighDays().filter((d) => d <= t && ids.some((id) => R(id).weights.some((x) => x.verified && x.date === d))));
    const presentOn = (end) => weighDays().find((d) => d > end) || (end >= s.end ? weighDays().find((d) => d >= end) || null : null);
    const result = (period, end, getPts) => { const on = presentOn(end), closed = end < t, done = closed && !!on && recorded.has(on); const w = winners(getPts); return { ...period, closed, presentOn: on, done, top: done ? w.top : null, winners: done ? w.winners : [] }; };
    // The weekly award (most points) opens every Tuesday, the day after the week closes (no waiting for a weigh in).
    // The week's biggest weight loss is also celebrated, as a treat yourself (not an award): (% of body weight; under 18s ranked too, their loss counted up to 1% a week for safety).
    const weekWeight = (w) => {
      const lost = ids.map((id) => { const r = R(id), pct = weekLoss(r, w.w0, w.w1), junior = isMinor(r); return { id, pct, junior, rank: junior ? Math.min(pct || 0, 1) : pct }; })
        .filter((x) => x.pct > 0).sort((a, b) => b.rank - a.rank || b.pct - a.pct);
      const topRank = lost.length ? lost[0].rank : 0, win = lost.filter((x) => x.rank === topRank);
      return { topPct: win.length ? Math.max(...win.map((x) => x.pct)) : 0, weightWinners: win.map((x) => x.id), weightPodium: lost.slice(0, 3).map((x) => ({ id: x.id, pct: x.pct, junior: x.junior })) };
    };
    const weeksRes = cws.map((w) => {
      const closed = w.w1 < t, pw = winners((id) => summaries[id].weekPts[w.n]), ww = closed ? weekWeight(w) : { topPct: 0, weightWinners: [], weightPodium: [] };
      return { ...w, closed, presentOn: addDays(w.w1, 1), done: closed, top: closed ? pw.top : null, winners: closed ? pw.winners : [], ...ww };
    });
    // Monthly awards open on the last day of the month: the administrator's app announces the winner at 21:00 that day and
    // saves it (config.monthAwards), so the winner never changes afterwards. If that was missed, it is worked out the next day.
    const snaps = (ctx.config() || {}).monthAwards || {};
    const monthsRes = ms.map((m) => {
      const snap = snaps[m.key], closed = m.to < t || !!snap, pw = winners((id) => summaries[id].monthPts[m.key]);
      if (snap) return { ...m, closed: true, presentOn: snap.date || m.to, done: true, top: snap.top, winners: snap.winners || [], topPct: snap.topPct || 0, weightWinners: snap.weightWinners || [] };
      return { ...m, closed, presentOn: m.to, done: closed, top: closed ? pw.top : null, winners: closed ? pw.winners : [] };
    });
    const leaders = (metric) => { const v = ids.map((id) => ({ id, v: metric(id) })); const top = Math.max(-Infinity, ...v.map((x) => x.v)); return top > 0 ? v.filter((x) => x.v === top).map((x) => x.id) : []; };
    // Greatest Effort: the most points from healthy habits (check ins, movement, steps, water, sleep, journal, tasks); weight not included.
    const consistent = leaders((id) => summaries[id].habit * 1000 + summaries[id].checkins);
    const resilience = leaders((id) => summaries[id].exerciseMinutes);
    const ranking = [...ids].sort((a, b) => summaries[b].total - summaries[a].total || summaries[b].checkins - summaries[a].checkins);
    // Biggest Loser: the highest percentage of starting weight lost at the official (administrator recorded) weigh ins.
    const blRank = ids.filter((id) => !summaries[id].habits && summaries[id].official).sort((a, b) => summaries[b].pctSafe - summaries[a].pctSafe);
    const biggestLoser = blRank.length && summaries[blRank[0]].pctSafe > 0 ? blRank[0] : null;
    const over = t > s.end;
    for (const id of ids) {
      const x = summaries[id];
      x.weeklyWins = weeksRes.filter((w) => w.done && w.winners.includes(id)).length;
      // Dates each award or badge was won, so the Awards page can show "× 2 · last on 24 Nov".
      x.weeklyWinDates = weeksRes.filter((w) => w.done && w.winners.includes(id)).map((w) => w.presentOn);
      x.weeklyLossDates = weeksRes.filter((w) => w.done && w.weightWinners.includes(id)).map((w) => w.presentOn);
      x.weeklyLossWins = x.weeklyLossDates.length;
      x.monthlyWinDates = monthsRes.filter((m) => m.done && m.winners.includes(id)).map((m) => m.presentOn);
      x.monthlyWins = monthsRes.filter((m) => m.done && m.winners.includes(id)).length;
      x.isConsistent = consistent.includes(id);
      x.isResilience = resilience.includes(id);
      x.isBL = biggestLoser === id;
      x.over = over;
    }
    const effortRank = [...ids].sort((a, b) => summaries[b].habit - summaries[a].habit);
    return { summaries, results: { weeks: weeksRes, months: monthsRes, consistent, resilience, biggestLoser, ranking, blRank, effortRank, over } };
  }

  return {
    weighDays, isWeighDay, nextWeighDay, lastWeighDay, startWeight, weightOn, latestWeight, isMinor, isChild, habitsOnly, maxRate, planRate,
    calorieFloor, energy, dayTotals, dayStatus, dayPoints, scorecard, weighResult, activeMinutes, ledger, eating, habitsOn, HABIT_KEYS, bmi, beforeJoin, challengeWeeks, currentWeek, challengeMonths, weeks, treats, score, periodScore,
    bestStreak, challengeDay, computeAll, weekLoss, QUICK, quickOn, QUICK_MEALS, OFF_PLAN, P, T, glasses, waterTarget, sleepTarget, sleepOn, stepGoal, daySteps, dayKm, officialWeightOn,
  };
}

// Badges (achievements) derived from a member's official summary.
export const BADGES = {
  weekly: { label: "Weekly Challenge", test: (a) => a.weeklyWins > 0, dates: "weeklyWinDates", how: "Score the most points in a challenge week." },
  monthly: { label: "Monthly Challenge", test: (a) => a.monthlyWins > 0, dates: "monthlyWinDates", how: "Score the most points in a challenge month (4 weeks). Opens on the last day of the month." },
  consistency: { label: "Consistency Star", test: (a) => a.bestStreak >= 7, how: "Check in 7 days in a row." },
  movement: { label: "Movement Hero", test: (a) => a.maxWeekMins >= 150, how: "Exercise 150 minutes in one challenge week." },
  hydration: { label: "Hydration Hero", test: (a) => a.waterGoalDays >= 7, how: "Reach your water goal on 7 days." },
  steps: { label: "Step Master", test: (a) => a.stepGoalDays >= 7, how: "Reach your daily step goal on 7 days." },
  sleep: { label: "Well Rested", test: (a) => a.sleepGoalDays >= 7, how: "Reach your sleep goal on 7 nights." },
  journal: { label: "Thoughtful Stoic", test: (a) => a.journalDays >= 7, how: "Write in your journal on 7 days." },
  healthy: { label: "Healthy Choice", test: (a) => a.foodDays >= 7, how: "Log your food on 7 different days." },
  comeback: { label: "Resilience Champion", test: (a) => a.comeback, how: "Miss a day, then come back and earn a treat token week." },
  progress: { label: "Progress Pro", test: (a) => a.pct >= 2.5, how: "Lose 2.5% of your starting weight." },
  discipline: { label: "Discipline Champion", test: (a) => a.bestStreak >= 14, how: "Check in 14 days in a row." },
  team: { label: "Team Player", test: (a) => a.weighIns >= 3, how: "Attend 3 official Saturday weigh ins." },
  transformation: { label: "Biggest Transformation", test: (a) => a.pct >= 5, how: "Lose 5% of your starting weight." },
  bl: { label: "Biggest Loser Award", test: (a) => a.weeklyLossWins > 0 || (a.isBL && a.over), dates: "weeklyLossDates", lead: (a) => a.isBL, how: "Unlocked every time you lose the most weight (% of body weight) in a challenge week, counted each time you win it. The final Biggest Loser Award (highest % of starting weight lost at the official weigh ins) is revealed at the Grand Finale." },
  resilienceAward: { label: "Resilience Challenge Award", test: (a) => a.isResilience && a.over, lead: (a) => a.isResilience, how: "Log the most exercise minutes by the end of the challenge." },
  consistentAward: { label: "Most Consistent Participant · Greatest Effort", test: (a) => a.isConsistent && a.over, lead: (a) => a.isConsistent, how: "Earn the most points from healthy habits: movement, steps, water, sleep, journal and check ins. Revealed at the Grand Finale." },
  grand: { label: "Grand Champion", test: (a) => a.isBL && a.over, how: "Win the Biggest Loser Award at the end of the challenge." },
};

// Fields of a summary that reveal health information; removed before sharing with other participants.
export const PRIVATE_FIELDS = ["sw", "cw", "lostKg", "pct", "pctSafe", "goal", "rewards", "tooFast", "weightPts", "minor", "habits", "official"];
// Fields that would give away the final results; hidden from everyone until the Grand Finale reveal.
export const SEALED_FIELDS = ["total", "habit", "isBL", "isConsistent", "isResilience", "exerciseMinutes"];
export function finaleTime(settings, config) { const f = (config && config.finale) || {}; return f.revealAt || `${settings.end}T09:00:00+02:00`; }
