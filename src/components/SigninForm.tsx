import React, { useState } from "react";
import { LogIn, AlertCircle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import FormInput from "./FormInput";
import MfaVerification from "./MfaVerification";

export default function SigninForm() {
	const { signIn, mfaAuthenticationInProgress } = useAuth();
	const navigate = useNavigate();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsSubmitting(true);
		setError(null);

		try {
			const result = await signIn(email, password);

			if (!result.success) {
				throw new Error(result.error || "Invalid email or password");
			}

			// If MFA is needed, the mfaAuthenticationInProgress state will be set to true
			// and the MfaVerification component will handle the rest
			if (!result.needsMfa) {
				// Regular login (no MFA) successful - redirect based on user role
				navigate("/dashboard");
			}
		} catch (err) {
			console.error("Error in login:", err);
			setError(err instanceof Error ? err.message : "Invalid email or password");
		} finally {
			setIsSubmitting(false);
		}
	};

	// If MFA auth is in progress, show the MFA verification screen
	if (mfaAuthenticationInProgress) {
		return <MfaVerification onBack={() => window.location.reload()} />;
	}

	return (
		<div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-xl">
			<div className="text-center mb-8">
				<h1 className="text-3xl font-bold text-brand-primary mb-2">
					Welcome Back
				</h1>
				<p className="text-brand-secondary-400">
					Sign in to your StudioAlign account
				</p>
			</div>

			<form onSubmit={handleSubmit} className="space-y-6">
				<FormInput
					id="email"
					type="email"
					label="Email address"
					value={email}
					onChange={(e) => setEmail(e.target.value)}
					required
				/>

				<div>
					<div className="flex items-center justify-between">
						<label
							htmlFor="password"
							className="block text-sm font-medium text-brand-secondary-400"
						>
							Password
						</label>
						<Link
							to="/forgot-password"
							className="text-sm text-brand-primary hover:text-brand-secondary-400"
						>
							Forgot your password?
						</Link>
					</div>
					<input
						id="password"
						type="password"
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						required
						className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-accent focus:border-brand-accent"
					/>
				</div>

				{error && (
					<div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md flex items-start">
						<AlertCircle className="w-5 h-5 mr-2 mt-0.5" />
						<span>{error}</span>
					</div>
				)}

				<button
					type="submit"
					disabled={isSubmitting}
					className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-brand-primary hover:bg-brand-secondary-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-accent disabled:bg-gray-400 disabled:cursor-not-allowed"
				>
					{isSubmitting ? (
						<>
							<div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
							Signing in...
						</>
					) : (
						<>
							<LogIn className="w-5 h-5 mr-2" />
							Sign in
						</>
					)}
				</button>

				<p className="text-center text-sm text-brand-secondary-400">
					Don't have an account?{" "}
					<Link
						to="/signup"
						className="font-medium text-brand-primary hover:text-brand-secondary-400"
					>
						Sign up
					</Link>
				</p>
			</form>
		</div>
	);
}
