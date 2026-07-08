// ============================================================
// Governance schema: documents, decisions, votes, action items,
// and persistent audit log for compliance & federation records.
// ============================================================
import { sql } from "drizzle-orm";
import {
  pgTable,
  varchar,
  text,
  timestamp,
  jsonb,
  unique,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./schema";

// DOCUMENTS — constitution, policies, minutes, financial records
export const documents = pgTable(
  "documents",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    title: varchar("title").notNull(),
    category: varchar("category", {
      enum: ["constitution", "policy", "minutes", "financial", "correspondence", "other"],
    }).notNull(),
    description: text("description"),
    fileName: varchar("file_name").notNull(),
    originalName: varchar("original_name").notNull(),
    mimeType: varchar("mime_type").notNull(),
    fileSize: integer("file_size").notNull(),
    roomId: varchar("room_id"), // optional: link document to a chat room
    uploadedBy: varchar("uploaded_by").notNull().references(() => users.id),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [index("idx_documents_category").on(table.category), index("idx_documents_room").on(table.roomId)],
);

// DECISIONS — formal motions with voting & recorded outcomes
export const decisions = pgTable(
  "decisions",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    title: varchar("title").notNull(),
    motion: text("motion").notNull(), // the formal text being decided on
    context: text("context"), // background / discussion notes
    roomId: varchar("room_id"), // optional: link decision to a discussion room
    eventId: varchar("event_id"), // optional: link to a calendar event
    voteType: varchar("vote_type", { enum: ["open", "anonymous"] }).notNull().default("open"),
    quorum: integer("quorum"), // minimum votes required to close
    closesAt: timestamp("closes_at"), // voting deadline
    proposedBy: varchar("proposed_by").notNull().references(() => users.id),
    status: varchar("status", { enum: ["draft", "open", "passed", "rejected", "withdrawn"] })
      .notNull()
      .default("open"),
    decidedAt: timestamp("decided_at"), // when voting was closed
    outcomeNotes: text("outcome_notes"), // notes on the outcome / rationale
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_decisions_status").on(table.status),
    index("idx_decisions_room").on(table.roomId),
  ],
);

// DECISION VOTES — individual member votes (stores userId to prevent double voting)
export const decisionVotes = pgTable(
  "decision_votes",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    decisionId: varchar("decision_id").notNull().references(() => decisions.id, { onDelete: "cascade" }),
    userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    choice: varchar("choice", { enum: ["for", "against", "abstain"] }).notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [unique("unique_decision_vote").on(table.decisionId, table.userId)],
);

// ACTION ITEMS — tasks created from or linked to decisions / events
export const actionItems = pgTable(
  "action_items",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    title: varchar("title").notNull(),
    details: text("details"),
    decisionId: varchar("decision_id").references(() => decisions.id, { onDelete: "set null" }),
    eventId: varchar("event_id"),
    assignedTo: varchar("assigned_to").references(() => users.id, { onDelete: "set null" }),
    dueDate: timestamp("due_date"),
    status: varchar("status", { enum: ["open", "in_progress", "done", "cancelled"] })
      .notNull()
      .default("open"),
    createdBy: varchar("created_by").notNull().references(() => users.id),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [index("idx_action_items_status").on(table.status)],
);

// AUDIT LOG — persistent record of all admin mutations for compliance
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
    action: varchar("action").notNull(), // LOGIN_SUCCESS, LOGIN_FAILED, DOCUMENT_UPLOADED, DECISION_PROPOSED, etc.
    resourceType: varchar("resource_type"), // "user", "document", "decision", etc.
    resourceId: varchar("resource_id"),
    details: jsonb("details"), // arbitrary metadata
    ipAddress: varchar("ip_address"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("idx_audit_logs_action").on(table.action),
    index("idx_audit_logs_user").on(table.userId),
    index("idx_audit_logs_created").on(table.createdAt),
  ],
);

// ---- Relations ----
export const documentsRelations = relations(documents, ({ one }) => ({
  uploadedBy: one(users, { fields: [documents.uploadedBy], references: [users.id] }),
}));

export const decisionsRelations = relations(decisions, ({ one, many }) => ({
  proposedBy: one(users, { fields: [decisions.proposedBy], references: [users.id] }),
  votes: many(decisionVotes),
  actionItems: many(actionItems),
}));

export const decisionVotesRelations = relations(decisionVotes, ({ one }) => ({
  decision: one(decisions, { fields: [decisionVotes.decisionId], references: [decisions.id] }),
  user: one(users, { fields: [decisionVotes.userId], references: [users.id] }),
}));

export const actionItemsRelations = relations(actionItems, ({ one }) => ({
  decision: one(decisions, { fields: [actionItems.decisionId], references: [decisions.id] }),
  assignedTo: one(users, { fields: [actionItems.assignedTo], references: [users.id] }),
  createdBy: one(users, { fields: [actionItems.createdBy], references: [users.id] }),
}));

// ---- Schemas ----
export const createDecisionRequestSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  motion: z.string().min(10, "Motion must be at least 10 characters"),
  context: z.string().optional(),
  roomId: z.string().optional(),
  eventId: z.string().optional(),
  voteType: z.enum(["open", "anonymous"]).default("open"),
  quorum: z.number().int().positive().optional(),
  closesAt: z.string().datetime().optional(),
});

export const voteRequestSchema = z.object({
  choice: z.enum(["for", "against", "abstain"]),
});

// ---- Types ----
export type Document = typeof documents.$inferSelect;
export type InsertDocument = typeof documents.$inferInsert;
export type Decision = typeof decisions.$inferSelect;
export type InsertDecision = typeof decisions.$inferInsert;
export type DecisionVote = typeof decisionVotes.$inferSelect;
export type InsertDecisionVote = typeof decisionVotes.$inferInsert;
export type ActionItem = typeof actionItems.$inferSelect;
export type InsertActionItem = typeof actionItems.$inferInsert;
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;
