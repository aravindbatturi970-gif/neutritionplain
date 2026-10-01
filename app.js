/* NutriPlan — Application Logic */
"use strict";

/* ============================================================
   State & Persistence
============================================================ */
const STORAGE_KEY = "nutriplan.v1";

const DEFAULT_PROFILE = {
  name: "",
  age: null,
  height: null,
  weight: null,
  diet: "No preference",
  allergies: [],
  dislikes: "",
  waterGoal: 2000,
  clinicianNotes: "",
  onboarded: false,
};

const MEAL_TYPES = [
  { type: "breakfast", label: "Breakfast", emoji: "🌅", time: "08:00" },
  { type: "lunch", label: "Lunch", emoji: "🍚", time: "13:00" },
  { type: "snack", label: "Snack", emoji: "🍎", time: "16:30" },
  { type: "dinner", label: "Dinner", emoji: "🌙", time: "20:00" },
];

let state = {
  theme: "dark",
  profile: { ...DEFAULT_PROFILE },
  plans: {},        // date -> { breakfast: {name, kcal, recipeId}, ... }
  mealLogs: {},     // date -> { breakfast: {status, notes}, ... }  status: done|partial|skipped
  water: {},        // date -> ml
  dayNotes: {},     // date -> string
  weights: {},      // date -> kg
  grocery: [],      // { name, category, checked }
  pro: { connected: false, name: "", status: null, reviews: [] },
  notifMeals: true,
  notifWater: true,
  chat: [],
};

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      state = { ...state, ...saved, profile: { ...DEFAULT_PROFILE, ...(saved.profile || {}) } };
    }
  } catch (e) { /* corrupt storage — start fresh */ }
}

function saveState() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* quota */ }
}

/* ============================================================
   Helpers
============================================================ */
const $ = (id) => document.getElementById(id);
const todayStr = () => fmtDate(new Date());

function fmtDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function parseDate(s) { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); }
function addDays(s, n) { const d = parseDate(s); d.setDate(d.getDate() + n); return fmtDate(d); }
function prettyDate(s) {
  return parseDate(s).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function toast(msg, kind = "") {
  const host = $("toastHost");
  const el = document.createElement("div");
  el.className = `toast ${kind}`;
  el.textContent = msg;
  host.appendChild(el);
  setTimeout(() => { el.style.opacity = "0"; el.style.transition = "opacity 0.3s"; }, 2400);
  setTimeout(() => el.remove(), 2800);
}

/* ============================================================
   Theme (dark / light mode)
============================================================ */
function applyTheme(theme) {
  state.theme = theme;
  document.documentElement.setAttribute("data-theme", theme);
  const btn = $("themeToggle");
  if (btn) btn.textContent = theme === "dark" ? "☀️" : "🌙";
  saveState();
}

function toggleTheme() {
  applyTheme(state.theme === "dark" ? "light" : "dark");
}

/* ============================================================
   Sidebar & View Routing
============================================================ */
const VIEW_TITLES = {
  dashboard: ["Dashboard", "Your day at a glance"],
  plan: ["My Plan", "Daily and weekly meal planning"],
  track: ["Track", "Log meals, notes and weight"],
  recipes: ["Recipes", "Discover safe, suitable recipes"],
  grocery: ["Grocery", "Shopping list generated from your plan"],
  progress: ["Progress", "Trends and adherence"],
  analysis: ["Month-End Analysis", "Deep dive into your month"],
  calendar: ["Calendar", "Plan and history by day"],
  assistant: ["AI Assistant", "Safe, rule-respecting suggestions"],
  profile: ["Profile", "Your details, preferences and allergies"],
  settings: ["Settings", "Appearance, notifications and privacy"],
  professional: ["Professional Portal", "Dietitian review workflow (demo)"],
};

let currentView = "dashboard";

function navigate(view) {
  currentView = view;
  document.querySelectorAll(".view").forEach((v) => (v.hidden = v.id !== `view-${view}`));
  document.querySelectorAll(".nav-item").forEach((n) =>
    n.classList.toggle("active", n.dataset.view === view));
  const [title, subtitle] = VIEW_TITLES[view] || [view, ""];
  $("headerTitle").textContent = title;
  $("headerSubtitle").textContent = subtitle;
  closeSidebar();
  window.scrollTo({ top: 0 });

  const renderers = {
    dashboard: renderDashboard, plan: renderPlan, track: renderTrack,
    recipes: renderRecipes, grocery: renderGrocery, progress: renderProgress,
    analysis: initAnalysisView, calendar: renderCalendar, assistant: renderAssistant,
    profile: renderProfile, settings: renderSettings, professional: renderProfessional,
  };
  if (renderers[view]) renderers[view]();
}

/* ============================================================
   Plan generation (respects allergies / diet / dislikes)
============================================================ */
function isSafeForUser(item) {
  const allergies = state.profile.allergies || [];
  const diet = state.profile.diet;
  const dislikes = (state.profile.dislikes || "").toLowerCase()
    .split(",").map((s) => s.trim()).filter(Boolean);

  // Never violate allergies — hard rule.
  if ((item.allergens || []).some((a) => allergies.includes(a))) return false;

  if (diet && diet !== "No preference") {
    if (!(item.diet || []).includes(diet)) {
      // Pescatarian/eggetarian are supersets handled via diet tags already.
      return false;
    }
  }
  if (dislikes.some((d) => item.name.toLowerCase().includes(d))) return false;
  return true;
}

function pickMeal(mealType, excludeNames = []) {
  const pool = FOOD_DB.filter((f) => f.meal === mealType && isSafeForUser(f)
    && !excludeNames.includes(f.name));
  if (!pool.length) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

function generateDayPlan(date) {
  const plan = {};
  let used = [];
  for (const m of MEAL_TYPES) {
    const pick = pickMeal(m.type, used);
    if (pick) { plan[m.type] = { name: pick.name, kcal: pick.kcal, cuisine: pick.cuisine }; used.push(pick.name); }
  }
  if (Object.keys(plan).length) state.plans[date] = plan;
  saveState();
}

function generateWeekPlan(startDate) {
  for (let i = 0; i < 7; i++) generateDayPlan(addDays(startDate, i));
}

/* ============================================================
   Dashboard
============================================================ */
function renderDashboard() {
  const date = todayStr();
  const plan = state.plans[date];
  const logs = state.mealLogs[date] || {};

  // Next unlogged meal
  let next = null;
  for (const m of MEAL_TYPES) {
    if (plan && plan[m.type] && !logs[m.type]) { next = { ...m, item: plan[m.type] }; break; }
  }
  $("nextMealName").textContent = next ? next.item.name : (plan ? "All logged for today! 🎉" : "No meals planned yet");
  $("nextMealMeta").textContent = next
    ? `${next.label} · ${next.item.kcal} kcal · ${next.time}`
    : (plan ? "Great consistency today." : "Generate a plan from the My Plan view.");

  $("quickLogBtn").disabled = !next;
  $("quickLogBtn").onclick = () => {
    if (next) { setMealLog(date, next.type, "done"); toast(`${next.label} logged!`, "success"); }
  };

  // Hydration
  updateWaterUI();

  // Completion
  updateCompletionUI();

  // Mini week
  const miniWeek = $("miniWeek");
  miniWeek.innerHTML = "";
  for (let i = 6; i >= 0; i--) {
    const d = addDays(date, -i);
    const pct = dayCompletionPct(d);
    const div = document.createElement("div");
    div.className = "mini-day";
    div.innerHTML = `<span class="d-pct">${pct}%</span>${parseDate(d).toLocaleDateString(undefined, { weekday: "short" })}`;
    miniWeek.appendChild(div);
  }

  renderTodayMeals();
}

function renderTodayMeals() {
  const date = todayStr();
  const plan = state.plans[date];
  const grid = $("todayMeals");
  grid.innerHTML = "";

  if (!plan) {
    grid.innerHTML = `<div class="empty-state" style="grid-column: 1/-1;">
      <span class="empty-icon">🍽️</span><h3>No meals yet</h3>
      <p>Create your first day plan to see meals here.</p>
      <button class="btn primary" data-nav="plan" style="margin-top:0.8rem;">Go to My Plan</button></div>`;
    return;
  }

  const logs = state.mealLogs[date] || {};
  for (const m of MEAL_TYPES) {
    const item = plan[m.type];
    if (!item) continue;
    const log = logs[m.type];
    const status = log ? log.status : "planned";
    const card = document.createElement("div");
    card.className = "meal-card";
    card.innerHTML = `
      <div class="meal-card-header">
        <span class="meal-type-emoji">${m.emoji}</span>
        <div><div class="meal-type-name">${m.label}</div><div class="meal-type-time">${m.time}</div></div>
        <span class="badge ${status}" style="margin-left:auto;">${status}</span>
      </div>
      <div class="meal-card-name">${escapeHtml(item.name)}</div>
      <div class="meal-card-meta">${item.kcal} kcal · ${item.cuisine || ""}</div>
      <div class="meal-actions">
        <button class="btn small primary" data-log="${m.type}" data-status="done" ${status === "done" ? "disabled" : ""}>✓ Done</button>
        <button class="btn small" data-log="${m.type}" data-status="partial" ${status === "partial" ? "disabled" : ""}>~ Partial</button>
        <button class="btn small ghost" data-log="${m.type}" data-status="skipped" ${status === "skipped" ? "disabled" : ""}>✕ Skip</button>
        <button class="btn small ghost" data-replace="${m.type}">🔄</button>
      </div>`;
    grid.appendChild(card);
  }

  grid.querySelectorAll("[data-log]").forEach((b) =>
    b.addEventListener("click", () => {
      setMealLog(date, b.dataset.log, b.dataset.status);
      toast("Meal logged", "success");
    }));
  grid.querySelectorAll("[data-replace]").forEach((b) =>
    b.addEventListener("click", () => replaceMeal(date, b.dataset.replace)));
}

function setMealLog(date, mealType, status) {
  if (!state.mealLogs[date]) state.mealLogs[date] = {};
  state.mealLogs[date][mealType] = { status, loggedAt: new Date().toISOString() };
  saveState();
  refreshAll();
}

function replaceMeal(date, mealType) {
  const plan = state.plans[date];
  if (!plan) return;
  const existing = Object.values(plan).map((p) => p.name);
  const pool = FOOD_DB.filter((f) => f.meal === mealType && isSafeForUser(f) && !existing.includes(f.name));
  if (!pool.length) { toast("No safe alternatives available for your restrictions", "warn"); return; }
  const pick = pool[Math.floor(Math.random() * pool.length)];
  plan[mealType] = { name: pick.name, kcal: pick.kcal, cuisine: pick.cuisine };
  // A replaced meal is unlogged again.
  if (state.mealLogs[date]) delete state.mealLogs[date][mealType];
  saveState();
  toast(`Replaced with ${pick.name}`, "success");
  refreshAll();
}

function dayCompletionPct(date) {
  const plan = state.plans[date];
  if (!plan) return 0;
  const types = Object.keys(plan);
  const logs = state.mealLogs[date] || {};
  let score = 0;
  for (const t of types) {
    const s = logs[t]?.status;
    if (s === "done") score += 1;
    else if (s === "partial") score += 0.5;
  }
  return Math.round((score / types.length) * 100);
}

function updateCompletionUI() {
  const pct = dayCompletionPct(todayStr());
  $("dayCompletion").textContent = `${pct}%`;
  $("dayCompletionBar").style.width = `${pct}%`;
  const logged = Object.keys(state.mealLogs[todayStr()] || {}).length;
  $("dayCompletionText").textContent = logged
    ? `${logged} meal${logged > 1 ? "s" : ""} logged today`
    : "No meals logged yet";
}

/* ============================================================
   Water tracking
============================================================ */
function addWater(amount) {
  const d = todayStr();
  state.water[d] = (state.water[d] || 0) + amount;
  saveState();
  updateWaterUI();
  toast(`+${amount} ml 💧`, "success");
}
function undoWater() {
  const d = todayStr();
  state.water[d] = Math.max(0, (state.water[d] || 0) - 250);
  saveState();
  updateWaterUI();
}

function updateWaterUI() {
  const goal = state.profile.waterGoal || 2000;
  const val = state.water[todayStr()] || 0;
  const pct = Math.min(100, Math.round((val / goal) * 100));
  $("waterChipVal").textContent = `${val} ml`;
  $("waterPct").textContent = `${pct}%`;
  $("waterSummary").textContent = `${val} of ${goal} ml`;
  const C = 2 * Math.PI * 52;
  const fg = $("waterRingFg");
  fg.style.strokeDasharray = C;
  fg.style.strokeDashoffset = C * (1 - pct / 100);
}

/* ============================================================
   My Plan view
============================================================ */
let planMode = "day";
let planAnchor = todayStr();

function renderPlan() {
  const modeSeg = $("planModeSeg");
  modeSeg.querySelectorAll(".seg-btn").forEach((b) => {
    b.classList.toggle("active", b.dataset.mode === planMode);
    b.onclick = () => { planMode = b.dataset.mode; renderPlan(); };
  });

  const shift = planMode === "week" ? 7 : 1;
  $("planPrev").onclick = () => { planAnchor = addDays(planAnchor, -shift); renderPlan(); };
  $("planNext").onclick = () => { planAnchor = addDays(planAnchor, shift); renderPlan(); };
  $("planToday").onclick = () => { planAnchor = todayStr(); renderPlan(); };
  $("generatePlanBtn").onclick = () => {
    generateWeekPlan(todayStr());
    toast("Week plan generated ✨", "success");
    renderPlan();
  };

  const container = $("planContainer");
  container.innerHTML = "";
  const days = planMode === "week"
    ? Array.from({ length: 7 }, (_, i) => addDays(planAnchor, i))
    : [planAnchor];

  let plannedDays = 0;
  for (const date of days) {
    const plan = state.plans[date];
    if (!plan) continue;
    plannedDays++;
    const wrap = document.createElement("div");
    wrap.innerHTML = `<h3 class="section-title">${prettyDate(date)}${date === todayStr() ? " · Today" : ""}</h3>
      <div class="meal-grid"></div>`;
    const grid = wrap.querySelector(".meal-grid");
    const logs = state.mealLogs[date] || {};
    for (const m of MEAL_TYPES) {
      const item = plan[m.type];
      if (!item) continue;
      const status = logs[m.type]?.status || "planned";
      const card = document.createElement("div");
      card.className = "meal-card";
      card.innerHTML = `
        <div class="meal-card-header">
          <span class="meal-type-emoji">${m.emoji}</span>
          <div><div class="meal-type-name">${m.label} · ${m.time}</div></div>
          <span class="badge ${status}" style="margin-left:auto;">${status}</span>
        </div>
        <div class="meal-card-name">${escapeHtml(item.name)}</div>
        <div class="meal-card-meta">${item.kcal} kcal · ${item.cuisine || ""}</div>
        <div class="meal-actions">
          ${date === todayStr() ? `
          <button class="btn small primary" data-log="${m.type}" data-status="done">✓</button>
          <button class="btn small" data-log="${m.type}" data-status="partial">~</button>
          <button class="btn small ghost" data-log="${m.type}" data-status="skipped">✕</button>` : ""}
          <button class="btn small ghost" data-replace="${m.type}">🔄 Replace</button>
        </div>`;
      grid.appendChild(card);
    }
    wrap.querySelectorAll("[data-log]").forEach((b) =>
      b.addEventListener("click", () => { setMealLog(date, b.dataset.log, b.dataset.status); toast("Logged", "success"); }));
    wrap.querySelectorAll("[data-replace]").forEach((b) =>
      b.addEventListener("click", () => replaceMeal(date, b.dataset.replace)));
    container.appendChild(wrap);
  }

  if (!plannedDays) {
    container.innerHTML = `<div class="empty-state">
      <span class="empty-icon">📅</span><h3>No plan for this period</h3>
      <p>Generate a full week of meals tailored to your preferences and allergies.</p>
      <button class="btn primary" id="emptyGenBtn" style="margin-top:0.8rem;">✨ Generate week plan</button></div>`;
    $("emptyGenBtn").onclick = () => { generateWeekPlan(todayStr()); toast("Week plan generated ✨", "success"); renderPlan(); };
  }
}

/* ============================================================
   Track view
============================================================ */
function renderTrack() {
  const date = todayStr();
  const plan = state.plans[date];
  const logs = state.mealLogs[date] || {};
  const list = $("trackMeals");
  list.innerHTML = "";

  if (!plan) {
    list.innerHTML = `<p class="muted">No plan for today yet — generate one from My Plan.</p>`;
  } else {
    for (const m of MEAL_TYPES) {
      const item = plan[m.type];
      if (!item) continue;
      const row = document.createElement("div");
      row.className = "track-row";
      row.innerHTML = `
        <div class="track-row-info">
          <strong>${m.emoji} ${m.label}</strong> — ${escapeHtml(item.name)}
          <span class="badge ${logs[m.type]?.status || "planned"}" style="margin-left:0.5rem;">${logs[m.type]?.status || "planned"}</span>
        </div>
        <div class="meal-actions">
          <button class="btn small primary" data-log="${m.type}" data-status="done">Done</button>
          <button class="btn small" data-log="${m.type}" data-status="partial">Partial</button>
          <button class="btn small ghost" data-log="${m.type}" data-status="skipped">Skip</button>
        </div>`;
      list.appendChild(row);
    }
    list.querySelectorAll("[data-log]").forEach((b) =>
      b.addEventListener("click", () => { setMealLog(date, b.dataset.log, b.dataset.status); toast("Logged", "success"); }));
  }

  $("dayNotes").value = state.dayNotes[date] || "";
  $("saveNotes").onclick = () => { state.dayNotes[date] = $("dayNotes").value; saveState(); toast("Notes saved", "success"); };

  $("logWeight").onclick = () => {
    const v = parseFloat($("weightInput").value);
    if (!v || v < 20 || v > 400) { toast("Enter a valid weight", "warn"); return; }
    state.weights[date] = v;
    saveState();
    toast("Weight logged", "success");
    $("weightInput").value = "";
  };
}

/* ============================================================
   Recipes view
============================================================ */
let favRecipes = new Set();

function renderRecipes() {
  // Populate filters once
  const cuisineSel = $("recipeCuisine");
  const dietSel = $("recipeDiet");
  if (cuisineSel.options.length === 0) {
    cuisineSel.innerHTML = `<option value="">All cuisines</option>` +
      [...new Set(RECIPES.map((r) => r.cuisine))].map((c) => `<option>${escapeHtml(c)}</option>`).join("");
    dietSel.innerHTML = `<option value="">All diets</option>` +
      DIET_TAGS.map((d) => `<option>${escapeHtml(d)}</option>`).join("");

    cuisineSel.onchange = renderRecipeGrid;
    dietSel.onchange = renderRecipeGrid;
    $("recipeSearch").oninput = renderRecipeGrid;
    $("recipeSafeOnly").onchange = renderRecipeGrid;
  }
  renderRecipeGrid();
}

function renderRecipeGrid() {
  const q = $("recipeSearch").value.toLowerCase().trim();
  const cuisine = $("recipeCuisine").value;
  const diet = $("recipeDiet").value;
  const safeOnly = $("recipeSafeOnly").checked;

  let list = RECIPES.filter((r) => {
    if (q && !(r.name.toLowerCase().includes(q)
      || r.ingredients.some((i) => i.name.toLowerCase().includes(q)))) return false;
    if (cuisine && r.cuisine !== cuisine) return false;
    if (diet && !r.diet.includes(diet)) return false;
    if (safeOnly && !isSafeForUser(r)) return false;
    return true;
  });

  const grid = $("recipeGrid");
  grid.innerHTML = "";
  if (!list.length) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;">
      <span class="empty-icon">🔍</span><h3>No recipes match</h3>
      <p>Try relaxing search or filters — allergy-safe filtering is never relaxed.</p></div>`;
    return;
  }

  for (const r of list) {
    const conflicts = (r.allergens || []).filter((a) => (state.profile.allergies || []).includes(a));
    const safe = conflicts.length === 0;
    const card = document.createElement("div");
    card.className = `recipe-card ${safe ? "" : "recipe-locked"}`;
    card.innerHTML = `
      <h3>${escapeHtml(r.name)}</h3>
      <div class="recipe-meta">
        <span class="tag">⏱ ${r.prepTime} min</span>
        <span class="tag">🔥 ${r.kcalPerServing} kcal</span>
        <span class="tag">${escapeHtml(r.cuisine)}</span>
        ${r.diet.map((d) => `<span class="tag diet">${escapeHtml(d)}</span>`).join("")}
      </div>
      ${safe ? "" : `<div class="recipe-warn">⚠ Contains: ${conflicts.map(escapeHtml).join(", ")} — conflicts with your allergies</div>`}
      <button class="btn small ghost" data-open="${r.id}" style="margin-top:0.6rem;">View recipe →</button>`;
    card.querySelector("[data-open]").addEventListener("click", (e) => {
      e.stopPropagation();
      showRecipeModal(r.id);
    });
    grid.appendChild(card);
  }
}

function showRecipeModal(id) {
  const r = RECIPES.find((x) => x.id === id);
  if (!r) return;
  const conflicts = (r.allergens || []).filter((a) => (state.profile.allergies || []).includes(a));
  $("recipeModalBody").innerHTML = `
    <h2 style="font-size:1.5rem;font-weight:800;margin-bottom:0.4rem;">${escapeHtml(r.name)}</h2>
    <div class="recipe-meta">
      <span class="tag">⏱ ${r.prepTime} min</span><span class="tag">🍽 ${r.servings} servings</span>
      <span class="tag">🔥 ${r.kcalPerServing} kcal/serving</span><span class="tag">${escapeHtml(r.cuisine)}</span>
    </div>
    ${r.diet.map((d) => `<span class="tag diet">${escapeHtml(d)}</span>`).join(" ")}
    ${conflicts.length ? `<div class="allergy-warn">⚠ Allergy warning: contains ${conflicts.map(escapeHtml).join(", ")}. This conflicts with your stored allergies.</div>` : ""}
    <h3 class="section-title">Ingredients</h3>
    <ul style="margin-left:1.2rem;">${r.ingredients.map((i) => `<li>${escapeHtml(i.name)} — ${escapeHtml(i.qty)}</li>`).join("")}</ul>
    <h3 class="section-title">Instructions</h3>
    <ol style="margin-left:1.2rem;">${r.steps.map((s) => `<li>${escapeHtml(s)}</li>`).join("")}</ol>`;
  $("recipeOverlay").hidden = false;
}

function closeRecipeModal() { $("recipeOverlay").hidden = true; }

/* ============================================================
   Kitchen ingredient search (part of Recipes)
============================================================ */
function kitchenSearch(ingredients) {
  const have = ingredients.map((i) => i.toLowerCase().trim()).filter(Boolean);
  return RECIPES.map((r) => {
    const names = r.ingredients.map((i) => i.name.toLowerCase());
    const matched = names.filter((n) => have.some((h) => n.includes(h) || h.includes(n.split(" ")[0]))).length;
    return { recipe: r, matched, missing: r.ingredients.length - matched };
  })
    .filter((x) => x.matched > 0 && isSafeForUser(x.recipe))
    .sort((a, b) => b.matched - a.matched);
}

/* ============================================================
   Grocery view
============================================================ */
function generateGroceryFromWeek() {
  const items = new Map();
  const start = todayStr();
  for (let i = 0; i < 7; i++) {
    const plan = state.plans[addDays(start, i)];
    if (!plan) continue;
    for (const type of Object.keys(plan)) {
      const item = plan[type];
      const recipe = RECIPES.find((r) => r.name.toLowerCase() === item.name.toLowerCase());
      if (recipe) {
        for (const ing of recipe.ingredients) {
          const key = ing.name.toLowerCase();
          items.set(key, { name: ing.name, qty: ing.qty, category: categorizeIngredient(ing.name) });
        }
      } else {
        const key = item.name.toLowerCase();
        if (!items.has(key)) items.set(key, { name: item.name, qty: "1 serving", category: categorizeIngredient(item.name) });
      }
    }
  }
  // Preserve checked state for existing items
  const checkedMap = new Map(state.grocery.map((g) => [g.name.toLowerCase(), g.checked]));
  state.grocery = [...items.values()].map((it) => ({
    ...it, checked: checkedMap.get(it.name.toLowerCase()) || false,
  }));
  saveState();
  renderGrocery();
  toast("Grocery list generated from your week plan", "success");
}

function renderGrocery() {
  const sel = $("customCategory");
  if (sel.options.length === 0) {
    sel.innerHTML = GROCERY_CATEGORIES.map((c) => `<option>${escapeHtml(c)}</option>`).join("");
    $("genGroceryBtn").onclick = generateGroceryFromWeek;
    $("clearCheckedBtn").onclick = () => {
      state.grocery = state.grocery.filter((g) => !g.checked); saveState(); renderGrocery();
    };
    $("printGroceryBtn").onclick = () => window.print();
    $("addCustomItem").onclick = () => {
      const name = $("customItem").value.trim();
      if (!name) return;
      state.grocery.push({ name, qty: "", category: sel.value, checked: false });
      $("customItem").value = "";
      saveState(); renderGrocery();
    };
  }

  const container = $("groceryContainer");
  container.innerHTML = "";
  if (!state.grocery.length) {
    container.innerHTML = `<div class="empty-state">
      <span class="empty-icon">🛒</span><h3>Your list is empty</h3>
      <p>Generate a consolidated list from your weekly plan.</p></div>`;
    return;
  }

  for (const cat of GROCERY_CATEGORIES) {
    const items = state.grocery.filter((g) => g.category === cat);
    if (!items.length) continue;
    const wrap = document.createElement("div");
    wrap.className = "card grocery-cat";
    wrap.innerHTML = `<div class="card-label">${escapeHtml(cat)}</div>`;
    for (const it of items) {
      const row = document.createElement("div");
      row.className = `grocery-item ${it.checked ? "checked" : ""}`;
      row.innerHTML = `
        <input type="checkbox" ${it.checked ? "checked" : ""} aria-label="Check ${escapeHtml(it.name)}">
        <span>${escapeHtml(it.name)}</span>
        <span class="grocery-qty">${escapeHtml(it.qty || "")}</span>
        <button class="icon-btn" aria-label="Remove">🗑</button>`;
      row.querySelector("input").addEventListener("change", (e) => {
        it.checked = e.target.checked; saveState(); renderGrocery();
      });
      row.querySelector(".icon-btn").addEventListener("click", () => {
        state.grocery = state.grocery.filter((g) => g !== it); saveState(); renderGrocery();
      });
      wrap.appendChild(row);
    }
    container.appendChild(wrap);
  }
}

/* ============================================================
   Progress view
============================================================ */
function renderProgress() {
  // Stats
  let done = 0, total = 0, waterDays = 0, weightEntries = Object.keys(state.weights).length;
  const dates = Object.keys(state.plans);
  for (const d of dates) {
    const logs = state.mealLogs[d] || {};
    for (const t of Object.keys(state.plans[d])) {
      total++;
      if (logs[t]?.status === "done") done++;
    }
  }
  for (const d in state.water) if (state.water[d] >= (state.profile.waterGoal || 2000) * 0.8) waterDays++;

  const stats = [
    { v: total ? `${Math.round((done / total) * 100)}%` : "–", c: "Meal adherence (all time)" },
    { v: `${done}/${total}`, c: "Meals completed" },
    { v: waterDays, c: "Days ≥80% water goal" },
    { v: weightEntries, c: "Weight entries" },
  ];
  $("progressStats").innerHTML = stats.map((s) =>
    `<div class="card"><span class="stat-value">${s.v}</span><span class="stat-cap">${s.c}</span></div>`).join("");

  // 30-day adherence chart
  const chart = $("adherenceChart");
  chart.innerHTML = "";
  for (let i = 29; i >= 0; i -= 3) {
    const d = addDays(todayStr(), -i);
    const pct = dayCompletionPct(d);
    const row = document.createElement("div");
    row.className = "hchart-row";
    row.innerHTML = `<span class="hchart-label">${prettyDate(d).replace(/,.*/, "")}</span>
      <div class="hchart-bar-wrap"><div class="hchart-bar" style="width:${pct}%;"></div></div>
      <span class="hchart-val">${pct}%</span>`;
    chart.appendChild(row);
  }

  // 14-day water chart
  const wchart = $("waterChart");
  wchart.innerHTML = "";
  const goal = state.profile.waterGoal || 2000;
  let maxWater = goal;
  for (let i = 13; i >= 0; i--) maxWater = Math.max(maxWater, state.water[addDays(todayStr(), -i)] || 0);
  for (let i = 13; i >= 0; i--) {
    const d = addDays(todayStr(), -i);
    const v = state.water[d] || 0;
    const h = Math.round((v / maxWater) * 100);
    const bar = document.createElement("div");
    bar.className = "vbar-wrap";
    bar.title = `${d}: ${v} ml`;
    bar.innerHTML = `<div class="vbar" style="height:${Math.max(3, h)}%;"></div>
      <span class="vbar-label">${parseDate(d).getDate()}</span>`;
    wchart.appendChild(bar);
  }

  // Weight trend
  const wts = Object.keys(state.weights).sort();
  $("weightTrend").innerHTML = wts.length
    ? `<p><strong>${state.weights[wts[0]]} kg → ${state.weights[wts[wts.length - 1]]} kg</strong> over ${wts.length} entries</p>
       <p class="muted small-text">Trends are informational only — consult a professional for guidance.</p>`
    : `No weight entries yet. Add one from the Track view.`;
}

/* ============================================================
   Month-End Analysis
============================================================ */
let analysisMonth = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; })();

function initAnalysisView() {
  const sel = $("analysisMonth");
  if (sel.options.length === 0) {
    const months = new Set(Object.keys(state.plans).concat(Object.keys(state.water)).concat(Object.keys(state.mealLogs)));
    months.add(analysisMonth);
    const sorted = [...months].sort().reverse();
    sel.innerHTML = sorted.map((m) => {
      const [y, mo] = m.split("-");
      const label = new Date(y, mo - 1, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
      return `<option value="${m}">${label}</option>`;
    }).join("");
    sel.value = analysisMonth;
    sel.onchange = () => { analysisMonth = sel.value; };
    $("runAnalysis").onclick = runAnalysis;
    $("exportAnalysis").onclick = exportAnalysis;
  }
}

function runAnalysis() {
  const [y, mo] = analysisMonth.split("-").map(Number);
  const daysInMonth = new Date(y, mo, 0).getDate();
  const monthDates = Array.from({ length: daysInMonth }, (_, i) => `${analysisMonth}-${String(i + 1).padStart(2, "0")}`);

  let plannedDays = 0, loggedDays = 0, fullyDone = 0;
  let totalScore = 0, scoredDays = 0;
  let waterTotal = 0, waterGoalDays = 0, waterLoggedDays = 0;
  const mealTypeStats = {};
  const skippedMeals = [];
  let bestDay = null, bestPct = -1, worstDay = null, worstPct = 101;
  let kcalSum = 0, kcalDays = 0;

  for (const d of monthDates) {
    const plan = state.plans[d];
    const logs = state.mealLogs[d] || {};

    if (plan) {
      plannedDays++;
      const types = Object.keys(plan);
      let score = 0, anyLog = false;
      for (const t of types) {
        mealTypeStats[t] = mealTypeStats[t] || { done: 0, partial: 0, skipped: 0, planned: 0 };
        const s = logs[t]?.status || "planned";
        mealTypeStats[t][s] !== undefined ? mealTypeStats[t][s]++ : mealTypeStats[t].planned++;
        if (s !== "planned") anyLog = true;
        if (s === "done") score += 1;
        else if (s === "partial") score += 0.5;
        if (s === "skipped") skippedMeals.push(`${prettyDate(d)} — ${t}`);
        kcalSum += plan[t].kcal * (s === "done" ? 1 : s === "partial" ? 0.5 : 0);
      }
      const pct = Math.round((score / types.length) * 100);
      if (anyLog) { loggedDays++; scoredDays++; totalScore += pct; }
      if (pct === 100) fullyDone++;
      if (pct > bestPct) { bestPct = pct; bestDay = d; }
      if (anyLog && pct < worstPct) { worstPct = pct; worstDay = d; }
      if (anyLog) kcalDays++;
    }

    const w = state.water[d] || 0;
    if (w > 0) { waterLoggedDays++; waterTotal += w; if (w >= (state.profile.waterGoal || 2000) * 0.8) waterGoalDays++; }
  }

  const avgAdherence = scoredDays ? Math.round(totalScore / scoredDays) : 0;
  const avgWater = waterLoggedDays ? Math.round(waterTotal / waterLoggedDays) : 0;
  const goal = state.profile.waterGoal || 2000;

  // Insights (rule-based, supportive, non-medical)
  const insights = [];
  if (scoredDays === 0) {
    insights.push({ k: "info", icon: "🌱", t: "No logged meals this month yet. Log a few days and rerun the analysis to see trends." });
  } else {
    if (avgAdherence >= 80) insights.push({ k: "pos", icon: "🌟", t: `Excellent month — ${avgAdherence}% average adherence across ${scoredDays} active days. Consistency like this is the real win.` });
    else if (avgAdherence >= 55) insights.push({ k: "pos", icon: "👍", t: `Solid effort — ${avgAdherence}% average adherence. Small, steady improvements beat perfection.` });
    else insights.push({ k: "warn", icon: "💪", t: `Adherence averaged ${avgAdherence}%. Try simplifying: even logging one meal a day builds the habit.` });

    if (fullyDone) insights.push({ k: "pos", icon: "✅", t: `${fullyDone} day${fullyDone > 1 ? "s were" : " was"} fully completed — your best was ${prettyDate(bestDay)} (${bestPct}%).` });

    const worstType = Object.entries(mealTypeStats)
      .map(([t, s]) => [t, s.skipped])
      .sort((a, b) => b[1] - a[1])[0];
    if (worstType && worstType[1] >= 2) {
      const labels = Object.fromEntries(MEAL_TYPES.map((m) => [m.type, m.label]));
      insights.push({ k: "warn", icon: "⚠️", t: `${labels[worstType[0]] || worstType[0]} was skipped most often (${worstType[1]}×). Consider an easier backup option for that slot.` });
    }

    if (waterLoggedDays === 0) insights.push({ k: "info", icon: "💧", t: "No water logged this month. Hydration tracking takes two taps a day." });
    else {
      const wpct = Math.round((avgWater / goal) * 100);
      insights.push({
        k: wpct >= 80 ? "pos" : "warn", icon: "💧",
        t: `Average hydration: ${avgWater} ml/day (${wpct}% of your ${goal} ml goal). Goal reached on ${waterGoalDays} day${waterGoalDays === 1 ? "" : "s"}.`,
      });
    }

    if (kcalDays >= 4 && kcalSum > 0) {
      const avgKcal = Math.round(kcalSum / kcalDays);
      insights.push({ k: "info", icon: "🍽️", t: `Estimated average intake from your plan: ~${avgKcal} kcal/day (planned meals only, logged portions).` });
    }

    if (plannedDays < monthDates.length * 0.5) {
      insights.push({ k: "info", icon: "📅", t: `You had plans on only ${plannedDays} of ${monthDates.length} days. Planning ahead is the strongest predictor of adherence.` });
    }

    if (worstDay && worstPct >= 0 && scoredDays > 2) {
      insights.push({ k: "info", icon: "🔎", t: `Toughest logged day: ${prettyDate(worstDay)} (${worstPct}%). Check your notes from Track to see what happened.` });
    }
  }
  insights.push({ k: "info", icon: "🛡️", t: "This summary is informational only and is not medical advice." });

  // Best food frequency
  const freq = {};
  for (const d of monthDates) {
    const logs = state.mealLogs[d] || {};
    const plan = state.plans[d];
    if (!plan) continue;
    for (const t of Object.keys(plan)) {
      if (logs[t]?.status === "done") freq[plan[t].name] = (freq[plan[t].name] || 0) + 1;
    }
  }
  const topFoods = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 5);

  window._lastAnalysis = { analysisMonth, plannedDays, loggedDays, scoredDays, fullyDone, avgAdherence, bestDay, bestPct, worstDay, worstPct, mealTypeStats, waterTotal, avgWater, goal, waterGoalDays, waterLoggedDays, kcalDays, kcalSum, insights, topFoods, skippedCount: skippedMeals.length };

  renderAnalysis(monthDates, { plannedDays, loggedDays, fullyDone, avgAdherence, bestDay, bestPct, avgWater, goal, waterGoalDays, mealTypeStats, insights, topFoods });
  toast("Month analysis ready", "success");
}

function renderAnalysis(monthDates, r) {
  const labels = Object.fromEntries(MEAL_TYPES.map((m) => [m.type, m.label]));
  const monthName = new Date(analysisMonth + "-01").toLocaleDateString(undefined, { month: "long", year: "numeric" });

  const hero = [
    { v: `${r.avgAdherence}%`, c: "Avg adherence" },
    { v: `${r.loggedDays}/${r.plannedDays || 0}`, c: "Days logged / planned" },
    { v: r.fullyDone, c: "Perfect days" },
    { v: `${r.avgWater} ml`, c: "Avg water / day" },
  ];

  const typeRows = Object.entries(r.mealTypeStats).map(([t, s]) => {
    const total = s.done + s.partial + s.skipped + s.planned;
    const pct = total ? Math.round(((s.done + s.partial * 0.5) / total) * 100) : 0;
    return `<div class="hchart-row"><span class="hchart-label">${labels[t] || t}</span>
      <div class="hchart-bar-wrap"><div class="hchart-bar" style="width:${pct}%;"></div></div>
      <span class="hchart-val">${pct}%</span></div>`;
  }).join("");

  const weekBars = (() => {
    const weeks = [0, 1, 2, 3].map((w) => {
      const days = monthDates.slice(w * 7, w * 7 + 7).filter((d) => state.plans[d]);
      if (!days.length) return 0;
      const sum = days.reduce((a, d) => a + dayCompletionPct(d), 0);
      return Math.round(sum / days.length);
    });
    return `<div class="vchart" style="height:110px;">` + weeks.map((p, i) =>
      `<div class="vbar-wrap"><div class="vbar" style="height:${Math.max(3, p)}%;"></div>
       <span class="vbar-label">W${i + 1} ${p}%</span></div>`).join("") + `</div>`;
  })();

  const insightsHtml = r.insights.map((i) =>
    `<div class="insight ${i.k}"><span>${i.icon}</span><span>${i.t}</span></div>`).join("");

  const foodsHtml = r.topFoods.length
    ? `<ol style="margin-left:1.2rem;">${r.topFoods.map(([n, c]) => `<li>${escapeHtml(n)} — ${c}× completed</li>`).join("")}</ol>`
    : `<p class="muted">No completed meals recorded this month.</p>`;

  $("analysisContainer").innerHTML = `
    <h3 class="section-title">${monthName} summary</h3>
    <div class="analysis-hero">${hero.map((h) =>
      `<div class="card"><span class="stat-value">${h.v}</span><span class="stat-cap">${h.c}</span></div>`).join("")}</div>
    <div class="analysis-two">
      <div class="card"><div class="card-label">Key insights</div>${insightsHtml}</div>
      <div>
        <div class="card"><div class="card-label">Adherence by meal type</div>${typeRows || '<p class="muted">No data</p>'}</div>
        <div class="card"><div class="card-label">Weekly adherence</div>${weekBars}</div>
        <div class="card"><div class="card-label">Most completed meals</div>${foodsHtml}</div>
      </div>
    </div>`;
}

function exportAnalysis() {
  if (!window._lastAnalysis) { toast("Run the analysis first", "warn"); return; }
  const a = window._lastAnalysis;
  const monthName = new Date(analysisMonth + "-01").toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const lines = [
    "NUTRIPLAN — MONTH-END ANALYSIS REPORT",
    "=".repeat(46),
    `Month: ${monthName}`,
    `Generated: ${new Date().toLocaleString()}`,
    `User: ${state.profile.name || "Anonymous"}`,
    "",
    `Average adherence: ${a.avgAdherence}% (across ${a.scoredDays} active days)`,
    `Days planned: ${a.plannedDays} | Days logged: ${a.loggedDays} | Perfect days: ${a.fullyDone}`,
    a.bestDay ? `Best day: ${a.bestDay} (${a.bestPct}%)` : "Best day: —",
    a.worstDay ? `Toughest logged day: ${a.worstDay} (${a.worstPct}%)` : "Toughest day: —",
    `Meals skipped: ${a.skippedCount}`,
    "",
    "By meal type:",
    ...Object.entries(a.mealTypeStats).map(([t, s]) =>
      `  ${t.padEnd(10)} done=${s.done}  partial=${s.partial}  skipped=${s.skipped}  unlogged=${s.planned}`),
    "",
    `Water: total ${a.waterTotal} ml | avg ${a.avgWater} ml/day | goal ${a.goal} ml | goal days: ${a.waterGoalDays}/${a.waterLoggedDays}`,
    a.kcalDays ? `Estimated intake from plan: ~${Math.round(a.kcalSum / a.kcalDays)} kcal/day` : "Estimated intake: n/a",
    "",
    a.topFoods.length ? "Most completed meals:" : "Most completed meals: none",
    ...a.topFoods.map(([n, c]) => `  ${n} (${c}×)`),
    "",
    "Insights:",
    ...a.insights.map((i) => `  [${i.k.toUpperCase()}] ${i.t}`),
    "",
    "Disclaimer: This report is for personal reflection only. It is not",
    "medical advice. Consult a qualified professional for dietary guidance.",
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `nutriplan-analysis-${analysisMonth}.txt`;
  link.click();
  URL.revokeObjectURL(url);
  toast("Report exported", "success");
}

/* ============================================================
   Calendar
============================================================ */
let calAnchor = new Date();

function renderCalendar() {
  $("calPrev").onclick = () => { calAnchor.setMonth(calAnchor.getMonth() - 1); renderCalendar(); };
  $("calNext").onclick = () => { calAnchor.setMonth(calAnchor.getMonth() + 1); renderCalendar(); };

  const y = calAnchor.getFullYear(), m = calAnchor.getMonth();
  $("calTitle").textContent = calAnchor.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  $("calWeekdays").innerHTML = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    .map((d) => `<div>${d}</div>`).join("");

  const first = new Date(y, m, 1);
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const grid = $("calGrid");
  grid.innerHTML = "";

  for (let i = 0; i < first.getDay(); i++) {
    grid.insertAdjacentHTML("beforeend", `<div class="cal-cell empty"></div>`);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const d = fmtDate(new Date(y, m, day));
    const plan = state.plans[d];
    const logs = state.mealLogs[d] || {};
    let statusClass = "";
    let count = "";
    if (plan) {
      const types = Object.keys(plan);
      const statuses = types.map((t) => logs[t]?.status);
      if (statuses.every((s) => s === "done")) statusClass = "done";
      else if (statuses.includes("skipped")) statusClass = "skipped";
      else if (statuses.some((s) => s === "partial")) statusClass = "partial";
      else if (statuses.some((s) => s === "done")) statusClass = "partial";
      else statusClass = "planned";
      count = `${types.length} meals`;
    }
    const cell = document.createElement("div");
    cell.className = `cal-cell ${d === todayStr() ? "today" : ""}`;
    cell.title = plan ? Object.entries(plan).map(([t, p]) => `${t}: ${p.name}`).join("\n") : "No plan";
    cell.innerHTML = `<strong>${day}</strong><span class="cal-count"><i class="dot ${statusClass}"></i>${count}</span>`;
    grid.appendChild(cell);
  }
}

/* ============================================================
   AI Assistant (rule-based, safety-guarded)
============================================================ */
function renderAssistant() {
  const log = $("chatLog");
  if (!state.chat.length) {
    state.chat.push({ role: "bot", text: "Hi! I can suggest recipes, find substitutions, and help navigate your plan. I respect your allergies and restrictions always — and I never give medical advice." });
  }
  const draw = () => {
    log.innerHTML = state.chat.map((m) =>
      `<div class="chat-msg ${m.role}">${escapeHtml(m.text)}</div>`).join("");
    log.scrollTop = log.scrollHeight;
  };
  draw();

  const suggestions = [
    "Suggest a lunch I can make in 15 minutes",
    "What can I substitute for paneer?",
    "I have rice, tomatoes and onions — what can I cook?",
    "How am I doing this month?",
  ];
  $("chatSuggestions").innerHTML = suggestions.map((s) =>
    `<button class="chat-suggestion">${escapeHtml(s)}</button>`).join("");
  $("chatSuggestions").querySelectorAll("button").forEach((b) =>
    b.addEventListener("click", () => { $("chatInput").value = b.textContent; sendChat(); }));

  const send = () => sendChat();
  $("chatSend").onclick = send;
  $("chatInput").onkeydown = (e) => { if (e.key === "Enter") send(); };

  function sendChat() {
    const input = $("chatInput");
    const text = input.value.trim();
    if (!text) return;
    state.chat.push({ role: "user", text });
    input.value = "";
    draw();
    setTimeout(() => {
      state.chat.push({ role: "bot", text: assistantReply(text) });
      saveState();
      draw();
    }, 350);
  }
}

function assistantReply(q) {
  const lower = q.toLowerCase();

  // Safety guardrails
  if (/(medicine|medication|dose|diagnos|cure|disease|treat|prescrib)/.test(lower)) {
    return "I can't help with medications, diagnoses or treatment decisions — those belong with a qualified healthcare professional. I'm great at meal ideas, substitutions and planning though!";
  }
  if (/(fast|starve|extreme diet|300 calorie|500 calorie diet)/.test(lower)) {
    return "I don't support extreme restriction or unsafe fasting. Balanced, sustainable meals are the goal — your plan is built around that principle.";
  }

  // Ingredient-based kitchen search
  if (/(i have|ingredients?|what can i cook|kitchen)/.test(lower)) {
    const words = lower.replace(/[^a-z\s]/g, " ").split(/\s+/)
      .filter((w) => w.length > 3 && !["have", "what", "cook", "with", "some", "ingredient", "ingredients"].includes(w));
    const results = kitchenSearch(words).slice(0, 3);
    if (results.length) {
      return "Based on your kitchen (allergy-safe options only):\n" +
        results.map((r) => `• ${r.recipe.name} — missing ${r.missing} ingredient${r.missing === 1 ? "" : "s"} (${r.recipe.prepTime} min)`).join("\n") +
        "\nFind them under Recipes for full steps.";
    }
    return "I couldn't match those ingredients to a safe recipe. Try naming foods more specifically (e.g. \"rice, tomato, onion\").";
  }

  // Substitutions
  const SUBS = {
    paneer: "tofu, firm cottage cheese, or boiled potato cubes",
    yogurt: "coconut yogurt (dairy-free) or soy yogurt",
    honey: "maple syrup or jaggery",
    wheat: "rice, millet or gluten-free oats",
    rice: "quinoa, millet or broken wheat (dalia)",
    egg: "besan chilla or silken tofu scramble",
    milk: "almond, soy or oat milk",
    ghee: "neutral oil or vegan butter",
  };
  for (const key of Object.keys(SUBS)) {
    if (lower.includes(key)) {
      return `Common substitutes for ${key}: ${SUBS[key]}. I've filtered out anything that conflicts with your allergies — double-check labels, especially for processed items.`;
    }
  }

  // Month performance
  if (/(month|doing|progress|analysis)/.test(lower)) {
    const dates = Object.keys(state.mealLogs).filter((d) => d.startsWith(analysisMonth));
    if (!dates.length) return `No meals logged in ${analysisMonth} yet — log a few and I'll summarize your month. The full breakdown is under "Month-End Analysis".`;
    const pct = Math.round(dates.reduce((a, d) => a + dayCompletionPct(d), 0) / dates.length);
    return `This month you've logged ${dates.length} day${dates.length > 1 ? "s" : ""} with about ${pct}% average adherence. ${pct >= 70 ? "That's strong consistency — keep it up! 🌟" : "Every logged meal counts — small steps add up."}`;
  }

  // Time-limited suggestions
  const mins = lower.match(/(\d+)\s*(min|minute)/);
  if (mins || /(quick|fast|easy)/.test(lower)) {
    const limit = mins ? parseInt(mins[1]) : 20;
    const meal = ["breakfast", "lunch", "snack", "dinner"].find((m) => lower.includes(m)) || "lunch";
    const pool = FOOD_DB.filter((f) => f.meal === meal && isSafeForUser(f));
    const quick = pool.filter((f) => {
      const r = RECIPES.find((x) => x.name.toLowerCase() === f.name.toLowerCase());
      return !r || r.prepTime <= limit;
    });
    const picks = (quick.length ? quick : pool).slice(0, 3);
    return picks.length
      ? `Quick ${meal} ideas (≤${limit} min, safe for your profile):\n` + picks.map((p) => `• ${p.name} (${p.kcal} kcal)`).join("\n")
      : "I couldn't find quick options matching your restrictions for that meal.";
  }

  // Generic: today's plan
  const plan = state.plans[todayStr()];
  if (plan) {
    return "Here's today's plan:\n" + MEAL_TYPES.filter((m) => plan[m.type])
      .map((m) => `• ${m.label}: ${plan[m.type].name} (${plan[m.type].kcal} kcal)`).join("\n") +
      "\nAsk me for substitutions, quick recipes or your month summary.";
  }
  return "I can suggest recipes, find substitutions for ingredients, search by what's in your kitchen, or summarize your month. What would you like?";
}

