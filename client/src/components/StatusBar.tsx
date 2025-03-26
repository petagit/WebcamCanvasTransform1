import React, { useState, useEffect } from "react";

interface StatusBarProps {
  isStreaming: boolean;
  cameraReady: boolean;
  activeTab?: string;
}

export default function StatusBar({ 
  isStreaming, 
  cameraReady,
  activeTab = "camera"
}: StatusBarProps) {
  const [time, setTime] = useState("00:00:00");
  const [startTime, setStartTime] = useState<number | null>(null);
  
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    // Only run timer on camera tab when camera is active
    if (activeTab === "camera" && (isStreaming || cameraReady)) {
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
      // Reset timer when camera is not active or not on camera tab
      setTime("00:00:00");
      setStartTime(null);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isStreaming, cameraReady, startTime, activeTab]);
  
  // Get status based on active tab
  const getStatusInfo = () => {
    if (activeTab === "camera") {
      if (isStreaming) {
        return {
          color: "bg-red-500",
          text: "Recording in progress",
          showTimer: true
        };
      } else if (cameraReady) {
        return {
          color: "bg-green-500",
          text: "Camera active",
          showTimer: true
        };
      } else {
        return {
          color: "bg-gray-500",
          text: "Camera ready",
          showTimer: false
        };
      }
    } else if (activeTab === "image") {
      return {
        color: "bg-blue-500",
        text: "Image Upload Mode",
        showTimer: false
      };
    } else {
      return {
        color: "bg-gray-500",
        text: "Ready",
        showTimer: false
      };
    }
  };

  const status = getStatusInfo();

  return (
    <div className="mb-4 p-2 rounded-lg bg-app-dark-light text-sm flex items-center justify-between">
      <div className="flex items-center">
        <div 
          className={`w-3 h-3 rounded-full mr-2 ${status.color}`}
        ></div>
        <span className="text-white font-medium">
          {status.text}
        </span>
      </div>
      {status.showTimer && (
        <div className="text-white font-mono">{time}</div>
      )}
    </div>
  );
}
