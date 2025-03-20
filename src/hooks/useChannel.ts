import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { createPost } from "../utils/channelUtils";

interface Channel {
	id: string;
	name: string;
	description: string | null;
	class_id: string;
	created_at: string;
	updated_at: string;
}

interface Comment {
	id: string;
	content: string;
	created_at: string;
	edited_at: string | null;
	author: {
		id: string;
		name: string;
	};
}

interface Media {
	id: string;
	url: string;
	type: "image" | "video" | "file";
	filename: string;
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
	media: Media[];
	reactions: {
		user_id: string;
	}[];
	comments: Comment[];
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
	
	// Track processed posts to prevent duplicates
	const processedPostIdsRef = useRef<Set<string>>(new Set());
	const processedCommentIdsRef = useRef<Set<string>>(new Set());
	const processedReactionIdsRef = useRef<Map<string, Set<string>>>(new Map());
	const channelsRef = useRef<{
		posts?: ReturnType<typeof supabase.channel>;
		comments?: ReturnType<typeof supabase.channel>;
		reactions?: ReturnType<typeof supabase.channel>;
	}>({});

	// Clean up function for all channels
	const cleanupChannels = useCallback(() => {
		Object.values(channelsRef.current).forEach(channel => {
			if (channel) {
				supabase.removeChannel(channel);
			}
		});
		channelsRef.current = {};
	}, []);

