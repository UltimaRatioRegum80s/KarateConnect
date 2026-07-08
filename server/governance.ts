// ============================================================
// Governance routes: document library, decision register with
// open/anonymous voting, room context panel, persistent audit log.
// Register in routes.ts:  registerGovernanceRoutes(app, upload);
// (pass the existing multer `upload` instance)
// ============================================================
import type { Express, Request, Response } from "express";
import type { Multer } from "multer";
import path from "path";
import fs from "fs/promises";
import { and, desc, eq, gte, sql as dsql } from "drizzle-orm";
import { db } from "./db";
import {
  documents,
  decisions,
  decisionVotes,
  actionItems,
  auditLogs,
  users,
  calendarEvents,
} from "@shared/schema";
import { isAuthenticated, requireAdmin, audit } from "./auth";
import { createDecisionRequestSchema, voteRequestSchema } from "@shared/governance-schema";

// ---- helpers -------------------------------------------------
type Tally = { for: number; against: number; abstain: number; total: number };

async function tallyVotes(decisionId: string): Promise<Tally> {
  const rows = await db
    .select({ choice: decisionVotes.choice, n: dsql<number>`count(*)::int` })
    .from(decisionVotes)
    .where(eq(decisionVotes.decisionId, decisionId))
    .groupBy(decisionVotes.choice);
  const t: Tally = { for: 0, against: 0, abstain: 0, total: 0 };
  for (const r of rows) {
    t[r.choice as keyof Omit<Tally, "total">] = r.n;
    t.total += r.n;
  }
  return t;
}

async function decisionPayload(decisionId: string, currentUserId: string) {
  const [d] = await db.select().from(decisions).where(eq(decisions.id, decisionId));
  if (!d) return null;
  const tally = await tallyVotes(d.id);
  const [proposer] = await db.select({ name: users.name }).from(users).where(eq(users.id, d.proposedBy));
  const [myVote] = await db
    .select({ choice: decisionVotes.choice })
    .from(decisionVotes)
    .where(and(eq(decisionVotes.decisionId, d.id), eq(decisionVotes.userId, currentUserId)));

  // Open votes expose voter names; anonymous votes expose ONLY aggregates.
  let voters: { name: string; choice: string }[] | undefined;
  if (d.voteType === "open") {
    voters = await db
      .select({ name: users.name, choice: decisionVotes.choice })
      .from(decisionVotes)
      .innerJoin(users, eq(users.id, decisionVotes.userId))
      .where(eq(decisionVotes.decisionId, d.id));
  }
  return { ...d, proposerName: proposer?.name ?? "Unknown", tally, myVote: myVote?.choice ?? null, voters };
}

