import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, AlertTriangle, CheckCircle, Zap } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

// Extended Clerk type definition
declare global {
  // Extended Window interface to include Clerk properties for TypeScript
  interface Window {
    Clerk?: {
      session?: {
        getToken: (options?: { template?: string }) => Promise<string | null>;
        id?: string;
        lastActiveAt?: string;
      };
      user?: {
        id?: string;
      };
    };
  }
}

// Load stripe outside component render cycle with robust error handling
// Use a hardcoded key because Vite environment variables might not work in production
const STRIPE_PUBLIC_KEY = "pk_live_51R62jHP8bQI1a1tryYLifm1N8jCRSg9BVq94r564A3h8WAUfus4lDmPxcCLUVndUCuKgtE8Kr758Hdj013RNfnyZ0015B4KwIj";
const stripeKey = STRIPE_PUBLIC_KEY;
console.log("Using hardcoded Stripe public key to avoid env variable issues");

// Create a properly typed stripe promise
let stripePromise: Promise<any> | null = null;

try {
  // Validate Stripe key format before attempting to load Stripe
  if (!stripeKey) {
    console.error("Missing Stripe public key. Payments will not work.");
  } else if (!stripeKey.startsWith('pk_')) {
    console.error("Invalid Stripe public key format. Key should start with 'pk_'.");
    console.error("Actual key prefix:", stripeKey.substring(0, 4));
  } else {
    console.log("Initializing Stripe with public key:", stripeKey.substring(0, 8) + '...');
    stripePromise = loadStripe(stripeKey);
  }
} catch (error) {
  console.error("Failed to initialize Stripe:", error);
}

// Credit package definitions
const CREDIT_PACKAGES = [
  { id: 'basic', name: 'Basic', credits: 50, amount: 499, formattedPrice: '$4.99' },
  { id: 'plus', name: 'Plus', credits: 150, amount: 999, formattedPrice: '$9.99' },
  { id: 'premium', name: 'Premium', credits: 500, amount: 1999, formattedPrice: '$19.99' }
];

// Function to add free credits for anonymous users
async function addFreeCredits(): Promise<boolean> {
  try {
    const response = await fetch('/api/debug/add-credits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: 50 })
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log("Added free credits:", data);
      
      // Invalidate credits cache to refresh the display
      window.location.reload();
      return true;
    } else {
      console.error("Error adding free credits:", response.status);
      return false;
    }
  } catch (error) {
    console.error("Error in free credits request:", error);
    return false;
  }
}

