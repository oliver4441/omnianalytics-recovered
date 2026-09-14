# AGENTS.md — OmniAnalytics Development Guide

## Product direction

OmniAnalytics is a developer-focused engineering operations workspace. Extend the recovered React application incrementally; do not replace sound React, Vite, React Router, Redux Toolkit, Firebase Authentication, PWA, Electron, or testing infrastructure without a measured reason.

Build a modular system first. Distribute it only when distribution solves a real problem.

## Commands

| Command | Description |
| --- | --- |
| `npm ci` | Install the locked dependency graph |
| `npm run dev` | Start the Vite dev server (binds `0.0.0.0:5173`) |
| `npm run build` | Produce the web build in `dist/` |
| `npm run preview` | Preview the production web build |
| `npm run lint` | ESLint on `src/` — exits non-zero; see backlog note below |
| `npm run test:integrations` | Node unit tests for `src/modules/integrations/` (`node --test`) |
| `npm run test:e2e` | Run Playwright E2E (auto-starts dev server on port 5173) |
| `npm run format` | Format `src/` with Prettier |
| `npm run electron:dev` | Build then launch the Electron app |

Hard-earned notes:

- `npm run lint` currently fails by design: ~178 errors / 114 warnings, mostly `react/prop-types` in recovered code. CI runs it non-blocking (`continue-on-error`). Do not try to fix the whole backlog; avoid adding new findings and note that lint is red before any change.
- `src/__tests__/` holds legacy recovered tests with no package script; use `npm run test:integrations` for the maintained unit suite.
- `predev`/`prebuild` auto-run `scripts/generate-integration-metadata.mjs`, which rewrites `public/integration-metadata.json` from git + package metadata. That file is gitignored — never commit it, and don't be surprised when it changes on every dev/build.
- Install Playwright browsers first with `npx playwright install` (CI installs chromium, firefox, webkit for all 5 projects).
- Copy `.env.example` to `.env.local` for real Firebase config. Without it the shell still renders using an inert config, but auth and data services reject operations — never commit populated env files.

## Application conventions

- Use React function components and hooks.
- Keep routing in React Router and cross-page application state in Redux Toolkit where it is already appropriate.
- Keep Firebase reads, writes, authorization preconditions, and aggregate maintenance in services rather than page components.
- Keep controller/service/repository/types/routes boundaries explicit as modules grow (`src/modules/integrations/` is the reference module).
- Avoid microservices or workers until measured runtime or operational needs justify them.
- Represent unavailable provider data honestly; do not fabricate activity, health, repository, issue, build, deployment, or release records. The integration explorer renders locally generated metadata, not live provider state.
- AI-generated content and AI integrations are out of scope.

## UI and accessibility

- Use semantic tokens from `src/styles/tokens.css`; do not add one-off theme colors when an existing semantic token fits.
- Maintain structural layouts for mobile, tablet, desktop, and wide desktop breakpoints.
- Preserve keyboard access, visible focus, reduced-motion handling, safe-area spacing, adequate contrast, and touch targets.
- Use the shared `Icon`, `BrandMark`, and shell patterns.
- Unsupported controls must be disabled or clearly labeled preview/internal; do not ship dead controls. Feature gating lives in `src/config/featureFlags.js` (ENABLED / PREVIEW / INTERNAL / DISABLED).

## Firebase and security

- Every project or task operation must enforce explicit ownership or membership, not authentication alone. `firestore.rules` is the access source of truth — keep service checks consistent with it.
- Pending invitation records do not grant access until resolved to authenticated UIDs in `memberIds`.
- Do not render, log, commit, or expose integration credentials, Firebase secrets, database credentials, or tokens.
- Use Firestore timestamps and atomic batches/transactions for related writes.
- Emulator-test rule changes before production deployment. There is no active Firebase project (`.firebaserc` is empty) — the production surface is Vercel (`vercel.json`, deploy on `main`, preview on PR).

## Code quality

- Match the existing formatting: two-space indentation, semicolons, single quotes, trailing commas where supported.
- Remove unused imports and dead code rather than suppressing findings without cause.
- Catch errors at service or interaction boundaries and show actionable UI states.
- Add focused E2E coverage for user-visible behavior and responsive regressions (`tests/e2e/`).
- Measure performance before changing bundle or query architecture.

## Git workflow

- Work on a feature or fix branch; never make significant product changes directly on `main`. CI runs on `main` and `arena/**`.
- Review `git diff --check`, focused lint, the production build, and applicable tests before committing.
- Keep environment files, generated reports, browser binaries, package outputs, and secrets out of Git.
- Use pull requests and preview review before merging or reconnecting any production deployment.
