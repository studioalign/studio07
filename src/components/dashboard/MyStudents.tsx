import React, { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, X } from "lucide-react";
import { supabase } from "../../lib/supabase";
import DashboardCard from "./DashboardCard";
import AddStudentForm from "../AddStudentForm";
import EditStudentForm from "../EditStudentForm";
import { useAuth } from "../../contexts/AuthContext";

interface EmergencyContact {
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
  medical_conditions: string;
  allergies: string;
  medications: string;
  doctor_name: string;
  doctor_phone: string;
  photo_consent: boolean;
  social_media_consent: boolean;
  participation_consent: boolean;
  created_at: string | null;
  emergency_contacts: EmergencyContact[];
}

export default function MyStudents() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const { profile } = useAuth();
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleDelete = async (studentId: string) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this student? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      const { error: deleteError } = await supabase
        .from("students")
        .delete()
        .eq("id", studentId);

      if (deleteError) throw deleteError;
      setRefreshKey((prev) => prev + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete student");
    }
  };

  useEffect(() => {
    async function fetchStudents() {
      try {
        const { data: studentsData, error: studentsError } = await supabase
          .from("students")
          .select(
            `
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
            created_at,
            emergency_contacts (
              name,
              relationship,
              phone,
              email
            )
          `
          )
          .eq("parent_id", profile?.id + "")
          .order("name");

        if (studentsError) throw studentsError;
        setStudents(studentsData);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to fetch students"
        );
      } finally {
        setLoading(false);
      }
    }

    fetchStudents();
  }, [profile?.id, refreshKey]);

  const handleAddSuccess = () => {
    setShowAddForm(false);
    setRefreshKey((prev) => prev + 1);
  };

  if (loading) {
    return (
      <div>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-brand-primary">My Students</h1>
          <div className="w-32 h-10 bg-gray-200 rounded-md animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2].map((i) => (
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
        <h1 className="text-2xl font-bold text-brand-primary">My Students</h1>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center px-4 py-2 bg-brand-primary text-white rounded-md hover:bg-brand-secondary-400"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Student
        </button>
      </div>

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
                  Add New Student
                </h2>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <AddStudentForm
                onSuccess={handleAddSuccess}
                onCancel={() => setShowAddForm(false)}
              />
            </div>
          </div>
        </>
      )}

      {editingStudent && (
        <>
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={() => setEditingStudent(null)}
          />
          <div className="fixed inset-y-0 right-0 w-full md:w-[800px] bg-white shadow-xl transform transition-transform duration-300 ease-in-out translate-x-0 z-[51] flex flex-col">
            <div className="flex-none px-6 py-4 border-b">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-brand-primary">
                  Edit Student
                </h2>
                <button
                  onClick={() => setEditingStudent(null)}
                  className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <EditStudentForm
                student={{
                  ...editingStudent,
                  doctorName: editingStudent.doctor_name,
                  doctorPhone: editingStudent.doctor_phone,
                  photoConsent: editingStudent.photo_consent,
                  socialMediaConsent: editingStudent.social_media_consent,
                  participationConsent: editingStudent.participation_consent,
                  medicalConditions: editingStudent.medical_conditions,
                  emergencyContacts: editingStudent.emergency_contacts || [{
                    name: "",
                    relationship: "",
                    phone: "",
                    email: ""
                  }]
                }}
                onSuccess={() => {
                  setEditingStudent(null);
                  setRefreshKey((prev) => prev + 1);
                }}
                onCancel={() => setEditingStudent(null)}
              />
            </div>
          </div>
        </>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {students.map((student) => (
          <DashboardCard
            key={student.id}
            title={student.name}
            onClick={() => {}}
            actions={
              <div className="flex space-x-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingStudent(student);
                  }}
                  className="p-1 text-gray-400 hover:text-brand-primary"
                  title="Edit student"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(student.id);
                  }}
                  className="p-1 text-gray-400 hover:text-red-500"
                  title="Delete student"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            }
            items={[
              {
                label: "Date of Birth",
                value: new Date(student.date_of_birth).toLocaleDateString(),
              },
              {
                label: "Added",
                value: new Date(student.created_at).toLocaleDateString(),
              },
            ]}
          />
        ))}
      </div>
      {students.length === 0 && !loading && (
        <p className="text-center text-gray-500 mt-8">No students added yet</p>
      )}
    </div>
  );
}