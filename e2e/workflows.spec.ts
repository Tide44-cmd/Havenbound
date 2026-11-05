import { test, expect } from "@playwright/test";
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
