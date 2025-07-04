// src/contexts/MessagingContext.tsx
import React, {
	createContext,
	useContext,
	useState,
	useEffect,
	useCallback,
	ReactNode,
	useRef,
} from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "./AuthContext";

export interface Message {
	id: string;
	content: string;
	sender_id: string;
	created_at: string;
	edited_at: string | null;
	is_deleted: boolean;
}

export interface Conversation {
	id: string;
	unread_count: number;
	last_message: string | null;
	last_message_at: string | null;
	participants: {
		id: string;
		name: string;
		email: string;
	}[];
}

interface MessagingContextType {
	conversations: Conversation[];
	activeConversation: string | null;
	messages: Message[];
	setActiveConversation: (id: string | null) => void;
	sendMessage: (content: string) => Promise<void>;
	fetchMessages: (conversationId: string) => Promise<void>;
	createConversation: (
		createdBy: string,
		participantIds: string[]
	) => Promise<string>;
	loading: {
		conversations: boolean;
		messages: boolean;
	};
	error: string | null;
}

const MessagingContext = createContext<MessagingContextType | null>(null);

export function MessagingProvider({ children }: { children: ReactNode }) {
	const [conversations, setConversations] = useState<Conversation[]>([]);
	const [activeConversation, setActiveConversation] = useState<string | null>(
		null
	);
	const [messages, setMessages] = useState<Message[]>([]);
	const [loading, setLoading] = useState({
		conversations: false,
		messages: false,
	});
	const [error, setError] = useState<string | null>(null);
	const { profile } = useAuth();
	const conversationChannelRef = useRef<ReturnType<
		typeof supabase.channel
	> | null>(null);
	const messagesChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(
		null
	);
	const currentConversationIdRef = useRef<string | null>(null);
	const initialLoadDoneRef = useRef(false);

	// Track processed message IDs to prevent duplicates
	const processedMessageIdsRef = useRef<Set<string>>(new Set());

	// Cleanup function to unsubscribe from all channels
	const cleanupChannels = useCallback(() => {
		if (conversationChannelRef.current) {
			supabase.removeChannel(conversationChannelRef.current);
			conversationChannelRef.current = null;
		}
		if (messagesChannelRef.current) {
			supabase.removeChannel(messagesChannelRef.current);
			messagesChannelRef.current = null;
		}
	}, []);

	// Fetch conversations function
	const fetchConversations = useCallback(async () => {
		if (!profile?.id) return;

		setLoading((prev) => ({ ...prev, conversations: true }));

		try {
			const { data, error: fetchError } = await supabase
				.from("conversation_participants")
				.select(
					`
			conversation_id,
			unread_count,
			conversation:conversations!inner(
			  id,
			  last_message,
			  last_message_at,
			  participants:participant_ids
			)`
				)
				.eq("user_id", profile.id);

			if (fetchError) throw fetchError;

			// Sort by last message time
			const sortedConversations = data.sort(
				(a: any, b: any) =>
					new Date(b.conversation.last_message_at || 0).getTime() -
					new Date(a.conversation.last_message_at || 0).getTime()
			);

			// Map the data to match the Conversation type
			const mappedConversations: Conversation[] = await Promise.all(
				sortedConversations.map(async (item: any) => {
					const participantData = await Promise.all(
						item.conversation.participants
							.filter((participantId: string) => participantId !== profile.id)
							.map(async (userId: string) => {
								const { data } = await supabase
									.from("users")
									.select("id, name, email")
									.eq("id", userId)
									.single();
								return data;
							})
					);

					return {
						unread_count: item.unread_count,
						id: item.conversation.id,
						last_message: item.conversation.last_message || "",
						last_message_at: item.conversation.last_message_at || null,
						participants: participantData,
					};
				})
			);

			setConversations(mappedConversations);

			// Auto-mark as read if there's an active conversation
			if (activeConversation) {
				const activeConvo = mappedConversations.find(
					(c) => c.id === activeConversation
				);
				if (activeConvo && activeConvo.unread_count > 0) {
					// Call RPC to mark messages as read, but don't update state
					await supabase.rpc("mark_messages_as_read", {
						p_conversation_id: activeConversation,
						p_user_id: profile.id,
					});

					// Update the conversation in our local state as well
					setConversations((prev) =>
						prev.map((conv) =>
							conv.id === activeConversation
								? { ...conv, unread_count: 0 }
								: conv
						)
					);
				}
			}
		} catch (err) {
			console.error("Error fetching conversations:", err);
			setError(
				err instanceof Error ? err.message : "Failed to fetch conversations"
			);
		} finally {
			setLoading((prev) => ({ ...prev, conversations: false }));
		}
	}, [profile?.id, activeConversation]);

	// Fetch messages function
	const fetchMessages = useCallback(
		async (conversationId: string) => {
			if (!conversationId) return;

			// Only clear messages if we're switching conversations
			if (currentConversationIdRef.current !== conversationId) {
				setMessages([]);
			}

			currentConversationIdRef.current = conversationId;
			setLoading((prev) => ({ ...prev, messages: true }));

			try {
				const { data, error: fetchError } = await supabase
					.from("messages")
					.select(
						`
			  id,
			  content,
			  sender_id,
			  created_at,
			  edited_at,
			  is_deleted
			`
					)
					.eq("conversation_id", conversationId)
					.order("created_at", { ascending: true });

				if (fetchError) throw fetchError;

				// Only set messages if this is still the current conversation
				if (currentConversationIdRef.current === conversationId) {
					// Store processed message IDs to avoid duplicates from real-time events
					data?.forEach((msg) => processedMessageIdsRef.current.add(msg.id));

					setMessages(data || []);

					// Mark messages as read if there are any
					if (data && data.length > 0 && profile?.id) {
						// Call RPC to mark messages as read
						await supabase.rpc("mark_messages_as_read", {
							p_conversation_id: conversationId,
							p_user_id: profile.id,
						});

						// Update unread count in local state as well
						setConversations((prev) =>
							prev.map((conv) =>
								conv.id === conversationId ? { ...conv, unread_count: 0 } : conv
							)
						);
					}
				}
			} catch (err) {
				console.error("Error fetching messages:", err);
				setError(
					err instanceof Error ? err.message : "Failed to fetch messages"
				);
			} finally {
				if (currentConversationIdRef.current === conversationId) {
					setLoading((prev) => ({ ...prev, messages: false }));
				}
			}
		},
		[profile?.id]
	);

	// In the sendMessage function in MessagingContext.tsx
	const sendMessage = useCallback(
		async (content: string) => {
			if (!activeConversation || !profile?.id) return;

			try {
				// Create optimistic message with distinctive ID format
				const optimisticId = `temp-${Date.now()}-${Math.random()
					.toString(36)
					.substring(2, 9)}`;
				const optimisticMessage = {
					id: optimisticId,
					content,
					sender_id: profile.id,
					created_at: new Date().toISOString(),
					edited_at: null,
					is_deleted: false,
				};

				// Add optimistic message to UI immediately
				setMessages((prev) => [...prev, optimisticMessage]);

				// Also update the conversation's last_message in the local state
				setConversations((prev) =>
					prev.map((conv) =>
						conv.id === activeConversation
							? {
									...conv,
									last_message: content,
									last_message_at: new Date().toISOString(),
							  }
							: conv
					)
				);

				// Send to server
				const { data: newMessage, error: sendError } = await supabase
					.from("messages")
					.insert([
						{
							conversation_id: activeConversation,
							sender_id: profile.id,
							content,
						},
					])
					.select()
					.single();

				if (sendError) {
					// Remove optimistic message on error
					setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
					throw sendError;
				}

				// If we got back a real message, add it to processed set to avoid duplicates from subscription
				if (newMessage) {
					processedMessageIdsRef.current.add(newMessage.id);

					// Replace the optimistic message with the real one
					setMessages((prev) =>
						prev.map((msg) => (msg.id === optimisticId ? newMessage : msg))
					);
				}
			} catch (err) {
				console.error("Error sending message:", err);
				setError(err instanceof Error ? err.message : "Failed to send message");
				throw err;
			}
		},
		[activeConversation, profile?.id]
	);

	// Create conversation function
	const createConversation = useCallback(
		async (createdBy: string, participantIds: string[]): Promise<string> => {
			try {
				// Ensure we have valid participant IDs
				if (!participantIds.length || participantIds.length < 2) {
					throw new Error("At least two participants are required");
				}

				const { data, error } = await supabase.rpc("create_conversation", {
					created_by: createdBy,
					participant_ids: participantIds,
				});

				if (error) {
					console.error("Supabase error:", error);
					throw error;
				}

				if (!data) {
					throw new Error("No conversation ID returned");
				}

				// Refresh conversations list
				await fetchConversations();

				return data;
			} catch (err) {
				console.error("Error in createConversation:", err);
				setError(
					err instanceof Error ? err.message : "Failed to create conversation"
				);
				throw err;
			}
		},
		[fetchConversations]
	);

	// Set up conversation subscription
	useEffect(() => {
		if (!profile?.id) return;

		// Initial fetch on mount
		if (!initialLoadDoneRef.current) {
			fetchConversations();
			initialLoadDoneRef.current = true;
		}

		// Clean up any existing conversation subscription
		if (conversationChannelRef.current) {
			supabase.removeChannel(conversationChannelRef.current);
			conversationChannelRef.current = null;
		}

		// Create new subscription for conversations
		const channel = supabase
			.channel(`conversations-${profile.id}`)
			.on(
				"postgres_changes",
				{
					event: "*",
					schema: "public",
					table: "conversation_participants",
					filter: `user_id=eq.${profile.id}`,
				},
				(payload) => {
					fetchConversations();
				}
			)
			.on(
				"postgres_changes",
				{
					event: "UPDATE",
					schema: "public",
					table: "conversations",
				},
				(payload) => {
					fetchConversations();
				}
			)
			.subscribe((status, err) => {});

		conversationChannelRef.current = channel;

		return () => {
			if (conversationChannelRef.current) {
				supabase.removeChannel(conversationChannelRef.current);
				conversationChannelRef.current = null;
			}
		};
	}, [profile?.id, fetchConversations]);

	// Set up message subscription when active conversation changes
	// Add this to the useEffect that sets up the message subscription
	useEffect(() => {
		if (!activeConversation || !profile?.id) return;

		// Reset message tracking when conversation changes
		processedMessageIdsRef.current = new Set();

		// Fetch initial messages when conversation changes
		fetchMessages(activeConversation);

		// Clean up existing messages subscription
		if (messagesChannelRef.current) {
			supabase.removeChannel(messagesChannelRef.current);
			messagesChannelRef.current = null;
		}

		// Create new subscription for messages with better duplicate prevention
		const channel = supabase
			.channel(`messages-${activeConversation}`)
			.on(
				"postgres_changes",
				{
					event: "INSERT",
					schema: "public",
					table: "messages",
					filter: `conversation_id=eq.${activeConversation}`,
				},
				(payload) => {
					// Extract the new message
					const newMessage = payload.new as Message;

					// Check if we've already processed this message
					if (processedMessageIdsRef.current.has(newMessage.id)) {
						return;
					}

					// Check if this is an optimistic message that's already in our state
					// by comparing content, sender, and making sure timestamps are close
					const isMessageDuplicate = messages.some(
						(msg) =>
							msg.content === newMessage.content &&
							msg.sender_id === newMessage.sender_id &&
							// Check if messages were created within 5 seconds of each other
							Math.abs(
								new Date(msg.created_at).getTime() -
									new Date(newMessage.created_at).getTime()
							) < 5000
					);

					if (isMessageDuplicate) {
						return;
					}

					// Add to processed set
					processedMessageIdsRef.current.add(newMessage.id);

					// Add the new message to state
					setMessages((prev) => [...prev, newMessage]);

					// If it's not from the current user, mark as read
					if (newMessage.sender_id !== profile.id) {
						// Call RPC to mark messages as read (without waiting)
						supabase
							.rpc("mark_messages_as_read", {
								p_conversation_id: activeConversation,
								p_user_id: profile.id,
							})
							.then(() => {
								// Update local state
								setConversations((prev) =>
									prev.map((conv) =>
										conv.id === activeConversation
											? { ...conv, unread_count: 0 }
											: conv
									)
								);
							});
					}
				}
			)
			.subscribe((status, err) => {});

		messagesChannelRef.current = channel;

		return () => {
			if (messagesChannelRef.current) {
				supabase.removeChannel(messagesChannelRef.current);
				messagesChannelRef.current = null;
			}
		};
	}, [activeConversation, profile?.id, fetchMessages]);

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			cleanupChannels();
		};
	}, [cleanupChannels]);

	return (
		<MessagingContext.Provider
			value={{
				conversations,
				activeConversation,
				messages,
				setActiveConversation,
				sendMessage,
				fetchMessages,
				createConversation,
				loading,
				error,
			}}
		>
			{children}
		</MessagingContext.Provider>
	);
}

export function useMessaging() {
	const context = useContext(MessagingContext);
	if (!context) {
		throw new Error("useMessaging must be used within a MessagingProvider");
	}
	return context;
}