/* ============================================================
   Profile view
============================================================ */
function renderProfile() {
  const form = $("profileForm");
  if (!form.dataset.bound) {
    form.dataset.bound = "1";
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      state.profile = {
        ...state.profile,
        name: fd.get("name"), age: +fd.get("age"), height: +fd.get("height") || null,
        weight: +fd.get("weight") || null, diet: fd.get("diet"), dislikes: fd.get("dislikes"),
        waterGoal: +fd.get("waterGoal") || 2000, clinicianNotes: fd.get("clinicianNotes"),
      };
      saveState();
      toast("Profile saved", "success");
      updateSidebarStats();
    });

    $("addAllergy").onclick = () => {
      const v = $("customAllergy").value.trim();
      if (v && !state.profile.allergies.includes(v)) {
        state.profile.allergies.push(v); saveState(); renderProfile();
        $("customAllergy").value = "";
      }
    };

    $("resetAll").onclick = () => {
      if (confirm("Reset ALL NutriPlan data? This cannot be undone.")) {
        localStorage.removeItem(STORAGE_KEY);
        location.reload();
      }
    };
  }

  // Fill values
  form.elements.name.value = state.profile.name || "";
  form.elements.age.value = state.profile.age || "";
  form.elements.height.value = state.profile.height || "";
  form.elements.weight.value = state.profile.weight || "";
  form.elements.diet.value = state.profile.diet;
  form.elements.dislikes.value = state.profile.dislikes || "";
  form.elements.waterGoal.value = state.profile.waterGoal;
  form.elements.clinicianNotes.value = state.profile.clinicianNotes || "";

  // Allergy chips
  const chipGrid = $("profileAllergies");
  chipGrid.innerHTML = "";
  const all = [...new Set([...ALLERGENS, ...state.profile.allergies])];
  for (const a of all) {
    const on = state.profile.allergies.includes(a);
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = `chip ${on ? "on" : ""}`;
    chip.textContent = on ? `⚠ ${a} ✓` : a;
    chip.onclick = () => {
      if (on) state.profile.allergies = state.profile.allergies.filter((x) => x !== a);
      else state.profile.allergies.push(a);
      saveState(); renderProfile();
    };
    chipGrid.appendChild(chip);
  }
}

