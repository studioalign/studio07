import React, { useState } from "react";
import { Save } from "lucide-react";
import FormInput from "../FormInput";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";

interface AddPlanFormProps {
	onSuccess: () => void;
	onCancel: () => void;
}

export default function AddPlanForm({ onSuccess, onCancel }: AddPlanFormProps) {
	const { profile } = useAuth();
	const [name, setName] = useState("");
	const [description, setDescription] = useState("");
	const [amount, setAmount] = useState("");
	const [interval, setInterval] = useState<
		"weekly" | "monthly" | "term" | "annual"
	>("monthly");
	const [error, setError] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!profile?.studio?.id) return;

		setIsSubmitting(true);
		setError(null);

		try {
			// Validate amount
			const numericAmount = parseFloat(amount);
			if (isNaN(numericAmount) || numericAmount <= 0) {
				throw new Error("Please enter a valid amount");
			}

			const { error: insertError } = await supabase
				.from("pricing_plans")
				.insert([
					{
						studio_id: profile?.studio?.id,
						name,
						description: description || null,
						amount: numericAmount,
						interval,
					},
				]);

			if (insertError) throw insertError;
			onSuccess();
		} catch (err) {
			console.error("Error creating plan:", err);
			setError(err instanceof Error ? err.message : "Failed to create plan");
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-4">
			<FormInput
				id="name"
				type="text"
				label="Plan Name"
				value={name}
				onChange={(e) => setName(e.target.value)}
				required
			/>

			<div>
				<label
					htmlFor="description"
					className="block text-sm font-medium text-brand-secondary-400"
				>
					Description
				</label>
				<textarea
					id="description"
					value={description}
					onChange={(e) => setDescription(e.target.value)}
					rows={3}
					className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-accent focus:border-brand-accent"
				/>
			</div>

			<div className="grid grid-cols-2 gap-4">
				<FormInput
					id="amount"
					type="text"
					label="Amount"
					value={amount}
					onChange={(e) => {
						// Allow only numbers and decimal point
						const value = e.target.value.replace(/[^\d.]/g, "");
						// Ensure only one decimal point
						if ((value.match(/\./g) || []).length <= 1) {
							setAmount(value);
						}
					}}
					required
				/>

				<div>
					<label
						htmlFor="interval"
						className="block text-sm font-medium text-brand-secondary-400"
					>
						Billing Interval
					</label>
					<select
						id="interval"
						value={interval}
						onChange={(e) => setInterval(e.target.value as any)}
						className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-accent focus:border-brand-accent"
						required
					>
						<option value="weekly">Weekly</option>
						<option value="monthly">Monthly</option>
						<option value="term">Term</option>
						<option value="annual">Annual</option>
					</select>
				</div>
			</div>

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
					disabled={isSubmitting || !name.trim() || !amount.trim()}
					className="flex items-center px-4 py-2 bg-brand-primary text-white rounded-md hover:bg-brand-secondary-400 disabled:bg-gray-400"
				>
					<Save className="w-4 h-4 mr-2" />
					Create Plan
				</button>
			</div>
		</form>
	);
}
