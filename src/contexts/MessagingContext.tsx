import React, {
	createContext,
	useContext,
	useState,
	useEffect,
	ReactNode,
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
	markAsRead: () => Promise<void>;
	createConversation: (
		createdBy: string,
		participantIds: string[]
	) => Promise<string>;
	loading: boolean;
	error: string | null;
}

const MessagingContext = createContext<MessagingContextType | null>(null);

export function MessagingProvider({ children }: { children: ReactNode }) {
	const [conversations, setConversations] = useState<Conversation[]>([]);
	const [activeConversation, setActiveConversation] = useState<string | null>(
		null
	);

	const [messages, setMessages] = useState<Message[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const { profile } = useAuth();
	const [subscriptions, setSubscriptions] = useState<{
		conversations?: any;
		messages?: any;
	}>({});

	// Cleanup function for subscriptions
	const cleanupSubscriptions = async () => {
		if (subscriptions.conversations) {
			await subscriptions.conversations.unsubscribe();
		}
		if (subscriptions.messages) {
			await subscriptions.messages.unsubscribe();
		}
		setSubscriptions({});
	};

	// Setup realtime subscriptions
	useEffect(() => {
		if (!profile?.id) return;

		const setupSubscriptions = async () => {
			// Cleanup existing subscriptions
			await cleanupSubscriptions();

			// Fetch initial conversations
			await fetchConversations();

			// Subscribe to conversation changes
			const conversationsSubscription = supabase
				.channel(`conversations:${profile.id}`)
				.on(
					"postgres_changes",
					{
						event: "*",
						schema: "public",
						table: "conversation_participants",
						filter: `user_id=eq.${profile.id}`,
					},
					() => {
						fetchConversations();
					}
				)
				.subscribe();

			setSubscriptions(prev => ({
				...prev,
				conversations: conversationsSubscription
			}));

			// If there's an active conversation, subscribe to its messages
			if (activeConversation) {
				const messagesSubscription = supabase
					.channel(`messages:${activeConversation}`)
					.on(
						"postgres_changes",
						{
							event: "INSERT",
							schema: "public",
							table: "messages",
							filter: `conversation_id=eq.${activeConversation}`,
						},
						async (payload) => {
							// Fetch the complete message with sender info
							const { data: messageData, error: messageError } = await supabase
								.from("messages")
								.select("*, sender:users!sender_id(id, name)")
								.eq("id", payload.new.id)
								.single();

							if (!messageError && messageData) {
								setMessages(prev => [...prev, messageData]);
							}
						}
					)
					.subscribe();

				setSubscriptions(prev => ({
					...prev,
					messages: messagesSubscription
				}));
			}
		};

		setupSubscriptions();

		return () => {
			cleanupSubscriptions();
		};
	}, [profile?.id, activeConversation]);

	const fetchConversations = async () => {
		setLoading(true);
		try {
			// First get all conversations for the user
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
				.eq("user_id", profile?.id!);

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
							.filter((participantId: string) => participantId !== profile?.id)
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
		} catch (err) {
			console.error("Error fetching conversations:", err);
			setError(
				err instanceof Error ? err.message : "Failed to fetch conversations"
			);
		} finally {
			setLoading(false);
		}
	};

	const fetchMessages = async (conversationId: string) => {
		try {
			console.log("fetching messages", conversationId);
			const { data, error: fetchError } = await supabase
				.from("messages")
				.select(`
					id,
					content,
					sender_id,
					created_at,
					edited_at,
					is_deleted,
					sender:users!sender_id(
						id,
						name
					)
				`)
				.eq("conversation_id", conversationId)
				.order("created_at", { ascending: true });

			if (fetchError) throw fetchError;
			setMessages(data || []);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to fetch messages");
		}
	};

	const sendMessage = async (content: string) => {
		if (!activeConversation || !profile?.id) return;

		// Create optimistic message
		const optimisticMessage = {
			id: crypto.randomUUID(),
			content,
			sender_id: profile.id,
			created_at: new Date().toISOString(),
			edited_at: null,
			is_deleted: false,
			sender: {
				id: profile.id,
				name: profile.name || '',
			}
		};

		// Add optimistic message to state
		setMessages(prev => [...prev, optimisticMessage]);

		try {
			const { data: newMessage, error: sendError } = await supabase
				.from("messages")
				.insert([
					{
						conversation_id: activeConversation,
						sender_id: profile.id,
						content,
					},
				])
				.select(`
					id,
					content,
					sender_id,
					created_at,
					edited_at,
					is_deleted,
					sender:users!sender_id(
						id,
						name
					)
				`)
				.single();

			if (sendError) throw sendError;

			// Update conversation's last message
			const { error: updateError } = await supabase
				.from("conversations")
				.update({
					last_message: content,
					last_message_at: new Date().toISOString(),
				})
				.eq("id", activeConversation);

			if (updateError) {
				console.error("Error updating conversation:", updateError);
			}

			// Replace optimistic message with real one
			setMessages(prev => 
				prev.map(msg => msg.id === optimisticMessage.id ? newMessage : msg)
			);

			// Update conversations list to show latest message
			setConversations(prev =>
				prev.map(conv =>
					conv.id === activeConversation
						? {
							...conv,
							last_message: content,
							last_message_at: new Date().toISOString(),
						}
						: conv
				)
			);
		} catch (err) {
			// Remove optimistic message on error
			setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id));
			setError(err instanceof Error ? err.message : "Failed to send message");
			throw err;
		}
	};

	const markAsRead = async () => {
		if (!activeConversation || !profile?.id) return;

		try {
			await supabase.rpc("mark_messages_as_read", {
				p_conversation_id: activeConversation,
				p_user_id: profile?.id,
			});
		} catch (err) {
			console.error("Error marking messages as read:", err);
		}
	};

	const createConversation = async (
		createdBy: string,
		participantIds: string[]
	): Promise<string> => {
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
	};

	return (
		<MessagingContext.Provider
			value={{
				conversations,
				activeConversation,
				messages,
				setActiveConversation,
				sendMessage,
				fetchMessages,
				markAsRead,
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