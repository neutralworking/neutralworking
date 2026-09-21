import { test, expect, Page } from "@playwright/test";
async function open(page: Page) {
  await page.goto("/");
  const desktop = await page
    .getByRole("button", { name: "Deposit", exact: true })
    .isVisible();
  await page
    .getByRole("button", { name: desktop ? "Deposit" : "$24.50", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
}
async function next(page: Page) {
  await page
    .getByRole("button", { name: /^Continue(?: & pick a bonus)?$/i })
    .click();
  await expect(page.getByRole("button", { name: /^2 Bonus/ })).toBeVisible();
}
async function noBonus(page: Page) {
  await next(page);
  await page.getByRole("button", { name: /Deposit without bonus/ }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
}
async function debug(page: Page) {
  await page.getByRole("button", { name: "Prototype controls" }).click();
}
async function enterCustomAmount(page: Page, amount: string) {
  const field = page.getByLabel("Enter custom amount");
  if (!(await field.isVisible())) {
    await page.getByRole("button", { name: /Custom\s*Amount/ }).click();
  }
  await field.fill(amount);
}
async function fillDemoCard(page: Page) {
  await page.getByLabel("Card number", { exact: true }).fill("4242 4242 4242 4242");
  await page.getByLabel("MM / YY").fill("12/30");
  await page.getByLabel("CVV").fill("123");
}
test("new card: validation, address edit, successful deposit and balance", async ({
  page,
}, info) => {
  const consoleErrors: string[] = [];
  page.on("pageerror", (e) => consoleErrors.push(e.message));
  await open(page);
  await next(page);
  await page
    .getByRole("button", { name: "Select", exact: true })
    .first()
    .click();
  await page.getByRole("button", { name: "See more details" }).click();
  await expect(page.getByText(/No playthrough requirement/)).toBeVisible();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await enterCustomAmount(page, "5");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(
    page.getByText("Minimum deposit $30.00 with KICKSTARTER."),
  ).toBeVisible();
  await enterCustomAmount(page, "64.25");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page
    .getByRole("button", { name: "Deposit $64.25", exact: true })
    .click();
  await expect(
    page.getByText("Use the demo card 4242 4242 4242 4242."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Edit" }).click();
  await page.getByLabel("Street address").fill("");
  await page.getByRole("button", { name: "Save address" }).click();
  await expect(page.getByText("This field is required.")).toBeVisible();
  await page.getByLabel("Street address").fill("42 Sample Avenue");
  await page.getByRole("button", { name: "Save address" }).click();
  await expect(page.getByText("42 Sample Avenue")).toBeVisible();
  await fillDemoCard(page);
  await page.screenshot({ path: `docs/${info.project.name}-details.png` });
  await page
    .getByRole("button", { name: "Deposit $64.25", exact: true })
    .click();
  await expect(page.getByText("Your deposit is complete")).toBeVisible();
  await expect(page.locator(".cashier-balance-state")).toContainText("$88.75");
  await page.getByRole("button", { name: "View transactions" }).click();
  await expect(page.locator(".transaction")).toHaveCount(1);
  await expect(page.locator(".transaction")).toContainText("$64.25");
  expect(consoleErrors).toEqual([]);
});
test("coupon entry, invalid code, cancel confirmation, no bonus and custom amount boundaries", async ({
  page,
}) => {
  await open(page);
  await next(page);
  await page.getByRole("button", { name: "I have a coupon code" }).click();
  await expect(page.getByLabel("Coupon code", { exact: true })).toBeVisible();
  await page.getByLabel("Coupon code", { exact: true }).fill("NOPE");
  await page.getByRole("button", { name: "Apply coupon" }).click();
  await expect(page.getByText(/This coupon is not available/)).toBeVisible();
  await page.locator("#coupon-code").fill(" bigwin420 ");
  await page.getByRole("button", { name: "Apply coupon" }).click();
  await expect(page.getByRole("heading", { name: "BIGWIN420" })).toBeVisible();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(
    page.getByText("Minimum deposit $99.00 with BIGWIN420."),
  ).toBeVisible();
  await page.getByRole("button", { name: /Bonus BIGWIN420/ }).click();
  await page.getByRole("button", { name: "Cancel coupon" }).click();
  await page.getByRole("button", { name: "Keep coupon" }).click();
  await expect(page.getByRole("heading", { name: "BIGWIN420" })).toBeVisible();
  await page.getByRole("button", { name: "Cancel coupon" }).click();
  await page.getByRole("button", { name: "Remove coupon" }).click();
  await page.getByRole("button", { name: /Deposit without bonus/ }).click();
  for (const amount of ["9", "2001", "12.345", "abc"]) {
    await enterCustomAmount(page, amount);
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await expect(page.locator(".field .error")).toBeVisible();
  }
  await enterCustomAmount(page, "10");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByLabel("Card number", { exact: true })).toBeVisible();
});
test("saved card decline, retry and pending without crediting balance", async ({
  page,
}) => {
  await open(page);
  await debug(page);
  await page.getByLabel("Card scenario").selectOption("saved");
  await page.getByLabel("Payment outcome").selectOption("declined");
  await page.getByRole("button", { name: "Close prototype controls" }).click();
  await expect(
    page.getByRole("button", { name: /Visa.*Last used/ }),
  ).toHaveAttribute("aria-pressed", "true");
  await noBonus(page);
  await expect(page.getByText("Visa ••5602")).toBeVisible();
  await expect(page.getByLabel("Card number", { exact: true })).toHaveCount(0);
  await page
    .getByRole("button", { name: "Deposit $50.00", exact: true })
    .click();
  await expect(page.getByText("Your card was declined")).toBeVisible();
  await expect(page.locator(".cashier-balance-state")).toContainText("$24.50");
  await debug(page);
  await page.getByLabel("Payment outcome").selectOption("pending");
  await page.getByRole("button", { name: "Close prototype controls" }).click();
  await page.getByRole("button", { name: "Retry by card" }).click();
  await page
    .getByRole("button", { name: "Deposit $50.00", exact: true })
    .click();
  await expect(page.getByText("Your deposit is pending")).toBeVisible();
  await expect(page.locator(".cashier-balance-state")).toContainText("$24.50");
});
test("debug presets retain custom amount; saved replacement; reset clears the scenario", async ({
  page,
}) => {
  await open(page);
  await debug(page);
  await page.getByLabel("Card scenario").selectOption("saved");
  await page.getByLabel("Amount presets").fill("40, 60, 80");
  await page.getByRole("button", { name: "Apply presets" }).click();
  await page.getByLabel("Selected amount").fill("72.5");
  await page.getByRole("button", { name: "Close prototype controls" }).click();
  await page.getByRole("button", { name: /Add new credit card/ }).click();
  await next(page);
  await page.getByRole("button", { name: /Deposit without bonus/ }).click();
  await expect(page.getByLabel("Enter custom amount")).toHaveValue("72.5");
  await expect(
    page.getByRole("button", { name: "$40", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Deposit $72.50", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Card number", { exact: true })).toBeVisible();
  await debug(page);
  await page.getByRole("button", { name: "Reset scenario" }).click();
  await expect(page.getByLabel("Selected amount")).toHaveValue("50");
  await expect(page.getByLabel("Amount presets")).toHaveValue("20, 30, 50");
  await expect(page.locator(".cashier-balance-state")).toContainText("$24.50");
});
test("promo context, close clears card but keeps draft, focus and responsive bounds", async ({
  page,
}, info) => {
  await page.goto("/");
  const claim = page.getByRole("button", { name: "Claim offer" });
  await claim.click();
  await next(page);
  await expect(page.getByRole("heading", { name: "KICKSTARTER" })).toBeVisible();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await fillDemoCard(page);
  await page.getByRole("button", { name: "Close cashier" }).click();
  await expect(claim).toBeFocused();
  const launch = page.getByRole("button", {
    name: info.project.name === "desktop" ? "Deposit" : "$24.50",
    exact: true,
  });
  await launch.click();
  await expect(page.getByLabel("Card number", { exact: true })).toHaveValue("");
  await expect(
    page.getByRole("button", { name: "Deposit $50.00", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Bonus KICKSTARTER/ }),
  ).toBeVisible();
  const bounds = await page.getByRole("dialog").boundingBox();
  const viewport = page.viewportSize()!;
  expect(bounds!.width).toBeLessThanOrEqual(viewport.width);
  if (info.project.name !== "desktop") {
    expect(bounds!.width).toBe(viewport.width);
    expect(bounds!.height).toBe(viewport.height);
  } else {
    expect(bounds!.width).toBeLessThan(viewport.width);
    expect(bounds!.x).toBeGreaterThan(0);
  }
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.keyboard.press("Tab");
  expect(
    await page.evaluate(() => !!document.activeElement?.closest("dialog")),
  ).toBe(true);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(launch).toBeFocused();
});
test("back editing revalidates higher bonus, duplicate submission blocked, session-only data", async ({
  page,
}) => {
  await open(page);
  await noBonus(page);
  await page.getByRole("button", { name: /Without a bonus/ }).click();
  await expect(page.getByRole("button", { name: "Select", exact: true }).first()).toBeVisible();
  await page
    .getByRole("button", { name: "Select", exact: true })
    .nth(1)
    .click();
  await page.getByRole("button", { name: /Payment Details/ }).click();
  await fillDemoCard(page);
  await page
    .getByRole("button", { name: "Deposit $50.00", exact: true })
    .click();
  await expect(
    page.getByText("Minimum deposit $99.00 with BIGWIN420."),
  ).toBeVisible();
  await enterCustomAmount(page, "99");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await fillDemoCard(page);
  await page
    .getByRole("button", { name: "Deposit $99.00", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Processing…" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Close cashier" }),
  ).toBeDisabled();
  await expect(page.getByText("Your deposit is complete")).toBeVisible();
  await expect(page.locator(".cashier-balance-state")).toContainText("$123.50");
  expect(
    await page.evaluate(
      () =>
        Object.keys(localStorage).length + Object.keys(sessionStorage).length,
    ),
  ).toBe(0);
});
