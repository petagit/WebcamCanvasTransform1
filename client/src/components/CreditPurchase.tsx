import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

// Load stripe outside component render cycle
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

// Credit package definitions
const CREDIT_PACKAGES = [
  { id: 'basic', name: 'Basic', credits: 50, amount: 499, formattedPrice: '$4.99' },
  { id: 'plus', name: 'Plus', credits: 150, amount: 999, formattedPrice: '$9.99' },
  { id: 'premium', name: 'Premium', credits: 500, amount: 1999, formattedPrice: '$19.99' }
];

// Payment form component
function PaymentForm({ clientSecret, packageDetails, onClose }: { 
  clientSecret: string, 
  packageDetails: typeof CREDIT_PACKAGES[0], 
  onClose: () => void 
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/payment-success`,
        },
        redirect: 'if_required',
      });

      if (error) {
        toast({
          title: "Payment failed",
          description: error.message || "An unknown error occurred",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Payment successful!",
          description: `Your ${packageDetails.credits} credits will be added to your account shortly.`,
        });
        onClose();
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      toast({
        title: "Payment error",
        description: "An unexpected error occurred while processing your payment",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement className="text-foreground" />
      <div className="flex justify-between mt-4">
        <Button 
          variant="outline" 
          onClick={onClose} 
          disabled={isProcessing}
          className="border-border/30 hover:bg-foreground/10"
        >
          Cancel
        </Button>
        <Button 
          type="submit" 
          disabled={!stripe || isProcessing}
          className="bg-primary/20 hover:bg-primary/30 text-primary"
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            `Pay ${packageDetails.formattedPrice}`
          )}
        </Button>
      </div>
    </form>
  );
}

// Package selection component
function PackageSelection({ onSelectPackage }: { onSelectPackage: (packageId: string) => void }) {
  return (
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
  );
}

// Main credit purchase component
export default function CreditPurchase({ onClose }: { onClose: () => void }) {
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("select");
  const { toast } = useToast();

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const handleSelectPackage = async (packageId: string) => {
    setIsLoading(true);
    setSelectedPackage(packageId);
    setErrorMessage(null);

    try {
      // Get a fresh token before making the request
      const token = await window.Clerk?.session?.getToken();
      console.log("Auth token available:", !!token);
      
      const response = await apiRequest('POST', '/api/credits/purchase', { packageId });
      
      if (!response.ok) {
        const errorData = await response.json();
        const errorMsg = errorData.error || 'Failed to create payment intent';
        console.error('Payment error:', errorMsg);
        setErrorMessage(errorMsg);
        throw new Error(errorMsg);
      }

      const data = await response.json();
      setClientSecret(data.clientSecret);
      setActiveTab("payment");
    } catch (error) {
      console.error('Error creating payment intent:', error);
      const message = error instanceof Error ? error.message : "Failed to initialize payment";
      setErrorMessage(message);
      toast({
        title: "Payment Error",
        description: message,
        variant: "destructive",
      });
      setSelectedPackage(null);
    } finally {
      setIsLoading(false);
    }
  };

  const packageDetails = selectedPackage 
    ? CREDIT_PACKAGES.find(pkg => pkg.id === selectedPackage) 
    : undefined;

  const options = clientSecret ? {
    clientSecret,
    appearance: {
      theme: 'stripe' as const,
    },
  } : {};

  return (
    <div className="w-full max-w-3xl mx-auto">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 border-border/30">
          <TabsTrigger 
            value="select"
            className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary"
          >
            Select Package
          </TabsTrigger>
          <TabsTrigger 
            value="payment" 
            disabled={!clientSecret}
            className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary"
          >
            Payment
          </TabsTrigger>
        </TabsList>
        <TabsContent value="select" className="pt-4">
          {errorMessage && (
            <div className="mb-4 p-3 border border-destructive/30 bg-destructive/10 rounded text-destructive text-sm">
              <p><strong>Error:</strong> {errorMessage}</p>
              <p className="text-xs mt-1 text-destructive/80">Please make sure you're logged in and try again.</p>
            </div>
          )}
          
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <PackageSelection onSelectPackage={handleSelectPackage} />
          )}
        </TabsContent>
        <TabsContent value="payment" className="pt-4">
          {clientSecret && packageDetails ? (
            <Elements stripe={stripePromise} options={options}>
              <PaymentForm 
                clientSecret={clientSecret} 
                packageDetails={packageDetails}
                onClose={onClose}
              />
            </Elements>
          ) : (
            <div className="text-center py-8">
              <p className="text-foreground/70 text-sm">Please select a package first</p>
              <Button 
                onClick={() => setActiveTab("select")} 
                variant="outline" 
                className="mt-4 border-border/30 hover:bg-foreground/10"
              >
                Go Back
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}