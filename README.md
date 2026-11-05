# Havenbound

**Your collection. Your journey. Your next completion.**

A local-first Xbox collection and backlog planner built with React, TypeScript and Vite. No account, backend, paid API or database server is required. It complements XCT and TrueAchievements.

## Run locally

Use Node.js 22.12+ and npm.

```sh
npm ci
npm run dev
npm test
npm run build
npm run preview
```

## Features

- Dark woodland responsive dashboard and collapsible navigation.
- Independent profiles, collection search, filters, tags, favourites, platform editions, priorities and manual editing.
- Four backlog lists with drag ordering and keyboard/touch alternatives, notes, remaining-time estimates and monthly/annual goals.
- Monthly calendar with drag scheduling and form alternatives; allocations share weekday/weekend capacity, respect manual remaining hours, and recalculate when a game moves.
- Achievement sandbox with multiple hypothetical games, added denominators, exact ceiling thresholds and configurable display precision.
- Local history snapshots, completion goals, upcoming estimates, and profile comparisons.
- CSV preview, mapping, validation, merge/replace modes, achievement-only updates and validated JSON backups.

## Import XCT collections

Open **Import & settings**, choose a CSV, review mappings and preview, then confirm. The expected XCT headers from the supplied examples are `Title,Source,Gamertag,Publisher,Developer,Type,Date,Price,Currency,Market,Status,Product ID`.

XCT's `Status` is a purchase state (Active/Fulfilled), **not** achievement progress. It is intentionally unmapped for XCT files. Those exports contain no platform or achievement counts. New games default to Xbox Series X|S / Standard and unstarted; these are editable app defaults, not verified Xbox progress. Achievement counts remain unknown. Ownership alone never includes a title in achievement statistics. Bundles/DLC are retained as exported titles; no catalogue API is used to infer their contents. Mark them unowned or adjust their inclusion as appropriate.

The importer handles quoted commas, newlines, UTF-8 BOM and delimiter detection. Map alternate headers explicitly. Any invalid row blocks confirmation so errors cannot silently discard data. Files are limited to 20 MB.

Identity uses Product ID plus platform and edition. Without an ID, it uses normalized title, platform and edition. A missing-ID record can later acquire an ID via a matching title. Reimporting updates mapped fields and preserves local notes, favourites, estimates and plans. Missing achievement counts do not erase known ones. Unknown platform stacks cannot be inferred: correct mappings/editions before merging when necessary.

**Merge** is recommended. **Replace** marks old records unowned, then merges the new owned collection, preserving unrelated planning and achievement records. **Clear owned collection** also retains records and plans. Use the Owned only collection filter to show/hide these records.

Example synthetic formats are in `public/examples/`. No real user export is committed. These synthetic titles/counts are documentation only; the app never seeds fabricated achievement statistics.

## Achievement data

Choose achievement-only mode and map title, Product ID where known, platform, edition, earned and total. Only matching existing games update; unmatched rows are skipped and the matched count is shown. Blank values mean unknown. Counts must be non-negative integers with earned ≤ total. Complete imported pairs are included in statistics unless explicitly marked false. You can also edit counts and inclusion on any game.

The calculator only uses included games with both known counts, and warns about missing pairs. For a counted game, a hypothetical completion adds only its remaining achievements. For a previously uncounted game, it adds all available achievements to the denominator. Custom scenarios specify additional earned and newly introduced counts. Scenarios are temporary and never mutate collection data. Targets use integer/BigInt ceiling arithmetic, independently of rounded display values.

## Planning and goals

Edit total estimated hours, hours played and remaining hours independently. Remaining hours are authoritative: achievement percentages and hours played do not overwrite the estimate. Schedule games via date controls or dragging; moving a game replaces its start and puts it at the end of the allocation queue. All games share daily capacity. Adjust allocations through remaining hours and weekday/weekend availability; individual session overrides are not supported. The scheduler caps its horizon at ten years and warns if time remains unscheduled. Completed games receive no allocations.

Moving into Completed marks a game completed and records today's completion date. Moving to Currently Playing marks it started. Other lists express intent independently of completion status; edit game details if you need to change that status. Annual/monthly counts require a recorded completion date; imported completion statuses without dates do not invent history. Backlog reduction uses the earliest local snapshot as baseline. Imports, clearing ownership and completion changes can all affect the count.

## Profiles and privacy

Create another profile before importing a friend's collection, then compare on Friends. Matches respect product/platform/edition identity. Potential co-op requires manual co-op flags in both collections; there is no automatic capability lookup. Shared goals means games both profiles have placed on a backlog list. Microsoft authentication, XCT API and Hunter's Ledger/Discord are not connected; typed adapter interfaces are in `src/integrations.ts`.

All collections and settings persist in **IndexedDB in this browser and origin**. They do not sync across devices. Private browsing, storage restrictions or clearing browser data may prevent or remove persistence. Save failures are displayed. Export JSON backups regularly. Restoring validates the schema and replaces all local profiles only after confirmation. Do not commit backups to a public repository. Optional artwork URLs are fetched directly by the browser with no referrer; font styling uses Google Fonts with system fallbacks. Personal import data is not uploaded.

## GitHub Pages

1. Push this repository to GitHub.
2. In **Settings → Pages → Build and deployment**, choose **GitHub Actions**.
3. The `Test and deploy Havenbound` workflow tests and builds pushes to `master` or `main`, then deploys `dist`. Pull requests run validation without deploying.
4. Open the URL reported by the workflow deployment. For this repository the expected project URL is `https://tide44-cmd.github.io/Havenbound/`.

Vite uses relative asset URLs and navigation uses hashes (`/#Collection`), so project subpaths and refreshes work without server rewrites. Local preview data is separate from the deployed origin.

## Architecture and tests

`model.ts`: versioned schemas and domain types. `storage.ts`: serialized IndexedDB writes and backups. `lib.ts`: pure CSV, identity, calculation and scheduling utilities. Feature components own their UI; `App.tsx` coordinates profile state and navigation. Imported collections render in batches of 48 for large exports.

`npm test` covers exact thresholds, new-game denominators, unknown data, overlapping schedules, weekend capacity, zero availability, fractional hours, CSV quoting and XCT mapping, duplicate handling, preserved plans, distinct stacks and backup validation. GitHub Actions runs the same tests and TypeScript production build.

For browser workflow checks, run `npx playwright install chromium` once, then `npm run test:e2e`. To use an existing Chromium installation, set `HAVENBOUND_CHROMIUM` to its executable. The tests cover importing, editing, achievement scenarios, calendar persistence, independent profiles, mobile layout and backlog completion. Optional real CSV validation reads semicolon-separated paths from `HAVENBOUND_CSV_FIXTURES`; it never copies those files into the repo.

This MVP is deliberately local: no live Xbox data, automatic achievement sync, social messaging, server accounts or Discord connection. The calendar is an estimate, not a deadline.
