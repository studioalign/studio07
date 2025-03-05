import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import FormInput from "../FormInput";

export default function OnboardingPage() {
	const navigate = useNavigate();
	const [studioInfo, setStudioInfo] = useState({
		name: "",
		address: "",
		phone: "",
		email: "",
	});
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		checkUser();
	}, []);

	const checkUser = async () => {
		const {
			data: { user },
		} = await supabase.auth.getUser();
		if (!user) {
			navigate("/");
			return;
		}

		// Check if user already has a studio
		const { data: studio } = await supabase
			.from("studios")
			.select("*")
			.eq("owner_id", user.id)
			.single();

		if (studio) {
			navigate("/dashboard");
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);
		setLoading(true);

		try {
			const {
				data: { user },
			} = await supabase.auth.getUser();
			if (!user) throw new Error("No authenticated user");

			// Create the studio
			const { data: studioData, error: studioError } = await supabase
				.from("studios")
				.insert([
					{
						owner_id: user.id,
						...studioInfo,
					},
				])
				.select()
				.single();

			if (studioError) throw studioError;

			// Update the user's studio_id
			const { error: updateError } = await supabase
				.from("users")
				.update({ studio_id: studioData.id })
				.eq("id", user.id);

			if (updateError) throw updateError;

			navigate("/dashboard");
		} catch (err) {
			console.error("Error in onboarding:", err);
			setError(
				err instanceof Error
					? err.message
					: "An error occurred during onboarding"
			);
		} finally {
			setLoading(false);
		}
	};

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setStudioInfo((prev) => ({
			...prev,
			[e.target.id]: e.target.value,
		}));
	};

	return (
		<div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
			<div className="sm:mx-auto sm:w-full sm:max-w-md">
				<h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
					Set up your studio
				</h2>
				<p className="mt-2 text-center text-sm text-gray-600">
					Let's get your dance studio ready
				</p>
			</div>

			<div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
				<div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
					<form onSubmit={handleSubmit} className="space-y-6">
						<FormInput
							id="name"
							label="Studio Name"
							type="text"
							required
							value={studioInfo.name}
							onChange={handleChange}
						/>

						<FormInput
							id="address"
							label="Studio Address"
							type="text"
							required
							value={studioInfo.address}
							onChange={handleChange}
						/>

						<FormInput
							id="phone"
							label="Studio Phone"
							type="text"
							required
							value={studioInfo.phone}
							onChange={handleChange}
						/>

						<FormInput
							id="email"
							label="Studio Email"
							type="email"
							required
							value={studioInfo.email}
							onChange={handleChange}
						/>

						<button
							type="submit"
							disabled={loading}
							className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-primary hover:bg-brand-secondary-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-accent disabled:bg-gray-400"
						>
							{loading ? "Setting up..." : "Complete Setup"}
						</button>

						{error && (
							<p className="mt-2 text-sm text-red-600" id="email-error">
								{error}
							</p>
						)}
					</form>
				</div>
			</div>
		</div>
	);
}
