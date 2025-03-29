import { useEffect } from "react";
import { useLocation } from "wouter";
import { SignIn, SignUp, useAuth } from "@clerk/clerk-react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Camera, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export default function AuthPage() {
  const { isSignedIn } = useAuth();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<"sign-in" | "sign-up">("sign-in");

  // Redirect if already logged in
  useEffect(() => {
    if (isSignedIn) {
      setLocation("/");
    }
  }, [isSignedIn, setLocation]);

  // If already authenticated, we'll redirect
  if (isSignedIn) return null;

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
          
          <Card className="w-full max-w-md mx-auto bg-gray-900 border-gray-800">
            <div className="p-6">
              <div className="flex flex-col items-center gap-2 mb-6">
                <img src="/logo.jpeg" alt="Filtercamera Logo" className="h-16 w-16 rounded-md mb-1" />
                <h2 className="text-2xl font-serif text-white">
                  Filtercamera.app
                </h2>
                <p className="text-sm text-gray-400">the most stylish camera tool</p>
              </div>
              
              <Tabs 
                value={activeTab} 
                onValueChange={(value) => setActiveTab(value as "sign-in" | "sign-up")}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="sign-in">Sign In</TabsTrigger>
                  <TabsTrigger value="sign-up">Sign Up</TabsTrigger>
                </TabsList>
                <TabsContent value="sign-in">
                  <SignIn 
                    signUpUrl="#sign-up" 
                    afterSignInUrl="/"
                    redirectUrl="/"
                    appearance={{
                      elements: {
                        formButtonPrimary: 
                          "bg-blue-600 hover:bg-blue-700",
                        formFieldInput: 
                          "bg-gray-800 border-gray-700",
                        card: "bg-transparent shadow-none border-0",
                        headerTitle: "hidden",
                        headerSubtitle: "hidden",
                        dividerLine: "bg-gray-700",
                        dividerText: "text-gray-400",
                        footerActionLink: "text-blue-500 hover:text-blue-400",
                      }
                    }}
                    routing="hash"
                  />
                </TabsContent>
                <TabsContent value="sign-up">
                  <SignUp 
                    signInUrl="#sign-in" 
                    afterSignUpUrl="/"
                    redirectUrl="/"
                    appearance={{
                      elements: {
                        formButtonPrimary: 
                          "bg-blue-600 hover:bg-blue-700",
                        formFieldInput: 
                          "bg-gray-800 border-gray-700",
                        card: "bg-transparent shadow-none border-0",
                        headerTitle: "hidden",
                        headerSubtitle: "hidden",
                        dividerLine: "bg-gray-700",
                        dividerText: "text-gray-400",
                        footerActionLink: "text-blue-500 hover:text-blue-400",
                      }
                    }}
                    routing="hash"
                  />
                </TabsContent>
              </Tabs>
            </div>
          </Card>
        </div>
        
        <div className="hidden md:flex flex-col items-center text-center p-8">
          <div className="flex items-center justify-center rounded-full bg-primary/10 p-6 mb-8">
            <Camera className="h-16 w-16 text-primary" />
          </div>
          <h2 className="text-4xl font-serif text-white mb-6">Transform Your Media</h2>
          <p className="text-xl text-gray-300 mb-8">
            Apply stunning halftone and dot matrix effects to your webcam stream.
            Choose from multiple dot shapes including circles, squares, and crosses.
          </p>
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4 p-4 bg-primary/20 rounded-lg">
              <Zap className="h-8 w-8 text-primary" />
              <p className="text-gray-200">
                Purchase credits to unlock unlimited webcam usage and image processing
              </p>
            </div>
            <p className="text-sm text-gray-400 mt-2">
              Each processed image costs 30 credits. Webcam previews are free for 10 seconds.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}