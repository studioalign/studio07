import React, {
	createContext,
	useContext,
	useState,
	useEffect,
	ReactNode,
	useCallback,
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
	is_read?: boolean;
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
	loading: {
	  conversations: boolean;
	  messages: boolean;
	};
	error: string | null;
  }
  
  const MessagingContext = createContext<MessagingContextType | null>(null);
  
  export function MessagingProvider({ children }: { children: ReactNode }) {
	const [conversations, setConversations] = useState<Conversation[]>([]);
	const [activeConversation, setActiveConversation] = useState<string | null>(null);
	const [messages, setMessages] = useState<Message[]>([]);
	const [loading, setLoading] = useState({
	  conversations: true,
	  messages: false,
	});
	const [error, setError] = useState<string | null>(null);
	const { profile } = useAuth();
  
	// Fetch conversations with real-time updates
	const fetchConversations = useCallback(async () => {
	  if (!profile?.id) return;
  
	  setLoading(prev => ({ ...prev, conversations: true }));
	  try {
		const { data, error: fetchError } = await supabase
		  .from("conversation_participants")
		  .select(
			`
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
  
		const sortedConversations: Conversation[] = await Promise.all(
		  (data || []).map(async (item: any) => {
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
			  last_message: item.conversation.last_message,
			  last_message_at: item.conversation.last_message_at,
			  participants: participantData,
			};
		  })
		);
  
		setConversations(sortedConversations);
	  } catch (err) {
		console.error("Error fetching conversations:", err);
		setError(err instanceof Error ? err.message : "Failed to fetch conversations");
	  } finally {
		setLoading(prev => ({ ...prev, conversations: false }));
	  }
	}, [profile?.id]);
  
	// Fetch messages with real-time updates
	const fetchMessages = useCallback(async (conversationId: string) => {
	  setLoading(prev => ({ ...prev, messages: true }));
	  try {
		const { data, error: fetchError } = await supabase
		  .from("messages")
		  .select("*")
		  .eq("conversation_id", conversationId)
		  .order("created_at", { ascending: true });
  
		if (fetchError) throw fetchError;
		setMessages(data || []);
	  } catch (err) {
		setError(err instanceof Error ? err.message : "Failed to fetch messages");
	  } finally {
		setLoading(prev => ({ ...prev, messages: false }));
	  }
	}, []);
  
	// Real-time subscriptions
	useEffect(() => {
	  // Conversations subscription
	  const conversationChannel = supabase
		.channel(`user_conversations:${profile?.id}`)
		.on(
		  "postgres_changes",
		  {
			event: "*",
			schema: "public",
			table: "conversation_participants",
			filter: `user_id=eq.${profile?.id}`,
		  },
		  () => {
			fetchConversations();
		  }
		)
		.subscribe();
  
	  // Messages subscription
	  const messagesChannel = supabase
		.channel(`active_conversation:${activeConversation}`)
		.on(
		  "postgres_changes",
		  {
			event: "INSERT",
			schema: "public",
			table: "messages",
			filter: `conversation_id=eq.${activeConversation}`,
		  },
		  (payload) => {
			// Optimistically add the new message
			setMessages((prevMessages) => [
			  ...prevMessages,
			  payload.new as Message,
			]);
		  }
		)
		.subscribe();
  
	  return () => {
		conversationChannel.unsubscribe();
		messagesChannel.unsubscribe();
	  };
	}, [profile?.id, activeConversation, fetchConversations]);
  
	// Existing methods (sendMessage, createConversation, etc.) remain the same
	const sendMessage = async (content: string) => {
	  if (!activeConversation || !profile?.id) return;
  
	  try {
		const { error: sendError } = await supabase.from("messages").insert([
		  {
			conversation_id: activeConversation,
			sender_id: profile.id,
			content,
		  },
		]);
  
		if (sendError) throw sendError;
	  } catch (err) {
		setError(err instanceof Error ? err.message : "Failed to send message");
	  }
	};
  
	const createConversation = async (
	  createdBy: string,
	  participantIds: string[]
	): Promise<string> => {
	  try {
		if (!participantIds.length || participantIds.length < 2) {
		  throw new Error("At least two participants are required");
		}
  
		const { data, error } = await supabase.rpc("create_conversation", {
		  created_by: createdBy,
		  participant_ids: participantIds,
		});
  
		if (error) throw error;
		if (!data) throw new Error("No conversation ID returned");
  
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
  
	const markAsRead = async () => {
	  if (!activeConversation || !profile?.id) return;
  
	  try {
		await supabase.rpc("mark_messages_as_read", {
		  p_conversation_id: activeConversation,
		  p_user_id: profile.id,
		});
	  } catch (err) {
		console.error("Error marking messages as read:", err);
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