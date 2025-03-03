import React, { useState, useRef } from 'react';
import { Image, Paperclip, Send, X } from 'lucide-react';
import { createPost } from '../../utils/channelUtils';
import { notificationService } from '../../services/notificationService';
import { useAuth } from '../../contexts/AuthContext';

interface PostComposerProps {
  channelId: string;
  channelName: string;
}

export default function PostComposer({ channelId, channelName }: PostComposerProps) {
  const [content, setContent] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { profile } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && files.length === 0) return;
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Create the post
      const newPost = await createPost(channelId, content, files);

      // Send notification to studio members
      if (profile?.studio?.id) {
        await notificationService.notifyNewChannelPost(
          profile.studio.id, 
          channelId, 
          channelName, 
          profile.name || 'A user', 
          newPost.id, 
          content.length > 50 
            ? content.substring(0, 47) + '...' 
            : content
        );
      }

      // Reset form
      setContent('');
      setFiles([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create post');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Write your message..."
        className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-transparent resize-none ${
          error ? 'border-red-500' : ''
        }`}
        rows={3}
      />

      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}

      {files.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {files.map((file, index) => (
            <div
              key={index}
              className="flex items-center bg-gray-100 rounded-md px-3 py-1"
            >
              <span className="text-sm text-gray-600">{file.name}</span>
              <button
                type="button"
                onClick={() => setFiles(files.filter((_, i) => i !== index))}
                className="ml-2 text-gray-500 hover:text-red-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-between items-center">
        <div className="flex space-x-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-gray-500 hover:text-brand-primary rounded-full hover:bg-gray-100"
          >
            <Image className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-gray-500 hover:text-brand-primary rounded-full hover:bg-gray-100"
          >
            <Paperclip className="w-5 h-5" />
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            className="hidden"
            multiple
            accept="image/*,.pdf,.doc,.docx"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting || (!content.trim() && files.length === 0)}
          className="flex items-center px-4 py-2 bg-brand-primary text-white rounded-md hover:bg-brand-secondary-400 disabled:bg-gray-400"
        >
          <Send className="w-5 h-5 mr-2" />
          {isSubmitting ? 'Posting...' : 'Post'}
        </button>
      </div>
    </form>
  );
}