// Package selection component
function PackageSelection({ 
  onSelectPackage, 
  isAnonymousUser 
}: { 
  onSelectPackage: (packageId: string) => void,
  isAnonymousUser: boolean 
}) {
  return (
    <div className="grid grid-cols-1 gap-4">
      {isAnonymousUser && (
        <div className="p-4 border border-yellow-500/30 bg-yellow-500/10 rounded-md mb-2">
          <h3 className="text-lg font-medium flex items-center text-yellow-400">
            <AlertTriangle className="h-5 w-5 mr-2" />
            Demo Mode
          </h3>
          <p className="mt-2 text-sm text-foreground/80">
            You're not logged in. Click the button below to add free credits without payment for testing.
          </p>
          <Button 
            onClick={addFreeCredits}
            className="mt-4 bg-yellow-500/80 hover:bg-yellow-500 text-black"
          >
            <Zap className="h-4 w-4 mr-2" />
            Add 50 Free Credits
          </Button>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {CREDIT_PACKAGES.map(pkg => (
          <Card key={pkg.id} className="flex flex-col border border-border/20 bg-transparent rounded-sm">
            <CardHeader>
              <CardTitle className="font-serif text-primary text-lg">{pkg.name}</CardTitle>
              <CardDescription className="text-foreground/70">{pkg.credits} Credits</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
              <p className="text-2xl font-serif text-primary">{pkg.formattedPrice}</p>
              <p className="text-xs text-foreground/60">
                {(pkg.amount / pkg.credits).toFixed(2)} cents per credit
              </p>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={() => onSelectPackage(pkg.id)} 
                className="w-full bg-primary/20 hover:bg-primary/30 text-primary"
                variant="default"
              >
                Select
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}

// Main credit purchase component using Stripe Checkout
export default function CreditPurchase({ onClose }: { onClose: () => void }) {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);
  const [isSignedIn, setIsSignedIn] = useState<boolean>(false);
  const { toast } = useToast();
  
  // Debug auth status on component mount
  useEffect(() => {
    async function checkAuth() {
      if (!window.Clerk) {
        setDebugInfo("Clerk not available");
        return;
      }

      try {
        let isSignedIn = false;
        let userId = "Unknown";
        let sessionId = "No session ID";
        let lastActiveTime = "Unknown";
        
        // Access properties safely with type checking
        if (window.Clerk) {
          const clerk = window.Clerk;
          
          // Check if user exists and has ID
          if (clerk.user && 'id' in clerk.user) {
            isSignedIn = !!clerk.user.id;
            setIsSignedIn(isSignedIn);
            userId = clerk.user.id || "No ID";
          }
          
          // Check if session exists and has properties
          if (clerk.session) {
            if ('id' in clerk.session) {
              sessionId = clerk.session.id || "No session ID";
            }
            
            if ('lastActiveAt' in clerk.session && clerk.session.lastActiveAt) {
              lastActiveTime = new Date(clerk.session.lastActiveAt).toLocaleTimeString();
            }
          }
        }
          
        // Try to get a token
        let tokenAvailable = false;
        let tokenLength = 0;
        try {
          // Type-safe check for getToken method
          if (window.Clerk?.session?.getToken) {
            const token = await window.Clerk.session.getToken();
            tokenAvailable = !!token;
            tokenLength = token?.length || 0;
          }
        } catch (e) {
          console.error("Error getting token:", e);
        }
        
        setDebugInfo(
          `Auth Status: ${isSignedIn ? "Signed In" : "Not Signed In"}\n` +
          `User ID: ${userId}\n` +
          `Session ID: ${sessionId}\n` +
          `Last Active: ${lastActiveTime}\n` +
          `Token Available: ${tokenAvailable}\n` +
          `Token Length: ${tokenLength}`
        );
      } catch (e) {
        setDebugInfo(`Error checking auth: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
    
    checkAuth();
  }, []);
  
  const handleSelectPackage = async (packageId: string) => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      console.log("Starting checkout process for package:", packageId);
      console.log("Stripe public key:", stripeKey ? `${stripeKey.substring(0, 8)}...` : "missing");
      
      // Debug check for Stripe initialization
      if (!stripePromise) {
        console.error("Stripe not initialized. Missing public key or initialization failed.");
        setErrorMessage("Payment system is not properly configured. Please contact support.");
        throw new Error("Stripe not initialized");
      }
      
      // Check for Clerk authentication (but don't fail if not available)
      let userEmail = null;
      let authToken = null;
      
      if (window.Clerk && window.Clerk.session) {
        try {
          authToken = await window.Clerk.session.getToken();
          console.log("Auth token available:", !!authToken);
          
          // Try to get user email from session if available
          if (window.Clerk.user && 'emailAddresses' in window.Clerk.user) {
            const emails = (window.Clerk.user as any).emailAddresses;
            if (emails && emails.length > 0) {
              userEmail = emails[0].emailAddress;
            }
          }
        } catch (authError) {
          console.log("Non-critical auth error:", authError);
          // Continue with checkout even if auth fails
        }
      } else {
        console.log("Clerk not available, proceeding with anonymous checkout");
      }
      
      // Use the direct checkout endpoint (works with or without auth)
      console.log("Using direct checkout endpoint");
      
      // Add detailed debugging of request
      const requestBody = { 
        packageId,
        email: userEmail || 'guest@example.com' 
      };
      console.log("Checkout request payload:", JSON.stringify(requestBody));
      
      const response = await fetch('/api/checkout/direct-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
        },
        body: JSON.stringify(requestBody)
      });
      
      console.log("Checkout response status:", response.status);
      
      // Handle error responses with detailed information
      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (e) {
          errorData = { error: `HTTP error ${response.status}` };
        }
        
        const errorMsg = errorData.error || 'Failed to create checkout session';
        const errorDetails = errorData.details || '';
        
        console.error('Checkout error:', errorMsg);
        console.error('Details:', errorDetails);
        
        // Enhance error message with more helpful information
        let userFriendlyError = errorMsg;
        if (errorMsg.includes("API Key")) {
          userFriendlyError = "Payment system configuration error. Please contact support.";
        }
        
        setErrorMessage(`${userFriendlyError} ${errorDetails ? `(${errorDetails})` : ''}`);
        throw new Error(errorMsg);
      }

      // Successfully received session data
      console.log("Checkout session created successfully");
      const sessionData = await response.json();
      const { sessionId } = sessionData;
      
      console.log("Session ID received:", sessionId ? "Yes" : "No");
      
      if (!sessionId) {
        setErrorMessage("Invalid response from server (missing session ID)");
        throw new Error("Invalid session data");
      }
      
      // Initialize Stripe and redirect to Checkout
      console.log("Initializing Stripe checkout redirect");
      const stripe = await stripePromise;
      
      if (!stripe) {
        console.error("Failed to initialize Stripe client");
        setErrorMessage("Failed to initialize payment system. Please refresh and try again.");
        throw new Error('Failed to load Stripe');
      }
      
      // Redirect to Stripe Checkout
      console.log("Redirecting to Stripe Checkout");
      const { error } = await stripe.redirectToCheckout({
        sessionId
      });
      
      if (error) {
        console.error('Stripe redirect error:', error);
        setErrorMessage(`Payment error: ${error.message || 'Failed to redirect to checkout'}`);
        throw new Error(error.message || 'Failed to redirect to checkout');
      }
      
    } catch (error) {
      console.error('Error creating checkout session:', error);
      const message = error instanceof Error ? error.message : "Failed to initialize checkout";
      setErrorMessage(message);
      toast({
        title: "Checkout Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="pb-6 text-center">
        <h2 className="text-2xl font-bold mb-2 text-primary">Purchase Credits</h2>
        <p className="text-foreground/70">Select a package to purchase credits and enjoy more features</p>
      </div>
      
      {errorMessage && (
        <div className="mb-6 p-4 border border-destructive/30 bg-destructive/10 rounded text-destructive text-sm">
          <p><strong>Error:</strong> {errorMessage}</p>
          <p className="text-xs mt-1 text-destructive/80">
            {errorMessage.includes("Payment system is not configured") ? 
              "The payment system is currently unavailable. Please try again later or contact support." : 
              "Please make sure you're logged in and try again."}
          </p>
        </div>
      )}
      
      {debugInfo && (
        <div className="mb-6 p-4 border border-border/30 bg-muted/20 rounded text-muted-foreground text-xs">
          <p className="font-medium mb-1">Auth Debug Info:</p>
          <pre className="whitespace-pre-wrap">{debugInfo}</pre>
        </div>
      )}
      
      {isLoading ? (
        <div className="flex flex-col justify-center items-center py-16">
          <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
          <p className="text-foreground/70">Preparing checkout...</p>
        </div>
      ) : (
        <>
          <PackageSelection 
            onSelectPackage={handleSelectPackage} 
            isAnonymousUser={!isSignedIn} 
          />
          <div className="mt-8 text-center">
            <Button 
              variant="outline" 
              onClick={onClose}
              className="border-border/30 hover:bg-foreground/10"
            >
              Cancel
            </Button>
          </div>
        </>
      )}
    </div>
  );
}