## Task completion checklist

- Logic (`src/games/*/logic/`) changes: run `npm test` (Vitest) — every game has `rules.test.ts` /
  `ai.test.ts` covering win conditions and AI smoke tests; add cases for new rules edge cases.
- Any TS change: run `npm run build` (includes `tsc --noEmit`) to catch type errors — there is no separate
  lint step in this repo, so the build's type-check is the primary static gate.
- No pre-commit hooks or CI checks beyond the GitHub Actions deploy workflow, which only runs on push to
  `main` and only builds/deploys — it does not run tests. Treat `npm test` + `npm run build` as the
  effective local CI before considering work done.
- If `firestore.rules` or `firestore.indexes.json` changed, remember production Firestore is NOT updated by
  the deploy workflow — flag to the user that `npx firebase deploy --only firestore:rules` (or the indexes
  equivalent) needs a manual run (see `mem:suggested_commands`).
