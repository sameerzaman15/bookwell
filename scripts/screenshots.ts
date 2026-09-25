import { mkdir } from "node:fs/promises";
import { chromium, type Page } from "@playwright/test";

const base = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

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

async function main() {
  await mkdir("docs", { recursive: true });
  const browser = await chromium.launch();
  const desktop = await browser.newPage({ viewport: { width: 1440, height: 960 } });

  await desktop.goto(`${base}/`);
  await desktop.getByRole("button", { name: "Try demo as admin" }).click();
  await desktop.waitForURL("**/admin");
  await desktop.getByText(/Bookings, next/).waitFor();
  await desktop.screenshot({ path: "docs/screenshot-admin.png" });

  await desktop.getByRole("button", { name: "Sign out" }).click();
  await desktop.waitForURL("**/");
  await desktop.goto(`${base}/login`);
  await desktop.getByRole("button", { name: "Try demo as client" }).click();
  await desktop.waitForURL("**/portal");
  await desktop.goto(`${base}/portal/book`);
  await desktop.getByTestId("service-svc_follow").click();
  await desktop.getByTestId("practitioner-prac_maya_chen").click();
  await openDay(desktop, futureWeekday(2, 10));
  await desktop.getByTestId("slot-pill").first().click();
  await desktop.getByTestId("continue-time").click();
  await desktop.getByText("Review and confirm").waitFor();
  await desktop.screenshot({ path: "docs/screenshot-booking.png" });

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await mobile.goto(`${base}/login`);
  await mobile.getByRole("button", { name: "Try demo as client" }).click();
  await mobile.waitForURL("**/portal");
  await mobile.getByRole("heading", { name: /Hello/ }).waitFor();
  await mobile.screenshot({ path: "docs/screenshot-mobile.png" });

  await browser.close();
  console.log("Wrote docs/screenshot-admin.png, docs/screenshot-booking.png, and docs/screenshot-mobile.png");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
