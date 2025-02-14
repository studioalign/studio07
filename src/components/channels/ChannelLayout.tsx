import React, { useState, useEffect } from 'react';
import ChannelList from './ChannelList';
import ChannelFeed from './ChannelFeed';
import NewChannelModal from './NewChannelModal'; // Import the modal here
import { useParams } from 'react-router-dom';
import { MessageSquare, ArrowLeft } from 'lucide-react';

export default function ChannelLayout() {
  const { channelId } = useParams();
  const [showList, setShowList] = useState(true);
  const [showNewChannelModal, setShowNewChannelModal] = useState(false); // State for modal

  useEffect(() => {
    if (channelId && window.innerWidth < 1024) {
      setShowList(false);
    }
  }, [channelId]);

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
        {!channelId ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-500">
            <MessageSquare className="w-16 h-16 mb-4 text-brand-secondary-400" />
            <h2 className="text-xl font-semibold text-brand-primary mb-2">Welcome to Class Channels</h2>
            <p className="text-center max-w-md mb-4">
              Stay connected with your class community. Select a channel to view updates,
              announcements, and join the conversation.
            </p>
          </div>
        ) : (
          <ChannelFeed channelId={channelId} />
        )}
      </div>

      {/* New Channel Modal */}
      {showNewChannelModal && (
        <NewChannelModal onClose={() => setShowNewChannelModal(false)} />
      )}
    </div>
  );
}
