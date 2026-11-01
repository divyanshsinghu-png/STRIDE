// ====== 1. YOUR SUPABASE DETAILS ======
const SUPABASE_URL = "https://mbrceoxufklnigbhbdcm.supabase.co";
const SUPABASE_KEY = "sb_publishable_WhTVOklwPbOc1VX9rt7KDw_x2ie_v4Y";
// =================================================
const $ = (s) => document.querySelector(s),
  app = $("#app");
const S = {
  user: null,
  profile: null,
  logs: [],
  tab: "overview",
  day: (new Date().getDay() + 6) % 7,
  mode: "login",
};
let F = {},
  step = 0,
  sb;
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const ACT = {
  sedentary: [1.2, "Desk job, little exercise"],
  light: [1.375, "Exercise 1–3 days a week"],
  moderate: [1.55, "Exercise 3–5 days a week"],
  active: [1.725, "Exercise 6–7 days a week"],
};
const today = () => {
  const d = new Date();
  return new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
};
const todayIdx = () => (new Date().getDay() + 6) % 7;
const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );
let tt,
  rt = 0;
function resetUI() {
  S.tab = "overview";
  S.last = null;
  S.day = todayIdx();
  S.mode = "login";
  S.profile = null;
  S.logs = [];
  F = {};
  step = 0;
}
function toast(t) {
  clearTimeout(tt);
  const e = $("#toast");
  e.textContent = t;
  e.classList.add("show");
  tt = setTimeout(() => e.classList.remove("show"), 2400);
}

/* ---------- calculations ---------- */
function calc(p, w) {
  const h = p.height_cm / 100,
    bmi = w / (h * h);
  const cat = bmi < 18.5 ? "Underweight" : bmi < 25 ? "Healthy range" : bmi < 30 ? "Overweight" : "Obese";
  const bmr = 10 * w + 6.25 * p.height_cm - 5 * p.age + (p.gender === "male" ? 5 : -161);
  const tdee = Math.round(bmr * ACT[p.activity][0]);
  let target = tdee,
    rate = 0;
  if (p.goal === "lose") {
    target = Math.max(tdee - 500, p.gender === "male" ? 1500 : 1200);
    rate = 0.5;
  }
  if (p.goal === "gain") {
    target = tdee + 400;
    rate = 0.3;
  }
  const prot = Math.round(w * (p.goal === "maintain" ? 1.6 : 1.8)),
    fat = Math.round((target * 0.25) / 9),
    carb = Math.round((target - prot * 4 - fat * 9) / 4);
  const diff = Math.abs(p.goal_weight_kg - w),
    weeks = rate ? Math.ceil(diff / rate) : 0;
  return {
    bmi,
    cat,
    tdee,
    target,
    prot,
    fat,
    carb,
    rate,
    diff,
    weeks,
    water: (w * 0.035).toFixed(1),
    lo: (18.5 * h * h).toFixed(1),
    hi: (24.9 * h * h).toFixed(1),
  };
}
const curW = () => (S.logs.length ? +S.logs[S.logs.length - 1].weight_kg : +S.profile.weight_kg);

/* ---------- diet + workout data ---------- */
const MEALS = {
  B: [
    "Vegetable poha + curd",
    "Moong dal chilla (2) + mint chutney",
    "Oats upma with veggies",
    "Besan chilla (2) + curd",
    "Idli (3) + sambar",
    "Paneer bhurji + 1 roti",
    "Dalia porridge + nuts",
  ],
  L: [
    "Dal, 2 rotis, sabzi, salad",
    "Rajma, jeera rice, cucumber raita",
    "Chole, 2 rotis, salad",
    "Paneer bhurji, roti, dal",
    "Veg pulao, curd, salad",
    "Kadhi, rice, sabzi",
    "Sambar rice, vegetable poriyal",
  ],
  S: [
    "Roasted chana + buttermilk",
    "Fruit bowl + 8 almonds",
    "Sprouts chaat",
    "Roasted makhana",
    "Curd + fruit",
    "Boiled corn + lemon",
    "Sattu drink",
  ],
  D: [
    "Paneer tikka, sautéed veg, 1 roti",
    "Dal khichdi + curd",
    "Soya chunk curry, 1 roti, salad",
    "Palak paneer, 1 roti",
    "Tofu stir-fry + brown rice",
    "Vegetable soup + besan chilla",
    "Moong dal, 2 rotis, lauki sabzi",
  ],
};
function meals(d, diet) {
  const m = { B: MEALS.B[d], L: MEALS.L[d], S: MEALS.S[d], D: MEALS.D[d] };
  if (diet !== "veg") {
    if (d % 2 === 0)
      m.B = [
        "Egg bhurji (3 eggs) + toast",
        "Boiled eggs (3) + fruit",
        "Masala omelette + 1 roti",
        "Egg bhurji + 1 roti",
      ][d >> 1];
    if (d === 1 || d === 5) m.D = "Egg curry + 1 roti, salad";
  }
  if (diet === "nonveg") {
    if ([0, 2, 4].includes(d))
      m.L = [
        "Grilled chicken, rice, dal, salad",
        "Chicken curry (light), 2 rotis, salad",
        "Fish curry, rice, sabzi",
      ][d / 2];
    if (d === 3 || d === 6) m.D = d === 3 ? "Tandoori chicken + sautéed veg" : "Chicken stir-fry + 1 roti";
  }
  return m;
}
const EX = {
  Push: {
    home: ["Push-ups", "Pike push-ups", "Chair dips", "Plank shoulder taps"],
    gym: ["Bench press", "Overhead press", "Incline dumbbell press", "Triceps pushdown"],
  },
  Pull: {
    home: ["Backpack rows", "Superman holds", "Reverse snow angels", "Backpack curls"],
    gym: ["Lat pulldown", "Seated cable row", "Face pulls", "Dumbbell curls"],
  },
  Legs: {
    home: ["Squats", "Lunges", "Glute bridges", "Calf raises"],
    gym: ["Leg press", "Romanian deadlift", "Walking lunges", "Calf raises"],
  },
  Full: {
    home: ["Squats", "Push-ups", "Glute bridges", "Plank", "Mountain climbers"],
    gym: ["Goblet squat", "Dumbbell bench press", "Lat pulldown", "Plank", "Dumbbell RDL"],
  },
  Cardio: {
    home: ["Brisk walk or jog, 30 min", "Jumping jacks, 3 × 45 s", "High knees, 3 × 30 s", "Skipping, 5 min"],
    gym: ["Treadmill incline walk, 25 min", "Cycling, 15 min", "Rowing machine, 10 min"],
  },
  Walk: {
    home: ["Easy 45-minute walk", "10 minutes of stretching"],
    gym: ["Easy 45-minute walk", "10 minutes of stretching"],
  },
  Rest: {
    home: ["Full rest, sleep 7–8 hours", "Light stretching if you like"],
    gym: ["Full rest, sleep 7–8 hours", "Light stretching if you like"],
  },
};
function week(p) {
  let s;
  if (p.experience === "beginner") s = ["Full", "Cardio", "Full", "Rest", "Full", "Walk", "Rest"];
  else if (p.goal === "gain") s = ["Push", "Pull", "Legs", "Rest", "Push", "Legs", "Rest"];
  else if (p.goal === "lose") s = ["Full", "Cardio", "Full", "Cardio", "Full", "Walk", "Rest"];
  else s = ["Push", "Pull", "Legs", "Cardio", "Full", "Walk", "Rest"];
  const sr = { beginner: "2 × 12", intermediate: "3 × 10", advanced: "4 × 8" }[p.experience];
  const rest = p.goal === "gain" ? "rest 90 s" : "rest 45 s";
  return s.map((t) => ({
    t,
    list: EX[t][p.location],
    note: ["Cardio", "Walk", "Rest"].includes(t) ? "" : `${sr}, ${rest}`,
  }));
}

