# OmniAnalytics Product Audit & Recovery Roadmap

**Author:** Jules (Software Engineer)
**Task:** GitHub Issue #7 — Product audit: define OmniAnalytics MVP and recovery roadmap
**Date:** March 2025
**Repository:** `oliver4441/omnianalytics-recovered`

---

## 1. Executive Summary

OmniAnalytics is a project-progress intelligence workspace recovered from an incomplete, fragmented codebase. A comprehensive code audit of the entire repository reveals that the codebase currently suffers from a dual-state architecture:
1. **Modernized React App (`src/App.jsx`, `src/pages/*`, `src/services/*`)**: Uses React Router v6, Redux Toolkit, and updated Firestore collections (`/projects/{id}`, `/tasks/{id}`). This layer has clean UI shells and working task CRUD, but lacks activity logging, milestone management, time tracking, real analytical scoring, and dashboard velocity visualizers.
2. **Legacy Recovery Code (`src/project.js`, `src/analytics.js`, `src/enhanced-project.js`, `src/__tests__/*`)**: Contains math algorithms for velocity and consistency scores, daily activity log writing (`/logs`), time tracking, badges, and milestones. However, these modules read/write to obsolete Firestore path structures (`users/{uid}/projects/{id}`) or global root collections (`/logs`, `/projects`) that violate current `firestore.rules` and break authentication boundaries.

**Key Finding:** OmniAnalytics currently lacks the core differentiator—the analytical layer built from actual project activity. The current application functions only as a basic task list.

**Action Plan:** Reconnect activity logging, milestones, time tracking, and analytics calculation directly into the modern application architecture and Firestore schemas without regressing security or UI responsiveness.

---

## 2. What OmniAnalytics Is

OmniAnalytics is a project-progress intelligence workspace designed for software engineers, project managers, and independent creators. Unlike generic task managers or Jira clones, OmniAnalytics emphasizes **project health and progress velocity calculated from actual recorded work activity** rather than static task completion checkboxes alone.

---

## 3. The Problem OmniAnalytics Solves

People work on projects but often cannot clearly understand whether they are actually progressing, how consistently they are working, where their time is going, which milestones are stuck, whether they are falling behind, and how the project has evolved over time.

Generic tools (Jira, Trello, Notion) track task status (To Do / Done) but fail to answer:
- "Have we logged consistent work on this project over the last 14 days?"
- "Is project velocity dropping relative to our target delivery date?"
- "How much actual developer time was invested into this milestone?"
- "Is the project stagnant despite having open tasks?"

OmniAnalytics solves this by capturing activity logs, work journal entries, and time spent, then calculating meaningful progress, velocity, and consistency metrics.

---

## 4. Target Users

- **Solo Developers & Engineers**: Building side projects or open-source tools who need to maintain personal consistency and velocity.
- **Engineering Managers & Tech Leads**: Tracking multi-project delivery health and team consistency without micromanaging individual commits.
- **Freelancers & Technical Consultants**: Needing transparent activity records and time tracking attached directly to project milestones.

---

## 5. Core User Journey

```
[1. Create Project] -> [2. Define Milestones/Goals] -> [3. Record Daily Activity & Time]
        |
        v
[4. Calculate Real Analytics (Velocity & Consistency)] -> [5. Dashboard & Health Insights]
        |
        v
[6. Review History & Trends] -> [7. Take Informed Action]
```

---

## 6. Product Principles

1. **Analytical Integrity**: Represent provider data and activity metrics honestly. Never fabricate velocity, health, or history with random numbers or hardcoded values.
2. **Activity-First Differentiator**: Activity logs and time entries are the primary inputs for progress intelligence.
3. **Zero Security Compromise**: Every Firestore operation must enforce explicit ownership or membership authorization (`memberIds`). Never weaken Firestore rules.
4. **Modular Monolith**: Maintain clean modular boundaries (`service -> repository -> UI`) so future integration extraction (e.g. GitHub/CI) is seamless.

---

## 7. Current Feature Inventory