/* ============================================================
   Settings view
============================================================ */
function renderSettings() {
  $("setLight").onclick = () => applyTheme("light");
  $("setDark").onclick = () => applyTheme("dark");

  $("notifMeals").checked = state.notifMeals;
  $("notifWater").checked = state.notifWater;
  $("notifMeals").onchange = (e) => { state.notifMeals = e.target.checked; saveState(); };
  $("notifWater").onchange = (e) => { state.notifWater = e.target.checked; saveState(); };

  $("exportData").onclick = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = "nutriplan-export.json"; link.click();
    URL.revokeObjectURL(url);
    toast("Data exported", "success");
  };

  $("deleteAll").onclick = () => {
    if (confirm("Permanently delete all NutriPlan data from this browser?")) {
      localStorage.removeItem(STORAGE_KEY);
      location.reload();
    }
  };
}

/* ============================================================
   Professional portal (demo)
============================================================ */
function renderProfessional() {
  const status = $("proStatus");
  if (state.pro.connected) {
    status.innerHTML = `<div class="insight pos"><span>🩺</span><span>Connected with <strong>${escapeHtml(state.pro.name)}</strong> — status: ${state.pro.status || "pending review"}</span></div>`;
  } else {
    status.innerHTML = `<p class="muted small-text">No professional connected yet. In production, your dietitian invites you — this demo simulates it.</p>`;
  }
  $("connectPro").onclick = () => {
    const name = $("proName").value.trim();
    if (!name) { toast("Enter a professional name", "warn"); return; }
    state.pro = { connected: true, name, status: "connection requested", reviews: state.pro.reviews || [] };
    saveState(); renderProfessional();
    toast("Connection requested", "success");
  };

  const queue = $("reviewQueue");
  if (!state.pro.connected) {
    queue.innerHTML = `<p class="muted small-text">Connect a professional to enable plan review and approval.</p>`;
  } else {
    queue.innerHTML = `
      <div class="track-row">
        <div class="track-row-info"><strong>Current week plan</strong> — awaiting review</div>
        <button class="btn small primary" id="simulateApproval">Simulate approval</button>
      </div>
      <p class="muted small-text">When approved in production, your plan shows an “Approved by professional” badge and clinician restrictions can never be overridden by substitutions.</p>`;
    $("simulateApproval").onclick = () => {
      state.pro.status = "plan approved ✓";
      saveState(); renderProfessional();
      toast("Plan approved by professional", "success");
    };
  }
}

