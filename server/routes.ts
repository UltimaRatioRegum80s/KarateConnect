import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./auth";
import { insertMessageSchema, insertChatRoomSchema, insertRoomMemberSchema } from "@shared/schema";

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