/* ---------- boot + auth ---------- */
async function boot() {
  if (SUPABASE_URL.startsWith("PASTE")) {
    app.innerHTML = `<div class="notice"><h2>One step left</h2><p class="mute" style="margin:10px 0">Open this file in a text editor and paste your Supabase Project URL and anon key at the top of the script.</p></div>`;
    return;
  }
  sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  sb.auth.onAuthStateChange((_e, s) => {
    const u = s?.user || null;
    if (u?.id !== S.user?.id) {
      S.user = u;
      resetUI();
      setTimeout(route, 0);
    }
  });
  const { data } = await sb.auth.getSession();
  S.user = data.session?.user || null;
  route();
}
async function route() {
  const my = ++rt;
  if (!S.user) return authView();
  app.innerHTML = '<div class="load" role="status">Loading your plan…</div>';
  const [pr, lg] = await Promise.all([
    sb.from('profiles').select('*').eq('id', S.user.id).maybeSingle(),
    sb.from('weight_logs').select('*').eq('user_id', S.user.id).order('logged_on'),
  ]);
  if (my !== rt) return;
  if (pr.error || lg.error) return loadFail(pr.error || lg.error);
  S.logs = lg.data || [];
  S.profile = pr.data;
  if (!pr.data) { F = {}; step = 0; return wizard(); }
  await loadExtras();
  if (my !== rt) return;
  dash();
}
function loadFail(e) {
  app.innerHTML = `<div class="notice"><h2>Couldn’t load your data</h2><p class="mute" style="margin:10px 0 18px">${esc(e.message)}</p><div class="btns"><button class="btn" onclick="route()">Try again</button><button class="btn ghost" onclick="logout()">Log out</button></div></div>`;
}
const RINGS = `<svg viewBox="0 0 200 200" role="img" aria-label="Activity rings">${[
  [80, 503, 340, "#FF4D6D"],
  [60, 377, 250, "#FDA4AF"],
  [40, 251, 160, "#E11D48"],
]
  .map(
    ([r, c, d, col]) =>
      `<g fill="none" stroke-width="14" stroke-linecap="round" transform="rotate(-90 100 100)"><circle cx="100" cy="100" r="${r}" stroke="rgba(255,255,255,.08)"/><circle cx="100" cy="100" r="${r}" stroke="${col}" stroke-dasharray="${d} ${c}"/></g>`,
  )
  .join("")}</svg>`;
