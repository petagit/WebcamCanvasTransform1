import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { FaGoogle, FaGithub } from "react-icons/fa";
import { useAuth } from "../hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Camera, Zap } from "lucide-react";

export default function AuthPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const [_, setLocation] = useLocation();
  
  const { user, loginMutation, isLoading } = useAuth();
  
  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      setLocation("/");
    }
  }, [user, setLocation]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!username || !password) {
      setError("Username and password are required");
      return;
    }
    
    try {
      loginMutation.mutate({ username, password });
    } catch (err: any) {
      setError(err.message || "Login failed");
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (!username || !password || !confirmPassword) {
      setError("All fields are required");
      return;
    }
    
    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }
    
    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, email }),
      });
      
      if (!response.ok) {
        throw new Error(await response.text());
      }
      
      // Auto-login after successful registration
      loginMutation.mutate({ username, password });
    } catch (err: any) {
      setError(err.message || "Registration failed");
    }
  };

  const handleOAuthLogin = (provider: string) => {
    window.location.href = `/api/auth/${provider}`;
  };

  // If already authenticated, we'll redirect
  if (user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        <div className="relative z-10">
          <Button 
            variant="ghost" 
            className="absolute top-2 left-2 text-white"
            onClick={() => setLocation("/")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          
          <Card className="w-full max-w-md mx-auto">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-center">
                Welcome to PixelCam
              </CardTitle>
              <CardDescription className="text-center">
                {activeTab === "login" 
                  ? "Sign in to access your gallery and settings" 
                  : "Create an account to save your creative work"}
              </CardDescription>
            </CardHeader>
            
            <Tabs defaultValue="login" value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login">
                <form onSubmit={handleLogin}>
                  <CardContent className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="username">Username</Label>
                      <Input
                        id="username"
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </div>
                    
                    {error && (
                      <div className="text-red-500 text-sm mt-2">{error}</div>
                    )}
                  </CardContent>
                  
                  <CardFooter className="flex flex-col gap-4">
                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={isLoading}
                    >
                      {isLoading ? "Signing in..." : "Sign In"}
                    </Button>
                    
                    <div className="relative w-full flex items-center gap-2 my-2">
                      <div className="flex-grow h-px bg-muted"></div>
                      <span className="text-xs text-muted-foreground">OR CONTINUE WITH</span>
                      <div className="flex-grow h-px bg-muted"></div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 w-full">
                      <Button 
                        type="button" 
                        variant="outline" 
                        className="flex items-center gap-2"
                        onClick={() => handleOAuthLogin("google")}
                      >
                        <FaGoogle />
                        <span>Google</span>
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        className="flex items-center gap-2"
                        onClick={() => handleOAuthLogin("github")}
                      >
                        <FaGithub />
                        <span>GitHub</span>
                      </Button>
                    </div>
                  </CardFooter>
                </form>
              </TabsContent>
              
              <TabsContent value="register">
                <form onSubmit={handleRegister}>
                  <CardContent className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="reg-username">Username</Label>
                      <Input
                        id="reg-username"
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email (optional)</Label>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reg-password">Password</Label>
                      <Input
                        id="reg-password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirm-password">Confirm Password</Label>
                      <Input
                        id="confirm-password"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                      />
                    </div>
                    
                    {error && (
                      <div className="text-red-500 text-sm mt-2">{error}</div>
                    )}
                  </CardContent>
                  
                  <CardFooter className="flex flex-col gap-4">
                    <Button 
                      type="submit" 
                      className="w-full"
                      disabled={isLoading}
                    >
                      {isLoading ? "Creating Account..." : "Create Account"}
                    </Button>
                    
                    <div className="relative w-full flex items-center gap-2 my-2">
                      <div className="flex-grow h-px bg-muted"></div>
                      <span className="text-xs text-muted-foreground">OR REGISTER WITH</span>
                      <div className="flex-grow h-px bg-muted"></div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 w-full">
                      <Button 
                        type="button" 
                        variant="outline" 
                        className="flex items-center gap-2"
                        onClick={() => handleOAuthLogin("google")}
                      >
                        <FaGoogle />
                        <span>Google</span>
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        className="flex items-center gap-2"
                        onClick={() => handleOAuthLogin("github")}
                      >
                        <FaGithub />
                        <span>GitHub</span>
                      </Button>
                    </div>
                  </CardFooter>
                </form>
              </TabsContent>
            </Tabs>
          </Card>
        </div>
        
        <div className="hidden md:flex flex-col items-center text-center p-8">
          <div className="flex items-center justify-center rounded-full bg-primary/10 p-6 mb-8">
            <Camera className="h-16 w-16 text-primary" />
          </div>
          <h2 className="text-4xl font-bold text-white mb-6">Transform Your Photos</h2>
          <p className="text-xl text-gray-300 mb-8">
            Apply amazing dot matrix and halftone effects to your webcam stream.
            Save and share your creative captures.
          </p>
          <div className="flex items-center gap-4 p-4 bg-primary/20 rounded-lg">
            <Zap className="h-8 w-8 text-primary" />
            <p className="text-gray-200">
              Premium subscribers get unlimited video streaming and priority support!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}