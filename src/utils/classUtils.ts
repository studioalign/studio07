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

/**
 * Gets the number of available spots for a drop-in class
 */
export async function getAvailableDropInSpots(classId: string): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('classes')
      .select('capacity, booked_count')
      .eq('id', classId)
      .single();
      
    if (error) throw error;
    
    if (!data) {
      throw new Error('Class not found');
    }
    
    return Math.max(0, data.capacity - (data.booked_count || 0));
  } catch (err) {
    console.error('Error getting available spots:', err);
    throw err;
  }
}