const COPY = {
  login: {
    title: "Welcome back",
    sub: "Log in to see your plan.",
    btn: "Log in",
    head: "Pick up where you left off.",
    text: "Your calorie target, meals and workouts are saved and waiting.",
    pw: "current-password",
  },
  signup: {
    title: "Create your account",
    sub: "Takes under a minute.",
    btn: "Sign up",
    head: "Three questions. One plan.",
    text: "Your numbers, a 7-day Indian meal plan and a weekly workout, built around you.",
    pw: "new-password",
  },
};
function authView() {
  app.innerHTML = `<div class="auth"><section class="hero"><div class="brand disp" style="font-size:24px">Stride</div>${RINGS}<div><h1 id="hh"></h1><p id="ht" style="margin-top:14px"></p><ol class="preview"><li>Your height, weight and goal</li><li>Food and workout preferences</li><li>Your plan, ready to use</li></ol></div></section>
  <section class="authbox"><div class="seg" role="tablist" aria-label="Account"><i></i><button type="button" role="tab" data-m="login" onclick="setMode('login')">Log in</button><button type="button" role="tab" data-m="signup" onclick="setMode('signup')">Sign up</button></div>
  <h2 id="at"></h2><p class="mute" id="as"></p>
  <form onsubmit="doAuth();return false" novalidate><label for="em">Email</label><input id="em" type="email" autocomplete="email">
  <label for="pw">Password</label><div class="pwrap"><input id="pw" type="password" placeholder="At least 6 characters"><button type="button" class="pwt" onclick="togglePw(this)">Show</button></div>
  <div class="err" id="err" role="alert"></div><button class="btn" id="go" type="submit" style="width:100%;margin-top:6px"></button></form></section></div>`;
  setMode(S.mode);
}
function setMode(m) {
  S.mode = m;
  const c = COPY[m],
    a = $(".auth");
  a.dataset.mode = m;
  document
    .querySelectorAll(".seg [role=tab]")
    .forEach((b) => b.setAttribute("aria-selected", b.dataset.m === m));
  $("#hh").textContent = c.head;
  $("#ht").textContent = c.text;
  $("#at").textContent = c.title;
  $("#as").textContent = c.sub;
  $("#go").textContent = c.btn;
  $("#pw").autocomplete = c.pw;
  $("#err").textContent = "";
  a.classList.remove("swap");
  void a.offsetWidth;
  a.classList.add("swap");
}
function togglePw(b) {
  const i = $("#pw"),
    h = i.type === "password";
  i.type = h ? "text" : "password";
  b.textContent = h ? "Hide" : "Show";
}
async function doAuth() {
  const e = $("#em").value.trim(),
    p = $("#pw").value,
    er = $("#err"),
    b = $("#go");
  er.textContent = "";
  if (!/^\S+@\S+\.\S+$/.test(e)) return (er.textContent = "Enter a valid email address.");
  if (p.length < 6) return (er.textContent = "Password must be at least 6 characters.");
  b.disabled = true;
  b.textContent = "Please wait…";
  const r =
    S.mode === "signup"
      ? await sb.auth.signUp({ email: e, password: p })
      : await sb.auth.signInWithPassword({ email: e, password: p });
  b.disabled = false;
  b.textContent = COPY[S.mode].btn;
  if (r.error) er.textContent = r.error.message;
  else if (S.mode === "signup" && !r.data.session)
    er.textContent = "Account created. Turn off “Confirm email” in Supabase, then log in.";
}
async function logout() {
  await sb.auth.signOut();
}

/* ---------- onboarding wizard ---------- */
function chips(k, opts) {
  return `<div class="chips">${opts.map(([v, l, s]) => `<button type="button" class="chip ${F[k] === v ? "on" : ""}" onclick="pick('${k}','${v}')">${l}${s ? `<small>${s}</small>` : ""}</button>`).join("")}</div>`;
}
const inp = (k, l, t = "number", ph = "") =>
  `<div><label for="f_${k}">${l}</label><input id="f_${k}" data-k="${k}" type="${t}" value="${esc(F[k])}" placeholder="${ph}" step="any"></div>`;
