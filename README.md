# Stoic by Choice · Biggest Loser Challenge

A secure, shared challenge app for the crew: registration with email verification, a 4 digit PIN on recognised devices, symbolic avatars, daily activities, weekly, monthly and overall leaderboards, awards, and an Admin Control Centre. It runs entirely on Netlify (free plan) using Netlify Functions and Netlify Blobs.

## 1. One time setup
1. Upload this folder to a private GitHub repository and import it into Netlify (Add new project → Import an existing project → GitHub).
2. In Netlify → Project configuration → Environment variables, add **`SESSION_SECRET`**: a long random text (40+ characters), marked as secret, scoped to Functions. No email settings are needed.
3. Deploys → Trigger deploy → Deploy project without cache.
4. Open the site and **join first**: the first person to join becomes the administrator. Start your name with "Benadette" to be linked to the pre loaded record.

## 2. How participants join
1. Tap **I'm new: join the challenge**.
2. Name (and optional mobile), choose an avatar ("Who are you choosing to become?"), accept the rules, privacy policy and POPIA consent, and create a 4 digit PIN.
3. The administrator approves them in **Admin → Participants** and links them to their pre loaded record.
4. Next time: tap your avatar and type your PIN.

## Food page layout
1. **Today's food:** calories against the target, Breakfast / Lunch / Dinner tiles (✓ with time and calories), snacks with fruit and Provita counts, and any flags.
2. **My eating plan** (Benadette and Judith): one tap plan meals with the time eaten.
3. **Add food:** pick the meal (big buttons), the time eaten, then the food from the drop down list (or type to search).
4. **What I ate today:** grouped by meal with times and calorie subtotals.
5. **Eating plan rules:** folded at the bottom.

## Awards timing
Weekly and Monthly Challenge Awards are presented on an official weigh in day: at the first weigh in Saturday after the week (Tuesday to Monday) or calendar month has closed, and only once the administrator has entered the weights for that weigh in (the server checks this). Until then nobody is named, not even in the data sent to phones; the award shows "presented at the weigh in on …". Weigh ins are every other Saturday, so two weekly awards are usually presented at each weigh in (for example weeks 1 and 2 and the November award on Saturday 5 December). The Board still shows the live standings.

## Food list and eating plans
* About 225 foods, including the eating plan foods (raw chicken, turkey, ostrich, lean beef, veal, game, hake, kingklip, whiting, sole, tuna, calamari, prawns, crayfish, cottage cheese, ricotta, mozzarella, feta, plan vegetables and fruit), Provitas (27 kcal each), Futurelife, beef goulash (109 kcal per 100 g), Sprite Zero (about 3 kcal per 300 ml), Centrum (0 kcal), fat free yoghurt, brown bread, lettuce, cucumber, oranges and naartjies.
* Weighed foods ask for grams or ml, with quick amounts that match the meal plans (for example 65 g, 105 g, 120 g).

## Activities
* Grouped list: walking and running; distances (walk 3, 5, 10 km; run 3, 5, 10, 15, 20, 21.1, 30, 42.2 km; cycle 10, 20, 30 km); gym (spinning, treadmill, elliptical, rowing, StairMaster, weights, circuit, HIIT, CrossFit, body pump, boxing, Zumba, aerobics, Pilates, yoga, aqua aerobics); stairs (including "Stairs: up to a floor and back down", where you enter the floor, for example 15, and how many times); sports and home activities.
* Timed activities use MET values from the Compendium of Physical Activities. Distance activities use about 1 kcal per kg per km for running, 0.55 for walking and 0.28 for cycling. Stairs by floor use about 20 steps per floor and 0.11 kcal per step up and 0.05 kcal per step down for a 70 kg adult (Teh and Aziz, 2002), scaled to body weight.

## Save the app on a phone
* The site is an installable web app with the Stoic by Choice logo as its icon. It opens full screen like a normal app.
* iPhone (Safari): Share ⬆️ → Add to Home Screen → Add. Android (Chrome): ⋮ menu → Install app (or tap "Save the app to my phone" on the Home tab).
* Updates arrive automatically when you upload new files to GitHub; nothing needs reinstalling. Personal data is never stored on the phone by the app's offline helper.

