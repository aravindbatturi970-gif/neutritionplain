# NutriPlan — Diet Planner (MVP)

A self-contained diet planning web app implementing the NutriPlan MVP spec:
dashboard, weekly meal planning, meal/water tracking, recipe discovery with
allergy-safe filtering, consolidated grocery lists, progress charts, calendar,
a rule-based AI assistant with safety guardrails, a professional (dietitian)
review workflow demo, and a **month-end analysis** report with .txt export.

**Dark/light mode** toggle lives in the header (persisted); **Settings** has
explicit Light/Dark buttons.

## Files

| File | Purpose |
|---|---|
| `index.html` | **Runnable app** — fully self-contained (CSS+JS inlined). Open directly or serve. |
| `styles.css` | Source: design system (dark/light themes, compact efficient layout) |
| `data.js` | Source: food & recipe database, grocery categories |
| `app.js` | Source: application logic (state, views, analysis, assistant…) |
| `_src_index.html` | Source: HTML template with `<link>`/`<script src>` references |
| `build.py` | Sync tool between sources and the bundled `index.html` |

## Editing workflow

Edit the source files (`styles.css`, `data.js`, `app.js`, `_src_index.html`),
then regenerate the bundled app:

```bash
python build.py
```

If you edited `index.html` directly instead, split it back into sources:

```bash
python build.py --extract
```

## Running

Just open `index.html` in a browser — no server or build step required.
All data persists in `localStorage` only; nothing leaves the browser.

## Safety note

NutriPlan is a planning/tracking tool. It never gives medical advice, never
suggests allergy-conflicting meals, and clinician-approved restrictions are
never overridden by substitutions.