function sync() {
  document
    .querySelectorAll("[data-k]")
    .forEach((i) => (F[i.dataset.k] = i.type === "number" && i.value !== "" ? +i.value : i.value));
}
function pick(k, v) {
  sync();
  F[k] = v;
  wizard();
}
function wizard() {
  const T = [
    ["Tell us about you", "So we can work out your numbers."],
    ["What’s your goal?", "We’ll set a safe pace."],
    ["How do you like to eat and train?", "Your plans will match this."],
  ][step];
  const body = [
    `${inp("name", "Your name", "text")}<div class="row2">${inp("age", "Age (years)")}<div><label>Gender</label>${chips(
      "gender",
      [
        ["male", "Male"],
        ["female", "Female"],
      ],
    )}</div></div><div class="row2">${inp("height_cm", "Height (cm)")}${inp("weight_kg", "Weight (kg)")}</div>`,
    `<label>Goal</label>${chips("goal", [
      ["lose", "Lose weight"],
      ["maintain", "Stay the same"],
      ["gain", "Gain weight"],
    ])}${F.goal && F.goal !== "maintain" ? inp("goal_weight_kg", "Goal weight (kg)") : ""}<label>Activity level</label>${chips(
      "activity",
      Object.entries(ACT).map(([k, v]) => [k, k[0].toUpperCase() + k.slice(1), v[1]]),
    )}`,
    `<label>Food preference</label>${chips("diet", [
      ["veg", "Vegetarian"],
      ["egg", "Eggetarian"],
      ["nonveg", "Non-vegetarian"],
    ])}<label>Where will you work out?</label>${chips("location", [
      ["home", "At home"],
      ["gym", "At a gym"],
    ])}<label>Experience</label>${chips("experience", [
      ["beginner", "Beginner"],
      ["intermediate", "Intermediate"],
      ["advanced", "Advanced"],
    ])}`,
  ][step];
  app.innerHTML = `<div class="wiz" onkeydown="if(event.key==='Enter'&&event.target.tagName==='INPUT')next()"><div class="steps">${[0, 1, 2].map((i) => `<i class="${i <= step ? "on" : ""}"></i>`).join("")}</div><h2>${T[0]}</h2><p class="mute">${T[1]}</p>${body}<div class="err" id="err"></div>
  <div class="wnav">${step ? `<button class="btn ghost" onclick="sync();step--;wizard()">Back</button>` : S.profile ? `<button class="btn ghost" onclick="dash()">Cancel</button>` : '<button class="btn ghost" onclick="logout()">Log out</button>'}<button class="btn" id="nx" onclick="next()">${step === 2 ? "Save and see my plan" : "Continue"}</button></div></div>`;
}
function next() {
  sync();
  const er = $("#err"),
    f = F,
    bad = (m) => (er.textContent = m);
  if (step === 0) {
    if (!f.name?.trim()) return bad("Enter your name.");
    if (!(f.age >= 13 && f.age <= 90)) return bad("Age must be between 13 and 90.");
    if (!f.gender) return bad("Choose a gender.");
    if (!(f.height_cm >= 100 && f.height_cm <= 230)) return bad("Height must be between 100 and 230 cm.");
    if (!(f.weight_kg >= 25 && f.weight_kg <= 250)) return bad("Weight must be between 25 and 250 kg.");
  }
  if (step === 1) {
    if (f.goal === "maintain") f.goal_weight_kg = f.weight_kg;
    if (!f.goal) return bad("Choose a goal.");
    if (!(f.goal_weight_kg >= 25 && f.goal_weight_kg <= 250)) return bad("Enter a goal weight in kg.");
    if (f.goal === "lose" && f.goal_weight_kg >= f.weight_kg)
      return bad("For weight loss, goal weight must be below your current weight.");
    if (f.goal === "gain" && f.goal_weight_kg <= f.weight_kg)
      return bad("For weight gain, goal weight must be above your current weight.");
    if (!f.activity) return bad("Choose an activity level.");
  }
  if (step === 2) {
    if (!f.diet || !f.location || !f.experience) return bad("Pick one option in each row.");
    return save();
  }
  step++;
  wizard();
}
async function save() {
  const b = $("#nx");
  b.disabled = true;
  const row = {
    id: S.user.id,
    name: F.name.trim(),
    age: F.age,
    gender: F.gender,
    height_cm: F.height_cm,
    weight_kg: F.weight_kg,
    goal_weight_kg: F.goal_weight_kg,
    goal: F.goal,
    activity: F.activity,
    diet: F.diet,
    location: F.location,
    experience: F.experience,
  };
  const { error } = await sb.from("profiles").upsert(row);
  if (error) {
    b.disabled = false;
    return ($("#err").textContent = "Could not save: " + error.message);
  }
  if (S.profile && +S.profile.weight_kg !== +F.weight_kg) {
    const r = await sb
      .from("weight_logs")
      .upsert(
        { user_id: S.user.id, logged_on: today(), weight_kg: F.weight_kg },
        { onConflict: "user_id,logged_on" },
      );
    if (!r.error) {
      const l = await sb.from("weight_logs").select("*").eq("user_id", S.user.id).order("logged_on");
      S.logs = l.data || [];
    }
  }
  S.profile = row;
  S.tab = "overview";
  toast("Saved");
  dash();
}