/* ============================================================
   Onboarding wizard
============================================================ */
const OB_STEPS = ["welcome", "profile", "diet", "allergies", "goals", "done"];
let obStep = 0;
let obData = { name: "", age: null, height: null, weight: null, diet: "Vegetarian", allergies: [], goal: "Eat balanced meals", customAllergy: "" };

function captureObStep() {
  if (obStep === 0) obData.name = $("obName")?.value.trim() || "";
  if (obStep === 1) {
    obData.age = +$("obAge")?.value || null;
    obData.height = +$("obHeight")?.value || null;
    obData.weight = +$("obWeight")?.value || null;
  }
  if (obStep === 3) obData.customAllergy = $("obCustomAllergy")?.value.trim() || "";
}

function startOnboarding() {
  obStep = 0;
  $("onboardingOverlay").hidden = false;
  renderObStep();
}

function renderObStep() {
  $("obBar").style.width = `${(obStep / (OB_STEPS.length - 1)) * 100}%`;
  $("obStepLabel").textContent = `Step ${obStep + 1} of ${OB_STEPS.length}`;
  $("obBack").disabled = obStep === 0;
  $("obNext").textContent = obStep === OB_STEPS.length - 1 ? "Finish 🎉" : "Next →";

  const body = $("obBody");
  if (obStep === 0) {
    body.innerHTML = `<h2 class="ob-title">Welcome to NutriPlan 🥗</h2>
      <p class="muted">Let's set up your plan in under a minute. Everything can be edited later in Profile.</p>
      <label style="display:block;margin-top:1rem;">Your name
        <input class="input" id="obName" value="${escapeHtml(obData.name)}" placeholder="e.g. Aarav"></label>`;
  } else if (obStep === 1) {
    body.innerHTML = `<h2 class="ob-title">Basic profile</h2>
      <div class="form-grid">
        <label>Age <input class="input" type="number" id="obAge" min="10" max="120" value="${obData.age || ""}"></label>
        <label>Height (cm) <input class="input" type="number" id="obHeight" value="${obData.height || ""}"></label>
        <label>Weight (kg) <input class="input" type="number" id="obWeight" step="0.1" value="${obData.weight || ""}"></label>
      </div>`;
  } else if (obStep === 2) {
    const diets = ["Vegetarian", "Vegan", "Eggetarian", "Pescatarian", "Jain", "Gluten-free", "Lactose-free", "No preference"];
    body.innerHTML = `<h2 class="ob-title">Food preference</h2>
      <div class="ob-choices">${diets.map((d) =>
        `<button type="button" class="ob-choice ${obData.diet === d ? "on" : ""}" data-diet="${d}">${d}</button>`).join("")}</div>`;
    body.querySelectorAll(".ob-choice").forEach((b) => b.onclick = () => {
      obData.diet = b.dataset.diet; renderObStep();
    });
  } else if (obStep === 3) {
    body.innerHTML = `<h2 class="ob-title">Allergies</h2>
      <div class="allergy-warn">⚠ Allergy information must be accurate. Meals containing your allergens will never be suggested.</div>
      <div class="chip-grid">${ALLERGENS.map((a) =>
        `<button type="button" class="chip ${obData.allergies.includes(a) ? "on" : ""}" data-all="${a}">${a}</button>`).join("")}</div>
      <input class="input" id="obCustomAllergy" value="${escapeHtml(obData.customAllergy)}" placeholder="Custom allergy (optional)">`;
    body.querySelectorAll(".chip").forEach((c) => c.onclick = () => {
      const a = c.dataset.all;
      if (obData.allergies.includes(a)) obData.allergies = obData.allergies.filter((x) => x !== a);
      else obData.allergies.push(a);
      renderObStep();
    });
  } else if (obStep === 4) {
    const goals = ["Eat balanced meals", "Build consistent habits", "Drink more water", "Home-cook more often", "Feel more energetic"];
    body.innerHTML = `<h2 class="ob-title">What's your main goal?</h2>
      <div class="ob-choices">${goals.map((g) =>
        `<button type="button" class="ob-choice ${obData.goal === g ? "on" : ""}" data-goal="${g}">${g}</button>`).join("")}</div>
      <p class="muted small-text">NutriPlan focuses on sustainable habits — never extreme restriction.</p>`;
    body.querySelectorAll(".ob-choice").forEach((b) => b.onclick = () => {
      obData.goal = b.dataset.goal; renderObStep();
    });
  } else {
    body.innerHTML = `<h2 class="ob-title">You're all set! 🎉</h2>
      <p class="muted">We'll generate your first week plan now, built around your ${obData.diet.toLowerCase()} preference${obData.allergies.length ? ` and free of ${obData.allergies.join(", ")}` : ""}.</p>
      <p class="muted small-text" style="margin-top:0.6rem;">🛡️ NutriPlan is a planning tool, not medical advice.</p>`;
  }
}

