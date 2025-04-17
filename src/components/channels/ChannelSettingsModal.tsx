import React, { useState } from 'react';
import { X, Edit2, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface ChannelSettingsModalProps {
  channel: {
    id: string;
    name: string;
    description: string | null;
    class_id: string;
    members: {
      user_id: string;
      role: "admin" | "member";
    }[];
  };
  onClose: () => void;
  onChannelUpdated?: () => void;
}

export default function ChannelSettingsModal({ 
  channel, 
  onClose, 
  onChannelUpdated 
}: ChannelSettingsModalProps) {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState(channel.name);
  const [description, setDescription] = useState(channel.description || '');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if current user is an admin
  const isCurrentUserAdmin = channel.members.some(
    member => member.user_id === profile?.id && member.role === 'admin'
  );

  // If not an admin, don't render the modal
  if (!isCurrentUserAdmin) {
    return null;
  }

  const handleUpdateChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setError('Channel name cannot be empty');
      return;
    }

    setIsUpdating(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('class_channels')
        .update({
          name: name.trim(),
          description: description.trim() || null
        })
        .eq('id', channel.id);

      if (updateError) throw updateError;

      onChannelUpdated?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update channel');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteChannel = async () => {
    if (!window.confirm('Are you sure you want to delete this channel? This action cannot be undone.')) return;

    setIsDeleting(true);
    setError(null);

    try {
      // Delete all channel members first
      const { error: membersDeleteError } = await supabase
        .from('channel_members')
        .delete()
        .eq('channel_id', channel.id);

      if (membersDeleteError) throw membersDeleteError;

      // Delete posts and their associated media
      const { error: postsDeleteError } = await supabase
        .from('channel_posts')
        .delete()
        .eq('channel_id', channel.id);

      if (postsDeleteError) throw postsDeleteError;

      // Finally delete the channel
      const { error: channelDeleteError } = await supabase
        .from('class_channels')
        .delete()
        .eq('id', channel.id);

      if (channelDeleteError) throw channelDeleteError;

      // Redirect to channels list
      navigate('/dashboard/channels');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete channel');
      setIsDeleting(false);
    }
  };

  const handleSaveSettings = async () => {
    setIsSubmitting(true);
    try {
      // Update the channel
      const { error: updateError } = await supabase
        .from('class_channels')
        .update({
          name: channelName,
          description: channelDescription,
          updated_at: new Date().toISOString()
        })
        .eq('id', channel.id);
        
      if (updateError) throw updateError;
      
      // Call onChannelUpdated to refresh the channel list
      onChannelUpdated();
      onClose();
    } catch (err) {
      console.error('Error updating channel:', err);
      setError(err instanceof Error ? err.message : 'Failed to update channel');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-brand-primary">
            Channel Settings
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
            {error}
          </div>
        )}

        <form onSubmit={handleUpdateChannel} className="space-y-4">
          <div>
            <label 
              htmlFor="channelName" 
              className="block text-sm font-medium text-brand-secondary-400 mb-1"
            >
              Channel Name
            </label>
            <input
              id="channelName"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-brand-accent"
              required
            />
          </div>

          <div>
            <label 
              htmlFor="channelDescription" 
              className="block text-sm font-medium text-brand-secondary-400 mb-1"
            >
              Description
            </label>
            <textarea
              id="channelDescription"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-brand-accent"
              rows={3}
            />
          </div>

          <div className="flex justify-between items-center">
            <button
              type="button"
              onClick={handleDeleteChannel}
              disabled={isDeleting}
              className="flex items-center text-red-500 hover:text-red-600 disabled:opacity-50"
            >
              <Trash2 className="w-5 h-5 mr-2" />
              Delete Channel
            </button>

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isUpdating}
                className="px-4 py-2 bg-brand-primary text-white rounded-md hover:bg-brand-secondary-400 disabled:bg-gray-400"
              >
                {isUpdating ? 'Updating...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
