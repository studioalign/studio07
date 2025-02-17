import React, { useState, useEffect } from "react";
import { Save } from "lucide-react";
import FormInput from "../FormInput";
import SearchableDropdown from "../SearchableDropdown";
import MultiSelectDropdown from "../MultiSelectDropdown";
import { supabase } from "../../lib/supabase";
import { useData } from "../../contexts/DataContext";
import { useAuth } from "../../contexts/AuthContext";

interface Student {
	id: string;
	name: string;
}

interface ClassData {
	id: string;
	name: string;
	status: string;
	date: string;
	end_date: string;
	start_time: string;
	end_time: string;
	teacher: {
		id: string;
		name: string;
	};
	location: {
		id: string;
		name: string;
	};
	studio: {
		id: string;
		name: string;
	};
	parent_class_id: string | null;
	notes: string | null;
	is_drop_in: boolean;
	capacity: number | null;
	drop_in_price: number | null;
	is_recurring: boolean | null;
	enrolledStudents?: string[];
	modificationScope: "single" | "future" | "all";
}

interface EditClassFormProps {
	classData: ClassData;
	onSuccess: () => void;
	onCancel: () => void;
}

export default function EditClassForm({
	classData,
	onSuccess,
	onCancel,
}: EditClassFormProps) {
	const { teachers, locations } = useData();
	const { profile } = useAuth();
	const [students, setStudents] = useState<Student[]>([]);
	const [selectedStudents, setSelectedStudents] = useState<
		{ id: string; label: string }[]
	>([]);
	const [loadingStudents, setLoadingStudents] = useState(true);
	const [name, setName] = useState(classData.name);
	const [selectedRoom, setSelectedRoom] = useState<{
		id: string;
		label: string;
	} | null>(
		locations.find((loc) => loc.id === classData.location.id)
			? {
					id: classData.location.id,
					label: locations.find((loc) => loc.id === classData.location.id)!
						.name,
			  }
			: null
	);
	const [selectedTeacher, setSelectedTeacher] = useState<{
		id: string;
		label: string;
	} | null>(
		teachers.find((t) => t.id === classData.teacher.id)
			? {
					id: classData.teacher.id,
					label: teachers.find((t) => t.id === classData.teacher.id)!.name,
			  }
			: null
	);
	const [startTime, setStartTime] = useState(classData.start_time);
	const [endTime, setEndTime] = useState(classData.end_time);
	const [isRecurring] = useState(classData.is_recurring);
	const [isDropIn, setIsDropIn] = useState(classData.is_drop_in);
	const [capacity, setCapacity] = useState(
		classData.capacity?.toString() || ""
	);
	const [dropInPrice, setDropInPrice] = useState(
		classData.drop_in_price?.toString() || ""
	);
	const [error, setError] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);

	useEffect(() => {
		const studioId = profile?.studio?.id;
		if (!studioId || !classData?.id) return;

		async function fetchData() {
			try {
				// Fetch all students in the studio
				const { data: studentsData, error: studentsError } = await supabase
					.from("students")
					.select("id, name")
					.eq("studio_id", studioId || "")
					.order("name");

				if (studentsError) throw studentsError;
				setStudents(studentsData || []);

				// Fetch enrolled students for this class
				const { data: enrolledData, error: enrolledError } = await supabase
					.from("class_students")
					.select("student:students(id, name)")
					.eq("class_id", classData.id);

				if (enrolledError) throw enrolledError;

				if (enrolledData) {
					setSelectedStudents(
						enrolledData
							.map((enrollment) => {
								if (!enrollment.student) return null;
								return {
									id: enrollment.student.id,
									label: enrollment.student.name,
								};
							})
							.filter(
								(item): item is { id: string; label: string } => item !== null
							)
					);
				}
			} catch (err) {
				console.error("Error fetching data:", err);
			} finally {
				setLoadingStudents(false);
			}
		}

		fetchData();
	}, [profile?.studio?.id, classData?.id]);

	const handleSubmit = async () => {
		setError(null);
		setIsSubmitting(true);

		try {
			const studioId = profile?.studio?.id;
			if (!studioId) throw new Error("Studio ID is required");

			const updates = {
				name,
				teacher_id: selectedTeacher?.id || "",
				location_id: selectedRoom?.id || "",
				start_time: startTime,
				end_time: endTime,
				is_drop_in: isDropIn,
				capacity: isDropIn ? parseInt(capacity) : null,
				drop_in_price: isDropIn ? parseFloat(dropInPrice) : null,
			};

			// update this instance
			await supabase.from("classes").update(updates).eq("id", classData.id);
			if (classData.modificationScope === "future") {
				// For "future" scope, all future instances
				await supabase
					.from("classes")
					.update(updates)
					.eq("parent_class_id", classData.parent_class_id || classData.id)
					.gte("date", classData.date);
			}
			// For "all" scope, update all instances
			if (classData.modificationScope === "all") {
				await supabase
					.from("classes")
					.update(updates)
					.eq("parent_class_id", classData.parent_class_id || classData.id);

				if (classData.parent_class_id) {
					await supabase
						.from("classes")
						.update(updates)
						.eq("id", classData.parent_class_id);
				}
			}
			// Update student enrollments for this instance
			if (!isRecurring || classData.modificationScope === "single") {
				// Remove existing enrollments
				await supabase
					.from("class_students")
					.delete()
					.eq("class_id", classData.id);

				// Add new enrollments
				if (selectedStudents.length > 0) {
					const { error: enrollError } = await supabase
						.from("class_students")
						.insert(
							selectedStudents.map((student) => ({
								class_id: classData.id,
								student_id: student.id,
							}))
						);

					if (enrollError) throw enrollError;
				}
			}

			onSuccess();
		} catch (err) {
			console.error("Error saving class:", err);
			setError(err instanceof Error ? err.message : "Failed to save class");
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<form className="space-y-4">
			<FormInput
				id="name"
				type="text"
				label="Class Name"
				value={name}
				onChange={(e) => setName(e.target.value)}
				required
			/>

			<SearchableDropdown
				id="teacher"
				label="Select Teacher"
				value={selectedTeacher}
				onChange={setSelectedTeacher}
				options={teachers.map((teacher) => ({
					id: teacher.id,
					label: teacher.name,
				}))}
			/>

			<SearchableDropdown
				id="room"
				label="Select Room"
				value={selectedRoom}
				onChange={setSelectedRoom}
				options={locations.map((location) => ({
					id: location.id,
					label: location.name,
				}))}
			/>

			<div className="grid grid-cols-2 gap-4">
				<FormInput
					id="startTime"
					type="time"
					label="Start Time"
					value={startTime}
					onChange={(e) => setStartTime(e.target.value)}
					required
				/>
				<FormInput
					id="endTime"
					type="time"
					label="End Time"
					value={endTime}
					onChange={(e) => setEndTime(e.target.value)}
					required
				/>
			</div>

			{/* Drop-in Class Options */}
			<div className="space-y-4">
				<div className="flex items-center space-x-2">
					<input
						type="checkbox"
						id="isDropIn"
						checked={isDropIn}
						onChange={(e) => setIsDropIn(e.target.checked)}
						className="h-4 w-4 text-brand-primary border-gray-300 rounded focus:ring-brand-accent"
					/>
					<label
						htmlFor="isDropIn"
						className="text-sm font-medium text-gray-700"
					>
						This is a drop-in class
					</label>
				</div>

				{isDropIn && (
					<div className="grid grid-cols-2 gap-4 pl-6">
						<FormInput
							id="capacity"
							type="number"
							label="Class Capacity"
							value={capacity}
							onChange={(e) => setCapacity(e.target.value)}
							min="1"
							required={isDropIn}
						/>
						<FormInput
							id="dropInPrice"
							type="number"
							label="Drop-in Price"
							value={dropInPrice}
							onChange={(e) => setDropInPrice(e.target.value)}
							min="0"
							step="0.01"
							required={isDropIn}
						/>
					</div>
				)}
			</div>

			{!isDropIn && (
				<MultiSelectDropdown
					id="students"
					label="Select Students"
					value={selectedStudents}
					onChange={setSelectedStudents}
					options={students.map((student) => ({
						id: student.id,
						label: student.name,
					}))}
					isLoading={loadingStudents}
				/>
			)}

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
					type="button"
					onClick={handleSubmit}
					disabled={isSubmitting}
					className="flex items-center px-4 py-2 bg-brand-primary text-white rounded-md hover:bg-brand-secondary-400 disabled:bg-gray-400"
				>
					<Save className="w-4 h-4 mr-2" />
					Save Changes
				</button>
			</div>
		</form>
	);
}
