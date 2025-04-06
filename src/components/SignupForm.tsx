import React, { useState, useEffect } from "react";
import { UserPlus, AlertCircle, Clock } from "lucide-react";
import { Role } from "../types/auth";
import { roles } from "../data/roles";
import RoleCard from "./RoleCard";
import SearchableDropdown from "./SearchableDropdown";
import FormInput from "./FormInput";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useStudios } from "../hooks/useStudios";
import { notificationService } from "../services/notificationService";

// Store the last signup attempt timestamp in localStorage
const SIGNUP_COOLDOWN_KEY = "studioalign_signup_cooldown";
const COOLDOWN_PERIOD_MS = 60000; // 1 minute cooldown

export default function SignupForm() {
	const [selectedRole, setSelectedRole] = useState<Role | null>(null);
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [selectedStudio, setSelectedStudio] = useState<{
		id: string;
		label: string;
	} | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [cooldownRemaining, setCooldownRemaining] = useState(0);
	const [confirmationSent, setConfirmationSent] = useState(false);
	const navigate = useNavigate();
	const {
		studios,
		isLoading: loadingStudios,
		error: studiosError,
	} = useStudios();

	// Check for existing cooldown on component mount
	useEffect(() => {
		const lastSignupAttempt = localStorage.getItem(SIGNUP_COOLDOWN_KEY);
		if (lastSignupAttempt) {
			const lastAttemptTime = parseInt(lastSignupAttempt, 10);
			const now = Date.now();
			const elapsed = now - lastAttemptTime;
			
			if (elapsed < COOLDOWN_PERIOD_MS) {
				const remaining = Math.ceil((COOLDOWN_PERIOD_MS - elapsed) / 1000);
				setCooldownRemaining(remaining);
				
				// Start countdown timer
				const timer = setInterval(() => {
					setCooldownRemaining(prev => {
						if (prev <= 1) {
							clearInterval(timer);
							return 0;
						}
						return prev - 1;
					});
				}, 1000);
				
				return () => clearInterval(timer);
			}
		}
	}, []);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);
		
		// Check if we're in a cooldown period
		if (cooldownRemaining > 0) {
			setError(`Please wait ${cooldownRemaining} seconds before trying again.`);
			return;
		}
		
		setIsSubmitting(true);

		try {
			if (!selectedRole) {
				throw new Error("Please select a role");
			}

			if (
				(selectedRole === "teacher" || selectedRole === "parent") &&
				!selectedStudio
			) {
				throw new Error("Please select a studio");
			}

			// Sign up the user with metadata
			const { data: authData, error: signUpError } = await supabase.auth.signUp(
				{
					email,
					password,
					options: {
						data: {
							name,
							role: selectedRole,
							studio_id: selectedStudio?.id,
						},
						emailRedirectTo: `${window.location.origin}/auth/callback`,
					},
				}
			);

			if (signUpError) {
				console.error("Signup error:", signUpError);
				throw signUpError;
			}

			if (!authData.user) {
				console.error("No user data returned");
				throw new Error("Signup failed");
			}

			// Send appropriate notifications based on role
			try {
				if (selectedRole === "parent" && selectedStudio) {
					await notificationService.notifyParentRegistration(
						selectedStudio.id,
						name,
						authData.user.id
					);
					console.log("Parent registration notification sent");
				} else if (selectedRole === "teacher" && selectedStudio) {
					await notificationService.notifyStaffRegistration(
						selectedStudio.id,
						name,
						authData.user.id,
						"teacher" // Using "teacher" role since staff doesn't exist
					);
					console.log("Teacher registration notification sent");
				}
			} catch (notificationError) {
				// Log but don't fail the registration if notification fails
				console.error("Failed to send registration notification:", notificationError);
			}

			// Always show confirmation message after signup, regardless of role
			// This ensures users confirm their email before proceeding
			setConfirmationSent(true);
		} catch (err) {
			console.error("Error in signup:", err);
			
			// Check for rate limit error
			if (err instanceof Error && err.message.includes("rate limit exceeded")) {
				// Set a cooldown period
				localStorage.setItem(SIGNUP_COOLDOWN_KEY, Date.now().toString());
				setCooldownRemaining(COOLDOWN_PERIOD_MS / 1000);
				
				// Start cooldown timer
				const timer = setInterval(() => {
					setCooldownRemaining(prev => {
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
						Please check your email and click the confirmation link to activate your account.
						{selectedRole === "owner" && 
							" After confirming, you'll be taken to the studio setup page to complete your registration."
						}
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

	return (
		<div className="w-full max-w-4xl p-8 bg-white rounded-2xl shadow-xl">
			<div className="text-center mb-8">
				<h1 className="text-3xl font-bold text-brand-primary mb-2">
					Create your StudioAlign account
				</h1>
				<p className="text-brand-secondary-400">
					Choose your role to get started
				</p>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
				{roles.map((role) => (
					<RoleCard
						key={role.id}
						role={role}
						isSelected={selectedRole === role.id}
						onSelect={setSelectedRole}
					/>
				))}
			</div>

			{cooldownRemaining > 0 && (
				<div className="mb-6 bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded-md flex items-start">
					<Clock className="w-5 h-5 mr-2 mt-0.5" />
					<div>
						<p className="font-medium">Signup attempt rate limited</p>
						<p>Please wait {cooldownRemaining} seconds before trying again.</p>
					</div>
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
				/>

				<FormInput
					id="password"
					type="password"
					label="Password"
					value={password}
					onChange={(e) => setPassword(e.target.value)}
					required
				/>

				{(selectedRole === "teacher" || selectedRole === "parent") && (
					<SearchableDropdown
						id="studio"
						label="Select Studio"
						value={selectedStudio}
						onChange={setSelectedStudio}
						options={studios.map((studio) => ({
							id: studio.id,
							label: studio.name,
						}))}
						isLoading={loadingStudios}
						error={studiosError}
					/>
				)}
				
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
							Signing up...
						</>
					) : (
						<>
							<UserPlus className="w-5 h-5 mr-2" />
							Sign up
						</>
					)}
				</button>

				<p className="text-center text-sm text-brand-secondary-400">
					Already have an account?{" "}
					<Link
						to="/"
						className="font-medium text-brand-primary hover:text-brand-secondary-400"
					>
						Sign in
					</Link>
				</p>
			</form>
		</div>
	);
}
