# Repository Guidelines

## Project Structure & Module Organization
- `index.js`: Express server, REST endpoints, and cron jobs (8 AM, 5 PM daily; 1st of month) using Puerto Rico timezone.
- `Database/firebase.js`: Firebase app + Firestore initialization and helpers.
- `Documentation/`: Domain docs (e.g., notification rules).
- `package.json`: Dependencies and scripts.

## Build, Test, and Development Commands
- `npm install`: Install dependencies.
- `node index.js`: Start the API server on `http://localhost:8080`.
- `npx nodemon index.js`: Start with auto‑reload for local development.
- `npm test`: Currently a placeholder; see Testing Guidelines to add real tests.

## Coding Style & Naming Conventions
- JavaScript (Node.js). Use 2‑space indentation, semicolons, and double quotes to match existing code.
- Variables/functions: `camelCase`; classes/types: `PascalCase`; files: lowercase (e.g., `firebase.js`).
- Prefer `async/await`. Keep Firestore access centralized under `Database/`.
- Keep endpoints and cron logic cohesive in `index.js`; extract helpers if they grow.

## Testing Guidelines
- Frameworks: Jest (+ Supertest for HTTP). Place tests in `__tests__/` or `test/` with `*.test.js` names.
- Scope: Unit test helpers (date/filters), integration test endpoints (`/getAllPatients`, `/sendPatientCompletedNotification`).
- Running (after adding Jest): `npm test`. Aim for ≥80% coverage on touched code.
- Use Firebase Emulator for Firestore in tests; avoid hitting production.

## Commit & Pull Request Guidelines
- Commits: Imperative, concise, and specific (seen in history). Example: `Refactor notification handling to reduce duplication`.
- PRs should include: purpose, summary of changes, how to run locally, affected collections/cron jobs, linked issues, and screenshots/logs for endpoint changes.
- Ensure no secrets in diffs; update `Documentation/` when behavior/timing changes.

## Security & Configuration Tips
- Do not commit credentials. Move Firebase config to environment variables (e.g., via `dotenv`) and provide a `.env.example`.
- Update CORS `origin` in `index.js` to the deployed frontend domain(s).
- Timezone is `America/Puerto_Rico`; align cron expectations and tests with it.

