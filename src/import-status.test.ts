import { it, expect } from "vitest";
import { guessMapping, importRows, mergeGames } from "./lib";
import { newGame, backupSchema, initialData } from "./model";
it("defaults to achievement status even when a generic Status column contains purchase text", () => {
  const map = guessMapping([
    "Title",
    "Status",
    "Achievements Earned",
    "Achievements Total",
    "Achv",
  ]);
  expect(map.status).toBe("");
  const result = importRows(
    [
      {
        Title: "Zero",
        Status: "Active",
        "Achievements Earned": "0",
        "Achievements Total": "33",
      },
      {
        Title: "Some",
        Status: "Fulfilled",
        "Achievements Earned": "1",
        "Achievements Total": "33",
      },
      {
        Title: "All",
        Status: "Active",
        "Achievements Earned": "33",
        "Achievements Total": "33",
      },
      { Title: "Fallback", Status: "Fulfilled", Achv: "33" },
    ],
    map,
  );
  expect(result.errors).toEqual([]);
  expect(result.games.map((g) => g.status)).toEqual([
    "unstarted",
    "started",
    "completed",
    "unstarted",
  ]);
  expect(result.games.every((g) => g.lane === null)).toBe(true);
  const old = {
    ...newGame("All"),
    status: "started" as const,
    lane: "Want to Complete" as const,
  };
  expect(mergeGames([old], [result.games[2]], map).games[0]).toMatchObject({
    status: "completed",
    lane: "Want to Complete",
    completedAt: "",
  });
});
it("known counts override a manually mapped status without treating a purchase state as progress", () => {
  const result = importRows(
    [{ Title: "Game", Status: "Fulfilled", Earned: "2", Total: "33" }],
    { name: "Title", status: "Status", earned: "Earned", total: "Total" },
  );
  expect(result.errors).toEqual([]);
  expect(result.games[0].status).toBe("started");
});
it("loads backups created before the background preference existed", () => {
  const data = initialData();
  const { ambientMotion, ...old } = data;
  expect(backupSchema.parse(old).ambientMotion).toBe(true);
});