## Simple logging, habits and BMI
* **One tap eating plan** (Log, Food): Judith's and Benadette's printed plans are built in. Tap the line you ate (for example "120 g chicken + 125 g veg") and the protein, vegetables and calories are logged together. Each meal can be chosen once a day, as the plan requires. Provitas and fruit have their own buttons with the daily allowance.
* **Quick log** (Log, Move): one tap for walk 30 min, run 5 km, stairs to floor 15, spinning, gym weights and dancing.
* **Decimals and big numbers:** 2,5 or 2.5 km both work, and steps can be typed as 6420 or 6 420.
* **Habits forming** (Home): a 7 day habit grid, runs of days in a row (habits take about 66 days to become automatic; Lally et al., 2010), daily points, and the team's habit rates for the last 7 days (effort only, no weights).
* **BMI** (Progress, private): weight ÷ height². Shows November 2024, start and now on the WHO adult scale. Under 18s are not given an adult category; their BMI is read on the WHO BMI for age chart. Add heights in My profile or in Admin, Weigh ins, "Heights for BMI".
* Messages with a Stoic quote now stay for 15 seconds; tap to close.
* **Catch up (loans):** anything not done earlier in the challenge week becomes a loan shown on Home: extra Move minutes today (up to 60 in a day), extra glasses (up to 4 extra), calories over budget (cover up to 300 kcal a day by walking or eating a little less, never below the safe minimum and never by skipping meals; not shown for under 18s), and days without food logged. Loans never change past points.
* **End of week list:** on the last day of each challenge week (and the first day of the next), Home lists what was not completed, from eating to exercising. The Challenge tab always shows "This week so far".
* **Eating plan rules for everyone:** the clinic's RULES and NOT ALLOWED sheets are on the Food page ("Eating plan rules") and are checked automatically. Flags appear for: foods not on the plan (milk products, sugar and honey, oil, butter and fried food, pork, lamb, processed or smoked meat, meat stock, alcohol, energy drinks, Diet Coke, medicines with sugar or caffeine); cheese more than once a day; feta more than once a week; proteins mixed in one meal; fruit or Provitas more than 2 at a time; onion over 30 g or tomato over 70 g a day; more than 1 teaspoon of lite mayonnaise or soy sauce; more than 8 coffees; more than 1 litre of diet fizzy drinks or 1 can of Schweppes Lemon Lite; more than 5 sticks of gum. Not allowed foods show ⛔ in the list and a warning before they are added. From 18:00 the food line reminds: last meal before 9 PM.
* **Time eaten:** every food entry and plan meal has a "Time eaten" (it starts at the current time and cannot be later than now). The app flags a meal eaten after 9 PM and meals less than 5 hours apart (for example "Meal 1 at 07:00, Meal 2 at 10:30: 3 h 30 min"). Fruit and Provitas may be eaten any time, as the rules allow. Food logged before this update has no time and is not checked.
* **Bad habit flags:** more than 2 fruits a day (or more than the plan's 5 Provitas) shows a red flag on Home and on the Food page. Flags cost no points.
* **Food list:** search by typing, or choose from one drop down list grouped by type (eating plan, protein, vegetables, fruit, starches, dairy, drinks, snacks, takeaways, extras, supplements, medicines). Medicines include Panado, Benylin, Tensodol, Disprin, Myprodol and Grand Pa; syrups contain some sugar, and the eating plan bans medicines or tonics with sugar, caffeine or fruit flavour, so check with the clinic.

## 3. Security and privacy
* **Today only:** everything is logged for today (South African time). The date cannot be changed, missed days cannot be back dated, and past entries cannot be edited or removed. This is enforced by the server. Only the administrator can record official weigh ins for a weigh in Saturday.
* PINs are stored only as salted scrypt hashes. Easy PINs (1234, 0000…) are refused.
* 5 wrong PINs lock the account for 15 minutes (adjustable). Forgotten PIN: the administrator uses **Reset PIN**.
* Points are calculated on the server from `public/core.js`; nobody can enter their own points.
* Weights are visible only to the person and the administrator. Journal entries are visible only to the person.
* Every admin action, sign in, PIN lock and view of health data is written to the audit log, in line with POPIA accountability.
* Participants can ask the administrator to delete their account and data.
* Note: a 4 digit PIN is convenient rather than bank grade security. Keep the site link within the crew.

## 4. Admin Control Centre
| Section | What it does |
|---|---|
| Dashboard | Participants, groups, active challenges, awards issued, participation this week, quick actions |
| Participants | Approve and link registrations, assign groups, suspend, unlock PINs, sign out devices, grant admin, delete |
| Challenges | Create daily, weekly and monthly challenges with dates and points |
| Leaderboard & scoring | Edit every point value; approve point adjustments for disputes |
| Awards & badges | See automatic award holders; issue or revoke medals |
| Progress | Participation and habits table, confidential weigh in records, record the crew's Saturday weights |
| Communications | Announcements to everyone or one person, with ready made encouragement |
| Reports | Download CSV reports: participation, winners, weigh ins, audit log |
| Settings | Challenge dates, PIN policy, automatic approval, rules and privacy text |
| Audit log | Full history of sensitive actions |

## 5. Scoring (version 2, from 19 November 2026)
Everyone sees the same plain language points guide in three places: a one time "How points work" explainer the first time they open the app after this update (tap "Got it"), "How points work" under Today's points on Home, and "How points are awarded" (open by default) under the leaderboard on the Board.

Every day has one scorecard on the Home tab ("Today's points"). Each line counts **once a day**, so logging more of the same thing never adds extra points. The maximum is 20 points on Tuesday, Friday and Saturday, and 18 on the other days (see the daily challenge).

| Daily scorecard | Points |
|---|---|
| Check in (tap the big button or log anything) | +4 |
| Eat and log 3 meals (breakfast, lunch, dinner or Meal 1, 2, 3; drinks and medicines do not count as a meal) | +3 |
| Move: 20 active minutes or the step goal (7 500) | +5 |
| Water goal (8 glasses) | +3 |
| Sleep goal (7 hours; 8 for under 18s) | +2 |
| Journal (picture checklist) | +1 |
| Daily challenge on Tuesday, Friday and Saturday | +2 |
| Daily challenge on Monday (move 30 min), Wednesday (water), Thursday (sleep), Sunday (reflect) | ticks itself with that habit, no extra points |

| Other | Points |
|---|---|
| Official weigh in (every other Saturday, recorded by the administrator) | +10 |
| Missed day (nothing logged; never before you joined or on public holidays) | −10 |
| Skipped meals or starving (fewer than 3 meals, or under 800 kcal for adults / 1 200 kcal for under 18s; people on a clinic plan only need their 3 plan meals), from 19 Nov 2026 | −5 the next day |
| Treat token week (every day checked in + 150 active minutes) | +15 and a treat day |
| Weight lost at official weigh ins, up to the safe pace | +100 per 1% of starting weight |
| Admin challenges | as set per challenge |

What changed from version 1: steps and activities are one "Move" line (they were counted twice before); the Monday, Wednesday, Thursday and Sunday challenges, which repeat Move, Water, Sleep and Journal, now tick themselves without extra points; the public holiday bonus was removed (holidays still carry no penalty); food points need 3 meals; skipping meals or starving costs 5 points. Steps from the phone and from activities are never added together: the larger number counts. Old point settings saved by the administrator are ignored once and replaced by these values; all logged data is kept and points are recalculated from it.

Under 18s follow the Junior plan (about 0.5 kg a month for ages 6 to 11; at most 0.5 kg a week for teens).

## 6. Food, movement and the coach
* **Food:** type a food and pick it from the list of about 150 common South African foods; calories are filled in from standard values per serving (approximate, based on USDA FoodData Central reference portions and typical local recipes) and recalculated by the server. Foods not in the list can be added as "your estimate".
* **Movement:** daily steps (from the phone's Health or Google Fit app), plus distance and steps estimated for walking, running, hiking, cycling and swimming. Step goal 7 500 (+2 points, adjustable).
* **Coach:** up to three personal nudges on Home (water, sleep, steps, food, journal, getting back on track, and how far behind this week's top effort you are). It never pushes the scale: only official weigh ins count.

## 7. The Grand Finale (sealed results)
* Two winners, revealed together: the **Biggest Loser** (highest percentage of starting weight lost, using only the weights recorded by the administrator at the official Saturday weigh ins, capped at the safe pace) and the **Most Consistent Participant** for the greatest effort (most healthy habit points: check ins, movement, steps, water, sleep, journal, tasks). The Resilience Challenge Award (most exercise minutes) is revealed first.
* Until the reveal, everyone (the administrator included) only sees this week's and this month's effort; final standings, totals and leaders are hidden by the server.
* The reveal happens automatically on 24 April 2027 at 09:00 (South African time), or when the administrator taps **Admin → Settings → Reveal the winners now**. Then open the Board tab together and tap through the ceremony.
* Weekly and monthly awards count effort only, so nobody's weight can be guessed.

**Prizes:** the Biggest Loser wins the **R10 000 grand prize** and the Most Consistent Participant (greatest effort) wins **R2 000**. Both amounts can be changed in Admin → Settings.

## Easy for everyone (reading and writing not needed)
* **Big check in button** at the top of Home: one tap checks you in for the day (+5 points), then four big picture buttons: +1 water, journal, steps, food.
* **Picture journal:** tap a face for your mood and tap pictures of what you did (vegetables, fruit, water, moved, slept well, no fizzy drinks, no sweets, breakfast, smaller portions, helped someone, stayed calm, proud of today). Writing is optional.
* **Progress tab charts** for the last 7, 14 or 30 days: water, sleep, steps, movement minutes, food calories, mood faces and check ins, each with a goal line and a big average number. Tap a bar to see that day's number.

## 8. Your data is safe when you update
* All data is kept in Netlify Blobs (site wide store `kilocrew`), which persists across every deploy. Uploading new code to GitHub replaces the app, never the data.
* New versions of the app read older records safely (missing fields are filled in automatically).
* Never rename the store in `netlify/functions/api.mjs`.
* Extra safety: Admin → Reports → **Download full backup** (for example after each weigh in) and **Restore from a backup file** if ever needed. Backups contain health information: keep them private.

## 9. Awards
Weekly Challenge Award (each Tuesday to Monday week), Monthly Challenge Award (each month), Most Consistent Participant and Resilience Challenge Award (closing ceremony), and the **Biggest Loser Award, presented last** on 24 April 2027. The award images are in `public/img` and are shown unedited.

## 7. Pre loaded records
| Name | 23 Nov 2024 | Start 14 Nov 2026 | Goal |
|---|---|---|---|
| Benadette | 100.9 | 70.9 | 62 |
| Thandi | 118.5 | 88.5 | 70 |
| Kgotso | 76.4 | 52.8 | 45 |
| Judith | 94.0 | 77.6 | 60 |
| Patrick | 79.8 | 64.4 | 50 |
| Thabo | 116.3 | 99.3 | 85 |
| Peter (Kisembo) | 129.0 | not recorded | 85 |

Peter's 2024 weight and goal are added automatically to his record when he joins (or the next time the app loads if he has already joined). His starting weight is recorded at his first official weigh in.

## Sources
* National Institute for Health and Care Excellence (NICE). Obesity: identification, assessment and management. Very low calorie diets (800 kcal a day or less) are not for routine use and need clinical supervision.
* Lally, P., van Jaarsveld, C.H.M., Potts, H.W.W. and Wardle, J. (2010). How are habits formed: modelling habit formation in the real world. European Journal of Social Psychology, 40(6), 998–1009.
* World Health Organization. Body mass index (BMI) classification for adults; WHO growth reference (BMI for age), 5 to 19 years.
* Mifflin MD et al. (1990). American Journal of Clinical Nutrition, 51(2), 241–247 (resting energy equation).
* Hall KD (2008). International Journal of Obesity, 32(3), 573–576 (energy deficit per kg).
* Barlow SE (2007). Pediatrics, 120(Suppl 4), S164–S192; Hampl SE et al. (2023). Pediatrics, 151(2) (safe paediatric weight loss).
* Compendium of Physical Activities: https://pacompendium.com
* South African Government, Public holidays: https://www.gov.za/about-sa/public-holidays
* Protection of Personal Information Act 4 of 2013 (POPIA): https://popia.co.za
