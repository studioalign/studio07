import { supabase } from '../lib/supabase';

interface Student {
  id: string;
  name: string;
}

/**
 * Fetches students enrolled in a specific class for a given parent.
 * @param classId - The UUID of the class.
 * @param userId - The UUID of the parent.
 * @returns An array of Student objects.
 */
export async function getEnrolledStudents(classId: string, userId: string): Promise<Student[]> {
  try {
    const { data, error } = await supabase
      .from('class_students')
      .select('student_id, students!inner(id, name)')
      .eq('class_id', classId)
      .eq('students.parent_id', userId);

    if (error) {
      console.error('Supabase error:', error.message);
      throw error;
    }

    if (!data) {
      console.warn('No students found for the given class and parent.');
      return [];
    }

    return data.map(row => ({
      id: row.student_id,
      name: row.students.name
    }));
  } catch (err) {
    console.error('Error fetching enrolled students:', err);
    return [];
  }
}
