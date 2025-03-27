import { SignIn, SignUp } from "@clerk/clerk-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ClerkAuth() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<"sign-in" | "sign-up">("sign-in");

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-4xl flex flex-col lg:flex-row overflow-hidden rounded-xl shadow-2xl">
        <div className="w-full lg:w-1/2 p-8 bg-gradient-to-br from-gray-900 to-gray-800 flex flex-col justify-center">
          <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600 mb-4">
            PixelCam
          </h1>
          <p className="text-gray-300 mb-6">
            Transform your images and videos with stunning retro filters. Create unique dot matrix 
            effects, share your creations, and unleash your creativity.
          </p>
          <div className="space-y-4">
            <div className="flex items-center">
              <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-white">
                1
              </div>
              <p className="ml-4 text-gray-300">Capture or upload images and videos</p>
            </div>
            <div className="flex items-center">
              <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-white">
                2
              </div>
              <p className="ml-4 text-gray-300">Apply custom dot matrix filters</p>
            </div>
            <div className="flex items-center">
              <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-white">
                3
              </div>
              <p className="ml-4 text-gray-300">Download and share your creations</p>
            </div>
          </div>
        </div>
        
        <div className="w-full lg:w-1/2 bg-gray-900 p-8">
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
              <Card className="border-none bg-transparent">
                <SignIn 
                  signUpUrl="#" 
                  afterSignInUrl="/"
                  redirectUrl="/"
                  appearance={{
                    elements: {
                      formButtonPrimary: 
                        "bg-blue-600 hover:bg-blue-700",
                      formFieldInput: 
                        "bg-gray-800 border-gray-700",
                    }
                  }}
                  routing="hash"
                />
              </Card>
            </TabsContent>
            <TabsContent value="sign-up">
              <Card className="border-none bg-transparent">
                <SignUp 
                  signInUrl="#" 
                  afterSignUpUrl="/"
                  redirectUrl="/"
                  appearance={{
                    elements: {
                      formButtonPrimary: 
                        "bg-blue-600 hover:bg-blue-700",
                      formFieldInput: 
                        "bg-gray-800 border-gray-700",
                    }
                  }}
                  routing="hash"
                />
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}