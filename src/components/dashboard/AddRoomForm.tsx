import React, { useState } from "react";
import { Plus } from "lucide-react";
import FormInput from "../FormInput";
import { supabase } from "../../lib/supabase";

interface AddRoomFormProps {
	studioId: string;
	onSuccess: () => void;
	onCancel: () => void;
}

export default function AddRoomForm({
	studioId,
	onSuccess,
	onCancel,
}: AddRoomFormProps) {
	const [name, setName] = useState("");
	const [description, setDescription] = useState("");
	const [address, setAddress] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);
		setIsSubmitting(true);

		try {
			const { error: insertError } = await supabase.from("locations").insert([
				{
					studio_id: studioId,
					name,
					description: description || null,
					address: address || null,
				},
			]);

			console.log(insertError);
			if (insertError) throw insertError;

			onSuccess();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to add room");
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-4">
			<FormInput
				id="name"
				type="text"
				label="Room Name *"
				value={name}
				onChange={(e) => setName(e.target.value)}
				required
			/>

			<FormInput
				id="description"
				type="text"
				label="Description"
				value={description}
				onChange={(e) => setDescription(e.target.value)}
			/>

			<FormInput
				id="address"
				type="text"
				label="Address/Location"
				value={address}
				onChange={(e) => setAddress(e.target.value)}
			/>

			{error && <p className="text-red-500 text-sm">{error}</p>}

			<div className="flex justify-end space-x-3">
				<button
					type="button"
					onClick={onCancel}
					className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
				>
					Cancel
				</button>
				<button
					type="submit"
					disabled={isSubmitting || !name.trim()}
					className="flex items-center px-4 py-2 bg-brand-primary text-white rounded-md hover:bg-brand-secondary-400 disabled:bg-gray-400"
				>
					<Plus className="w-4 h-4 mr-2" />
					Add Room
				</button>
			</div>
		</form>
	);
}
