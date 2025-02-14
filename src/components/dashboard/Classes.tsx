import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Plus, Edit2, Trash2, X } from "lucide-react";
import WeeklyCalendar from "./WeeklyCalendar";
import AddClassForm from "./AddClassForm";
import EditClassForm from "./EditClassForm";
import BookDropInModal from "./BookDropInModal";
import AttendanceModal from "./AttendanceModal";
import RecurringClassModal from "./RecurringClassModal";
import { supabase } from "../../lib/supabase";
import { useData } from "../../contexts/DataContext";
import { useAuth } from "../../contexts/AuthContext";
import { useLocalization } from "../../contexts/LocalizationContext";
import { getEnrolledStudents } from "../../utils/classUtils";
import { addDays, format } from "date-fns";

interface ClassInstance {
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

export default function Classes() {
	const [showAddForm, setShowAddForm] = useState(false);
	const [editingClass, setEditingClass] = useState<ClassInstance | null>(null);
	const [selectedClass, setSelectedClass] = useState<ClassInstance | null>(
		null
	);
	const [modifyingClass, setModifyingClass] = useState<{
		class: ClassInstance;
		action: "edit" | "delete";
	} | null>(null);
	const [pendingChanges, setPendingChanges] = useState<any>(null);
	const [bookingClass, setBookingClass] = useState<ClassInstance | null>(null);
	const [classInstances, setClassInstances] = useState<ClassInstance[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [queryInProgress, setQueryInProgress] = useState(false);
	const { isLoading: dataLoading, initialized } = useData();
	const { profile } = useAuth();
	const { timezone } = useLocalization();

	const fetchClassInstances = useCallback(async () => {
		try {
			setQueryInProgress(true);

			let query = supabase.from("classes").select(`
				id,
				name,
				status,
				date,
				end_date,
				start_time,
				end_time,
				is_recurring,
				parent_class_id,
				notes,
				is_drop_in,
				capacity,
				drop_in_price,
				studio:studios (
					id,
					name
				),
				teacher:users (
					id,
					name
				),
				location:locations (
					id,
					name
				)
			`);

			if (profile?.role === "parent") {
				// For parents, filter by their studio but ensure we get all class details
				query = query
					.eq("studio_id", profile?.studio?.id || "")
					.order("date", { ascending: true });
			}

			const { data, error } = await query.order("date", { ascending: true });

			if (error) throw error;

			// For parent users, fetch enrolled students for each class
			if (profile?.role === "parent") {
				const instancesWithEnrollments = await Promise.all(
					data.map(async (instance) => {
						const students = await getEnrolledStudents(
							instance.id,
							profile?.id
						);
						return {
							...instance,
							enrolledStudents: students.map((s) => s.name),
						};
					})
				);
				setClassInstances(instancesWithEnrollments);
			} else {
				setClassInstances(data);
			}
		} catch (err) {
			console.error("Error fetching class_instances:", err);
			setError(err instanceof Error ? err.message : "Failed to fetch classes");
		} finally {
			setQueryInProgress(false);
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchClassInstances();
	}, []);

	// **Handle Delete Operations**

	const handleDelete = async (classItem: ClassInstance) => {
		if (classItem.is_recurring) {
			setModifyingClass({ class: classItem, action: "delete" });
		} else if (window.confirm("Are you sure you want to delete this class?")) {
			await deleteClass(classItem.id);
		}
	};

	const deleteClass = async (classId: string) => {
		try {
			const { error: deleteError } = await supabase
				.from("classes")
				.delete()
				.eq("id", classId);

			if (deleteError) throw deleteError;

			// **Update Local State**
			setClassInstances((prevClasses) =>
				prevClasses.filter((c) => c.id !== classId)
			);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to delete class");
		}
	};

	// **Handle Edit Operations**

	const handleEdit = (classItem: ClassInstance) => {
		if (classItem.is_recurring) {
			// Avoid setting state if the same class is already being modified
			if (
				modifyingClass?.class.id !== classItem.id ||
				modifyingClass?.action !== "edit"
			) {
				setModifyingClass({
					class: classItem,
					action: "edit",
				});
			}
		} else {
			// Avoid setting state if the same class is already being edited
			if (editingClass?.id !== classItem.id) {
				setEditingClass(classItem);
			}
		}
	};

	const handleSaveChanges = (classItem: ClassInstance, changes: any) => {
		if (classItem.is_recurring) {
			setPendingChanges(changes);
			setModifyingClass({
				class: classItem,
				action: "edit",
			});
		} else {
			// **For Non-Recurring Classes, Save Directly**
			setEditingClass(classItem);
		}
	};

	const handleModifyConfirm = async (scope: "single" | "future" | "all") => {
		if (!modifyingClass) return;

		const { class: classItem, action } = modifyingClass;

		try {
			if (action === "delete") {
				// Handle delete logic
				if (scope === "single") {
					// Delete only the selected instance
					const { error } = await supabase
						.from("classes")
						.delete()
						.eq("id", classItem.id);

					if (error) throw error;
				} else if (scope === "future") {
					// Delete this and future instances
					const { error } = await supabase
						.from("classes")
						.delete()
						.eq("id", classItem.id)
						.gte("date", classItem.date);

					if (error) throw error;
				} else if (scope === "all") {
					// Delete all instances
					const { error } = await supabase
						.from("classes")
						.delete()
						.eq("id", classItem.id);

					if (error) throw error;
				}
			} else if (action === "edit") {
				// Handle edit logic
				if (scope === "single") {
					// Update only the selected instance
					setEditingClass({ ...classItem, modificationScope: "single" });
				} else if (scope === "future") {
					// Update this and future instances
					setEditingClass({ ...classItem, modificationScope: "future" });
				} else if (scope === "all") {
					// Update all instances
					setEditingClass({ ...classItem, modificationScope: "all" });
				}
			}

			// Refresh class instances after modification
			fetchClassInstances();
		} catch (err) {
			console.error(`Error handling ${scope} ${action}:`, err);
			setError(
				err instanceof Error
					? err.message
					: `Failed to ${action} ${scope} instances`
			);
		} finally {
			setModifyingClass(null);
		}
	};

	// **Utility Functions for Formatting**

	const formatSchedule = (classItem: ClassInstance) => {
		const timeStr = `${formatTime(classItem.start_time)} - ${formatTime(
			classItem.end_time
		)}`;
		if (classItem.is_recurring) {
			const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
			return `${days[new Date(classItem.date).getDay()]} ${timeStr}`;
		}
		return `${new Date(classItem.date).toLocaleDateString()} ${timeStr}`;
	};

	const formatTime = (time: string) => {
		return new Date(`2000-01-01T${time}`).toLocaleTimeString([], {
			hour: "numeric",
			minute: "2-digit",
			timeZone: timezone,
		});
	};

	// **Conditional Rendering Based on Loading and Error States**

	if (loading || dataLoading) {
		return (
			<div>
				<div className="flex justify-between items-center mb-6">
					<h1 className="text-2xl font-bold text-brand-primary">Classes</h1>
					<div className="w-32 h-10 bg-gray-200 rounded-md animate-pulse" />
				</div>
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					{[1, 2, 3].map((i) => (
						<div
							key={i}
							className="bg-white rounded-lg shadow p-6 animate-pulse"
						>
							<div className="h-6 bg-gray-200 rounded w-3/4 mb-4" />
							<div className="space-y-3">
								<div className="h-4 bg-gray-200 rounded w-full" />
								<div className="h-4 bg-gray-200 rounded w-2/3" />
							</div>
						</div>
					))}
				</div>
			</div>
		);
	}

	if (error) {
		return <div className="text-red-500">Error: {error}</div>;
	}

	// **Main Render Function**

	return (
		<div>
			{/* **Header Section** */}
			<div className="flex justify-between items-center mb-6">
				<h1 className="text-2xl font-bold text-brand-primary">Classes</h1>
				{profile?.role === "owner" && (
					<button
						onClick={() => setShowAddForm(true)}
						className="flex items-center px-4 py-2 bg-brand-primary text-white rounded-md hover:bg-brand-secondary-400"
					>
						<Plus className="w-5 h-5 mr-2" />
						Add Class
					</button>
				)}
			</div>

			{/* **Add Class Form Modal** */}
			{showAddForm && (
				<>
					<div
						className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
						onClick={() => setShowAddForm(false)}
					/>
					<div className="fixed inset-y-0 right-0 w-full md:w-[800px] bg-white shadow-xl transform transition-transform duration-300 ease-in-out translate-x-0 z-[51] flex flex-col">
						<div className="flex-none px-6 py-4 border-b">
							<div className="flex justify-between items-center">
								<h2 className="text-xl font-semibold text-brand-primary">
									Add New Class
								</h2>
								<button
									onClick={() => setShowAddForm(false)}
									className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600"
								>
									<X className="w-6 h-6" />
								</button>
							</div>
						</div>
						<div className="flex-1 overflow-y-auto p-6 bg-white">
							<AddClassForm
								onSuccess={() => {
									setShowAddForm(false);
									fetchClassInstances();
								}}
								onCancel={() => setShowAddForm(false)}
							/>
						</div>
					</div>
				</>
			)}

			{/* **Edit Class Form Modal** */}
			{editingClass && (
				<div className="bg-white rounded-lg shadow-lg p-6 mb-6">
					<h2 className="text-lg font-semibold text-brand-primary mb-4">
						Edit Class
					</h2>

					<EditClassForm
						classData={editingClass}
						onSuccess={() => {
							setPendingChanges(null);
							setEditingClass(null);
							fetchClassInstances();
						}}
						onCancel={() => {
							setPendingChanges(null);
							setEditingClass(null);
						}}
						onSaveClick={(changes) => handleSaveChanges(editingClass, changes)}
					/>
				</div>
			)}

			<WeeklyCalendar
				classes={classInstances}
				onClassClick={setSelectedClass}
				onEdit={(classItem) =>
					setModifyingClass({ class: classItem, action: "edit" })
				}
				onDelete={(classItem) =>
					setModifyingClass({ class: classItem, action: "delete" })
				}
				onBookDropIn={profile?.role === "parent" ? setBookingClass : undefined}
				userRole={profile?.role}
			/>

			{/* **Attendance Modal** */}
			{selectedClass && (
				<AttendanceModal
					classId={selectedClass.id}
					instanceId={selectedClass.id}
					userRole={profile?.role!}
					className={selectedClass.name}
					date={selectedClass.date}
					onClose={() => setSelectedClass(null)}
				/>
			)}

			{modifyingClass && (
				<RecurringClassModal
					action={modifyingClass.action}
					onClose={() => setModifyingClass(null)}
					onConfirm={(scope) => handleModifyConfirm(scope)} // Pass the scope to the handler
				/>
			)}

			{/* **No Classes Found Message** */}
			{classInstances.length === 0 && !loading && (
				<p className="text-center text-gray-500 mt-8">No classes found</p>
			)}
		</div>
	);
}
