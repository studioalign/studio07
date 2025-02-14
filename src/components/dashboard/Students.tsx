import React, { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import DashboardCard from "./DashboardCard";
import StudentDetailsModal from "../StudentDetailsModal";
import { supabase } from "../../lib/supabase";
import { useData } from "../../contexts/DataContext";
import { useAuth } from "../../contexts/AuthContext";

interface Student {
	id: string;
	name: string;
	date_of_birth: string;
	gender: string;
	emergencyContacts: {
		name: string;
		relationship: string;
		phone: string;
		email: string;
	}[];
	medicalConditions: string;
	allergies: string;
	medications: string;
	doctorName: string;
	doctorPhone: string;
	photoConsent: boolean;
	socialMediaConsent: boolean;
	participationConsent: boolean;
	parent: {
		name: string;
	};
}

export default function Students() {
	const [students, setStudents] = useState<Student[]>([]);
	const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const { profile } = useAuth();

	useEffect(() => {
		async function fetchStudents() {
			try {
				console.log("Fetching students...");
				if (!profile?.studio?.id) {
					console.error("No studio ID available");
					throw new Error("No studio ID available");
				}

				const { data, error: fetchError } = await supabase
					.from("students")
					.select(
						`
							id,
							name,
							date_of_birth,
							parent:users!inner (
							name
							)
						`
					)
					.eq("studio_id", profile?.studio?.id)
					.order("name");

				if (fetchError) {
					console.error("Error fetching students:", fetchError);
					throw fetchError;
				}

				console.log("Fetched Students Data:", data);
				setStudents(data);
			} catch (err) {
				console.error("Error fetching students:", err);
				setError(
					err instanceof Error ? err.message : "Failed to fetch students"
				);
			} finally {
				setLoading(false);
			}
		}

		if (profile?.studio?.id) {
			fetchStudents();
		}
	}, [profile?.studio?.id]);

	if (loading) {
		return (
			<div>
				<div className="flex justify-between items-center mb-6">
					<h1 className="text-2xl font-bold text-brand-primary">Students</h1>
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

	return (
		<div>
			<div className="flex justify-between items-center mb-6">
				<h1 className="text-2xl font-bold text-brand-primary">Students</h1>
			</div>
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
				{students.map((student) => {
					// Add mock data for student details
					const enrichedStudent = {
						...student,
						gender: "female",
						emergencyContacts: [
							{
								name: "John Doe",
								relationship: "Father",
								phone: "123-456-7890",
								email: "john@example.com",
							},
							{
								name: "Jane Doe",
								relationship: "Mother",
								phone: "123-456-7891",
								email: "jane@example.com",
							},
						],
						medicalConditions: "Asthma",
						allergies: "Peanuts",
						medications: "Inhaler as needed",
						doctorName: "Dr. Smith",
						doctorPhone: "123-456-7892",
						photoConsent: true,
						socialMediaConsent: true,
						participationConsent: true,
					};

					return (
						<DashboardCard
							key={student.id}
							title={student.name}
							onClick={() => setSelectedStudent(enrichedStudent)}
							items={[
								{
									label: "Date of Birth",
									value: new Date(student.date_of_birth).toLocaleDateString(),
								},
								{
									label: "Parent",
									value: student.parent?.name || "Unknown",
								},
							]}
						/>
					);
				})}
			</div>
			{selectedStudent && (
				<StudentDetailsModal
					student={selectedStudent}
					onClose={() => setSelectedStudent(null)}
				/>
			)}
			{students.length === 0 && !loading && (
				<p className="text-center text-gray-500 mt-8">No students found</p>
			)}
		</div>
	);
}
