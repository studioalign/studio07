import React, { useState, useEffect } from "react";
import { X, Send, UserPlus, AlertCircle } from "lucide-react";
import { supabaseAdmin } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import FormInput from "../FormInput";
import { emailService } from "../../services/emailService";
import { notificationService } from "../../services/notificationService";

interface InviteUserModalProps {
	isOpen: boolean;
	onClose: () => void;
	onSuccess: () => void;
}

type InviteRole = "teacher" | "parent";

interface CapacityCheck {
	can_add: boolean;
	current_students: number;
	max_students: number;
}

export default function InviteUserModal({
	isOpen,
	onClose,
	onSuccess,
}: InviteUserModalProps) {
	const { profile } = useAuth();
	const [email, setEmail] = useState("");
	const [role, setRole] = useState<InviteRole>("parent");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState(false);
	const [capacityCheck, setCapacityCheck] = useState<CapacityCheck | null>(
		null
	);
	const [loadingCapacity, setLoadingCapacity] = useState(true);

	useEffect(() => {
		async function checkCapacityAndNotify() {
			if (!isOpen || !profile?.studio?.id) return;
			setLoadingCapacity(true);
			try {
				const { data, error } = await supabaseAdmin.rpc(
					"check_student_capacity",
					{ p_studio_id: profile.studio.id }
				);

				if (error) throw error;

				const capacityData = data as unknown as CapacityCheck;
				setCapacityCheck(capacityData);

				if (!capacityData.can_add) {
					await notificationService.notifyUpgradeRequired(
						profile.studio.id,
						`Your studio has reached its ${capacityData.max_students} student limit. Please upgrade your plan to invite new users.`
					);
				}
			} catch (error) {
				console.error("Error checking student capacity:", error);
				setError("Could not verify your studio's student capacity.");
			} finally {
				setLoadingCapacity(false);
			}
		}
		checkCapacityAndNotify();
	}, [isOpen, profile?.studio?.id]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!profile?.studio?.id) {
			setError("Studio information not found");
			return;
		}

		if (!capacityCheck?.can_add) {
			setError(
				`You have reached the maximum of ${capacityCheck?.max_students} students for your plan. Please upgrade to invite more users.`
			);
			return;
		}

		setLoading(true);
		setError(null);

		try {
			// Generate a secure invitation token
			const invitationToken = generateSecureToken();
			const invitationUrl = `${window.location.origin}/signup?token=${invitationToken}`;

			// Create a user invitation in the database
			const { error: inviteError } = await supabaseAdmin.rpc(
				"create_user_invitation",
				{
					p_studio_id: profile.studio.id,
					p_email: email,
					p_role: role,
					p_invited_by: profile.id,
					p_token: invitationToken,
				}
			);

			if (inviteError) {
				throw inviteError;
			}

			// Send invitation email using our email service
			const emailSent = await emailService.sendInvitationEmail({
				recipientEmail: email,
				inviterName: profile.name,
				studioName: profile.studio.name,
				role: role,
				invitationUrl: invitationUrl,
			});

			if (!emailSent) {
				throw new Error("Failed to send invitation email");
			}

			setSuccess(true);
			setTimeout(() => {
				onSuccess();
				handleClose();
			}, 2000);
		} catch (err) {
			console.error("Error creating invitation:", err);
			setError(
				err instanceof Error ? err.message : "Failed to create invitation"
			);
		} finally {
			setLoading(false);
		}
	};

	// Generate a secure token on the frontend
	const generateSecureToken = (): string => {
		const array = new Uint8Array(32);
		crypto.getRandomValues(array);
		return btoa(String.fromCharCode(...array))
			.replace(/\+/g, "-")
			.replace(/\//g, "_")
			.replace(/=/g, "");
	};

	const handleClose = () => {
		setEmail("");
		setRole("parent");
		setError(null);
		setSuccess(false);
		onClose();
	};

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
			<div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
				<div className="p-6">
					<div className="flex items-center justify-between mb-6">
						<div className="flex items-center space-x-3">
							<div className="w-10 h-10 bg-brand-primary rounded-full flex items-center justify-center">
								<UserPlus className="w-5 h-5 text-white" />
							</div>
							<h2 className="text-xl font-semibold text-brand-primary">
								Invite User
							</h2>
						</div>
						<button
							onClick={handleClose}
							className="text-gray-400 hover:text-gray-600 transition-colors"
						>
							<X className="w-5 h-5" />
						</button>
					</div>

					{success ? (
						<div className="text-center py-8">
							<div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
								<Send className="w-8 h-8 text-green-600" />
							</div>
							<h3 className="text-lg font-semibold text-green-900 mb-2">
								Invitation Sent!
							</h3>
							<p className="text-green-700 text-sm">
								An invitation email has been sent to {email}. They'll receive
								instructions to create their account and join your studio.
							</p>
						</div>
					) : loadingCapacity ? (
						<div className="text-center p-8">
							<p>Checking studio capacity...</p>
						</div>
					) : capacityCheck && !capacityCheck.can_add ? (
						<div className="p-6 bg-yellow-50 rounded-lg">
							<div className="flex">
								<div className="flex-shrink-0">
									<AlertCircle
										className="h-5 w-5 text-yellow-400"
										aria-hidden="true"
									/>
								</div>
								<div className="ml-3">
									<h3 className="text-sm font-medium text-yellow-800">
										Student Limit Reached
									</h3>
									<div className="mt-2 text-sm text-yellow-700">
										<p>
											Your studio has reached its limit of{" "}
											{capacityCheck.max_students} students. To invite new
											users, you'll need to upgrade your plan.
										</p>
									</div>
									<div className="mt-4">
										<a
											href="/dashboard/billing"
											className="px-4 py-2 bg-yellow-400 text-white text-sm font-medium rounded-md hover:bg-yellow-500"
										>
											Upgrade Plan
										</a>
									</div>
								</div>
							</div>
						</div>
					) : (
						<form onSubmit={handleSubmit} className="space-y-6">
							<FormInput
								id="email"
								type="email"
								label="Email Address"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								required
							/>

							<div>
								<label className="block text-sm font-medium text-brand-secondary-400 mb-2">
									Role
								</label>
								<div className="grid grid-cols-2 gap-4">
									<button
										type="button"
										onClick={() => setRole("teacher")}
										className={`p-4 border rounded-lg text-center transition-colors ${
											role === "teacher"
												? "border-brand-primary bg-brand-primary bg-opacity-10 text-brand-primary"
												: "border-gray-200 hover:border-brand-primary"
										}`}
									>
										<div className="font-medium">Teacher</div>
										<div className="text-sm text-gray-500">
											Manage classes and students
										</div>
									</button>
									<button
										type="button"
										onClick={() => setRole("parent")}
										className={`p-4 border rounded-lg text-center transition-colors ${
											role === "parent"
												? "border-brand-primary bg-brand-primary bg-opacity-10 text-brand-primary"
												: "border-gray-200 hover:border-brand-primary"
										}`}
									>
										<div className="font-medium">Parent</div>
										<div className="text-sm text-gray-500">
											View schedules and payments
										</div>
									</button>
								</div>
							</div>

							{error && (
								<div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
									{error}
								</div>
							)}

							<div className="flex space-x-3">
								<button
									type="button"
									onClick={handleClose}
									className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-accent"
								>
									Cancel
								</button>
								<button
									type="submit"
									disabled={
										loading ||
										!email ||
										!capacityCheck?.can_add ||
										loadingCapacity
									}
									className="flex-1 flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-white bg-brand-primary hover:bg-brand-secondary-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-accent disabled:bg-gray-400"
								>
									{loading ? (
										<>
											<div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
											Sending...
										</>
									) : (
										<>
											<Send className="w-4 h-4 mr-2" />
											Send Invitation
										</>
									)}
								</button>
							</div>
						</form>
					)}
				</div>
			</div>
		</div>
	);
}