export function registerGovernanceRoutes(app: Express, upload: Multer) {
  // ==========================================================
  // DOCUMENT LIBRARY
  // ==========================================================
  app.get("/api/documents", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { category, roomId } = req.query as { category?: string; roomId?: string };
      const conditions = [];
      if (category) conditions.push(eq(documents.category, category as any));
      if (roomId) conditions.push(eq(documents.roomId, roomId));
      const docs = await db
        .select()
        .from(documents)
        .where(conditions.length ? and(...conditions) : undefined)
        .orderBy(desc(documents.createdAt));
      res.json(docs);
    } catch {
      res.status(500).json({ message: "Failed to fetch documents" });
    }
  });

  app.post(
    "/api/documents",
    isAuthenticated,
    requireAdmin,
    upload.single("file"),
    async (req: any, res: Response) => {
      try {
        if (!req.file) return res.status(400).json({ message: "No file uploaded" });
        const { title, category, description, roomId } = req.body;
        if (!title || !category) return res.status(400).json({ message: "Title and category are required" });

        const [doc] = await db
          .insert(documents)
          .values({
            title: String(title),
            category,
            description: description || null,
            fileName: req.file.filename,
            originalName: req.file.originalname,
            mimeType: req.file.mimetype,
            fileSize: req.file.size,
            roomId: roomId || null,
            uploadedBy: req.currentUser.id,
          })
          .returning();
        await audit(req, "DOCUMENT_UPLOADED", "document", doc.id, { title: doc.title, category: doc.category });
        res.status(201).json(doc);
      } catch {
        res.status(500).json({ message: "Failed to upload document" });
      }
    },
  );

  app.get("/api/documents/:id/download", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const [doc] = await db.select().from(documents).where(eq(documents.id, req.params.id));
      if (!doc) return res.status(404).json({ message: "Document not found" });
      const filePath = path.join(process.cwd(), "uploads", doc.fileName);
      await fs.access(filePath);
      res.setHeader("Content-Type", doc.mimeType);
      res.setHeader("Content-Disposition", `attachment; filename="${doc.originalName.replace(/"/g, "")}"`);
      res.sendFile(filePath);
    } catch {
      res.status(404).json({ message: "File not found" });
    }
  });

  app.delete("/api/documents/:id", isAuthenticated, requireAdmin, async (req: any, res: Response) => {
    try {
      const [doc] = await db.delete(documents).where(eq(documents.id, req.params.id)).returning();
      if (!doc) return res.status(404).json({ message: "Document not found" });
      await fs.unlink(path.join(process.cwd(), "uploads", doc.fileName)).catch(() => {});
      await audit(req, "DOCUMENT_DELETED", "document", doc.id, { title: doc.title });
      res.json({ message: "Document deleted" });
    } catch {
      res.status(500).json({ message: "Failed to delete document" });
    }
  });

  // ==========================================================
  // DECISION REGISTER
  // ==========================================================
  app.get("/api/decisions", isAuthenticated, async (req: any, res: Response) => {
    try {
      const { status, roomId } = req.query as { status?: string; roomId?: string };
      const conditions = [];
      if (status) conditions.push(eq(decisions.status, status as any));
      if (roomId) conditions.push(eq(decisions.roomId, roomId));
      const rows = await db
        .select()
        .from(decisions)
        .where(conditions.length ? and(...conditions) : undefined)
        .orderBy(desc(decisions.createdAt));
      const payloads = await Promise.all(rows.map((d) => decisionPayload(d.id, req.currentUser.id)));
      res.json(payloads.filter(Boolean));
    } catch {
      res.status(500).json({ message: "Failed to fetch decisions" });
    }
  });

  app.get("/api/decisions/:id", isAuthenticated, async (req: any, res: Response) => {
    const payload = await decisionPayload(req.params.id, req.currentUser.id);
    if (!payload) return res.status(404).json({ message: "Decision not found" });
    res.json(payload);
  });

  app.post("/api/decisions", isAuthenticated, async (req: any, res: Response) => {
    try {
      const parsed = createDecisionRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid decision", errors: parsed.error.flatten() });
      }
      const d = parsed.data;
      const [decision] = await db
        .insert(decisions)
        .values({
          title: d.title,
          motion: d.motion,
          context: d.context ?? null,
          roomId: d.roomId ?? null,
          eventId: d.eventId ?? null,
          voteType: d.voteType,
          quorum: d.quorum ?? null,
          closesAt: d.closesAt ? new Date(d.closesAt) : null,
          proposedBy: req.currentUser.id,
          status: "open",
        })
        .returning();
      await audit(req, "DECISION_PROPOSED", "decision", decision.id, { title: decision.title });
      res.status(201).json(await decisionPayload(decision.id, req.currentUser.id));
    } catch {
      res.status(500).json({ message: "Failed to create decision" });
    }
  });

  app.post("/api/decisions/:id/vote", isAuthenticated, async (req: any, res: Response) => {
    try {
      const parsed = voteRequestSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "Vote must be for, against, or abstain" });

      const [d] = await db.select().from(decisions).where(eq(decisions.id, req.params.id));
      if (!d) return res.status(404).json({ message: "Decision not found" });
      if (d.status !== "open") return res.status(400).json({ message: "Voting is closed on this decision" });
      if (d.closesAt && d.closesAt < new Date()) {
        return res.status(400).json({ message: "The voting deadline has passed" });
      }

      // Upsert: a member may change their vote while voting is open.
      await db
        .insert(decisionVotes)
        .values({ decisionId: d.id, userId: req.currentUser.id, choice: parsed.data.choice })
        .onConflictDoUpdate({
          target: [decisionVotes.decisionId, decisionVotes.userId],
          set: { choice: parsed.data.choice },
        });

      // Audit the act of voting — never the choice — for anonymous votes.
      await audit(req, "DECISION_VOTE_CAST", "decision", d.id,
        d.voteType === "open" ? { choice: parsed.data.choice } : { anonymous: true });

      res.json(await decisionPayload(d.id, req.currentUser.id));
    } catch {
      res.status(500).json({ message: "Failed to record vote" });
    }
  });

  // Close a decision and record the outcome (proposer or admin).
  app.post("/api/decisions/:id/close", isAuthenticated, async (req: any, res: Response) => {
    try {
      const [d] = await db.select().from(decisions).where(eq(decisions.id, req.params.id));
      if (!d) return res.status(404).json({ message: "Decision not found" });
      const isPrivileged = ["admin", "president"].includes(req.currentUser.role) || d.proposedBy === req.currentUser.id;
      if (!isPrivileged) return res.status(403).json({ message: "Only the proposer or an admin can close a decision" });
      if (d.status !== "open") return res.status(400).json({ message: "Decision is not open" });

      const tally = await tallyVotes(d.id);
      if (d.quorum && tally.total < d.quorum) {
        return res.status(400).json({ message: `Quorum not met: ${tally.total}/${d.quorum} votes` });
      }

      const { outcomeNotes, status } = req.body ?? {};
      const finalStatus =
        status && ["passed", "rejected", "withdrawn"].includes(status)
          ? status
          : tally.for > tally.against
            ? "passed"
            : "rejected";

      await db
        .update(decisions)
        .set({ status: finalStatus, decidedAt: new Date(), outcomeNotes: outcomeNotes || null, updatedAt: new Date() })
        .where(eq(decisions.id, d.id));

      await audit(req, "DECISION_CLOSED", "decision", d.id, { status: finalStatus, tally });
      res.json(await decisionPayload(d.id, req.currentUser.id));
    } catch {
      res.status(500).json({ message: "Failed to close decision" });
    }
  });

  // ==========================================================
  // ROOM CONTEXT PANEL — documents + open decisions + countdowns
  // ==========================================================
  app.get("/api/rooms/:roomId/context", isAuthenticated, async (req: any, res: Response) => {
    try {
      const { roomId } = req.params;
      const [docs, openDecisions, events, constitution] = await Promise.all([
        db.select().from(documents).where(eq(documents.roomId, roomId)).orderBy(desc(documents.createdAt)).limit(10),
        db.select().from(decisions)
          .where(and(eq(decisions.roomId, roomId), eq(decisions.status, "open")))
          .orderBy(desc(decisions.createdAt)),
        db.select().from(calendarEvents)
          .where(gte(calendarEvents.startDate, new Date()))
          .orderBy(calendarEvents.startDate)
          .limit(5),
        db.select().from(documents).where(eq(documents.category, "constitution")).limit(3),
      ]);
      const openWithTallies = await Promise.all(
        openDecisions.map((d) => decisionPayload(d.id, req.currentUser.id)),
      );
      res.json({ documents: docs, constitution, openDecisions: openWithTallies.filter(Boolean), upcomingEvents: events });
    } catch {
      res.status(500).json({ message: "Failed to load room context" });
    }
  });

  // ==========================================================
  // ACTION ITEMS
  // ==========================================================
  app.get("/api/action-items", isAuthenticated, async (_req: Request, res: Response) => {
    try {
      const items = await db.select().from(actionItems).orderBy(desc(actionItems.createdAt));
      res.json(items);
    } catch {
      res.status(500).json({ message: "Failed to fetch action items" });
    }
  });

  app.post("/api/action-items", isAuthenticated, async (req: any, res: Response) => {
    try {
      const { title, details, decisionId, eventId, assignedTo, dueDate } = req.body ?? {};
      if (!title) return res.status(400).json({ message: "Title is required" });
      const [item] = await db
        .insert(actionItems)
        .values({
          title: String(title),
          details: details || null,
          decisionId: decisionId || null,
          eventId: eventId || null,
          assignedTo: assignedTo || null,
          dueDate: dueDate ? new Date(dueDate) : null,
          createdBy: req.currentUser.id,
        })
        .returning();
      await audit(req, "ACTION_ITEM_CREATED", "action_item", item.id, { title: item.title });
      res.status(201).json(item);
    } catch {
      res.status(500).json({ message: "Failed to create action item" });
    }
  });

  app.patch("/api/action-items/:id", isAuthenticated, async (req: any, res: Response) => {
    try {
      const { status } = req.body ?? {};
      if (!["open", "in_progress", "done", "cancelled"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      const [item] = await db
        .update(actionItems)
        .set({ status, updatedAt: new Date() })
        .where(eq(actionItems.id, req.params.id))
        .returning();
      if (!item) return res.status(404).json({ message: "Not found" });
      res.json(item);
    } catch {
      res.status(500).json({ message: "Failed to update action item" });
    }
  });

  // ==========================================================
  // AUDIT LOG (real, admin-only)
  // ==========================================================
  app.get("/api/admin/audit-log", isAuthenticated, requireAdmin, async (req: Request, res: Response) => {
    try {
      const limit = Math.min(parseInt(String(req.query.limit ?? "50"), 10) || 50, 200);
      const entries = await db
        .select({
          id: auditLogs.id,
          action: auditLogs.action,
          resourceType: auditLogs.resourceType,
          resourceId: auditLogs.resourceId,
          details: auditLogs.details,
          ipAddress: auditLogs.ipAddress,
          createdAt: auditLogs.createdAt,
          userName: users.name,
        })
        .from(auditLogs)
        .leftJoin(users, eq(users.id, auditLogs.userId))
        .orderBy(desc(auditLogs.createdAt))
        .limit(limit);
      res.json({ entries, total: entries.length });
    } catch {
      res.status(500).json({ message: "Failed to fetch audit log" });
    }
  });
}
