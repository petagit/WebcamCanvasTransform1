import { Request, Response, NextFunction } from 'express';
import { Clerk } from '@clerk/clerk-sdk-node';

// Initialize Clerk with your secret key
if (!process.env.CLERK_SECRET_KEY) {
  console.error("Missing CLERK_SECRET_KEY environment variable");
}

const clerk = Clerk({ secretKey: process.env.CLERK_SECRET_KEY || 'default_key' });

// Interface for Clerk user data that will be attached to request object
interface ClerkUserData {
  id: string;
  email: string | null;
  username: string;
  profileImageUrl: string | null;
}

// Store clerk user on request
const CLERK_USER_KEY = 'clerkUserData';

// Middleware to authenticate requests with Clerk
export async function clerkMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    // Get the session token from the Authorization header
    const sessionToken = req.headers.authorization?.split(' ')[1];
    
    if (!sessionToken) {
      return res.status(401).json({ error: "Unauthorized - No token provided" });
    }

    // Verify the session token with Clerk
    const session = await clerk.sessions.getSession(sessionToken);
    
    if (!session) {
      return res.status(401).json({ error: "Unauthorized - Invalid token" });
    }

    // Get the user's information from Clerk
    const clerkUser = await clerk.users.getUser(session.userId);
    
    // Attach the Clerk user to the request object using a special key
    const userData: ClerkUserData = {
      id: clerkUser.id,
      username: clerkUser.username || clerkUser.firstName || 'User',
      email: clerkUser.emailAddresses[0]?.emailAddress || null,
      profileImageUrl: clerkUser.profileImageUrl || null,
    };
    
    // Use this approach to store the clerk user data without TypeScript errors
    (req as any)[CLERK_USER_KEY] = userData;

    // Create a req.user object for compatibility with the existing app
    (req as any).user = {
      id: parseInt(clerkUser.id.substring(0, 8), 16) % 10000, // Generate a numeric ID from the Clerk ID
      username: userData.username,
      email: userData.email,
      authProvider: 'clerk',
      profilePicture: userData.profileImageUrl,
      lastLogin: new Date(),
      createdAt: new Date()
    };

    next();
  } catch (error) {
    console.error("Clerk authentication error:", error);
    return res.status(401).json({ error: "Unauthorized - Authentication failed" });
  }
}

// Helper to get clerk user data from a request
export function getClerkUser(req: Request): ClerkUserData | null {
  return (req as any)[CLERK_USER_KEY] || null;
}

// A protected route middleware
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const clerkUser = getClerkUser(req);
  if (!clerkUser) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  next();
}