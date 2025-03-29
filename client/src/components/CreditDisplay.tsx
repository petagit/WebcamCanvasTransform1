import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CreditCard } from "lucide-react";
import CreditPurchase from "@/components/CreditPurchase";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface CreditDisplayProps {
  onChange?: (credits: number) => void;
}

export default function CreditDisplay({ onChange }: CreditDisplayProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  
  // Query for user credits
  const { 
    data: creditsData, 
    isLoading, 
    error, 
    refetch 
  } = useQuery({
    queryKey: ['/api/credits'],
    queryFn: async () => {
      try {
        console.log("Fetching credits");
        const response = await apiRequest('GET', '/api/credits');
        if (!response.ok) {
          console.warn("Failed to fetch credits:", response.status);
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch credits');
        }
        const data = await response.json();
        console.log("Credits data received:", data);
        return data;
      } catch (error) {
        console.error("Error in credit fetch:", error);
        throw error;
      }
    },
    refetchInterval: 10000,  // Refetch every 10 seconds to keep credits updated
    // Always show data even when stale in case of errors
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  useEffect(() => {
    if (creditsData && onChange) {
      onChange(creditsData.credits);
    }
  }, [creditsData, onChange]);
  
  // Handle dialog close
  const handleDialogClose = () => {
    setOpen(false);
    // Invalidate the credits query to refetch after purchase
    queryClient.invalidateQueries({ queryKey: ['/api/credits'] });
  };
  
  // Format credits number with commas for thousands
  const formatCredits = (credits: number) => {
    return credits.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };
  
  // Even if credits fail to load, we still show the purchase button
  const displayCredits = () => {
    if (error) {
      return (
        <span className="text-sm text-zinc-100/80">Credits unavailable</span>
      );
    }
    
    if (isLoading) {
      return <Loader2 className="h-4 w-4 animate-spin mr-1" />;
    }
    
    // Check if we're in debug mode (free credits for non-authenticated users)
    const isDebugMode = creditsData?.debug === true;
    
    return (
      <span className="text-sm font-medium text-zinc-100">
        {formatCredits(creditsData?.credits || 0)} credits
        {isDebugMode && (
          <span className="text-xs ml-1 opacity-70">(free)</span>
        )}
      </span>
    );
  };

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center">
        <CreditCard className="h-4 w-4 mr-1 text-zinc-100" />
        {displayCredits()}
      </div>
      
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button 
            variant="secondary"
            size="sm" 
            className="ml-1 text-sm bg-zinc-100 text-black hover:bg-zinc-200 flex items-center gap-1 whitespace-nowrap"
          >
            <CreditCard className="h-3.5 w-3.5" />
            Purchase Credits
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[600px] md:max-w-[800px] bg-background">
          <DialogHeader>
            <DialogTitle className="text-xl font-serif text-primary">Purchase Credits</DialogTitle>
          </DialogHeader>
          <CreditPurchase onClose={handleDialogClose} />
        </DialogContent>
      </Dialog>
    </div>
  );
}