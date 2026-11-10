import { it, expect } from "vitest";
import {
  stats,
  completionRule,
  importRows,
  mergeGames,
  platformTags,
  identity,
  matchesStatuses,
} from "./lib";
import {
  newGame,
  initialData,
  backupSchema,
  defaultCompletionOptions,
} from "./model";
const options = { includeWantToPlay: true, excludeUnobtainable: true };
it("counts progress, excludes ignored completions and only counts planned zeroes when enabled", () => {
  const played = {
    ...newGame("Played"),
    earned: 25,
    total: 50,
    included: false,
  };
  const done = {
    ...newGame("Complete"),
    earned: 50,
    total: 50,
    ignored: true,
    included: true,
  };
  const next = {
    ...newGame("Next"),
    earned: 0,
    total: 50,
    lane: "Want to Play" as const,
  };
  const zero = { ...newGame("Zero"), earned: 0, total: 100, included: true };
  const blocked = {
    ...newGame("Blocked"),
    earned: 10,
    total: 100,
    unobtainable: true,
  };
  expect(stats([played, done, next, zero, blocked])).toEqual({
    earned: 35,
    total: 150,
    known: 2,
    missing: 0,
  });
  expect(stats([played, done, next, zero, blocked], options)).toEqual({
    earned: 25,
    total: 100,
    known: 2,
    missing: 0,
  });
  expect(completionRule(done, options).reason).toContain("ignored");
  expect(matchesStatuses(done, ["completed"])).toBe(false);
  expect(matchesStatuses(done, ["ignored"])).toBe(true);
  expect(matchesStatuses(next, ["unstarted"])).toBe(false);
  expect(matchesStatuses(next, ["next"])).toBe(true);
  expect(
    stats([{ ...played, earned: null, status: "started" }], options).missing,
  ).toBe(1);
});
it("normalises platform delimiters and repetitions while keeping X|S intact and distinct stacks", () => {
  expect(platformTags("Windows 10; Xbox Series X|S, Windows 10\nPC")).toEqual([
    "Windows 10",
    "Xbox Series X|S",
    "PC",
  ]);
  const result = importRows(
    [
      {
        Title: "Game",
        Platform: "windows 10, Xbox Series X/S; Windows 10",
        Earned: "1",
        Total: "50",
      },
    ],
    { name: "Title", platform: "Platform", earned: "Earned", total: "Total" },
  );
  expect(result.games[0].platform).toBe("Windows 10, Xbox Series X|S");
  expect(identity(result.games[0])).toBe(
    identity({ ...result.games[0], platform: "Xbox Series X|S; Windows 10" }),
  );
  expect(identity({ ...result.games[0], name: "Game (PC)" })).not.toBe(
    identity(result.games[0]),
  );
});
it("preserves ignore and unobtainable choices when importing refreshed counts", () => {
  const old = {
    ...newGame("Game"),
    earned: 10,
    total: 50,
    ignored: true,
    unobtainable: true,
  };
  const map = { name: "Title", earned: "Earned", total: "Total" };
  const incoming = importRows(
    [{ Title: "Game", Earned: "50", Total: "50" }],
    map,
  ).games;
  const merged = mergeGames([old], incoming, map).games;
  expect(merged).toHaveLength(1);
  expect(merged[0]).toMatchObject({
    ignored: true,
    unobtainable: true,
    status: "completed",
    earned: 50,
  });
  expect(stats(merged, options).total).toBe(0);
});
it("loads old backups with safe defaults and round trips preferences and manual choices", () => {
  const data = initialData();
  data.profiles[0].games = [newGame("Old")];
  const legacy = JSON.parse(JSON.stringify(data));
  delete legacy.theme;
  delete legacy.profiles[0].completionOptions;
  delete legacy.profiles[0].games[0].ignored;
  delete legacy.profiles[0].games[0].unobtainable;
  legacy.profiles[0].games[0].platform =
    "Windows 10; Windows 10, Xbox Series X|S";
  const restored = backupSchema.parse(legacy);
  expect(restored.theme).toBe("woodland");
  expect(restored.profiles[0].completionOptions).toEqual(
    defaultCompletionOptions,
  );
  expect(restored.profiles[0].games[0]).toMatchObject({
    ignored: false,
    unobtainable: false,
    platform: "Windows 10, Xbox Series X|S",
  });
  restored.theme = "ocean";
  restored.profiles[0].completionOptions = options;
  restored.profiles[0].games[0].ignored = true;
  expect(backupSchema.parse(JSON.parse(JSON.stringify(restored)))).toEqual(
    restored,
  );
});