The repository was thoroughly inspected across all source files, services, pages, components, and tests:
- **Auth System**: `src/services/authService.js`, `src/pages/LandingPage/LandingPage.jsx`, `src/store/slices/authSlice.js`.
- **Project Management**: `src/services/projectService.js`, `src/pages/ProjectsPage/ProjectsPage.jsx`, `src/pages/ProjectDetailPage/ProjectDetailPage.jsx`.
- **Task Management**: `src/services/taskService.js`, `src/store/slices/taskSlice.js`.
- **Activity / Work Logging**: `src/project.js` (`addLog`), `src/enhanced-project.js` (`addLogWithTime`). *Disconnected in modern UI.*
- **Analytics Engine**: `src/analytics.js` (`AnalyticsEngine`), `src/enhanced-project.js`. *Disconnected in modern UI.*
- **Dashboard**: `src/pages/DashboardPage/DashboardPage.jsx`.
- **Integrations / Previews**: `src/modules/integrations/*`, `src/pages/IntegrationExplorerPage/*`, `src/pages/FeaturePreviewPage/*`.
- **Gamification / Badges**: `src/services/bibleVerses.js`, `src/components/BibleVersePopup.jsx`, `src/project.js` (`claimBadge`). *Irrelevant / Legacy.*

---

## 8. Feature Status Matrix

| Feature | Status | Priority | Description / Findings |
| :--- | :--- | :--- | :--- |
| **Email/Password Auth** | **WORKING** | P0 | Firebase Auth registration, login, logout, session state via `authService.js` and Redux `authSlice.js`. |
| **Auth Error / Config Check** | **WORKING** | P0 | Environment config check gracefully prevents silent auth failures when Firebase env vars are missing. |
| **Project CRUD** | **WORKING** | P0 | Create project, list owned/shared projects, update project, delete project with cascade task deletion in `projectService.js`. |
| **Task Management** | **WORKING** | P0 | Task creation, status toggle (to_do/done), deletion, project task counter. |
| **Team Management** | **WORKING** | P1 | Invite members by email, pending invite records, membership arrays (`memberIds`). |
| **Activity Logging** | **MISSING** | P0 | Legacy `addLog` exists in `src/project.js` but no UI input or API exists in modern `ProjectDetailPage.jsx` or `projectService.js`. |
| **Milestones / Goals** | **MISSING** | P0 | Legacy template/milestone code in `src/enhanced-project.js` is disconnected. No UI or Firestore service for milestones in active routes. |
| **Time Tracking** | **MISSING** | P1 | Time tracking logic exists in legacy code, but no UI controls or Firestore time persistence exist in modern pages. |
| **Analytics Engine** | **BROKEN** | P0 | `src/analytics.js` attempts to query legacy path `/users/{uid}/projects/{id}/logs` which fails under modern `firestore.rules`. |
| **Project Dashboard** | **PARTIAL** | P0 | Displays active project count and task metrics, but open issues, PRs, deployments, and velocity are hardcoded placeholders (`—` / `0`). |
| **Project History / Timeline**| **MISSING** | P1 | No visual timeline of activity logs or project milestone evolution over time. |
| **Integration Explorer** | **WORKING** | P2 | Deterministic graph visualization & timeline for mock integrations (GitHub, Jira, SonarQube) created in Phase 3. |
| **Mobile / PWA / Responsive** | **WORKING** | P1 | PWA manifest, service worker registration (`src/register.js`), CSS tokens, and responsive breakpoints are implemented. |
| **Templates & Cloning** | **LEGACY** | P3 | Disconnected legacy code in `src/templates.js` and `src/enhanced-project.js`. |
| **Badges / Bible Verses** | **LEGACY** | P3 | `BibleVersePopup.jsx` and legacy `claimBadge` are obsolete recovery remnants. |
| **Electron Desktop App** | **PARTIAL** | P3 | Electron wrapper exists (`electron/main.cjs`), but depends on web release build. |

---

## 9. P0 Blockers

