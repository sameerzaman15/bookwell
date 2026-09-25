import { describe, expect, it } from "vitest";
import {
  bookingVisibility,
  cancellationBlock,
  credentialChangeBlock,
  requireRoleResult,
} from "@/lib/authz";
import { firstIssue, signUpSchema, stripSignUpRole } from "@/lib/validators";

const client = { id: "c1", name: "Alex", email: "alex@example.com", role: "client" as const, phone: null };
const admin = { ...client, id: "a1", role: "admin" as const };

describe("authz", () => {
  it("rejects non-admins from admin actions", () => {
    expect(requireRoleResult(null, "admin")).toMatchObject({ ok: false, status: 401 });
    expect(requireRoleResult(client, "admin")).toMatchObject({ ok: false, status: 403 });
    expect(requireRoleResult(admin, "admin")).toEqual({ ok: true });
  });

  it("hides another client's booking", () => {
    expect(bookingVisibility(client, { clientId: "someone-else" })).toBe("not_found");
    expect(bookingVisibility(client, null)).toBe("not_found");
    expect(bookingVisibility(client, { clientId: "c1" })).toBe("ok");
    expect(bookingVisibility(admin, { clientId: "someone-else" })).toBe("ok");
  });

  it("blocks cancellation inside the window and allows it outside", () => {
    const start = new Date("2026-06-10T15:00:00Z");
    expect(cancellationBlock(new Date("2026-06-10T00:00:00Z"), start, 24)).toMatch(/cancellation window/);
    expect(cancellationBlock(new Date("2026-06-08T15:00:00Z"), start, 24)).toBeNull();
  });

  it("blocks credential changes for demo accounts", () => {
    expect(credentialChangeBlock("client@demo.bookwell.app", ["client@demo.bookwell.app"])).toMatch(/demo account/);
    expect(credentialChangeBlock("new@example.com", ["client@demo.bookwell.app"])).toBeNull();
  });
});

describe("signup schema", () => {
  it("drops a role field before validation", () => {
    const cleaned = stripSignUpRole({
      name: "New Client",
      email: "new@example.com",
      password: "Password123",
      role: "admin",
    });
    expect(cleaned).not.toHaveProperty("role");
    expect(signUpSchema.safeParse(cleaned).success).toBe(true);
  });

  it("explains a weak password", () => {
    const parsed = signUpSchema.safeParse({
      name: "New Client",
      email: "new@example.com",
      password: "short",
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) expect(firstIssue(parsed.error)).toMatch(/8 characters/);
  });
});
