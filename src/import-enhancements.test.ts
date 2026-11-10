import { describe, it, expect } from "vitest";
import {
  guessMapping,
  importRows,
  mergeGames,
  identity,
  genreTags,
  remapPlans,
  cleanTitle,
  parseCsv,
} from "./lib";
import { newGame, newProfile } from "./model";
describe("XCT fallback and genre columns", () => {
  it("maps reordered headers, falls back per row and splits only on commas", () => {
    const csv = parseCsv(
      'XCT Genre,Achv,Title,Achievements Total,Genre,Achievements Earned\n"Action Horror, Horror",50,TestGifted,,Action & adventure,\nHorror,99,Played,50,Action,25',
    );
    const map = guessMapping(csv.headers),
      { games, errors } = importRows(csv.rows, map);
    expect(errors).toEqual([]);
    expect(games[0]).toMatchObject({
      name: "Test",
      earned: 0,
      total: 50,
      status: "unstarted",
      included: false,
    });
    expect(genreTags(games[0])).toEqual([
      "Action & adventure",
      "Action Horror",
      "Horror",
    ]);
    expect(games[1]).toMatchObject({ earned: 25, total: 50, included: true });
  });
  it("validates fallback counts and leaves missing totals unknown", () => {
    const map = { name: "Title", totalFallback: "Achv", earned: "Earned" };
    expect(importRows([{ Title: "A", Achv: "bad" }], map).errors).toHaveLength(
      1,
    );
    expect(importRows([{ Title: "A", Achv: "" }], map).games[0]).toMatchObject({
      earned: null,
      total: null,
      status: "unknown",
    });
  });
  it("merges fallback counts into an existing record", () => {
    const map = { name: "Title", totalFallback: "Achv", earned: "Earned" };
    const old = newGame("A");
    const data = importRows([{ Title: "A", Achv: "50" }], map);
    expect(mergeGames([old], data.games, map).games[0]).toMatchObject({
      total: 50,
      earned: 0,
      status: "unstarted",
      included: false,
    });
  });
});
describe("duplicate consolidation", () => {
  it("ignores platform ordering and capability labels without combining stacks", () => {
    const a = {
        ...newGame("Age"),
        platform: "Windows, Xbox Series X|S, Xbox Play Anywhere",
      },
      b = {
        ...a,
        id: "two",
        platform: "Xbox Series X|S, Windows, Xbox Cloud Gaming",
      };
    expect(identity(a)).toBe(identity(b));
    const result = mergeGames([], [a, b], { name: "Title" });
    expect(result.games).toHaveLength(1);
    expect(result.duplicates).toBe(1);
    const pc = newGame("Fallout 76 (PC)Gifted"),
      consoleGame = newGame("Fallout 76Gifted");
    expect(
      mergeGames([], [pc, consoleGame], { name: "Title" }).games.map(
        (g) => g.name,
      ),
    ).toEqual(["Fallout 76 (PC)", "Fallout 76"]);
    expect(identity({ ...pc, productId: "ONE" })).not.toBe(
      identity({ ...pc, productId: "TWO" }),
    );
  });
  it("consolidates existing duplicates and reassigns notes, favorites, and plans", () => {
    const a = { ...newGame("A"), notes: "First" },
      b = {
        ...newGame("AGifted"),
        notes: "Second",
        favorite: true,
        lane: "Want to Play" as const,
      };
    const profile = {
      ...newProfile("Test"),
      games: [a, b],
      order: [b.id, a.id],
      schedule: [
        { gameId: a.id, start: "2026-11-20" },
        { gameId: b.id, start: "2026-11-15" },
      ],
    };
    const result = mergeGames(profile.games, [], {});
    const fixed = remapPlans(profile, result.games, result.aliases);
    expect(fixed.games).toHaveLength(1);
    expect(fixed.games[0]).toMatchObject({
      id: a.id,
      notes: "First\n\nSecond",
      favorite: true,
      lane: "Want to Play",
    });
    expect(fixed.order).toEqual([a.id]);
    expect(fixed.schedule).toEqual([{ gameId: a.id, start: "2026-11-15" }]);
  });
  it("blocks conflicting counts rather than silently taking the last row", () => {
    const a = { ...newGame("A"), earned: 1, total: 33 },
      b = { ...newGame("A"), earned: 2, total: 33 };
    expect(mergeGames([], [a, b], { name: "Title" }).conflicts).toHaveLength(1);
  });
  it("resolves conflicting counts only with an explicit review selection", () => {
    const a = { ...newGame("A"), earned: 24, total: 24 },
      b = { ...newGame("A"), earned: 175, total: 175 };
    const preview = mergeGames([], [a, b], { name: "Title" });
    const group = preview.conflictGroups[0];
    expect(group.choices).toEqual(["24 / 24", "175 / 175"]);
    const result = mergeGames([], [a, b], { name: "Title" }, false, false, {
      [group.key]: "24 / 24",
    });
    expect(result.conflicts).toEqual([]);
    expect(result.games).toHaveLength(1);
    expect(result.games[0]).toMatchObject({ earned: 24, total: 24 });
  });
  it("cleans only the export suffix and retains legitimate internal words", () => {
    expect(cleanTitle("Fallout 76 (PC)Gifted")).toBe("Fallout 76 (PC)");
    expect(cleanTitle("The Gifted Ones")).toBe("The Gifted Ones");
  });
});
