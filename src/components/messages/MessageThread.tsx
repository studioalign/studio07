import React, { useState, useEffect, useRef, useCallback } from "react";
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
    fetchMessages,
    loading,
    sendMessage,
    markAsRead,
    activeConversation,
    conversations,
  } = useMessaging();
  const { profile } = useAuth();
  const [newMessage, setNewMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Find the other participant in the conversation
  const otherParticipant = activeConversation 
    ? conversations.find(conv => conv.id === activeConversation)?.participants[0]
    : null;

  // Track if messages have already been fetched
  const fetchedMessagesRef = useRef(false);

  useEffect(() => {
    if (!activeConversation) return;

    // Fetch messages only once when the conversation is first set
    if (!fetchedMessagesRef.current) {
      fetchMessages(activeConversation);
      fetchedMessagesRef.current = true;
    }

    // Subscribe to new messages
    const channel = supabase
      .channel(`messages-${activeConversation}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${activeConversation}`,
        },
        (payload) => {
          console.log('New message received:', payload.new);

          // Avoid duplicates by checking if message already exists
          setMessages((prevMessages) => {
            const exists = prevMessages.some((msg) => msg.id === payload.new.id);
            return exists ? prevMessages : [...prevMessages, payload.new];
          });

          // Scroll to the bottom when a new message is received
          setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
          }, 100);
        }
      )
      .subscribe();

    // Cleanup function to remove the subscription when unmounting
    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeConversation, fetchMessages]);

  // Automatically mark messages as read when messages change
  useEffect(() => {
    if (messages.length > 0) {
      markAsRead();
    }
  }, [messages, markAsRead]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Real-time message sending with enhanced error handling and notifications
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !profile?.id || !activeConversation || !otherParticipant) return;

    setIsSubmitting(true);

    try {
      // Send the message
      await sendMessage(newMessage);

      // Send notification to the recipient
      await notificationService.notifyNewMessage(
        profile.id, 
        profile.name || 'A user', 
        otherParticipant.id, 
        profile.studio.id, 
        activeConversation, 
        newMessage.length > 50 
          ? newMessage.substring(0, 47) + '...' 
          : newMessage
      );

      // Reset message input
      setNewMessage("");
    } catch (err) {
      console.error("Error sending message:", err);
      // Optional: Add error toast or notification
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Mobile back button */}
      <div className="lg:hidden flex items-center px-4 py-2 border-b bg-white">
        <button
          onClick={onBack}
          className="p-2 -ml-2 text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="ml-2 font-medium text-gray-900">
          {otherParticipant?.name || otherParticipant?.email}
        </h2>
      </div>

      {/* Messages container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex justify-center items-center h-full text-gray-500">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : messages.map((message) => (
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
                  : "bg-white text-gray-900 border"
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

      {/* Message input */}
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
            disabled={isSubmitting || !newMessage.trim()}
            className="px-4 py-2 bg-brand-primary text-white rounded-md hover:bg-brand-secondary-400 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <span className="animate-pulse">Sending...</span>
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
