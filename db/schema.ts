import { relations, sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
  role: text("role").notNull().default("client"),
  phone: text("phone"),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_user_id_idx").on(table.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", {
      withTimezone: true,
      mode: "date",
    }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
      withTimezone: true,
      mode: "date",
    }),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("account_user_id_idx").on(table.userId),
    uniqueIndex("account_provider_account_idx").on(table.providerId, table.accountId),
  ],
);

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).defaultNow(),
});

export const practitioners = pgTable("practitioners", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  title: text("title").notNull(),
  bio: text("bio").notNull().default(""),
  color: text("color").notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
});

export const services = pgTable("services", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  durationMin: integer("duration_min").notNull(),
  bufferMin: integer("buffer_min").notNull().default(0),
  priceCents: integer("price_cents").notNull(),
  color: text("color").notNull(),
  active: boolean("active").notNull().default(true),
});

export const practitionerServices = pgTable(
  "practitioner_services",
  {
    practitionerId: text("practitioner_id")
      .notNull()
      .references(() => practitioners.id, { onDelete: "cascade" }),
    serviceId: text("service_id")
      .notNull()
      .references(() => services.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.practitionerId, table.serviceId] }),
  ],
);

export const availabilityRules = pgTable(
  "availability_rules",
  {
    id: text("id").primaryKey(),
    practitionerId: text("practitioner_id")
      .notNull()
      .references(() => practitioners.id, { onDelete: "cascade" }),
    weekday: integer("weekday").notNull(),
    startTime: text("start_time").notNull(),
    endTime: text("end_time").notNull(),
  },
  (table) => [index("availability_practitioner_idx").on(table.practitionerId)],
);

export const timeOff = pgTable(
  "time_off",
  {
    id: text("id").primaryKey(),
    practitionerId: text("practitioner_id")
      .notNull()
      .references(() => practitioners.id, { onDelete: "cascade" }),
    startsAt: timestamp("starts_at", { withTimezone: true, mode: "date" }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true, mode: "date" }).notNull(),
    reason: text("reason").notNull().default(""),
  },
  (table) => [index("time_off_practitioner_idx").on(table.practitionerId)],
);

export const bookings = pgTable(
  "bookings",
  {
    id: text("id").primaryKey(),
    clientId: text("client_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    practitionerId: text("practitioner_id")
      .notNull()
      .references(() => practitioners.id, { onDelete: "restrict" }),
    serviceId: text("service_id")
      .notNull()
      .references(() => services.id, { onDelete: "restrict" }),
    startAt: timestamp("start_at", { withTimezone: true, mode: "date" }).notNull(),
    endAt: timestamp("end_at", { withTimezone: true, mode: "date" }).notNull(),
    status: text("status").notNull(),
    priceCents: integer("price_cents").notNull(),
    clientNote: text("client_note"),
    internalNote: text("internal_note"),
    createdBy: text("created_by").notNull(),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true, mode: "date" }),
    cancelReason: text("cancel_reason"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("bookings_practitioner_start_idx").on(table.practitionerId, table.startAt),
    index("bookings_client_start_idx").on(table.clientId, table.startAt),
    index("bookings_status_idx").on(table.status),
    check(
      "bookings_status_check",
      sql`${table.status} in ('pending', 'confirmed', 'completed', 'cancelled', 'no_show')`,
    ),
  ],
);

export const settings = pgTable("settings", {
  id: text("id").primaryKey().default("singleton"),
  businessName: text("business_name").notNull(),
  timezone: text("timezone").notNull(),
  slotIntervalMin: integer("slot_interval_min").notNull(),
  minLeadHours: integer("min_lead_hours").notNull(),
  maxAdvanceDays: integer("max_advance_days").notNull(),
  cancellationWindowHours: integer("cancellation_window_hours").notNull(),
  autoConfirm: boolean("auto_confirm").notNull().default(true),
  lastDemoResetAt: timestamp("last_demo_reset_at", {
    withTimezone: true,
    mode: "date",
  }),
});

export const userRelations = relations(user, ({ many }) => ({
  bookings: many(bookings),
  sessions: many(session),
  accounts: many(account),
}));

export const practitionerRelations = relations(practitioners, ({ many }) => ({
  services: many(practitionerServices),
  rules: many(availabilityRules),
  timeOff: many(timeOff),
  bookings: many(bookings),
}));

export const serviceRelations = relations(services, ({ many }) => ({
  practitioners: many(practitionerServices),
  bookings: many(bookings),
}));

export const practitionerServiceRelations = relations(practitionerServices, ({ one }) => ({
  practitioner: one(practitioners, {
    fields: [practitionerServices.practitionerId],
    references: [practitioners.id],
  }),
  service: one(services, {
    fields: [practitionerServices.serviceId],
    references: [services.id],
  }),
}));

export const bookingRelations = relations(bookings, ({ one }) => ({
  client: one(user, { fields: [bookings.clientId], references: [user.id] }),
  practitioner: one(practitioners, {
    fields: [bookings.practitionerId],
    references: [practitioners.id],
  }),
  service: one(services, { fields: [bookings.serviceId], references: [services.id] }),
}));

export const authSchema = { user, session, account, verification };
