import React, { useState, useEffect } from "react";
import { UserPlus, Shield, User, X, Trash2 } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import SearchableDropdown from "../SearchableDropdown";

interface ChannelMembersProps {
	channelId: string;
	onClose: () => void;
}

interface Member {
	role: string;
	user: {
		id: string;
		email: string;
		name: string;
	};
	user_id?: string; // Added to support both formats
}

export default function ChannelMembers({
	channelId,
	onClose,
}: ChannelMembersProps) {
	const [members, setMembers] = useState<Member[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [showAddMember, setShowAddMember] = useState(false);
	const [availableUsers, setAvailableUsers] = useState<
		{ id: string; label: string }[]
	>([]);
	const [selectedUser, setSelectedUser] = useState<{
		id: string;
		label: string;
	} | null>(null);
	const [selectedRole, setSelectedRole] = useState<"admin" | "member">(
		"member"
	);
	const { profile } = useAuth();

	useEffect(() => {
		fetchMembers();
	}, [channelId]);

	const fetchMembers = async () => {
		try {
			setLoading(true);
			const { data, error: fetchError } = await supabase
				.from("channel_members")
				.select(
					`
					role,
					user_id,
					user: users(
						id,
						email,
						name
					)
					`
				)
				.eq("channel_id", channelId);

			if (fetchError) throw fetchError;
			setMembers(data || []);

			// Fetch available users
			const { data: classData } = await supabase
				.from("class_channels")
				.select("class:classes(studio_id)")
				.eq("id", channelId)
				.single();

			if (classData) {
				const memberIds = data ? data.map((m) => m.user_id || m.user?.id).filter(Boolean) : [];
				const idList = memberIds.length > 0 ? `(${memberIds.join(",")})` : '(0)';
				
				const { data: users } = await supabase
					.from("users")
					.select(
						`
						id,
						email,
						name
					`
					)
					.not("id", "in", idList)
					.eq("studio_id", classData.class?.studio_id);

				setAvailableUsers(
					(users || []).map((user) => ({
						id: user.id,
						label: `${user.name || "Unknown"} (${user.email})`,
					}))
				);
			}
		} catch (err) {
			console.error("Error fetching members:", err);
			setError(err instanceof Error ? err.message : "Failed to fetch members");
		} finally {
			setLoading(false);
		}
	};

	const handleAddMember = async () => {
		if (!selectedUser) return;

		try {
			const { error: insertError } = await supabase
				.from("channel_members")
				.insert([
					{
						channel_id: channelId,
						user_id: selectedUser.id,
						role: selectedRole,
					},
				]);

			if (insertError) throw insertError;

			setSelectedUser(null);
			setSelectedRole("member");
			setShowAddMember(false);
			fetchMembers();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to add member");
		}
	};

	const handleRemoveMember = async (userId: string) => {
		if (!window.confirm("Are you sure you want to remove this member?")) return;

		try {
			const { error } = await supabase
				.from("channel_members")
				.delete()
				.eq("channel_id", channelId)
				.eq("user_id", userId);

			if (error) throw error;
			fetchMembers();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to remove member");
		}
	};

	const handleRoleChange = async (
		userId: string,
		newRole: "admin" | "member"
	) => {
		try {
			const { error } = await supabase
				.from("channel_members")
				.update({ role: newRole })
				.eq("channel_id", channelId)
				.eq("user_id", userId);

			if (error) throw error;
			fetchMembers();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to update role");
		}
	};

	const getMemberName = (member: Member) => {
		return member.user?.name || "Unknown";
	};

	if (loading) {
		return (
			<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
				<div className="bg-white rounded-lg p-6 w-full max-w-2xl">
					<div className="animate-pulse space-y-4">
						<div className="h-8 bg-gray-200 rounded w-1/2" />
						<div className="space-y-3">
							{[1, 2, 3].map((i) => (
								<div key={i} className="h-12 bg-gray-200 rounded" />
							))}
						</div>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
			<div className="bg-white rounded-lg p-6 w-full max-w-2xl">
				<div className="flex justify-between items-center mb-6">
					<h2 className="text-xl font-semibold text-brand-primary">
						Channel Members
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

				{profile?.role === "owner" && (
					<div className="mb-6">
						{showAddMember ? (
							<div className="space-y-4">
								<SearchableDropdown
									id="user"
									label="Select User"
									value={selectedUser}
									onChange={setSelectedUser}
									options={availableUsers}
								/>

								<div>
									<label className="block text-sm font-medium text-brand-secondary-400 mb-1">
										Role
									</label>
									<select
										value={selectedRole}
										onChange={(e) =>
											setSelectedRole(e.target.value as "admin" | "member")
										}
										className="w-full px-3 py-2 border rounded-md"
									>
										<option value="member">Member</option>
										<option value="admin">Admin</option>
									</select>
								</div>

								<div className="flex justify-end space-x-3">
									<button
										onClick={() => setShowAddMember(false)}
										className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
									>
										Cancel
									</button>
									<button
										onClick={handleAddMember}
										disabled={!selectedUser}
										className="flex items-center px-4 py-2 bg-brand-primary text-white rounded-md hover:bg-brand-secondary-400 disabled:bg-gray-400"
									>
										<UserPlus className="w-4 h-4 mr-2" />
										Add Member
									</button>
								</div>
							</div>
						) : (
							<button
								onClick={() => setShowAddMember(true)}
								className="flex items-center px-4 py-2 bg-brand-primary text-white rounded-md hover:bg-brand-secondary-400"
							>
								<UserPlus className="w-5 h-5 mr-2" />
								Add Member
							</button>
						)}
					</div>
				)}

				<div className="space-y-4">
					{members.map((member) => (
						<div
							key={member.user?.id || member.user_id}
							className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
						>
							<div className="flex items-center">
								{member.role === "admin" ? (
									<Shield className="w-5 h-5 text-brand-primary mr-3" />
								) : (
									<User className="w-5 h-5 text-gray-400 mr-3" />
								)}
								<div>
									<p className="font-medium text-gray-900">
										{getMemberName(member)}
									</p>
									<p className="text-sm text-gray-500">{member.user?.email}</p>
								</div>
							</div>

							{profile?.role === "owner" && (
								<div className="flex items-center space-x-3">
									<select
										value={member.role}
										onChange={(e) =>
											handleRoleChange(
												member.user_id || member.user?.id || "",
												e.target.value as "admin" | "member"
											)
										}
										className="px-3 py-1 border rounded-md text-sm"
									>
										<option value="member">Member</option>
										<option value="admin">Admin</option>
									</select>
									<button
										onClick={() => handleRemoveMember(member.user_id || member.user?.id || "")}
										className="p-1 text-gray-400 hover:text-red-500"
									>
										<Trash2 className="w-5 h-5" />
									</button>
								</div>
							)}
						</div>
					))}

					{members.length === 0 && (
						<p className="text-center text-gray-500 py-4">No members found</p>
					)}
				</div>
			</div>
		</div>
	);
}