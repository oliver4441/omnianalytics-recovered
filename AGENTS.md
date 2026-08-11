# AGENTS.md — OmniAnalytics Development Guide

## Product direction

OmniAnalytics is a developer-focused engineering operations workspace. Extend the recovered React application incrementally; do not replace sound React, Vite, React Router, Redux Toolkit, Firebase Authentication, PWA, Electron, or testing infrastructure without a measured reason.

Build a modular system first. Distribute it only when distribution solves a real problem.

## Commands

| Command | Description |
| --- | --- |
| `npm ci` | Install the locked dependency graph |
| `npm run dev` | Start the Vite development server |
| `npm run build` | Produce the web build in `dist/` |
| `npm run preview` | Preview the production web build |
| `npm run lint` | Run repository-wide ESLint |
| `npm run test:e2e` | Run Playwright E2E projects |
| `npm run format` | Format `src/` with Prettier |
| `npm run electron:dev` | Build and launch the Electron app |

Install Playwright browser binaries with `npx playwright install` before the first E2E run. Recovered tests under `src/__tests__/` retain known legacy debt and are not currently attached to a package script.

## Application conventions

- Use React function components and hooks.
- Keep routing in React Router and cross-page application state in Redux Toolkit where it is already appropriate.
- Keep Firebase reads, writes, authorization preconditions, and aggregate maintenance in services rather than page components.
- Keep controller/service/repository/types/routes boundaries explicit as modules grow.
- Avoid microservices or workers until measured runtime or operational needs justify them.
- Represent unavailable provider data honestly; do not fabricate activity, health, repository, issue, build, deployment, or release records.
- AI-generated content and AI integrations are out of scope.

## UI and accessibility

- Use semantic tokens from `src/styles/tokens.css`; do not add one-off theme colors when an existing semantic token fits.
- Maintain structural layouts for mobile, tablet, desktop, and wide desktop breakpoints.
- Preserve keyboard access, visible focus, reduced-motion handling, safe-area spacing, adequate contrast, and touch targets.
- Use the shared `Icon`, `BrandMark`, and shell patterns.
- Unsupported controls must be disabled or clearly labeled preview/internal; do not ship dead controls.

## Firebase and security

- Every project or task operation must enforce explicit ownership or membership, not authentication alone.
- Keep access logic consistent with `firestore.rules` and the service-level authorization checks.
- Pending invitation records do not grant access until resolved to authenticated UIDs in `memberIds`.
- Do not render, log, commit, or expose integration credentials, Firebase secrets, database credentials, or tokens.
- Use Firestore timestamps and atomic batches/transactions for related writes.
- Emulator-test rule changes before production deployment.

## Code quality

- Match the existing formatting: two-space indentation, semicolons, single quotes, trailing commas where supported.
- Remove unused imports and dead code rather than suppressing findings without cause.
- Catch errors at service or interaction boundaries and show actionable UI states.
- Add focused E2E coverage for user-visible behavior and responsive regressions.
- Measure performance before changing bundle or query architecture.

## Git workflow

- Work on a feature or fix branch; never make significant product changes directly on `main`.
- Review `git diff --check`, focused lint, the production build, and applicable tests before committing.
- Keep environment files, generated reports, browser binaries, package outputs, and secrets out of Git.
- Use pull requests and preview review before merging or reconnecting any production deployment.
