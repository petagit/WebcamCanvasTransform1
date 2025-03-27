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
}

export default function PaywallModal({
  isOpen,
  onClose,
  onPurchaseCredits,
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
              <DialogTitle className="text-xl font-bold text-center">
                Login Required
              </DialogTitle>
              <DialogDescription className="text-center pt-2">
                You need to log in before purchasing credits.
              </DialogDescription>
            </DialogHeader>

            <div className="py-8 text-center">
              <p className="mb-6">Login to your account to purchase credits and unlock all PixelCam features.</p>
              
              <div className="flex flex-col gap-4 items-center justify-center">
                <Link 
                  href="/auth" 
                  onClick={() => {
                    onClose();
                    setShowLoginPrompt(false);
                  }}
                >
                  <Button
                    className="bg-gradient-to-r from-blue-600 to-blue-400 hover:from-blue-700 hover:to-blue-500 text-white w-40"
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
                  className="w-40"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </>
        ) : showPurchasePanel ? (
          <>
            <DialogHeader>
              <DialogTitle>Purchase Credits</DialogTitle>
              <DialogDescription>
                Choose a credit package to continue using PixelCam features.
              </DialogDescription>
            </DialogHeader>
            <CreditPurchase onClose={handlePurchaseComplete} />
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-center">
                Free Trial Ended
              </DialogTitle>
              <DialogDescription className="text-center pt-2">
                Your free 10-second preview has ended. Purchase credits to continue using all PixelCam features.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-4">
              <div className="bg-muted/50 p-4 rounded-lg">
                <h3 className="font-semibold flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  What you get with PixelCam Credits
                </h3>
                <ul className="mt-2 space-y-2 pl-7">
                  <li className="list-disc text-sm">Unlimited webcam usage</li>
                  <li className="list-disc text-sm">Process and save captured images</li>
                  <li className="list-disc text-sm">Apply premium filters and effects</li>
                  <li className="list-disc text-sm">Access to your personal gallery</li>
                </ul>
              </div>

              <div className="bg-primary/10 p-4 rounded-lg">
                <h3 className="font-semibold flex items-center gap-2">
                  <Star className="h-5 w-5 text-primary" />
                  Premium Features
                </h3>
                <p className="text-sm mt-1">
                  Each processed image costs 2 credits. Purchase credits in bundles for the best value.
                </p>
              </div>
            </div>

            <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0">
              <Button 
                variant="outline" 
                onClick={onClose}
                className="sm:mr-2"
              >
                No Thanks
              </Button>
              <Button 
                onClick={handlePurchaseClick}
                className="bg-gradient-to-r from-blue-600 to-blue-400 hover:from-blue-700 hover:to-blue-500 text-white"
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