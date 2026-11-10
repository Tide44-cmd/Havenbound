import { test, expect } from "@playwright/test";
test("platform tags, persistent tracking choices, completion options and themes", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  const file = {
    name: "tracking.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(
      'Title,Platform,Achievements Earned,Achievements Total\nPlayed,"Windows 10; Xbox Series X|S, Windows 10",25,50\nComplete,Xbox Series X|S,50,50\nNext,"Windows 10, PC",0,50\nAgents of Mayhem,Xbox One,10,100',
    ),
  };
  const go = async (name: string) => {
    await page.getByRole("button", { name, exact: true }).click();
  };
  const importFile = async () => {
    await go("Import collection");
    await page.getByLabel("CSV export").setInputFiles(file);
    await go("Confirm import");
  };
  await importFile();
  await go("Collection");
  await expect(page.getByLabel("Filter platform").locator("option")).toHaveText(
    ["All platforms", "PC", "Windows 10", "Xbox One", "Xbox Series X|S"],
  );
  await page.getByLabel("Filter platform").selectOption("Windows 10");
  await expect(page.locator(".game-card")).toHaveCount(2);
  const played = page
    .locator(".game-card")
    .filter({ has: page.getByRole("button", { name: "Played", exact: true }) });
  await expect(played.locator(".platform-badges span")).toHaveText([
    "Windows 10",
    "Xbox Series X|S",
  ]);
  await page.getByLabel("Filter platform").selectOption("all");
  await page
    .getByLabel("Tracking for Complete", { exact: true })
    .selectOption("ignored");
  await page
    .getByLabel("Tracking for Agents of Mayhem", { exact: true })
    .selectOption("unobtainable");
  await page
    .getByLabel("Backlog list for Next", { exact: true })
    .selectOption("Want to Play");
  await expect(
    page
      .locator(".game-card")
      .filter({
        has: page.getByRole("button", { name: "Complete", exact: true }),
      }),
  ).toContainText("Excluded · ignored");
  await page.getByLabel("Filter statuses", { exact: true }).click();
  await page.getByRole("checkbox", { name: "Ignored", exact: true }).check();
  await expect(page.locator(".game-card")).toHaveCount(1);
  await page.getByRole("button", { name: "Show all statuses" }).click();
  await page.keyboard.press("Escape");
  await go("Completion lab");
  const current = page
    .locator(".metric")
    .filter({ hasText: "Current completion" });
  await expect(current).toContainText("23.33%");
  await page.getByLabel("Include Want to play", { exact: true }).check();
  await expect(current).toContainText("17.50%");
  await page.getByLabel("Exclude Unobtainable", { exact: true }).check();
  await expect(current).toContainText("25.00%");
  await page
    .getByLabel("Choose hypothetical game")
    .selectOption({ label: "Next" });
  await go("Add game");
  await expect(page.getByLabel("New achievements introduced")).toHaveValue("0");
  await expect(page.getByLabel("Additional achievements earned")).toHaveValue(
    "50",
  );
  await expect(
    page.locator(".metric").filter({ hasText: "Projected completion" }),
  ).toContainText("75.00%");
  await page.getByLabel("Include Want to play", { exact: true }).uncheck();
  await expect(page.locator(".scenario")).toHaveCount(0);
  await expect(current).toContainText("50.00%");
  await page.reload();
  await expect(
    page.getByLabel("Exclude Unobtainable", { exact: true }),
  ).toBeChecked();
  await importFile();
  await go("Collection");
  await expect(
    page.getByLabel("Tracking for Complete", { exact: true }),
  ).toHaveValue("ignored");
  await expect(
    page.getByLabel("Tracking for Agents of Mayhem", { exact: true }),
  ).toHaveValue("unobtainable");
  await page
    .getByRole("button", { name: "Agents of Mayhem", exact: true })
    .click();
  await expect(
    page.getByLabel("Unobtainable · remaining achievements cannot be earned"),
  ).toBeChecked();
  await page
    .getByLabel("Ignored · always exclude from completion stats")
    .check();
  await go("Save game");
  await expect(
    page.getByLabel("Tracking for Agents of Mayhem", { exact: true }),
  ).toHaveValue("ignored");
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const theme of ["woodland", "ocean", "ember"]) {
    await go("Import & settings");
    await page.getByLabel("Colour theme").selectOption(theme);
    await go("Collection");
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    if (process.env.HAVENBOUND_SCREENSHOTS)
      await page.screenshot({
        path: process.env.HAVENBOUND_SCREENSHOTS + `/tracking-${theme}.png`,
        fullPage: true,
      });
  }
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "ember");
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
