import React from "react";
import { Camera, HelpCircle, ImageIcon, LogOut } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "../lib/clerk-provider"; // Import from clerk-provider instead
import { Button } from "@/components/ui/button";

interface HeaderProps {
  onHelpClick: () => void;
}

export default function Header({ onHelpClick }: HeaderProps) {
  const { user, logoutMutation } = useAuth();

  return (
    <header className="bg-app-dark-light shadow-md">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Link href="/" className="flex items-center space-x-2">
            <Camera className="h-8 w-8 text-app-blue" />
            <h1 className="text-2xl font-bold text-white text-shadow">PixelCam</h1>
          </Link>
        </div>
        <div className="flex items-center space-x-4">
          <Link href="/gallery" className="text-white hover:text-blue-400 flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            <span className="hidden sm:inline">Gallery</span>
          </Link>
          
          <button 
            className="text-white hover:text-blue-400"
            onClick={onHelpClick}
            aria-label="Help"
          >
            <HelpCircle className="h-6 w-6" />
          </button>

          {user ? (
            <div className="flex items-center gap-3">
              <span className="text-white hidden md:inline text-sm truncate max-w-[150px]">
                {user.username}
              </span>
              <Button 
                variant="ghost" 
                size="sm"
                className="text-white hover:text-red-400"
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
                className="text-white border-white hover:bg-white hover:text-app-dark-light"
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