function finishOnboarding() {
  captureObStep();
  const custom = obData.customAllergy;
  const allergies = [...obData.allergies];
  if (custom && !allergies.includes(custom)) allergies.push(custom);

  state.profile = {
    ...state.profile,
    name: obData.name, age: obData.age, height: obData.height, weight: obData.weight,
    diet: obData.diet, allergies, onboarded: true,
  };
  saveState();
  $("onboardingOverlay").hidden = true;
  generateWeekPlan(todayStr());
  toast(`Welcome, ${name || "friend"}! Your first week is planned.`, "success");
  navigate("dashboard");
}

/* ============================================================
   Reminders (gentle in-app toasts)
============================================================ */
let reminderTimer = null;

function startReminders() {
  if (reminderTimer) clearInterval(reminderTimer);
  reminderTimer = setInterval(() => {
    const now = new Date();
    const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    if (state.notifMeals) {
      const m = MEAL_TYPES.find((x) => x.time === hhmm);
      if (m) {
        const logs = state.mealLogs[todayStr()] || {};
        if (state.plans[todayStr()]?.[m.type] && !logs[m.type]) toast(`⏰ ${m.label} time: ${state.plans[todayStr()][m.type].name}`);
      }
    }
    if (state.notifWater && hhmm.endsWith(":00") && now.getHours() >= 9 && now.getHours() <= 21) {
      const val = state.water[todayStr()] || 0;
      if (val < (state.profile.waterGoal || 2000)) toast("💧 Time for some water!");
    }
  }, 60000);
}

