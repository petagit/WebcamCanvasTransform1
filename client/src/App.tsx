import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "./hooks/use-auth";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Gallery from "@/pages/Gallery";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/gallery" component={Gallery} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <div className="min-h-screen bg-background">
          <Router />
          <Toaster />
        </div>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
