## Conventions

- User's global instructions require Japanese responses and comments that capture the *why* of an
  implementation choice, not the *what*. Existing code and commit messages follow this (Japanese comments
  on non-obvious rationale, e.g. workaround comments, invariant explanations).
- When adding a new game, check for the closest existing game first and copy its `logic/`, adjusting only
  what differs — this is the established pattern (e.g. yonmoku = gomoku's logic with `WIN_LENGTH` 5→4 and
  rebalanced AI scores; tictactoe/otrio online-play scaffolding reused near-verbatim across games). Don't
  design a game's logic from scratch if a structurally similar game already exists.
- Visual/iconography design decisions that involve differentiating two similar-looking games go through a
  rough-draft comparison step (an Artifact with multiple candidate SVGs) for the user to pick from, before
  committing to an implementation — don't jump straight to final code for these.
- `online/roomService.ts` per-game pattern (replicated 6x, see `Docs/design.md` §4.5/5.5/6.1/7.1/7.2):
  `createRoom` / `joinRoom` (`runTransaction`, re-checks room isn't full/started) /
  `subscribeToOpenRooms` + `subscribeToRoom` (`onSnapshot`, no polling) /
  `submitMove` (`runTransaction`, re-validates turn + move legality server-side-equivalent before writing,
  determines win/finish in the same transaction) / `resign`.
  Reaction ("stamp") sends and `playRecords` writes piggyback on the *same* `submitMove` transaction or
  `resign`'s `writeBatch` — this is deliberate (keeps exactly one play record per finished game regardless
  of how many clients are watching). Don't add a separate write/round-trip for these.
- `ui/main.ts` (or `onlineGameScreen.ts`) holds a single `activeDispose` variable and calls it before
  mounting the next screen — the mechanism for tearing down the previous screen's `onSnapshot` subscription
  on every screen transition. Any new online screen must follow this or subscriptions leak.
- Result display is a non-modal "banner" appended to the end of the game container (not a full-screen
  overlay) — a deliberate reversal from an earlier modal design that hid the final board position. Keep
  new result UI consistent with this (see `Docs/design.md` "resultBanner" section for the reasoning).
