# Stride

Stride is a fitness web app that turns your height, weight and goal into a daily calorie target, a 7-day Indian meal plan and a weekly workout. It also lets you log food, water, workouts and weight, and shows your progress over time.

Built as a college project (Project Expo) with plain HTML, CSS and JavaScript. Supabase provides login and the database. There is no build step and no framework.

**Live demo:** `https://divyanshsinghu-png.github.io/STRIDE/`

---

## Contents

1. [Features](#features)
2. [Screenshots](#screenshots)
3. [Tech stack](#tech-stack)
4. [Project structure](#project-structure)
5. [Setup](#setup)
6. [How the numbers are calculated](#how-the-numbers-are-calculated)
7. [Database](#database)
8. [Security](#security)
9. [How the app is organised](#how-the-app-is-organised)
10. [Responsive design and accessibility](#responsive-design-and-accessibility)
11. [Troubleshooting](#troubleshooting)
12. [Known limitations](#known-limitations)
13. [Future scope](#future-scope)

---

## Features

**Accounts**
- Sign up and log in with email and password (Supabase Auth).
- A Log in / Sign up switch that fits on one screen in both modes, with a show/hide password button.
- Logging in always opens on the Today page, never on the page you last left.

**Onboarding (3 steps)**
- Step 1: name, age, gender, height, weight.
- Step 2: goal (lose, maintain or gain), goal weight and activity level.
- Step 3: food preference (vegetarian, eggetarian or non-vegetarian), workout location (home or gym) and experience.
- Every field is validated, and Enter moves to the next step.

**Today**
- Calorie ring showing calories eaten against your daily target, with protein, carbs and fat bars.
- Today's workout from your weekly plan, a "Mark as done" button and a 🔥 day streak.
- Water tracker in litres with an "Add a glass" button.
- BMI gauge with your healthy weight range.
- Your pace, with an estimated goal date.

**Food**
- 31 common Indian foods, filtered by your food preference, with search.
- One tap adds a food to today. You can also add a custom food with its calories, and remove entries.

**Diet**
- A 7-day meal plan (breakfast, lunch, snack, dinner) with calories per meal, matched to your food preference.
- Print button.

**Workout**
- A weekly plan that depends on your experience, goal and location (home or gym). Today is highlighted.
- Print button.

**Progress**
- Starting, current and goal weight, plus a progress bar towards your goal.
- Weight log form and a line chart with a dashed goal line.
- A "This week" chart of daily calories (green within target, pink over), workouts done and average calories.

**Profile**
- View and edit your details, and log out.
- Changing your weight also saves it as today's weight log.

---

## Screenshots

Add your own images to `docs/screenshots/` and they will show here.

| Login | Today | Food |
|---|---|---|
| ![Login](docs/screenshots/login.png) | ![Today](docs/screenshots/today.png) | ![Food](docs/screenshots/food.png) |

| Progress | Mobile |
|---|---|
| ![Progress](docs/screenshots/progress.png) | ![Mobile](docs/screenshots/mobile.png) |

---

## Tech stack

| Part | Choice |
|---|---|
| Front end | HTML, CSS, JavaScript (no framework, no build step) |
| Backend | [Supabase](https://supabase.com): Auth and PostgreSQL |
| Supabase client | `@supabase/supabase-js` v2.58.0, loaded from the jsDelivr CDN |
| Fonts | Bricolage Grotesque and DM Sans (Google Fonts) |
| Charts and icons | Hand-written inline SVG, no chart library |
| Hosting | GitHub Pages (any static host works) |

---

## Project structure

```
stride/
├── index.html     Page shell: loads fonts, the Supabase library, style.css and script.js
├── style.css      All styling, including the sidebar and mobile layout
├── script.js      All logic: auth, onboarding, calculations, tracking, rendering
├── schema.sql     Database tables and security policies
└── README.md
```

---

## Setup

### 1. Create a Supabase project

1. Sign in at [supabase.com](https://supabase.com) and create a new project.
2. Go to **Project Settings > API** and copy the **Project URL** and the **anon / publishable key**.

### 2. Create the tables

1. Open **SQL Editor > New query**.
2. Paste the contents of `schema.sql` and click **Run**.
3. The script is safe to run again if you change something.

### 3. Allow sign-up without email confirmation

Go to **Authentication > Providers > Email** and turn **Confirm email** off. If it is on, new users cannot log in until they click a link in an email, and the app will tell you to turn it off.

### 4. Add your keys

Open `script.js`. The first lines are:

```js
const SUPABASE_URL = "https://YOUR-PROJECT.supabase.co";
const SUPABASE_KEY = "YOUR-PUBLISHABLE-KEY";
```

Replace both values with yours. Use only the public anon or publishable key. Never put the `service_role` key in this project.

### 5. Run it

Open `index.html` in a browser. If your browser blocks anything when opening the file directly, use a tiny local server instead:

```bash
npx serve .
```

or the **Live Server** extension in VS Code.

### 6. Deploy on GitHub Pages

1. Push the project to a GitHub repository.
2. Go to **Settings > Pages**, choose **Deploy from a branch**, pick `main` and `/ (root)`, and save.
3. After a minute your site is live at `https://YOUR-USERNAME.github.io/REPO-NAME/`.
4. In Supabase, go to **Authentication > URL Configuration** and set **Site URL** to that address.

---

## How the numbers are calculated

All formulas are in the `calc()` function in `script.js`.

**BMI** = weight (kg) / height (m)²

| BMI | Category |
|---|---|
| below 18.5 | Underweight |
| 18.5 to 24.9 | Healthy range |
| 25 to 29.9 | Overweight |
| 30 and above | Obese |

The healthy weight range shown is the weight for your height at BMI 18.5 and BMI 24.9.

**BMR** (Mifflin-St Jeor equation, calories your body burns at rest)
- Male: `10 × weight + 6.25 × height(cm) − 5 × age + 5`
- Female: `10 × weight + 6.25 × height(cm) − 5 × age − 161`

**Maintenance calories (TDEE)** = BMR × activity factor

| Activity level | Factor |
|---|---|
| Sedentary | 1.2 |
| Light (1 to 3 days a week) | 1.375 |
| Moderate (3 to 5 days a week) | 1.55 |
| Active (6 to 7 days a week) | 1.725 |

**Daily target**

| Goal | Target | Pace |
|---|---|---|
| Lose weight | TDEE − 500, never below 1,500 kcal (men) or 1,200 kcal (women) | about 0.5 kg a week |
| Maintain | TDEE | not applicable |
| Gain weight | TDEE + 400 | about 0.3 kg a week |

**Macros**
- Protein: 1.8 g per kg of body weight (1.6 g per kg when maintaining).
- Fat: 25% of the daily calories (9 kcal per gram).
- Carbs: the remaining calories (4 kcal per gram).

**Water** = 0.035 litres × body weight. It is shown as glasses of 250 ml, between 8 and 16.

**Estimated goal date**
- When you have logged weights covering at least 7 days and you are moving towards your goal, the date is projected from your real rate of change.
- Otherwise it uses the planned pace above.

**Workout streak**
- Counts consecutive planned workout days that you marked as done.
- Rest days are skipped and do not break the streak.
- Today does not break the streak until the day has passed.

---

## Database

| Table | Purpose | One row per |
|---|---|---|
| `profiles` | Your details and goals | user |
| `weight_logs` | Weight history | user and date |
| `food_logs` | Foods eaten, with calories and macros | food entry |
| `workout_logs` | Whether you finished the day's workout | user and date |
| `water_logs` | Glasses of water | user and date |

`weight_logs`, `workout_logs` and `water_logs` have a unique `(user_id, logged_on)` pair, so saving twice on the same day updates the row instead of adding a duplicate. The full definition is in `schema.sql`.

---

## Security

- The Supabase key in `script.js` is public by design, because the app runs in the browser. It is safe only because **Row Level Security (RLS)** is on for every table.
- Each table has a policy that checks `auth.uid()` against the row's owner, so a user can read and write only their own rows, and cannot insert a row under someone else's id.
- The app also filters weight, food, workout and water queries by user id as a second safeguard.
- Names, emails and food names are escaped before they are shown, to prevent script injection.
- Never commit a `service_role` key. If you ever do, rotate it in Supabase straight away.

---

## How the app is organised

`script.js` is split into labelled sections:

| Section | What it does |
|---|---|
| Calculations | `calc()` returns BMI, calories, macros, pace and water |
| Diet and workout data | Meal tables, exercise lists and `week()`, which builds the weekly plan |
| Boot and auth | Starts Supabase, listens for login and logout, resets the screen state, loads data |
| Onboarding wizard | The three steps, validation and saving the profile |
| Dashboard | Sidebar and the Today, Food, Diet, Workout, Progress and Profile pages |
| Tracker | Loading and saving food, water and workout logs, streak, estimated goal date |

The app keeps its state in one object, `S`, and draws each page into `#main`. Water and workout changes redraw only their own card, so the rest of the page does not flicker.

---

## Responsive design and accessibility

- **Desktop:** a left sidebar and a wide content area with cards of different sizes.
- **Phone (760 px and below):** the sidebar becomes a bottom icon bar, cards stack and are tighter, and the long lists are shortened.
- **Login:** a fixed one-screen layout, so switching modes never pushes the form down.
- Visible keyboard focus, labelled buttons and icons, and `aria-current` on the active tab.
- Animations are turned off for people who prefer reduced motion.
- Plans print cleanly using the Print button.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Blank page | Open the browser console (F12) and read the red error. A wrong Supabase URL or key is the usual cause. |
| "Tracker tables are missing" on Today | Run `schema.sql` in the Supabase SQL Editor, then refresh. |
| "Turn off Confirm email" after signing up | Turn off **Confirm email** under Authentication > Providers > Email, then log in. |
| "Could not save" messages | Check that the tables exist and that the policies in `schema.sql` were created. |
| "Couldn't load your data" | Your connection or Supabase is unreachable. Use Try again. Your data is not lost. |
| Weight chart is empty | The chart needs at least two logged weights. |
| Works locally but not on GitHub Pages | Check that `index.html`, `style.css` and `script.js` are in the same folder in the repo, and set the Site URL in Supabase. |

---

## Known limitations

- Custom foods save calories only, so their protein, carbs and fat count as 0 in the macro bars.
- The meal plan is a fixed weekly rotation. Calories per meal are a guide, and you adjust portion sizes yourself.
- The calorie and macro numbers are estimates for healthy adults, not medical advice. People with a medical condition should ask a doctor or a dietitian.
- Water and workout data are kept for the current day and recent history only on the Today view. The weekly chart covers the last 7 days.

---

## Future scope

- Badges and achievements (first log, 7-day streak, goal reached)
- Progress photos
- Grocery list generated from the meal plan
- PDF report export
- Favourite foods and a swap-meal button
- Body measurements and sleep tracking
- Admin page
- Installable app (PWA) with reminders

---

## Credits

Built by YOUR-NAME for Project Expo. Nutrition formula: Mifflin-St Jeor equation.
