import React, { useState, useEffect } from "react";
import { Edit2, Save, X, UserPlus, Trash2 } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { Role } from "../../types/auth";
import InviteUserModal from "./InviteUserModal";

interface StudioUser {
	id: string;
	name: string;
	email: string;
	role: Role;
	created_at: string;
}

export default function UserManagement() {
	const { profile } = useAuth();
	const [users, setUsers] = useState<StudioUser[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [editingUser, setEditingUser] = useState<string | null>(null);
	const [editRole, setEditRole] = useState<Role>("parent");
	const [inviteModalOpen, setInviteModalOpen] = useState(false);

	// Sort users to put current user first
	const sortedUsers = users.sort((a, b) => {
		if (a.id === profile?.id) return -1;
		if (b.id === profile?.id) return 1;
		return 0;
	});

	useEffect(() => {
		if (profile?.studio?.id) {
			fetchUsers();
		}
	}, [profile?.studio?.id]);

	const fetchUsers = async () => {
		if (!profile?.studio?.id) return;

		try {
			const { data, error: fetchError } = await supabase
				.from("users")
				.select("*")
				.eq("studio_id", profile.studio.id)
				.order("created_at", { ascending: false });

			if (fetchError) throw fetchError;

			// Filter and map data to match our interface
			const filteredUsers = (data || [])
				.filter((user) => user.role !== "deleted") // Exclude deleted users
				.map((user) => ({
					id: user.id,
					name: user.name,
					email: user.email,
					role: user.role as Role,
					created_at: user.created_at || new Date().toISOString(),
				}));

			setUsers(filteredUsers);
		} catch (err) {
			console.error("Error fetching users:", err);
			setError(err instanceof Error ? err.message : "Failed to fetch users");
		} finally {
			setLoading(false);
		}
	};

	const handleRoleChange = async (userId: string) => {
		try {
			const { error: updateError } = await supabase
				.from("users")
				.update({ role: editRole })
				.eq("id", userId);

			if (updateError) throw updateError;

			setUsers(
				users.map((user) =>
					user.id === userId ? { ...user, role: editRole } : user
				)
			);
			setEditingUser(null);
			setEditRole("parent");
		} catch (err) {
			console.error("Error updating user role:", err);
			setError(
				err instanceof Error ? err.message : "Failed to update user role"
			);
		}
	};

	const handleDeleteUser = async (userId: string) => {
		if (!confirm("Are you sure you want to delete this user?")) return;

		try {
			const { error } = await supabase.from("users").delete().eq("id", userId);

			if (error) throw error;

			setUsers(users.filter((user) => user.id !== userId));
		} catch (err) {
			console.error("Error deleting user:", err);
			setError("Failed to delete user");
		}
	};

	const startEditing = (user: StudioUser) => {
		setEditingUser(user.id);
		setEditRole(user.role);
	};

	const cancelEditing = () => {
		setEditingUser(null);
		setEditRole("parent");
	};

	if (loading) {
		return (
			<div className="flex justify-center items-center h-64">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary"></div>
			</div>
		);
	}

	return (
		<div className="bg-white shadow rounded-lg">
			<div className="px-4 py-5 sm:p-6">
				<div className="flex justify-between items-center mb-6">
					<div>
						<h3 className="text-lg leading-6 font-medium text-gray-900">
							User Management
						</h3>
						<p className="mt-1 text-sm text-gray-500">
							Manage users in your studio and their roles
						</p>
					</div>
					<button
						onClick={() => setInviteModalOpen(true)}
						className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-primary hover:bg-brand-secondary-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-accent"
					>
						<UserPlus className="w-4 h-4 mr-2" />
						Invite User
					</button>
				</div>

				{error && (
					<div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
						{error}
					</div>
				)}

				{users.length === 0 ? (
					<div className="text-center py-8">
						<UserPlus className="mx-auto h-12 w-12 text-gray-400" />
						<h3 className="mt-2 text-sm font-medium text-gray-900">
							No users yet
						</h3>
						<p className="mt-1 text-sm text-gray-500">
							Start by inviting teachers and parents to your studio.
						</p>
						<div className="mt-6">
							<button
								onClick={() => setInviteModalOpen(true)}
								className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-primary hover:bg-brand-secondary-400"
							>
								<UserPlus className="w-4 h-4 mr-2" />
								Invite Your First User
							</button>
						</div>
					</div>
				) : (
					<div className="overflow-hidden">
						<table className="min-w-full divide-y divide-gray-200">
							<thead className="bg-gray-50">
								<tr>
									<th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										User
									</th>
									<th className="hidden sm:table-cell px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										Email
									</th>
									<th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										Role
									</th>
									<th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										Actions
									</th>
								</tr>
							</thead>
							<tbody className="bg-white divide-y divide-gray-200">
								{sortedUsers.map((user) => (
									<tr key={user.id}>
										<td className="px-3 sm:px-6 py-4">
											<div className="text-sm font-medium text-gray-900">
												{user.name}
												<div className="sm:hidden text-xs text-gray-500 mt-1">
													{user.email}
												</div>
											</div>
										</td>
										<td className="hidden sm:table-cell px-3 sm:px-6 py-4 whitespace-nowrap">
											<div className="text-sm text-gray-500">{user.email}</div>
										</td>
										<td className="px-3 sm:px-6 py-4 whitespace-nowrap">
											{editingUser === user.id ? (
												<select
													value={editRole}
													onChange={(e) => setEditRole(e.target.value as Role)}
													className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-brand-accent focus:border-brand-accent sm:text-sm rounded-md"
												>
													<option value="owner">Studio Owner</option>
													<option value="teacher">Teacher</option>
													<option value="parent">Parent</option>
												</select>
											) : (
												<span
													className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                          ${
														user.role === "owner"
															? "bg-purple-100 text-purple-800"
															: user.role === "teacher"
															? "bg-blue-100 text-blue-800"
															: "bg-green-100 text-green-800"
													}`}
												>
													{user.role.charAt(0).toUpperCase() +
														user.role.slice(1)}
												</span>
											)}
										</td>
										<td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
											{editingUser === user.id ? (
												<div className="flex space-x-2">
													<button
														onClick={() => handleRoleChange(user.id)}
														className="text-green-600 hover:text-green-900"
													>
														<Save className="w-4 h-4" />
													</button>
													<button
														onClick={cancelEditing}
														className="text-gray-600 hover:text-gray-900"
													>
														<X className="w-4 h-4" />
													</button>
												</div>
											) : (
												<div className="flex space-x-2">
													{user.id !== profile?.id && (
														<>
															<button
																onClick={() => startEditing(user)}
																className="text-blue-600 hover:text-blue-900"
															>
																<Edit2 className="w-4 h-4" />
															</button>
															<button
																onClick={() => handleDeleteUser(user.id)}
																className="text-red-600 hover:text-red-900"
															>
																<Trash2 className="w-4 h-4" />
															</button>
														</>
													)}
												</div>
											)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</div>

			<InviteUserModal
				isOpen={inviteModalOpen}
				onClose={() => setInviteModalOpen(false)}
				onSuccess={fetchUsers}
			/>
		</div>
	);
}
