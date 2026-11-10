import { test, expect } from "@playwright/test";
test("multiple status filters and responsive pointer-reactive scenery", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Import collection", exact: true })
    .click();
  await page
    .getByLabel("CSV export")
    .setInputFiles({
      name: "filters.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(
        "Title,Achievements Earned,Achievements Total\nAlpha,0,33\nBeta,1,33\nComplete,33,33\nUnknown,,",
      ),
    });
  await page.getByRole("button", { name: "Confirm import" }).click();
  await page.getByRole("button", { name: "Collection", exact: true }).click();
  await page.getByLabel("Filter statuses", { exact: true }).click();
  await page.getByRole("checkbox", { name: "Incomplete", exact: true }).check();
  await page
    .getByRole("checkbox", { name: "Not started", exact: true })
    .check();
  await expect(page.locator(".game-card")).toHaveCount(2);
  await expect(page.locator(".game-card .status")).toHaveText([
    "Not started",
    "In progress",
  ]);
  await page.getByRole("checkbox", { name: "Unknown", exact: true }).check();
  await expect(page.locator(".game-card")).toHaveCount(3);
  await page.getByRole("button", { name: "Show all statuses" }).click();
  await expect(page.locator(".game-card")).toHaveCount(4);
  await page.keyboard.press("Escape");
  await expect(page.locator(".status-filter")).not.toHaveAttribute("open", "");
  const offset = () =>
    page
      .locator(".ambient-background")
      .evaluate((el) =>
        (el as HTMLElement).style.getPropertyValue("--ambient-x"),
      );
  await page.mouse.move(100, 150);
  await expect.poll(offset).not.toBe("");
  const before = await offset();
  await page.mouse.move(1300, 850);
  await expect.poll(offset).not.toBe(before);
  const forest = await page.locator(".ambient-forest").boundingBox();
  expect(forest!.width).toBeGreaterThanOrEqual(1440);
  expect(forest!.height).toBeGreaterThanOrEqual(1000);
  await page
    .getByRole("button", { name: "Pause background animation" })
    .click();
  const paused = await offset();
  await page.mouse.move(200, 400);
  expect(await offset()).toBe(paused);
  await page
    .getByRole("button", { name: "Resume background animation" })
    .click();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect
    .poll(() =>
      page
        .locator(".ambient-scene")
        .evaluate((el) => getComputedStyle(el).transform),
    )
    .toBe("none");
  await page.getByLabel("Filter statuses", { exact: true }).click();
  if (process.env.HAVENBOUND_SCREENSHOTS)
    await page.screenshot({
      path: process.env.HAVENBOUND_SCREENSHOTS + "/multi-status-background.png",
      fullPage: true,
    });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("checkbox", { name: "Incomplete", exact: true }).check();
  await page
    .getByRole("checkbox", { name: "Not started", exact: true })
    .check();
  await expect(page.locator(".game-card")).toHaveCount(2);
  const panel = await page.locator(".status-filter-panel").boundingBox();
  expect(panel!.x).toBeGreaterThanOrEqual(0);
  expect(panel!.x + panel!.width).toBeLessThanOrEqual(390);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("aligned card controls, automatic status preview, and pausable woodland background", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Import collection", exact: true })
    .click();
  await page.getByLabel("CSV export").setInputFiles({
    name: "layout.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(
      'Title,Status,Achievements Earned,Achievements Total,Achv,Genre\nA Short,Active,0,33,33,Adventure\nB A much longer game title that wraps across several lines,Fulfilled,1,33,33,"Adventure, Horror, Action Horror, Puzzle"\nC Complete,Active,33,33,33,Adventure\nD Not played yet,Fulfilled,,,33,Adventure',
    ),
  });
  await expect(
    page.getByRole("row").filter({ hasText: "A Short" }),
  ).toContainText("Not started");
  await expect(
    page.getByRole("row").filter({ hasText: "B A much longer" }),
  ).toContainText("In progress");
  await expect(
    page.getByRole("row").filter({ hasText: "C Complete" }),
  ).toContainText("Completed");
  await expect(
    page.getByRole("row").filter({ hasText: "D Not played" }),
  ).toContainText("Not started");
  await page.getByRole("button", { name: "Confirm import" }).click();
  await page.getByRole("button", { name: "Collection", exact: true }).click();
  await page.mouse.move(0, 0);
  await page.emulateMedia({ reducedMotion: "reduce" });
  async function aligned(cards: string, control: string) {
    const positions = await page.locator(cards).evaluateAll(
      (nodes, selector) =>
        nodes.map((n) => ({
          row: Math.round(n.getBoundingClientRect().top),
          y: n.querySelector(selector)!.getBoundingClientRect().top,
        })),
      control,
    );
    for (const row of new Set(positions.map((p) => p.row))) {
      const values = positions.filter((p) => p.row === row).map((p) => p.y);
      expect(Math.max(...values) - Math.min(...values)).toBeLessThan(2);
    }
  }
  await aligned(".game-card", ".card-actions select");
  await expect(page.locator(".ambient-forest")).toBeVisible();
  expect(
    await page
      .locator(".ambient-firefly")
      .first()
      .evaluate((el) => getComputedStyle(el).animationName),
  ).toBe("none");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page
    .getByRole("button", { name: "Pause background animation" })
    .click();
  expect(
    await page
      .locator(".ambient-firefly")
      .first()
      .evaluate((el) => getComputedStyle(el).animationPlayState),
  ).toBe("paused");
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Resume background animation" }),
  ).toBeVisible();
  await page.mouse.move(0, 0);
  await page.emulateMedia({ reducedMotion: "reduce" });
  if (process.env.HAVENBOUND_SCREENSHOTS)
    await page.screenshot({
      path: process.env.HAVENBOUND_SCREENSHOTS + "/aligned-cards.png",
      fullPage: true,
    });
  await page.setViewportSize({ width: 390, height: 844 });
  await aligned(".game-card", ".card-actions select");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("button", { name: "Virtual library", exact: true })
    .click();
  await aligned(".library-book", ".library-action");
});
test("clearing and reimporting the same file restores the collection", async ({
  page,
}) => {
  const file = {
    name: "collection.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(
      "Title,Achievements Earned,Achievements Total,Achv\nReturn,1,33,33\nNext,,,50",
    ),
  };
  await page.goto("/");
  await page
    .getByRole("button", { name: "Import collection", exact: true })
    .click();
  await page.getByLabel("CSV export").setInputFiles(file);
  await page.getByRole("button", { name: "Confirm import" }).click();
  await expect(page.getByRole("status")).toContainText("Import saved");
  await expect(page.getByLabel("CSV export")).toHaveValue("");
  await page.getByRole("button", { name: "Collection", exact: true }).click();
  await expect(page.locator(".game-card")).toHaveCount(2);
  await page
    .getByRole("combobox", { name: "Backlog list for Return", exact: true })
    .selectOption("Want to Play");
  await page
    .getByRole("button", { name: "Import & settings", exact: true })
    .click();
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("button", { name: "Clear owned collection", exact: true })
    .click();
  await page.getByRole("button", { name: "Collection", exact: true }).click();
  await expect(page.locator(".game-card")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Import & settings", exact: true })
    .click();
  await page.getByLabel("CSV export").setInputFiles(file);
  await page.getByRole("button", { name: "Confirm import" }).click();
  await expect(page.getByRole("status")).toContainText("2 owned games");
  await page.getByRole("button", { name: "Collection", exact: true }).click();
  await expect(page.locator(".game-card")).toHaveCount(2);
  await expect(
    page.getByRole("combobox", {
      name: "Backlog list for Return",
      exact: true,
    }),
  ).toHaveValue("Want to Play");
  await page.reload();
  await expect(page.locator(".game-card")).toHaveCount(2);
  await page
    .getByRole("button", { name: "Virtual library", exact: true })
    .click();
  await expect(page.locator(".library-book")).toHaveCount(2);
});
test("conflicting duplicate counts require review before import", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Import collection", exact: true })
    .click();
  await page.getByLabel("CSV export").setInputFiles({
    name: "conflicts.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(
      "Title,Achievements Earned,Achievements Total\nConflict,24,24\nConflict,175,175",
    ),
  });
  await expect(
    page.getByRole("button", { name: "Confirm import" }),
  ).toBeDisabled();
  await page
    .getByRole("combobox", { name: "Achievement counts for Conflict" })
    .selectOption("24 / 24");
  await page.getByRole("button", { name: "Confirm import" }).click();
  await expect(page.getByRole("status")).toContainText("Import saved");
  await page.getByRole("button", { name: "Collection", exact: true }).click();
  await expect(page.locator(".game-card")).toHaveCount(1);
  await expect(
    page.getByText("24 / 24 achievements", { exact: true }),
  ).toBeVisible();
});
test("fallback totals, genre tags, duplicate rows and animated percentage cards", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Import collection", exact: true })
    .click();
  await page.getByLabel("CSV export").setInputFiles({
    name: "reordered.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(
      'Achv,XCT Genre,Title,Genre,Platform,Achievements Total,Achievements Earned\n50,"Action Horror, Horror",HalfGifted,Adventure,"Windows, Xbox One",50,25\n50,"Action Horror, Horror",HalfGifted,Adventure,"Xbox One, Windows, Xbox Play Anywhere",50,25\n33,Horror,Unplayed,Adventure,Xbox One,,',
    ),
  });
  await expect(page.getByText(/1 duplicates consolidated/)).toBeVisible();
  await page.getByRole("button", { name: "Confirm import" }).click();
  await expect(page.getByRole("status")).toContainText("Import saved");
  await page.getByRole("button", { name: "Collection", exact: true }).click();
  await expect(page.locator(".game-card")).toHaveCount(2);
  await expect(page.getByText("50%", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("progressbar", { name: "Half completion" }),
  ).toHaveAttribute("value", "50");
  await expect(
    page.getByRole("progressbar", { name: "Unplayed completion" }),
  ).toHaveAttribute("value", "0");
  await expect(page.getByText("Action Horror", { exact: true })).toBeVisible();
  await expect(page.getByText("HalfGifted", { exact: true })).toHaveCount(0);
  const card = page.locator(".game-card").first();
  await card.hover();
  await expect
    .poll(() => card.evaluate((el) => getComputedStyle(el).transform))
    .not.toBe("none");
  if (process.env.HAVENBOUND_SCREENSHOTS)
    await page.screenshot({
      path: process.env.HAVENBOUND_SCREENSHOTS + "/updated-cards.png",
      fullPage: true,
    });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect
    .poll(() => card.evaluate((el) => getComputedStyle(el).transform))
    .toBe("none");
  expect(
    await page
      .locator(".app")
      .evaluate((el) => getComputedStyle(el, "::before").animationName),
  ).toBe("none");
  await page
    .getByRole("button", { name: "Virtual library", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "Library genre" })
    .selectOption("Horror");
  await expect(page.locator(".library-book")).toHaveCount(2);
  await expect(page.getByText("50%", { exact: true })).toBeVisible();
  await page
    .getByRole("combobox", { name: "Library genre" })
    .selectOption("Action Horror");
  await expect(page.locator(".library-book")).toHaveCount(1);
});
test("new XCT achievement export powers shelves and Ledger-inspired picks", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Import collection", exact: true })
    .click();
  await page.getByLabel("CSV export").setInputFiles({
    name: "new-xct.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(
      "Title,Source,Gamertag,Status,Achievements Earned,Achievements Total,Genre\nAlpha,Both,Example,Fulfilled,0,33,Puzzle\nBravo,Both,Example,Active,1,33,Adventure\nComplete,Both,Example,,33,33,Puzzle\nUnknown,Both,Example,,,,Puzzle",
    ),
  });
  await page.getByRole("button", { name: "Confirm import" }).click();
  await expect(page.getByRole("status")).toContainText("Import saved");
  await page
    .getByRole("button", { name: "Virtual library", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Puzzle", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "A–Z challenge", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Open Alpha", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "My next 10", exact: true }).click();
  await page
    .getByRole("button", { name: "Pick my next 10", exact: true })
    .click();
  await expect(page.locator(".library-book")).toHaveCount(2);
  await page
    .getByRole("button", { name: "Give me a hunt", exact: true })
    .first()
    .click();
  await page
    .getByRole("button", { name: "Give me a hunt", exact: true })
    .last()
    .click();
  await expect(
    page.getByRole("button", { name: "Open Alpha", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Want to Play next", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "On your Want to Play list" }),
  ).toBeVisible();
  await page.reload();
  await page
    .getByRole("combobox", { name: "Library progress" })
    .selectOption("next");
  await expect(page.locator(".library-book")).toHaveCount(1);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("import, plan, calculate, persist and isolate profiles", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Welcome to your haven." }),
  ).toBeVisible();
  if (process.env.HAVENBOUND_SCREENSHOTS)
    await page.screenshot({
      path: process.env.HAVENBOUND_SCREENSHOTS + "/desktop.png",
      fullPage: true,
    });
  await page
    .getByRole("button", { name: "Import collection", exact: true })
    .click();
  await page.getByLabel("CSV export").setInputFiles({
    name: "collection.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(
      "Title,Product ID,Platform,Edition,Status,Owned\nExample Quest,ABC,Xbox Series X|S,Standard,started,true",
    ),
  });
  await page.getByRole("button", { name: "Confirm import" }).click();
  await expect(page.getByRole("status")).toContainText("Import saved");
  await page.getByRole("button", { name: "Collection", exact: true }).click();
  await page
    .getByRole("button", { name: "Example Quest", exact: true })
    .click();
  await page.getByLabel("Achievements earned").fill("10");
  await page.getByLabel("Achievements available").fill("50");
  await page.getByLabel("Include in achievement statistics").check();
  await page
    .getByRole("combobox", { name: "Backlog list", exact: true })
    .selectOption("Currently Playing");
  await page.getByLabel("Remaining hours").fill("20");
  await page.getByRole("button", { name: "Save game" }).click();
  await page
    .getByRole("button", { name: "Completion lab", exact: true })
    .click();
  await expect(page.getByText("20.00%", { exact: true }).first()).toBeVisible();
  await page.getByRole("button", { name: "+ Custom scenario" }).click();
  await page.getByLabel("New achievements introduced").fill("133");
  await page.getByLabel("Additional achievements earned").fill("133");
  await expect(page.getByText("78.14%", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Calendar", exact: true }).click();
  await page
    .getByLabel("Game to schedule")
    .selectOption({ label: "Example Quest · 20h remaining" });
  await page
    .getByRole("button", { name: "Schedule game", exact: true })
    .click();
  await expect(page.getByRole("button", { name: "Remove plan" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: "Remove plan" })).toBeVisible();
  await page
    .getByRole("button", { name: "Import & settings", exact: true })
    .click();
  await page.getByLabel("New profile name").fill("Friend");
  await page.getByRole("button", { name: "Create profile" }).click();
  await page.getByRole("button", { name: "Collection", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Your collection belongs here" }),
  ).toBeVisible();
  await page.getByLabel("Active profile").selectOption({ label: "My haven" });
  await expect(
    page.getByRole("button", { name: "Example Quest", exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test("mobile layout, manual editing and keyboard-friendly backlog", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Collection", exact: true }).click();
  await page.getByRole("button", { name: "Add game", exact: true }).click();
  await page.getByLabel("Game title").fill("A new adventure");
  await page
    .getByRole("combobox", { name: "Backlog list", exact: true })
    .selectOption("Want to Play");
  await page.getByRole("button", { name: "Save game" }).click();
  await page.getByRole("button", { name: /^My backlog/ }).click();
  await page
    .getByLabel("Move A new adventure", { exact: true })
    .selectOption("Completed");
  await page.getByRole("button", { name: "Overview", exact: true }).click();
  await expect(page.getByText("1 dated this month")).toBeVisible();
  if (process.env.HAVENBOUND_SCREENSHOTS)
    await page.screenshot({
      path: process.env.HAVENBOUND_SCREENSHOTS + "/mobile.png",
      fullPage: true,
    });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