	const fetchChannelData = useCallback(async () => {
		if (!channelId || !profile?.id) return;

		console.log("Fetching channel data for channel:", channelId);
		
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

			// Store processed post IDs
			if (postsData) {
				postsData.forEach(post => {
					processedPostIdsRef.current.add(post.id);
					
					// Also track comments
					if (post.comments) {
						post.comments.forEach(comment => {
							processedCommentIdsRef.current.add(comment.id);
						});
					}
					
					// And reactions
					if (post.reactions) {
						if (!processedReactionIdsRef.current.has(post.id)) {
							processedReactionIdsRef.current.set(post.id, new Set());
						}
						post.reactions.forEach(reaction => {
							processedReactionIdsRef.current.get(post.id)?.add(reaction.user_id);
						});
					}
				});
			}

			console.log("Channel data loaded with", postsData?.length || 0, "posts");

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

	// Set up real-time subscriptions
	useEffect(() => {
		if (!channelId || !profile?.id) return;

		console.log("Setting up real-time subscriptions for channel:", channelId);
		
		// Clean up existing subscriptions
		cleanupChannels();
		
		// Reset tracking refs when changing channels
		processedPostIdsRef.current = new Set();
		processedCommentIdsRef.current = new Set();
		processedReactionIdsRef.current = new Map();
		
		// Fetch initial data
		fetchChannelData();

		// Posts subscription
		const postsChannel = supabase
			.channel(`channel-posts-${channelId}`)
			.on(
				"postgres_changes",
				{
					event: "INSERT",
					schema: "public",
					table: "channel_posts",
					filter: `channel_id=eq.${channelId}`,
				},
				async (payload) => {
					console.log("New post detected:", payload.new.id);
					
					// Check if already processed
					if (processedPostIdsRef.current.has(payload.new.id)) {
						console.log("Post already processed, skipping:", payload.new.id);
						return;
					}
					
					processedPostIdsRef.current.add(payload.new.id);
					
					// Fetch full post details
					try {
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

						// Add the new post to state
						setState(prev => ({
							...prev,
							posts: [fullPostData, ...prev.posts],
						}));
						
						console.log("Added new post to state:", fullPostData.id);
					} catch (err) {
						console.error("Error processing new post:", err);
					}
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
					console.log("Post update detected:", payload.new.id);
					
					// Update existing post
					setState(prev => ({
						...prev,
						posts: prev.posts.map(post => 
							post.id === payload.new.id 
								? { ...post, content: payload.new.content, edited_at: payload.new.edited_at }
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
					console.log("Post deletion detected:", payload.old.id);
					
					// Remove deleted post
					setState(prev => ({
						...prev,
						posts: prev.posts.filter(post => post.id !== payload.old.id),
					}));
					
					// Remove from processed set
					processedPostIdsRef.current.delete(payload.old.id);
				}
			)
			.subscribe((status, err) => {
                console.log("Posts channel subscription status:", status, err);
            });
		
		channelsRef.current.posts = postsChannel;

		// Comments subscription
		const commentsChannel = supabase
			.channel(`channel-comments-${channelId}`)
			.on(
				"postgres_changes",
				{
					event: "INSERT",
					schema: "public",
					table: "post_comments",
					// Add a filter to only process comments from posts in this channel
					filter: `post_id=in.(
						SELECT id FROM channel_posts WHERE channel_id=${channelId}
					)`,
				},
				async (payload) => {
					console.log("New comment detected:", payload.new.id);
					
					// Check if already processed
					if (processedCommentIdsRef.current.has(payload.new.id)) {
						console.log("Comment already processed, skipping:", payload.new.id);
						return;
					}
					
					processedCommentIdsRef.current.add(payload.new.id);
					
					const postId = payload.new.post_id;
					
					// Check if the comment belongs to a post in this channel
					setState(prev => {
						const postIndex = prev.posts.findIndex(post => post.id === postId);
						if (postIndex === -1) return prev; // Post not found in this channel
						
						// Fetch the full comment with author details
						supabase
							.from("post_comments")
							.select(`
								id,
								content,
								created_at,
								edited_at,
								author: users(
									id,
									name
								)
							`)
							.eq("id", payload.new.id)
							.single()
							.then(({ data: comment, error }) => {
								if (error || !comment) {
									console.error("Error fetching comment details:", error);
									return;
								}
								
								// Update state with the new comment
								setState(currentState => {
									const updatedPosts = [...currentState.posts];
									const postIndex = updatedPosts.findIndex(post => post.id === postId);
									
									if (postIndex !== -1) {
										updatedPosts[postIndex] = {
											...updatedPosts[postIndex],
											comments: [...updatedPosts[postIndex].comments, comment]
										};
									}
									
									return {
										...currentState,
										posts: updatedPosts
									};
								});
							});
						
						return prev;
					});
				}
			)
			.on(
				"postgres_changes",
				{
					event: "UPDATE",
					schema: "public",
					table: "post_comments",
				},
				(payload) => {
					console.log("Comment update detected:", payload.new.id);
					
					const commentId = payload.new.id;
					const postId = payload.new.post_id;
					
					// Update the comment in state
					setState(prev => {
						const updatedPosts = prev.posts.map(post => {
							if (post.id === postId) {
								return {
									...post,
									comments: post.comments.map(comment => 
										comment.id === commentId 
											? { ...comment, content: payload.new.content, edited_at: payload.new.edited_at }
											: comment
									)
								};
							}
							return post;
						});
						
						return {
							...prev,
							posts: updatedPosts
						};
					});
				}
			)
			.on(
				"postgres_changes",
				{
					event: "DELETE",
					schema: "public",
					table: "post_comments",
				},
				(payload) => {
					console.log("Comment deletion detected:", payload.old.id);
					
					const commentId = payload.old.id;
					const postId = payload.old.post_id;
					
					// Remove the comment from state
					setState(prev => {
						const updatedPosts = prev.posts.map(post => {
							if (post.id === postId) {
								return {
									...post,
									comments: post.comments.filter(comment => comment.id !== commentId)
								};
							}
							return post;
						});
						
						return {
							...prev,
							posts: updatedPosts
						};
					});
					
					// Remove from processed set
					processedCommentIdsRef.current.delete(commentId);
				}
			)
			.subscribe((status, err) => {
                console.log("Comments channel subscription status:", status, err);
            });
		
		channelsRef.current.comments = commentsChannel;

		// Reactions subscription
		const reactionsChannel = supabase
			.channel(`channel-reactions-${channelId}`)
			.on(
				"postgres_changes",
				{
					event: "INSERT",
					schema: "public",
					table: "post_reactions",
				},
				(payload) => {
					console.log("New reaction detected:", payload.new);
					
					const postId = payload.new.post_id;
					const userId = payload.new.user_id;
					
					// Check if already processed
					if (processedReactionIdsRef.current.get(postId)?.has(userId)) {
						console.log("Reaction already processed, skipping");
						return;
					}
					
					// Add to processed set
					if (!processedReactionIdsRef.current.has(postId)) {
						processedReactionIdsRef.current.set(postId, new Set());
					}
					processedReactionIdsRef.current.get(postId)?.add(userId);
					
					// Update the post with the new reaction
					setState(prev => {
						const updatedPosts = prev.posts.map(post => {
							if (post.id === postId) {
								// Check if reaction already exists to prevent duplicates
								if (post.reactions.some(reaction => reaction.user_id === userId)) {
									return post;
								}
								
								return {
									...post,
									reactions: [...post.reactions, { user_id: userId }]
								};
							}
							return post;
						});
						
						return {
							...prev,
							posts: updatedPosts
						};
					});
				}
			)
			.on(
				"postgres_changes",
				{
					event: "DELETE",
					schema: "public",
					table: "post_reactions",
				},
				(payload) => {
					console.log("Reaction removal detected:", payload.old);
					
					const postId = payload.old.post_id;
					const userId = payload.old.user_id;
					
					// Remove the reaction from state
					setState(prev => {
						const updatedPosts = prev.posts.map(post => {
							if (post.id === postId) {
								return {
									...post,
									reactions: post.reactions.filter(reaction => reaction.user_id !== userId)
								};
							}
							return post;
						});
						
						return {
							...prev,
							posts: updatedPosts
						};
					});
					
					// Remove from processed set
					processedReactionIdsRef.current.get(postId)?.delete(userId);
				}
			)
			.subscribe((status, err) => {
                console.log("Reactions channel subscription status:", status, err);
            });
		
		channelsRef.current.reactions = reactionsChannel;

		return () => {
			cleanupChannels();
		};
	}, [channelId, profile?.id, fetchChannelData, cleanupChannels]);

	// Method to add a new post with error handling and optimistic updates
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
			
			// Create optimistic post with minimal data
			const optimisticId = crypto.randomUUID();
			const optimisticPost = {
				id: optimisticId,
				content,
				author: {
					id: profile?.id || '',
					name: profile?.name || 'You',
				},
				created_at: new Date().toISOString(),
				edited_at: null,
				media: [],
				reactions: [],
				comments: []
			};
			
			// Add optimistic post to state immediately
			setState(prev => ({
				...prev,
				posts: [optimisticPost, ...prev.posts]
			}));

			// Use existing createPost utility function
			const newPost = await createPost(channelId, content, files);
			
			// Mark the real post ID as processed
			if (newPost && newPost.id) {
				processedPostIdsRef.current.add(newPost.id);
			}

			// Remove the optimistic post (the real post will come in via subscription)
			setState(prev => ({
				...prev,
				posts: prev.posts.filter(post => post.id !== optimisticId),
				loading: { ...prev.loading, posts: false }
			}));

			return newPost;
		} catch (err) {
			setState(prev => ({
				...prev,
				error: err instanceof Error ? err.message : "Failed to create post",
				loading: { ...prev.loading, posts: false }
			}));
			
			// Also revert the optimistic update
			setState(prev => ({
				...prev,
				posts: prev.posts.filter(post => post.id !== optimisticId),
			}));
			
			throw err;
		}
	}, [channelId, profile?.id, profile?.name]);

	// Optimistic reaction toggle
	const toggleReactionOptimistic = useCallback(async (postId: string) => {
		const userId = profile?.id;
		if (!userId) return;
		
		// Check current reaction status
		const hasReacted = state.posts.find(post => post.id === postId)?.reactions.some(
			reaction => reaction.user_id === userId
		);
		
		// Update state optimistically
		setState(prev => {
			const updatedPosts = prev.posts.map(post => {
				if (post.id === postId) {
					if (hasReacted) {
						// Remove reaction
						return {
							...post,
							reactions: post.reactions.filter(reaction => reaction.user_id !== userId)
						};
					} else {
						// Add reaction
						return {
							...post,
							reactions: [...post.reactions, { user_id: userId }]
						};
					}
				}
				return post;
			});
			
			return {
				...prev,
				posts: updatedPosts
			};
		});
		
		try {
			// Actually perform the toggle operation against the backend
			await toggleReaction(postId);
		} catch (error) {
			console.error("Error toggling reaction:", error);
			
			// Revert the optimistic update on error
			setState(prev => {
				const updatedPosts = prev.posts.map(post => {
					if (post.id === postId) {
						if (hasReacted) {
							// Restore reaction
							return {
								...post,
								reactions: [...post.reactions, { user_id: userId }]
							};
						} else {
							// Remove reaction
							return {
								...post,
								reactions: post.reactions.filter(reaction => reaction.user_id !== userId)
							};
						}
					}
					return post;
				});
				
				return {
					...prev,
					posts: updatedPosts
				};
			});
		}
	}, [profile?.id, state.posts]);

	return { 
		channel: state.channel, 
		posts: state.posts, 
		loading: state.loading.channel || state.loading.posts, 
		error: state.error,
		addPost,
		toggleReactionOptimistic,
		fetchChannelData // Expose for manual refresh if needed
	};
}

// Function from utils for toggling reactions
async function toggleReaction(postId: string) {
	try {
		const userId = (await supabase.auth.getUser()).data.user?.id;
		if (!userId) throw new Error('User not authenticated');

		// Check if reaction exists
		const { data: existing } = await supabase
			.from('post_reactions')
			.select()
			.eq('post_id', postId)
			.eq('user_id', userId)
			.maybeSingle();

		if (existing) {
			// Remove reaction
			const { error } = await supabase
				.from('post_reactions')
				.delete()
				.eq('post_id', postId)
				.eq('user_id', userId);

			if (error) throw error;
		} else {
			// Add reaction
			const { error } = await supabase
				.from('post_reactions')
				.insert([
					{
						post_id: postId,
						user_id: userId,
					},
				]);

			if (error) throw error;
		}
	} catch (err) {
		console.error('Error toggling reaction:', err);
		throw err;
	}
}
