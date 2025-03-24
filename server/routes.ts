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

dotenv.config();

// Initialize Stripe
const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' as any })
  : null;

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
    // Create a safer callback URL that will work in production
    const callbackURL = '/auth/google/callback';
    
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
    // Create a safer callback URL that will work in production
    const callbackURL = '/auth/github/callback';
    
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
  // Configure session
  app.use(session({
    secret: process.env.SESSION_SECRET || 'pixelcam_session_secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    }
  }));
  
  // Initialize Passport
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
      failureRedirect: "/login" 
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
      failureRedirect: "/login" 
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
  
  // Webhook to handle Stripe events
  app.post('/webhook/stripe', async (req, res) => {
    if (!stripe) {
      return res.status(500).json({ error: "Stripe is not configured" });
    }
    
    const sig = req.headers['stripe-signature'] as string;
    if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
      return res.status(400).json({ error: "Missing signature" });
    }
    
    let event;
    
    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error("Webhook error:", err);
      return res.status(400).json({ error: `Webhook Error: ${err.message}` });
    }
    
    // Handle the event
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        const subscription = event.data.object;
        await handleSubscriptionUpdated(subscription);
        break;
      case 'customer.subscription.deleted':
        const canceledSubscription = event.data.object;
        await handleSubscriptionCanceled(canceledSubscription);
        break;
      default:
        console.log(`Unhandled event type ${event.type}`);
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

  return httpServer;
}
