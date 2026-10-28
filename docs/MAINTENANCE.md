# Maintenance

## Edit map

| Change                          | Location                                             | Verify                                                             |
| ------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------ |
| Home copy/navigation            | `src/App.tsx`                                        | Hash routes, empty states, record summary                          |
| Colours, type, mobile layout    | `src/styles.css`                                     | Both themes and narrow viewports                                   |
| Diary/meals/chart               | `src/features/Journal.tsx`                           | Date selection, updates, deletion, CSV                             |
| Stored schema/import validation | `src/lib/space.ts`                                   | Backup round-trip, invalid imports, migration/version strategy     |
| Conversation UI                 | `src/features/Chat.tsx`                              | Correct thread receives reply, retry, abort, IME Enter handling    |
| Provider setup                  | `src/features/Settings.tsx`                          | Provider changes, model list/manual ID, ephemeral key              |
| API formats/limits              | `server/core.mjs`                                    | Adapter tests, errors, no key reflection, real provider smoke test |
| News sources/cache              | `FEEDS` and `createNewsService` in `server/core.mjs` | Real feed response, parsing, stale timestamps                      |
| Loopback serving                | `server/index.mjs`                                   | Host/origin checks, paths, port, body size, disconnect handling    |
| Game logic                      | `src/lib/game.ts`                                    | Existing exhaustive puzzle tests                                   |
| Personal preferences            | Settings in the running app                          | Persistence after refresh                                          |

## Check commands

```sh
npm test
npm run build
```

Run `npm run format` after editing source. This is formatting, not a substitute for functional checks.

## Manual browser pass

1. Start `npm start` and check http://127.0.0.1:4278 in desktop and mobile widths.
2. Navigate through all four modules with mouse/touch and keyboard. Check focus, dialog Escape dismissal, and theme persistence.
3. Write a diary, set a weight, add/remove a meal, refresh, and verify the values. Change date and search the saved entry.
4. Export JSON and CSV. Import a valid backup and cancel/confirm replacement. Check that keys are absent from backups.
5. Refresh news, switch category, disconnect the network, and verify cache/error labels keep the original fetched timestamp.
6. Start an actual local model or configure a test API account. Discover models, send a conversation, change thread while waiting, cancel, retry, refresh, and check message persistence.
7. Play every activity; restart the puzzle, ask for a hint, finish a level, pause breathing, and leave/return to the tab.
8. Test blocked/full browser storage. Failed writes must remain visible rather than silently claiming success.

## Deployment boundaries

The included Node service is local-only. Keep `.env` outside commits and archives. A remote, shared deployment needs authentication and per-user data/secret isolation; changing the bind address alone is not sufficient. Static hosting can show the frontend but cannot run these Node API routes.

Keep personal records and environment credentials out of source and build artifacts. The public source repository does not include hosting-specific configuration or built output.

## Storage changes

Do not rename `SPACE_KEY` or increment the schema version without a migration or clear import path. Keep unknown fields out of restored data. API keys belong to the in-memory connection state or the local environment, not the persisted schema. News cache and puzzle scores use separate local keys and are intentionally outside the main backup.
