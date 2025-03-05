import { supabase } from '../lib/supabase';

const BATCH_SIZE = 50; // Optimal batch size for operations

// Fetch instance enrollments
export async function fetchInstanceStudents(instanceId: string) {
  try {
    const { data, error } = await supabase
      .from('class_students')
      .select(`
        id,
        student_id,
        student:students (
          id,
          name
        )
      `)
      .eq('class_id', instanceId);

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Error in fetchInstanceStudents:', err);
    throw err;
  }
}

// Create instance students from class students
export async function createInstanceStudents(instanceId: string, classId: string) {
  try {
    // First get all enrolled students for this class
    const { data: classStudents, error: fetchError } = await supabase
      .from('class_students')
      .select('student_id')
      .eq('class_id', classId);

    if (fetchError) throw fetchError;
    if (!classStudents?.length) return [];

    // Conversion not needed as class_students is now used directly
    return classStudents.map(cs => ({
      id: cs.id,
      student_id: cs.student_id,
      student: {
        id: cs.student_id,
        name: '' // You might want to fetch the actual name
      }
    }));
  } catch (err) {
    console.error('Error in createInstanceStudents:', err);
    throw err;
  }
}

// Fetch attendance records
export async function fetchAttendanceRecords(classStudentIds: string[]) {
  try {
    if (!classStudentIds.length) return [];

    // Process in batches to avoid query parameter limits
    const results = [];
    for (let i = 0; i < classStudentIds.length; i += BATCH_SIZE) {
      const batch = classStudentIds.slice(i, i + BATCH_SIZE);
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .in('class_student_id', batch);

      if (error) throw error;
      if (data) results.push(...data);
    }
    
    return results;
  } catch (err) {
    console.error('Error in fetchAttendanceRecords:', err);
    throw err;
  }
}

// Save attendance records
export async function saveAttendanceRecords(
  classStudentIds: string[],
  newRecords: Array<{
    class_student_id: string;
    status: string;
    notes: string;
  }>
) {
  try {
    if (!classStudentIds.length) return;

    // Process deletions in batches
    for (let i = 0; i < classStudentIds.length; i += BATCH_SIZE) {
      const batch = classStudentIds.slice(i, i + BATCH_SIZE);
      const { error: deleteError } = await supabase
        .from('attendance')
        .delete()
        .in('class_student_id', batch);

      if (deleteError) throw deleteError;
    }

    // Process insertions in batches
    if (newRecords.length > 0) {
      for (let i = 0; i < newRecords.length; i += BATCH_SIZE) {
        const batch = newRecords.slice(i, i + BATCH_SIZE);
        const { error: insertError } = await supabase
          .from('attendance')
          .insert(batch);

        if (insertError) throw insertError;
      }
    }
  } catch (err) {
    console.error('Error in saveAttendanceRecords:', err);
    throw err;
  }
}

// Function to get or create class session
export async function getOrCreateClassSession(classId: string, date: string) {
  try {
    // Since all instances are in the classes table, we'll just return the existing or new class
    const { data: existingClass, error: fetchError } = await supabase
      .from('classes')
      .select('id')
      .eq('id', classId)
      .eq('date', date)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      // If it's not a "no rows" error, throw the error
      throw fetchError;
    }

    // If class exists for this date, return its ID
    if (existingClass) {
      return existingClass.id;
    }

    // If no class exists for this date, return the original class ID
    return classId;
  } catch (err) {
    console.error('Error in getOrCreateClassSession:', err);
    throw err;
  }
}