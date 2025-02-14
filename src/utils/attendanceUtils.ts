import { supabase } from '../lib/supabase';

const BATCH_SIZE = 50; // Optimal batch size for operations

// Fetch instance enrollments
export async function fetchInstanceStudents(instanceId: string) {
  try {
    const { data, error } = await supabase
      .from('instance_enrollments')
      .select(`
        id,
        student_id,
        student:students (
          id,
          name
        )
      `)
      .eq('class_instance_id', instanceId);

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Error in fetchInstanceStudents:', err);
    throw err;
  }
}

// Create instance enrollments from class enrollments
export async function createInstanceStudents(instanceId: string, classId: string) {
  try {
    // First get all enrolled students for this class
    const { data: classStudents, error: fetchError } = await supabase
      .from('class_students')
      .select('student_id')
      .eq('class_id', classId);

    if (fetchError) throw fetchError;
    if (!classStudents?.length) return [];

    // Create enrollments for all students
    const { data, error } = await supabase
      .from('instance_enrollments')
      .insert(
        classStudents.map(cs => ({
          class_instance_id: instanceId,
          student_id: cs.student_id
        }))
      )
      .select(`
        id,
        student_id,
        student:students (
          id,
          name
        )
      `);

    if (error && error.code !== '23505') throw error; // Ignore unique constraint violations
    return data || [];
  } catch (err) {
    console.error('Error in createInstanceStudents:', err);
    throw err;
  }
}

// Fetch attendance records
export async function fetchAttendanceRecords(enrollmentIds: string[]) {
  try {
    if (!enrollmentIds.length) return [];

    // Process in batches to avoid query parameter limits
    const results = [];
    for (let i = 0; i < enrollmentIds.length; i += BATCH_SIZE) {
      const batch = enrollmentIds.slice(i, i + BATCH_SIZE);
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .in('instance_enrollment_id', batch);

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
  enrollmentIds: string[],
  newRecords: Array<{
    instance_enrollment_id: string;
    status: string;
    notes: string;
  }>
) {
  try {
    if (!enrollmentIds.length) return;

    // Process deletions in batches
    for (let i = 0; i < enrollmentIds.length; i += BATCH_SIZE) {
      const batch = enrollmentIds.slice(i, i + BATCH_SIZE);
      const { error: deleteError } = await supabase
        .from('attendance')
        .delete()
        .in('instance_enrollment_id', batch);

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