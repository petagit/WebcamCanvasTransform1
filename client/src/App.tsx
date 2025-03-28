import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { ClerkAuthProvider, useAuth } from "./lib/clerk-provider";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Gallery from "@/pages/Gallery";
import AuthPage from "@/pages/AuthPage";
import Subscription from "@/pages/Subscription";
import PaymentSuccess from "@/pages/PaymentSuccess";
import PaymentCancel from "@/pages/PaymentCancel";
import { Loader2 } from "lucide-react";

// Protected route component
function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!user) {
    // Redirect to auth page if not authenticated
    setLocation("/auth");
    return null;
  }
  
  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/gallery">
        <ProtectedRoute component={Gallery} />
      </Route>
      <Route path="/auth" component={AuthPage} />
      <Route path="/auth/sign-in" component={AuthPage} />
      <Route path="/auth/sign-up">
        <AuthPage />
      </Route>
      <Route path="/subscription">
        <ProtectedRoute component={Subscription} />
      </Route>
      <Route path="/subscription/success">
        <ProtectedRoute component={Subscription} />
      </Route>
      <Route path="/subscription/cancel">
        <ProtectedRoute component={Subscription} />
      </Route>
      
      {/* Payment routes */}
      <Route path="/payment-success">
        <ProtectedRoute component={PaymentSuccess} />
      </Route>
      <Route path="/payment-cancel">
        <ProtectedRoute component={PaymentCancel} />
      </Route>
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ClerkAuthProvider>
        <div className="min-h-screen bg-background">
          <Router />
          <Toaster />
        </div>
      </ClerkAuthProvider>
    </QueryClientProvider>
  );
}

export default App;
