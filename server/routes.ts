import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./auth";
import { insertMessageSchema, insertChatRoomSchema, insertRoomMemberSchema } from "@shared/schema";
import multer from "multer";
import path from "path";
import fs from "fs/promises";

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

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes are handled in setupAuth

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

  // Financial routes
  app.get('/api/financial/summary/:year', isAuthenticated, async (req: any, res) => {
    try {
      const { year } = req.params;
      const summary = await storage.getFinancialSummary(year);
      res.json(summary || {
        financialYear: year,
        currentBalance: "0",
        projectedIncome: "0",
        projectedExpenses: "0",
        actualIncome: "0",
        actualExpenses: "0",
        currency: "NAD",
      });
    } catch (error) {
      console.error("Error fetching financial summary:", error);
      res.status(500).json({ message: "Failed to fetch financial summary" });
    }
  });

  app.get('/api/financial/entries/:year', isAuthenticated, async (req: any, res) => {
    try {
      const { year } = req.params;
      const entries = await storage.getFinancialEntries(year);
      res.json(entries);
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
