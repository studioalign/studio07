import React, { useState } from "react";
import {
  MoreVertical,
  ThumbsUp,
  MessageCircle,
  Trash2,
  Edit2,
  File,
  X,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "../../contexts/AuthContext";
import {
  deletePost,
  updatePost,
} from "../../utils/channelUtils";
import CommentSection from "./CommentSection";
import MediaGalleryModal from './MediaGalleryModal';

interface Media {
  id: string;
  url: string;
  type: "image" | "video" | "file" | "audio";
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
    media?: Media[];
    post_media?: Media[];
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
  const [selectedMedia, setSelectedMedia] = useState<Media | null>(null);
  const [showMediaGallery, setShowMediaGallery] = useState(false);
  const [selectedMediaId, setSelectedMediaId] = useState<string | null>(null);

  const { profile } = useAuth();
  const canModify = isAdmin || post.author.id === profile?.id;
  const hasLiked = post.reactions?.some(
    (reaction) => reaction.user_id === profile?.id
  );

  // Determine which media array to use (backwards compatibility)
  const postMedia = post.post_media || post.media || [];

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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update post");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderMedia = () => {
    if (!postMedia || postMedia.length === 0) {
      return null;
    }

    return (
      <div className="grid grid-cols-3 gap-2 mt-4">
        {postMedia.slice(0, 3).map((media, index) => (
          <div
            key={media.id}
            className={`
              aspect-square cursor-pointer hover:opacity-80 transition-opacity 
              relative ${postMedia.length > 3 && index === 2 ? 'overflow-hidden' : ''}
            `}
            onClick={() => setSelectedMedia(media)}
          >
            {media.type === 'image' ? (
              <img
                src={media.url}
                alt={media.filename}
                className="w-full h-full object-cover rounded-lg"
              />
            ) : media.type === 'video' ? (
              <div className="w-full h-full bg-gray-100 flex items-center justify-center rounded-lg relative">
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
              <div className="w-full h-full bg-gray-100 flex items-center justify-center rounded-lg">
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

            {/* Add overlay for more media */}
            {postMedia.length > 3 && index === 2 && (
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center text-white text-lg font-bold">
                +{postMedia.length - 3}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderSelectedMedia = () => {
    if (!selectedMedia) return null;

    return (
      <div
        className="fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center p-4"
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

        <div 
          onClick={(e) => e.stopPropagation()} 
          className="relative max-w-[90%] max-h-[90%] flex flex-col items-center"
        >
          {selectedMedia.type === 'image' ? (
            <img
              src={selectedMedia.url}
              alt={selectedMedia.filename}
              className="max-w-full max-h-full object-contain rounded-lg"
            />
          ) : selectedMedia.type === 'video' ? (
            <div className="bg-black max-w-full max-h-full">
              <video
                src={selectedMedia.url}
                controls
                autoPlay
                className="max-w-full max-h-full object-contain"
              />
            </div>
          ) : selectedMedia.type === 'audio' ? (
            <div className="bg-white p-6 rounded-lg max-w-md w-full">
              <p className="font-medium mb-3">{selectedMedia.filename}</p>
              <audio
                src={selectedMedia.url}
                controls
                autoPlay
                className="w-full mb-4"
              />
              <div>
                <a
                  href={selectedMedia.url}
                  download={selectedMedia.filename}
                  className="text-brand-primary hover:underline"
                >
                  Download Audio
                </a>
              </div>
            </div>
          ) : (
            <div className="bg-white p-6 rounded-lg max-w-md w-full">
              <div className="flex items-center mb-4">
                <File className="w-12 h-12 text-gray-500 mr-4" />
                <div>
                  <p className="font-medium">{selectedMedia.filename}</p>
                  <a
                    href={selectedMedia.url}
                    download={selectedMedia.filename}
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
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4">
        {/* Post Header */}
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-brand-secondary-100 flex items-center justify-center mr-3">
              <span className="text-brand-primary text-sm font-medium">
                {post.author?.name?.[0] || '?'}
              </span>
            </div>
            <div>
              <p className="font-medium text-gray-900">{post.author?.name || 'Unknown'}</p>
              <p className="text-xs text-gray-500">
                {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                {post.edited_at && <span className="ml-1 text-gray-400">(edited)</span>}
              </p>
            </div>
          </div>
          
          {/* Post Actions */}
          {canModify && (
            <div className="relative">
              <button 
                onClick={() => setShowMenu(!showMenu)}
                className="text-gray-500 hover:text-gray-700"
              >
                <MoreVertical className="w-5 h-5" />
              </button>
              {showMenu && (
                <div className="absolute right-0 top-full z-10 bg-white shadow-lg rounded-md border mt-1">
                  <button 
                    onClick={() => {
                      setIsEditing(true);
                      setShowMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center"
                  >
                    <Edit2 className="w-4 h-4 mr-2" /> Edit
                  </button>
                  <button 
                    onClick={handleDelete}
                    className="w-full text-left px-4 py-2 hover:bg-gray-100 text-red-500 flex items-center"
                  >
                    <Trash2 className="w-4 h-4 mr-2" /> Delete
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Post Content */}
        {isEditing ? (
          <div className="space-y-2">
            <textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-brand-accent"
              rows={3}
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setIsEditing(false)}
                className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={!editedContent.trim()}
                className="px-3 py-1 bg-brand-primary text-white rounded-md hover:bg-brand-secondary-400 disabled:bg-gray-400"
              >
                Save
              </button>
            </div>
          </div>
        ) : (
          <p className="text-gray-800 whitespace-pre-wrap">{post.content}</p>
        )}

        {/* Render Media */}
        {renderMedia()}

        {/* Post Actions */}
        <div className="flex items-center justify-between mt-4 border-t pt-3">
          <div className="flex items-center space-x-4">
            <button 
              onClick={handleLike}
              className={`flex items-center space-x-2 ${
                hasLiked ? 'text-brand-primary' : 'text-gray-500'
              }`}
            >
              <ThumbsUp className="w-5 h-5" />
              <span>{post.reactions?.length || 0}</span>
            </button>
            <button 
              onClick={() => setShowComments(!showComments)}
              className="flex items-center space-x-2 text-gray-500"
            >
              <MessageCircle className="w-5 h-5" />
              <span>{post.comments?.length || 0}</span>
            </button>
          </div>
        </div>

        {/* Media Gallery Modal */}
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

        {/* Selected Media Viewer */}
        {renderSelectedMedia()}
      </div>

      {/* Comments Section */}
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