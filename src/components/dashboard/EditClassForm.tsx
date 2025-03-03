import React, { useState, useEffect } from "react";
import { Save } from "lucide-react";
import FormInput from "../FormInput";
import SearchableDropdown from "../SearchableDropdown";
import MultiSelectDropdown from "../MultiSelectDropdown";
import { supabase } from "../../lib/supabase";
import { useData } from "../../contexts/DataContext";
import { useAuth } from "../../contexts/AuthContext";
import { notificationService } from "../../services/notificationService";

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
	const [selectedStudents, setSelectedStudents] = useState<{ id: string; label: string }[]>([]);
    const [previouslyEnrolledStudentIds, setPreviouslyEnrolledStudentIds] = useState<string[]>([]);
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
                    const currentEnrolledStudents = enrolledData
                        .map((enrollment) => {
                            if (!enrollment.student) return null;
                            return {
                                id: enrollment.student.id,
                                label: enrollment.student.name,
                            };
                        })
                        .filter(
                            (item): item is { id: string; label: string } => item !== null
                        );
                        
					setSelectedStudents(currentEnrolledStudents);
                    
                    // Store the IDs of previously enrolled students for comparison later
                    setPreviouslyEnrolledStudentIds(
                        currentEnrolledStudents.map(student => student.id)
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

	// Modify your EditClassForm.tsx handleSubmit function:

	const handleSubmit = async () => {
		setError(null);
		setIsSubmitting(true);

		try {
			const studioId = profile?.studio?.id;
			if (!studioId) throw new Error("Studio ID is required");

			// Check what has changed from the original class data
			const scheduleChanged = 
				startTime !== classData.start_time || 
				endTime !== classData.end_time;
				
			const teacherChanged = 
				selectedTeacher?.id !== classData.teacher.id;
				
			const roomChanged = 
				selectedRoom?.id !== classData.location.id;
				
			// Get the currently selected student IDs for comparison
			const currentStudentIds = selectedStudents.map(student => student.id);
			
			// Find added and removed students
			const addedStudentIds = currentStudentIds.filter(
				id => !previouslyEnrolledStudentIds.includes(id)
			);
			
			const removedStudentIds = previouslyEnrolledStudentIds.filter(
				id => !currentStudentIds.includes(id)
			);

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
			// Replace the student enrollment section in EditClassForm.tsx with this:

			// Update student enrollments for this instance
			if (!isRecurring || classData.modificationScope === "single") {
				try {
					// First get the currently enrolled students to compare with the new selection
					const { data: currentEnrollments, error: fetchError } = await supabase
						.from("class_students")
						.select("student_id")
						.eq("class_id", classData.id);
						
					if (fetchError) throw fetchError;
					
					// Get the list of currently enrolled student IDs
					const currentStudentIds = currentEnrollments?.map(e => e.student_id) || [];
					
					// Get the list of student IDs we want to have enrolled after the update
					const targetStudentIds = selectedStudents.map(s => s.id);
					
					// Find students to add (in target but not in current)
					const studentsToAdd = targetStudentIds.filter(id => !currentStudentIds.includes(id));
					
					// Find students to remove (in current but not in target)
					const studentsToRemove = currentStudentIds.filter(id => !targetStudentIds.includes(id));
					
					// For students to remove, check if they have attendance records
					if (studentsToRemove.length > 0) {
						// For each student to remove, first check if they have attendance records
						for (const studentId of studentsToRemove) {
							// Check if student has attendance for this class
							const { data: attendanceData, error: attendanceError } = await supabase
								.from("attendance")
								.select("id")
								.eq("class_id", classData.id)
								.eq("student_id", studentId)
								.limit(1);
								
							if (attendanceError) throw attendanceError;
							
							// If no attendance records, safe to remove
							if (!attendanceData || attendanceData.length === 0) {
								const { error: deleteError } = await supabase
									.from("class_students")
									.delete()
									.eq("class_id", classData.id)
									.eq("student_id", studentId);
									
								if (deleteError) throw deleteError;
							} else {
								// Student has attendance records, can't remove
								console.warn(`Student ${studentId} has attendance records and cannot be removed from the class.`);
								
								// Add this student back to selectedStudents so they appear in the UI
								const studentToKeep = students.find(s => s.id === studentId);
								if (studentToKeep) {
									// Only add if not already in the list
									if (!selectedStudents.some(s => s.id === studentId)) {
										setSelectedStudents(prev => [
											...prev, 
											{ id: studentToKeep.id, label: studentToKeep.name }
										]);
									}
								}
							}
						}
					}
					
					// Add new students
					if (studentsToAdd.length > 0) {
						for (const studentId of studentsToAdd) {
							try {
								const { error: enrollError } = await supabase
									.from("class_students")
									.insert({
										class_id: classData.id,
										student_id: studentId,
									});
									
								if (enrollError) {
									// If it's a duplicate key error, just log and continue
									if (enrollError.code === '23505') {
										console.warn(`Student ${studentId} already enrolled in this class, skipping...`);
									} else {
										throw enrollError;
									}
								}
							} catch (enrollErr) {
								console.error(`Error enrolling student ${studentId}:`, enrollErr);
								// Continue with next student instead of failing the whole operation
							}
						}
					}
				} catch (enrollmentError) {
					console.error("Error updating enrollments:", enrollmentError);
					throw new Error(`Failed to update student enrollments: ${enrollmentError.message}`);
				}
			}

			// Call success first before any notification attempts
			onSuccess();

			// Send notifications in the background without blocking the form submission
			// This prevents notification failures from affecting the main functionality
			try {
				// 1. If schedule changed, notify all relevant parties
				if (scheduleChanged || roomChanged) {
					const changes = {
						oldStartTime: classData.start_time,
						newStartTime: startTime,
						oldEndTime: classData.end_time,
						newEndTime: endTime,
						oldRoom: classData.location.name,
						newRoom: selectedRoom?.label || "",
					};
					
					// Notify about schedule change
					notificationService.notifyClassScheduleChange(
						studioId,
						name,
						classData.id,
						changes
					).catch(err => console.error("Schedule notification failed:", err));
					
					console.log("Schedule change notification initiated");
				}
				
				// 2. If teacher changed, notify the new teacher
				if (teacherChanged && selectedTeacher) {
					const scheduleDetails = {
						startTime,
						endTime,
						date: classData.date,
						location: selectedRoom?.label || ""
					};
					
					notificationService.notifyClassAssigned(
						selectedTeacher.id,
						studioId,
						name,
						classData.id,
						scheduleDetails
					).catch(err => console.error("Teacher notification failed:", err));
					
					console.log("New teacher notification initiated");
				}
				
				// 3. If students were added, notify the teacher about each new student
				if (addedStudentIds.length > 0 && selectedTeacher) {
					for (const studentId of addedStudentIds) {
						const student = selectedStudents.find(s => s.id === studentId);
						if (student) {
							notificationService.notifyStudentAddedToClass(
								studioId,
								selectedTeacher.id,
								student.label,
								student.id,
								name,
								classData.id
							).catch(err => console.error("Student add notification failed:", err));
						}
					}
					console.log(`${addedStudentIds.length} new student notifications initiated`);
				}
				
				// 4. If students were removed, notify the teacher about each removed student
				if (removedStudentIds.length > 0 && selectedTeacher) {
					for (const studentId of removedStudentIds) {
						// Look up student name from your students array
						const student = students.find(s => s.id === studentId);
						if (student) {
							notificationService.notifyStudentRemovedFromClass(
								studioId,
								selectedTeacher.id,
								student.name,
								student.id,
								name,
								classData.id
							).catch(err => console.error("Student remove notification failed:", err));
						}
					}
					console.log(`${removedStudentIds.length} removed student notifications initiated`);
				}
			} catch (notificationErr) {
				console.error("Error initiating notifications:", notificationErr);
				// Notifications failed but form submission succeeded
			}
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