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
      const response = await apiRequest('GET', '/api/credits');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch credits');
      }
      return response.json();
    },
    refetchInterval: 10000,  // Refetch every 10 seconds to keep credits updated
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
  
  // Show error if credits fail to load
  if (error) {
    return (
      <div className="flex items-center text-destructive">
        <span className="ml-1 text-sm">Credits unavailable</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center">
        <CreditCard className="h-4 w-4 mr-1 text-primary/80" />
        
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin mr-1" />
        ) : (
          <span className="text-sm font-medium">
            {formatCredits(creditsData?.credits || 0)} credits
          </span>
        )}
      </div>
      
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            className="text-sm border-zinc-100/30 bg-zinc-100/10 hover:bg-zinc-100/20 text-zinc-100 flex items-center gap-1"
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