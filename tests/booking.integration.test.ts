import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { GET } from "@/app/api/cron/reset-demo/route";
import { user } from "@/db/schema";
import { seedDatabase } from "@/db/seed-data";
import { getAuth } from "@/lib/auth";
import {
  cancelBookingForActor,
  createBookingForActor,
  listOpenSlots,
  rescheduleBookingForActor,
} from "@/lib/booking-service";
import { getDb, SLOT_TAKEN_MESSAGE } from "@/lib/db";
import type { AuthUser } from "@/lib/authz";

const admin: AuthUser = {
  id: "user_admin",
  name: "Jordan Hale",
  email: "admin@demo.bookwell.app",
  role: "admin",
  phone: null,
};

const client: AuthUser = {
  id: "user_demo_client",
  name: "Alex Rivera",
  email: "client@demo.bookwell.app",
  role: "client",
  phone: null,
};

describe("database flows", () => {
  afterAll(async () => {
    await seedDatabase();
  });

  it("seeds the same shape twice", async () => {
    const first = await seedDatabase();
    const second = await seedDatabase();
    expect(second.bookings).toBe(first.bookings);
    expect(second.past).toBeGreaterThan(200);
    expect(second.future).toBeGreaterThan(20);
    const rows = await getDb().select({ id: user.id, role: user.role }).from(user);
    expect(rows.filter((row) => row.role === "admin")).toHaveLength(1);
    expect(rows.filter((row) => row.id === "user_demo_client")).toHaveLength(1);
  });

  it("ignores role=admin on signup", async () => {
    const response = await getAuth().handler(
      new Request("http://localhost:3000/api/auth/sign-up/email", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({
          name: "Role Probe",
          email: "role-probe@example.com",
          password: "Password123",
          role: "admin",
        }),
      }),
    );
    expect(response.ok).toBe(true);
    const row = await getDb().query.user.findFirst({ where: eq(user.email, "role-probe@example.com") });
    expect(row?.role).toBe("client");
  });

  it("keeps one booking when two requests take the same slot", async () => {
    let slots: Awaited<ReturnType<typeof listOpenSlots>> = [];
    for (let offset = 2; offset <= 18 && slots.length < 2; offset += 1) {
      const day = new Date(Date.now() + offset * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      slots = await listOpenSlots({
        serviceId: "svc_follow",
        practitionerId: "prac_maya_chen",
        date: day,
      });
    }
    expect(slots.length).toBeGreaterThan(1);
    const slot = slots[0];
    const [first, second] = await Promise.all([
      createBookingForActor(admin, {
        clientId: "user_client_01",
        serviceId: "svc_follow",
        practitionerId: slot.practitionerId,
        startAt: new Date(slot.start),
      }),
      createBookingForActor(admin, {
        clientId: "user_client_02",
        serviceId: "svc_follow",
        practitionerId: slot.practitionerId,
        startAt: new Date(slot.start),
      }),
    ]);
    const oks = [first, second].filter((result) => result.ok);
    const fails = [first, second].filter((result) => !result.ok);
    expect(oks).toHaveLength(1);
    expect(fails[0]?.ok).toBe(false);
    if (!fails[0]?.ok) expect(fails[0].error).toBe(SLOT_TAKEN_MESSAGE);
  });

  it("blocks a late cancel, allows an early cancel, and moves a booking", async () => {
    const { bookings } = await import("@/db/schema");
    let createdId = "";
    for (let hour = 3; hour < 30 && !createdId; hour += 3) {
      const soon = new Date(Date.now() + hour * 60 * 60 * 1000);
      try {
        const created = await getDb().insert(bookings).values({
          id: `book_window_probe_${hour}`,
          clientId: client.id,
          practitionerId: "prac_omar_haddad",
          serviceId: "svc_massage",
          startAt: soon,
          endAt: new Date(soon.getTime() + 45 * 60 * 1000),
          status: "confirmed",
          priceCents: 7500,
          createdBy: client.id,
          createdAt: new Date(),
          updatedAt: new Date(),
        }).returning({ id: bookings.id });
        createdId = created[0]?.id ?? "";
      } catch {
        createdId = "";
      }
    }
    expect(createdId).toBeTruthy();
    const blocked = await cancelBookingForActor(client, { id: createdId, reason: "Too soon" });
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.error).toMatch(/cancellation window/);

    let slots: Awaited<ReturnType<typeof listOpenSlots>> = [];
    for (let offset = 8; offset <= 18 && slots.length < 2; offset += 1) {
      const day = new Date(Date.now() + offset * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      slots = await listOpenSlots({
        serviceId: "svc_follow",
        practitionerId: "prac_maya_chen",
        date: day,
      });
    }
    const slot = slots[1] ?? slots[0];
    expect(slot).toBeTruthy();
    const booked = await createBookingForActor(client, {
      serviceId: "svc_follow",
      practitionerId: slot.practitionerId,
      startAt: new Date(slot.start),
    });
    expect(booked.ok).toBe(true);
    if (!booked.ok || !booked.data) return;
    const next = slots.find((item) => item.start !== slot.start);
    expect(next).toBeTruthy();
    const moved = await rescheduleBookingForActor(client, {
      id: booked.data.id,
      practitionerId: next!.practitionerId,
      startAt: new Date(next!.start),
    });
    expect(moved.ok).toBe(true);
    const cancelled = await cancelBookingForActor(client, { id: booked.data.id, reason: "Plans changed." });
    expect(cancelled.ok).toBe(true);
  });

  it("rejects the cron without a secret and reseeds with it", async () => {
    const denied = await GET(new Request("http://localhost:3000/api/cron/reset-demo"));
    expect(denied.status).toBe(401);
    const allowed = await GET(
      new Request("http://localhost:3000/api/cron/reset-demo", {
        headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
      }),
    );
    expect(allowed.status).toBe(200);
    const body = await allowed.json();
    expect(body.ok).toBe(true);
  });
});
