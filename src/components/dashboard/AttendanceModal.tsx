// src/components/dashboard/AttendanceModal.tsx
import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import StudentDetailsModal from '../StudentDetailsModal';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { notificationService } from '../../services/notificationService';

import {
  fetchInstanceStudents,
  createInstanceStudents,
  fetchAttendanceRecords,
  saveAttendanceRecords
} from '../../utils/attendanceUtils';

interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
  email: string;
}

interface Student {
  id: string;
  class_student_id: string;
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
  attendance?: {
    status: 'present' | 'late' | 'authorised' | 'unauthorised';
    notes: string;
  };
}

interface ClassStudent {
  id: string;
  student_id: string;
  student: {
    id: string;
    name: string;
  };
}

interface AttendanceRecord {
  class_student_id: string;
  status: 'present' | 'late' | 'authorised' | 'unauthorised';
  notes: string;
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

export default function AttendanceModal({ 
  classId, 
  instanceId, 
  userRole, 
  className, 
  date, 
  onClose 
}: AttendanceModalProps) {
  const { profile } = useAuth();
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
        const classStudentIds = (enrolled || []).map(e => e.id);
        const allAttendanceRecords = await fetchAttendanceRecords(classStudentIds);

        // Map enrolled students with their attendance records
        const studentsWithAttendance = (enrolled || []).map((item: ClassStudent) => {
          // Find corresponding attendance record
          const attendanceRecord = allAttendanceRecords.find(
            (record: AttendanceRecord) => record.class_student_id === item.id
          );

          return {
            id: item.student_id,
            class_student_id: item.id,
            name: item.student.name,
            // These fields will be populated with actual student data
            date_of_birth: '',
            gender: '',
            medical_conditions: '',
            allergies: '',
            medications: '',
            doctor_name: '',
            doctor_phone: '',
            photo_consent: false,
            social_media_consent: false,
            participation_consent: false,
            created_at: null,
            emergency_contacts: [],
            attendance: attendanceRecord
              ? {
                  status: attendanceRecord.status,
                  notes: attendanceRecord.notes || '',
                }
              : undefined,
          };
        });

        setStudents(studentsWithAttendance);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load students');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [classId, instanceId, selectedDate]);

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

  // Function to check if student has consecutive unauthorized absences
  const checkConsecutiveAbsences = async (studentId: string, classStudentId: string) => {
    if (!profile?.studio?.id) return;
    
    try {
      // Get recent attendance records for this student in this class
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('class_student_id', classStudentId)
        .order('created_at', { ascending: false })
        .limit(3); // Get last 3 attendance records
        
      if (error || !data || data.length < 2) return;
      
      // Check if the last two records are unauthorized absences
      const consecutiveAbsences = data.filter(record => 
        record.status === 'unauthorised'
      );
      
      if (consecutiveAbsences.length >= 2) {
        // Notify about consecutive absences
        await notificationService.notifyConsecutiveAbsences(
          profile.studio.id,
          students.find(s => s.id === studentId)?.name || 'Student',
          studentId,
          className,
          consecutiveAbsences.length
        );
      }
    } catch (err) {
      console.error('Error checking consecutive absences:', err);
    }
  };

  const handleSave = async () => {
    setSaving(true);

    try {
      // Prepare attendance records
      const attendanceRecords = students
        .filter(student => student.attendance)
        .map(student => ({
          class_student_id: student.class_student_id,
          status: student.attendance!.status,
          notes: student.attendance!.notes || '',
        }));

      await saveAttendanceRecords(
        students.map(s => s.class_student_id),
        attendanceRecords
      );

      // Process notifications for unauthorized absences
      const unauthorizedAbsences = students.filter(
        student => student.attendance?.status === 'unauthorised'
      );

      if (unauthorizedAbsences.length > 0 && profile?.studio?.id) {
        // For each unauthorized absence, notify parents
        for (const student of unauthorizedAbsences) {
          try {
            // Get parent ID directly from the student record
            const { data: studentData, error: studentError } = await supabase
              .from('students')
              .select('parent_id')
              .eq('id', student.id)
              .single();
              
            if (studentError) {
              console.error('Error fetching student parent:', studentError);
              continue;
            }
            
            // Only continue if we have a parent ID
            if (studentData?.parent_id) {
              // Send notification to the parent
              await notificationService.notifyUnauthorizedAbsence(
                studentData.parent_id,
                profile.studio.id,
                student.name,
                className,
                new Date(selectedDate).toLocaleDateString()
              );
            }
            
            // Check for consecutive absences
            await checkConsecutiveAbsences(student.id, student.class_student_id);
          } catch (err) {
            console.error('Error processing notification for student:', student.id, err);
          }
        }
      }

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
        className="fixed inset-0 bg-black bg-opacity-25 transition-opacity z-[60]"
        onClick={onClose}
      />
      <div className="fixed inset-y-0 right-0 w-full md:w-[600px] bg-white shadow-xl transform transition-transform duration-300 ease-in-out translate-x-0 flex flex-col z-[70]">
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
