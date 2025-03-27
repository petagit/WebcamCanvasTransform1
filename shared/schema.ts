import { pgTable, text, serial, integer, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Define enums
export const authProviderEnum = pgEnum('auth_provider', ['local', 'google', 'github']);
export const subscriptionStatusEnum = pgEnum('subscription_status', ['free', 'active', 'cancelled', 'expired']);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").unique(),
  password: text("password"),
  authProvider: authProviderEnum("auth_provider").default('local').notNull(),
  providerId: text("provider_id"),
  profilePicture: text("profile_picture"),
  credits: integer("credits").default(5).notNull(), // Users start with 5 free credits
  stripeCustomerId: text("stripe_customer_id"),
  lastCamUseTimestamp: timestamp("last_cam_use_timestamp"), // To track the 10-second free limit
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastLogin: timestamp("last_login"),
});

export const capturedMedia = pgTable("captured_media", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  mediaType: text("media_type").notNull(), // 'image' or 'video'
  mediaUrl: text("media_url").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  status: subscriptionStatusEnum("status").default('free').notNull(),
  currentPeriodStart: timestamp("current_period_start"),
  currentPeriodEnd: timestamp("current_period_end"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  expires: timestamp("expires").notNull(),
  data: text("data"),
});

// Define a transaction type enum
export const transactionTypeEnum = pgEnum('transaction_type', ['purchase', 'usage']);

// Create a transactions table to track credit purchases and usage
export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  type: transactionTypeEnum("transaction_type").notNull(),
  amount: integer("amount").notNull(), // Positive for purchases, negative for usage
  description: text("description").notNull(),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  email: true,
  password: true,
  authProvider: true,
  providerId: true,
  profilePicture: true,
  credits: true,
  stripeCustomerId: true,
});

export const insertCapturedMediaSchema = createInsertSchema(capturedMedia).pick({
  userId: true,
  mediaType: true,
  mediaUrl: true,
});

export const insertSubscriptionSchema = createInsertSchema(subscriptions).pick({
  userId: true,
  stripeCustomerId: true,
  stripeSubscriptionId: true,
  status: true,
  currentPeriodStart: true,
  currentPeriodEnd: true,
});

export const insertTransactionSchema = createInsertSchema(transactions).pick({
  userId: true,
  type: true,
  amount: true,
  description: true,
  stripePaymentIntentId: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertCapturedMedia = z.infer<typeof insertCapturedMediaSchema>;
export type CapturedMedia = typeof capturedMedia.$inferSelect;

export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
export type Subscription = typeof subscriptions.$inferSelect;

export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactions.$inferSelect;

export type Session = typeof sessions.$inferSelect;
