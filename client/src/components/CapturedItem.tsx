import React from "react";
import { Eye } from "lucide-react";
import type { CapturedItem } from "@/pages/Home";

interface CapturedItemProps {
  item: CapturedItem;
  onView: () => void;
}

export default function CapturedItem({ 
  item, 
  onView 
}: CapturedItemProps) {
  const timeString = item.timestamp.toLocaleTimeString();
  
  return (
    <div className="flex items-center space-x-3 p-2 rounded hover:bg-gray-800 mb-2">
      <div className="w-12 h-12 bg-gray-700 rounded overflow-hidden flex-shrink-0">
        {item.type === "image" ? (
          <img src={item.url} alt="Captured" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
            </svg>
          </div>
        )}
      </div>
      
      <div className="flex-1">
        <div className="text-sm font-medium text-white">{item.type === "image" ? "Captured Image" : "Recorded Video"}</div>
        <div className="text-xs text-label">{timeString}</div>
      </div>
      
      <button 
        className="text-app-blue hover:text-blue-400"
        onClick={onView}
      >
        <Eye className="h-5 w-5" />
      </button>
    </div>
  );
}
