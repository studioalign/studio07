import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import { useMessaging } from "../../contexts/MessagingContext";
import { useAuth } from "../../contexts/AuthContext";
import { getUsersByRole } from "../../utils/messagingUtils";
import SearchableDropdown from "../SearchableDropdown";
import { UserData } from "../../types/auth";

interface NewMessageModalProps {
	onClose: () => void;
}

export default function NewMessageModal({ onClose }: NewMessageModalProps) {
	const { createConversation, setActiveConversation } = useMessaging();
	const { profile } = useAuth();
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [recipients, setRecipients] = useState<{ id: string; label: string }[]>(
		[]
	);
	const [selectedRecipient, setSelectedRecipient] = useState<{
		id: string;
		label: string;
	} | null>(null);

	useEffect(() => {
		async function fetchRecipients() {
			try {
				let users: UserData[] = [];
				if (profile?.role === "owner") {
					const [teachers, parents] = await Promise.all([
						getUsersByRole("teacher"),
						getUsersByRole("parent"),
					]);
					users = [...teachers, ...parents];
				} else if (profile?.role === "teacher") {
					const [owners, parents] = await Promise.all([
						getUsersByRole("owner"),
						getUsersByRole("parent"),
					]);
					console.log(owners, parents);
					users = [...owners, ...parents];
				} else if (profile?.role === "parent") {
					const [owners, teachers] = await Promise.all([
						getUsersByRole("owner"),
						getUsersByRole("teacher"),
					]);
					users = [...owners, ...teachers];
				}

				setRecipients(
					users.map((user) => ({
						id: user.id,
						label: `${user.name} (${user.email})`,
					}))
				);
			} catch (err) {
				setError(
					err instanceof Error ? err.message : "Failed to load recipients"
				);
			} finally {
				setLoading(false);
			}
		}

		fetchRecipients();
	}, [profile?.role]);

	const handleStartConversation = async () => {
		if (!selectedRecipient) return;
		if (!profile?.id) return;

		try {
			// Include both the current user and the recipient
			const conversationId = await createConversation(profile?.id, [
				profile?.id,
				selectedRecipient.id,
			]);
			setActiveConversation(conversationId);
			onClose();
		} catch (err) {
			console.error("Error starting conversation:", err);
			setError(
				err instanceof Error ? err.message : "Failed to start conversation"
			);
		}
	};

	return (
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
			<div className="bg-white rounded-lg p-6 w-full max-w-md">
				<div className="flex justify-between items-center mb-6">
					<h2 className="text-xl font-semibold text-brand-primary">
						New Message
					</h2>
					<button
						onClick={onClose}
						className="text-gray-400 hover:text-gray-600"
					>
						<X className="w-6 h-6" />
					</button>
				</div>

				{error && (
					<div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
						{error}
					</div>
				)}

				<div className="space-y-4">
					<SearchableDropdown
						id="recipient"
						label="Select Recipient"
						value={selectedRecipient}
						onChange={setSelectedRecipient}
						options={recipients}
						isLoading={loading}
					/>

					<div className="flex justify-end space-x-3">
						<button
							type="button"
							onClick={onClose}
							className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
						>
							Cancel
						</button>
						<button
							onClick={handleStartConversation}
							disabled={!selectedRecipient}
							className="px-4 py-2 bg-brand-primary text-white rounded-md hover:bg-brand-secondary-400 disabled:bg-gray-400"
						>
							Start Conversation
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
