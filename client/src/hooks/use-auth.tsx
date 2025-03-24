import { createContext, ReactNode, useContext } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "../lib/queryClient";

// Define the user type based on your schema
type User = {
  id: number;
  username: string;
  email: string | null;
  authProvider: 'local' | 'google' | 'github';
  profilePicture: string | null;
  lastLogin: Date;
};

type RegisterData = {
  username: string;
  password: string;
  email?: string;
};

type LoginData = {
  username: string;
  password: string;
};

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: any;
  registerMutation: any;
  logoutMutation: any;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  
  const {
    data: user,
    error,
    isLoading,
  } = useQuery<User | null>({
    queryKey: ['/api/user'],
    retry: false,
    // Handle errors silently - just return null if not logged in
    queryFn: async () => {
      try {
        const res = await fetch('/api/user');
        if (!res.ok) {
          if (res.status === 401) {
            return null;
          }
          throw new Error('Failed to fetch user');
        }
        return await res.json();
      } catch (error) {
        console.error('Auth error:', error);
        return null;
      }
    }
  });

  // Login mutation for local authentication
  const loginMutation = useMutation({
    mutationFn: async (credentials: { username: string; password: string }) => {
      const res = await fetch('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Login failed');
      }
      
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['/api/user'], data);
      toast({
        title: 'Welcome back!',
        description: 'You are now logged in.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Login failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: async (credentials: RegisterData) => {
      const res = await fetch('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Registration failed');
      }
      
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['/api/user'], data.user);
      toast({
        title: 'Account created!',
        description: 'Your account has been created successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Registration failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/auth/logout', {
        method: 'GET',
      });
      
      if (!res.ok) {
        throw new Error('Logout failed');
      }
    },
    onSuccess: () => {
      queryClient.setQueryData(['/api/user'], null);
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      toast({
        title: 'Logged out',
        description: 'You have been logged out successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Logout failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        loginMutation,
        registerMutation,
        logoutMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}