import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import StudentDetailsModal from '../StudentDetailsModal';
import {
  getOrCreateClassInstance,
  fetchInstanceStudents,
  createInstanceStudents,
  fetchAttendanceRecords,
  saveAttendanceRecords
} from '../../utils/attendanceUtils';

interface InstanceEnrollment {
  id: string;
  student_id: string;
  student: {
    id: string;
    name: string;
  };
}

interface AttendanceRecord {
  instance_enrollment_id: string;
  status: 'present' | 'late' | 'authorised' | 'unauthorised';
  notes: string;
}

interface Student {
  id: string;
  enrollment_id: string;
  name: string;
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
  attendance?: {
    status: 'present' | 'late' | 'authorised' | 'unauthorised';
    notes: string;
  };
}

interface AttendanceModalProps {
  classId: string;
  instanceId: string;
  userRole: string | null;
  className: string;
  date: string;
  onClose: () => void;
}

const statusOptions = [
  { value: 'present', label: 'Present', color: 'bg-green-100 text-green-800' },
  { value: 'late', label: 'Late', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'authorised', label: 'Authorised Absence', color: 'bg-blue-100 text-blue-800' },
  { value: 'unauthorised', label: 'Unauthorised Absence', color: 'bg-red-100 text-red-800' },
];

export default function AttendanceModal({ classId, instanceId, userRole, className, date, onClose }: AttendanceModalProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Ensure we have a valid date
  const selectedDate = React.useMemo(() => {
    if (!date) {
      return new Date().toISOString().split('T')[0];
    }
    return date;
  }, [date]);

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch instance enrollments
        let enrolled = await fetchInstanceStudents(instanceId);

        // If no enrollments exist, create them from class_students
        if (!enrolled?.length) {
          enrolled = await createInstanceStudents(instanceId, classId);
        }

        // Fetch attendance records
        const enrolledIds = (enrolled || []).map(e => e.id);
        const allAttendanceRecords = await fetchAttendanceRecords(enrolledIds);

        // Map enrolled students with their attendance records
        const studentsWithAttendance = (enrolled || []).map((item: InstanceEnrollment) => ({
          id: item.student.id,
          enrollment_id: item.id,
          name: item.student.name,
          // Add mock data for student details
          gender: 'female',
          emergencyContacts: [
            {
              name: 'John Doe',
              relationship: 'Father',
              phone: '123-456-7890',
              email: 'john@example.com'
            },
            {
              name: 'Jane Doe',
              relationship: 'Mother',
              phone: '123-456-7891',
              email: 'jane@example.com'
            }
          ],
          medicalConditions: 'Asthma',
          allergies: 'Peanuts',
          medications: 'Inhaler as needed',
          doctorName: 'Dr. Smith',
          doctorPhone: '123-456-7892',
          photoConsent: true,
          socialMediaConsent: true,
          participationConsent: true,
          attendance: allAttendanceRecords.find((record: AttendanceRecord) => 
            record.instance_enrollment_id === item.id
          )
            ? {
                status: allAttendanceRecords.find(
                  (record: AttendanceRecord) => record.instance_enrollment_id === item.id
                )!.status,
                notes: allAttendanceRecords.find(
                  (record: AttendanceRecord) => record.instance_enrollment_id === item.id
                )!.notes || '',
              }
            : undefined,
        }));

        setStudents(studentsWithAttendance);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load students');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [classId, selectedDate]);

  const handleStatusChange = (studentId: string, status: string) => {
    setStudents(prev => prev.map(student => {
      if (student.id === studentId) {
        return {
          ...student,
          attendance: {
            status: status as any,
            notes: student.attendance?.notes || '',
          },
        };
      }
      return student;
    }));
  };

  const handleNotesChange = (studentId: string, notes: string) => {
    setStudents(prev => prev.map(student => {
      if (student.id === studentId) {
        return {
          ...student,
          attendance: {
            status: student.attendance?.status || 'present',
            notes,
          },
        };
      }
      return student;
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (!classInstanceId) {
        throw new Error('No class instance found');
      }

      // Prepare attendance records
      const attendanceRecords = students
        .filter(student => student.attendance)
        .map(student => ({
          instance_enrollment_id: student.enrollment_id,
          status: student.attendance!.status,
          notes: student.attendance!.notes || '',
        }));

      await saveAttendanceRecords(
        students.map(s => s.enrollment_id),
        attendanceRecords
      );

      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save attendance';
      console.error('Error saving attendance:', err);
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-y-0 right-0 w-full md:w-[600px] bg-white shadow-xl transform transition-transform duration-300 ease-in-out translate-x-0">
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/2" />
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-12 bg-gray-200 rounded" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div 
        className="fixed inset-0 bg-black bg-opacity-25 transition-opacity"
        onClick={onClose}
      />
      <div className="fixed inset-y-0 right-0 w-full md:w-[600px] bg-white shadow-xl transform transition-transform duration-300 ease-in-out translate-x-0 flex flex-col">
        {/* Header */}
        <div className="flex-none px-6 py-4 border-b">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold text-brand-primary">{className}</h2>
              <p className="text-brand-secondary-400">{new Date(selectedDate).toLocaleDateString()}</p>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          {error && (
            <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-md">
              {error}
            </div>
          )}
        </div>

        {/* Student List */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            {students.map(student => (
              <div key={student.id} className="p-4 border rounded-lg bg-white">
                <div className="flex items-center justify-between mb-2">
                  <h3 
                    className="font-medium hover:text-brand-primary cursor-pointer"
                    title="Click to view student details"
                    onClick={() => setSelectedStudent(student)}
                  >
                    {student.name}
                  </h3>
                  {userRole !== 'parent' ? (
                    <div className="flex gap-2">
                      {statusOptions.map(option => (
                        <button
                          key={option.value}
                          onClick={() => handleStatusChange(student.id, option.value)}
                          className={`px-3 py-1 rounded-full text-sm font-medium ${
                            student.attendance?.status === option.value
                              ? option.color
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      statusOptions.find(opt => opt.value === student.attendance?.status)?.color || 'bg-gray-100 text-gray-600'
                    }`}>
                      {statusOptions.find(opt => opt.value === student.attendance?.status)?.label || 'Not Marked'}
                    </span>
                  )}
                </div>
                {userRole !== 'parent' ? (
                  <input
                    type="text"
                    placeholder="Add notes..."
                    value={student.attendance?.notes || ''}
                    onChange={(e) => handleNotesChange(student.id, e.target.value)}
                    className="w-full px-3 py-2 border rounded-md text-sm"
                  />
                ) : (
                  student.attendance?.notes && (
                    <p className="mt-2 text-sm text-gray-600">{student.attendance.notes}</p>
                  )
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        {userRole !== 'parent' && (
          <div className="flex-none px-6 py-4 border-t bg-white">
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full flex items-center justify-center px-4 py-2 bg-brand-primary text-white rounded-md hover:bg-brand-secondary-400 disabled:bg-gray-400"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving...' : 'Save Attendance'}
            </button>
          </div>
        )}
      </div>
      
      {selectedStudent && (
        <StudentDetailsModal
          student={selectedStudent}
          onClose={() => setSelectedStudent(null)}
        />
      )}
    </>
  );
}