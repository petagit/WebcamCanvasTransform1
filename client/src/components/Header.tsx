import React from "react";
import { Camera, HelpCircle } from "lucide-react";

interface HeaderProps {
  onHelpClick: () => void;
}

export default function Header({ onHelpClick }: HeaderProps) {
  return (
    <header className="bg-app-dark-light shadow-md">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Camera className="h-8 w-8 text-app-blue" />
          <h1 className="text-2xl font-bold text-white text-shadow">PixelCam</h1>
        </div>
        <div className="flex items-center space-x-4">
          <button 
            className="text-white hover:text-blue-400"
            onClick={onHelpClick}
            aria-label="Help"
          >
            <HelpCircle className="h-6 w-6" />
          </button>
        </div>
      </div>
    </header>
  );
}
