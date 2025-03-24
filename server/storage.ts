import { 
  users, capturedMedia, subscriptions, sessions,
  type User, type InsertUser, type CapturedMedia, 
  type InsertCapturedMedia, type Subscription, type InsertSubscription 
} from "@shared/schema";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as bcrypt from "bcrypt";
import dotenv from "dotenv";
import { v4 as uuidv4 } from "uuid";

dotenv.config();

// Database connection
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

const client = postgres(process.env.DATABASE_URL, {
  max: 10, // Connection pool size
  ssl: { rejectUnauthorized: false }, // Enable SSL with certificate validation disabled
});

const db = drizzle(client);

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByProviderId(providerId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserLastLogin(id: number): Promise<User | undefined>;
  
  // Media methods
  getCapturedMedia(userId: number): Promise<CapturedMedia[]>;
  getCapturedMediaById(id: number): Promise<CapturedMedia | undefined>;
  createCapturedMedia(media: InsertCapturedMedia): Promise<CapturedMedia>;
  deleteCapturedMedia(id: number): Promise<void>;
  
  // Subscription methods
  getSubscription(userId: number): Promise<Subscription | undefined>;
  getAllSubscriptions(): Promise<Subscription[]>;
  createSubscription(subscription: InsertSubscription): Promise<Subscription>;
  updateSubscription(id: number, subscription: Partial<InsertSubscription>): Promise<Subscription | undefined>;
  
  // Session methods
  createSession(userId: number, expiresInDays: number): Promise<string>;
  getSessionData(sessionId: string): Promise<any>;
  destroySession(sessionId: string): Promise<void>;
}

export class PostgresStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username));
    return result[0];
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    if (!email) return undefined;
    const result = await db.select().from(users).where(eq(users.email, email));
    return result[0];
  }
  
  async getUserByProviderId(providerId: string): Promise<User | undefined> {
    if (!providerId) return undefined;
    const result = await db.select().from(users).where(eq(users.providerId, providerId));
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    // Hash password if provided
    if (insertUser.password) {
      const hashedPassword = await bcrypt.hash(insertUser.password, 10);
      insertUser.password = hashedPassword;
    }
    
    const result = await db.insert(users).values(insertUser).returning();
    return result[0];
  }
  
  async updateUserLastLogin(id: number): Promise<User | undefined> {
    const result = await db
      .update(users)
      .set({ lastLogin: new Date() })
      .where(eq(users.id, id))
      .returning();
    
    return result[0];
  }
  
  async getCapturedMedia(userId: number): Promise<CapturedMedia[]> {
    return await db
      .select()
      .from(capturedMedia)
      .where(eq(capturedMedia.userId, userId));
  }
  
  async getCapturedMediaById(id: number): Promise<CapturedMedia | undefined> {
    const result = await db
      .select()
      .from(capturedMedia)
      .where(eq(capturedMedia.id, id));
      
    return result[0];
  }
  
  async createCapturedMedia(media: InsertCapturedMedia): Promise<CapturedMedia> {
    const result = await db
      .insert(capturedMedia)
      .values(media)
      .returning();
      
    return result[0];
  }
  
  async deleteCapturedMedia(id: number): Promise<void> {
    await db
      .delete(capturedMedia)
      .where(eq(capturedMedia.id, id));
  }
  
  async getSubscription(userId: number): Promise<Subscription | undefined> {
    const result = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId));
      
    return result[0];
  }
  
  async getAllSubscriptions(): Promise<Subscription[]> {
    return await db.select().from(subscriptions);
  }
  
  async createSubscription(subscription: InsertSubscription): Promise<Subscription> {
    const result = await db
      .insert(subscriptions)
      .values(subscription)
      .returning();
      
    return result[0];
  }
  
  async updateSubscription(id: number, subscription: Partial<InsertSubscription>): Promise<Subscription | undefined> {
    const result = await db
      .update(subscriptions)
      .set({ ...subscription, updatedAt: new Date() })
      .where(eq(subscriptions.id, id))
      .returning();
      
    return result[0];
  }
  
  async createSession(userId: number, expiresInDays: number = 7): Promise<string> {
    const sessionId = uuidv4();
    const expiresDate = new Date();
    expiresDate.setDate(expiresDate.getDate() + expiresInDays);
    
    await db
      .insert(sessions)
      .values({
        id: sessionId,
        userId: userId,
        expires: expiresDate,
        data: JSON.stringify({ userId })
      });
      
    return sessionId;
  }
  
  async getSessionData(sessionId: string): Promise<any> {
    const result = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, sessionId));
      
    if (result.length === 0) return null;
    
    // Check if session is expired
    const session = result[0];
    if (new Date() > new Date(session.expires)) {
      await this.destroySession(sessionId);
      return null;
    }
    
    try {
      return JSON.parse(session.data || '{}');
    } catch (e) {
      return {};
    }
  }
  
  async destroySession(sessionId: string): Promise<void> {
    await db
      .delete(sessions)
      .where(eq(sessions.id, sessionId));
  }
}

