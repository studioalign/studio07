import React, { useState } from "react";
import { LogIn } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import FormInput from "./FormInput";

export default function SigninForm() {
	const navigate = useNavigate();
	const { signIn } = useAuth();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);

		try {
			await signIn(email, password);
			navigate("/dashboard");
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to sign in");
		}
	};

	return (
		<div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-xl">
			<div className="text-center mb-8">
				<h1 className="text-3xl font-bold text-brand-primary mb-2">
					Welcome back
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
				/>

				<FormInput
					id="password"
					type="password"
					label="Password"
					value={password}
					onChange={(e) => setPassword(e.target.value)}
				/>

				<Link
					to="/forgot-password"
					className="block text-sm font-medium text-brand-primary hover:text-brand-secondary-400 -mt-5"
				>
					Forgot your password?
				</Link>

				<button
					type="submit"
					className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-brand-primary hover:bg-brand-secondary-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-accent"
				>
					<LogIn className="w-5 h-5 mr-2" />
					Sign in
				</button>

				{error && <p className="text-red-500 text-sm text-center">{error}</p>}

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
