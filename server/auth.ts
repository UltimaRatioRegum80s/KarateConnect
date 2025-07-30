import type { Express, RequestHandler } from "express";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";
import { loginSchema } from "@shared/schema";

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET || "nkf-exco-portal-secret-key-2025",
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false, // Set to true in production with HTTPS
      maxAge: sessionTtl,
      sameSite: "lax",
    },
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());

  // Login endpoint
  app.post("/api/login", async (req, res) => {
    try {
      const { name, pin } = loginSchema.parse(req.body);
      
      // Find user by name and pin
      const user = await storage.getUserByCredentials(name, pin);
      
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      if (!user.is_active) {
        return res.status(401).json({ message: "Account is inactive" });
      }

      // Store user in session
      (req.session as any).userId = user.id;
      (req.session as any).user = user;
      
      res.json({ user });
    } catch (error) {
      console.error("Login error:", error);
      res.status(400).json({ message: "Invalid login data" });
    }
  });

  // Logout endpoint
  app.post("/api/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ message: "Failed to logout" });
      }
      res.clearCookie("connect.sid");
      res.json({ message: "Logged out successfully" });
    });
  });

  // Get current user endpoint
  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const session = req.session as any;
  
  if (!session?.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // Verify user still exists and is active
  try {
    const user = await storage.getUser(session.userId);
    if (!user || !user.is_active) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    // Update session with latest user data
    session.user = user;
    next();
  } catch (error) {
    console.error("Auth verification error:", error);
    res.status(401).json({ message: "Unauthorized" });
  }
};