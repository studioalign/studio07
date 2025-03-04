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
    media: Media[];
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
  const [showMediaExpanded, setShowMediaExpanded] = useState<string | null>(null);
  
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
    if (!post.media || post.media.length === 0) return null;

    return (
      <div className="mt-4 space-y-2">
        {post.media.map((item: Media) => (
          <div key={item.id} className="mt-2 relative">
            {item.type === "image" ? (
              <div className="relative">
                <img
                  src={item.url}
                  alt=""
                  className={`rounded-lg ${
                    showMediaExpanded === item.id 
                      ? "max-h-96 w-auto mx-auto cursor-zoom-out" 
                      : "max-h-40 cursor-zoom-in"
                  }`}
                  onClick={() => setShowMediaExpanded(
                    showMediaExpanded === item.id ? null : item.id
                  )}
                />
                {showMediaExpanded === item.id && (
                  <div 
                    className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center"
                    onClick={() => setShowMediaExpanded(null)}
                  >
                    <img 
                      src={item.url} 
                      alt="" 
                      className="max-h-[80vh] max-w-[90vw]" 
                    />
                    <button 
                      className="absolute top-4 right-4 text-white p-2 bg-black bg-opacity-50 rounded-full"
                      onClick={() => setShowMediaExpanded(null)}
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center p-3 bg-gray-100 rounded-lg">
                <FileText className="w-5 h-5 text-gray-500 mr-2" />
                <span className="text-sm mr-2 flex-1 truncate">
                  {item.filename}
                </span>
                <a
                  href={item.url}
                  className="text-brand-primary hover:underline flex items-center"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="w-4 h-4 mr-1" />
                  <span className="text-sm">Open</span>
                </a>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4">
        <div className="flex justify-between items-start">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-brand-secondary-100 flex items-center justify-center">
              <span className="text-brand-primary font-medium">
                {post.author.name?.[0] || '?'}
              </span>
            </div>
            <div className="ml-3">
              <p className="font-medium text-gray-900">{post.author.name}</p>
              <p className="text-sm text-gray-500">
                {formatDistanceToNow(new Date(post.created_at), {
                  addSuffix: true,
                })}
                {post.edited_at && (
                  <span className="ml-1 text-gray-400">(edited)</span>
                )}
              </p>
            </div>
          </div>

          {canModify && (
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <MoreVertical className="w-5 h-5" />
              </button>
              {showMenu && (
                <div className="absolute right-0 mt-1 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
                  <div className="py-1">
                    <button
                      onClick={() => {
                        setIsEditing(true);
                        setShowMenu(false);
                      }}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <Edit2 className="w-4 h-4 mr-2" />
                      Edit Post
                    </button>
                    <button
                      onClick={handleDelete}
                      disabled={isSubmitting}
                      className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      {isSubmitting ? "Deleting..." : "Delete Post"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mt-4">
          {isEditing ? (
            <div className="space-y-2">
              <textarea
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                className={`w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-transparent ${
                  error ? "border-red-500" : ""
                }`}
                rows={3}
              />
              {error && <p className="text-sm text-red-500">{error}</p>}
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={isSubmitting || !editedContent.trim()}
                  className="px-3 py-1 bg-brand-primary text-white rounded-md hover:bg-brand-secondary-400 disabled:bg-gray-400"
                >
                  {isSubmitting ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          ) : (
            <p className="text-gray-900 whitespace-pre-wrap">{post.content}</p>
          )}
        </div>

        {renderMedia()}

        <div className="mt-4 flex items-center space-x-4">
          <button
            onClick={handleLike}
            className={`flex items-center px-3 py-1 rounded-md transition-colors ${
              hasLiked
                ? "text-brand-primary bg-brand-secondary-100/20"
                : "text-gray-500 hover:text-brand-primary hover:bg-gray-100"
            }`}
          >
            <ThumbsUp className="w-5 h-5 mr-1" />
            <span>{post.reactions?.length || 0}</span>
          </button>
          <button
            onClick={() => setShowComments(!showComments)}
            className={`flex items-center px-3 py-1 rounded-md transition-colors ${
              showComments
                ? "text-brand-primary bg-brand-secondary-100/20"
                : "text-gray-500 hover:text-brand-primary hover:bg-gray-100"
            }`}
          >
            <MessageCircle className="w-5 h-5 mr-1" />
            <span>{post.comments?.length || 0}</span>
          </button>
        </div>
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