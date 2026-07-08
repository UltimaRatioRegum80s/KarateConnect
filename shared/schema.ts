import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  boolean,
  unique,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  pin: varchar("pin").notNull(),
  role: varchar("role").default("member"), // member, admin, president
  title: varchar("title"), // President, Vice President, etc.
  is_active: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const chatRooms = pgTable("chat_rooms", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  description: text("description"),
  is_active: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  roomId: varchar("room_id").notNull().references(() => chatRooms.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  type: varchar("type", { enum: ["text", "voice", "image", "document", "poll"] }).notNull().default("text"),
  fileName: varchar("file_name"),
  fileSize: integer("file_size"),
  mimeType: varchar("mime_type"),
  duration: integer("duration"), // for voice notes in seconds
  createdAt: timestamp("created_at").defaultNow(),
});

// Table to track last read message per user per room
export const userRoomReadStatus = pgTable("user_room_read_status", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  roomId: varchar("room_id").notNull().references(() => chatRooms.id, { onDelete: "cascade" }),
  lastReadMessageId: varchar("last_read_message_id").references(() => messages.id, { onDelete: "set null" }),
  lastReadAt: timestamp("last_read_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userRoomUnique: unique("user_room_unique").on(table.userId, table.roomId),
}));

export const polls = pgTable("polls", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  messageId: varchar("message_id").notNull().references(() => messages.id, { onDelete: "cascade" }),
  question: text("question").notNull(),
  allowMultiple: boolean("allow_multiple").default(false),
  is_active: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const pollOptions = pgTable("poll_options", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  pollId: varchar("poll_id").notNull().references(() => polls.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  orderIndex: integer("order_index").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const pollVotes = pgTable("poll_votes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  pollId: varchar("poll_id").notNull().references(() => polls.id, { onDelete: "cascade" }),
  optionId: varchar("option_id").notNull().references(() => pollOptions.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const roomMembers = pgTable("room_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  roomId: varchar("room_id").notNull().references(() => chatRooms.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  joinedAt: timestamp("joined_at").defaultNow(),
});

// Bank statements table - only for site admins
export const bankStatements = pgTable("bank_statements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fileName: varchar("file_name").notNull(),
  originalName: varchar("original_name").notNull(),
  fileSize: integer("file_size").notNull(),
  mimeType: varchar("mime_type").notNull(),
  uploadedBy: varchar("uploaded_by").notNull().references(() => users.id),
  bankName: varchar("bank_name"),
  accountNumber: varchar("account_number"),
  statementPeriod: varchar("statement_period"), // e.g., "2025-01"
  totalIncome: varchar("total_income"), // stored as string for precision
  totalExpenses: varchar("total_expenses"), // stored as string for precision
  netAmount: varchar("net_amount"), // stored as string for precision
  transactionCount: integer("transaction_count").default(0),
  isProcessed: boolean("is_processed").default(false),
  status: varchar("status").default("processing"), // "processing", "processed", "failed"
  processingNotes: text("processing_notes"),
  analysis: jsonb("analysis"), // Store analysis data as JSON
  uploadedAt: timestamp("uploaded_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Bank statement transactions extracted from uploaded statements
export const bankTransactions = pgTable("bank_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  statementId: varchar("statement_id").notNull().references(() => bankStatements.id, { onDelete: "cascade" }),
  transactionDate: timestamp("transaction_date").notNull(),
  description: text("description").notNull(),
  amount: varchar("amount").notNull(), // stored as string for precision
  type: varchar("type", { enum: ["credit", "debit"] }).notNull(),
  balance: varchar("balance"), // running balance if provided
  category: varchar("category"), // auto-categorized or manually set
  reference: varchar("reference"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Calendar events table
export const calendarEvents = pgTable("calendar_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title").notNull(),
  description: varchar("description"),
  eventType: varchar("event_type").notNull(), // "competition", "training", "meeting", "deadline"
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  location: varchar("location"),
  isAllDay: varchar("is_all_day").default("false"),
  source: varchar("source").default("manual"), // "manual", "document"
  documentName: varchar("document_name"), // Name of uploaded document
  createdBy: varchar("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Calendar documents table for PDF/Word uploads
export const calendarDocuments = pgTable("calendar_documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fileName: varchar("file_name").notNull(),
  originalName: varchar("original_name").notNull(),
  fileSize: varchar("file_size").notNull(),
  mimeType: varchar("mime_type").notNull(),
  status: varchar("status").notNull().default("processing"), // "processing", "processed", "failed"
  extractedEventsCount: varchar("extracted_events_count").default("0"),
  processingNotes: varchar("processing_notes"),
  uploadedBy: varchar("uploaded_by").notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
  processedAt: timestamp("processed_at"),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  messages: many(messages),
  roomMemberships: many(roomMembers),
}));

export const chatRoomsRelations = relations(chatRooms, ({ many }) => ({
  messages: many(messages),
  members: many(roomMembers),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  room: one(chatRooms, {
    fields: [messages.roomId],
    references: [chatRooms.id],
  }),
  user: one(users, {
    fields: [messages.userId],
    references: [users.id],
  }),
}));

export const userRoomReadStatusRelations = relations(userRoomReadStatus, ({ one }) => ({
  user: one(users, {
    fields: [userRoomReadStatus.userId],
    references: [users.id],
  }),
  room: one(chatRooms, {
    fields: [userRoomReadStatus.roomId],
    references: [chatRooms.id],
  }),
  lastReadMessage: one(messages, {
    fields: [userRoomReadStatus.lastReadMessageId],
    references: [messages.id],
  }),
}));

export const roomMembersRelations = relations(roomMembers, ({ one }) => ({
  room: one(chatRooms, {
    fields: [roomMembers.roomId],
    references: [chatRooms.id],
  }),
  user: one(users, {
    fields: [roomMembers.userId],
    references: [users.id],
  }),
}));

export const pollsRelations = relations(polls, ({ one, many }) => ({
  message: one(messages, {
    fields: [polls.messageId],
    references: [messages.id],
  }),
  options: many(pollOptions),
  votes: many(pollVotes),
}));

export const pollOptionsRelations = relations(pollOptions, ({ one, many }) => ({
  poll: one(polls, {
    fields: [pollOptions.pollId],
    references: [polls.id],
  }),
  votes: many(pollVotes),
}));

export const pollVotesRelations = relations(pollVotes, ({ one }) => ({
  poll: one(polls, {
    fields: [pollVotes.pollId],
    references: [polls.id],
  }),
  option: one(pollOptions, {
    fields: [pollVotes.optionId],
    references: [pollOptions.id],
  }),
  user: one(users, {
    fields: [pollVotes.userId],
    references: [users.id],
  }),
}));

// Schemas
export const insertChatRoomSchema = createInsertSchema(chatRooms).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPollSchema = createInsertSchema(polls).omit({
  id: true,
  createdAt: true,
});

export const insertPollOptionSchema = createInsertSchema(pollOptions).omit({
  id: true,
  createdAt: true,
});

export const insertPollVoteSchema = createInsertSchema(pollVotes).omit({
  id: true,
  createdAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

export const insertRoomMemberSchema = createInsertSchema(roomMembers).omit({
  id: true,
  joinedAt: true,
});

export const insertCalendarEventSchema = createInsertSchema(calendarEvents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCalendarDocumentSchema = createInsertSchema(calendarDocuments).omit({
  id: true,
  uploadedAt: true,
  processedAt: true,
});

export const insertBankStatementSchema = createInsertSchema(bankStatements).omit({
  id: true,
  uploadedAt: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBankTransactionSchema = createInsertSchema(bankTransactions).omit({
  id: true,
  createdAt: true,
});

// Types for exports
export type BankStatement = typeof bankStatements.$inferSelect;
export type InsertBankStatement = z.infer<typeof insertBankStatementSchema>;
export type BankTransaction = typeof bankTransactions.$inferSelect;
export type InsertBankTransaction = z.infer<typeof insertBankTransactionSchema>;

// Login schema
export const loginSchema = z.object({
  name: z.string().min(1, "Name is required"),
  pin: z.string().min(4, "PIN must be at least 4 digits").max(6, "PIN must be at most 6 digits"),
});

// User schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type CalendarEvent = typeof calendarEvents.$inferSelect;
export type InsertCalendarEvent = typeof calendarEvents.$inferInsert;
export type CalendarDocument = typeof calendarDocuments.$inferSelect;
export type InsertCalendarDocument = typeof calendarDocuments.$inferInsert;

// Projected Expenses linked to calendar events
export const projectedExpenses = pgTable("projected_expenses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").references(() => calendarEvents.id, { onDelete: "set null" }),
  eventTitle: varchar("event_title"), // Store title in case event is deleted
  category: varchar("category").notNull(), // travel, accommodation, registration, equipment, meals, transport, other
  description: varchar("description").notNull(),
  amount: varchar("amount").notNull(), // stored as string for precision
  currency: varchar("currency").default("NAD"),
  expenseDate: timestamp("expense_date").notNull(), // Date of expected expense
  financialYear: varchar("financial_year").notNull(), // e.g., "2026"
  month: integer("month").notNull(), // 1-12
  quarter: varchar("quarter"), // Q1, Q2, Q3, Q4
  createdBy: varchar("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertProjectedExpenseSchema = createInsertSchema(projectedExpenses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type ProjectedExpense = typeof projectedExpenses.$inferSelect;
export type InsertProjectedExpense = z.infer<typeof insertProjectedExpenseSchema>;

// Financial Overview Tables
export const financialEntries = pgTable("financial_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: varchar("type", { enum: ["income", "expense", "balance"] }).notNull(),
  category: varchar("category").notNull(), // e.g., "membership_fees", "tournament_entry", "equipment", "venue_rental"
  description: varchar("description").notNull(),
  amount: varchar("amount").notNull(), // stored as string to handle currency formatting
  currency: varchar("currency").default("NAD"),
  date: timestamp("date").notNull(),
  isProjected: varchar("is_projected", { enum: ["true", "false"] }).default("false"), // projected vs actual
  financialYear: varchar("financial_year").notNull(), // e.g., "2025"
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const financialSummary = pgTable("financial_summary", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  financialYear: varchar("financial_year").notNull().unique(),
  currentBalance: varchar("current_balance").notNull(),
  projectedIncome: varchar("projected_income").notNull(),
  projectedExpenses: varchar("projected_expenses").notNull(),
  actualIncome: varchar("actual_income").default("0"),
  actualExpenses: varchar("actual_expenses").default("0"),
  currency: varchar("currency").default("NAD"),
  lastUpdated: timestamp("last_updated").defaultNow(),
  updatedBy: varchar("updated_by").references(() => users.id),
});

export type FinancialEntry = typeof financialEntries.$inferSelect;
export type InsertFinancialEntry = typeof financialEntries.$inferInsert;
export type FinancialSummary = typeof financialSummary.$inferSelect;
export type InsertFinancialSummary = typeof financialSummary.$inferInsert;
export type ChatRoom = typeof chatRooms.$inferSelect;
export type InsertChatRoom = z.infer<typeof insertChatRoomSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type RoomMember = typeof roomMembers.$inferSelect;
export type InsertRoomMember = z.infer<typeof insertRoomMemberSchema>;
export type LoginRequest = z.infer<typeof loginSchema>;

export type Poll = typeof polls.$inferSelect;
export type InsertPoll = z.infer<typeof insertPollSchema>;
export type PollOption = typeof pollOptions.$inferSelect;
export type InsertPollOption = z.infer<typeof insertPollOptionSchema>;
export type PollVote = typeof pollVotes.$inferSelect;
export type InsertPollVote = z.infer<typeof insertPollVoteSchema>;

// Export governance schema
export * from "./governance-schema";
