import React from "react";
import { Camera, HelpCircle, ImageIcon, LogOut } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "../lib/clerk-provider"; // Import from clerk-provider instead
import { Button } from "@/components/ui/button";
import CreditDisplay from "@/components/CreditDisplay";

interface HeaderProps {
  onHelpClick: () => void;
}

export default function Header({ onHelpClick }: HeaderProps) {
  const { user, logoutMutation } = useAuth();

  return (
    <header className="bg-background border-b border-border/10">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Link href="/" className="flex items-center space-x-2">
            <h1 className="text-3xl font-serif text-zinc-100">PixelCam</h1>
          </Link>
        </div>
        <div className="flex items-center space-x-4">
          <Link href="/gallery" className="text-foreground hover:text-primary flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            <span className="hidden sm:inline text-sm">Gallery</span>
          </Link>
          
          <button 
            className="text-foreground hover:text-primary"
            onClick={onHelpClick}
            aria-label="Help"
          >
            <HelpCircle className="h-5 w-5" />
          </button>

          {user ? (
            <div className="flex items-center gap-4">
              <span className="text-foreground hidden md:inline text-sm truncate max-w-[150px]">
                {user.username}
              </span>
              <div className="flex-shrink-0">
                <CreditDisplay />
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                className="text-foreground hover:text-primary flex-shrink-0"
                onClick={() => logoutMutation.mutate()}
              >
                <LogOut className="h-5 w-5 mr-1" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          ) : (
            <Link href="/auth">
              <Button 
                variant="outline" 
                size="sm"
                className="text-foreground border-foreground/30 hover:bg-foreground/10"
              >
                <span>Login</span>
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
