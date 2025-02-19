import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import { supabase } from "../../lib/supabase";
import FormInput from "../FormInput";
import MultiSelectDropdown from "../MultiSelectDropdown";
import { getStudioUsersByRole } from "../../utils/messagingUtils";
import { useAuth } from "../../contexts/AuthContext";

interface NewChannelModalProps {
	onClose: () => void;
}

export default function NewChannelModal({ onClose }: NewChannelModalProps) {
	const [name, setName] = useState("");
	const [description, setDescription] = useState("");
	const [selectedMembers, setSelectedMembers] = useState<
		{ id: string; label: string }[]
	>([]);
	const [availableUsers, setAvailableUsers] = useState<
		{ id: string; label: string }[]
	>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const { profile } = useAuth();

	useEffect(() => {
		async function fetchUsers() {
			try {
				// Fetch all teachers and parents
				const [teachers, parents] = await Promise.all([
					getStudioUsersByRole("teacher", profile?.studio?.id || ""),
					getStudioUsersByRole("parent", profile?.studio?.id || ""),
				]);

				const users = [...teachers, ...parents].map((user) => ({
					id: user.id,
					label: `${user.name} (${user.email})`,
				}));

				setAvailableUsers(users);
			} catch (err) {
				console.error("Error fetching users:", err);
				setError(err instanceof Error ? err.message : "Failed to fetch users");
			} finally {
				setLoading(false);
			}
		}

		fetchUsers();
	}, []);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (selectedMembers.length === 0) return;

		setIsSubmitting(true);
		setError(null);

		try {
			// Create the channel
			const { data: channel, error: insertError } = await supabase
				.from("class_channels")
				.insert({
					name,
					description: description || null,
					created_by: profile?.id + "",
				})
				.select("*")
				.single();

			if (insertError) throw insertError;

			// Add all selected members to the channel
			const memberInserts = selectedMembers.map((member) => ({
				channel_id: channel.id,
				user_id: member.id,
				role: "member",
			}));

			// Add the creator as an admin
			memberInserts.push({
				channel_id: channel.id,
				user_id: profile?.id + "",
				role: "admin",
			});

			const { error: membersError } = await supabase
				.from("channel_members")
				.insert(memberInserts);

			if (membersError) throw membersError;

			onClose();
		} catch (err) {
			console.error("Error creating channel:", err);
			setError(err instanceof Error ? err.message : "Failed to create channel");
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
			<div className="bg-white rounded-lg p-6 w-full max-w-md">
				<div className="flex justify-between items-center mb-6">
					<h2 className="text-xl font-semibold text-brand-primary">
						Create Channel
					</h2>
					<button
						onClick={onClose}
						className="text-gray-400 hover:text-gray-600"
					>
						<X className="w-6 h-6" />
					</button>
				</div>

				<form onSubmit={handleSubmit} className="space-y-4">
					<MultiSelectDropdown
						id="members"
						label="Select Channel Members"
						value={selectedMembers}
						onChange={setSelectedMembers}
						options={availableUsers}
						isLoading={loading}
					/>

					<FormInput
						id="name"
						type="text"
						label="Channel Name"
						value={name}
						onChange={(e) => setName(e.target.value)}
						required
					/>

					<div>
						<label
							htmlFor="description"
							className="block text-sm font-medium text-brand-secondary-400"
						>
							Description
						</label>
						<textarea
							id="description"
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							rows={3}
							className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-accent focus:border-brand-accent"
						/>
					</div>

					{error && <p className="text-red-500 text-sm">{error}</p>}

					<div className="flex justify-end space-x-3">
						<button
							type="button"
							onClick={onClose}
							className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
						>
							Cancel
						</button>
						<button
							type="submit"
							disabled={
								isSubmitting || !name.trim() || selectedMembers.length === 0
							}
							className="px-4 py-2 bg-brand-primary text-white rounded-md hover:bg-brand-secondary-400 disabled:bg-gray-400"
						>
							Create Channel
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
