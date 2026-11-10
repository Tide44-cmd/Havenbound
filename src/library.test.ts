import { describe, it, expect } from "vitest";
import {
  achievementStatus,
  alphabet,
  guessMapping,
  importRows,
  mergeGames,
  huntCandidates,
  randomGames,
  unfinished,
} from "./lib";
import { newGame, backupSchema, initialData } from "./model";
describe("achievement export updates", () => {
  it("maps new XCT fields and ignores purchase status without Product ID", () => {
    const map = guessMapping([
      "Title",
      "Gamertag",
      "Source",
      "Status",
      "Achievements Earned",
      "Achievements Total",
      "Genre",
    ]);
    expect(map.total).toBe("Achievements Total");
    expect(map.genre).toBe("Genre");
    expect(map.status).toBe("");
    const result = importRows(
      [
        {
          Title: "A",
          "Achievements Earned": "0",
          "Achievements Total": "33",
          Genre: "Puzzle",
          Status: "Fulfilled",
        },
        { Title: "B", "Achievements Earned": "1", "Achievements Total": "33" },
        { Title: "C", "Achievements Earned": "33", "Achievements Total": "33" },
        { Title: "D", "Achievements Earned": "", "Achievements Total": "" },
      ],
      map,
    );
    expect(result.errors).toEqual([]);
    expect(result.games.map((g) => g.status)).toEqual([
      "unstarted",
      "started",
      "completed",
      "unknown",
    ]);
    expect(result.games[0].genre).toBe("Puzzle");
    expect(result.games[3].earned).toBeNull();
    expect(result.games[2].completedAt).toBe("");
  });
  it("does not treat 0/0 as complete or planning as achievement progress", () => {
    expect(
      achievementStatus({
        ...newGame(),
        earned: 0,
        total: 0,
        status: "completed",
      }),
    ).toBe("unstarted");
    expect(achievementStatus({ ...newGame(), earned: 1, total: 33 })).toBe(
      "started",
    );
  });
  it("reimport updates status while preserving personal intent and notes", () => {
    const old = {
      ...newGame("A"),
      earned: 1,
      total: 33,
      notes: "Keep",
      lane: "Want to Complete" as const,
    };
    const incoming = {
      ...newGame("A"),
      earned: 33,
      total: 33,
      genre: "Puzzle",
    };
    const result = mergeGames([old], [incoming], {
      name: "Title",
      earned: "Earned",
      total: "Total",
      genre: "Genre",
    });
    expect(result.games[0]).toMatchObject({
      id: old.id,
      status: "completed",
      notes: "Keep",
      lane: "Want to Complete",
      genre: "Puzzle",
      completedAt: "",
    });
  });
  it("offers explicit unique-title matching across platform changes and preserves IDs", () => {
    const old = { ...newGame("A"), productId: "ABC", notes: "Keep" };
    const incoming = {
      ...newGame("A"),
      platform: "Xbox One, Xbox Series X|S",
      earned: 3,
      total: 33,
    };
    const map = {
      name: "Title",
      platform: "Platform",
      earned: "Earned",
      total: "Total",
    };
    expect(mergeGames([old], [incoming], map).added).toBe(1);
    const merged = mergeGames([old], [incoming], map, false, true);
    expect(merged.added).toBe(0);
    expect(merged.games[0]).toMatchObject({
      id: old.id,
      productId: "ABC",
      status: "started",
      notes: "Keep",
      platform: incoming.platform,
    });
    expect(
      mergeGames(
        [old, { ...old, id: "other", platform: "Windows" }],
        [incoming],
        map,
        false,
        true,
      ).conflicts,
    ).toHaveLength(1);
  });
  it("loads old backups with a default genre", () => {
    const data = initialData();
    const game: Partial<ReturnType<typeof newGame>> = newGame("Old");
    delete game.genre;
    const raw = { ...data, profiles: [{ ...data.profiles[0], games: [game] }] };
    expect(backupSchema.parse(raw).profiles[0].games[0].genre).toBe("");
  });
});
describe("library picks", () => {
  it("groups accented initials, numbers, symbols and The consistently", () => {
    expect(alphabet(newGame("Écho"))).toBe("E");
    expect(alphabet(newGame("123"))).toBe("#");
    expect(alphabet(newGame("The Hunt"))).toBe("T");
  });
  it("selects unique eligible games without changing the collection", () => {
    const games = Array.from({ length: 15 }, (_, i) => newGame("Game " + i));
    const order = games.map((g) => g.id);
    const picks = randomGames(games, 10, () => 0.3);
    expect(picks).toHaveLength(10);
    expect(new Set(picks.map((g) => g.id)).size).toBe(10);
    expect(games.map((g) => g.id)).toEqual(order);
    expect(randomGames(games.slice(0, 2), 10)).toHaveLength(2);
    expect(randomGames([], 10)).toEqual([]);
  });
  it("excludes unknown from A-Z, but allows explicit Want to Play in hunt", () => {
    const unknown = {
      ...newGame("Unknown"),
      status: "unknown" as const,
      lane: "Want to Play" as const,
    };
    const done = {
      ...newGame("Done"),
      status: "completed" as const,
      lane: "Want to Play" as const,
    };
    expect(unfinished(unknown)).toBe(false);
    expect(
      huntCandidates([
        unknown,
        done,
        { ...newGame("Unowned"), owned: false },
        newGame("Zero"),
      ]).map((g) => g.name),
    ).toEqual(["Unknown", "Zero"]);
  });
});
