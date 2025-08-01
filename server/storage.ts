import {
  users,
  chatRooms,
  messages,
  roomMembers,
  polls,
  pollOptions,
  pollVotes,
  financialEntries,
  financialSummary,
  bankStatements,
  bankTransactions,
  calendarEvents,
  calendarDocuments,
  type User,
  type UpsertUser,
  type InsertUser,
  type ChatRoom,
  type InsertChatRoom,
  type Message,
  type InsertMessage,
  type RoomMember,
  type InsertRoomMember,
  type Poll,
  type InsertPoll,
  type PollOption,
  type InsertPollOption,
  type PollVote,
  type InsertPollVote,
  type FinancialEntry,
  type InsertFinancialEntry,
  type FinancialSummary,
  type InsertFinancialSummary,

  type CalendarEvent,
  type InsertCalendarEvent,
  type CalendarDocument,
  type InsertCalendarDocument,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, count, sql, and, gte, lte } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByCredentials(name: string, pin: string): Promise<User | undefined>;
  getUserByNameAndPin(name: string, pin: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Chat room operations
  getChatRooms(): Promise<ChatRoom[]>;
  getChatRoom(id: string): Promise<ChatRoom | undefined>;
  createChatRoom(room: InsertChatRoom): Promise<ChatRoom>;
  
  // Message operations
  getMessages(roomId: string, limit?: number): Promise<(Message & { user: User })[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  deleteMessage(messageId: string): Promise<boolean>;
  
  // Room membership operations
  getRoomMembers(roomId: string): Promise<(RoomMember & { user: User })[]>;
  addRoomMember(membership: InsertRoomMember): Promise<RoomMember>;
  removeRoomMember(roomId: string, userId: string): Promise<void>;
  
  // Poll operations
  createPoll(poll: InsertPoll): Promise<Poll>;
  createPollOptions(options: InsertPollOption[]): Promise<PollOption[]>;
  getPollWithOptions(pollId: string): Promise<(Poll & { options: (PollOption & { voteCount: number; userVotes: string[] })[] }) | null>;
  votePoll(vote: InsertPollVote): Promise<PollVote>;
  removePollVote(pollId: string, optionId: string, userId: string): Promise<void>;

  // Financial operations
  getFinancialSummary(financialYear: string): Promise<FinancialSummary | undefined>;
  getFinancialEntries(financialYear: string): Promise<FinancialEntry[]>;
  createFinancialEntry(entry: InsertFinancialEntry): Promise<FinancialEntry>;
  updateFinancialSummary(summary: InsertFinancialSummary): Promise<FinancialSummary>;
  deleteFinancialEntry(id: string): Promise<void>;

  // Calendar operations
  getCalendarEvents(year?: number, month?: number): Promise<CalendarEvent[]>;
  createCalendarEvent(data: InsertCalendarEvent): Promise<CalendarEvent>;
  updateCalendarEvent(id: string, data: Partial<InsertCalendarEvent>): Promise<CalendarEvent>;
  deleteCalendarEvent(id: string): Promise<void>;
  
  getCalendarDocuments(): Promise<CalendarDocument[]>;
  createCalendarDocument(data: InsertCalendarDocument): Promise<CalendarDocument>;
  updateCalendarDocument(id: string, data: Partial<InsertCalendarDocument>): Promise<CalendarDocument>;

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

  async getUserByNameAndPin(name: string, pin: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(sql`${users.name} = ${name} AND ${users.pin} = ${pin}`);
    return user;
  }

  async createUser(userData: InsertUser): Promise<User> {
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
      .where(eq(chatRooms.is_active, true))
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
  async getMessages(roomId: string, limit = 50): Promise<(Message & { user: User; poll?: any })[]> {
    const messageResults = await db
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

    // Fetch poll data for messages that are polls
    const messagesWithPolls = await Promise.all(
      messageResults.map(async (message) => {
        if (message.type === 'poll') {
          const [poll] = await db
            .select()
            .from(polls)
            .where(eq(polls.messageId, message.id));
          
          if (poll) {
            const pollWithOptions = await this.getPollWithOptions(poll.id);
            return { ...message, poll: pollWithOptions };
          }
        }
        return message;
      })
    );

    return messagesWithPolls;
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

  async deleteMessage(messageId: string): Promise<boolean> {
    const result = await db
      .delete(messages)
      .where(eq(messages.id, messageId))
      .returning();
    return result.length > 0;
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

  // Poll operations
  async createPoll(poll: InsertPoll): Promise<Poll> {
    const [newPoll] = await db
      .insert(polls)
      .values(poll)
      .returning();
    return newPoll;
  }

  async createPollOptions(options: InsertPollOption[]): Promise<PollOption[]> {
    const newOptions = await db
      .insert(pollOptions)
      .values(options)
      .returning();
    return newOptions;
  }

  async getPollWithOptions(pollId: string): Promise<(Poll & { options: (PollOption & { voteCount: number; userVotes: string[] })[] }) | null> {
    const [poll] = await db
      .select()
      .from(polls)
      .where(eq(polls.id, pollId));

    if (!poll) return null;

    const options = await db
      .select({
        id: pollOptions.id,
        pollId: pollOptions.pollId,
        text: pollOptions.text,
        orderIndex: pollOptions.orderIndex,
        createdAt: pollOptions.createdAt,
        voteCount: count(pollVotes.id),
        userVotes: sql<string[]>`array_agg(${pollVotes.userId})`.mapWith((value) => 
          value ? value.filter(Boolean) : []
        ),
      })
      .from(pollOptions)
      .leftJoin(pollVotes, eq(pollOptions.id, pollVotes.optionId))
      .where(eq(pollOptions.pollId, pollId))
      .groupBy(pollOptions.id, pollOptions.pollId, pollOptions.text, pollOptions.orderIndex, pollOptions.createdAt)
      .orderBy(pollOptions.orderIndex);

    return {
      ...poll,
      options: options.map(option => ({
        ...option,
        voteCount: Number(option.voteCount),
        userVotes: option.userVotes || [],
      })),
    };
  }

  async votePoll(vote: InsertPollVote): Promise<PollVote> {
    // First check if poll allows multiple votes
    const [poll] = await db
      .select()
      .from(polls)
      .where(eq(polls.id, vote.pollId));

    if (!poll?.allowMultiple) {
      // Remove existing votes for this user and poll
      await db
        .delete(pollVotes)
        .where(sql`${pollVotes.pollId} = ${vote.pollId} AND ${pollVotes.userId} = ${vote.userId}`);
    }

    const [newVote] = await db
      .insert(pollVotes)
      .values(vote)
      .onConflictDoNothing()
      .returning();
    
    return newVote;
  }

  async removePollVote(pollId: string, optionId: string, userId: string): Promise<void> {
    await db
      .delete(pollVotes)
      .where(
        sql`${pollVotes.pollId} = ${pollId} AND ${pollVotes.optionId} = ${optionId} AND ${pollVotes.userId} = ${userId}`
      );
  }

  // Financial operations
  async getFinancialSummary(financialYear: string): Promise<FinancialSummary | undefined> {
    const [summary] = await db
      .select()
      .from(financialSummary)
      .where(eq(financialSummary.financialYear, financialYear));
    return summary;
  }

  async getFinancialEntries(financialYear: string): Promise<FinancialEntry[]> {
    return await db
      .select()
      .from(financialEntries)
      .where(eq(financialEntries.financialYear, financialYear))
      .orderBy(desc(financialEntries.date));
  }

  async createFinancialEntry(entry: InsertFinancialEntry): Promise<FinancialEntry> {
    const [newEntry] = await db
      .insert(financialEntries)
      .values(entry)
      .returning();
    return newEntry;
  }

  async updateFinancialSummary(summary: InsertFinancialSummary): Promise<FinancialSummary> {
    const [updatedSummary] = await db
      .insert(financialSummary)
      .values(summary)
      .onConflictDoUpdate({
        target: financialSummary.financialYear,
        set: {
          currentBalance: summary.currentBalance,
          projectedIncome: summary.projectedIncome,
          projectedExpenses: summary.projectedExpenses,
          actualIncome: summary.actualIncome,
          actualExpenses: summary.actualExpenses,
          lastUpdated: new Date(),
          updatedBy: summary.updatedBy,
        },
      })
      .returning();
    return updatedSummary;
  }

  async deleteFinancialEntry(id: string): Promise<void> {
    await db.delete(financialEntries).where(eq(financialEntries.id, id));
  }

  // Calendar operations
  async getCalendarEvents(year?: number, month?: number): Promise<CalendarEvent[]> {
    let query = db.select().from(calendarEvents);
    
    if (year && month) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      query = query.where(
        and(
          gte(calendarEvents.startDate, startDate),
          lte(calendarEvents.startDate, endDate)
        )
      ) as any;
    } else if (year) {
      const startDate = new Date(year, 0, 1);
      const endDate = new Date(year, 11, 31);
      query = query.where(
        and(
          gte(calendarEvents.startDate, startDate),
          lte(calendarEvents.startDate, endDate)
        )
      ) as any;
    }
    
    return await query.orderBy(calendarEvents.startDate);
  }

  async createCalendarEvent(data: InsertCalendarEvent): Promise<CalendarEvent> {
    const [event] = await db.insert(calendarEvents).values(data).returning();
    return event;
  }

  async updateCalendarEvent(id: string, data: Partial<InsertCalendarEvent>): Promise<CalendarEvent> {
    const [event] = await db
      .update(calendarEvents)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(calendarEvents.id, id))
      .returning();
    return event;
  }

  async deleteCalendarEvent(id: string): Promise<void> {
    await db.delete(calendarEvents).where(eq(calendarEvents.id, id));
  }

  async getCalendarDocuments(): Promise<CalendarDocument[]> {
    return await db.select().from(calendarDocuments).orderBy(desc(calendarDocuments.uploadedAt));
  }

  async createCalendarDocument(data: InsertCalendarDocument): Promise<CalendarDocument> {
    const [document] = await db.insert(calendarDocuments).values(data).returning();
    return document;
  }

  async updateCalendarDocument(id: string, data: Partial<InsertCalendarDocument>): Promise<CalendarDocument> {
    const [document] = await db
      .update(calendarDocuments)
      .set(data)
      .where(eq(calendarDocuments.id, id))
      .returning();
    return document;
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
