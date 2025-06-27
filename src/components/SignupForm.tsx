import React, { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AlertCircle, UserPlus } from "lucide-react";
import { supabase } from "../lib/supabase";
import { Role } from "../types/auth";
import FormInput from "./FormInput";
import { notificationService } from "../services/notificationService";
import { Database } from "../types/database-types";

// Cooldown constants
const SIGNUP_COOLDOWN_KEY = "signup_cooldown";
const COOLDOWN_PERIOD_MS = 60000; // 1 minute

type ValidateInvitationResponse = {
	studio_id: string;
	email: string;
	role: Role;
	studio_name: string;
};

export default function SignupForm() {
	const [searchParams] = useSearchParams();
	const invitationToken = searchParams.get("token");
	const [selectedRole, setSelectedRole] = useState<Role | null>(null);
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [confirmationSent, setConfirmationSent] = useState(false);
	const [cooldownRemaining, setCooldownRemaining] = useState(0);
	const [invitationRole, setInvitationRole] = useState<Role | null>(null);
	const [invitationDetails, setInvitationDetails] = useState<{
		studio_name: string;
		role: Role;
		email: string;
		studio_id: string;
	} | null>(null);
	const [showSignupForm, setShowSignupForm] = useState(false);

	// Check cooldown on component mount
	useEffect(() => {
		const cooldownEnd = localStorage.getItem(SIGNUP_COOLDOWN_KEY);
		if (cooldownEnd) {
			const remaining = Math.max(
				0,
				parseInt(cooldownEnd) + COOLDOWN_PERIOD_MS - Date.now()
			);
			if (remaining > 0) {
				setCooldownRemaining(Math.ceil(remaining / 1000));
				const timer = setInterval(() => {
					setCooldownRemaining((prev) => {
						if (prev <= 1) {
							clearInterval(timer);
							localStorage.removeItem(SIGNUP_COOLDOWN_KEY);
							return 0;
						}
						return prev - 1;
					});
				}, 1000);
			}
		}
	}, []);

	// Validate invitation token on component mount
	useEffect(() => {
		if (invitationToken) {
			validateInvitationToken();
		} else {
			// If no invitation token, this is a direct owner signup
			setSelectedRole("owner");
			setShowSignupForm(true);
		}
	}, [invitationToken]);

	const validateInvitationToken = async () => {
		try {
			// Validate invitation token using the database function
			const { data, error: validationError } = await (supabase.rpc(
				"validate_invitation_token" as keyof Database["public"]["Functions"],
				{
					p_token: invitationToken || "",
				}
			) as unknown as Promise<{
				data: ValidateInvitationResponse[] | null;
				error: Error | null;
			}>);

			if (validationError) {
				throw validationError;
			}

			if (!data || data.length === 0) {
				setError("Invalid or expired invitation token");
				return;
			}

			const invitation = data[0];
			const role = invitation.role as Role;
			setInvitationDetails({
				studio_name: invitation.studio_name,
				role,
				email: invitation.email,
				studio_id: invitation.studio_id,
			});
			setEmail(invitation.email);
			setSelectedRole(role);
			setInvitationRole(role);
			setShowSignupForm(true);
		} catch (err) {
			console.error("Error validating invitation:", err);
			setError("Invalid invitation token");
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);
		setIsSubmitting(true);

		try {
			if (!selectedRole) {
				throw new Error("Please select a role");
			}

			// Sign up the user with metadata
			const signUpData: {
				email: string;
				password: string;
				options: {
					data: {
						name: string;
						role: Role;
						studio_id?: string;
						invitation_token?: string;
					};
					emailRedirectTo: string;
				};
			} = {
				email,
				password,
				options: {
					data: {
						name,
						role: selectedRole,
						studio_id: invitationDetails?.studio_id,
					},
					emailRedirectTo: `${window.location.origin}/auth/callback`,
				},
			};

			// Add invitation token if present
			if (invitationToken) {
				signUpData.options.data.invitation_token = invitationToken;
			}

			const { data: authData, error: signUpError } = await supabase.auth.signUp(
				signUpData
			);

			if (signUpError) {
				console.error("Signup error:", signUpError);

				// Check specifically for email already registered error
				if (
					signUpError.message.includes("User already registered") ||
					signUpError.message.includes("already in use") ||
					signUpError.message.includes("already exists")
				) {
					throw new Error(
						"This email address is already registered. Please use a different email or try signing in."
					);
				}

				throw signUpError;
			}

			// Remove the problematic check - if we get here, signup was successful
			if (!authData.user) {
				throw new Error("Failed to create user account. Please try again.");
			}

			// Send appropriate notifications based on role
			try {
				if (selectedRole === "parent" && invitationDetails?.studio_id) {
					await notificationService.notifyParentRegistration(
						invitationDetails.studio_id,
						name,
						authData.user.id
					);
				} else if (selectedRole === "teacher" && invitationDetails?.studio_id) {
					await notificationService.notifyStaffRegistration(
						invitationDetails.studio_id,
						name,
						authData.user.id,
						"teacher"
					);
				}
			} catch (notificationError) {
				// Log but don't fail the registration if notification fails
				console.error(
					"Failed to send registration notification:",
					notificationError
				);
			}

			setConfirmationSent(true);
		} catch (err) {
			console.error("Error in signup:", err);

			// Check for rate limit error
			if (err instanceof Error && err.message.includes("rate limit exceeded")) {
				localStorage.setItem(SIGNUP_COOLDOWN_KEY, Date.now().toString());
				setCooldownRemaining(COOLDOWN_PERIOD_MS / 1000);

				const timer = setInterval(() => {
					setCooldownRemaining((prev) => {
						if (prev <= 1) {
							clearInterval(timer);
							return 0;
						}
						return prev - 1;
					});
				}, 1000);

				setError(
					"Too many signup attempts. Please wait a minute before trying again."
				);
			} else {
				setError(
					err instanceof Error ? err.message : "An error occurred during signup"
				);
			}
		} finally {
			setIsSubmitting(false);
		}
	};

	if (confirmationSent) {
		return (
			<div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-xl">
				<div className="text-center mb-8">
					<div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							className="h-8 w-8 text-green-600"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
							/>
						</svg>
					</div>
					<h1 className="text-2xl font-bold text-brand-primary mb-2">
						Check your email
					</h1>
					<p className="text-brand-secondary-400 mb-4">
						We've sent a confirmation email to <strong>{email}</strong>
					</p>
					<p className="text-sm text-gray-600 mb-6">
						Please check your email and click the confirmation link to activate
						your account.
						{selectedRole === "owner" &&
							" After confirming, you'll be taken to the studio setup page and then need to choose a subscription plan to access your dashboard."}
						{invitationToken && ` You'll then be able to access the studio.`}
					</p>
					<Link
						to="/"
						className="text-brand-primary hover:text-brand-secondary-400"
					>
						Return to sign in
					</Link>
				</div>
			</div>
		);
	}

	// Show welcome screen for invited users
	if (invitationToken && invitationDetails && !showSignupForm) {
		return (
			<div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-xl">
				<div className="text-center mb-8">
					<div className="w-16 h-16 bg-brand-primary rounded-full flex items-center justify-center mx-auto mb-4">
						<UserPlus className="h-8 w-8 text-white" />
					</div>
					<h1 className="text-2xl font-bold text-brand-primary mb-2">
						Welcome to {invitationDetails.studio_name}!
					</h1>
					<p className="text-brand-secondary-400 mb-6">
						You've been invited to join as a{" "}
						<strong>{invitationDetails.role}</strong>
					</p>
					<div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6 text-left">
						<h3 className="font-medium text-blue-900 mb-2">What's next?</h3>
						<ul className="text-sm text-blue-800 space-y-2">
							<li>• Create your account with a secure password</li>
							<li>• Access your {invitationDetails.role} dashboard</li>
							<li>• Start managing your activities in the studio</li>
						</ul>
					</div>
					<button
						onClick={() => setShowSignupForm(true)}
						className="w-full px-4 py-2 bg-brand-primary text-white rounded-md hover:bg-brand-secondary-400 transition-colors"
					>
						Create Your Account
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-xl">
			<div className="text-center mb-8">
				<h1 className="text-3xl font-bold text-brand-primary mb-2">
					{invitationToken ? "Create your account" : "Sign up as Studio Owner"}
				</h1>
				<p className="text-brand-secondary-400">
					{invitationToken
						? `Join ${invitationDetails?.studio_name || "the studio"}`
						: "Start your dance studio management journey"}
				</p>
			</div>

			{invitationToken && invitationRole && (
				<div className="my-4 p-4 bg-green-50 border border-green-200 rounded-md">
					<p className="text-sm text-green-800">
						You've been invited to join as a <strong>{invitationRole}</strong>.
						Complete the form below to create your account.
					</p>
				</div>
			)}

			<form onSubmit={handleSubmit} className="space-y-6 max-w-md mx-auto">
				<FormInput
					id="name"
					type="text"
					label="Full name"
					value={name}
					onChange={(e) => setName(e.target.value)}
					required
				/>

				<FormInput
					id="email"
					type="email"
					label="Email address"
					value={email}
					onChange={(e) => setEmail(e.target.value)}
					required
					readOnly={!!invitationToken}
				/>

				<FormInput
					id="password"
					type="password"
					label="Password"
					value={password}
					onChange={(e) => setPassword(e.target.value)}
					required
				/>

				{error && (
					<div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md flex items-start">
						<AlertCircle className="w-5 h-5 mr-2 mt-0.5" />
						<span>{error}</span>
					</div>
				)}

				<button
					type="submit"
					disabled={!selectedRole || isSubmitting || cooldownRemaining > 0}
					className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-brand-primary hover:bg-brand-secondary-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-accent disabled:bg-gray-400 disabled:cursor-not-allowed"
				>
					{isSubmitting ? (
						<>
							<div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
							Creating account...
						</>
					) : cooldownRemaining > 0 ? (
						`Please wait ${cooldownRemaining}s`
					) : (
						<>
							<UserPlus className="w-5 h-5 mr-2" />
							Create Account
						</>
					)}
				</button>

				{cooldownRemaining > 0 && (
					<p className="text-center text-sm text-gray-600">
						Too many attempts. Please wait {cooldownRemaining} seconds before
						trying again.
					</p>
				)}
			</form>

			<div className="mt-8 text-center">
				<p className="text-brand-secondary-400">
					Already have an account?{" "}
					<Link
						to="/"
						className="font-medium text-brand-primary hover:text-brand-secondary-400"
					>
						Sign in
					</Link>
				</p>
			</div>
		</div>
	);
}
