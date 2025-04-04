import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as GitHubStrategy } from "passport-github2";
import { WebSocketServer } from "ws";
import { storage } from "./storage";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import Stripe from "stripe";
import { z } from "zod";
import { insertUserSchema } from "@shared/schema";
import { clerkMiddleware, requireAuth as clerkRequireAuth, getClerkUser } from "./clerk-middleware";

dotenv.config();

// Initialize Stripe with more robust error checking
let stripe: Stripe | null = null;

// Global variable to track debug credits for non-authenticated users
let simulatedDebugCredits = 100;

try {
  // Check if the key exists and has proper format
  const secretKey = process.env.STRIPE_SECRET_KEY || '';
  
  // Enhanced validation with better logging
  if (!secretKey) {
    console.error("CRITICAL: Missing Stripe secret key (STRIPE_SECRET_KEY).");
    console.error("Payment processing will be unavailable.");
  } else if (!(secretKey.startsWith('sk_test_') || secretKey.startsWith('sk_live_'))) {
    console.error("CRITICAL: Invalid Stripe secret key format.");
    console.error("The key should start with sk_live_ or sk_test_ but found:", 
      `${secretKey.substring(0, 4)}...`);
    console.error("Payment processing will be unavailable.");
  } else {
    // Only initialize if the key exists and has proper format
    try {
      // Use a valid API version that TypeScript recognizes
      stripe = new Stripe(secretKey, { 
        apiVersion: '2023-10-16' as Stripe.LatestApiVersion,
        typescript: true,
      });
      
      // Log success with key type information for debugging
      console.log("✓ Stripe initialized successfully with key type:", 
        secretKey.startsWith('sk_test_') ? 'TEST KEY' : 'LIVE KEY');
        
      // Validate the key with a quick API call
      stripe.customers.list({ limit: 1 })
        .then(() => console.log("✓ Stripe API key verified successfully"))
        .catch(e => {
          console.error("CRITICAL: Stripe API key validation failed:", e.message);
          console.error("Payment processing will be unavailable.");
          stripe = null; // Invalidate the stripe instance if validation fails
        });
    } catch (initError) {
      console.error("Failed to initialize Stripe:", initError);
      stripe = null;
    }
  }
} catch (error) {
  console.error("Unexpected error initializing Stripe:", error);
  stripe = null;
}
  
// Credit package definitions - must match the packages defined in the client
const CREDIT_PACKAGES = [
  { id: 'basic', name: 'Basic', credits: 50, amount: 499, formattedPrice: '$4.99', description: '50 credits for image processing' },
  { id: 'plus', name: 'Plus', credits: 150, amount: 999, formattedPrice: '$9.99', description: '150 credits for image processing' },
  { id: 'premium', name: 'Premium', credits: 500, amount: 1999, formattedPrice: '$19.99', description: '500 credits for image processing' }
];

// User authentication middleware
function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: "Not authenticated" });
}

// Check subscription status middleware
async function hasActiveSubscription(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const userId = (req.user as any).id;
    const subscription = await storage.getSubscription(userId);

    if (subscription && (subscription.status === 'active' || subscription.status === 'free')) {
      return next();
    }

    res.status(403).json({ 
      error: "Subscription required",
      subscriptionStatus: subscription ? subscription.status : 'none'
    });
  } catch (error) {
    console.error("Error checking subscription:", error);
    res.status(500).json({ error: "Failed to check subscription status" });
  }
}

