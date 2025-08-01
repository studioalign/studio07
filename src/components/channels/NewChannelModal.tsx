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
				if (!profile?.studio?.id) {
					throw new Error("No studio ID found");
				}

				// Fetch all teachers and parents
				const [teachers, parents] = await Promise.all([
					getStudioUsersByRole("teacher", profile.studio.id),
					getStudioUsersByRole("parent", profile.studio.id),
				]);

				// Filter out the current user from available members
				// since they'll be automatically added as admin
				const allUsers = [...teachers, ...parents];
				const filteredUsers = allUsers
					.filter((user) => user.id !== profile.id)
					.map((user) => ({
						id: user.id,
						label: `${user.name || user.email} (${user.role})`,
					}));

				setAvailableUsers(filteredUsers);
			} catch (err) {
				console.error("Error fetching users:", err);
				setError(err instanceof Error ? err.message : "Failed to fetch users");
			} finally {
				setLoading(false);
			}
		}

		fetchUsers();
	}, [profile?.studio?.id, profile?.id]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!name.trim()) {
			setError("Channel name is required");
			return;
		}

		setIsSubmitting(true);
		setError(null);

		try {
			// First ensure we have a profile ID
			if (!profile?.id) {
				throw new Error("You must be logged in to create a channel");
			}

			// Make sure we have a studio ID
			if (!profile?.studio?.id) {
				throw new Error("Studio ID is required to create a channel");
			}

			// Log detailed input data
			const channelData = {
				name: name.trim(),
				description: description.trim() || null,
				created_by: profile.id,
				studio_id: profile.studio.id,
			};

			// Create the channel with ONLY the valid fields from our schema
			const insertResponse = await supabase
				.from("class_channels")
				.insert(channelData)
				.select()
				.single();

			const insertError = insertResponse.error;
			const channel = insertResponse.data;

			if (insertError) {
				// Detailed error logging
				console.error("Channel insertion error:", {
					message: insertError.message,
					code: insertError.code,
					details: insertError.details,
					hint: insertError.hint,
				});
				throw new Error(
					`Failed to create channel: ${insertError.message} (${insertError.code})`
				);
			}

			if (!channel) {
				throw new Error("Channel created but no data returned");
			}

			// Prepare member inserts - start with all selected members
			const memberInserts = selectedMembers.map((member) => ({
				channel_id: channel.id,
				user_id: member.id,
				role: "member",
			}));

			// Always add the creator as an admin (they don't need to be in the selected list)
			memberInserts.push({
				channel_id: channel.id,
				user_id: profile.id,
				role: "admin",
			});

			// Only attempt to insert members if we have any
			if (memberInserts.length > 0) {
				const memberResponse = await supabase
					.from("channel_members")
					.insert(memberInserts);

				const membersError = memberResponse.error;

				if (membersError) {
					console.error("Member insertion error:", {
						message: membersError.message,
						code: membersError.code,
						details: membersError.details,
						hint: membersError.hint,
					});
					// Still consider channel creation successful even if member addition fails
					console.warn("Channel created but some members could not be added");
				}
			}

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

					<div>
						<p className="mb-1 text-sm text-gray-500">
							You'll automatically be added as an admin of this channel.
						</p>
						<MultiSelectDropdown
							id="members"
							label="Select Additional Members"
							value={selectedMembers}
							onChange={setSelectedMembers}
							options={availableUsers}
							isLoading={loading}
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
							disabled={isSubmitting || !name.trim()}
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
