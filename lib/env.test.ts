import { afterEach, describe, expect, it } from "vitest";
import { businessTimeZone, databaseTarget, DEFAULT_BUSINESS_TIMEZONE } from "@/lib/env";

const keys = ["BUSINESS_TIMEZONE", "DATABASE_URL", "DATABASE_URL_UNPOOLED"] as const;
const previous = new Map<string, string | undefined>();

function remember() {
  for (const key of keys) previous.set(key, process.env[key]);
}

function restore() {
  for (const key of keys) {
    const value = previous.get(key);
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

describe("business timezone", () => {
  afterEach(restore);

  it("defaults to America/New_York when unset", () => {
    remember();
    delete process.env.BUSINESS_TIMEZONE;
    expect(businessTimeZone()).toBe(DEFAULT_BUSINESS_TIMEZONE);
    expect(DEFAULT_BUSINESS_TIMEZONE).toBe("America/New_York");
  });

  it("keeps a valid IANA zone and ignores a typo", () => {
    remember();
    process.env.BUSINESS_TIMEZONE = "America/Chicago";
    expect(businessTimeZone()).toBe("America/Chicago");
    process.env.BUSINESS_TIMEZONE = "Not/AZone";
    expect(businessTimeZone()).toBe("America/New_York");
  });
});

describe("database target", () => {
  afterEach(restore);

  it("prefers the unpooled URL and skips blank values", () => {
    remember();
    process.env.DATABASE_URL_UNPOOLED = " postgresql://direct/db ";
    process.env.DATABASE_URL = "postgresql://pooled/db";
    expect(databaseTarget()).toEqual({
      url: "postgresql://direct/db",
      source: "DATABASE_URL_UNPOOLED",
    });
    process.env.DATABASE_URL_UNPOOLED = "  ";
    expect(databaseTarget()?.source).toBe("DATABASE_URL");
    process.env.DATABASE_URL = "";
    expect(databaseTarget()).toBeNull();
  });
});
