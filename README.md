# OmniAnalytics

OmniAnalytics is a developer-focused engineering operations workspace that connects planning, delivery work, engineering signals, and project access in one responsive application.

> This repository is a recovered implementation under active stabilization. It is not currently connected to a production deployment.

## Current foundation

- Engineering command center backed by authorized project and task records
- Project, task, and team-access workflows
- Preview-gated engineering modules for repositories, issues, CI/CD, releases, analytics, security, and documentation
- Explicit Firestore project ownership and membership authorization
- Responsive desktop, tablet, and mobile application shells
- Light and dark themes with centralized design tokens
- Firebase Authentication and Firestore
- Installable PWA/offline and Electron foundations
- React Router, Redux Toolkit, Playwright, ESLint, and Vite

AI-generated summaries and AI integrations are intentionally out of scope. Preview modules do not claim to be connected to live providers.

## Local development

Requirements: a supported Node.js/npm release and Firebase web configuration in local environment variables. To get started, copy [`.env.example`](.env.example) to `.env.local` and fill in your Firebase web configuration for a non-production preview project.

```bash
npm ci
npm run dev
```

The Vite development server binds to `0.0.0.0` and accepts hosted preview domains.

## Validation

```bash
npm run build
npm run lint
npm run test:e2e
```

Install Playwright browsers once before the first E2E run:

```bash
npx playwright install
```

The recovered repository still contains legacy test debt, so repository-wide lint and recovered tests may report issues outside the modernized application surface. Focused validation and production builds should remain clean as that debt is retired.

## Desktop builds

```bash
npm run electron:dev
npm run electron:build:win
npm run electron:build:linux
npm run electron:build:mac
```

Desktop packaging should be performed only after the web preview and authenticated flows have passed release review.

## Architecture direction

OmniAnalytics follows a modular-monolith approach. Feature modules should keep controller/service/repository/types/routes boundaries clear enough for future extraction, but a service should be distributed only when measured scaling, deployment, processing, reuse, or security constraints justify it.

## Security

- Project and task access requires explicit ownership or membership.
- Pending email records do not grant project access.
- Integration credentials and database secrets must never be rendered in the client.
- Firestore rule changes should be emulator-tested before production deployment. See [`firestore.rules`](firestore.rules) for the current rules.

## License

MIT — see [`LICENSE`](LICENSE) for details.
