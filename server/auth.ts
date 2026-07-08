// ============================================================
// Replacement for server/auth.ts + server/simpleAuth.ts
// - bcrypt-hashed PINs (no plaintext anywhere)
// - PostgreSQL-backed sessions (survives restarts)
// - login rate limiting (brute-force protection)
// - DB-verified isAuthenticated + requireAdmin middleware
// - NO hardcoded users, NO credential logging
//
// Requires: npm i bcryptjs && npm i -D @types/bcryptjs
// Requires env: SESSION_SECRET (mandatory in production)
// ============================================================
import type { Express, Request, Response, NextFunction, RequestHandler } from "express";
import session from "express-session";
import connectPg from "connect-pg-simple";
import bcrypt from "bcryptjs";
import { eq, sql as dsql } from "drizzle-orm";
import { db } from "./db";
import { users, loginSchema, auditLogs } from "@shared/schema";

const IS_PROD = process.env.NODE_ENV === "production";

// ---- Session -------------------------------------------------
export function getSession() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    if (IS_PROD) throw new Error("SESSION_SECRET must be set in production");
    console.warn("[auth] SESSION_SECRET not set — using a random dev-only secret");
  }
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const PgStore = connectPg(session);
  return session({
    secret: secret || `dev-${Math.random().toString(36).slice(2)}`,
    store: new PgStore({
      conString: process.env.DATABASE_URL,
      createTableIfMissing: true,
      ttl: sessionTtl,
      tableName: "sessions",
    }),
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: IS_PROD, // requires HTTPS in production
      maxAge: sessionTtl,
      sameSite: "lax",
    },
  });
}

// ---- Simple in-memory login rate limiter --------------------
// 5 failed attempts per name+IP -> locked for 15 minutes.
const attempts = new Map<string, { count: number; lockedUntil: number }>();
const MAX_ATTEMPTS = 5;
const LOCK_MS = 15 * 60 * 1000;

function rateLimitKey(req: Request, name: string) {
  return `${req.ip}|${name.toLowerCase()}`;
}

function isLocked(key: string): boolean {
  const a = attempts.get(key);
  return !!a && a.lockedUntil > Date.now();
}

function recordFailure(key: string) {
  const a = attempts.get(key) ?? { count: 0, lockedUntil: 0 };
  a.count += 1;
  if (a.count >= MAX_ATTEMPTS) {
    a.lockedUntil = Date.now() + LOCK_MS;
    a.count = 0;
  }
  attempts.set(key, a);
}

// ---- PIN helpers ---------------------------------------------
export async function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, 12);
}

export async function verifyPin(pin: string, pinHash: string): Promise<boolean> {
  // Tolerate legacy plaintext rows during migration: if the stored
  // value is not a bcrypt hash, compare directly ONCE and expect
  // the seed/migration script to re-hash. Remove after migration.
  if (!pinHash.startsWith("$2")) return pin === pinHash;
  return bcrypt.compare(pin, pinHash);
}

// ---- Audit helper --------------------------------------------
export async function audit(
  req: Request,
  action: string,
  resourceType?: string,
  resourceId?: string,
  details?: unknown,
) {
  try {
    await db.insert(auditLogs).values({
      userId: (req.session as any)?.userId ?? null,
      action,
      resourceType: resourceType ?? null,
      resourceId: resourceId ?? null,
      details: details ? JSON.parse(JSON.stringify(details)) : null,
      ipAddress: req.ip ?? null,
    });
  } catch (err) {
    console.error("[audit] failed to write audit log:", err);
  }
}

// ---- Routes --------------------------------------------------
export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { name, pin } = loginSchema.parse(req.body);
      const key = rateLimitKey(req, name);

      if (isLocked(key)) {
        return res.status(429).json({ message: "Too many attempts. Try again in 15 minutes." });
      }

      const [user] = await db
        .select()
        .from(users)
        .where(dsql`lower(${users.name}) = ${name.toLowerCase()}`);

      const ok = user && user.is_active && (await verifyPin(pin, user.pin));
      if (!ok) {
        recordFailure(key);
        await audit(req, "LOGIN_FAILED", "user", undefined, { name });
        return res.status(401).json({ message: "Invalid credentials" });
      }

      attempts.delete(key);
      (req.session as any).userId = user.id;
      await audit(req, "LOGIN_SUCCESS", "user", user.id);

      res.json({ id: user.id, name: user.name, position: user.title, role: user.role });
    } catch {
      res.status(400).json({ message: "Invalid login data" });
    }
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) return res.status(500).json({ message: "Logout failed" });
      res.clearCookie("connect.sid");
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/auth/user", isAuthenticated, async (req: any, res: Response) => {
    const user = req.currentUser;
    res.json({ id: user.id, name: user.name, position: user.title, role: user.role });
  });

  // Member changes their own PIN
  app.post("/api/auth/change-pin", isAuthenticated, async (req: any, res: Response) => {
    try {
      const { currentPin, newPin } = req.body ?? {};
      if (typeof newPin !== "string" || newPin.length < 6) {
        return res.status(400).json({ message: "New PIN must be at least 6 characters" });
      }
      const user = req.currentUser;
      if (!(await verifyPin(String(currentPin ?? ""), user.pin))) {
        return res.status(401).json({ message: "Current PIN is incorrect" });
      }
      await db.update(users).set({ pin: await hashPin(newPin), updatedAt: new Date() }).where(eq(users.id, user.id));
      await audit(req, "PIN_CHANGED", "user", user.id);
      res.json({ message: "PIN updated" });
    } catch {
      res.status(500).json({ message: "Failed to change PIN" });
    }
  });
}

// ---- Middleware ----------------------------------------------
// Verifies the session AND that the user still exists / is active.
export const isAuthenticated: RequestHandler = async (req: any, res, next) => {
  const userId = (req.session as any)?.userId;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });
  try {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user || !user.is_active) return res.status(401).json({ message: "Unauthorized" });
    req.currentUser = user; // fresh, DB-verified — never trust a session snapshot
    next();
  } catch {
    res.status(401).json({ message: "Unauthorized" });
  }
};

// Admin gate — always chained AFTER isAuthenticated.
export const requireAdmin: RequestHandler = (req: any, res, next) => {
  const role = req.currentUser?.role;
  if (role === "admin" || role === "president") return next();
  return res.status(403).json({ message: "Admin access required" });
};
