import React, { useState, useRef } from 'react';
import { Image, Paperclip, Send, X } from 'lucide-react';
import { createPost } from '../../utils/channelUtils';
import { notificationService } from '../../services/notificationService';
import { useAuth } from '../../contexts/AuthContext';

interface PostComposerProps {
  channelId: string;
  channelName?: string; // Made optional for backward compatibility
}

const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB (appropriate for ~3min video)
const MAX_AUDIO_SIZE = 20 * 1024 * 1024; // 20MB
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB for other files

export default function PostComposer({ channelId, channelName = "this channel" }: PostComposerProps) {
  const [content, setContent] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<{[key: string]: number}>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { profile } = useAuth();
  const dropAreaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && files.length === 0) return;
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Create the post
      const newPost = await createPost(channelId, content, files);
      console.log("Post created:", newPost);

      // Send notification to studio members
      if (profile?.studio?.id) {
        try {
          await notificationService.notifyNewChannelPost(
            profile.studio.id, 
            channelId, 
            channelName, 
            profile.name || 'A user', 
            newPost.id, 
            content.length > 50 
              ? content.substring(0, 47) + '...' 
              : content,
              profile.id
          );
          console.log("Channel post notification sent");
        } catch (notifyError) {
          console.error("Failed to send notification:", notifyError);
          // Continue even if notification fails
        }
      }

      // Reset form
      setContent('');
      setFiles([]);
      setUploadProgress({});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create post');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      
      // Validate each file
      const invalidFiles = newFiles.map(file => ({
        file,
        error: validateFile(file)
      })).filter(item => item.error);
      
      if (invalidFiles.length > 0) {
        setError(invalidFiles.map(item => `${item.file.name}: ${item.error}`).join(', '));
        return;
      }
      
      setFiles(prev => [...prev, ...newFiles]);
      
      // Initialize progress for new files
      const newProgress = {...uploadProgress};
      newFiles.forEach(file => {
        newProgress[file.name] = 0;
      });
      setUploadProgress(newProgress);
    }
  };

  // Handle drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (dropAreaRef.current) {
      dropAreaRef.current.classList.add('border-brand-primary');
    }
  };
  
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (dropAreaRef.current) {
      dropAreaRef.current.classList.remove('border-brand-primary');
    }
  };
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (dropAreaRef.current) {
      dropAreaRef.current.classList.remove('border-brand-primary');
    }
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const newFiles = Array.from(e.dataTransfer.files);
      setFiles(prev => [...prev, ...newFiles]);
      
      // Initialize progress for new files
      const newProgress = {...uploadProgress};
      newFiles.forEach(file => {
        newProgress[file.name] = 0;
      });
      setUploadProgress(newProgress);
    }
  };
  
  const validateFile = (file) => {
    if (file.type.startsWith('video/') && file.size > MAX_VIDEO_SIZE) {
      return `Video files must be under ${Math.round(MAX_VIDEO_SIZE/1024/1024)}MB`;
    }
    if (file.type.startsWith('audio/') && file.size > MAX_AUDIO_SIZE) {
      return `Audio files must be under ${Math.round(MAX_AUDIO_SIZE/1024/1024)}MB`;
    }
    if (file.type.startsWith('image/') && file.size > MAX_IMAGE_SIZE) {
      return `Images must be under ${Math.round(MAX_IMAGE_SIZE/1024/1024)}MB`;
    }
    if (file.size > MAX_FILE_SIZE) {
      return `Files must be under ${Math.round(MAX_FILE_SIZE/1024/1024)}MB`;
    }
    return null;
  };

  // Handle paste for images
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          setFiles(prev => [...prev, file]);
          
          // Initialize progress
          setUploadProgress(prev => ({
            ...prev,
            [file.name]: 0
          }));
        }
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <textarea
        ref={dropAreaRef}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onPaste={handlePaste}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        placeholder={`Write your message in ${channelName}...`}
        className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-transparent resize-none transition-colors ${
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
              className="flex items-center bg-gray-100 rounded-md px-3 py-1 group relative"
            >
              {file.type.startsWith('image/') && (
                <div className="absolute bottom-full mb-2 left-0 bg-gray-900 rounded p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <img 
                    src={URL.createObjectURL(file)} 
                    alt="Preview" 
                    className="h-24 w-auto max-w-xs object-contain rounded"
                  />
                </div>
              )}
              
              <span className="text-sm text-gray-600 max-w-xs truncate">{file.name}</span>
              
              {uploadProgress[file.name] > 0 && uploadProgress[file.name] < 100 && (
                <div className="ml-2 h-1 w-16 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-brand-primary" 
                    style={{ width: `${uploadProgress[file.name]}%` }}
                  ></div>
                </div>
              )}
              
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
            onClick={() => {
              if (fileInputRef.current) {
                fileInputRef.current.accept = "image/*,video/*,audio/*";
                fileInputRef.current.click();
              }
            }}
            className="p-2 text-gray-500 hover:text-brand-primary rounded-full hover:bg-gray-100"
            title="Attach Media"
          >
            <Image className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => {
              if (fileInputRef.current) {
                fileInputRef.current.accept = ".pdf,.doc,.docx,.xls,.xlsx,.txt";
                fileInputRef.current.click();
              }
            }}
            className="p-2 text-gray-500 hover:text-brand-primary rounded-full hover:bg-gray-100"
            title="Attach files"
          >
            <Paperclip className="w-5 h-5" />
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            className="hidden"
            multiple
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting || (!content.trim() && files.length === 0)}
          className="flex items-center px-4 py-2 bg-brand-primary text-white rounded-md hover:bg-brand-secondary-400 disabled:bg-gray-400"
        >
          {isSubmitting ? (
            <span className="flex items-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Posting...
            </span>
          ) : (
            <>
              <Send className="w-5 h-5 mr-2" />
              Post
            </>
          )}
        </button>
      </div>
    </form>
  );
}