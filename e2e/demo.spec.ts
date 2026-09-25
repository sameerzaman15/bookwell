import { expect, test, type Page } from "@playwright/test";

function futureWeekday(weekday: number, minDays: number) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + minDays);
  while (date.getDay() !== weekday) date.setDate(date.getDate() + 1);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

async function openDay(page: Page, iso: string) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const button = page.locator(`[data-iso="${iso}"]`);
    if (await button.count()) {
      await button.click();
      return;
    }
    await page.getByRole("button", { name: /next month/i }).click();
  }
  throw new Error(`Calendar day ${iso} was not on screen.`);
}

async function signIn(page: Page, role: "admin" | "client", from: "/" | "/login") {
  await page.goto(from);
  const label = role === "admin" ? "Try demo as admin" : "Try demo as client";
  await page.getByRole("button", { name: label }).click();
  await page.waitForURL(role === "admin" ? "**/admin" : "**/portal");
}

test("demo admin lands on the dashboard from home and login", async ({ page }) => {
  await signIn(page, "admin", "/");
  await expect(page.getByRole("heading", { name: "Cedar Physio & Wellness" })).toBeVisible();
  await expect(page.getByText(/Bookings, next/)).toBeVisible();
  await expect(page.getByText(/Revenue, last/)).toBeVisible();
  await expect(page.getByText(/Utilization, next/)).toBeVisible();
  await expect(page.getByText("Built by").getByRole("link", { name: "Sameer Zaman" })).toBeVisible();
  await page.getByRole("button", { name: "Sign out" }).click();
  await page.waitForURL("**/");
  await signIn(page, "admin", "/login");
  await expect(page).toHaveURL(/\/admin$/);
});

test("demo client books, reschedules, and cancels", async ({ page }) => {
  const bookDay = futureWeekday(2, 10);
  const moveDay = futureWeekday(4, 12);

  await signIn(page, "client", "/login");
  await expect(page.getByRole("heading", { name: /Hello/ })).toBeVisible();
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/portal/);

  await page.goto("/portal/book");
  await page.getByTestId("service-svc_follow").click();
  await page.getByTestId("practitioner-prac_maya_chen").click();
  await openDay(page, bookDay);
  const slot = page.getByTestId("slot-pill").first();
  await expect(slot).toBeVisible();
  const timeLabel = (await slot.innerText()).trim();
  await slot.click();
  await page.getByTestId("continue-time").click();
  await expect(page.getByText("Review and confirm")).toBeVisible();
  await page.getByTestId("confirm-booking").click();
  await page.waitForURL("**/portal/bookings");
  await expect(page.getByText("Appointment booked.")).toBeVisible();

  const bookingLink = page.getByRole("link", { name: new RegExp(`Follow-up[\\s\\S]*${timeLabel}`) }).first();
  await expect(bookingLink).toBeVisible();
  await bookingLink.click();
  await expect(page.getByRole("heading", { name: "Follow-up" })).toBeVisible();

  await page.getByRole("button", { name: "Choose a new time" }).click();
  await openDay(page, moveDay);
  const nextSlot = page.getByTestId("reschedule-slot").first();
  await expect(nextSlot).toBeVisible();
  const movedLabel = (await nextSlot.innerText()).trim();
  await nextSlot.click();
  await expect(page.getByText("Appointment moved.")).toBeVisible();
  await expect(page.getByText(movedLabel).first()).toBeVisible();

  await page.getByRole("button", { name: "Cancel appointment" }).click();
  await expect(page.getByText("Appointment cancelled.")).toBeVisible();
  await expect(page.getByText("Cancelled")).toBeVisible();
});

test("dark mode keeps the dashboard charts on screen", async ({ page }) => {
  await signIn(page, "admin", "/");
  await page.getByRole("button", { name: "Switch to dark mode" }).click({ force: true });
  await expect(page.locator("html")).toHaveClass(/dark/);
  await expect(page.getByText("Bookings per day")).toBeVisible();
  await expect(page.getByText("Revenue by service")).toBeVisible();
  await expect(page.getByText("Utilization by practitioner")).toBeVisible();
});
