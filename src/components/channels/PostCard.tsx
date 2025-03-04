import React, { useState, useContext } from "react";
import {
  MoreVertical,
  ThumbsUp,
  MessageCircle,
  Trash2,
  Edit2,
  Image,
  FileText,
  ExternalLink,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "../../contexts/AuthContext";
import {
  deletePost,
  updatePost,
} from "../../utils/channelUtils";
import CommentSection from "./CommentSection";
import { useChannel } from "../../hooks/useChannel";
import { X } from 'lucide-react';
import MediaGalleryModal from './MediaGalleryModal'; // Import MediaGalleryModal

interface Media {
  id: string;
  url: string;
  type: "image" | "video" | "file";
  filename: string;
}

interface PostCardProps {
  post: {
    id: string;
    content: string;
    author: {
      id: string;
      name: string;
    };
    created_at: string;
    edited_at: string | null;
    post_media: Media[]; // Changed to post_media
    reactions: {
      user_id: string;
    }[];
    comments: any[];
  };
  isAdmin: boolean;
  channelId: string;
  onToggleReaction?: (postId: string) => Promise<void>;
}

export default function PostCard({ 
  post, 
  isAdmin, 
  channelId,
  onToggleReaction
}: PostCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(post.content);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMediaId, setSelectedMediaId] = useState<string | null>(null); // Added selectedMediaId
  const [showMediaGallery, setShowMediaGallery] = useState(false); // Added showMediaGallery

  const { profile } = useAuth();
  const canModify = isAdmin || post.author.id === profile?.id;
  const hasLiked = post.reactions?.some(
    (reaction: any) => reaction.user_id === profile?.id
  );

  const handleLike = async () => {
    try {
      if (onToggleReaction) {
        await onToggleReaction(post.id);
      }
    } catch (err) {
      console.error("Error toggling reaction:", err);
    }
  };

  const handleDelete = async () => {
    if (window.confirm("Are you sure you want to delete this post?")) {
      setIsSubmitting(true);
      try {
        await deletePost(post.id);
        // Note: actual removal from UI will happen via real-time subscription
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to delete post");
      } finally {
        setIsSubmitting(false);
        setShowMenu(false);
      }
    }
  };

  const handleSaveEdit = async () => {
    if (!editedContent.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await updatePost(post.id, editedContent.trim());
      setIsEditing(false);
      // The real-time subscription will update the content
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update post");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderMedia = () => {
    if (!post.post_media || post.post_media.length === 0) {
      return null;
    }
  
    return (
      <div className="flex flex-wrap gap-2 mt-4">
        {post.post_media.map((media) => {
          if (selectedMedia && selectedMedia.id === media.id) {
            return (
              <div
                key={media.id}
                className="fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center p-8 overflow-auto"
                onClick={() => setSelectedMedia(null)}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedMedia(null);
                  }}
                  className="absolute top-4 right-4 text-white hover:bg-white/20 rounded-full p-2"
                  aria-label="Close"
                >
                  <X className="w-8 h-8" />
                </button>
  
                <div onClick={(e) => e.stopPropagation()} className="relative">
                  {media.type === 'image' ? (
                    <img
                      src={media.url}
                      alt={media.filename}
                      className="max-w-[90vw] max-h-[90vh] object-contain mx-auto"
                    />
                  ) : media.type === 'video' ? (
                    <div className="bg-black max-w-[90vw] max-h-[90vh] mx-auto">
                      <video
                        src={media.url}
                        controls
                        autoPlay
                        className="max-w-full max-h-full object-contain"
                      />
                    </div>
                  ) : media.type === 'audio' ? (
                    <div className="bg-white p-6 rounded-lg max-w-md w-full">
                      <p className="font-medium mb-3">{media.filename}</p>
                      <audio
                        src={media.url}
                        controls
                        autoPlay
                        className="w-full mb-4"
                      />
                      <a
                        href={media.url}
                        download={media.filename}
                        className="text-brand-primary hover:underline"
                      >
                        Download Audio
                      </a>
                    </div>
                  ) : (
                    <div className="bg-white p-6 rounded-lg max-w-md w-full">
                      <div className="flex items-center mb-4">
                        <File className="w-12 h-12 text-gray-500 mr-4" />
                        <div>
                          <p className="font-medium">{media.filename}</p>
                          <a
                            href={media.url}
                            download={media.filename}
                            className="text-brand-primary hover:underline"
                          >
                            Download File
                          </a>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          }
  
          // Thumbnail rendering logic
          return (
            <div
              key={media.id}
              className="aspect-square cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => setSelectedMedia(media)}
            >
              {media.type === 'image' ? (
                <img
                  src={media.url}
                  alt={media.filename}
                  className="w-full h-full object-cover rounded-lg"
                />
              ) : media.type === 'video' ? (
                <div className="w-full h-full bg-gray-100 flex items-center justify-center rounded-lg relative cursor-pointer">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-12 h-12 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M8 5v14l11-7z" fill="white" />
                      </svg>
                    </div>
                  </div>
                  <video src={media.url} className="absolute inset-0 w-full h-full object-cover opacity-0" />
                </div>
              ) : media.type === 'audio' ? (
                <div className="w-full h-full bg-gray-100 flex items-center justify-center rounded-lg cursor-pointer">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" fill="#4B5563" />
                  </svg>
                </div>
              ) : (
                <div className="w-full h-full bg-gray-100 flex items-center justify-center rounded-lg">
                  <File className="w-12 h-12 text-gray-500" />
                  <span className="ml-2 text-sm truncate">{media.filename}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4">
        {/* ... rest of the post content ... */}
        {renderMedia()}
        {showMediaGallery && (
          <MediaGalleryModal
            channelId={channelId}
            onClose={() => {
              setShowMediaGallery(false);
              setSelectedMediaId(null);
            }}
            selectedMediaId={selectedMediaId}
          />
        )}
        {/* ... rest of the post content ... */}
      </div>
      {showComments && (
        <CommentSection
          postId={post.id}
          channelId={channelId}
          comments={post.comments || []}
        />
      )}
    </div>
  );
}