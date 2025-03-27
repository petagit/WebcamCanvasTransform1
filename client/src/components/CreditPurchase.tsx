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
      <PaymentElement />
      <div className="flex justify-between mt-4">
        <Button variant="outline" onClick={onClose} disabled={isProcessing}>Cancel</Button>
        <Button type="submit" disabled={!stripe || isProcessing}>
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
        <Card key={pkg.id} className="flex flex-col">
          <CardHeader>
            <CardTitle>{pkg.name}</CardTitle>
            <CardDescription>{pkg.credits} Credits</CardDescription>
          </CardHeader>
          <CardContent className="flex-grow">
            <p className="text-2xl font-bold">{pkg.formattedPrice}</p>
            <p className="text-sm text-muted-foreground">
              {(pkg.amount / pkg.credits).toFixed(2)} cents per credit
            </p>
          </CardContent>
          <CardFooter>
            <Button 
              onClick={() => onSelectPackage(pkg.id)} 
              className="w-full"
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

  const handleSelectPackage = async (packageId: string) => {
    setIsLoading(true);
    setSelectedPackage(packageId);

    try {
      const response = await apiRequest('POST', '/api/credits/purchase', { packageId });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create payment intent');
      }

      const data = await response.json();
      setClientSecret(data.clientSecret);
      setActiveTab("payment");
    } catch (error) {
      console.error('Error creating payment intent:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to initialize payment",
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
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="select">Select Package</TabsTrigger>
          <TabsTrigger value="payment" disabled={!clientSecret}>Payment</TabsTrigger>
        </TabsList>
        <TabsContent value="select" className="pt-4">
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
              <p>Please select a package first</p>
              <Button 
                onClick={() => setActiveTab("select")} 
                variant="outline" 
                className="mt-4"
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