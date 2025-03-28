import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";

export default function PaymentCancel() {
  const [, setLocation] = useLocation();
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-md w-full mx-auto p-8 border border-border/30 rounded-lg bg-card">
        <div className="text-center py-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-amber-500/10 text-amber-500 mb-4">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="24" 
              height="24" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <h2 className="text-2xl font-semibold text-foreground mb-2">Payment Cancelled</h2>
          <p className="text-foreground/70 mb-6">
            Your purchase has been cancelled. No charges have been made to your account.
          </p>
          <div className="space-y-4">
            <Button 
              onClick={() => setLocation("/")}
              className="bg-primary/20 hover:bg-primary/30 text-primary w-full"
            >
              Return to Home
            </Button>
            <Button 
              onClick={() => {
                const purchaseModal = document.getElementById("purchase-credits-modal");
                if (purchaseModal) {
                  // If we have a modal, try to open it
                  (purchaseModal as any).showModal?.();
                } else {
                  // Otherwise go home
                  setLocation("/");
                }
              }}
              variant="outline"
              className="border-border/30 hover:bg-foreground/10 w-full"
            >
              Try Again
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}