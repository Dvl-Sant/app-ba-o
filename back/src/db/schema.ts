import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const userRole = pgEnum("user_role", ["admin", "local", "visitante"]);
export const banoStatus = pgEnum("bano_status", ["free", "occupied"]);
export const queueStatus = pgEnum("queue_status", ["waiting", "notified", "served", "skipped"]);
export const usageReason = pgEnum("usage_reason", ["normal", "forced", "expired"]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  username: varchar("username", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  role: userRole("role").default("visitante").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const bathroomState = pgTable("bathroom_state", {
  id: integer("id").primaryKey().default(1),
  status: banoStatus("status").default("free").notNull(),
  lockedByUserId: uuid("locked_by_user_id").references(() => users.id, { onDelete: "set null" }),
  lockedAt: timestamp("locked_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  extraMinutesUsed: integer("extra_minutes_used").default(0).notNull(),
  currentNotifiedUserId: uuid("current_notified_user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  notifiedAt: timestamp("notified_at", { withTimezone: true }),
  panic: boolean("panic").default(false).notNull(),
});

export const queueEntries = pgTable("queue_entries", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow().notNull(),
  status: queueStatus("status").default("waiting").notNull(),
  notifiedAt: timestamp("notified_at", { withTimezone: true }),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type BathroomStateRow = typeof bathroomState.$inferSelect;
export type QueueEntry = typeof queueEntries.$inferSelect;

export const usageLog = pgTable("usage_log", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  userName: varchar("user_name", { length: 100 }).notNull(),
  lockedAt: timestamp("locked_at", { withTimezone: true }).notNull(),
  unlockedAt: timestamp("unlocked_at", { withTimezone: true }).notNull(),
  durationMs: integer("duration_ms").notNull(),
  extraMinutesUsed: integer("extra_minutes_used").default(0).notNull(),
  reason: usageReason("reason").default("normal").notNull(),
});

export type UsageReason = "normal" | "forced" | "expired";
export type UsageLogRow = typeof usageLog.$inferSelect;

export const chatMessages = pgTable("chat_messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  userName: varchar("user_name", { length: 100 }).notNull(),
  body: varchar("body", { length: 500 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type ChatMessageRow = typeof chatMessages.$inferSelect;