1. **Missing Activity Logging**: Users cannot log daily activity entries or work records in `ProjectDetailPage.jsx`. Without activity logs, OmniAnalytics cannot calculate consistency or velocity scores.
2. **Broken Analytics Calculations**: The analytics engine in `src/analytics.js` queries legacy Firestore subcollections (`/users/{uid}/projects/{id}/logs`) which fail security rule evaluation in current `firestore.rules`.
3. **Missing Milestones & Health Metrics**: Projects lack milestone tracking and target delivery health indicators.
4. **Dashboard Hardcoded Placeholders**: Operational metrics in `DashboardPage.jsx` display static dashes (`—`) without indicating how activity logs feed into project health.

---

## 10. P1 Core Functionality Gaps

1. **Time Tracking Integration**: No interface or service method to record hours/minutes spent per log entry or task.
2. **Project History & Activity Timeline**: Users cannot view a chronological history of work logs and milestone completions.
3. **Mobile Web Polish**: High touch-target validation and viewport responsiveness for activity logging on mobile browsers.

---

## 11. P2 Supporting Functionality

1. **Integration Explorer**: Keep the existing read-only deterministic integration graph (`src/modules/integrations/*`) for previewing system relationships.
2. **Project Category / Search Filtering**: Add search and category tags to project listing views.

---

## 12. P3 Future Functionality

1. **Native Kotlin Android App**: To be developed after web MVP stabilization.
2. **Live GitHub/CI Integrations**: Full OAuth and webhook sync for repository commits, pull requests, and CI/CD pipeline runs.
3. **Project Cloning & Templates**: Re-enable template-based project creation.
4. **Desktop Electron Packaging**: Multi-platform Electron distribution.

---

## 13. Authentication Findings

- **Implementation**: Uses Firebase Authentication (`signUpWithEmail`, `signInWithEmail`, `logoutUser`, `onAuthStateChanged`).
- **State Management**: Integrated with Redux (`authSlice.js`). Page reloads restore auth state seamlessly through `onAuthChange` listener in `App.jsx`.
- **Protected Routes**: `ProtectedRoute` and `PublicRoute` wrappers correctly guard private pages and redirect unauthorized users to `/login`.
- **Environment Handling**: `firebase.config.js` checks for required VITE environment variables (`VITE_FIREBASE_API_KEY`, etc.). If unconfigured, it activates a safe local preview mode that blocks network auth calls with actionable error toasts rather than crashing.

---

## 14. Project-Management Findings

- **Service Layer**: `src/services/projectService.js` provides `createProject`, `getUserProjects`, `getSharedProjects`, `getAllUserProjects`, `getProject`, `updateProject`, and `deleteProject`.
- **Authorization**: `assertProjectAccess` validates Firestore documents and ensures only the project owner or listed member (`memberIds`) can read or modify project data.
- **Cascade Deletion**: `deleteProject` uses Firestore write batches to delete all associated task documents in chunks of 450 before deleting the project document.
- **Gaps**: Project records currently lack fields for `milestones`, `totalTimeSpent`, `velocityScore`, `consistencyScore`, or `overallHealth`.

---

## 15. Logging / Activity Findings

- **Current State**: Completely missing from the active user interface.
- **Code Audit**: `src/project.js` contains a legacy `addLog(userId, projectId, text)` function that writes to a top-level `/logs` Firestore collection.
- **Defects in Legacy Code**:
  1. Writes `date` as midnight local time without timezone normalization.
  2. Increments `consecutiveLogDays` using direct client-side math vulnerable to clock drift.
  3. Violates `firestore.rules` which expects task and activity records under top-level authorized project collections or tasks.

---

## 16. Analytics Findings

- **Code Audit**: `src/analytics.js` contains `AnalyticsEngine` and `src/enhanced-project.js` contains scoring math (`calculateVelocityScore`, `calculateConsistencyScore`).
- **Defects**:
  1. `AnalyticsEngine` attempts to read `/users/{uid}/projects/{id}/logs` which returns permission denied under the modern `firestore.rules`.
  2. Velocity score formula in `src/project.js` (`Math.round((totalLogs / daysSinceStart) * 100)`) produces meaningless scores over 100 if multiple logs are created in a single day.
  3. The modern UI in `DashboardPage.jsx` does not consume any output from `AnalyticsEngine`.

