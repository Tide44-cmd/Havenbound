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

XCT's `Status` is a purchase state (Active/Fulfilled), **not** achievement progress. It is intentionally unmapped for XCT files, including newer exports without Product IDs. Header mapping uses names, not column positions, and can be adjusted in the preview. `Achievements Total` takes precedence; `Achv` supplies a per-row fallback total. With Achv mapped and a known total, blank earned counts mean zero (unplayed). Without a known total/fallback, blanks remain unknown. Inferred unplayed games are not automatically included in the overall achievement denominator; explicitly provided earned/total pairs are included unless overridden. Known counts derive progress: zero earned is unstarted, at least one is started, and earned equal to a positive total is completed. `0/0` is not a completion.

Both `Genre` and `XCT Genre` are imported and displayed as genre badges. Commas separate tags; spaces do not: `Action Horror, Horror` creates `Action Horror` and `Horror`. Both tags are individually filterable in Virtual library. Custom personal tags remain separate. Old backups receive empty optional genre fields automatically.

Trailing export suffix `Gifted` is removed (including attached suffixes such as `Fallout 76Gifted`). Internal words are retained, and `(PC)`/edition labels remain intact. Importing also cleans existing matched titles.

Older exports may omit platform and achievements: missing platforms default to Xbox Series X|S / Standard, while progress is unknown unless explicitly provided. Ownership alone never includes a title in achievement statistics. Bundles/DLC are retained as exported titles; no catalogue API infers their contents. Mark them unowned or adjust their inclusion as appropriate.

When upgrading an older collection, newer exports may omit Product IDs and change platform labels. The optional **Match unique titles across changed platform labels** checkbox matches a unique title and edition in both datasets when an ID is missing. It preserves the old ID, notes and plans. Ambiguous titles block import, rather than combining distinct stacks. Export a backup first and review matched/new counts; default matching still respects platform editions.

The importer handles quoted commas, newlines, UTF-8 BOM and delimiter detection. Map alternate headers explicitly. Any invalid row blocks confirmation so errors cannot silently discard data. Files are limited to 20 MB.

Identity uses Product ID plus platform and edition. Without an ID, it uses the cleaned title, platform and edition. Platform order, duplicate platform labels and capability-only `Xbox Cloud Gaming` / `Xbox Play Anywhere` labels do not create separate stacks. Actual platform differences, Product IDs, editions and title distinctions such as `(PC)` remain significant. A missing-ID record can later acquire an ID via a matching title.

Import preview reports consolidated duplicates, including duplicates already saved. Notes and genre/personal tags are combined, favourites retained, and backlog order/calendar references reassigned to the retained game ID. If duplicate plans differ, the first backlog list and earliest start date are kept; review your calendar after consolidation. Different achievement counts for the same identity require an explicit count selection in the import preview. Alternatively correct platform/edition mappings if they really are separate stacks. No conflicting count is silently chosen. Preview is non-destructive until confirmation; exporting a backup first is recommended. Reimports preserve personal plans and unmapped data.

**Merge** is recommended. **Replace** marks old records unowned, then merges the new owned collection, preserving unrelated planning and achievement records. **Clear owned collection** also retains records and plans. Use the Owned only collection filter to show/hide these records.

After clearing, reimporting a collection restores ownership of matching games and makes them visible again, while preserving their IDs, notes and plans. A mapped `Owned=false` is respected. Achievement-only imports never change ownership. The same CSV can be selected again without leaving the import screen; the success message reports the profile's owned game count.

Example synthetic formats are in `public/examples/`. No real user export is committed. These synthetic titles/counts are documentation only; the app never seeds fabricated achievement statistics.

## Achievement data

Choose achievement-only mode and map title, Product ID where known, platform, edition, earned and total. Only matching existing games update; unmatched rows are skipped and the matched count is shown. Blank values mean unknown. Counts must be non-negative integers with earned ≤ total. Complete imported pairs are included in statistics unless explicitly marked false. You can also edit counts and inclusion on any game.

The calculator only uses included games with both known counts, and warns about missing pairs. For a counted game, a hypothetical completion adds only its remaining achievements. For a previously uncounted game, it adds all available achievements to the denominator. Custom scenarios specify additional earned and newly introduced counts. Scenarios are temporary and never mutate collection data. Targets use integer/BigInt ceiling arithmetic, independently of rounded display values.

## Planning and goals

Edit total estimated hours, hours played and remaining hours independently. Remaining hours are authoritative: achievement percentages and hours played do not overwrite the estimate. Schedule games via date controls or dragging; moving a game replaces its start and puts it at the end of the allocation queue. All games share daily capacity. Adjust allocations through remaining hours and weekday/weekend availability; individual session overrides are not supported. The scheduler caps its horizon at ten years and warns if time remains unscheduled. Completed games receive no allocations.

Known achievement counts take precedence over manual progress and planning lists. **Want to Play** is a separate planning state and does not mark a game started. Both Collection and Virtual library can filter Want to Play games that are not started. Marking an incomplete game Completed is blocked when known counts contradict that status. Without counts, manual completion and Currently Playing still set progress. Recording completion manually adds today's date; imports never invent a completion date. Annual/monthly counts require a recorded completion date. Backlog reduction uses the earliest local snapshot as baseline; imports and ownership changes also affect it.

## Virtual library and hunt pickers

Open **Virtual library** to browse genre shelves with title search, genre/progress filters, artwork URLs or woodland fallbacks, and game editing. Shelves render 48 games at a time. Artwork is not fetched automatically from Xbox.

Collection and library cards show earned/total counts, a completion percentage rounded to one decimal, and an accessible progress bar. Missing counts and zero-total games show no misleading percentage. Cards tilt and glow slightly on pointer hover; a slow woodland-light background adds subtle movement. Reduced-motion preferences disable the tilt and background animation, and touch devices do not receive hover motion.

- **A–Z challenge** lists owned started/incomplete and unstarted games by initial letter, with counts for each letter. Accents are normalized, “The” stays under T, and numbers/symbols use #. Unknown progress is excluded.
- **My next 10** picks up to ten distinct random unfinished games, or fewer if the eligible collection is smaller.
- **Give me a hunt** chooses one unstarted or Want to Play game; completed, abandoned, unobtainable and unowned games are excluded. Explicit Want to Play intent can make a game with unknown counts eligible.

Search, genre and progress filters apply to pickers. Picks are temporary; use **Want to Play next** to save an intention to your profile. Re-picking may select a previously picked game. No Discord connection is required.

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
