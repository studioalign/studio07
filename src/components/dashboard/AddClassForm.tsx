import React, { useState } from "react";
import { Plus } from "lucide-react";
import FormInput from "../FormInput";
import SearchableDropdown from "../SearchableDropdown";
import { useData } from "../../contexts/DataContext";
import MultiSelectDropdown from "../MultiSelectDropdown";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { notificationService } from "../../services/notificationService";

interface Student {
	id: string;
	name: string;
}

interface AddClassFormProps {
	onSuccess: () => void;
	onCancel: () => void;
}

export default function AddClassForm({
	onSuccess,
	onCancel,
}: AddClassFormProps) {
	const { teachers, locations } = useData();
	const { profile } = useAuth();
	const [students, setStudents] = useState<Student[]>([]);
	const [loadingStudents, setLoadingStudents] = useState(true);
	const [name, setName] = useState("");
	const [selectedTeacher, setSelectedTeacher] = useState<{
		id: string;
		label: string;
	} | null>(null);
	const [selectedRoom, setSelectedRoom] = useState<{
		id: string;
		label: string;
	} | null>(null);
	const [startTime, setStartTime] = useState("");
	const [endTime, setEndTime] = useState("");
	const [isRecurring, setIsRecurring] = useState(true);
	const [dayOfWeek, setDayOfWeek] = useState<string>("");
	const [date, setDate] = useState("");
	const [endDate, setEndDate] = useState("");
	const [isDropIn, setIsDropIn] = useState(false);
	const [capacity, setCapacity] = useState("");
	const [dropInPrice, setDropInPrice] = useState("");
	const [selectedStudents, setSelectedStudents] = useState<{ id: string; label: string }[]>([]);	
	const [error, setError] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);

	// Fetch students when component mounts
	React.useEffect(() => {
		async function fetchStudents() {
			if (!profile?.studio?.id) return;

			try {
				const { data, error: fetchError } = await supabase
					.from("students")
					.select("id, name")
					.eq("studio_id", profile?.studio.id)
					.order("name");

				if (fetchError) throw fetchError;
				setStudents(data || []);
			} catch (err) {
				console.error("Error fetching students:", err);
			} finally {
				setLoadingStudents(false);
			}
		}

		fetchStudents();
	}, [profile?.studio?.id]);

	// Modify your AddClassForm.tsx handleSubmit function:

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!profile?.studio?.id) return;

		setError(null);
		setIsSubmitting(true);

		try {
			// Validate inputs
			if (
				!name ||
				!selectedTeacher ||
				!startTime ||
				!endTime ||
				!selectedRoom
			) {
				throw new Error("Please fill in all required fields");
			}

			if (isRecurring && !dayOfWeek) {
				throw new Error(
					"Please select a day of the week for recurring classes"
				);
			}

			if (!isRecurring && !date) {
				throw new Error("Please select a date for one-off classes");
			}

			if (isRecurring && !endDate) {
				throw new Error("Please select an end date for recurring classes");
			}

			let classIds: string[] = [];

			// Validate based on class type (recurring vs non-recurring)
			if (!isRecurring) {
				if (!date) {
					throw new Error("Date is required for non-recurring classes");
				}

				// Insert single class
				const { data, error: classError } = await supabase
					.from("classes")
					.insert([
						{
							studio_id: profile.studio.id || "",
							name,
							teacher_id: selectedTeacher.id,
							start_time: startTime,
							end_time: endTime,
							date,
							end_date: date, // For non-recurring, end_date equals date
							location_id: selectedRoom.id,
							is_drop_in: isDropIn,
							capacity: isDropIn ? parseInt(capacity) : null,
							drop_in_price: isDropIn ? parseFloat(dropInPrice) : null,
							is_recurring: false,
						},
					])
					.select("id");

				if (classError) throw classError;
				classIds = data?.map((classData) => classData.id) || [];
			} else {
				if (!dayOfWeek) {
					throw new Error("Day of week is required for recurring classes");
				}

				if (!endDate) {
					throw new Error("End date is required for recurring classes");
				}

				// First, create a parent class entry
				const { data: parentClass, error: parentClassError } = await supabase
					.from("classes")
					.insert([
						{
							studio_id: profile?.studio?.id || "",
							name,
							teacher_id: selectedTeacher.id,
							start_time: startTime,
							end_time: endTime,
							date: date ? new Date(date).toISOString().split("T")[0] : null,
							end_date: new Date(endDate).toISOString().split("T")[0],
							location_id: selectedRoom.id,
							is_drop_in: isDropIn,
							capacity: isDropIn ? parseInt(capacity) : null,
							drop_in_price: isDropIn ? parseFloat(dropInPrice) : null,
							is_recurring: true,
						},
					])
					.select("id")
					.single();

				if (parentClassError) throw parentClassError;

				// Generate dates for recurring classes
				const dates = [];
				const currentDate = new Date();
				const daysDiff = (parseInt(dayOfWeek) - currentDate.getDay() + 7) % 7;
				currentDate.setDate(currentDate.getDate() + daysDiff);

				// Generate weekly dates
				while (currentDate <= new Date(endDate)) {
					dates.push(new Date(currentDate));
					currentDate.setDate(currentDate.getDate() + 7);
				}

				// Insert all class instances with reference to parent
				const { data, error: classError } = await supabase
					.from("classes")
					.insert(
						dates.map((classDate) => ({
							studio_id: profile?.studio?.id || "",
							name,
							teacher_id: selectedTeacher.id,
							start_time: startTime,
							end_time: endTime,
							date: classDate.toISOString().split("T")[0],
							end_date: classDate.toISOString().split("T")[0],
							location_id: selectedRoom.id,
							is_drop_in: isDropIn,
							capacity: isDropIn ? parseInt(capacity) : null,
							drop_in_price: isDropIn ? parseFloat(dropInPrice) : null,
							parent_class_id: parentClass?.id,
							is_recurring: true,
						}))
					)
					.select("id");

				if (classError) throw classError;
				classIds = data?.map((classData) => classData.id) || [];
			}

			// Add students to the class if any are selected
			if (selectedStudents.length > 0 && classIds.length > 0) {
				for (const classId of classIds) {
					const { error: studentsError } = await supabase
						.from("class_students")
						.insert(
							selectedStudents.map((student) => ({
								class_id: classId,
								student_id: student.id,
							}))
						);
					if (studentsError) throw studentsError;
				}
			}

			// Class creation successful - call success first
			onSuccess();

			// Send notifications in the background
			if (classIds.length > 0) {
				// Don't await these notifications - let them happen in the background
				setTimeout(() => {
					try {
						// 1. Notify the teacher about the assigned class
						const formattedStartTime = new Date(`2000-01-01T${startTime}`).toLocaleTimeString([], {
							hour: '2-digit',
							minute: '2-digit'
						});
						
						const scheduleDetails = {
							startTime,
							endTime,
							dayOfWeek: isRecurring ? dayOfWeek : null,
							date: !isRecurring ? date : null,
							endDate: isRecurring ? endDate : null,
							isRecurring,
							location: selectedRoom?.label
						};
						
						// Send notification to teacher about class assignment
						notificationService.notifyClassAssigned(
							selectedTeacher.id,
							profile.studio.id,
							name,
							classIds[0], // Use the first class ID
							scheduleDetails
						).catch(err => console.error("Teacher notification failed:", err));
						
						console.log("Teacher notification initiated for class assignment");

						// 2. If students were added, notify the teacher about each student
						if (selectedStudents.length > 0) {
							for (const student of selectedStudents) {
								notificationService.notifyStudentAddedToClass(
									profile.studio.id,
									selectedTeacher.id,
									student.label,
									student.id,
									name,
									classIds[0] // Use the first class ID
								).catch(err => console.error("Student notification failed:", err));
							}
							console.log(`${selectedStudents.length} student notifications initiated`);
						}
					} catch (notificationErr) {
						console.error("Error initiating notifications:", notificationErr);
						// Notifications failed but class creation succeeded
					}
				}, 100);
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to create class");
		} finally {
			setIsSubmitting(false);
		}
	};
	return (
		<form onSubmit={handleSubmit} className="space-y-4">
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
				required
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
				required
				onChange={setSelectedRoom}
				options={locations.map((location) => ({
					id: location.id,
					label: location.address
						? `${location.name} (${location.address})`
						: location.name,
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

			<div className="flex items-center space-x-4">
				<label className="flex items-center">
					<input
						type="checkbox"
						checked={isRecurring}
						onChange={(e) => setIsRecurring(e.target.checked)}
						className="rounded border-gray-300 text-brand-primary focus:ring-brand-accent"
					/>
					<span className="ml-2 text-sm text-gray-700">
						Recurring weekly class
					</span>
				</label>
			</div>

			{isRecurring ? (
				<select
					value={dayOfWeek}
					onChange={(e) => setDayOfWeek(e.target.value)}
					className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-accent focus:border-brand-accent"
					required
				>
					<option value="">Select day of week</option>
					<option value="0">Sunday</option>
					<option value="1">Monday</option>
					<option value="2">Tuesday</option>
					<option value="3">Wednesday</option>
					<option value="4">Thursday</option>
					<option value="5">Friday</option>
					<option value="6">Saturday</option>
				</select>
			) : (
				<FormInput
					id="date"
					type="date"
					label="Class Date"
					value={date}
					onChange={(e) => setDate(e.target.value)}
					required
				/>
			)}

			{isRecurring && (
				<FormInput
					id="endDate"
					type="date"
					label="End Date"
					value={endDate}
					onChange={(e) => setEndDate(e.target.value)}
					required
				/>
			)}

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
					type="submit"
					disabled={isSubmitting}
					className="flex items-center px-4 py-2 bg-brand-primary text-white rounded-md hover:bg-brand-secondary-400 disabled:bg-gray-400"
				>
					<Plus className="w-4 h-4 mr-2" />
					Add Class
				</button>
			</div>
		</form>
	);
}