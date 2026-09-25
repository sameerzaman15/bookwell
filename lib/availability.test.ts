import { describe, expect, it } from "vitest";
import { getOpenSlots, type BusyBooking, type WeekdayRule } from "@/lib/availability";

const settings = {
  timezone: "UTC",
  slotIntervalMin: 30,
  minLeadHours: 0,
  maxAdvanceDays: 30,
};

function slotsOn(date: string, extra?: Partial<Parameters<typeof getOpenSlots>[0]>) {
  return getOpenSlots({
    rules: [
      { practitionerId: "p1", weekday: new Date(`${date}T12:00:00Z`).getUTCDay(), startTime: "09:00", endTime: "12:00" },
    ],
    timeOff: [],
    bookings: [],
    service: { durationMin: 30, bufferMin: 0 },
    settings,
    date,
    now: new Date(`${date}T00:00:00Z`),
    practitionerIds: ["p1"],
    ...extra,
  });
}

describe("getOpenSlots", () => {
  it("returns slots inside working hours on the interval", () => {
    const slots = slotsOn("2026-06-01");
    expect(slots.map((slot) => slot.start.toISOString())).toEqual([
      "2026-06-01T09:00:00.000Z",
      "2026-06-01T09:30:00.000Z",
      "2026-06-01T10:00:00.000Z",
      "2026-06-01T10:30:00.000Z",
      "2026-06-01T11:00:00.000Z",
      "2026-06-01T11:30:00.000Z",
    ]);
  });

  it("keeps a buffer after existing bookings and the candidate slot", () => {
    const bookings: BusyBooking[] = [
      {
        practitionerId: "p1",
        startAt: new Date("2026-06-01T09:00:00Z"),
        endAt: new Date("2026-06-01T09:30:00Z"),
        status: "confirmed",
      },
    ];
    const slots = slotsOn("2026-06-01", {
      bookings,
      service: { durationMin: 30, bufferMin: 15 },
    });
    expect(slots.map((slot) => slot.start.toISOString())).toEqual([
      "2026-06-01T10:00:00.000Z",
      "2026-06-01T10:30:00.000Z",
      "2026-06-01T11:00:00.000Z",
      "2026-06-01T11:30:00.000Z",
    ]);
  });

  it("applies lead time", () => {
    const starts = getOpenSlots({
      rules: [{ practitionerId: "p1", weekday: 1, startTime: "09:00", endTime: "13:00" }],
      timeOff: [],
      bookings: [],
      service: { durationMin: 60, bufferMin: 0 },
      settings: { ...settings, slotIntervalMin: 60, minLeadHours: 2 },
      date: "2026-06-01",
      now: new Date("2026-06-01T09:00:00Z"),
      practitionerIds: ["p1"],
    }).map((slot) => slot.start.toISOString());
    expect(starts).toEqual(["2026-06-01T11:00:00.000Z", "2026-06-01T12:00:00.000Z"]);
  });

  it("rejects dates beyond max advance and dates in the past", () => {
    const now = new Date("2026-06-01T12:00:00Z");
    const base = {
      rules: [{ practitionerId: "p1", weekday: new Date("2026-06-04T12:00:00Z").getUTCDay(), startTime: "09:00", endTime: "12:00" }] as WeekdayRule[],
      timeOff: [],
      bookings: [],
      service: { durationMin: 30, bufferMin: 0 },
      settings: { ...settings, maxAdvanceDays: 2 },
      now,
      practitionerIds: ["p1"],
    };
    expect(getOpenSlots({ ...base, date: "2026-06-03", rules: [{ practitionerId: "p1", weekday: 3, startTime: "09:00", endTime: "10:00" }] }).length).toBeGreaterThan(0);
    expect(getOpenSlots({ ...base, date: "2026-06-04", rules: [{ practitionerId: "p1", weekday: 4, startTime: "09:00", endTime: "10:00" }] })).toEqual([]);
    expect(getOpenSlots({ ...base, date: "2026-05-31", rules: [{ practitionerId: "p1", weekday: 0, startTime: "09:00", endTime: "10:00" }] })).toEqual([]);
  });

  it("removes slots that overlap time off", () => {
    const slots = slotsOn("2026-06-01", {
      timeOff: [
        {
          practitionerId: "p1",
          startsAt: new Date("2026-06-01T10:00:00Z"),
          endsAt: new Date("2026-06-01T11:00:00Z"),
        },
      ],
    });
    expect(slots.map((slot) => slot.start.toISOString())).toEqual([
      "2026-06-01T09:00:00.000Z",
      "2026-06-01T09:30:00.000Z",
      "2026-06-01T11:00:00.000Z",
      "2026-06-01T11:30:00.000Z",
    ]);
  });

  it("supports more than one range in a day", () => {
    const slots = getOpenSlots({
      rules: [
        { practitionerId: "p1", weekday: 1, startTime: "09:00", endTime: "12:00" },
        { practitionerId: "p1", weekday: 1, startTime: "13:00", endTime: "15:00" },
      ],
      timeOff: [],
      bookings: [],
      service: { durationMin: 60, bufferMin: 0 },
      settings: { ...settings, slotIntervalMin: 60 },
      date: "2026-06-01",
      now: new Date("2026-06-01T00:00:00Z"),
      practitionerIds: ["p1"],
    });
    expect(slots.map((slot) => slot.start.toISOString())).toEqual([
      "2026-06-01T09:00:00.000Z",
      "2026-06-01T10:00:00.000Z",
      "2026-06-01T11:00:00.000Z",
      "2026-06-01T13:00:00.000Z",
      "2026-06-01T14:00:00.000Z",
    ]);
  });

  it("shifts wall-clock slots across a DST change", () => {
    const rules: WeekdayRule[] = [
      { practitionerId: "p1", weekday: 6, startTime: "09:00", endTime: "10:00" },
      { practitionerId: "p1", weekday: 1, startTime: "09:00", endTime: "10:00" },
    ];
    const before = getOpenSlots({
      rules,
      timeOff: [],
      bookings: [],
      service: { durationMin: 60, bufferMin: 0 },
      settings: { timezone: "America/New_York", slotIntervalMin: 60, minLeadHours: 0, maxAdvanceDays: 400 },
      date: "2026-03-07",
      now: new Date("2026-03-01T00:00:00Z"),
      practitionerIds: ["p1"],
    });
    const after = getOpenSlots({
      rules,
      timeOff: [],
      bookings: [],
      service: { durationMin: 60, bufferMin: 0 },
      settings: { timezone: "America/New_York", slotIntervalMin: 60, minLeadHours: 0, maxAdvanceDays: 400 },
      date: "2026-03-09",
      now: new Date("2026-03-01T00:00:00Z"),
      practitionerIds: ["p1"],
    });
    expect(before[0]?.start.toISOString()).toBe("2026-03-07T14:00:00.000Z");
    expect(after[0]?.start.toISOString()).toBe("2026-03-09T13:00:00.000Z");
  });

  it("skips the missing hour on the spring-forward morning", () => {
    const slots = getOpenSlots({
      rules: [{ practitionerId: "p1", weekday: 0, startTime: "01:00", endTime: "04:00" }],
      timeOff: [],
      bookings: [],
      service: { durationMin: 60, bufferMin: 0 },
      settings: { timezone: "America/New_York", slotIntervalMin: 60, minLeadHours: 0, maxAdvanceDays: 30 },
      date: "2026-03-08",
      now: new Date("2026-03-01T00:00:00Z"),
      practitionerIds: ["p1"],
    });
    expect(slots.map((slot) => slot.start.toISOString())).toEqual([
      "2026-03-08T06:00:00.000Z",
      "2026-03-08T07:00:00.000Z",
    ]);
  });

  it("assigns Any available to the least-booked free practitioner", () => {
    const bookings: BusyBooking[] = [
      { practitionerId: "a", startAt: new Date("2026-06-02T09:00:00Z"), endAt: new Date("2026-06-02T09:30:00Z"), status: "confirmed" },
      { practitionerId: "a", startAt: new Date("2026-06-02T10:00:00Z"), endAt: new Date("2026-06-02T10:30:00Z"), status: "confirmed" },
      { practitionerId: "a", startAt: new Date("2026-06-02T11:00:00Z"), endAt: new Date("2026-06-02T11:30:00Z"), status: "confirmed" },
      { practitionerId: "b", startAt: new Date("2026-06-02T15:00:00Z"), endAt: new Date("2026-06-02T15:30:00Z"), status: "confirmed" },
      { practitionerId: "a", startAt: new Date("2026-06-01T10:00:00Z"), endAt: new Date("2026-06-01T10:30:00Z"), status: "confirmed" },
    ];
    const rules: WeekdayRule[] = [
      { practitionerId: "a", weekday: 1, startTime: "09:00", endTime: "11:00" },
      { practitionerId: "b", weekday: 1, startTime: "09:00", endTime: "11:00" },
    ];
    const slots = getOpenSlots({
      rules,
      timeOff: [],
      bookings,
      service: { durationMin: 30, bufferMin: 0 },
      settings,
      date: "2026-06-01",
      now: new Date("2026-06-01T00:00:00Z"),
      practitionerIds: ["a", "b"],
      mode: "any",
    });
    const atNine = slots.find((slot) => slot.start.toISOString() === "2026-06-01T09:00:00.000Z");
    const atTen = slots.find((slot) => slot.start.toISOString() === "2026-06-01T10:00:00.000Z");
    expect(atNine?.practitionerId).toBe("b");
    expect(atTen?.practitionerId).toBe("b");
    expect(slots.some((slot) => slot.start.toISOString() === "2026-06-01T10:30:00.000Z" && slot.practitionerId === "b")).toBe(true);
  });
});
