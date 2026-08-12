## Tech stack

- TypeScript (strict mode, ES2022, `moduleResolution: bundler`, `noEmit`) + Vite 6, Multi-Page App (no SPA
  router — each game/page is a separate HTML entry + bundle).
- No UI framework: plain DOM (`document.createElement` etc.), CSS via `src/shared/styles/theme.css`
  (design tokens) + one CSS file per game overriding `--color-accent`.
- Firebase: Firestore only, no Auth. `src/shared/firebase.ts` hardcodes the client SDK config
  intentionally (Firestore client config is not a secret; security is enforced by `firestore.rules`, which
  is unauthenticated/good-faith-based by design).
- Vitest: unit-tests the `logic/` layer only (pure functions). No UI/E2E test layer.
- Deploy: GitHub Actions on push to `main` → `npm ci && npm run build` → GitHub Pages
  (`base: '/board-game-farm/'` in `vite.config.ts`). PRs/branch pushes do NOT trigger deploy.
- `firestore.rules` / `firestore.indexes.json` are NOT part of the CI/deploy pipeline — editing them
  locally has no effect on production until manually deployed (see `mem:suggested_commands`).

### Firestore nested-array constraint (recurring pattern)
Firestore cannot store arrays-of-arrays. Every game with a 2D board flattens it before `setDoc`/`update`
and reconstructs on read, via a `toWireBoard`/`fromWireBoard` pair local to that game's `roomService.ts`.
Plain numeric/string board cells flatten trivially; object cells (e.g. Otrio's `{S,M,L}`) flatten without
per-element re-encoding; stack cells (Gobblet's `Piece[]` per cell) need a custom fixed-length numeric
encoding (see `Docs/design.md` §7.2) — don't assume the simple flatten pattern covers every board shape.
