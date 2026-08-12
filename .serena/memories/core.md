## board-game-farm

Vanilla TypeScript + Vite MPA board game portal (7 games), hosted on GitHub Pages, Firestore backend for
online play (6 of 7 games; stonepush is CPU-only). No UI framework, no auth.

**Serena language server is NOT configured for this project** (`.serena/project.yml` has `languages: []`).
Symbolic tools (`find_symbol`, `get_symbols_overview`, etc.) fail with
"Cannot extract symbols ... Active languages: []". Use `Read`/`Grep`/`Glob` for this project instead of
Serena's symbolic tools — the usual "prefer symbolic tools" guidance does not apply here until a user
enables the `typescript` language in `.serena/project.yml`.

**Primary references — read these before exploring code for any non-trivial task:**
- `Docs/design.md` — exhaustive, actively-maintained architecture/implementation doc. Covers every game's
  logic design, online-play pattern, UI patterns, and *why* decisions were made (dead ends tried, UX
  reversals, bugs hit). Numbered sections per game/topic.
- `Docs/spec.md` — feature spec, diffs from the original client requirements doc.
- `Docs/todo.md` / `Docs/todo-feature.md` — outstanding/requested work.

These docs are kept current by the user as part of normal workflow; prefer reading the relevant section
over re-deriving architecture from source.

### Source map
- `index.html` — portal top; must stay at repo root (URL stability), unlike other pages.
- `pages/<game>.html` + `pages/history.html` — one entry per game, all registered in
  `vite.config.ts` `build.rollupOptions.input`.
- `src/games/<id>/{logic,online,ui}` — per game. `logic/` = pure, DOM-free, Vitest-tested. `ui/` = DOM
  assembly, calls into `logic/`. `online/` = Firestore (`types.ts`, `roomService.ts`), one collection per
  game (`games`, `shogiGames`, `tictactoeGames`, `otrioGames`, `yonmokuGames`, `gobbletGames`).
- `src/shared/` — cross-game helpers: `firebase.ts` (init), `onlineRoomCode.ts` (room code gen),
  `playRecords.ts` (cross-game play-history writes), `components/` (header, difficultySelector,
  resultBanner, rulesScreen, reactionPanel — DOM-building functions, not classes).
- `src/portal/` — portal top (`main.ts`, array-driven `GAMES` list) and history page (`history.ts`).
- `src/types/common.ts` — cross-game types (`Difficulty`, `GameOutcome`, `GameResult`).

### Adding a new game
1. `src/games/<id>/{logic,ui}` (+ `online/` if adding online play).
2. Add a card entry to the `GAMES` array in `src/portal/main.ts`.
3. Register the HTML entry in `vite.config.ts` `rollupOptions.input`.
4. For online play, replicate the `roomService.ts` pattern used by the 6 existing online games — see
   `mem:conventions` and `Docs/design.md` §4.5/5.5/6.1/7.1/7.2/13.

See also `mem:tech_stack`, `mem:suggested_commands`, `mem:conventions`, `mem:task_completion`.