// Configure Passport
function configurePassport() {
  // Serialize/deserialize user
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  // Local strategy
  passport.use(new LocalStrategy(
    { usernameField: 'username', passwordField: 'password' },
    async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);

        if (!user) {
          return done(null, false, { message: 'Incorrect username.' });
        }

        if (!user.password) {
          return done(null, false, { message: 'Invalid login method.' });
        }

        const isValid = await bcrypt.compare(password, user.password);

        if (!isValid) {
          return done(null, false, { message: 'Incorrect password.' });
        }

        // Update last login time
        await storage.updateUserLastLogin(user.id);

        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  ));

  // Google OAuth Strategy
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    // Create a safer callback URL that will work in production and development
    const callbackURL = `${process.env.HOST_URL}/auth/google/callback`;

    console.log('Google OAuth callback URL:', callbackURL);

    passport.use(new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Check if user already exists
        let user = await storage.getUserByProviderId(profile.id);

        if (!user) {
          // Create new user if doesn't exist
          user = await storage.createUser({
            username: `${profile.displayName.replace(/\s+/g, '')}_${profile.id.substring(0, 5)}`,
            email: profile.emails && profile.emails[0] ? profile.emails[0].value : null,
            authProvider: 'google',
            providerId: profile.id,
            profilePicture: profile.photos && profile.photos[0] ? profile.photos[0].value : null
          });
        } else {
          // Update last login time
          await storage.updateUserLastLogin(user.id);
        }

        return done(null, user);
      } catch (err) {
        return done(err as Error);
      }
    }));
  }

  // GitHub OAuth Strategy
  if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    // Create a safer callback URL that will work in production and development
    const callbackURL = `${process.env.HOST_URL}/auth/github/callback`;

    console.log('GitHub OAuth callback URL:', callbackURL);

    passport.use(new GitHubStrategy({
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Check if user already exists
        let user = await storage.getUserByProviderId(profile.id);

        if (!user) {
          // Create new user if doesn't exist
          user = await storage.createUser({
            username: profile.username || `github_${profile.id}`,
            email: profile.emails && profile.emails[0] ? profile.emails[0].value : null,
            authProvider: 'github',
            providerId: profile.id,
            profilePicture: profile.photos && profile.photos[0] ? profile.photos[0].value : null
          });
        } else {
          // Update last login time
          await storage.updateUserLastLogin(user.id);
        }

        return done(null, user);
      } catch (err) {
        return done(err as Error);
      }
    }));
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Configure session for traditional auth
  app.use(session({
    secret: process.env.SESSION_SECRET || 'pixelcam_session_secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    }
  }));

  // Initialize Passport for traditional auth
  app.use(passport.initialize());
  app.use(passport.session());
  configurePassport();

  // Setup WebSockets
  const httpServer = createServer(app);
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws) => {
    ws.on('message', (message) => {
      // Process WebSocket messages if needed
      console.log('Received message:', message);
    });
  });

  // API endpoint to get the status of the server
  app.get("/api/status", (req: Request, res: Response) => {
    res.json({ 
      status: "ok",
      authenticated: req.isAuthenticated(),
      user: req.user ? {
        id: (req.user as any).id,
        username: (req.user as any).username,
        profilePicture: (req.user as any).profilePicture
      } : null
    });
  });

  // API endpoint to get current user info
  app.get("/api/user", (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    res.json(req.user);
  });

  // Auth routes
  // Local auth
  app.post("/auth/login", (req, res, next) => {
    passport.authenticate('local', (err, user, info) => {
      if (err) { 
        return next(err); 
      }
      if (!user) { 
        return res.status(401).json({ error: info.message }); 
      }
      req.logIn(user, (err) => {
        if (err) { 
          return next(err); 
        }
        return res.json({ 
          success: true, 
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            profilePicture: user.profilePicture
          }
        });
      });
    })(req, res, next);
  });

  // Local register
  app.post("/auth/register", async (req, res) => {
    try {
      // Validate request body using the schema
      const registerSchema = insertUserSchema
        .extend({
          password: z.string().min(6),
          email: z.string().email()
        })
        .omit({ providerId: true, profilePicture: true, authProvider: true });

      const validationResult = registerSchema.safeParse(req.body);

      if (!validationResult.success) {
        return res.status(400).json({ 
          error: "Invalid input", 
          details: validationResult.error.errors 
        });
      }

      const { username, email, password } = validationResult.data;

      // Check if username or email already exists
      const existingUsername = await storage.getUserByUsername(username);
      if (existingUsername) {
        return res.status(400).json({ error: "Username already exists" });
      }

      const existingEmail = await storage.getUserByEmail(email);
      if (existingEmail) {
        return res.status(400).json({ error: "Email already exists" });
      }

      // Create user
      const user = await storage.createUser({
        username,
        email,
        password,
        authProvider: 'local'
      });

      // Create a free subscription
      await storage.createSubscription({
        userId: user.id,
        status: 'free'
      });

      // Log the user in
      req.logIn(user, (err) => {
        if (err) { 
          return res.status(500).json({ error: "Error logging in" }); 
        }
        return res.json({ 
          success: true, 
          user: {
            id: user.id,
            username: user.username,
            email: user.email
          }
        });
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ error: "Registration failed" });
    }
  });

  // Google OAuth routes
  app.get("/auth/google", passport.authenticate("google", { 
    scope: ["profile", "email"] 
  }));

  app.get("/auth/google/callback", 
    passport.authenticate("google", { 
      failureRedirect: "/auth" 
    }),
    (req, res) => {
      // Successful authentication, redirect home
      res.redirect("/");
    }
  );

  // GitHub OAuth routes
  app.get("/auth/github", passport.authenticate("github", { 
    scope: ["user:email"] 
  }));

  app.get("/auth/github/callback", 
    passport.authenticate("github", { 
      failureRedirect: "/auth" 
    }),
    (req, res) => {
      // Successful authentication, redirect home
      res.redirect("/");
    }
  );

  // Logout
  app.get("/auth/logout", (req, res) => {
    req.logout((err) => {
      if (err) { 
        return res.status(500).json({ error: "Error logging out" }); 
      }
      res.json({ success: true });
    });
  });
  
  // Clerk Auth Routes
  app.get("/api/clerk/user", clerkMiddleware, (req, res) => {
    const clerkUser = getClerkUser(req);
    if (!clerkUser) {
      return res.status(401).json({ error: "Not authenticated with Clerk" });
    }
    res.json({
      id: (req.user as any).id,
      username: (req.user as any).username,
      email: (req.user as any).email,
      profilePicture: (req.user as any).profilePicture,
      authProvider: 'clerk'
    });
  });
  
  // Protected route using Clerk auth
  app.get("/api/clerk/protected", clerkMiddleware, clerkRequireAuth, (req, res) => {
    res.json({ 
      message: "This is a protected route accessible with Clerk auth",
      user: {
        id: (req.user as any).id,
        username: (req.user as any).username
      } 
    });
  });

  // User profile route
  app.get("/api/user/profile", isAuthenticated, (req, res) => {
    res.json({
      id: (req.user as any).id,
      username: (req.user as any).username,
      email: (req.user as any).email,
      profilePicture: (req.user as any).profilePicture,
      authProvider: (req.user as any).authProvider
    });
  });

  // Subscription routes
  app.get("/api/subscription", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const subscription = await storage.getSubscription(userId);

      res.json(subscription || { status: 'none' });
    } catch (error) {
      console.error("Error fetching subscription:", error);
      res.status(500).json({ error: "Failed to fetch subscription" });
    }
  });

  // Create a checkout session for subscription
  app.post("/api/subscription/checkout", isAuthenticated, async (req, res) => {
    if (!stripe) {
      return res.status(500).json({ error: "Stripe is not configured" });
    }

    try {
      const userId = (req.user as any).id;
      const user = req.user as any;

      // Create or get Stripe customer
      let subscription = await storage.getSubscription(userId);
      let customerId = subscription?.stripeCustomerId;

      if (!customerId) {
        // Create a new customer
        const customer = await stripe.customers.create({
          email: user.email,
          name: user.username,
          metadata: {
            userId: userId.toString()
          }
        });

        customerId = customer.id;

        // Save customer ID
        if (subscription) {
          await storage.updateSubscription(subscription.id, {
            stripeCustomerId: customerId
          });
        } else {
          subscription = await storage.createSubscription({
            userId,
            stripeCustomerId: customerId,
            status: 'free'
          });
        }
      }

      // Create checkout session
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [
          {
            price: process.env.SUBSCRIPTION_PRICE_ID,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: `/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `/subscription/cancel`,
        metadata: {
          userId: userId.toString()
        }
      });

      res.json({ sessionId: session.id, url: session.url });
    } catch (error) {
      console.error("Error creating checkout session:", error);
      res.status(500).json({ error: "Failed to create checkout session" });
    }
  });

  // Handle successful subscription
  app.get("/api/subscription/success", isAuthenticated, async (req, res) => {
    if (!stripe) {
      return res.status(500).json({ error: "Stripe is not configured" });
    }

    try {
      const sessionId = req.query.session_id as string;
      if (!sessionId) {
        return res.status(400).json({ error: "Missing session ID" });
      }

      // Retrieve the session
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }

      const userId = (req.user as any).id;
      const subscription = await storage.getSubscription(userId);

      if (subscription) {
        // Update subscription status
        await storage.updateSubscription(subscription.id, {
          status: 'active',
          stripeSubscriptionId: session.subscription as string,
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
        });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error processing subscription success:", error);
      res.status(500).json({ error: "Failed to process subscription" });
    }
  });

  // Cancel subscription
  app.post("/api/subscription/cancel", isAuthenticated, async (req, res) => {
    if (!stripe) {
      return res.status(500).json({ error: "Stripe is not configured" });
    }

    try {
      const userId = (req.user as any).id;
      const subscription = await storage.getSubscription(userId);

      if (!subscription || !subscription.stripeSubscriptionId) {
        return res.status(404).json({ error: "No active subscription found" });
      }

      // Cancel the subscription in Stripe
      await stripe.subscriptions.cancel(subscription.stripeSubscriptionId);

      // Update subscription status in database
      await storage.updateSubscription(subscription.id, {
        status: 'cancelled'
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error canceling subscription:", error);
      res.status(500).json({ error: "Failed to cancel subscription" });
    }
  });

  // API endpoint to get a list of captured media
  app.get("/api/media", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      const media = await storage.getCapturedMedia(userId);
      res.json(media);
    } catch (error) {
      console.error("Error fetching media:", error);
      res.status(500).json({ error: "Failed to fetch media" });
    }
  });

  // API endpoint to save captured media
  app.post("/api/media", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;

      // Validate request body
      const { mediaType, mediaUrl } = req.body;

      if (!mediaType || !mediaUrl) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      if (mediaType !== 'image' && mediaType !== 'video') {
        return res.status(400).json({ error: "Invalid media type" });
      }

      const media = await storage.createCapturedMedia({
        userId,
        mediaType,
        mediaUrl
      });

      res.json(media);
    } catch (error) {
      console.error("Error saving media:", error);
      res.status(500).json({ error: "Failed to save media" });
    }
  });

  // API endpoint to delete captured media
  app.delete("/api/media/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      const mediaId = parseInt(req.params.id, 10);

      if (isNaN(mediaId)) {
        return res.status(400).json({ error: "Invalid media ID" });
      }

      // First check if the media belongs to the user
      const media = await storage.getCapturedMediaById(mediaId);

      if (!media) {
        return res.status(404).json({ error: "Media not found" });
      }

      if (media.userId !== userId) {
        return res.status(403).json({ error: "You don't have permission to delete this media" });
      }

      // Delete the media
      await storage.deleteCapturedMedia(mediaId);

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting media:", error);
      res.status(500).json({ error: "Failed to delete media" });
    }
  });

  // Simulated debug credits for anonymous users
  let simulatedDebugCredits = 30;
  
  // Credit system API routes - with debug bypass option
  app.get("/api/credits", async (req: Request, res: Response) => {
    console.log("Credits endpoint called - debug mode enabled");
    
    try {
      // Debug mode for testing without authentication
      const DEBUG_MODE = true; // Set to false in production
      
      console.log("Auth headers:", req.headers.authorization ? "Present" : "Missing");
      
      if (DEBUG_MODE) {
        // For debugging only - bypass authentication
        console.log("Debug mode enabled - bypassing strict auth checks");
        
        try {
          // Try to get user but don't error out if we can't
          const clerkUser = getClerkUser(req);
          console.log("Clerk user:", clerkUser ? "Found" : "Not found");
          
          if (clerkUser && clerkUser.email) {
            const user = await storage.getUserByEmail(clerkUser.email);
            if (user) {
              const credits = await storage.getUserCredits(user.id);
              console.log(`Found user ${user.id} with ${credits} credits`);
              return res.status(200).json({ credits, debug: false });
            }
          }
          
          // If authentication failed or user not found, return debug credits
          console.log(`No authenticated user found, returning debug credits: ${simulatedDebugCredits}`);
          return res.status(200).json({ credits: simulatedDebugCredits, debug: true });
        } catch (e) {
          console.error("Error in auth flow:", e);
          return res.status(200).json({ credits: simulatedDebugCredits, debug: true });
        }
      } else {
        // Normal production flow with authentication required
        // Apply auth middleware manually since we removed it from the route definition
        if (!req.isAuthenticated() && !getClerkUser(req)) {
          return res.status(401).json({ error: "Not authenticated" });
        }
        
        const clerkUser = getClerkUser(req);
        if (!clerkUser || !clerkUser.email) {
          return res.status(401).json({ error: "Unauthorized - user email required" });
        }
        
        const user = await storage.getUserByEmail(clerkUser.email);
        if (!user) {
          return res.status(404).json({ error: "User not found" });
        }
        
        const credits = await storage.getUserCredits(user.id);
        return res.status(200).json({ credits });
      }
    } catch (error) {
      console.error("Error fetching user credits:", error);
      return res.status(500).json({ error: "Failed to fetch credits" });
    }
  });
  
  // Consume credits
  app.post("/api/credits/consume", async (req: Request, res: Response) => {
    try {
      const { amount = 30 } = req.body; // Default to 30 credits for image processing
      
      // Debug mode for testing
      const DEBUG_MODE = true; // Set to false in production

      console.log("Credit consumption endpoint called");
      console.log("Auth headers:", req.headers.authorization ? "Present" : "Missing");
      
      // Try to get the authenticated user
      const clerkUser = getClerkUser(req);
      
      // If debug mode is enabled or user is not authenticated
      if (DEBUG_MODE || !clerkUser) {
        console.log("Debug mode or non-authenticated user");
        
        // Check if they have enough credits
        if (simulatedDebugCredits < amount) {
          console.log(`Insufficient debug credits: ${simulatedDebugCredits} < ${amount}`);
          return res.status(402).json({ 
            error: "Insufficient credits", 
            credits: simulatedDebugCredits,
            required: amount,
            debug: true
          });
        }
        
        // If they have enough credits, simulate consumption
        simulatedDebugCredits = Math.max(0, simulatedDebugCredits - amount);
        console.log(`Simulated debug credits reduced by ${amount} to ${simulatedDebugCredits}`);
        
        return res.status(200).json({ 
          success: true, 
          credits: simulatedDebugCredits,
          debug: true
        });
      }
      
      // For authenticated users, proceed with normal flow
      if (!clerkUser.email) {
        return res.status(401).json({ error: "Unauthorized - user email required" });
      }
      
      const user = await storage.getUserByEmail(clerkUser.email);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Check if user has enough credits
      const currentCredits = await storage.getUserCredits(user.id);
      if (currentCredits < amount) {
        return res.status(402).json({ 
          error: "Insufficient credits", 
          credits: currentCredits,
          required: amount
        });
      }
      
      // Deduct credits
      const updatedUser = await storage.updateUserCredits(user.id, currentCredits - amount);
      
      // Record transaction
      await storage.createTransaction({
        userId: user.id,
        amount: amount,
        type: 'usage',
        description: 'Image processing'
      });
      
      return res.status(200).json({ 
        success: true, 
        credits: updatedUser ? await storage.getUserCredits(user.id) : currentCredits - amount 
      });
    } catch (error) {
      console.error("Error consuming credits:", error);
      return res.status(500).json({ error: "Failed to process credit consumption" });
    }
  });
  
  // Purchase credits with Stripe Checkout
  app.post("/api/checkout/create-session", clerkRequireAuth, async (req: Request, res: Response) => {
    if (!stripe) {
      return res.status(500).json({ error: "Stripe is not configured" });
    }
    
    try {
      const { packageId } = req.body;
      
      // Define credit packages
      const creditPackages = {
        'basic': { 
          credits: 50, 
          amount: 499, 
          name: 'Basic Credit Package',
          description: '50 credits for image processing'
        },
        'plus': { 
          credits: 150, 
          amount: 999,
          name: 'Plus Credit Package',
          description: '150 credits for image processing'
        },
        'premium': { 
          credits: 500, 
          amount: 1999,
          name: 'Premium Credit Package',
          description: '500 credits for image processing'  
        }
      };
      
      // Validate package selection
      if (!packageId || !creditPackages[packageId as keyof typeof creditPackages]) {
        return res.status(400).json({ error: "Invalid package selected" });
      }
      
      const selectedPackage = creditPackages[packageId as keyof typeof creditPackages];
      
      const clerkUser = getClerkUser(req);
      if (!clerkUser || !clerkUser.email) {
        return res.status(401).json({ error: "Unauthorized - user email required" });
      }
      
      const user = await storage.getUserByEmail(clerkUser.email);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Create a Checkout Session
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: selectedPackage.name,
                description: selectedPackage.description,
              },
              unit_amount: selectedPackage.amount, // Amount in cents
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${process.env.HOST_URL || req.headers.origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.HOST_URL || req.headers.origin}/payment-cancel`,
        customer_email: clerkUser.email || undefined,
        metadata: {
          userId: user.id.toString(),
          credits: selectedPackage.credits.toString(),
          packageId
        },
      });
      
      // Return the session ID
      res.json({
        sessionId: session.id,
        amount: selectedPackage.amount,
        credits: selectedPackage.credits
      });
    } catch (error) {
      console.error("Error creating checkout session:", error);
      res.status(500).json({ error: "Failed to create checkout session" });
    }
  });
  
  // Keep the old endpoint for compatibility (redirect to the new implementation)
  app.post("/api/credits/purchase", clerkRequireAuth, (req: Request, res: Response) => {
    // Redirect to the new endpoint
    req.url = '/api/checkout/create-session';
    app._router.handle(req, res);
  });
  
  // Endpoint to add debug credits for non-authenticated users
  app.post("/api/debug/add-credits", async (req: Request, res: Response) => {
    try {
      // Validate there's no authenticated user
      const clerkUser = getClerkUser(req);
      if (clerkUser) {
        return res.status(400).json({ error: "This endpoint is only for anonymous users" });
      }
      
      // Add credits to the simulated credits for testing
      const { amount = 50 } = req.body;
      simulatedDebugCredits += amount;
      console.log(`Added ${amount} debug credits. New total: ${simulatedDebugCredits}`);
      
      return res.status(200).json({
        success: true,
        credits: simulatedDebugCredits,
        debug: true
      });
    } catch (error) {
      console.error("Error adding debug credits:", error);
      return res.status(500).json({ error: "Failed to add credits" });
    }
  });
  
  // Direct checkout endpoint that doesn't use Clerk auth for troubleshooting
  app.post("/api/checkout/direct-session", async (req: Request, res: Response) => {
    console.log("Direct checkout endpoint called");
    console.log("Request body:", JSON.stringify(req.body));
    
    // Debug Stripe API key (safe to log partial key for debugging)
    const stripeKey = process.env.STRIPE_SECRET_KEY || '';
    console.log("Using Stripe key type:", 
      stripeKey.startsWith('sk_live_') ? 'LIVE' : 
      stripeKey.startsWith('sk_test_') ? 'TEST' : 
      'INVALID/MISSING');
    
    try {
      if (!stripe) {
        console.error("Stripe is not properly configured. STRIPE_SECRET_KEY may be missing or invalid.");
        console.error("Key prefix:", stripeKey ? stripeKey.substring(0, 8) : 'undefined');
        
        // Force recreate the Stripe client on demand with error handling
        if (stripeKey && (stripeKey.startsWith('sk_test_') || stripeKey.startsWith('sk_live_'))) {
          console.log("Attempting to recreate Stripe client on demand...");
          try {
            const recreatedStripe = new Stripe(stripeKey, { 
              apiVersion: '2023-10-16' as Stripe.LatestApiVersion 
            });
            
            // Test the client with a simple API call
            const test = await recreatedStripe.customers.list({ limit: 1 });
            
            // If we get here, the client works
            console.log("Successfully recreated Stripe client with API key!");
            stripe = recreatedStripe; // Replace the global instance
          } catch (recreateError) {
            console.error("Failed to recreate Stripe client:", recreateError);
          }
        }
        
        // If we still don't have a Stripe client, return error
        if (!stripe) {
          return res.status(500).json({ 
            error: "Payment system is not configured", 
            details: "The application is missing payment credentials. Please contact support."
          });
        }
      }
    } catch (initError) {
      console.error("Error initializing Stripe in checkout endpoint:", initError);
      return res.status(500).json({ 
        error: "Payment system error",
        details: "Error initializing payment system"
      });
    }
    
    try {
      console.log("Direct checkout endpoint called, bypassing Clerk auth");
      console.log("Stripe instance available:", !!stripe);
      
      if (!stripe) {
        console.error("Stripe is not configured properly. Check STRIPE_SECRET_KEY.");
        return res.status(500).json({ 
          error: "Stripe is not configured properly",
          details: "Server configuration issue with payment processor"
        });
      }
      
      const { packageId, email } = req.body;
      
      if (!packageId) {
        return res.status(400).json({ error: "Package ID is required" });
      }
      
      // Get the package information
      const selectedPackage = CREDIT_PACKAGES.find(pkg => pkg.id === packageId);
      if (!selectedPackage) {
        return res.status(400).json({ error: "Invalid package ID" });
      }
      
      console.log("Processing package:", selectedPackage.id);
      
      // Use a temporary user ID for testing only
      const mockUserId = 9999;
      
      // Create a Checkout Session with clear product name showing the credits
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: `${selectedPackage.name} Credit Package`,
                description: `${selectedPackage.credits} credits for image processing`,
                metadata: {
                  credits: selectedPackage.credits.toString(),
                },
              },
              unit_amount: selectedPackage.amount, // Amount in cents
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${process.env.HOST_URL || req.headers.origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.HOST_URL || req.headers.origin}/payment-cancel`,
        customer_email: email || undefined,
        metadata: {
          userId: mockUserId.toString(),
          credits: selectedPackage.credits.toString(),
          packageId
        },
      });
      
      console.log(`Created checkout session ${session.id} for ${selectedPackage.credits} credits`);
      
      // Return the session ID
      res.json({
        sessionId: session.id,
        amount: selectedPackage.amount,
        credits: selectedPackage.credits
      });
    } catch (error) {
      console.error("Error creating direct checkout session:", error);
      let errorMessage = "Failed to create checkout session";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      res.status(500).json({ 
        error: errorMessage,
        details: "This might be due to a missing or invalid Stripe secret key"
      });
    }
  });
  
  // Handle successful checkout
  app.post("/api/checkout/success", clerkRequireAuth, async (req: Request, res: Response) => {
    if (!stripe) {
      return res.status(500).json({ error: "Stripe is not configured" });
    }
    
    try {
      const { sessionId } = req.body;
      
      if (!sessionId) {
        return res.status(400).json({ error: "Missing session ID" });
      }
      
      // Retrieve the session from Stripe
      const session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['line_items', 'payment_intent']
      });
      
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      
      // Verify payment status
      if (session.payment_status !== 'paid') {
        return res.status(400).json({ 
          error: "Payment not completed", 
          status: session.payment_status 
        });
      }
      
      // Extract user ID and credits from metadata
      const userId = session.metadata?.userId;
      const creditsToAdd = session.metadata?.credits;
      
      if (!userId || !creditsToAdd) {
        return res.status(400).json({ error: "Invalid session metadata" });
      }
      
      // Get the authenticated user
      const clerkUser = getClerkUser(req);
      if (!clerkUser || !clerkUser.email) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const user = await storage.getUserByEmail(clerkUser.email);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Verify the authenticated user matches the payment metadata
      if (user.id.toString() !== userId) {
        return res.status(403).json({ error: "User mismatch" });
      }
      
      // Get current credits and add the purchased amount
      const currentCredits = await storage.getUserCredits(user.id);
      const credits = parseInt(creditsToAdd, 10);
      
      // Update user credits
      await storage.updateUserCredits(user.id, currentCredits + credits);
      
      // Record the transaction
      await storage.createTransaction({
        userId: user.id,
        amount: credits,
        type: 'purchase',
        description: `Purchased ${credits} credits`
      });
      
      // Return success response
      res.json({
        success: true,
        credits: credits,
        totalCredits: currentCredits + credits
      });
    } catch (error) {
      console.error("Error processing checkout success:", error);
      res.status(500).json({ error: "Failed to process payment" });
    }
  });

  // Webhook to handle Stripe events
  app.post('/webhook/stripe', async (req, res) => {
    if (!stripe) {
      return res.status(500).json({ error: "Stripe is not configured" });
    }

    let event;

    try {
      const sig = req.headers['stripe-signature'];
      if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
        throw new Error("Missing webhook signature");
      }

      // Raw body verification for webhook security
      const rawBody = req.body;
      event = stripe.webhooks.constructEvent(
        rawBody,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET,
        { tolerance: 300 } // 5 minute tolerance for timestamp verification
      );
    } catch (err: any) {
      console.error("Webhook signature verification failed:", err.message);
      return res.status(400).json({ 
        error: "Webhook signature verification failed",
        code: 'webhook_signature_verification_failed'
      });
    }

    // Handle the event with improved type safety
    try {
      switch (event.type) {
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
        case 'customer.subscription.resumed':
          const subscription = event.data.object;
          await handleSubscriptionUpdated(subscription);
          break;
          
        case 'customer.subscription.deleted':
        case 'customer.subscription.paused':
          const canceledSubscription = event.data.object;
          await handleSubscriptionCanceled(canceledSubscription);
          break;
          
        case 'payment_intent.succeeded':
          const paymentIntent = event.data.object;
          await handlePaymentIntentSucceeded(paymentIntent);
          break;
          
        case 'payment_intent.payment_failed':
          const failedPayment = event.data.object;
          console.error('Payment failed:', failedPayment.id);
          // Could add notification logic here
          break;
          
        default:
          console.log(`Unhandled event type ${event.type}`);
      }

      res.json({ received: true });
    } catch (err) {
      console.error('Error processing webhook:', err);
      res.status(500).json({ 
        error: 'Webhook processing failed',
        code: 'webhook_processing_failed'
      });
    }

    res.json({ received: true });
  });

  // Helper function to handle subscription updates
  async function handleSubscriptionUpdated(subscription: any) {
    try {
      const customerId = subscription.customer;

      // Find user by customer ID
      const allSubscriptions = await Promise.all(
        (await storage.getAllSubscriptions()).filter(
          sub => sub.stripeCustomerId === customerId
        )
      );

      if (allSubscriptions.length > 0) {
        for (const sub of allSubscriptions) {
          await storage.updateSubscription(sub.id, {
            stripeSubscriptionId: subscription.id,
            status: subscription.status === 'active' ? 'active' : 'expired',
            currentPeriodStart: new Date(subscription.current_period_start * 1000),
            currentPeriodEnd: new Date(subscription.current_period_end * 1000)
          });
        }
      }
    } catch (error) {
      console.error("Error handling subscription update:", error);
    }
  }

  // Helper function to handle subscription cancellation
  async function handleSubscriptionCanceled(subscription: any) {
    try {
      const customerId = subscription.customer;

      // Find user by customer ID
      const allSubscriptions = await Promise.all(
        (await storage.getAllSubscriptions()).filter(
          sub => sub.stripeCustomerId === customerId
        )
      );

      if (allSubscriptions.length > 0) {
        for (const sub of allSubscriptions) {
          await storage.updateSubscription(sub.id, {
            status: 'cancelled'
          });
        }
      }
    } catch (error) {
      console.error("Error handling subscription cancellation:", error);
    }
  }
  
  // Helper function to handle successful credit purchases
  async function handlePaymentIntentSucceeded(paymentIntent: any) {
    try {
      // Extract metadata from the payment intent
      const { userId, credits } = paymentIntent.metadata;
      
      if (!userId || !credits) {
        console.error("Missing metadata in payment intent:", paymentIntent.id);
        return;
      }
      
      console.log(`Processing payment intent ${paymentIntent.id} for user ${userId} with ${credits} credits`);
      
      // For mock/anonymous purchases during testing, we'll skip the database update
      if (userId === '9999') {
        console.log("Skipping database update for test purchase with mockUserId");
        return;
      }
      
      const user = await storage.getUser(parseInt(userId, 10));
      if (!user) {
        console.error("User not found for payment intent:", paymentIntent.id);
        return;
      }
      
      // Get current credits and add the purchased amount
      const currentCredits = await storage.getUserCredits(user.id);
      const creditsToAdd = parseInt(credits, 10);
      
      // Update user credits
      await storage.updateUserCredits(user.id, currentCredits + creditsToAdd);
      
      // Record the transaction
      await storage.createTransaction({
        userId: user.id,
        amount: creditsToAdd,
        type: 'purchase',
        description: `Purchased ${creditsToAdd} credits`
      });
      
      console.log(`Credits added: ${creditsToAdd} to user ID: ${userId}. New balance: ${currentCredits + creditsToAdd}`);
    } catch (error) {
      console.error("Error processing payment success:", error);
    }
  }

  return httpServer;
}