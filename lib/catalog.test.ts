import { fromZonedTime } from "date-fns-tz";
import { describe, expect, it } from "vitest";
import { lastAttendedVisit } from "@/lib/catalog";
import { formatDay } from "@/lib/format";

const timeZone = "America/New_York";

function at(local: string) {
  return fromZonedTime(local, timeZone);
}

describe("lastAttendedVisit", () => {
  const now = at("2026-09-25T12:00:00");

  it("uses the latest completed past visit and ignores future, cancelled, and no-show bookings", () => {
    const olderCompleted = at("2026-09-18T10:00:00");
    const pastCompleted = at("2026-09-20T17:00:00");
    const future = at("2026-10-06T09:30:00");
    const last = lastAttendedVisit(
      [
        { startAt: olderCompleted, status: "completed" },
        { startAt: pastCompleted, status: "completed" },
        { startAt: at("2026-09-22T11:00:00"), status: "cancelled" },
        { startAt: at("2026-09-23T09:00:00"), status: "no_show" },
        { startAt: at("2026-09-24T15:00:00"), status: "confirmed" },
        { startAt: at("2026-09-24T16:00:00"), status: "pending" },
        { startAt: future, status: "confirmed" },
        { startAt: at("2026-10-01T09:00:00"), status: "completed" },
      ],
      now,
    );

    expect(last?.toISOString()).toBe(pastCompleted.toISOString());
    expect(formatDay(last ?? now, timeZone)).toBe("Sun, Sep 20");
    expect(formatDay(future, timeZone)).toBe("Tue, Oct 6");
  });

  it("does not count a visit that starts at the current instant", () => {
    expect(lastAttendedVisit([{ startAt: now, status: "completed" }], now)).toBeNull();
  });

  it("compares instants in the clinic timezone instead of the UTC calendar date", () => {
    const evening = at("2026-09-25T21:30:00");
    const started = at("2026-09-25T21:00:00");
    const stillAhead = at("2026-09-25T22:00:00");

    expect(started.toISOString().startsWith("2026-09-26")).toBe(true);
    expect(formatDay(started, timeZone)).toBe("Fri, Sep 25");
    expect(
      lastAttendedVisit(
        [
          { startAt: started, status: "completed" },
          { startAt: stillAhead, status: "confirmed" },
        ],
        evening,
      )?.toISOString(),
    ).toBe(started.toISOString());
  });

  it("returns null when nothing has been attended", () => {
    expect(
      lastAttendedVisit(
        [
          { startAt: at("2026-09-01T09:00:00"), status: "cancelled" },
          { startAt: at("2026-09-02T09:00:00"), status: "no_show" },
          { startAt: at("2026-10-06T09:30:00"), status: "pending" },
        ],
        now,
      ),
    ).toBeNull();
  });
});
