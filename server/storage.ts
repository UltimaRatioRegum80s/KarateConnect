import {
  users,
  chatRooms,
  messages,
  roomMembers,
  type User,
  type UpsertUser,
  type ChatRoom,
  type InsertChatRoom,
  type Message,
  type InsertMessage,
  type RoomMember,
  type InsertRoomMember,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, count, sql } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByCredentials(name: string, pin: string): Promise<User | undefined>;
  createUser(user: UpsertUser): Promise<User>;
  
  // Chat room operations
  getChatRooms(): Promise<ChatRoom[]>;
  getChatRoom(id: string): Promise<ChatRoom | undefined>;
  createChatRoom(room: InsertChatRoom): Promise<ChatRoom>;
  
  // Message operations
  getMessages(roomId: string, limit?: number): Promise<(Message & { user: User })[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  
  // Room membership operations
  getRoomMembers(roomId: string): Promise<(RoomMember & { user: User })[]>;
  addRoomMember(membership: InsertRoomMember): Promise<RoomMember>;
  removeRoomMember(roomId: string, userId: string): Promise<void>;
  
  // Statistics
  getRoomStats(roomId: string): Promise<{ memberCount: number; messageCount: number }>;
  getUserStats(userId: string): Promise<{ roomCount: number; messageCount: number }>;
}

export class DatabaseStorage implements IStorage {
  // User operations

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByCredentials(name: string, pin: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(sql`${users.name} = ${name} AND ${users.pin} = ${pin}`);
    return user;
  }

  async createUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .returning();
    return user;
  }

  // Chat room operations
  async getChatRooms(): Promise<ChatRoom[]> {
    return await db
      .select()
      .from(chatRooms)
      .where(eq(chatRooms.isActive, true))
      .orderBy(chatRooms.name);
  }

  async getChatRoom(id: string): Promise<ChatRoom | undefined> {
    const [room] = await db
      .select()
      .from(chatRooms)
      .where(eq(chatRooms.id, id));
    return room;
  }

  async createChatRoom(room: InsertChatRoom): Promise<ChatRoom> {
    const [newRoom] = await db
      .insert(chatRooms)
      .values(room)
      .returning();
    return newRoom;
  }

  // Message operations
  async getMessages(roomId: string, limit = 50): Promise<(Message & { user: User })[]> {
    return await db
      .select({
        id: messages.id,
        roomId: messages.roomId,
        userId: messages.userId,
        content: messages.content,
        type: messages.type,
        fileName: messages.fileName,
        fileSize: messages.fileSize,
        mimeType: messages.mimeType,
        duration: messages.duration,
        createdAt: messages.createdAt,
        user: users,
      })
      .from(messages)
      .innerJoin(users, eq(messages.userId, users.id))
      .where(eq(messages.roomId, roomId))
      .orderBy(desc(messages.createdAt))
      .limit(limit);
  }

  async getMessage(messageId: string): Promise<Message | undefined> {
    const [message] = await db
      .select()
      .from(messages)
      .where(eq(messages.id, messageId));
    return message || undefined;
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const [newMessage] = await db
      .insert(messages)
      .values(message)
      .returning();
    return newMessage;
  }

  // Room membership operations
  async getRoomMembers(roomId: string): Promise<(RoomMember & { user: User })[]> {
    return await db
      .select({
        id: roomMembers.id,
        roomId: roomMembers.roomId,
        userId: roomMembers.userId,
        joinedAt: roomMembers.joinedAt,
        user: users,
      })
      .from(roomMembers)
      .innerJoin(users, eq(roomMembers.userId, users.id))
      .where(eq(roomMembers.roomId, roomId));
  }

  async addRoomMember(membership: InsertRoomMember): Promise<RoomMember> {
    const [newMember] = await db
      .insert(roomMembers)
      .values(membership)
      .onConflictDoNothing()
      .returning();
    return newMember;
  }

  async removeRoomMember(roomId: string, userId: string): Promise<void> {
    await db
      .delete(roomMembers)
      .where(
        sql`${roomMembers.roomId} = ${roomId} AND ${roomMembers.userId} = ${userId}`
      );
  }

  // Statistics
  async getRoomStats(roomId: string): Promise<{ memberCount: number; messageCount: number }> {
    const [memberCountResult] = await db
      .select({ count: count() })
      .from(roomMembers)
      .where(eq(roomMembers.roomId, roomId));

    const [messageCountResult] = await db
      .select({ count: count() })
      .from(messages)
      .where(eq(messages.roomId, roomId));

    return {
      memberCount: memberCountResult?.count || 0,
      messageCount: messageCountResult?.count || 0,
    };
  }

  async getUserStats(userId: string): Promise<{ roomCount: number; messageCount: number }> {
    const [roomCountResult] = await db
      .select({ count: count() })
      .from(roomMembers)
      .where(eq(roomMembers.userId, userId));

    const [messageCountResult] = await db
      .select({ count: count() })
      .from(messages)
      .where(eq(messages.userId, userId));

    return {
      roomCount: roomCountResult?.count || 0,
      messageCount: messageCountResult?.count || 0,
    };
  }
}

export const storage = new DatabaseStorage();
