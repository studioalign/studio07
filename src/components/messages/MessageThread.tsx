// src/components/messages/MessageThread.tsx
import React, { useState, useEffect, useRef } from "react";
import { Send, ArrowLeft } from "lucide-react";
import { useMessaging } from "../../contexts/MessagingContext";
import { useAuth } from "../../contexts/AuthContext";
import { formatMessageDate } from "../../utils/messagingUtils";
import { supabase } from "../../lib/supabase";
import { notificationService } from "../../services/notificationService";

interface MessageThreadProps {
	onBack: () => void;
}

export default function MessageThread({ onBack }: MessageThreadProps) {
	const {
		messages,
		sendMessage,
		markAsRead,
		activeConversation,
		fetchMessages,
	} = useMessaging();
	const { profile } = useAuth();
	const [newMessage, setNewMessage] = useState("");
	const messagesEndRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		markAsRead();
	}, [messages]);

	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messages]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!newMessage.trim() || !profile?.id || !profile?.studio?.id || !activeConversation) return;

		try {
            // Send the message
            await sendMessage(newMessage);
            
            // After successfully sending a message, notify the recipient
            // Get the conversation details to find the recipient
            const { data: conversationData, error: convError } = await supabase
                .from('conversations')
                .select('participants')
                .eq('id', activeConversation)
                .single();
                
            if (convError) {
                console.error('Error fetching conversation:', convError);
            } else if (conversationData && Array.isArray(conversationData.participants)) {
                // Find the recipient (the user who is not the current user)
                const recipientId = conversationData.participants.find(
                    (id: string) => id !== profile.id
                );
                
                if (recipientId) {
                    console.log("Sending message notification to:", recipientId);
                    
                    // Get message preview (truncate long messages)
                    const messagePreview = newMessage.length > 50 
                        ? newMessage.substring(0, 47) + '...' 
                        : newMessage;
                        
                    // Send the notification
                    await notificationService.notifyNewMessage(
                        profile.id,
                        profile.name || 'A user',
                        recipientId,
                        profile.studio.id,
                        activeConversation,
                        messagePreview
                    );
                    
                    console.log("Message notification sent successfully");
                } else {
                    console.log("No recipient found for notification");
                }
            } else {
                console.log("Invalid conversation data:", conversationData);
            }
        } catch (err) {
            console.error("Error in message sending/notification:", err);
        }
        
		setNewMessage("");
	};

	useEffect(() => {
		if (activeConversation) {
			const subscription = supabase
				.channel(`public:messages`)
				.on(
					"postgres_changes",
					{
						event: "*",
						schema: "public",
						table: "messages",
						filter: `conversation_id=eq.${activeConversation}`,
					},
					() => {
						fetchMessages(activeConversation);
					}
				)
				.subscribe();

			return () => {
				subscription.unsubscribe();
			};
		}
	}, [activeConversation, fetchMessages]);

	return (
		<div className="h-full flex flex-col">
			<div className="lg:hidden flex items-center px-4 py-2 border-b bg-white">
				<button
					onClick={onBack}
					className="p-2 -ml-2 text-gray-500 hover:text-gray-700"
				>
					<ArrowLeft className="w-5 h-5" />
				</button>
				<h2 className="ml-2 font-medium text-gray-900">Back to Messages</h2>
			</div>
			<div className="flex-1 overflow-y-auto p-4 space-y-4">
				{messages.map((message) => (
					<div
						key={message.id}
						className={`flex ${
							message.sender_id === profile?.id
								? "justify-end"
								: "justify-start"
						}`}
					>
						<div
							className={`max-w-[70%] rounded-lg px-4 py-2 ${
								message.sender_id === profile?.id
									? "bg-brand-primary text-white"
									: "bg-white text-gray-900"
							}`}
						>
							<p className="break-words">{message.content}</p>
							<p
								className={`text-xs mt-1 ${
									message.sender_id === profile?.id
										? "text-white/70"
										: "text-gray-500"
								}`}
							>
								{formatMessageDate(message.created_at)}
							</p>
						</div>
					</div>
				))}
				<div ref={messagesEndRef} />
			</div>

			<form onSubmit={handleSubmit} className="p-4 bg-white border-t">
				<div className="flex space-x-2">
					<input
						type="text"
						value={newMessage}
						onChange={(e) => setNewMessage(e.target.value)}
						placeholder="Type a message..."
						className="flex-1 px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-transparent"
					/>
					<button
						type="submit"
						disabled={!newMessage.trim()}
						className="px-4 py-2 bg-brand-primary text-white rounded-md hover:bg-brand-secondary-400 disabled:bg-gray-400 disabled:cursor-not-allowed"
					>
						<Send className="w-5 h-5" />
					</button>
				</div>
			</form>
		</div>
	);
}