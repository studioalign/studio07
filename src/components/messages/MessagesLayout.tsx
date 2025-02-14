import React, { useState, useEffect } from "react";
import ConversationList from "./ConversationList";
import MessageThread from "./MessageThread";
import { useMessaging } from "../../contexts/MessagingContext";
import { MessageSquare, Users, ArrowLeft, Plus } from "lucide-react";
import NewMessageModal from "./NewMessageModal";

export default function MessagesLayout() {
	const { activeConversation, conversations, loading } = useMessaging();
	const [showList, setShowList] = useState(true);
	const [showNewMessage, setShowNewMessage] = useState(false);

	// Hide conversation list when a conversation is selected on mobile
	useEffect(() => {
		if (activeConversation && window.innerWidth < 1024) {
			setShowList(false);
		}
	}, [activeConversation]);

	if (loading) {
		return (
			<div className="h-full flex items-center justify-center">
				<div className="animate-pulse space-y-4">
					<div className="h-8 bg-gray-200 rounded w-48" />
					<div className="h-4 bg-gray-200 rounded w-32" />
				</div>
			</div>
		);
	}

	return (
		<div className="h-[calc(100vh-4rem)] flex relative">
			{/* Mobile back button when showing thread */}
			{!showList && activeConversation && (
				<button
					onClick={() => setShowList(true)}
					className="lg:hidden fixed top-3 left-4 z-50 p-2 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100"
				>
					<ArrowLeft className="w-6 h-6" />
				</button>
			)}

			{/* Mobile New Message Button */}
			{!showList && !activeConversation && (
				<button
					onClick={() => setShowNewMessage(true)}
					className="lg:hidden fixed bottom-4 right-4 z-50 p-4 bg-brand-primary text-white rounded-full shadow-lg hover:bg-brand-secondary-400"
				>
					<Plus className="w-6 h-6" />
				</button>
			)}

			<div
				className={`absolute lg:relative w-full lg:w-80 border-r bg-white transition-transform duration-200 ease-in-out ${
					showList ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
				}`}
			>
				<ConversationList onNewMessage={() => setShowNewMessage(true)} />
			</div>

			<div
				className={`absolute lg:relative inset-0 lg:inset-auto flex-1 bg-gray-50 transition-transform duration-200 ease-in-out ${
					showList ? "translate-x-full lg:translate-x-0" : "translate-x-0"
				}`}
			>
				{conversations.length === 0 ? (
					<div className="h-full flex flex-col items-center justify-center text-gray-500 p-8">
						<Users className="w-16 h-16 mb-4 text-brand-secondary-400" />
						<h2 className="text-xl font-semibold text-brand-primary mb-2">
							Welcome to Messages
						</h2>
						<p className="text-center max-w-md mb-4">
							Start connecting with teachers, parents, and studio owners. Click
							the "New Message" button to begin your first conversation.
						</p>
						<div className="p-4 bg-brand-secondary-100/10 rounded-lg text-sm">
							<p className="text-brand-secondary-400">
								💡 Tip: Use messages to discuss class schedules, student
								progress, or any other studio-related matters.
							</p>
						</div>
					</div>
				) : activeConversation ? (
					<MessageThread onBack={() => setShowList(true)} />
				) : (
					<div className="h-full flex flex-col items-center justify-center text-gray-500">
						<MessageSquare className="w-16 h-16 mb-4 text-brand-secondary-400" />
						<p className="text-lg font-medium">Select a conversation</p>
						<p className="text-sm">
							Choose a conversation from the list to start messaging
						</p>
					</div>
				)}
			</div>

			{/* New Message Modal */}
			{showNewMessage && (
				<NewMessageModal onClose={() => setShowNewMessage(false)} />
			)}
		</div>
	);
}
