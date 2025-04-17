import React, { useState } from "react";
import { Save, Camera } from "lucide-react";
import FormInput from "../FormInput";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";
import uploadImage from "../../utils/uploadImage";

export default function Profile() {
	const { profile } = useAuth();
	const [avatar, setAvatar] = useState(profile?.photo_url || "");
	const [name, setName] = useState(profile?.name || "");
	const [email, setEmail] = useState(profile?.email || "");
	const [phone, setPhone] = useState(profile?.phone || "");
	const [timezone, setTimezone] = useState(profile?.timezone || "");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [successMessage, setSuccessMessage] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file) {
			uploadImage(supabase, file, profile?.id || "").then((photoUrl) => {
				setAvatar(photoUrl);
				return supabase
					.from("users")
					.update({
						photo_url: photoUrl,
					})
					.eq("id", profile?.id || "")
					.throwOnError();
			});
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
	    e.preventDefault();
	    setIsSubmitting(true);
	    setError(null);
	
	    try {
	        const { error: updateError } = await supabase
	            .from("users")
	            .update({
	                name,
	                email,
	                phone,
	                timezone,
	            })
	            .eq("id", profile?.id || "");
	        if (updateError) throw updateError;
	        
	        // Add this to refresh the user's profile after updating
	        const { data: updatedProfile, error: profileError } = await supabase
	            .from("users")
	            .select(`
	                id, name, email, phone, timezone, photo_url,
	                studio:studios!users_studio_id_fkey(
	                    id, name, address, phone, email, country, currency, timezone
	                )
	            `)
	            .eq("id", profile?.id || "")
	            .single();
	            
	        if (profileError) throw profileError;
	        
	        // Add success message
	        setSuccessMessage("Profile updated successfully!");
	        setTimeout(() => setSuccessMessage(null), 3000);
	        
	    } catch (err) {
	        setError(err instanceof Error ? err.message : "Failed to update profile");
	    } finally {
	        setIsSubmitting(false);
	    }
	};

	return (
		<div>
			<div className="flex justify-between items-center mb-6">
				<h1 className="text-2xl font-bold text-brand-primary">Profile</h1>
			</div>

			<div className="bg-white rounded-lg shadow p-6">
				<form onSubmit={handleSubmit} className="space-y-6 max-w-lg">
					{/* Profile Picture */}
					<div className="flex items-center space-x-6">
						<div className="relative">
							<div className="w-24 h-24 rounded-full bg-brand-secondary-100 flex items-center justify-center overflow-hidden">
								{avatar ? (
									<img
										src={avatar}
										alt="Profile"
										className="w-full h-full object-cover"
									/>
								) : (
									<span className="text-3xl font-medium text-brand-primary">
										JD
									</span>
								)}
							</div>
							<label
								htmlFor="avatar-upload"
								className="absolute bottom-0 right-0 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center cursor-pointer hover:bg-gray-50"
							>
								<Camera className="w-4 h-4 text-brand-primary" />
							</label>
							<input
								id="avatar-upload"
								type="file"
								accept="image/*"
								onChange={handleAvatarChange}
								className="hidden"
							/>
						</div>
						<div>
							<h3 className="text-lg font-medium text-gray-900">
								Profile Picture
							</h3>
							<p className="text-sm text-gray-500">
								JPG, GIF or PNG. Max size of 800K
							</p>
						</div>
					</div>

					<FormInput
						id="name"
						type="text"
						label="Full Name"
						value={name}
						onChange={(e) => setName(e.target.value)}
						required
					/>

					<FormInput
						id="email"
						type="email"
						label="Email Address"
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						required
					/>

					<FormInput
						id="phone"
						type="text"
						label="Phone Number"
						value={phone}
						onChange={(e) => setPhone(e.target.value)}
					/>

					<div>
						<label
							htmlFor="timezone"
							className="block text-sm font-medium text-brand-secondary-400"
						>
							Timezone
						</label>
						<select
							id="timezone"
							value={timezone}
							onChange={(e) => setTimezone(e.target.value)}
							className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-accent focus:border-brand-accent"
						>
							<option value="">Select timezone</option>
							<option value="America/New_York">Eastern Time (ET)</option>
							<option value="America/Chicago">Central Time (CT)</option>
							<option value="America/Denver">Mountain Time (MT)</option>
							<option value="America/Los_Angeles">Pacific Time (PT)</option>
						</select>
					</div>

					{error && <p className="text-red-500 text-sm">{error}</p>}

					{successMessage && (
					    <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-md">
					        {successMessage}
					    </div>
					)}

					<button
						type="submit"
						disabled={isSubmitting}
						className="flex items-center px-4 py-2 bg-brand-primary text-white rounded-md hover:bg-brand-secondary-400 disabled:bg-gray-400"
					>
						<Save className="w-4 h-4 mr-2" />
						Save Changes
					</button>
				</form>
			</div>
		</div>
	);
}
