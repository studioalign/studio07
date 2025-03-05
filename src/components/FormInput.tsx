import React from "react";

interface FormInputProps {
	id: string;
	type: "email" | "password" | "text" | "time" | "date" | "number";
	label: string;
	value: string;
	onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
	required?: boolean;
	min?: string;
	max?: string;
	step?: string;
	maxLength?: number;
}

export default function FormInput({
	id,
	type,
	label,
	value,
	onChange,
	required = false,
	min,
	max,
	step,
	maxLength,
}: FormInputProps) {
	return (
		<div>
			<label
				htmlFor={id}
				className="block text-sm font-medium text-brand-secondary-400"
			>
				{label}
			</label>
			<input
				id={id}
				type={type}
				required={required}
				value={value}
				onChange={onChange}
				min={min}
				max={max}
				step={step}
				maxLength={maxLength}
				className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-accent focus:border-brand-accent"
			/>
		</div>
	);
}
