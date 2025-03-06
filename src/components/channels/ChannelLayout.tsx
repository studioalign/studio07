import React, { useState, useEffect } from 'react';
import ChannelList from './ChannelList';
import ChannelFeed from './ChannelFeed';
import NewChannelModal from './NewChannelModal';
import { useParams } from 'react-router-dom';
import { MessageSquare, ArrowLeft } from 'lucide-react';
import { useChannels } from '../../hooks/useChannels';

export default function ChannelLayout() {
  const { channelId } = useParams();
  const { channels, loading, error } = useChannels();
  const [showList, setShowList] = useState(true);
  const [showNewChannelModal, setShowNewChannelModal] = useState(false);

  useEffect(() => {
    if (channelId && window.innerWidth < 1024) {
      setShowList(false);
    }
  }, [channelId]);

  // Render loading state with more detailed UI
  if (loading) {
    return (
      <div className="h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse space-y-4">
            <div className="h-12 bg-gray-200 rounded w-64 mx-auto" />
            <div className="h-8 bg-gray-200 rounded w-48 mx-auto" />
          </div>
          <p className="mt-4 text-gray-500">Loading channels...</p>
        </div>
      </div>
    );
  }

  // Handle error state
  if (error) {
    return (
      <div className="h-[calc(100vh-4rem)] flex flex-col items-center justify-center text-red-500 p-8">
        <MessageSquare className="w-16 h-16 mb-4 text-red-400" />
        <h2 className="text-xl font-semibold mb-2">Oops! Something went wrong</h2>
        <p className="text-center max-w-md mb-4">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-brand-primary text-white rounded-md hover:bg-brand-secondary-400"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex relative">
      {/* Mobile back button when showing feed */}
      {!showList && channelId && (
        <button
          onClick={() => setShowList(true)}
          className="lg:hidden fixed top-3 left-4 z-50 p-2 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
      )}

      <div
        className={`absolute lg:relative w-full lg:w-80 border-r bg-white transition-transform duration-200 ease-in-out ${
          showList ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <ChannelList onNewChannel={() => setShowNewChannelModal(true)} />
      </div>

      <div
        className={`absolute lg:relative inset-0 lg:inset-auto flex-1 bg-gray-50 transition-transform duration-200 ease-in-out ${
          showList ? 'translate-x-full lg:translate-x-0' : 'translate-x-0'
        }`}
      >
        {channels.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-500">
            <MessageSquare className="w-16 h-16 mb-4 text-brand-secondary-400" />
            <h2 className="text-xl font-semibold text-brand-primary mb-2">Welcome to Class Channels</h2>
            <p className="text-center max-w-md mb-4">
              Stay connected with your class community. Select a channel to view updates,
              announcements, and join the conversation.
            </p>
            <div className="p-4 bg-brand-secondary-100/10 rounded-lg text-sm">
              <p className="text-brand-secondary-400">
                💡 Tip: Channels are a great way to share important information 
                and keep everyone in the loop.
              </p>
            </div>
          </div>
        ) : channelId ? (
          <ChannelFeed channelId={channelId} />
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-gray-500">
            <MessageSquare className="w-16 h-16 mb-4 text-brand-secondary-400" />
            <p className="text-lg font-medium">Select a channel</p>
            <p className="text-sm">
              Choose a channel from the list to view its contents
            </p>
          </div>
        )}
      </div>

      {/* New Channel Modal */}
      {showNewChannelModal && (
        <NewChannelModal onClose={() => setShowNewChannelModal(false)} />
      )}
    </div>
  );
}