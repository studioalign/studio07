import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";

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

export function useChannel(channelId: string) {
	const [channel, setChannel] = useState<Channel | null>(null);
	const [posts, setPosts] = useState<Post[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const { profile } = useAuth();

	useEffect(() => {
		if (!channelId || !profile?.id) return;

		const fetchChannel = async () => {
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
				setChannel(channelData);

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
				setPosts(postsData || []);
			} catch (err) {
				console.error("Error fetching channel data:", err);
				setError(
					err instanceof Error ? err.message : "Failed to fetch channel data"
				);
			} finally {
				setLoading(false);
			}
		};

		fetchChannel();

		// Subscribe to channel updates
		const subscription = supabase
			.channel(`channel_${channelId}`)
			.on(
				"postgres_changes",
				{
					event: "*",
					schema: "public",
					table: "channel_posts",
					filter: `channel_id=eq.${channelId}`,
				},
				() => {
					fetchChannel();
				}
			)
			.subscribe();

		return () => {
			subscription.unsubscribe();
		};
	}, [channelId, profile?.id]);

	return { channel, posts, loading, error };
}