---

## 17. Dashboard Findings

- **Ask**: "If I open OmniAnalytics right now, can I immediately understand how my projects are doing?"
- **Answer**: Partially. A user sees active project count, task total, and a list of active projects with basic task counts. However:
  - Open issues, pull requests, deployments, and build status show hardcoded dashes (`—`).
  - Delivery readiness score displays a hardcoded `0 / 4`.
  - No health indicator or activity velocity chart exists on the dashboard.

---

## 18. Milestone Findings

- **Current State**: Missing from the UI and active Firestore service.
- **Legacy Code**: `src/enhanced-project.js` defines `completeMilestone(uid, projectId, milestoneIndex)`.
- **Requirement**: Milestones must be elevated to first-class entities in `projectService.js` with target dates and completion status that feed into overall project progress.

---

## 19. Time-Tracking Findings

- **Current State**: Missing in active UI.
- **Legacy Code**: `src/enhanced-project.js` defines `addLogWithTime(uid, projectId, text, timeSpent)` which appends duration to a `timeTracking.sessions` array on the project document.
- **Requirement**: Modern `ProjectDetailPage` needs a simple log-entry modal where users can record work description and time spent (hours/minutes).

---

## 20. Mobile / PWA Findings

- **Service Worker & Manifest**: `public/manifest.json` and `src/register.js` provide PWA support.
- **Responsive Layout**: Centralized design tokens in `src/styles/tokens.css` support mobile (`< 768px`), tablet, and desktop breakpoints.
- **Audit Result**: UI scales well; mobile navigation and touch targets are responsive.

---

## 21. Integration Findings

- **Current State**: In Phase 3, an Integration Explorer module was implemented under `src/modules/integrations/*` and `src/pages/IntegrationExplorerPage/*`.
- **Data Source**: Uses mock metadata generated by `scripts/generate-integration-metadata.mjs`.
- **Role in MVP**: Serves as a read-only preview for system relationships. It should remain intact as a secondary module while core activity logging and project analytics are built.

---

## 22. Testing Gaps

- **E2E Suite**: `tests/e2e/public-experience.spec.ts` and `integration-explorer.spec.ts` pass, but lack E2E test coverage for project creation, task management, or activity logging.
- **Integration Tests**: `tests/integration-service.test.mjs` verifies integration normalization (9 passing tests).
- **Legacy Unit Tests**: `src/__tests__/*` (10 test files) rely on Vitest/Jest mocks for legacy `src/project.js` functions and are currently unhooked from package scripts.

---

## 23. Security Concerns

- **Firestore Rules (`firestore.rules`)**: Sound and secure. Enforces explicit project ownership (`ownerId == request.auth.uid`) or membership (`request.auth.uid in memberIds`).
- **Data Leakage Risk**: Legacy files (`src/project.js`, `src/analytics.js`) bypass project membership checks and attempt direct user-scoped subcollection reads. These functions must be refactored or superseded by secure service methods.
- **Security Rule Integrity**: Rules must NEVER be weakened to accommodate legacy flat collection queries.

---

## 24. Recommended MVP Scope

The recommended MVP focuses strictly on enabling the core loop: **Create project -> Define milestones -> Log activity & time -> Calculate health & velocity -> View project intelligence.**

### Core MVP Components:
1. **Authentication**: Secure registration, login, session restoration.
2. **Project Lifecycle**: Create, view, edit, archive, and delete projects with ownership/membership.
3. **Milestones & Goals**: Define milestones with target dates and status.
4. **Activity & Time Journaling**: Record daily work log entries with time spent.
5. **Real Analytics Engine**: Calculate project health, velocity score, and consistency streak from activity logs.
6. **Project Intelligence Dashboard**: Surface real progress, health badges, recent activity, and velocity trends.
7. **Project History & Timeline**: View chronological timeline of activity logs and milestone events.
8. **Responsive Web & PWA**: Seamless experience on desktop and mobile browsers.

---

## 25. Features to Keep