/* ---------- dashboard ---------- */
const IC = (d) => `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const ICONS = {
  overview: IC('<path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>'),
  food: IC('<path d="M3 11h18a9 9 0 0 1-18 0z"/><path d="M8 7c0-1.5 1-2 1-3.5M13 7c0-1.5 1-2 1-3.5"/>'),
  diet: IC('<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>'),
  workout: IC('<path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11"/>'),
  progress: IC('<path d="M3 17l6-6 4 4 8-8M15 7h6v6"/>'),
  profile: IC('<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>'),
};
function dash() {
  const tabs = [['overview','Today'],['food','Food'],['diet','Diet'],['workout','Workout'],['progress','Progress'],['profile','Profile']];
  app.innerHTML = `<div class="shell"><aside class="side"><span class="brand">Stride</span><nav>${tabs.map(([k, l]) => `<button class="${S.tab === k ? 'on' : ''}" aria-label="${l}" ${S.tab === k ? 'aria-current="page"' : ''} onclick="S.tab='${k}';dash()">${ICONS[k]}<span>${l}</span></button>`).join('')}</nav><button class="out" onclick="logout()">Log out</button></aside><main id="main"></main></div>`;
  ({ overview, food: foodTab, diet, workout, progress, profile })[S.tab]();
  if (S.last !== S.tab) window.scrollTo(0, 0);
  S.last = S.tab;
}
function arc(f0, f1, r = 100) {
  const P = (f) => {
      const t = Math.PI * (1 - f);
      return [130 + r * Math.cos(t), 130 - r * Math.sin(t)];
    },
    [a, b] = P(f0),
    [c, d] = P(f1);
  return `M${a} ${b}A${r} ${r} 0 0 1 ${c} ${d}`;
}
function gaugeSVG(b) {
  const f = (Math.min(40, Math.max(12, b)) - 12) / 28,
    t = Math.PI * (1 - f),
    mx = 130 + 100 * Math.cos(t),
    my = 130 - 100 * Math.sin(t);
  const seg = [
    [0, 0.232, "#F7B5C1"],
    [0.232, 0.464, "#4ADE80"],
    [0.464, 0.643, "#F2476A"],
    [0.643, 1, "#A3203F"],
  ];
  return `<svg class="gauge" viewBox="0 0 260 150" role="img" aria-label="BMI ${b.toFixed(1)}"><path d="${arc(0, 1, 100)}" fill="none" stroke="#232328" stroke-width="34"/>${seg.map(([a, c, col]) => `<path d="${arc(a, c)}" fill="none" stroke="${col}" stroke-width="22"/>`).join("")}<circle cx="${mx}" cy="${my}" r="13" fill="#fff" stroke="#09090B" stroke-width="4"/></svg>`;
}
/* ---------- tracker: data ---------- */
const dAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); };
// name, kcal, protein, carbs, fat, type (v veg, e egg, n non-veg)
const FOODS = [
  ['Roti (1)',100,3,18,3,'v'],['Rice (1 cup)',200,4,44,0,'v'],['Dal (1 bowl)',150,9,22,3,'v'],['Rajma (1 bowl)',210,11,32,4,'v'],
  ['Chole (1 bowl)',240,10,34,7,'v'],['Sabzi (1 bowl)',120,3,12,6,'v'],['Paneer bhurji (1 bowl)',250,14,6,19,'v'],['Palak paneer (1 bowl)',230,11,9,17,'v'],
  ['Soya chunk curry (1 bowl)',200,20,14,6,'v'],['Curd (1 bowl)',100,6,8,4,'v'],['Poha (1 plate)',250,5,45,6,'v'],['Idli (2)',130,4,26,1,'v'],
  ['Dosa (1 plain)',170,4,28,5,'v'],['Upma (1 bowl)',210,5,32,7,'v'],['Besan chilla (1)',130,6,14,5,'v'],['Oats (1 bowl)',180,6,30,4,'v'],
  ['Khichdi (1 bowl)',220,8,38,4,'v'],['Banana (1)',100,1,27,0,'v'],['Apple (1)',95,0,25,0,'v'],['Almonds (8)',55,2,2,5,'v'],
  ['Roasted chana (30 g)',110,6,18,2,'v'],['Makhana (1 cup)',90,3,17,0,'v'],['Milk (1 glass)',150,8,12,8,'v'],['Buttermilk (1 glass)',40,2,3,2,'v'],
  ['Boiled egg (1)',78,6,1,5,'e'],['Omelette (2 eggs)',190,13,1,15,'e'],['Egg curry (2 eggs)',250,13,8,18,'e'],
  ['Chicken curry (1 bowl)',280,25,6,17,'n'],['Grilled chicken (150 g)',240,40,0,8,'n'],['Tandoori chicken (2 pc)',260,28,4,14,'n'],['Fish curry (1 bowl)',230,24,5,12,'n'],
];
async function loadExtras() {
  const u = S.user.id;
  const [f, w, h] = await Promise.all([
    sb.from('food_logs').select('*').eq('user_id', u).gte('logged_on', dAgo(6)).order('id'),
    sb.from('workout_logs').select('*').eq('user_id', u).gte('logged_on', dAgo(60)),
    sb.from('water_logs').select('*').eq('user_id', u).eq('logged_on', today()).maybeSingle(),
  ]);
  S.food = f.data || []; S.wk = w.data || []; S.water = h.data?.glasses || 0;
  S.setup = !!(f.error || w.error || h.error);
}
async function put(t, row) {
  const r = await sb.from(t).upsert({ user_id: S.user.id, logged_on: today(), ...row }, { onConflict: 'user_id,logged_on' });
  if (r.error) toast('Could not save: ' + r.error.message);
  return !r.error;
}
const eat = (d = today()) => S.food.filter((x) => x.logged_on === d).reduce((a, x) => ({ k: a.k + x.kcal, p: a.p + +x.protein, c: a.c + +x.carbs, f: a.f + +x.fat }), { k: 0, p: 0, c: 0, f: 0 });
const wkDone = (d = today()) => S.wk.some((x) => x.logged_on === d && x.done);
function streak() {
  const pl = week(S.profile); let n = 0;
  for (let i = 0; i < 90; i++) {
    if (pl[(todayIdx() - i + 700) % 7].t === 'Rest') continue;
    if (wkDone(dAgo(i))) n++; else if (i > 0) break;
  }
  return n;
}
function eta(c, w, p) {
  if (p.goal === 'maintain') return '';
  if ((p.goal === 'lose' && w <= p.goal_weight_kg) || (p.goal === 'gain' && w >= p.goal_weight_kg)) return 'You have reached your goal weight.';
  let days = c.weeks * 7, basis = 'based on your plan';
  const L = S.logs;
  if (L.length >= 2) {
    const span = (new Date(L.at(-1).logged_on) - new Date(L[0].logged_on)) / 864e5, toward = (p.goal === 'lose' ? -1 : 1) * (w - L[0].weight_kg);
    if (span >= 7 && toward > 0) { days = Math.ceil(Math.abs(p.goal_weight_kg - w) / (toward / span)); basis = 'based on your logged weights'; }
  }
  const d = new Date(); d.setDate(d.getDate() + days);
  return `Estimated goal date: <b>${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</b>, ${basis}.`;
}
const NAMES = { Push: 'Push day', Pull: 'Pull day', Legs: 'Leg day', Full: 'Full body', Cardio: 'Cardio', Walk: 'Active recovery', Rest: 'Rest day' };
const waterGoal = () => Math.min(16, Math.max(8, Math.round(calc(S.profile, curW()).water * 4)));
function waterCard() {
  const gl = waterGoal(), pct = Math.min(100, (S.water / gl) * 100);
  return `<h3>Water</h3><div class="wtr"><b>${+(S.water * 0.25).toFixed(2)}</b><span>of ${(gl * 0.25).toFixed(1)} litres</span></div><div class="track wt"><i style="width:${pct}%"></i></div>
  <div class="wbtn"><button class="btn ghost" aria-label="Remove a glass" onclick="setWater(${Math.max(0, S.water - 1)})" ${S.water ? '' : 'disabled'}>−</button><button class="btn" onclick="setWater(${S.water + 1})">Add a glass</button></div>
  <p class="mute" style="margin-top:12px">${S.water} glass${S.water === 1 ? '' : 'es'} today. One glass is 250 ml.</p>`;
}
function wkCard() {
  const tp = week(S.profile)[todayIdx()], done = wkDone(), st = streak(), rest = tp.t === 'Rest';
  return `<h3>Today’s workout</h3><div class="tag" style="color:#FF8FA3;font-weight:700;margin-bottom:10px">${NAMES[tp.t]}${tp.note ? ' · ' + tp.note : ''}</div><ul class="plain">${tp.list.slice(0, 4).map((x) => `<li>${x}</li>`).join('')}</ul>
  <div class="wrow">${rest ? '<span class="mute">Recovery counts. Rest days keep your streak.</span>' : `<button class="btn ${done ? 'ghost' : ''}" onclick="toggleWk()">${done ? 'Done. Undo' : 'Mark as done'}</button>`}<div class="stkbox"><span class="stk">🔥 ${st}</span><span class="mute">day streak</span></div></div>`;
}
async function setWater(n) {
  const o = S.water; S.water = Math.min(30, n); $('#c-water').innerHTML = waterCard();
  if (!(await put('water_logs', { glasses: S.water }))) { S.water = o; $('#c-water').innerHTML = waterCard(); }
}
async function toggleWk() {
  const v = !wkDone();
  if (await put('workout_logs', { done: v })) { S.wk = S.wk.filter((x) => x.logged_on !== today()); S.wk.push({ logged_on: today(), done: v }); toast(v ? 'Workout done' : 'Marked not done'); $('#c-wk').innerHTML = wkCard(); }
}
async function addFood(f) {
  const r = await sb.from('food_logs').insert({ user_id: S.user.id, logged_on: today(), name: f.name, kcal: f.kcal, protein: f.p || 0, carbs: f.c || 0, fat: f.f || 0 }).select().single();
  if (r.error) return toast('Could not save: ' + r.error.message);
  S.food.push(r.data); toast('Added ' + f.name); $('#flog').innerHTML = flog();
}
const addQuick = (i) => { const x = FOODS[i]; addFood({ name: x[0], kcal: x[1], p: x[2], c: x[3], f: x[4] }); };
function addCustom() {
  const n = $('#cn').value.trim(), k = Math.round(+$('#ck').value);
  if (!n || !(k > 0 && k < 5000)) return ($('#cerr').textContent = 'Enter a food name and calories between 1 and 4999.');
  addFood({ name: n, kcal: k }); $('#cn').value = ''; $('#ck').value = '';
}
async function delFood(id) {
  const r = await sb.from('food_logs').delete().eq('id', id);
  if (r.error) return toast('Could not delete: ' + r.error.message);
  S.food = S.food.filter((x) => x.id !== id); $('#flog').innerHTML = flog();
}

/* ---------- Today ---------- */
const ringSVG = (v, m) => { const r = 58, C = 2 * Math.PI * r, f = Math.min(1, v / m); return `<svg viewBox="0 0 140 140" role="img" aria-label="${v} of ${m} kcal"><circle cx="70" cy="70" r="${r}" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="13"/><circle cx="70" cy="70" r="${r}" fill="none" stroke="${v > m ? '#FDA4AF' : '#FF4D6D'}" stroke-width="13" stroke-linecap="round" stroke-dasharray="${f * C} ${C}" transform="rotate(-90 70 70)"/></svg>`; };
function overview() {
  const p = S.profile, w = curW(), c = calc(p, w), e = eat();
  const left = c.target - e.k;
  const tips = [`Drink about ${c.water} litres of water a day.`, p.goal === 'lose' ? 'Keep protein in every meal and fill half your plate with vegetables.' : p.goal === 'gain' ? 'Add a glass of milk or a banana shake between meals.' : 'Weigh yourself once a week, at the same time of day.', 'Sleep 7–8 hours. Poor sleep raises hunger and slows recovery.'];
  $('#main').innerHTML = `<div class="page-h"><div><h2>Hi ${esc(p.name.split(' ')[0])}</h2><p>${new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</p></div></div>
  ${S.setup ? '<div class="notice" style="margin:0 0 20px;max-width:none"><b>Tracker tables are missing.</b> <span class="mute">Run the new SQL in Supabase (see the instructions), then refresh. Food, water and workout logging need it.</span></div>' : ''}
  <div class="g12">
  <div class="card c-7"><h3>Today’s calories</h3><div class="ringrow"><div class="ringbox">${ringSVG(e.k, c.target)}<div class="rc"><b>${e.k}</b><span>of ${c.target} kcal</span></div></div>
    <div class="macs"><p style="font-weight:700;margin-bottom:6px">${left >= 0 ? left + ' kcal left' : -left + ' kcal over'}</p>${[['Protein', e.p, c.prot], ['Carbs', e.c, c.carb], ['Fat', e.f, c.fat]].map(([n, a, t]) => `<div class="macro"><div><span>${n}</span><span>${Math.round(a)} / ${t} g</span></div><div class="track"><i style="width:${Math.min(100, (a / t) * 100)}%"></i></div></div>`).join('')}</div></div>
    <button class="btn ghost" onclick="S.tab='food';dash()">Log food</button></div>
  <div class="card c-5" id="c-wk">${wkCard()}</div>
  <div class="card c-5" id="c-water">${waterCard()}</div>
  <div class="card c-4">${gaugeSVG(c.bmi)}<div class="gtxt"><b>${c.bmi.toFixed(1)}</b><div style="font-weight:700">${c.cat}</div><p class="mute" style="margin-top:6px">Healthy range for your height: ${c.lo}–${c.hi} kg</p></div></div>
  <div class="card c-3x"><h3>Your pace</h3><p>${p.goal === 'maintain' ? `Hold steady at about ${w.toFixed(1)} kg and keep training.` : `To ${p.goal} ${c.diff.toFixed(1)} kg, aim for about ${c.rate} kg a week.`}</p><p style="margin-top:8px">${eta(c, w, p)}</p><ul class="plain" style="margin-top:16px">${tips.map((t) => `<li>${t}</li>`).join('')}</ul></div></div>`;
}

/* ---------- Food ---------- */
function foodList() {
  const q = (S.q || '').toLowerCase(), d = S.profile.diet, ok = (t) => d === 'nonveg' || t === 'v' || (d === 'egg' && t === 'e');
  const r = FOODS.map((x, i) => [x, i]).filter(([x]) => ok(x[5]) && x[0].toLowerCase().includes(q));
  return r.length ? r.map(([x, i]) => `<button class="fi" onclick="addQuick(${i})"><span>${x[0]}</span><span>${x[1]} kcal</span></button>`).join('') : '<p class="mute">No match. Add it as a custom food.</p>';
}
function flog() {
  const c = calc(S.profile, curW()), e = eat(), rows = S.food.filter((x) => x.logged_on === today());
  return `<h3>Today · ${e.k} of ${c.target} kcal</h3>${rows.length ? rows.map((x) => `<div class="fe"><span>${esc(x.name)}</span><span><b class="kcal">${x.kcal}</b><button class="x" aria-label="Remove ${esc(x.name)}" onclick="delFood(${x.id})">✕</button></span></div>`).join('') : '<p class="mute">Nothing logged yet. Tap a food to add it.</p>'}
  <div class="logform" style="margin:20px 0 0"><div style="flex:2"><label for="cn">Custom food</label><input id="cn" type="text" placeholder="e.g. Aloo paratha"></div><div><label for="ck">Calories</label><input id="ck" type="number" placeholder="kcal"></div><button class="btn" onclick="addCustom()">Add</button></div><div class="err" id="cerr"></div>`;
}
function foodTab() {
  S.q = '';
  $('#main').innerHTML = `<div class="page-h"><div><h2>Food log</h2><p>Tap a food to add it to today.</p></div></div><div class="fgrid"><div class="card"><label for="fq" style="margin-top:0">Search foods</label><input id="fq" type="search" placeholder="Search roti, dal, paneer…" oninput="S.q=this.value;$('#fl').innerHTML=foodList()"><div class="fl" id="fl">${foodList()}</div></div><div class="card" id="flog">${flog()}</div></div>`;
}

/* ---------- This week (shown under Progress) ---------- */
function weekCard() {
  const c = calc(S.profile, curW()), days = Array.from({ length: 7 }, (_, i) => dAgo(6 - i)), k = days.map((d) => eat(d).k), mx = Math.max(c.target * 1.3, ...k);
  const logged = k.filter((x) => x > 0), avg = logged.length ? Math.round(logged.reduce((a, b) => a + b, 0) / logged.length) : 0, wo = days.filter((d) => wkDone(d)).length;
  return `<div class="card" style="margin-top:20px"><h3>This week</h3><p class="mute">${wo} workouts done · ${avg ? 'average ' + avg + ' kcal on logged days' : 'no food logged yet'} · target ${c.target} kcal</p>
  <div class="wb">${days.map((d, i) => `<div><i class="${k[i] ? (k[i] > c.target ? 'd' : 'ok') : ''}" style="height:${Math.max(4, (k[i] / mx) * 100)}%" title="${k[i]} kcal"></i>${DAYS[(new Date(d + 'T00:00').getDay() + 6) % 7]}</div>`).join('')}</div></div>`;
}
function progress() { progressBase(); $('#main').insertAdjacentHTML('beforeend', weekCard()); }
function diet() {
  const p = S.profile,
    c = calc(p, curW()),
    m = meals(S.day, p.diet),
    split = [
      ["B", "Breakfast", 0.25],
      ["L", "Lunch", 0.35],
      ["S", "Snack", 0.1],
      ["D", "Dinner", 0.3],
    ];
  $("#main").innerHTML =
    `<div class="page-h"><div><h2>7-day diet plan</h2><p>${{ veg: "Vegetarian", egg: "Eggetarian", nonveg: "Non-vegetarian" }[p.diet]} · about ${c.target} kcal a day</p></div><button class="btn ghost noprint" onclick="window.print()">Print plan</button></div>
  <div class="days">${DAYS.map((d, i) => `<button class="chip ${S.day === i ? "on" : ""}" onclick="S.day=${i};diet()">${d}</button>`).join("")}</div>
  <div class="card">${split.map(([k, n, r]) => `<div class="meal"><b>${n}</b><span>${m[k]}</span><span class="kcal">${Math.round(c.target * r)} kcal</span></div>`).join("")}</div>
  <p class="mute" style="margin-top:14px">Adjust portion sizes to hit each meal’s calories. Swap days freely.</p>`;
}
function workout() {
  const p = S.profile,
    wk = week(p),
    td = (new Date().getDay() + 6) % 7;
  $("#main").innerHTML =
    `<div class="page-h"><div><h2>Weekly workout</h2><p>${p.location === "gym" ? "Gym" : "Home"} · ${p.experience} · goal: ${{ lose: "lose weight", gain: "gain weight", maintain: "stay the same" }[p.goal]}</p></div><button class="btn ghost noprint" onclick="window.print()">Print plan</button></div>
  <div class="wk">${wk.map((d, i) => `<div class="card ${i === td ? "today" : ""}"><h3>${DAYS[i]}${i === td ? " (today)" : ""}</h3><div class="tag">${{ Push: "Push day", Pull: "Pull day", Legs: "Leg day", Full: "Full body", Cardio: "Cardio", Walk: "Active recovery", Rest: "Rest day" }[d.t]}${d.note ? " · " + d.note : ""}</div><ul class="plain">${d.list.map((x) => `<li>${x}</li>`).join("")}</ul></div>`).join("")}</div>
  <p class="mute" style="margin-top:16px">Warm up for 5 minutes first. Stop if anything hurts.</p>`;
}
function chart() {
  const L = S.logs.map((l) => ({ d: l.logged_on, w: +l.weight_kg }));
  if (L.length < 2) return `<p class="mute">Log at least two weights to see your chart.</p>`;
  const g = +S.profile.goal_weight_kg,
    ws = L.map((l) => l.w).concat(g),
    lo = Math.min(...ws) - 1,
    hi = Math.max(...ws) + 1,
    W = 640,
    H = 240,
    P = 36;
  const x = (i) => P + (i * (W - 2 * P)) / (L.length - 1),
    y = (v) => H - P - ((v - lo) / (hi - lo)) * (H - 2 * P);
  return `<svg viewBox="0 0 ${W} ${H}" style="width:100%" role="img" aria-label="Weight over time"><line x1="${P}" x2="${W - P}" y1="${y(g)}" y2="${y(g)}" stroke="#4ADE80" stroke-dasharray="6 5"/><text x="${W - P}" y="${y(g) - 6}" text-anchor="end" font-size="12" fill="#4ADE80">Goal ${g} kg</text><polyline fill="none" stroke="#F2476A" stroke-width="3.5" stroke-linejoin="round" points="${L.map((l, i) => x(i) + "," + y(l.w)).join(" ")}"/>${L.map((l, i) => `<circle cx="${x(i)}" cy="${y(l.w)}" r="5" fill="#09090B" stroke="#FF4D6D" stroke-width="2.5"><title>${l.d}: ${l.w} kg</title></circle>`).join("")}<text x="${P}" y="${H - 8}" font-size="12" fill="#A1A1AA">${L[0].d}</text><text x="${W - P}" y="${H - 8}" text-anchor="end" font-size="12" fill="#A1A1AA">${L[L.length - 1].d}</text></svg>`;
}
function progressBase() {
  const p = S.profile,
    start = S.logs.length ? +S.logs[0].weight_kg : +p.weight_kg,
    now = curW(),
    ch = now - start,
    left = Math.abs(p.goal_weight_kg - now),
    tot = Math.abs(p.goal_weight_kg - start),
    pct =
      p.goal === "maintain" || !tot
        ? 0
        : Math.max(
            0,
            Math.min(100, Math.round(((p.goal === "lose" ? start - now : now - start) / tot) * 100)),
          );
  $("#main").innerHTML =
    `<div class="page-h"><div><h2>Progress</h2><p>Log your weight weekly for the clearest trend.</p></div></div>
  <div class="stats"><div class="card"><b>${start.toFixed(1)} kg</b><span class="mute">Starting weight</span></div><div class="card"><b>${now.toFixed(1)} kg</b><span class="mute">Current (${ch > 0 ? "+" : ""}${ch.toFixed(1)} kg)</span></div><div class="card"><b>${left.toFixed(1)} kg</b><span class="mute">To your goal</span></div></div>
  ${p.goal === "maintain" ? "" : `<div class="card" style="margin-bottom:20px"><div class="macro" style="margin:0"><div><span>Progress to ${p.goal_weight_kg} kg</span><b>${pct}%</b></div><div class="track pt"><i style="width:${pct}%"></i></div></div></div>`}
  <div class="card"><div class="logform"><div><label for="ld">Date</label><input id="ld" type="date" value="${today()}" max="${today()}"></div><div><label for="lw">Weight (kg)</label><input id="lw" type="number" step="0.1" placeholder="${now.toFixed(1)}"></div><button class="btn" onclick="logW()">Save weight</button></div><div class="err" id="err"></div>${chart()}</div>`;
}
async function logW() {
  const d = $("#ld").value,
    w = +$("#lw").value;
  if (!d || !(w >= 25 && w <= 250))
    return ($("#err").textContent = "Enter a date and a weight between 25 and 250 kg.");
  const { error } = await sb
    .from("weight_logs")
    .upsert({ user_id: S.user.id, logged_on: d, weight_kg: w }, { onConflict: "user_id,logged_on" });
  if (error) return ($("#err").textContent = error.message);
  const l = await sb.from("weight_logs").select("*").eq("user_id", S.user.id).order("logged_on");
  S.logs = l.data || [];
  toast("Weight saved");
  progress();
}
function profile() {
  const p = S.profile,
    L = { lose: "Lose weight", gain: "Gain weight", maintain: "Stay the same" },
    D = { veg: "Vegetarian", egg: "Eggetarian", nonveg: "Non-vegetarian" };
  const rows = [
    ["Name", esc(p.name)],
    ["Email", esc(S.user.email)],
    ["Age", p.age],
    ["Gender", p.gender],
    ["Height", p.height_cm + " cm"],
    ["Starting weight", p.weight_kg + " kg"],
    ["Goal", L[p.goal] + " → " + p.goal_weight_kg + " kg"],
    ["Activity", p.activity],
    ["Food", D[p.diet]],
    ["Workout", p.location + ", " + p.experience],
  ];
  $("#main").innerHTML =
    `<div class="page-h"><h2>Profile</h2></div><div class="card"><div class="kv">${rows.map(([k, v]) => `<span>${k}</span><b class="${k === 'Email' ? 'em' : ''}">${v}</b>`).join("")}</div>
  <div style="display:flex;gap:12px;margin-top:26px;flex-wrap:wrap"><button class="btn" onclick="F={...S.profile};step=0;wizard()">Edit details</button><button class="btn ghost" onclick="logout()">Log out</button></div></div>`;
}
boot();