# Stoic by Choice · Biggest Loser Challenge

A secure, shared challenge app for the crew: registration with email verification, a 4 digit PIN on recognised devices, symbolic avatars, daily activities, weekly, monthly and overall leaderboards, awards, and an Admin Control Centre. It runs entirely on Netlify (free plan) using Netlify Functions and Netlify Blobs.

## 1. One time setup (about 20 minutes)

### a) Create a Gmail app password (sends the 6 digit codes)
1. Use a Gmail account for the challenge (your own, or a new one such as stoicbychoice.challenge@gmail.com).
2. Go to myaccount.google.com → **Security** → turn on **2 Step Verification**.
3. Search for **App passwords**, create one called `Stoic by Choice`, and copy the 16 character password.

### b) Put the code on GitHub and Netlify
1. Create a GitHub repository and upload everything in this folder (`public`, `netlify`, `netlify.toml`, `package.json`, `README.md`).
2. In Netlify: **Add new site → Import an existing project → GitHub** → choose the repository → **Deploy**.
   (Netlify's drag and drop upload will not work: it does not run the secure functions.)

### c) Add the environment variables
Netlify → **Site configuration → Environment variables → Add a variable**:

| Key | Value |
|---|---|
| `SESSION_SECRET` | A long random sentence of at least 40 characters that nobody can guess. Never share it. |
| `ADMIN_EMAIL` | The administrator's email address (several can be separated with commas) |
| `SMTP_USER` | The Gmail address from step a |
| `SMTP_PASS` | The 16 character app password from step a |
| `SMTP_HOST` and `SMTP_PORT` | Only if your email is not Google (Gmail or Google Workspace). Ask your email host for its SMTP server and port (465 or 587). |

Then **Deploys → Trigger deploy → Deploy site** so the new settings take effect.

### d) Sign up as administrator first
Open the site and **Create my account** with the `ADMIN_EMAIL` address and your name. You are approved automatically and linked to your pre loaded record (Benadette). Then share the link with the crew.

## 2. How participants join
1. **Sign up**: name, email, optional mobile.
2. **Choose an avatar**: "Who are you choosing to become?" (12 symbolic avatars; the pledge is shown).
3. **Accept** the challenge rules, the privacy policy and the POPIA consent for wellness data.
4. **Verify** with the 6 digit email code and **create a PIN**.
5. Wait for approval: in **Admin → Participants**, approve each person and link them to their pre loaded record (Thandi, Kgotso, Judith, Patrick, Thabo).

Next time they open the app on the same phone they only need their PIN. A new phone needs an email code once. Forgotten PIN: **Forgot my PIN** sends an email code.

## 3. Security and privacy
* PINs are stored only as salted scrypt hashes, never as plain numbers. Easy PINs (1234, 0000…) are refused.
* 5 wrong PINs lock the account for 15 minutes; 10 wrong PINs require an email reset (adjustable in Admin → Settings).
* Email codes expire after 10 minutes, allow 5 tries, and sending is rate limited per email and per network.
* The PIN only works on a device that was verified by email. Signing out or resetting the PIN removes devices.
* Administrators need their PIN **and** a fresh email code every time they sign in (two factor).
* Points are calculated on the server from `public/core.js`; nobody can enter their own points. Admin adjustments need a reason and are logged.
* Weights and wellness details are visible only to the person and the administrator. Others see names, avatars, points, streaks and badges.
* Every admin action, sign in, PIN lock and view of health data is written to the audit log (Admin → Audit log), in line with POPIA accountability.
* Journal entries are private even from administrators: the server only shares the dates they were written.
* Participants can ask the administrator to delete their account and data (Admin → Participants → Delete).

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
