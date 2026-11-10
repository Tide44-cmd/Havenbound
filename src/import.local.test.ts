import { it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { guessMapping, importRows, mergeGames, parseCsv } from "./lib";
// Optional private fixtures are never copied into the repository.
for (const path of (process.env.HAVENBOUND_CSV_FIXTURES || "")
  .split(";")
  .filter(Boolean)) {
  it("imports the provided local XCT fixture and safely reimports it", () => {
    const csv = parseCsv(readFileSync(path, "utf8"));
    expect(csv.errors).toEqual([]);
    const map = guessMapping(csv.headers);
    const parsed = importRows(csv.rows, map);
    expect(parsed.errors).toEqual([]);
    expect(parsed.games.length).toBe(csv.rows.length);
    if (!map.earned && !map.total)
      expect(
        parsed.games.every(
          (g) => g.earned === null && g.total === null && !g.included,
        ),
      ).toBe(true);
    const preview = mergeGames([], parsed.games, map);
    // Exercise the review flow without asserting which conflicting real-world count is correct.
    const resolutions = Object.fromEntries(
      preview.conflictGroups.map((g) => [g.key, g.choices[0]]),
    );
    const first = mergeGames([], parsed.games, map, false, false, resolutions);
    expect(first.conflicts).toEqual([]);
    const second = mergeGames(
      first.games,
      parsed.games,
      map,
      false,
      false,
      resolutions,
    );
    expect(second.added).toBe(0);
    expect(second.games.length).toBe(first.games.length);
    console.log({
      rows: csv.rows.length,
      uniqueGames: first.games.length,
      duplicates: csv.rows.length - first.games.length,
    });
  }, 30000);
}
it("requires no private files for the public test suite", () =>
  expect(true).toBe(true));
