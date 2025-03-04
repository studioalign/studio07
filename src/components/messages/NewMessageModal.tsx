import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { useMessaging } from "../../contexts/MessagingContext";
import { useAuth } from "../../contexts/AuthContext";
import { getStudioUsersByRole } from "../../utils/messagingUtils";
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
	const [isSubmitting, setIsSubmitting] = useState(false);

	useEffect(() => {
		async function fetchRecipients() {
			if (!profile?.role || !profile?.studio?.id) {
				setLoading(false);
				return;
			}

			try {
				let users: UserData[] = [];
				
				if (profile.role === "owner") {
					const [teachers, parents] = await Promise.all([
						getStudioUsersByRole("teacher", profile.studio.id),
						getStudioUsersByRole("parent", profile.studio.id),
					]);
					users = [...teachers, ...parents];
				} else if (profile.role === "teacher") {
					const [owners, parents] = await Promise.all([
						getStudioUsersByRole("owner", profile.studio.id),
						getStudioUsersByRole("parent", profile.studio.id),
					]);
					users = [...owners, ...parents];
				} else if (profile.role === "parent") {
					const [owners, teachers] = await Promise.all([
						getStudioUsersByRole("owner", profile.studio.id),
						getStudioUsersByRole("teacher", profile.studio.id),
					]);
					users = [...owners, ...teachers];
				}

				setRecipients(
					users.map((user) => ({
						id: user.id,
						label: user.name ? `${user.name} (${user.email})` : user.email,
					}))
				);
			} catch (err) {
				console.error("Error fetching recipients:", err);
				setError(
					err instanceof Error ? err.message : "Failed to load recipients"
				);
			} finally {
				setLoading(false);
			}
		}

		fetchRecipients();
	}, [profile?.role, profile?.studio?.id]);

	const handleStartConversation = async () => {
		if (!selectedRecipient || !profile?.id) {
			return;
		}

		setIsSubmitting(true);
		setError(null);

		try {
			// Include both the current user and the recipient
			const conversationId = await createConversation(profile.id, [
				profile.id,
				selectedRecipient.id,
			]);
			
			setActiveConversation(conversationId);
			onClose();
		} catch (err) {
			console.error("Error starting conversation:", err);
			setError(
				err instanceof Error ? err.message : "Failed to start conversation"
			);
		} finally {
			setIsSubmitting(false);
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
							disabled={isSubmitting}
						>
							Cancel
						</button>
						<button
							onClick={handleStartConversation}
							disabled={!selectedRecipient || isSubmitting}
							className="px-4 py-2 bg-brand-primary text-white rounded-md hover:bg-brand-secondary-400 disabled:bg-gray-400"
						>
							{isSubmitting ? (
								<span className="inline-flex items-center">
									<svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
										<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
										<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
									</svg>
									Processing...
								</span>
							) : "Start Conversation"}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}