// For backwards compatibility and development environment
export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private mediaItems: Map<number, CapturedMedia>;
  private userSubscriptions: Map<number, Subscription>;
  private userSessions: Map<string, any>;
  currentId: number;
  mediaId: number;
  subscriptionId: number;

  constructor() {
    this.users = new Map();
    this.mediaItems = new Map();
    this.userSubscriptions = new Map();
    this.userSessions = new Map();
    this.currentId = 1;
    this.mediaId = 1;
    this.subscriptionId = 1;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    if (!email) return undefined;
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }
  
  async getUserByProviderId(providerId: string): Promise<User | undefined> {
    if (!providerId) return undefined;
    return Array.from(this.users.values()).find(
      (user) => user.providerId === providerId,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    
    // Hash password if provided
    let password = insertUser.password || null;
    if (password) {
      password = await bcrypt.hash(password, 10);
    }
    
    const user: User = { 
      ...insertUser, 
      id, 
      password,
      email: insertUser.email || null,
      providerId: insertUser.providerId || null,
      profilePicture: insertUser.profilePicture || null,
      authProvider: insertUser.authProvider || 'local',
      createdAt: new Date(),
      lastLogin: new Date()
    };
    
    this.users.set(id, user);
    return user;
  }
  
  async updateUserLastLogin(id: number): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    user.lastLogin = new Date();
    this.users.set(id, user);
    return user;
  }
  
  async getCapturedMedia(userId: number): Promise<CapturedMedia[]> {
    const result: CapturedMedia[] = [];
    
    // Use Array.from to avoid iterator issues
    Array.from(this.mediaItems.entries()).forEach(([_, media]) => {
      if (media.userId === userId) {
        result.push(media);
      }
    });
    
    return result;
  }
  
  async getCapturedMediaById(id: number): Promise<CapturedMedia | undefined> {
    return this.mediaItems.get(id);
  }
  
  async createCapturedMedia(media: InsertCapturedMedia): Promise<CapturedMedia> {
    const id = this.mediaId++;
    const capturedMedia: CapturedMedia = {
      ...media,
      id,
      timestamp: new Date(),
      userId: media.userId || null,
      mediaType: media.mediaType,
      mediaUrl: media.mediaUrl
    };
    
    this.mediaItems.set(id, capturedMedia);
    return capturedMedia;
  }
  
  async deleteCapturedMedia(id: number): Promise<void> {
    this.mediaItems.delete(id);
  }
  
  async getSubscription(userId: number): Promise<Subscription | undefined> {
    // Use Array.from to avoid iterator issues
    const subscription = Array.from(this.userSubscriptions.values()).find(
      sub => sub.userId === userId
    );
    return subscription;
  }
  
  async getAllSubscriptions(): Promise<Subscription[]> {
    // Convert Map to array manually to avoid iterator issues
    const result: Subscription[] = [];
    this.userSubscriptions.forEach(sub => {
      result.push(sub);
    });
    return result;
  }
  
  async createSubscription(subscription: InsertSubscription): Promise<Subscription> {
    const id = this.subscriptionId++;
    const newSubscription: Subscription = {
      ...subscription,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
      status: subscription.status || 'free',
      stripeCustomerId: subscription.stripeCustomerId || null,
      stripeSubscriptionId: subscription.stripeSubscriptionId || null,
      currentPeriodStart: subscription.currentPeriodStart || null,
      currentPeriodEnd: subscription.currentPeriodEnd || null
    };
    
    this.userSubscriptions.set(id, newSubscription);
    return newSubscription;
  }
  
  async updateSubscription(id: number, subscription: Partial<InsertSubscription>): Promise<Subscription | undefined> {
    const existing = this.userSubscriptions.get(id);
    if (!existing) return undefined;
    
    const updated: Subscription = {
      ...existing,
      ...subscription,
      updatedAt: new Date()
    };
    
    this.userSubscriptions.set(id, updated);
    return updated;
  }
  
  async createSession(userId: number, expiresInDays: number = 7): Promise<string> {
    const sessionId = uuidv4();
    const expiresDate = new Date();
    expiresDate.setDate(expiresDate.getDate() + expiresInDays);
    
    this.userSessions.set(sessionId, {
      userId,
      expires: expiresDate,
      data: JSON.stringify({ userId })
    });
    
    return sessionId;
  }
  
  async getSessionData(sessionId: string): Promise<any> {
    const session = this.userSessions.get(sessionId);
    if (!session) return null;
    
    // Check if session is expired
    if (new Date() > new Date(session.expires)) {
      await this.destroySession(sessionId);
      return null;
    }
    
    try {
      return JSON.parse(session.data || '{}');
    } catch (e) {
      return {};
    }
  }
  
  async destroySession(sessionId: string): Promise<void> {
    this.userSessions.delete(sessionId);
  }
}

// Use PostgreSQL storage for production, memory storage for development
const storageType = process.env.NODE_ENV === 'production' ? 'postgres' : 'memory';

export const storage = storageType === 'postgres' 
  ? new PostgresStorage() 
  : new MemStorage();
