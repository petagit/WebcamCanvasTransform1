import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { CreditCard, Check, Lock, Star, Zap, Image, Video } from "lucide-react";

export default function Subscription() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [subscription, setSubscription] = useState<any>(null);

  useEffect(() => {
    // Check if user is logged in
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please log in to manage your subscription.",
        variant: "destructive",
      });
      setLocation("/auth");
      return;
    }

    // Fetch subscription status
    const fetchSubscription = async () => {
      try {
        const res = await apiRequest("GET", "/api/subscription");
        const data = await res.json();
        setSubscription(data);
      } catch (error) {
        console.error("Error fetching subscription:", error);
        toast({
          title: "Error",
          description: "Failed to fetch subscription status. Please try again later.",
          variant: "destructive",
        });
      }
    };

    fetchSubscription();
  }, [user, toast, setLocation]);

  const handleSubscribe = async () => {
    setIsLoading(true);
    try {
      const res = await apiRequest("POST", "/api/subscription/checkout");
      const data = await res.json();
      
      if (data.url) {
        // Redirect to Stripe checkout
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (error) {
      console.error("Error creating checkout session:", error);
      toast({
        title: "Error",
        description: "Failed to initiate checkout. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm("Are you sure you want to cancel your subscription?")) return;
    
    setIsLoading(true);
    try {
      await apiRequest("POST", "/api/subscription/cancel");
      
      toast({
        title: "Subscription Cancelled",
        description: "Your subscription has been cancelled. You still have access until the end of your billing period.",
      });
      
      // Refresh subscription data
      const res = await apiRequest("GET", "/api/subscription");
      const data = await res.json();
      setSubscription(data);
    } catch (error) {
      console.error("Error cancelling subscription:", error);
      toast({
        title: "Error",
        description: "Failed to cancel subscription. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to format a date
  const formatDate = (date: string | Date) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString();
  };

  return (
    <div className="min-h-screen flex flex-col bg-app-dark text-white">
      <Header onHelpClick={() => {}} />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
              Premium Subscription
            </h1>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Unlock the full potential of PixelCam with unlimited video streaming and advanced features.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            <div className="bg-gray-900 rounded-xl p-6 shadow-lg border border-gray-800">
              <h2 className="text-xl font-semibold mb-4">Free Plan</h2>
              <p className="text-gray-400 mb-4">Basic features for casual users</p>
              <div className="space-y-3 mb-6">
                <div className="flex items-start">
                  <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Basic image filters</span>
                </div>
                <div className="flex items-start">
                  <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Up to 10 seconds of video streaming</span>
                </div>
                <div className="flex items-start">
                  <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Save up to 5 media items</span>
                </div>
              </div>
              <div className="text-2xl font-bold mb-6">Free</div>
              <Button 
                className="w-full bg-gray-700 hover:bg-gray-600"
                disabled
              >
                Current Plan
              </Button>
            </div>
            
            <div className="bg-gradient-to-br from-blue-900 to-purple-900 rounded-xl p-6 shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-gradient-to-bl from-yellow-400 to-pink-500 text-black font-bold px-4 py-1 text-sm transform rotate-0 translate-x-2 -translate-y-0">
                PREMIUM
              </div>
              <h2 className="text-xl font-semibold mb-4">Premium Plan</h2>
              <p className="text-gray-300 mb-4">Enhanced features for creative users</p>
              <div className="space-y-3 mb-6">
                <div className="flex items-start">
                  <Check className="h-5 w-5 text-green-400 mr-2 flex-shrink-0 mt-0.5" />
                  <span>All basic features</span>
                </div>
                <div className="flex items-start">
                  <Check className="h-5 w-5 text-green-400 mr-2 flex-shrink-0 mt-0.5" />
                  <span className="font-medium text-blue-300">Unlimited video streaming</span>
                </div>
                <div className="flex items-start">
                  <Check className="h-5 w-5 text-green-400 mr-2 flex-shrink-0 mt-0.5" />
                  <span className="font-medium text-blue-300">Access to all premium filters</span>
                </div>
                <div className="flex items-start">
                  <Check className="h-5 w-5 text-green-400 mr-2 flex-shrink-0 mt-0.5" />
                  <span className="font-medium text-blue-300">High-resolution exports</span>
                </div>
                <div className="flex items-start">
                  <Check className="h-5 w-5 text-green-400 mr-2 flex-shrink-0 mt-0.5" />
                  <span className="font-medium text-blue-300">Unlimited media storage</span>
                </div>
              </div>
              <div className="text-2xl font-bold mb-6">$5.99<span className="text-sm text-gray-300 font-normal">/month</span></div>
              {subscription?.status === 'active' ? (
                <Button 
                  variant="outline"
                  className="w-full border-gray-300 text-white hover:bg-gray-700"
                  onClick={handleCancel}
                  disabled={isLoading}
                >
                  {isLoading ? "Processing..." : "Cancel Subscription"}
                </Button>
              ) : (
                <Button 
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  onClick={handleSubscribe}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="flex items-center">
                      <span className="animate-spin mr-2">⟳</span> Processing...
                    </span>
                  ) : (
                    <span className="flex items-center">
                      <CreditCard className="h-4 w-4 mr-2" /> Subscribe Now
                    </span>
                  )}
                </Button>
              )}
            </div>
          </div>
          
          {subscription && (
            <div className="bg-gray-900 rounded-xl p-6 mb-8 border border-gray-800">
              <h2 className="text-xl font-semibold mb-4">Your Subscription</h2>
              <div className="space-y-4">
                <div className="flex justify-between border-b border-gray-800 pb-2">
                  <span className="text-gray-400">Status</span>
                  <span className={subscription.status === 'active' ? 'text-green-500' : 'text-yellow-500'}>
                    {subscription.status === 'active' 
                      ? "Active" 
                      : subscription.status === 'cancelled' 
                        ? "Cancelled" 
                        : subscription.status === 'free' 
                          ? "Free Plan" 
                          : "Inactive"}
                  </span>
                </div>
                {subscription.currentPeriodStart && (
                  <div className="flex justify-between border-b border-gray-800 pb-2">
                    <span className="text-gray-400">Current Period Start</span>
                    <span>{formatDate(subscription.currentPeriodStart)}</span>
                  </div>
                )}
                {subscription.currentPeriodEnd && (
                  <div className="flex justify-between border-b border-gray-800 pb-2">
                    <span className="text-gray-400">Current Period End</span>
                    <span>{formatDate(subscription.currentPeriodEnd)}</span>
                  </div>
                )}
              </div>
            </div>
          )}
          
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <h2 className="text-xl font-semibold mb-6 flex items-center">
              <Lock className="h-5 w-5 mr-2 text-blue-400" />
              Secure Payment Processing
            </h2>
            <p className="text-gray-400 mb-4">
              All payments are processed securely through Stripe. We never store your payment information.
            </p>
            <div className="flex space-x-2 opacity-60">
              <div className="h-6 w-10 bg-gray-200 rounded"></div>
              <div className="h-6 w-10 bg-gray-200 rounded"></div>
              <div className="h-6 w-10 bg-gray-200 rounded"></div>
              <div className="h-6 w-10 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}