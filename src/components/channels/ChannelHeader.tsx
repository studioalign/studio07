import React, { useState } from "react";
import { Hash, Users, Settings, Info, RefreshCw, Image } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Channel {
  id: string;
  name: string;
  description: string | null;
  class_id: string;
  members: {
    user_id: string;
    role: "admin" | "member";
  }[];
  created_at?: string;
}

interface ChannelHeaderProps {
  channel: Channel;
  isAdmin: boolean;
  onShowMembers: () => void;
  onRefresh: () => void;
  onShowSettings: () => void;
  onShowMediaGallery: () => void;
  isRefreshing: boolean;
}

export default function ChannelHeader({ 
  channel, 
  isAdmin, 
  onShowMembers,
  onRefresh,
  onShowSettings,
  onShowMediaGallery,
  isRefreshing
}: ChannelHeaderProps) {
  const [showDescription, setShowDescription] = useState(false);
  
  return (
    <div className="bg-white border-b px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Hash className="h-6 w-6 text-brand-primary" />
          <h1 className="text-xl font-semibold text-gray-900">{channel.name}</h1>
          {channel.description && (
            <button 
              onClick={() => setShowDescription(!showDescription)}
              className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
              title={showDescription ? "Hide description" : "Show description"}
            >
              <Info className="h-5 w-5" />
            </button>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-2 text-gray-500 hover:text-brand-primary rounded-full hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Refresh channel"
          >
            <RefreshCw className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
          
          <button 
            onClick={onShowMediaGallery}
            className="p-2 text-gray-500 hover:text-brand-primary rounded-full hover:bg-gray-100"
            title="View media"
          >
            <Image className="h-5 w-5" />
            <span className="sr-only">Media Gallery</span>
          </button>
          
          <button 
            onClick={onShowMembers}
            className="p-2 text-gray-500 hover:text-brand-primary rounded-full hover:bg-gray-100"
            title="Show members"
          >
            <Users className="h-5 w-5" />
            <span className="sr-only">Members</span>
          </button>
          
          {isAdmin && (
            <button 
              onClick={onShowSettings}
              className="p-2 text-gray-500 hover:text-brand-primary rounded-full hover:bg-gray-100"
              title="Channel settings"
            >
              <Settings className="h-5 w-5" />
              <span className="sr-only">Settings</span>
            </button>
          )}
        </div>
      </div>
      
      {showDescription && channel.description && (
        <div className="mt-3 p-3 bg-gray-50 rounded-md text-sm text-gray-600">
          {channel.description}
          {channel.created_at && (
            <p className="text-xs text-gray-400 mt-2">
              Created {formatDistanceToNow(new Date(channel.created_at), { addSuffix: true })}
            </p>
          )}
        </div>
      )}
      
      <div className="flex items-center text-xs text-gray-500 mt-2">
        <Users className="h-3 w-3 mr-1" />
        <span>{channel.members?.length || 0} members</span>
      </div>
    </div>
  );
}