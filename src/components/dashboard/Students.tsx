import React, { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import DashboardCard from "./DashboardCard";
import StudentDetailsModal from "../StudentDetailsModal";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";

interface EmergencyContact {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  email: string;
}

interface Student {
  id: string;
  name: string;
  date_of_birth: string;
  gender: string;
  emergency_contacts: EmergencyContact[];
  medical_conditions: string;
  allergies: string;
  medications: string;
  doctor_name: string;
  doctor_phone: string;
  photo_consent: boolean;
  social_media_consent: boolean;
  participation_consent: boolean;
  users: {
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
        if (!profile?.id) {
          console.error("No user ID available");
          throw new Error("No user ID available");
        }

        // Get the studio_id from the user's profile
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('studio_id')
          .eq('id', profile.id)
          .single();

        if (userError || !userData?.studio_id) {
          throw new Error("Could not find studio information");
        }

        const { data, error: fetchError } = await supabase
          .from("students")
          .select(`
            id,
            name,
            date_of_birth,
            gender,
            medical_conditions,
            allergies,
            medications,
            doctor_name,
            doctor_phone,
            photo_consent,
            social_media_consent,
            participation_consent,
            emergency_contacts (
              id,
              name,
              relationship,
              phone,
              email
            ),
            users!parent_id (
              name
            )
          `)
          .eq('studio_id', userData.studio_id)
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

    if (profile?.id) {
      fetchStudents();
    }
  }, [profile?.id]);

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
        {students.map((student) => (
          <DashboardCard
            key={student.id}
            title={student.name}
            onClick={() => setSelectedStudent(student)}
            items={[
              {
                label: "Date of Birth",
                value: new Date(student.date_of_birth).toLocaleDateString(),
              },
              {
                label: "Parent",
                value: student.users?.name || "Unknown",
              },
            ]}
          />
        ))}
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