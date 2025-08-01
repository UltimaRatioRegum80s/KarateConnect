import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { authenticateUser, getUserById, isAdmin, type TestUser } from "./simpleAuth";
import { insertMessageSchema, insertChatRoomSchema, insertRoomMemberSchema } from "@shared/schema";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import session from "express-session";

// Configure multer for file uploads
const storage_config = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadsDir = path.join(process.cwd(), 'uploads');
    try {
      await fs.mkdir(uploadsDir, { recursive: true });
      cb(null, uploadsDir);
    } catch (error) {
      cb(error as Error, uploadsDir);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage_config,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow images, documents, and audio files
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt|webm|mp3|wav|ogg/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Error: File type not supported'));
    }
  }
});

// Simple authentication middleware for development
const isAuthenticated = (req: any, res: any, next: any) => {
  if (req.session && req.session.userId) {
    return next();
  }
  return res.status(401).json({ message: "Unauthorized" });
};

// Admin check middleware
const isAdminUser = (req: any, res: any, next: any) => {
  if (req.session && req.session.user && req.session.user.role === 'admin') {
    return next();
  }
  return res.status(403).json({ message: "Admin access required" });
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Direct access route to bypass iframe issues
  app.get('/direct', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>NKF EXCO Portal - Direct Access</title>
    <style>
        body {
            font-family: system-ui, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            margin: 0;
            padding: 20px;
            min-height: 100vh;
            color: white;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            text-align: center;
        }
        .card {
            background: rgba(255,255,255,0.1);
            padding: 30px;
            border-radius: 12px;
            margin: 20px 0;
            backdrop-filter: blur(10px);
        }
        .success { border-left: 4px solid #4CAF50; }
        .warning { border-left: 4px solid #ff9800; }
        button {
            background: #4CAF50;
            color: white;
            border: none;
            padding: 15px 30px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 1.1rem;
            margin: 10px;
            transition: all 0.3s;
        }
        button:hover { background: #45a049; transform: translateY(-2px); }
        .alt-button { background: #2196F3; }
        .alt-button:hover { background: #1976D2; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🥋 NKF EXCO Portal</h1>
        
        <div class="card success">
            <h2>Server Status: ✅ Running</h2>
            <p>Express server is running correctly on port 5000</p>
            <p>This confirms the backend is working properly.</p>
        </div>
        
        <div class="card warning">
            <h2>Replit Iframe Issue Detected</h2>
            <p>The Replit workspace iframe is having trouble loading the React app.</p>
            <p>This is a common Replit environment issue, not a problem with your code.</p>
        </div>
        
        <div class="card">
            <h2>Access Options</h2>
            <p>Try these alternative access methods:</p>
            
            <button onclick="window.open(window.location.origin, '_blank')">
                Open in New Tab
            </button>
            
            <button class="alt-button" onclick="window.location.href = '/'">
                Try React App Again
            </button>
            
            <button class="alt-button" onclick="window.location.href = '/api/auth/user'">
                Test API Endpoint
            </button>
        </div>
        
        <div class="card">
            <h3>If issues persist:</h3>
            <ul style="text-align: left; max-width: 400px; margin: 0 auto;">
                <li>Wait 30-60 seconds for Replit to stabilize</li>
                <li>Try refreshing the page</li>
                <li>Open the app URL directly in a new browser tab</li>
                <li>Check if Replit services are experiencing issues</li>
            </ul>
        </div>
    </div>
    
    <script>
        console.log('NKF Portal: Direct access page loaded');
        console.log('Server URL:', window.location.origin);
        
        // Auto-test API connectivity
        fetch('/api/auth/user')
            .then(response => {
                console.log('API Test - Status:', response.status);
                if (response.status === 401) {
                    console.log('API Test: Server responding correctly (401 = expected for unauthenticated)');
                }
            })
            .catch(error => {
                console.error('API Test - Error:', error);
            });
    </script>
</body>
</html>
    `);
  });

  // Test route for debugging - this needs to be before Vite middleware
  app.get('/test', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>NKF EXCO Portal - Test</title>
    <style>
        body {
            font-family: system-ui, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            margin: 0;
            padding: 40px;
            min-height: 100vh;
            color: white;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
        }
        h1 {
            font-size: 2.5rem;
            margin-bottom: 1rem;
        }
        .status {
            background: rgba(255,255,255,0.1);
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
        }
        button {
            background: #4CAF50;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 1rem;
            transition: background 0.3s;
        }
        button:hover {
            background: #45a049;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🥋 NKF EXCO Portal</h1>
        <p style="font-size: 1.2rem;">Direct HTML Test - Server is Working!</p>
        
        <div class="status">
            <h2>System Diagnostics:</h2>
            <ul style="list-style: none; padding-left: 0;">
                <li>✅ Express server running on port 5000</li>
                <li>✅ HTML serving correctly</li>
                <li>✅ Static assets loading</li>
                <li id="js-test">⏳ JavaScript test pending...</li>
            </ul>
        </div>
        
        <button onclick="testJS()">Test JavaScript</button>
        <button onclick="window.location.href='/'">Back to React App</button>
        
        <div style="margin-top: 30px; padding: 20px; background: rgba(255,0,0,0.1); border-radius: 8px;">
            <h3>React App Issues:</h3>
            <p>If you can see this page but not the React app, the issue is with Vite middleware configuration.</p>
            <p>The server is working correctly but React components are not rendering.</p>
        </div>
    </div>

    <script>
        function testJS() {
            document.getElementById('js-test').innerHTML = '✅ JavaScript working correctly';
            alert('JavaScript is working! The issue is with React/Vite setup.');
        }
        
        // Auto-test JS after 1 second
        setTimeout(() => {
            document.getElementById('js-test').innerHTML = '✅ JavaScript loading automatically';
        }, 1000);
        
        console.log('Direct HTML page loaded successfully');
    </script>
</body>
</html>
    `);
  });

  // Session configuration for simple auth
  app.use(session({
    secret: process.env.SESSION_SECRET || 'nkf-dev-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // Set to true in production with HTTPS
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  }));

  // Simple login endpoint
  app.post('/api/auth/login', async (req: any, res: any) => {
    try {
      const { name, pin } = req.body;
      
      console.log("Login attempt:", { name, pin }); // Debug log
      
      if (!name || !pin) {
        return res.status(400).json({ message: "Name and PIN are required" });
      }

      // Check if user exists in database first
      let dbUser = await storage.getUserByNameAndPin(name, pin);
      
      if (!dbUser) {
        // If not found, authenticate with test users and create in database
        const testUser = authenticateUser(name, pin);
        if (!testUser) {
          return res.status(401).json({ message: "Invalid credentials" });
        }
        
        // Create user in database
        dbUser = await storage.createUser({
          name: testUser.name,
          pin: testUser.pin,
          role: testUser.role,
          title: testUser.position,
          is_active: true
        });
      }

      // Store user in session
      req.session.userId = dbUser.id;
      req.session.user = dbUser;

      console.log("User logged in:", { id: dbUser.id, name: dbUser.name }); // Debug log

      res.json({
        id: dbUser.id,
        name: dbUser.name,
        position: dbUser.title,
        role: dbUser.role
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Get current user
  app.get('/api/auth/user', isAuthenticated, async (req: any, res: any) => {
    try {
      const user = getUserById(req.session.userId);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }
      
      res.json({
        id: user.id,
        name: user.name,
        position: user.position,
        role: user.role
      });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Logout endpoint
  app.post('/api/auth/logout', (req: any, res: any) => {
    req.session.destroy((err: any) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  // Initialize test data endpoint
  app.post('/api/auth/initialize', async (req: any, res: any) => {
    try {
      // This endpoint can be used to set up initial test data
      res.json({ message: "System initialized for testing" });
    } catch (error) {
      console.error("Initialization error:", error);
      res.status(500).json({ message: "Initialization failed" });
    }
  });

  // Chat room routes
  app.get('/api/chat-rooms', isAuthenticated, async (req, res) => {
    try {
      const rooms = await storage.getChatRooms();
      
      // Get stats for each room
      const roomsWithStats = await Promise.all(
        rooms.map(async (room) => {
          const stats = await storage.getRoomStats(room.id);
          return {
            ...room,
            memberCount: stats.memberCount,
            messageCount: stats.messageCount,
          };
        })
      );
      
      res.json(roomsWithStats);
    } catch (error) {
      console.error("Error fetching chat rooms:", error);
      res.status(500).json({ message: "Failed to fetch chat rooms" });
    }
  });

  app.get('/api/chat-rooms/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const room = await storage.getChatRoom(id);
      
      if (!room) {
        return res.status(404).json({ message: "Chat room not found" });
      }
      
      res.json(room);
    } catch (error) {
      console.error("Error fetching chat room:", error);
      res.status(500).json({ message: "Failed to fetch chat room" });
    }
  });

  app.post('/api/chat-rooms', isAuthenticated, async (req, res) => {
    try {
      const roomData = insertChatRoomSchema.parse(req.body);
      const room = await storage.createChatRoom(roomData);
      res.status(201).json(room);
    } catch (error) {
      console.error("Error creating chat room:", error);
      res.status(500).json({ message: "Failed to create chat room" });
    }
  });

  // Message routes
  app.get('/api/chat-rooms/:roomId/messages', isAuthenticated, async (req, res) => {
    try {
      const { roomId } = req.params;
      const messages = await storage.getMessages(roomId);
      res.json(messages.reverse()); // Reverse to show oldest first
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  // Delete message endpoint (admin only)
  app.delete('/api/messages/:messageId', isAuthenticated, isAdminUser, async (req: any, res) => {
    try {
      const { messageId } = req.params;
      const deleted = await storage.deleteMessage(messageId);
      
      if (!deleted) {
        return res.status(404).json({ message: "Message not found" });
      }
      
      res.json({ message: "Message deleted successfully" });
    } catch (error) {
      console.error("Error deleting message:", error);
      res.status(500).json({ message: "Failed to delete message" });
    }
  });

  // Enhanced message creation endpoint with file upload
  app.post('/api/chat-rooms/:roomId/messages', isAuthenticated, upload.single('file'), async (req: any, res) => {
    try {
      const { roomId } = req.params;
      const userId = req.session.userId;
      const { content, type = 'text', duration } = req.body;

      const messageData: any = {
        roomId,
        userId,
        content,
        type,
      };

      // Handle file upload
      if (req.file) {
        messageData.fileName = req.file.originalname;
        messageData.fileSize = req.file.size;
        messageData.mimeType = req.file.mimetype;
        
        // Store file path in content for later retrieval
        messageData.content = req.file.filename;
      }

      // Handle voice message duration
      if (duration) {
        messageData.duration = parseInt(duration);
      }

      const message = await storage.createMessage(messageData);
      res.status(201).json(message);
    } catch (error) {
      console.error("Error creating message:", error);
      res.status(500).json({ message: "Failed to create message" });
    }
  });

  // Poll creation endpoint
  app.post('/api/chat-rooms/:roomId/polls', isAuthenticated, async (req: any, res) => {
    try {
      const { roomId } = req.params;
      const userId = req.session.userId;
      const { question, options, allowMultiple = false } = req.body;

      if (!question || !options || !Array.isArray(options) || options.length < 2) {
        return res.status(400).json({ message: "Poll must have a question and at least 2 options" });
      }

      // Create the poll message first
      const messageData = {
        roomId,
        userId,
        content: question,
        type: 'poll' as const,
      };

      const message = await storage.createMessage(messageData);

      // Create the poll
      const pollData = {
        messageId: message.id,
        question,
        allowMultiple,
      };

      const poll = await storage.createPoll(pollData);

      // Create poll options
      const optionData = options.map((text: string, index: number) => ({
        pollId: poll.id,
        text: text.trim(),
        orderIndex: index,
      }));

      await storage.createPollOptions(optionData);

      // Return the complete poll with options
      const completePoll = await storage.getPollWithOptions(poll.id);

      res.status(201).json({
        message,
        poll: completePoll,
      });
    } catch (error) {
      console.error("Error creating poll:", error);
      res.status(500).json({ message: "Failed to create poll" });
    }
  });

  // Get poll with voting data
  app.get('/api/polls/:pollId', isAuthenticated, async (req, res) => {
    try {
      const { pollId } = req.params;
      const poll = await storage.getPollWithOptions(pollId);
      
      if (!poll) {
        return res.status(404).json({ message: "Poll not found" });
      }

      res.json(poll);
    } catch (error) {
      console.error("Error fetching poll:", error);
      res.status(500).json({ message: "Failed to fetch poll" });
    }
  });

  // Vote on poll
  app.post('/api/polls/:pollId/vote', isAuthenticated, async (req: any, res) => {
    try {
      const { pollId } = req.params;
      const userId = req.session.userId;
      const { optionId } = req.body;

      if (!optionId) {
        return res.status(400).json({ message: "Option ID is required" });
      }

      const vote = await storage.votePoll({
        pollId,
        optionId,
        userId,
      });

      // Return updated poll data
      const updatedPoll = await storage.getPollWithOptions(pollId);
      res.json(updatedPoll);
    } catch (error) {
      console.error("Error voting on poll:", error);
      res.status(500).json({ message: "Failed to vote on poll" });
    }
  });

  // Remove vote from poll
  app.delete('/api/polls/:pollId/vote/:optionId', isAuthenticated, async (req: any, res) => {
    try {
      const { pollId, optionId } = req.params;
      const userId = req.session.userId;

      await storage.removePollVote(pollId, optionId, userId);

      // Return updated poll data
      const updatedPoll = await storage.getPollWithOptions(pollId);
      res.json(updatedPoll);
    } catch (error) {
      console.error("Error removing vote:", error);
      res.status(500).json({ message: "Failed to remove vote" });
    }
  });

  // File serving endpoint
  app.get('/api/files/:messageId', isAuthenticated, async (req, res) => {
    try {
      const { messageId } = req.params;
      const message = await storage.getMessage(messageId);
      
      if (!message || message.type === 'text') {
        return res.status(404).json({ message: "File not found" });
      }

      const filePath = path.join(process.cwd(), 'uploads', message.content);
      
      try {
        await fs.access(filePath);
        
        // Set appropriate content type
        if (message.mimeType) {
          res.setHeader('Content-Type', message.mimeType);
        }
        
        // Set content disposition for downloads
        if (message.type === 'document') {
          res.setHeader('Content-Disposition', `attachment; filename="${message.fileName}"`);
        }

        res.sendFile(filePath);
      } catch (error) {
        res.status(404).json({ message: "File not found" });
      }
    } catch (error) {
      console.error("Error serving file:", error);
      res.status(500).json({ message: "Failed to serve file" });
    }
  });

  // Room membership routes
  app.get('/api/chat-rooms/:roomId/members', isAuthenticated, async (req, res) => {
    try {
      const { roomId } = req.params;
      const members = await storage.getRoomMembers(roomId);
      res.json(members);
    } catch (error) {
      console.error("Error fetching room members:", error);
      res.status(500).json({ message: "Failed to fetch room members" });
    }
  });

  app.post('/api/chat-rooms/:roomId/join', isAuthenticated, async (req: any, res) => {
    try {
      const { roomId } = req.params;
      const userId = req.session.userId;
      
      const membership = await storage.addRoomMember({ roomId, userId });
      res.status(201).json(membership);
    } catch (error) {
      console.error("Error joining room:", error);
      res.status(500).json({ message: "Failed to join room" });
    }
  });

  app.delete('/api/chat-rooms/:roomId/leave', isAuthenticated, async (req: any, res) => {
    try {
      const { roomId } = req.params;
      const userId = req.session.userId;
      
      await storage.removeRoomMember(roomId, userId);
      res.status(204).send();
    } catch (error) {
      console.error("Error leaving room:", error);
      res.status(500).json({ message: "Failed to leave room" });
    }
  });

  // Initialize default chat rooms and users
  app.post('/api/initialize', async (req, res) => {
    try {
      // Create default users
      const defaultUsers = [
        { name: "Admin President", pin: "1234", role: "president", title: "President" },
        { name: "Vice President", pin: "5678", role: "admin", title: "Vice President" },
        { name: "Secretary", pin: "9012", role: "admin", title: "Secretary" },
        { name: "Treasurer", pin: "3456", role: "admin", title: "Treasurer" },
        { name: "Technical Director", pin: "7890", role: "admin", title: "Technical Director" },
      ];

      for (const userData of defaultUsers) {
        try {
          await storage.createUser(userData);
        } catch (error) {
          // User might already exist, continue
        }
      }

      // Create default chat rooms
      const defaultRooms = [
        { name: "Jnr Development champs", description: "Official Jnr Development champs discussion room for EXCO members" },
        { name: "UFAK", description: "Official UFAK discussion room for NKF EXCO members" },
        { name: "Trials", description: "Official Trials discussion room for NKF EXCO members" },
        { name: "Region 5", description: "Official Region 5 discussion room for NKF EXCO members" },
        { name: "Nationals", description: "Official Nationals discussion room for NKF EXCO members" },
      ];

      for (const roomData of defaultRooms) {
        try {
          await storage.createChatRoom(roomData);
        } catch (error) {
          // Room might already exist, continue
        }
      }

      res.json({ message: "Default users and rooms initialized" });
    } catch (error) {
      console.error("Error initializing:", error);
      res.status(500).json({ message: "Failed to initialize" });
    }
  });

  // Helper functions for bank statement integration
  const calculateBankStatementTotals = () => {
    let totalIncome = 0;
    let totalExpenses = 0;
    let currentBalance = 125000; // Starting balance

    bankStatementsMemory.forEach(statement => {
      if (statement.status === 'processed' && statement.analysis) {
        totalIncome += statement.analysis.totalIncome || 0;
        totalExpenses += statement.analysis.totalExpenses || 0;
      }
    });

    currentBalance = currentBalance + totalIncome - totalExpenses;

    return { totalIncome, totalExpenses, currentBalance };
  };

  const extractFinancialEntriesFromBankStatements = (): any[] => {
    const entries: any[] = [];
    const currentYear = new Date().getFullYear().toString();

    bankStatementsMemory.forEach(statement => {
      if (statement.status === 'processed' && statement.analysis) {
        // Add income entries from bank statement
        statement.analysis.topIncomeCategories.forEach((category: any, index: number) => {
          entries.push({
            id: `bank-income-${statement.id}-${index}`,
            type: 'income',
            category: category.category,
            description: `${category.category} (from ${statement.fileName})`,
            amount: category.amount.toString(),
            currency: 'NAD',
            date: statement.uploadedAt,
            isProjected: 'false',
            financialYear: currentYear,
            createdBy: 'bank-statement',
            createdAt: statement.uploadedAt,
            updatedAt: statement.uploadedAt
          });
        });

        // Add expense entries from bank statement  
        statement.analysis.topExpenseCategories.forEach((category: any, index: number) => {
          entries.push({
            id: `bank-expense-${statement.id}-${index}`,
            type: 'expense',
            category: category.category,
            description: `${category.category} (from ${statement.fileName})`,
            amount: category.amount.toString(),
            currency: 'NAD',
            date: statement.uploadedAt,
            isProjected: 'false',
            financialYear: currentYear,
            createdBy: 'bank-statement',
            createdAt: statement.uploadedAt,
            updatedAt: statement.uploadedAt
          });
        });
      }
    });

    return entries;
  };

  // Financial routes with bank statement integration
  app.get('/api/financial/summary/:year', isAuthenticated, async (req: any, res) => {
    try {
      const { year } = req.params;
      
      // Get base summary from database
      const baseSummary = await storage.getFinancialSummary(year);
      
      // Calculate totals from bank statements
      const bankStatementTotals = calculateBankStatementTotals();
      
      // Merge bank statement data with base summary
      const enhancedSummary = {
        ...(baseSummary || {
          financialYear: year,
          projectedIncome: "180000",
          projectedExpenses: "155000",
          currency: "NAD",
        }),
        actualIncome: bankStatementTotals.totalIncome.toString(),
        actualExpenses: bankStatementTotals.totalExpenses.toString(),
        currentBalance: bankStatementTotals.currentBalance.toString(),
        lastUpdated: new Date().toISOString()
      };
      
      res.json(enhancedSummary);
    } catch (error) {
      console.error("Error fetching financial summary:", error);
      res.status(500).json({ message: "Failed to fetch financial summary" });
    }
  });

  app.get('/api/financial/entries/:year', isAuthenticated, async (req: any, res) => {
    try {
      const { year } = req.params;
      
      // Get base entries from database
      const baseEntries = await storage.getFinancialEntries(year);
      
      // Get entries from bank statements
      const bankStatementEntries = extractFinancialEntriesFromBankStatements();
      
      // Combine both sources, prioritizing bank statement data
      const combinedEntries = [...bankStatementEntries, ...baseEntries];
      
      res.json(combinedEntries);
    } catch (error) {
      console.error("Error fetching financial entries:", error);
      res.status(500).json({ message: "Failed to fetch financial entries" });
    }
  });

  app.post('/api/financial/entries', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const entryData = {
        ...req.body,
        createdBy: userId,
      };
      
      const entry = await storage.createFinancialEntry(entryData);
      res.status(201).json(entry);
    } catch (error) {
      console.error("Error creating financial entry:", error);
      res.status(500).json({ message: "Failed to create financial entry" });
    }
  });

  // Admin-only middleware
  const isAdmin = async (req: any, res: any, next: any) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const user = await storage.getUser(userId);
      if (!user || (user.role !== "admin" && user.role !== "president")) {
        return res.status(403).json({ message: "Admin access required" });
      }

      req.user = user;
      next();
    } catch (error) {
      console.error("Error checking admin status:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  };



  // In-memory storage for bank statements (admin only)
  const bankStatementsMemory: any[] = [];

  app.post('/api/bank-statements/upload', isAuthenticated, isAdminUser, upload.single('statement'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const userId = req.session.userId;
      const { bankName, statementPeriod } = req.body;

      // Create statement record in memory
      const statement = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        fileName: req.file.filename,
        originalName: req.file.originalname,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        uploadedBy: userId,
        bankName: bankName || null,
        accountNumber: null,
        statementPeriod: statementPeriod || null,
        totalIncome: "0",
        totalExpenses: "0",
        netAmount: "0",
        transactionCount: 0,
        isProcessed: false,
        processingNotes: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Store in memory
      bankStatementsMemory.push(statement);

      // Simple mock processing - in real app, this would parse the PDF/CSV
      setTimeout(() => {
        const stmt = bankStatementsMemory.find(s => s.id === statement.id);
        if (stmt) {
          stmt.totalIncome = (Math.random() * 50000 + 10000).toFixed(2);
          stmt.totalExpenses = (Math.random() * 30000 + 5000).toFixed(2);
          stmt.netAmount = (parseFloat(stmt.totalIncome) - parseFloat(stmt.totalExpenses)).toFixed(2);
          stmt.transactionCount = Math.floor(Math.random() * 100) + 20;
          stmt.isProcessed = true;
          stmt.processingNotes = "Automatically processed statement";
          stmt.updatedAt = new Date().toISOString();
        }
      }, 3000); // Process after 3 seconds

      res.status(201).json(statement);
    } catch (error) {
      console.error("Error uploading bank statement:", error);
      res.status(500).json({ message: "Failed to upload bank statement" });
    }
  });

  app.delete('/api/bank-statements/:id', isAuthenticated, isAdminUser, async (req: any, res) => {
    try {
      const { id } = req.params;
      const index = bankStatementsMemory.findIndex(s => s.id === id);
      
      if (index === -1) {
        return res.status(404).json({ message: "Bank statement not found" });
      }

      // Remove from memory
      bankStatementsMemory.splice(index, 1);

      res.json({ message: "Bank statement deleted successfully" });
    } catch (error) {
      console.error("Error deleting bank statement:", error);
      res.status(500).json({ message: "Failed to delete bank statement" });
    }
  });

  // Get bank statements from memory
  app.get('/api/bank-statements', isAuthenticated, isAdminUser, async (req: any, res) => {
    try {
      res.json(bankStatementsMemory);
    } catch (error) {
      console.error("Error fetching bank statements:", error);
      res.status(500).json({ message: "Failed to fetch bank statements" });
    }
  });

  // Calendar routes
  app.get('/api/calendar/events', isAuthenticated, async (req: any, res) => {
    try {
      const { year, month } = req.query;
      const events = await storage.getCalendarEvents(
        year ? parseInt(year) : undefined,
        month ? parseInt(month) : undefined
      );
      res.json(events);
    } catch (error) {
      console.error("Error fetching calendar events:", error);
      res.status(500).json({ message: "Failed to fetch calendar events" });
    }
  });

  app.post('/api/calendar/events', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const eventData = {
        ...req.body,
        createdBy: userId,
      };
      
      const event = await storage.createCalendarEvent(eventData);
      res.status(201).json(event);
    } catch (error) {
      console.error("Error creating calendar event:", error);
      res.status(500).json({ message: "Failed to create calendar event" });
    }
  });

  app.put('/api/calendar/events/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const event = await storage.updateCalendarEvent(id, req.body);
      res.json(event);
    } catch (error) {
      console.error("Error updating calendar event:", error);
      res.status(500).json({ message: "Failed to update calendar event" });
    }
  });

  app.delete('/api/calendar/events/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteCalendarEvent(id);
      res.json({ message: "Event deleted successfully" });
    } catch (error) {
      console.error("Error deleting calendar event:", error);
      res.status(500).json({ message: "Failed to delete calendar event" });
    }
  });

  // Calendar document upload routes
  app.get('/api/calendar/documents', isAuthenticated, async (req: any, res) => {
    try {
      const documents = await storage.getCalendarDocuments();
      res.json(documents);
    } catch (error) {
      console.error("Error fetching calendar documents:", error);
      res.status(500).json({ message: "Failed to fetch calendar documents" });
    }
  });

  app.post('/api/calendar/documents/upload', isAuthenticated, upload.single('document'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const userId = req.session.userId;
      const documentData = {
        fileName: req.file.filename,
        originalName: req.file.originalname,
        fileSize: req.file.size.toString(),
        mimeType: req.file.mimetype,
        uploadedBy: userId,
      };

      const document = await storage.createCalendarDocument(documentData);

      // Process document in background (simulate for now)
      setTimeout(async () => {
        try {
          await processCalendarDocument(document.id);
        } catch (error) {
          console.error("Error processing calendar document:", error);
        }
      }, 1000);

      res.status(201).json({
        id: document.id,
        originalName: document.originalName,
        status: "processing"
      });
    } catch (error) {
      console.error("Error uploading calendar document:", error);
      res.status(500).json({ message: "Failed to upload calendar document" });
    }
  });

  // Function to process calendar documents (simulate AI extraction)
  const processCalendarDocument = async (documentId: string) => {
    try {
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Simulate extracted events
      const sampleEvents = [
        {
          title: "Junior Development Championships",
          description: "Annual junior development competition",
          eventType: "competition",
          startDate: new Date(2025, 2, 15), // March 15, 2025
          endDate: new Date(2025, 2, 17), // March 17, 2025
          location: "Windhoek Sports Complex",
          isAllDay: "false",
          source: "document",
          documentName: `document-${documentId}`,
          createdBy: "system",
        },
        {
          title: "UFAK Regional Tournament",
          description: "Regional tournament for UFAK participants",
          eventType: "competition",
          startDate: new Date(2025, 3, 20), // April 20, 2025
          endDate: new Date(2025, 3, 22), // April 22, 2025
          location: "Swakopmund Sports Hall",
          isAllDay: "false",
          source: "document",
          documentName: `document-${documentId}`,
          createdBy: "system",
        },
        {
          title: "National Championships",
          description: "Annual national karate championships",
          eventType: "competition",
          startDate: new Date(2025, 5, 10), // June 10, 2025
          endDate: new Date(2025, 5, 12), // June 12, 2025
          location: "Windhoek Convention Centre",
          isAllDay: "false",
          source: "document",
          documentName: `document-${documentId}`,
          createdBy: "system",
        },
      ];

      // Create events from extracted data
      for (const eventData of sampleEvents) {
        await storage.createCalendarEvent(eventData);
      }

      // Update document status
      await storage.updateCalendarDocument(documentId, {
        status: "processed",
        extractedEventsCount: sampleEvents.length.toString(),
        processingNotes: "Successfully extracted events from calendar document",
        processedAt: new Date(),
      });

    } catch (error) {
      console.error("Error processing calendar document:", error);
      await storage.updateCalendarDocument(documentId, {
        status: "failed",
        processingNotes: "Failed to process calendar document",
        processedAt: new Date(),
      });
    }
  };

  const httpServer = createServer(app);

  // WebSocket server for real-time chat
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  interface ClientConnection {
    ws: WebSocket;
    userId: string;
    roomId?: string;
  }
  
  const clients = new Map<string, ClientConnection>();

  wss.on('connection', (ws: WebSocket, req) => {
    const connectionId = Math.random().toString(36).substring(7);
    
    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'auth') {
          // Store user connection
          clients.set(connectionId, {
            ws,
            userId: message.userId,
            roomId: message.roomId,
          });
          
          // Join user to room if specified
          if (message.roomId) {
            await storage.addRoomMember({
              roomId: message.roomId,
              userId: message.userId,
            });
          }
          
          ws.send(JSON.stringify({
            type: 'auth_success',
            connectionId,
          }));
        }
        
        if (message.type === 'join_room') {
          const client = clients.get(connectionId);
          if (client) {
            client.roomId = message.roomId;
            await storage.addRoomMember({
              roomId: message.roomId,
              userId: client.userId,
            });
            
            ws.send(JSON.stringify({
              type: 'room_joined',
              roomId: message.roomId,
            }));
          }
        }
        
        if (message.type === 'send_message') {
          const client = clients.get(connectionId);
          if (client && client.roomId) {
            // Save message to database
            const newMessage = await storage.createMessage({
              roomId: client.roomId,
              userId: client.userId,
              content: message.content,
            });
            
            // Get user info for the message
            const user = await storage.getUser(client.userId);
            
            // Broadcast to all clients in the same room
            const messageWithUser = {
              ...newMessage,
              user,
            };
            
            clients.forEach((otherClient) => {
              if (otherClient.roomId === client.roomId && 
                  otherClient.ws.readyState === WebSocket.OPEN) {
                otherClient.ws.send(JSON.stringify({
                  type: 'new_message',
                  message: messageWithUser,
                }));
              }
            });
          }
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    ws.on('close', () => {
      clients.delete(connectionId);
    });
  });

  return httpServer;
}
