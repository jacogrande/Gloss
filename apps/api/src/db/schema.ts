import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const profilesTable = pgTable("profiles", {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  userId: text("user_id").primaryKey(),
});

export type ProfileRow = typeof profilesTable.$inferSelect;