- React 18 + Vite + Redux Toolkit core architecture.
- Firebase Auth & Firestore with strict `firestore.rules`.
- `src/services/authService.js`, `projectService.js`, `taskService.js`.
- Responsive AppShell, Toast notifications, and design token system.
- Integration Explorer (`src/modules/integrations/*`) as a read-only preview.

---

## 26. Features to Simplify

- **Analytics Math**: Replace complex, buggy legacy velocity formulas with a clean normalized score:
  - *Consistency Score*: % of days with at least 1 log entry over the active project duration (or streak).
  - *Milestone Velocity*: % of completed milestones relative to total milestones.
  - *Overall Health*: Weighted combination of task progress, milestone completion, and activity consistency.
- **Time Tracking**: Keep time tracking lightweight (hours/minutes per activity log entry) rather than an active stopwatch timer.

---

## 27. Features to Postpone

- Native Android app (Kotlin / Jetpack Compose).
- Live GitHub OAuth sync & automatic commit/PR ingestion.
- Project cloning & complex project templates.
- Gamification badges, rewards, and challenges.
- Multi-platform Electron desktop distribution.

---

## 28. Features That May Be Obsolete

- `src/services/bibleVerses.js` and `src/components/BibleVersePopup.jsx`: Unrelated to project progress intelligence.
- Legacy `src/project.js` flat Firestore collections (`/logs`, `/projects`).
- Legacy `src/enhanced-project.js` user subcollection helpers.

---

## 29. Recommended Implementation Order

```
Phase 1: Activity Logging & Time Tracking Service
   └── Add log subcollection / service methods in projectService.js & UI controls in ProjectDetailPage.jsx

Phase 2: Milestones & Goals Lifecycle
   └── Add milestone schema & completion handlers to projectService.js & ProjectDetailPage.jsx

Phase 3: Real Analytics Engine Validation
   └── Create src/services/analyticsService.js querying real project activity logs and milestones

Phase 4: Project Dashboard & Velocity Redesign
   └── Connect DashboardPage.jsx and ProjectDetailPage.jsx to real analyticsService metrics

Phase 5: Project History & Activity Timeline
   └── Build chronological activity feed on ProjectDetailPage.jsx

Phase 6: E2E Testing & Security Hardening
   └── Add Playwright E2E coverage for project lifecycle, logging, milestones, and analytics
```

---

## 30. Recommended Android Scope After MVP Stabilization

Once the web MVP is fully stabilized and validated with live Firestore backend data:

### Architectural Scope for Android:
1. **Tech Stack**: Native Android app written in **Kotlin** using **Jetpack Compose** for UI, **Coroutines + Flow** for asynchronous streams, and **Hilt** for Dependency Injection.
2. **Architecture**: Clean Architecture + MVVM (Model-View-ViewModel) with repository pattern matching the web modular structure.
3. **Data Sync**: Firebase Android SDK (Firebase Auth + Firestore) sharing the exact same Firestore schema and security rules as the web app.
4. **Offline Support**: Firestore offline persistence enabled natively.
5. **Key Screens**:
   - Auth Screen (Login / Register)
   - Projects List Screen
   - Project Progress Dashboard Screen
   - Quick Activity Log & Time Entry Sheet
   - Milestone Checklist Screen
6. **Explicit Prohibitions**: Do NOT use Capacitor, Cordova, or WebView wrappers. Android must be a fully native Kotlin application.

---

## Summary of Created Follow-Up Issues

Upon completion of this audit, the following focused GitHub recovery issues should be executed:
1. `[Recovery 1/7] Activity & Time Journaling System Completion`
2. `[Recovery 2/7] Milestones & Goals System Implementation`
3. `[Recovery 3/7] Analytics Engine & Real Metric Calculation`
4. `[Recovery 4/7] Dashboard & Project Health Redesign`
5. `[Recovery 5/7] Project History & Chronological Activity Timeline`
6. `[Recovery 6/7] Comprehensive E2E Test Suite & Debt Retirement`
7. `[Recovery 7/7] Native Kotlin Android Foundation (Post-Web MVP)`
