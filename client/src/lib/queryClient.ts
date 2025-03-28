import { QueryClient, QueryFunction } from "@tanstack/react-query";

// Type declaration for global Clerk object
declare global {
  interface Window {
    Clerk?: {
      session?: {
        getToken: (options?: { template?: string }) => Promise<string | null>;
      };
    };
  }
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

// Helper to get the Clerk authentication token
async function getClerkToken(): Promise<string | null> {
  try {
    return await window.Clerk?.session?.getToken() || null;
  } catch (err) {
    console.error("Error getting Clerk token:", err);
    return null;
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // Always get a fresh token for each request
  const sessionToken = await getClerkToken();
  
  // Debug authentication status
  if (!sessionToken) {
    console.warn(`API request to ${url} is being made without authentication token`);
  } else {
    console.log(`API request to ${url} with auth token available`);
  }
  
  // Prepare headers with auth token when available
  const headers: Record<string, string> = {};
  
  if (data) {
    headers["Content-Type"] = "application/json";
  }
  
  if (sessionToken) {
    headers["Authorization"] = `Bearer ${sessionToken}`;
  }
  
  try {
    const res = await fetch(url, {
      method,
      headers: headers,
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
    });

    if (!res.ok) {
      console.error(`API error on ${url}:`, res.status, res.statusText);
    }
    
    await throwIfResNotOk(res);
    return res;
  } catch (error) {
    console.error(`Error in API request to ${url}:`, error);
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Get the active session token for Clerk authentication
    const sessionToken = await getClerkToken();
    
    // Set up headers with auth token when available
    const headers: Record<string, string> = {};
    if (sessionToken) {
      headers["Authorization"] = `Bearer ${sessionToken}`;
    }
    
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
      headers: headers
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
