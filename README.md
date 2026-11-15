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

## 3. Security and privacy
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

## 6. Awards
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
