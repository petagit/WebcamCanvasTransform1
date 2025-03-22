import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const capturedMedia = pgTable("captured_media", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  mediaType: text("media_type").notNull(), // 'image' or 'video'
  mediaUrl: text("media_url").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertCapturedMediaSchema = createInsertSchema(capturedMedia).pick({
  userId: true,
  mediaType: true,
  mediaUrl: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertCapturedMedia = z.infer<typeof insertCapturedMediaSchema>;
export type CapturedMedia = typeof capturedMedia.$inferSelect;
