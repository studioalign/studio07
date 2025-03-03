import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { createPost } from "../utils/channelUtils";

interface Channel {
  id: string;
  name: string;
  description: string | null;
  class_id: string;
  members: {
    user_id: string;
    role: "admin" | "member";
  }[];
}

interface Post {
  id: string;
  content: string;
  author: {
    id: string;
    name: string;
  };
  created_at: string;
  edited_at: string | null;
  media: {
    id: string;
    url: string;
    type: "image" | "video" | "file";
    filename: string;
  }[];
  reactions: {
    user_id: string;
  }[];
  comments: {
    id: string;
    content: string;
    created_at: string;
    edited_at: string | null;
    author: {
      id: string;
      name: string;
    };
  }[];
}

interface ChannelState {
  channel: Channel | null;
  posts: Post[];
  loading: {
    channel: boolean;
    posts: boolean;
  };
  error: string | null;
}

export function useChannel(channelId: string) {
  const [state, setState] = useState<ChannelState>({
    channel: null,
    posts: [],
    loading: {
      channel: true,
      posts: true,
    },
    error: null,
  });

  const { profile } = useAuth();

  const fetchChannelData = useCallback(async () => {
    if (!channelId || !profile?.id) return;

    // Set loading and clear previous error
    setState(prev => ({
      ...prev,
      loading: { channel: true, posts: true },
      error: null,
    }));

    try {
      // Fetch channel details
      const { data: channelData, error: channelError } = await supabase
        .from("class_channels")
        .select(
          `
          id,
          name,
          description,
          class_id,
          members:channel_members (
            user_id,
            role
          )
        `
        )
        .eq("id", channelId)
        .single();

      if (channelError) throw channelError;

      // Fetch posts with related data
      const { data: postsData, error: postsError } = await supabase
        .from("channel_posts")
        .select(
          `
          id,
          content,
          author: users(
            id,
            name
          ),
          created_at,
          edited_at,
          media:post_media (
            id,
            url,
            type,
            filename
          ),
          reactions:post_reactions (
            user_id
          ),
          comments:post_comments (
            id,
            content,
            author: users(
              id,
              name
            ),
            created_at,
            edited_at
          )
        `
        )
        .eq("channel_id", channelId)
        .order("created_at", { ascending: false });

      if (postsError) throw postsError;

      setState(prev => ({
        ...prev,
        channel: channelData,
        posts: postsData || [],
        loading: {
          channel: false,
          posts: false,
        },
        error: null,
      }));
    } catch (err) {
      console.error("Error fetching channel data:", err);
      setState(prev => ({
        ...prev,
        error: err instanceof Error ? err.message : "Failed to fetch channel data",
        loading: {
          channel: false,
          posts: false,
        },
        channel: null,
        posts: [],
      }));
    }
  }, [channelId, profile?.id]);

  // Real-time subscriptions
  useEffect(() => {
    let postsChannel: any;

    const setupSubscriptions = async () => {
      // Fetch initial data
      await fetchChannelData();

      // Unsubscribe from existing channel if any
      if (postsChannel) await postsChannel.unsubscribe();

      // Posts subscription
      postsChannel = supabase
        .channel(`channel_posts:${channelId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "channel_posts",
            filter: `channel_id=eq.${channelId}`,
          },
          async (payload) => {
            // Fetch full post details
            const { data: fullPostData, error } = await supabase
              .from("channel_posts")
              .select(
                `
                id,
                content,
                author: users(
                  id,
                  name
                ),
                created_at,
                edited_at,
                media:post_media (
                  id,
                  url,
                  type,
                  filename
                ),
                reactions:post_reactions (
                  user_id
                ),
                comments:post_comments (
                  id,
                  content,
                  author: users(
                    id,
                    name
                  ),
                  created_at,
                  edited_at
                )
              `
              )
              .eq("id", payload.new.id)
              .single();

            if (error) {
              console.error("Error fetching new post details:", error);
              return;
            }

            // Optimistically add the new post
            setState(prev => ({
              ...prev,
              posts: [fullPostData, ...prev.posts],
            }));
          }
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "channel_posts",
            filter: `channel_id=eq.${channelId}`,
          },
          (payload) => {
            // Update existing post
            setState(prev => ({
              ...prev,
              posts: prev.posts.map(post => 
                post.id === payload.new.id 
                  ? { ...post, ...payload.new }
                  : post
              ),
            }));
          }
        )
        .on(
          "postgres_changes",
          {
            event: "DELETE",
            schema: "public",
            table: "channel_posts",
            filter: `channel_id=eq.${channelId}`,
          },
          (payload) => {
            // Remove deleted post
            setState(prev => ({
              ...prev,
              posts: prev.posts.filter(post => post.id !== payload.old.id),
            }));
          }
        )
        .subscribe();
    };

    setupSubscriptions();

    return () => {
      const cleanup = async () => {
        if (postsChannel) await postsChannel.unsubscribe();
      };
      cleanup();
    };
  }, [channelId, fetchChannelData]);

  // Method to add a new post with error handling
  const addPost = useCallback(async (content: string, files: File[]) => {
    // Reset error state before attempting to add post
    setState(prev => ({
      ...prev,
      error: null,
    }));

    try {
      setState(prev => ({
        ...prev,
        loading: { ...prev.loading, posts: true }
      }));

      // Use existing createPost utility function
      const newPost = await createPost(channelId, content, files);

      // Optimistically add the post (will be replaced by real-time update)
      setState(prev => ({
        ...prev,
        posts: [newPost, ...prev.posts],
        loading: { ...prev.loading, posts: false }
      }));

      return newPost;
    } catch (err) {
      setState(prev => ({
        ...prev,
        error: err instanceof Error ? err.message : "Failed to create post",
        loading: { ...prev.loading, posts: false }
      }));
      throw err;
    }
  }, [channelId]);

  return { 
    channel: state.channel, 
    posts: state.posts, 
    loading: state.loading, 
    error: state.error,
    addPost,
    fetchChannelData // Expose for manual refresh if needed
  };
}