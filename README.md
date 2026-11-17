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

## Food list and eating plans
* About 225 foods, including the eating plan foods (raw chicken, turkey, ostrich, lean beef, veal, game, hake, kingklip, whiting, sole, tuna, calamari, prawns, crayfish, cottage cheese, ricotta, mozzarella, feta, plan vegetables and fruit), Provitas (27 kcal each), Futurelife, beef goulash (109 kcal per 100 g), Sprite Zero (about 3 kcal per 300 ml), Centrum (0 kcal), fat free yoghurt, brown bread, lettuce, cucumber, oranges and naartjies.
* Weighed foods ask for grams or ml, with quick amounts that match the meal plans (for example 65 g, 105 g, 120 g).

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

## 5. Scoring (defaults, editable by the administrator)
| Action | Points |
|---|---|
| Check in (log anything that day) | +5 |
| Movement activity | +3 |
| Daily healthy habit task | +2 |
| Journal entry (private, with mood) | +2 |
| Water goal reached (8 glasses, adjustable) | +2 |
| Sleep goal reached (7 hours for adults, 8 for under 18s, adjustable) | +2 |
| Official weigh in (every other Saturday) | +10 |
| Missed day (from the day you joined; never on public holidays) | −10 |
| Public holiday check in | +3 |
| Treat token week (all days checked in + 150 exercise minutes) | +15 and a 300 kcal treat day |
| Weight lost, up to the safe weekly pace | +100 per 1% of starting weight |
| Admin challenges | as set per challenge |

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

## Sources
* Mifflin MD et al. (1990). American Journal of Clinical Nutrition, 51(2), 241–247 (resting energy equation).
* Hall KD (2008). International Journal of Obesity, 32(3), 573–576 (energy deficit per kg).
* Barlow SE (2007). Pediatrics, 120(Suppl 4), S164–S192; Hampl SE et al. (2023). Pediatrics, 151(2) (safe paediatric weight loss).
* Compendium of Physical Activities: https://pacompendium.com
* South African Government, Public holidays: https://www.gov.za/about-sa/public-holidays
* Protection of Personal Information Act 4 of 2013 (POPIA): https://popia.co.za
