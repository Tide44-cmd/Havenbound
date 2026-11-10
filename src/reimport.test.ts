import { describe, it, expect } from "vitest";
import {
  guessMapping,
  importRows,
  mergeGames,
  parseCsv,
  remapPlans,
} from "./lib";
import { newGame, newProfile } from "./model";
describe("restoring a cleared collection", () => {
  it("restores ownership without duplicating games or losing planning data", () => {
    const csv = parseCsv(
      "Title,Achievements Earned,Achievements Total,Achv\nReturn,1,33,33",
    );
    const map = guessMapping(csv.headers);
    const imported = importRows(csv.rows, map).games;
    const game = {
      ...imported[0],
      owned: false,
      notes: "Finish next month",
      lane: "Want to Play" as const,
      favorite: true,
      remaining: 7,
    };
    const profile = {
      ...newProfile("Me"),
      games: [game],
      order: [game.id],
      schedule: [{ gameId: game.id, start: "2026-12-01" }],
    };
    const result = mergeGames(profile.games, imported, map);
    const restored = remapPlans(profile, result.games, result.aliases);
    expect(restored.games).toHaveLength(1);
    expect(restored.games[0]).toMatchObject({
      id: game.id,
      owned: true,
      notes: game.notes,
      lane: game.lane,
      favorite: true,
      remaining: 7,
    });
    expect(restored.order).toEqual(profile.order);
    expect(restored.schedule).toEqual(profile.schedule);
    expect(mergeGames(restored.games, imported, map).games).toHaveLength(1);
  });
  it("achievement-only imports do not restore ownership", () => {
    const old = { ...newGame("Return"), owned: false };
    const incoming = { ...newGame("Return"), earned: 1, total: 33 };
    expect(
      mergeGames(
        [old],
        [incoming],
        { name: "Title", earned: "Earned", total: "Total" },
        true,
      ).games[0],
    ).toMatchObject({ owned: false, earned: 1, total: 33 });
  });
  it("respects an explicit false owned value", () => {
    const csv = parseCsv("Title,Owned\nReturn,false");
    const map = guessMapping(csv.headers);
    const imported = importRows(csv.rows, map).games;
    expect(mergeGames([newGame("Return")], imported, map).games[0].owned).toBe(
      false,
    );
  });
});
