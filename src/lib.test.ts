import { describe, it, expect } from "vitest";
import {
  allocate,
  guessMapping,
  identity,
  importRows,
  mergeGames,
  parseCsv,
  percentage,
  required,
  stats,
} from "./lib";
import { backupSchema, initialData, newGame, newProfile } from "./model";
describe("achievement calculations", () => {
  it("adds new achievements to numerator and denominator", () => {
    expect(percentage(800 + 133, 1000 + 133)).toBeCloseTo(82.347749);
  });
  it("uses ceiling rather than display rounding", () => {
    expect(required(899, 1000, 90)).toBe(1);
    expect(required(900, 1001, 90)).toBe(1);
    expect(required(1, 3, 33.3334)).toBe(1);
  });
  it("handles exact decimal thresholds", () => {
    expect(required(0, 1000, 80.1)).toBe(801);
    expect(required(801, 1000, 80.1)).toBe(0);
    expect(required(0, 0, 90)).toBeNull();
  });
  it("excludes owned but uncounted and unknown games", () => {
    const a = { ...newGame("A"), earned: 5, total: 10, included: true };
    expect(
      stats([a, newGame("B"), { ...newGame("C"), included: true }]),
    ).toEqual({ earned: 5, total: 10, known: 1, missing: 1 });
  });
});
describe("calendar allocation", () => {
  it("allocates twenty hours across four five-hour days", () => {
    const p = newProfile("Test");
    const g = { ...newGame("A"), remaining: 20 };
    p.games = [g];
    p.weekday = 5;
    p.weekend = 5;
    p.schedule = [{ gameId: g.id, start: "2026-11-02" }];
    expect(allocate(p).days.map((x) => [x.date, x.hours])).toEqual([
      ["2026-11-02", 5],
      ["2026-11-03", 5],
      ["2026-11-04", 5],
      ["2026-11-05", 5],
    ]);
  });
  it("shares capacity and uses weekend availability", () => {
    const p = newProfile("Test");
    const a = { ...newGame("A"), remaining: 3 },
      b = { ...newGame("B"), remaining: 4 };
    p.games = [a, b];
    p.weekday = 2;
    p.weekend = 5;
    p.schedule = [
      { gameId: a.id, start: "2026-11-06" },
      { gameId: b.id, start: "2026-11-06" },
    ];
    expect(allocate(p).days).toEqual([
      { date: "2026-11-06", gameId: a.id, hours: 2 },
      { date: "2026-11-07", gameId: a.id, hours: 1 },
      { date: "2026-11-07", gameId: b.id, hours: 4 },
    ]);
  });
  it("reports zero availability and handles fractional hours", () => {
    const p = newProfile("Test");
    const g = { ...newGame("A"), remaining: 0.3 };
    p.games = [g];
    p.schedule = [{ gameId: g.id, start: "2026-11-02" }];
    p.weekday = 0;
    p.weekend = 0;
    expect(allocate(p).unscheduled).toEqual([g.id]);
    p.weekday = 0.1;
    expect(allocate(p).days).toHaveLength(3);
  });
});
describe("CSV import and merging", () => {
  it("understands XCT headers without treating purchase status as progress", () => {
    const csv = parseCsv(
      'Title,Source,Gamertag,Status,Product ID\n"A, Game",Both,Example,Fulfilled,ABC\nB,Purchases,Example,Active,DEF',
    );
    const map = guessMapping(csv.headers);
    expect(map.status).toBe("");
    const data = importRows(csv.rows, map);
    expect(data.errors).toEqual([]);
    expect(data.games[0].name).toBe("A, Game");
    expect(data.games[0].earned).toBeNull();
    expect(data.games[1].productId).toBe("DEF");
  });
  it("handles BOM, quoted newlines, escaped quotes and semicolon delimiters", () => {
    const csv = parseCsv('\uFEFFTitle;Product ID\r\n"A ""great""\ngame";ABC');
    expect(csv.errors).toEqual([]);
    expect(csv.rows[0].Title).toBe('A "great"\ngame');
  });
  it("rejects invalid and contradictory achievement counts", () => {
    const map = { name: "Title", earned: "Earned", total: "Total" };
    expect(
      importRows(
        [
          { Title: "A", Earned: "2.2", Total: "5" },
          { Title: "B", Earned: "8", Total: "4" },
        ],
        map,
      ).errors,
    ).toHaveLength(2);
  });
  it("deduplicates repeated imports, preserves plans, and retains distinct stacks", () => {
    const a = {
      ...newGame("A"),
      productId: "ABC",
      notes: "Keep this",
      remaining: 17,
      lane: "Want to Play" as const,
    };
    const incoming = { ...newGame("A"), productId: "ABC" };
    const map = { name: "Title", productId: "Product ID" };
    const first = mergeGames([a], [incoming, incoming], map);
    expect(first.games).toHaveLength(1);
    expect(first.games[0]).toMatchObject({
      id: a.id,
      notes: "Keep this",
      remaining: 17,
      lane: "Want to Play",
    });
    expect(
      mergeGames(first.games, [{ ...incoming, platform: "Xbox 360" }], map)
        .games,
    ).toHaveLength(2);
  });
  it("matches a missing ID by title and preserves absent achievement fields", () => {
    const a = { ...newGame("A"), earned: 5, total: 10, included: true };
    const g = { ...newGame("A"), productId: "ABC" };
    expect(
      mergeGames([a], [g], { name: "Title", productId: "Product ID" }).games[0],
    ).toMatchObject({ earned: 5, total: 10, productId: "ABC" });
  });
  it("achievement-only updates cannot add unrelated games or reset status", () => {
    const a = { ...newGame("A"), status: "started" as const };
    const g = { ...newGame("A"), earned: 3, total: 10 };
    const result = mergeGames(
      [a],
      [g, newGame("B")],
      { name: "Title", earned: "Earned", total: "Total" },
      true,
    );
    expect(result.games).toHaveLength(1);
    expect(result.games[0]).toMatchObject({
      earned: 3,
      total: 10,
      status: "started",
      included: true,
    });
  });
  it("normalizes names but respects platform and edition", () => {
    expect(identity(newGame(" A "))).toBe(identity(newGame("a")));
    expect(identity({ ...newGame("A"), edition: "Deluxe" })).not.toBe(
      identity(newGame("A")),
    );
  });
});
describe("backup validation", () => {
  it("round trips valid data and rejects malformed counts", () => {
    const data = initialData();
    expect(backupSchema.parse(JSON.parse(JSON.stringify(data)))).toEqual(data);
    data.profiles[0].games = [{ ...newGame("A"), earned: -1 }];
    expect(backupSchema.safeParse(data).success).toBe(false);
  });
  it("rejects duplicate profile IDs", () => {
    const data = initialData();
    data.profiles.push(data.profiles[0]);
    expect(backupSchema.safeParse(data).success).toBe(false);
  });
});
