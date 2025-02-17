import React, { useState } from "react";
import { UserPlus } from "lucide-react";
import FormInput from "./FormInput";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";

interface AddStudentFormProps {
	onSuccess: () => void;
	onCancel: () => void;
}

export default function AddStudentForm({
	onSuccess,
	onCancel,
}: AddStudentFormProps) {
	// Basic Information
	const { profile } = useAuth();
	const [name, setName] = useState("");
	const [dateOfBirth, setDateOfBirth] = useState("");
	const [gender, setGender] = useState("");

	// Emergency Contacts
	const [emergencyContacts, setEmergencyContacts] = useState([
		{ name: "", relationship: "", phone: "", email: "" },
	]);

	// Medical Information
	const [medicalConditions, setMedicalConditions] = useState("");
	const [allergies, setAllergies] = useState("");
	const [medications, setMedications] = useState("");
	const [doctorName, setDoctorName] = useState("");
	const [doctorPhone, setDoctorPhone] = useState("");

	// Consents
	const [photoConsent, setPhotoConsent] = useState(false);
	const [socialMediaConsent, setSocialMediaConsent] = useState(false);
	const [participationConsent, setParticipationConsent] = useState(false);

	const [error, setError] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const addEmergencyContact = () => {
		setEmergencyContacts([
			...emergencyContacts,
			{ name: "", relationship: "", phone: "", email: "" },
		]);
	};

	const updateEmergencyContact = (
		index: number,
		field: string,
		value: string
	) => {
		const updatedContacts = emergencyContacts.map((contact, i) => {
			if (i === index) {
				return { ...contact, [field]: value };
			}
			return contact;
		});
		setEmergencyContacts(updatedContacts);
	};

	const removeEmergencyContact = (index: number) => {
		if (emergencyContacts.length > 1) {
			setEmergencyContacts(emergencyContacts.filter((_, i) => i !== index));
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);
		setIsSubmitting(true);

		try {
			const { error } = await supabase
				.from("students")
				.insert([
					{
						name,
						date_of_birth: dateOfBirth,
						parent_id: profile?.id + "",
						studio_id: profile?.studio?.id + "",
					},
				])
				.select("*")
				.single();

			if (error) throw error;

			onSuccess();
		} catch (err) {
			console.log(err);
			setError(err instanceof Error ? err.message : "Failed to add student");
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-8">
			{/* Basic Information Section */}
			<div className="space-y-4">
				<h3 className="text-lg font-semibold text-brand-primary">
					Basic Information
				</h3>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<FormInput
						id="name"
						type="text"
						label="Student Name"
						value={name}
						onChange={(e) => setName(e.target.value)}
						required
					/>
					<FormInput
						id="dateOfBirth"
						type="date"
						label="Date of Birth"
						value={dateOfBirth}
						onChange={(e) => setDateOfBirth(e.target.value)}
						required
					/>
				</div>
				<div>
					<label className="block text-sm font-medium text-brand-secondary-400 mb-1">
						Gender
					</label>
					<select
						value={gender}
						onChange={(e) => setGender(e.target.value)}
						className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-accent focus:border-brand-accent"
						required
					>
						<option value="">Select gender</option>
						<option value="male">Male</option>
						<option value="female">Female</option>
						<option value="other">Other</option>
						<option value="prefer-not-to-say">Prefer not to say</option>
					</select>
				</div>
			</div>

			{/* Emergency Contacts Section */}
			<div className="space-y-4">
				<div className="flex justify-between items-center">
					<h3 className="text-lg font-semibold text-brand-primary">
						Emergency Contacts
					</h3>
					<button
						type="button"
						onClick={addEmergencyContact}
						className="text-sm text-brand-primary hover:text-brand-secondary-400"
					>
						+ Add another contact
					</button>
				</div>

				{emergencyContacts.map((contact, index) => (
					<div key={index} className="p-4 bg-gray-50 rounded-lg space-y-4">
						<div className="flex justify-between items-center">
							<h4 className="font-medium text-brand-secondary-400">
								Emergency Contact {index + 1}
							</h4>
							{index > 0 && (
								<button
									type="button"
									onClick={() => removeEmergencyContact(index)}
									className="text-sm text-red-500 hover:text-red-700"
								>
									Remove
								</button>
							)}
						</div>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<FormInput
								id={`contact-name-${index}`}
								type="text"
								label="Contact Name"
								value={contact.name}
								onChange={(e) =>
									updateEmergencyContact(index, "name", e.target.value)
								}
								required
							/>
							<FormInput
								id={`contact-relationship-${index}`}
								type="text"
								label="Relationship to Student"
								value={contact.relationship}
								onChange={(e) =>
									updateEmergencyContact(index, "relationship", e.target.value)
								}
								required
							/>
							<FormInput
								id={`contact-phone-${index}`}
								type="tel"
								label="Phone Number"
								value={contact.phone}
								onChange={(e) =>
									updateEmergencyContact(index, "phone", e.target.value)
								}
								required
							/>
							<FormInput
								id={`contact-email-${index}`}
								type="email"
								label="Email Address"
								value={contact.email}
								onChange={(e) =>
									updateEmergencyContact(index, "email", e.target.value)
								}
								required
							/>
						</div>
					</div>
				))}
			</div>

			{/* Medical Information Section */}
			<div className="space-y-4">
				<h3 className="text-lg font-semibold text-brand-primary">
					Medical Information
				</h3>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div className="md:col-span-2">
						<label className="block text-sm font-medium text-brand-secondary-400 mb-1">
							Medical Conditions
						</label>
						<textarea
							value={medicalConditions}
							onChange={(e) => setMedicalConditions(e.target.value)}
							rows={3}
							className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-accent focus:border-brand-accent"
							placeholder="Please list any medical conditions we should be aware of"
						/>
					</div>
					<div className="md:col-span-2">
						<label className="block text-sm font-medium text-brand-secondary-400 mb-1">
							Allergies
						</label>
						<textarea
							value={allergies}
							onChange={(e) => setAllergies(e.target.value)}
							rows={2}
							className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-accent focus:border-brand-accent"
							placeholder="Please list any allergies"
						/>
					</div>
					<div className="md:col-span-2">
						<label className="block text-sm font-medium text-brand-secondary-400 mb-1">
							Current Medications
						</label>
						<textarea
							value={medications}
							onChange={(e) => setMedications(e.target.value)}
							rows={2}
							className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-accent focus:border-brand-accent"
							placeholder="Please list any medications your child is currently taking"
						/>
					</div>
					<FormInput
						id="doctorName"
						type="text"
						label="Doctor's Name"
						value={doctorName}
						onChange={(e) => setDoctorName(e.target.value)}
					/>
					<FormInput
						id="doctorPhone"
						type="tel"
						label="Doctor's Phone"
						value={doctorPhone}
						onChange={(e) => setDoctorPhone(e.target.value)}
					/>
				</div>
			</div>

			{/* Consents Section */}
			<div className="space-y-4">
				<h3 className="text-lg font-semibold text-brand-primary">Consents</h3>
				<div className="space-y-4">
					<div className="flex items-start">
						<div className="flex items-center h-5">
							<input
								id="photoConsent"
								type="checkbox"
								checked={photoConsent}
								onChange={(e) => setPhotoConsent(e.target.checked)}
								className="h-4 w-4 text-brand-primary border-gray-300 rounded focus:ring-brand-accent"
							/>
						</div>
						<div className="ml-3">
							<label htmlFor="photoConsent" className="text-sm text-gray-700">
								I consent to photographs being taken of my child during classes
								and performances
							</label>
						</div>
					</div>

					<div className="flex items-start">
						<div className="flex items-center h-5">
							<input
								id="socialMediaConsent"
								type="checkbox"
								checked={socialMediaConsent}
								onChange={(e) => setSocialMediaConsent(e.target.checked)}
								className="h-4 w-4 text-brand-primary border-gray-300 rounded focus:ring-brand-accent"
							/>
						</div>
						<div className="ml-3">
							<label
								htmlFor="socialMediaConsent"
								className="text-sm text-gray-700"
							>
								I consent to photographs of my child being used on the studio's
								social media accounts
							</label>
						</div>
					</div>

					<div className="flex items-start">
						<div className="flex items-center h-5">
							<input
								id="participationConsent"
								type="checkbox"
								checked={participationConsent}
								onChange={(e) => setParticipationConsent(e.target.checked)}
								className="h-4 w-4 text-brand-primary border-gray-300 rounded focus:ring-brand-accent"
								required
							/>
						</div>
						<div className="ml-3">
							<label
								htmlFor="participationConsent"
								className="text-sm text-gray-700"
							>
								I confirm that my child is physically fit to participate in
								dance classes and I will inform the studio of any changes to
								their health condition
							</label>
							<p className="mt-1 text-xs text-gray-500">
								This consent is required
							</p>
						</div>
					</div>
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
					disabled={isSubmitting || !participationConsent}
					className="flex items-center px-4 py-2 bg-brand-primary text-white rounded-md hover:bg-brand-secondary-400 disabled:bg-gray-400"
				>
					<UserPlus className="w-4 h-4 mr-2" />
					Add Student
				</button>
			</div>
		</form>
	);
}