/* ============================================================
   Sidebar helpers & global events
============================================================ */
function updateSidebarStats() {
  // 7-day adherence
  let score = 0, n = 0;
  for (let i = 0; i < 7; i++) {
    const d = addDays(todayStr(), -i);
    if (state.plans[d]) { score += dayCompletionPct(d); n++; }
  }
  $("statAdherence").textContent = n ? `${Math.round(score / n)}%` : "–";

  // Streak: consecutive days (ending today/yesterday) with ≥1 completed meal
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const d = addDays(todayStr(), -i);
    const logs = state.mealLogs[d] || {};
    const has = Object.values(logs).some((l) => l.status === "done");
    if (has) streak++;
    else if (i > 0) break;
  }
  $("statStreak").textContent = streak;
}

function openSidebar() {
  $("sidebar").classList.add("open");
  $("sidebarOverlay").classList.add("active");
}
function closeSidebar() {
  $("sidebar").classList.remove("open");
  $("sidebarOverlay").classList.remove("active");
}

function refreshAll() {
  updateSidebarStats();
  updateWaterUI();
  updateCompletionUI();
  navigate(currentView);
}

function setupGlobalEvents() {
  document.querySelectorAll("[data-nav]").forEach((el) =>
    el.addEventListener("click", () => navigate(el.dataset.nav)));
  document.querySelectorAll(".nav-item[data-view]").forEach((el) =>
    el.addEventListener("click", (e) => { e.preventDefault(); navigate(el.dataset.view); }));

  $("menuToggle").onclick = openSidebar;
  $("sidebarClose").onclick = closeSidebar;
  $("sidebarOverlay").onclick = closeSidebar;
  $("themeToggle").onclick = toggleTheme;

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { closeSidebar(); closeRecipeModal(); }
  });
  $("recipeModalClose").onclick = closeRecipeModal;
  $("recipeOverlay").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) closeRecipeModal();
  });

  document.querySelectorAll("[data-water]").forEach((b) =>
    b.addEventListener("click", () => addWater(+b.dataset.water)));
  $("undoWater").onclick = undoWater;

  // Onboarding nav
  $("obNext").onclick = () => {
    captureObStep();
    if (obStep === OB_STEPS.length - 1) finishOnboarding();
    else { obStep++; renderObStep(); }
  };
  $("obBack").onclick = () => { if (obStep > 0) { captureObStep(); obStep--; renderObStep(); } };
}

/* ============================================================
   Boot
============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  loadState();
  applyTheme(state.theme || "dark");
  setupGlobalEvents();
  renderGrocery();     // binds grocery controls
  initAnalysisView();  // binds analysis controls
  updateSidebarStats();
  updateWaterUI();
  startReminders();

  if (!state.profile.onboarded) startOnboarding();
  navigate("dashboard");
});

