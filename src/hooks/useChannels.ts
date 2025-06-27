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

			// Fetch channels where user is a member
			const { data, error: fetchError } = await supabase
				.from("channel_members")
				.select(
					`
					channel_id,
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
				.filter((item) => item.channel !== null)
				.map((item) => item.channel);

			setChannels(validChannels || []);
		} catch (err) {
			console.error("Error fetching channels:", err);
			setError(err instanceof Error ? err.message : "Failed to fetch channels");
		} finally {
			setLoading(false);
		}
	}, [profile?.id]);

	// Directly update a channel in state when it changes
	const updateChannelInState = useCallback((updatedChannel: Channel) => {
		setChannels((prevChannels) =>
			prevChannels.map((channel) =>
				channel.id === updatedChannel.id ? { ...updatedChannel } : channel
			)
		);
	}, []);

	// Set up real-time subscriptions
	useEffect(() => {
		if (!profile?.id) return;

		// Fetch initial data
		fetchChannels();

		// Clean up any existing subscription
		if (subscriptionRef.current) {
			subscriptionRef.current.subscription.unsubscribe();
		}

		// Subscribe to channel changes
		const combinedSubscription = supabase
			.channel(`channels-${profile.id}`)
			// Listen for changes to channel members
			.on(
				"postgres_changes",
				{
					event: "*",
					schema: "public",
					table: "channel_members",
					filter: `user_id=eq.${profile.id}`,
				},
				(payload) => {
					// Refresh channels completely
					fetchChannels();
				}
			)
			// Listen for changes to channels
			.on(
				"postgres_changes",
				{
					event: "UPDATE",
					schema: "public",
					table: "class_channels",
				},
				async (payload) => {
					// Get the user's channel memberships to check if we should show this channel
					const { data } = await supabase
						.from("channel_members")
						.select("channel_id")
						.eq("user_id", profile.id)
						.eq("channel_id", payload.new.id);

					// If the user is a member of this channel
					if (data && data.length > 0) {
						// Fetch the full updated channel data
						const { data: channelData } = await supabase
							.from("class_channels")
							.select("id, name, description, created_at, updated_at")
							.eq("id", payload.new.id)
							.single();

						if (channelData) {
							// Update just this channel in state
							updateChannelInState(channelData);
						}
					}
				}
			)
			.on(
				"postgres_changes",
				{
					event: "INSERT",
					schema: "public",
					table: "class_channels",
				},
				(payload) => {
					// Refresh the entire list for new channels
					fetchChannels();
				}
			)
			.on(
				"postgres_changes",
				{
					event: "DELETE",
					schema: "public",
					table: "class_channels",
				},
				(payload) => {
					// Remove the deleted channel from state
					setChannels((currentChannels) =>
						currentChannels.filter((channel) => channel.id !== payload.old.id)
					);
				}
			)
			.subscribe((status, err) => {
				if (err) {
					console.error("Subscription error:", err);
				}
			});

		subscriptionRef.current = {
			subscription: combinedSubscription,
		};

		return () => {
			if (subscriptionRef.current) {
				subscriptionRef.current.subscription.unsubscribe();
				subscriptionRef.current = null;
			}
		};
	}, [profile?.id, fetchChannels, updateChannelInState]);

	return {
		channels,
		loading,
		error,
		refresh: fetchChannels, // Expose refresh function
	};
}
