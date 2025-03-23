import React from "react";
import CapturedItem from "./CapturedItem";
import type { CapturedItem as CapturedItemType } from "@/pages/Home";

interface ActivityFeedProps {
  capturedItems: CapturedItemType[];
  onViewItem: (item: CapturedItemType) => void;
}

export default function ActivityFeed({ 
  capturedItems, 
  onViewItem 
}: ActivityFeedProps) {
  return (
    <div className="bg-app-dark-light rounded-xl shadow-lg overflow-hidden">
      <div className="p-4 border-b border-gray-800">
        <h2 className="text-lg font-semibold">Recent Activity</h2>
      </div>
      <div className="p-4 max-h-60 overflow-y-auto">
        {capturedItems.length === 0 ? (
          <div className="text-white text-center py-4 font-medium">No activity yet</div>
        ) : (
          capturedItems.map((item) => (
            <CapturedItem 
              key={item.id} 
              item={item} 
              onView={() => onViewItem(item)} 
            />
          ))
        )}
      </div>
    </div>
  );
}
