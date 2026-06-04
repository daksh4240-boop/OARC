import { pgTable, text, serial, numeric, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const fundraisersTable = pgTable("fundraisers", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  goalAmount: numeric("goal_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  raisedAmount: numeric("raised_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  status: text("status").notNull().default("planning"),
  startDate: date("start_date", { mode: "string" }),
  endDate: date("end_date", { mode: "string" }),
});

export const insertFundraiserSchema = createInsertSchema(fundraisersTable).omit({ id: true });
export type InsertFundraiser = z.infer<typeof insertFundraiserSchema>;
export type Fundraiser = typeof fundraisersTable.$inferSelect;
