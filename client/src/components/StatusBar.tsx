import React, { useState, useEffect } from "react";

interface StatusBarProps {
  isStreaming: boolean;
  cameraReady: boolean;
}

export default function StatusBar({ 
  isStreaming, 
  cameraReady 
}: StatusBarProps) {
  const [time, setTime] = useState("00:00:00");
  const [startTime, setStartTime] = useState<number | null>(null);
  
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    // Start timer when either streaming or camera is active
    if (isStreaming || cameraReady) {
      // Only set startTime if it hasn't been set yet
      if (!startTime) {
        setStartTime(Date.now());
      }
      
      interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - (startTime || Date.now())) / 1000);
        const hours = Math.floor(elapsed / 3600).toString().padStart(2, '0');
        const minutes = Math.floor((elapsed % 3600) / 60).toString().padStart(2, '0');
        const seconds = (elapsed % 60).toString().padStart(2, '0');
        setTime(`${hours}:${minutes}:${seconds}`);
      }, 1000);
    } else {
      // Reset timer when camera is not active
      setTime("00:00:00");
      setStartTime(null);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isStreaming, cameraReady, startTime]);
  
  return (
    <div className="mb-4 p-2 rounded-lg bg-app-dark-light text-sm flex items-center justify-between">
      <div className="flex items-center">
        <div 
          className={`w-3 h-3 rounded-full mr-2 ${
            isStreaming 
              ? "bg-red-500" 
              : cameraReady 
                ? "bg-green-500" 
                : "bg-gray-500"
          }`}
        ></div>
        <span className="text-white font-medium">
          {isStreaming 
            ? "Recording in progress" 
            : cameraReady 
              ? "Camera active" 
              : "Camera ready"
          }
        </span>
      </div>
      <div className="text-white font-mono">{time}</div>
    </div>
  );
}
