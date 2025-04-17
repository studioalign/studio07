import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";

interface Channel {
	id: string;
	name: string;
	description: string | null;
	created_at: string;
	updated_at: string;
}

export function useChannels() {
	const [channels, setChannels] = useState<Channel[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const { profile } = useAuth();
	const subscriptionRef = useRef<{ subscription: any } | null>(null);

	// Use a callback to make the function stable for useEffect dependencies
	const fetchChannels = useCallback(async () => {
		if (!profile?.id) return;

		try {
			setLoading(true);
			setError(null);
			
			// Modify the query to only select fields that definitely exist
			const { data, error: fetchError } = await supabase
				.from("channel_members")
				.select(
					`
          channel:class_channels (
            id,
            name,
            description,
            created_at,
            updated_at
          )
        `
				)
				.eq("user_id", profile.id)
				.order("joined_at", { ascending: false });

			if (fetchError) throw fetchError;
			
			// Filter out any null channels (in case of deleted channels)
			const validChannels = data
				.filter(item => item.channel !== null)
				.map(item => item.channel);
			
			console.log('Fetched channels:', validChannels);
			setChannels(validChannels || []);
		} catch (err) {
			console.error("Error fetching channels:", err);
			setError(
				err instanceof Error ? err.message : "Failed to fetch channels"
			);
		} finally {
			setLoading(false);
		}
	}, [profile?.id]);

	// Set up real-time subscriptions
	useEffect(() => {
		if (!profile?.id) return;

		// Fetch initial data
		fetchChannels();

		// Clean up any existing subscription
		if (subscriptionRef.current) {
			subscriptionRef.current.subscription.unsubscribe();
		}

		// Subscribe to channel_members changes for this user
		const memberSubscription = supabase
			.channel("user-channels")
			.on(
				"postgres_changes",
				{
					event: "INSERT",
					schema: "public",
					table: "channel_members",
					filter: `user_id=eq.${profile.id}`,
				},
				(payload) => {
					console.log("Channel member added, refreshing channels");
					fetchChannels();
				}
			)
			.on(
				"postgres_changes",
				{
					event: "DELETE",
					schema: "public",
					table: "channel_members",
					filter: `user_id=eq.${profile.id}`,
				},
				(payload) => {
					console.log("Channel member removed, refreshing channels");
					fetchChannels();
				}
			)
			.subscribe((status) => {
				console.log("Channel members subscription status:", status);
			});

		// Subscribe to channel changes - UPDATE THIS PART TO SPECIFICALLY LISTEN FOR "UPDATE" EVENTS
		const channelSubscription = supabase
			.channel("public-channels")
			.on(
				"postgres_changes",
				{
					event: "UPDATE", // Specifically listen for UPDATE events
					schema: "public",
					table: "class_channels"
				},
				(payload) => {
					console.log("Channel updated:", payload);
					// Instead of full refresh, update the specific channel in state
					const updatedChannel = payload.new as Channel;
					setChannels(currentChannels => 
						currentChannels.map(channel => 
							channel.id === updatedChannel.id ? updatedChannel : channel
						)
					);
				}
			)
			.on(
				"postgres_changes", 
				{
					event: "INSERT",
					schema: "public",
					table: "class_channels"
				},
				(payload) => {
					console.log("New channel created:", payload);
					fetchChannels(); // Full refresh for new channels
				}
			)
			.on(
				"postgres_changes",
				{
					event: "DELETE",
					schema: "public",
					table: "class_channels"
				},
				(payload) => {
					console.log("Channel deleted:", payload);
					// Remove the deleted channel from state
					const deletedChannelId = payload.old.id;
					setChannels(currentChannels => 
						currentChannels.filter(channel => channel.id !== deletedChannelId)
					);
				}
			)
			.subscribe((status) => {
				console.log("Channels subscription status:", status);
			});

		subscriptionRef.current = { 
			subscription: {
				unsubscribe: () => {
					memberSubscription.unsubscribe();
					channelSubscription.unsubscribe();
				}
			}
		};

		return () => {
			if (subscriptionRef.current) {
				subscriptionRef.current.subscription.unsubscribe();
				subscriptionRef.current = null;
			}
		};
	}, [profile?.id, fetchChannels]);

	return { 
		channels, 
		loading, 
		error,
		refresh: fetchChannels // Expose refresh function
	};
}
