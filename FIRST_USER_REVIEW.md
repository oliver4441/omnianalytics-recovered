# First-User Experience Review & Recommendations

**Project:** OmniAnalytics (fairytale) — engineering operations workspace
**Reviewer:** Kora (acting as first-time user, Developer role)
**Date:** 2026-08-11
**Environment:** Production (fairytale.omixsystems.store), Firefox-based browser automation
**Status:** Live walkthrough of core navigation; deep-dive screens (Settings, Activity, Health, Analytics, Security) not yet covered in this pass.

---

## 1. What I experienced (in order)

### 1.1 Login
Single-purpose page: "Welcome back / Sign in to continue to your engineering overview."
Email + password + show-password toggle. Clean, no clutter, no decorative noise.
**Result:** Signed in as `kipkiruigideon890@gmail.com` (Developer) → redirected to Engineering overview. Auth is wired correctly end-to-end (Firebase config baked into production bundle, Vercel env vars set for prod + preview).

### 1.2 Overview (Engineering overview)
- Stat cards: Active projects `0`, Tracked tasks `0`, Open issues `—`, PRs `—`, Deployments `—`, Build status `—`
- Empty states with clear CTAs ("Create your first engineering project")
- Delivery readiness meter (0/4), "Prepare your workspace" checklist, Recent activity feed
- **Reads well for a first user** — the narrative is "this is what you'll see once you connect things," which is the right onboarding tone.

### 1.3 Projects
Clean empty state ("Create your first project"), resolves correctly. No friction.

### 1.4 Issues (PREVIEW)
**Best empty state in the app**: explains *why* there's no data, lists module scope, has a "Back to overview" escape hatch. This is the pattern to replicate everywhere.

### 1.5 Repositories (PREVIEW)
Same solid empty-state pattern as Issues.

### 1.6 Integrations — Overview
Most developed area:
- Live relationship graph with the OmniAnalytics project node
- Filters: provider, resource type, health
- View modes: Graph / Table / Timeline
- Zoom + fit controls, resource detail panel
- Renders locally generated metadata (per AGENTS.md — honest, not fabricated provider state)

---

## 2. Findings — areas needing improvement

Ranked by impact on a real first user.

### P1 — High impact

1. **URL never changes during navigation**
   - Navigating Overview → Projects → Issues → Repositories → Integrations left the address bar on `/login` the entire time.
   - Breaks: back button, refresh, link sharing, deep links, browser history.
   - Likely React Router is not wired to `BrowserRouter`/history or routes are rendered without route elements updating the URL. Verify routing setup in `src/App.jsx` / `main.jsx`.

2. **Blank-page ghost mid-navigation**
   - Twice the page rendered completely empty (0 elements) during navigation.
   - Combined with the frozen URL this smells like a client-side routing edge case (state change without route change, or an unmounted tree). Reproduce on a fresh tab, with devtools console open, before assuming it's a browser artifact.

3. **Dead controls with no explanation**
   - "Create issue", "Import from GitHub", "Connect GitHub", "Synchronize" are disabled with zero tooltip/context.
   - First user clicks → nothing → assumes the app is broken.
   - AGENTS.md already mandates this: *"Unsupported controls must be disabled or clearly labeled preview/internal; do not ship dead controls."* Disabled controls need a visible reason (tooltip, inline note, or feature-gate badge from `src/config/featureFlags.js`).

### P2 — Medium impact

4. **Redundant nav duplication**
   - "Overview" appears twice (WORKSPACE and INTEGRATIONS sections).
   - "Repositories" appears twice (BUILD & SHIP and INTEGRATIONS).
   - Same label, different destinations — confusing. Deduplicate or disambiguate labels ("Integrations overview", "Repo browser").

5. **Status-badge hierarchy unclear**
   - "PREVIEW" and "SOON" badges mixed in the header with no legend explaining what's usable now vs later.
   - One line of legend or consistent badge styling fixes it.

6. **Loading placeholders read as broken**
   - Stat cards show `—` and a permanent `…` ("Active projects …") while loading; the `…` that never resolves reads as an error, not an empty state.
   - Use skeletons with a bounded timeout → then render the true empty state.

### P3 — Low impact / polish

7. **Empty-state consistency**
   - Projects/Issues/Repositories are strong; Overview stat cards are weaker. Adopt the Issues pattern (why-no-data + module scope + escape hatch) across all empties.

8. **No obvious settings/help discoverability in this pass**
   - Settings, Activity, Health, Analytics, Security were reachable in the nav but not yet audited (browser automation backend dropped mid-sweep).

---

## 3. Recommendations (priority order)

1. **Fix routing first** (P1-1). It's the single biggest first-user trust killer: back button, refresh, and shareable URLs are baseline web expectations. If React Router is already installed (it is — per AGENTS.md), the fix is likely small (wrap app in `BrowserRouter` and use `useNavigate`/`Link` consistently, or align route elements with URL).
2. **Investigate the blank-page ghost** (P1-2) with devtools before shipping anything else — if it's a route-transition race, fixing routing may fix it too.
3. **Give every disabled control a reason** (P1-3). Tooltip or inline "Requires GitHub connection" note. Zero dead clicks.
4. **Deduplicate nav labels** (P2-4) and add a badge legend (P2-5).
5. **Replace `…`/`—` placeholders with bounded skeletons** (P2-6).
6. **Complete the audit**: Settings, Activity, Health, Analytics, Security, dark-mode toggle, ⌘K search, notifications — then re-review against this doc.

## 4. What was verified working (so it's on record)

- Firebase auth: login → redirect → role-based dashboard (Developer) ✅
- Production bundle carries correct Firebase config (API key + project `project-tracker-c2cd2`) ✅
- Vercel env: all 7 `VITE_FIREBASE_*` vars set for production + preview, no trailing-newline corruption ✅
- PR #1 (branch → main) merged; PR #2 (CI + Vercel deploy config) green, awaiting merge ✅
- Local build green (`npm run build`), local repo in lockstep with Arena's cloud branch `arena/019ff031-omnianalytics-recovered` ✅

## 5. Not in scope of this pass

- Strix security testing: **cancelled by request**; process killed, sandbox removed. No real credentials were ever injected or logged.
- Deep-dive of remaining nav sections (see recommendation 6).
- Electron desktop paths (`npm run electron:*`).
