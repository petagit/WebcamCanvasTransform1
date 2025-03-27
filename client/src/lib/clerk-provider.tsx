import { ClerkProvider, useUser, useAuth as useClerkAuth, useSignIn, useSignUp } from "@clerk/clerk-react";
import { createContext, ReactNode, useContext } from "react";
import { queryClient } from "./queryClient";
import { useToast } from "@/hooks/use-toast";

if (!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY) {
  throw new Error("Missing Clerk Publishable Key");
}

// Define the user type for our app
type User = {
  id: string;
  username: string;
  email: string | null;
  authProvider: 'clerk';
  profilePicture: string | null;
  lastLogin: Date;
};

// Create an AuthContext with the same shape as the previous one
type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: any;
  registerMutation: any;
  logoutMutation: any;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function ClerkAuthProvider({ children }: { children: ReactNode }) {
  return (
    <ClerkProvider
      publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY}
      appearance={{
        variables: { colorPrimary: '#3b82f6' },
        elements: {
          formButtonPrimary: 
            "bg-blue-600 hover:bg-blue-700 text-sm normal-case",
          card: "bg-gray-900 border border-gray-800",
          headerTitle: "text-white",
          headerSubtitle: "text-gray-400",
          socialButtonsBlockButton: 
            "bg-white hover:bg-gray-100 border border-gray-300 text-gray-800",
          socialButtonsBlockButtonText: "text-gray-800 font-normal",
          dividerLine: "bg-gray-700",
          dividerText: "text-gray-400",
          formFieldLabel: "text-gray-300",
          formFieldInput: 
            "bg-gray-800 border-gray-700 text-white focus:border-blue-500",
          footerActionLink: "text-blue-500 hover:text-blue-400",
          identityPreviewEditButton: "text-blue-500 hover:text-blue-400",
        },
      }}
    >
      <AuthWrapper>{children}</AuthWrapper>
    </ClerkProvider>
  );
}

// Internal wrapper component that provides the auth context
function AuthWrapper({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const { isLoaded, user: clerkUser } = useUser();
  const { signOut } = useClerkAuth();
  const { signIn } = useSignIn();
  const { signUp } = useSignUp();
  
  // Convert Clerk user to our app's user type
  // Use email as username when available, fallback to other options
  const user: User | null = clerkUser ? {
    id: clerkUser.id,
    username: clerkUser.emailAddresses[0]?.emailAddress || clerkUser.username || clerkUser.firstName || 'User',
    email: clerkUser.emailAddresses[0]?.emailAddress || null,
    authProvider: 'clerk',
    profilePicture: clerkUser.imageUrl || null,
    lastLogin: new Date(),
  } : null;
  
  // Login mutation that uses Clerk
  const loginMutation = {
    mutate: async (credentials: { username: string; password: string }) => {
      try {
        if (!signIn) return;
        
        // Attempt to sign in with email/password
        const result = await signIn.create({
          identifier: credentials.username,
          password: credentials.password,
        });
        
        if (result.status === "complete") {
          // Authentication successful
          toast({
            title: 'Welcome back!',
            description: 'You are now logged in.',
          });
          return result;
        } else {
          // This means the user needs to complete another step
          toast({
            title: 'Additional verification required',
            description: 'Please complete the authentication process.',
          });
          return result;
        }
      } catch (error: any) {
        console.error('Login error:', error);
        toast({
          title: 'Login failed',
          description: error.message || 'An error occurred during login',
          variant: 'destructive',
        });
        throw error;
      }
    },
    isLoading: false,
  };

  // Register mutation that uses Clerk
  const registerMutation = {
    mutate: async (credentials: { username: string; password: string; email?: string }) => {
      try {
        if (!signUp) return;
        
        // Attempt to sign up with email/password
        const result = await signUp.create({
          username: credentials.username,
          password: credentials.password,
          emailAddress: credentials.email,
        });
        
        if (result.status === "complete") {
          // Registration successful
          toast({
            title: 'Account created!',
            description: 'Your account has been created successfully.',
          });
          return result;
        } else {
          // This means the user needs to complete another step (like email verification)
          toast({
            title: 'Additional steps required',
            description: 'Please complete the registration process.',
          });
          return result;
        }
      } catch (error: any) {
        console.error('Registration error:', error);
        toast({
          title: 'Registration failed',
          description: error.message || 'An error occurred during registration',
          variant: 'destructive',
        });
        throw error;
      }
    },
    isLoading: false,
  };

  // Logout mutation that uses Clerk
  const logoutMutation = {
    mutate: async () => {
      try {
        await signOut?.();
        queryClient.setQueryData(['/api/user'], null);
        toast({
          title: 'Logged out',
          description: 'You have been logged out successfully.',
        });
      } catch (error: any) {
        console.error('Logout error:', error);
        toast({
          title: 'Logout failed',
          description: error.message || 'An error occurred during logout',
          variant: 'destructive',
        });
        throw error;
      }
    },
    isLoading: false,
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading: !isLoaded,
        error: null,
        loginMutation,
        registerMutation,
        logoutMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Export the useAuth hook that will be used in the app
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within a ClerkAuthProvider");
  }
  return context;
}