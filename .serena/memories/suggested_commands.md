## Suggested commands

Windows machine; the Bash tool runs Git Bash (POSIX-style), not cmd/PowerShell.

- `npm run dev` — Vite dev server.
- `npm run build` — `tsc --noEmit && vite build` (type-check gate is part of build, not a separate script).
- `npm run preview` — preview the production build.
- `npm test` — `vitest run` (logic-layer unit tests).
- No lint/format script defined in `package.json`.

### Firestore rules deploy (manual — not run by CI)
Required after any `firestore.rules` edit, or production rules silently stay stale:
```
npx firebase deploy --only firestore:rules
```

### Deleting playRecords data (admin-only; client app cannot do this — rules forbid update/delete)
```
npx firebase firestore:delete playRecords --recursive   # whole collection, irreversible
npx firebase firestore:delete playRecords/<docId>        # single doc
```
Confirm scope before running; add `--force` only to skip the interactive prompt once scope is confirmed.
