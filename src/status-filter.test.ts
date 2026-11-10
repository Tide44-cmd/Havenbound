import { expect, it } from "vitest";
import { matchesStatuses } from "./lib";
import { newGame } from "./model";
it("matches any selected status, including in-progress games under incomplete", () => {
  const game = newGame("Example");
  expect(
    matchesStatuses({ ...game, status: "unstarted" }, [
      "incomplete",
      "unstarted",
    ]),
  ).toBe(true);
  expect(
    matchesStatuses({ ...game, status: "started" }, [
      "incomplete",
      "unstarted",
    ]),
  ).toBe(true);
  expect(
    matchesStatuses({ ...game, status: "incomplete" }, [
      "incomplete",
      "unstarted",
    ]),
  ).toBe(true);
  expect(
    matchesStatuses({ ...game, status: "completed" }, [
      "incomplete",
      "unstarted",
    ]),
  ).toBe(false);
  expect(
    matchesStatuses({ ...game, status: "abandoned" }, [
      "incomplete",
      "unstarted",
    ]),
  ).toBe(false);
  expect(matchesStatuses(game, [])).toBe(true);
});
it("keeps want-to-play filtering tied to unstarted games", () => {
  const game = { ...newGame("Example"), lane: "Want to Play" as const };
  expect(matchesStatuses({ ...game, status: "unstarted" }, ["next"])).toBe(
    true,
  );
  expect(matchesStatuses({ ...game, status: "started" }, ["next"])).toBe(false);
  expect(
    matchesStatuses({ ...game, status: "unstarted", lane: null }, ["next"]),
  ).toBe(false);
});
