import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CreditCard, CheckCircle, Star, LogIn } from "lucide-react";
import CreditPurchase from "./CreditPurchase";
import { useAuth } from "@/lib/clerk-provider";
import { Link } from "wouter";

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPurchaseCredits: () => void;
  reason?: 'trial-ended' | 'insufficient-credits'; // Why the paywall is shown
}

export default function PaywallModal({
  isOpen,
  onClose,
  onPurchaseCredits,
  reason = 'trial-ended',
}: PaywallModalProps) {
  const [showPurchasePanel, setShowPurchasePanel] = React.useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = React.useState(false);
  const { user } = useAuth();

  const handlePurchaseClick = () => {
    if (!user) {
      // If not logged in, show login prompt
      setShowLoginPrompt(true);
    } else {
      // If logged in, show purchase panel
      setShowPurchasePanel(true);
    }
  };

  const handlePurchaseComplete = () => {
    setShowPurchasePanel(false);
    onPurchaseCredits();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        {showLoginPrompt ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl font-serif text-primary text-center">
                Login Required
              </DialogTitle>
              <DialogDescription className="text-center pt-2 text-foreground/70">
                You need to log in before purchasing credits.
              </DialogDescription>
            </DialogHeader>

            <div className="py-8 text-center">
              <p className="mb-6 text-foreground/80 text-sm">Login to your account to purchase credits and unlock all Filtercamera features.</p>
              
              <div className="flex flex-col gap-4 items-center justify-center">
                <Link 
                  href="/auth" 
                  onClick={() => {
                    onClose();
                    setShowLoginPrompt(false);
                  }}
                >
                  <Button
                    className="bg-primary/20 hover:bg-primary/30 text-primary w-40"
                  >
                    <LogIn className="h-4 w-4 mr-2" />
                    Login
                  </Button>
                </Link>
                
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowLoginPrompt(false);
                  }}
                  className="w-40 border-border/30 hover:bg-foreground/10"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </>
        ) : showPurchasePanel ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl font-serif text-primary text-center">Purchase Credits</DialogTitle>
              <DialogDescription className="text-center pt-2 text-foreground/70">
                Choose a credit package to continue using Filtercamera features.
              </DialogDescription>
            </DialogHeader>
            <CreditPurchase onClose={handlePurchaseComplete} />
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl font-serif text-primary text-center">
                {reason === 'insufficient-credits' ? 'Insufficient Credits' : 'Free Trial Ended'}
              </DialogTitle>
              <DialogDescription className="text-center pt-2 text-foreground/70">
                {reason === 'insufficient-credits' 
                  ? 'You don\'t have enough credits to complete this action. Each processed image costs 30 credits.' 
                  : 'Your free 10-second preview has ended. Purchase credits to continue using all Filtercamera features.'}
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-4">
              <div className="border border-border/20 p-4 rounded-sm">
                <h3 className="font-serif text-primary flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-primary/80" />
                  What you get with Filtercamera Credits
                </h3>
                <ul className="mt-2 space-y-2 pl-7">
                  <li className="list-disc text-xs text-foreground/80">Unlimited webcam usage</li>
                  <li className="list-disc text-xs text-foreground/80">Process and save captured images</li>
                  <li className="list-disc text-xs text-foreground/80">Apply premium filters and effects</li>
                  <li className="list-disc text-xs text-foreground/80">Access to your personal gallery</li>
                </ul>
              </div>

              <div className="border border-border/20 p-4 rounded-sm">
                <h3 className="font-serif text-primary flex items-center gap-2 text-sm">
                  <Star className="h-4 w-4 text-primary/80" />
                  Premium Features
                </h3>
                <p className="text-xs mt-1 text-foreground/80">
                  Each processed image costs 30 credits. Purchase credits in bundles for the best value.
                </p>
              </div>
            </div>

            <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0">
              <Button 
                variant="outline" 
                onClick={onClose}
                className="sm:mr-2 border-border/30 hover:bg-foreground/10"
              >
                No Thanks
              </Button>
              <Button 
                onClick={handlePurchaseClick}
                className="bg-primary/20 hover:bg-primary/30 text-primary"
              >
                <CreditCard className="h-4 w-4 mr-2" />
                {user ? "Purchase Credits" : "Login & Purchase"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}