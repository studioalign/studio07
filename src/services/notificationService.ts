// src/services/notificationService.ts
import { supabase } from '../lib/supabase';

// Define all notification types for type safety
export type NotificationType = 
  // Owner notifications
  | 'student_enrollment'
  | 'student_consecutive_absence'
  | 'student_birthday'
  | 'payment_received'
  | 'payment_overdue'
  | 'monthly_summary'
  | 'staff_registration'
  | 'parent_registration'
  | 'parent_deletion'
  | 'attendance_missing'
  | 'class_capacity'
  | 'class_schedule'
  | 'new_message'
  | 'new_channel_post'
  | 'new_comment'
  
  // Teacher notifications
  | 'class_assigned'
  | 'class_reminder'
  | 'student_added'
  | 'student_removed'
  
  // Parent notifications
  | 'class_cancellation'
  | 'attendance_marked'
  | 'unauthorized_absence'
  | 'payment_request'
  | 'payment_confirmation';

interface NotificationData {
  user_id: string;
  studio_id: string;
  type: NotificationType;
  title: string;
  message: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  entity_id?: string;
  entity_type?: string;
  link?: string;
  details?: any;
  requires_action?: boolean;
  email_required?: boolean;
}

// Main function to create a notification
async function createNotification(data: NotificationData) {
  try {
    const { error } = await supabase.from('notifications').insert({
      user_id: data.user_id,
      studio_id: data.studio_id,
      type: data.type,
      title: data.title,
      message: data.message,
      priority: data.priority || 'medium',
      entity_id: data.entity_id,
      entity_type: data.entity_type,
      link: data.link,
      details: data.details,
      requires_action: data.requires_action || false,
      email_required: data.email_required || false,
      email_sent: false,
      read: false,
      dismissed: false,
    });

    if (error) throw error;

    // For a production system, you would have email logic here
    // This could be a serverless function or API endpoint that sends emails
    if (data.email_required) {
      await sendEmailNotification(data);
    }

    return { success: true };
  } catch (error) {
    console.error('Error creating notification:', error);
    return { success: false, error };
  }
}

// Placeholder for email sending functionality
// In a real application, this would connect to an email service
async function sendEmailNotification(data: NotificationData) {
  // In a production system, you would implement this with your email provider
  // For example, using SendGrid, Mailgun, etc.
  console.log('Would send email for:', data);
  
  // After sending email, mark notification as email sent
  try {
    await supabase
      .from('notifications')
      .update({ email_sent: true })
      .eq('user_id', data.user_id)
      .eq('type', data.type)
      .order('created_at', { ascending: false })
      .limit(1);
  } catch (error) {
    console.error('Error updating email_sent status:', error);
  }
}

// Helper function to get all studio owners
async function getStudioOwners(studioId: string) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('studio_id', studioId)
      .eq('role', 'owner');
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching studio owners:', error);
    return [];
  }
}

// Helper function to get all studio teachers
async function getStudioTeachers(studioId: string) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('studio_id', studioId)
      .eq('role', 'teacher');
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching studio teachers:', error);
    return [];
  }
}

// Helper function to get class teacher
async function getClassTeacher(classId: string) {
  try {
    const { data, error } = await supabase
      .from('classes')
      .select('teacher_id')
      .eq('id', classId)
      .single();
    
    if (error) throw error;
    return data?.teacher_id;
  } catch (error) {
    console.error('Error fetching class teacher:', error);
    return null;
  }
}

// Helper function to get student's parents
async function getStudentParents(studentId: string) {
  try {
    const { data, error } = await supabase
      .from('parent_student')
      .select('parent_id')
      .eq('student_id', studentId);
    
    if (error) throw error;
    return data?.map(item => item.parent_id) || [];
  } catch (error) {
    console.error('Error fetching student parents:', error);
    return [];
  }
}

// ======= NOTIFICATION CREATION FUNCTIONS =======

// OWNER NOTIFICATIONS

export async function notifyStudentEnrollment(studioId: string, studentName: string, className: string, studentId: string, classId: string) {
  const owners = await getStudioOwners(studioId);
  
  const title = 'New Student Enrollment';
  const message = `${studentName} has enrolled in ${className}`;
  
  for (const owner of owners) {
    await createNotification({
      user_id: owner.id,
      studio_id: studioId,
      type: 'student_enrollment',
      title,
      message,
      priority: 'medium',
      entity_id: studentId,
      entity_type: 'student',
      link: `/dashboard/students/${studentId}`,
      details: { classId, className },
      email_required: true
    });
  }
}

export async function notifyConsecutiveAbsences(studioId: string, studentName: string, studentId: string, className: string, absenceCount: number) {
  const owners = await getStudioOwners(studioId);
  
  const title = 'Student Consecutive Absences';
  const message = `${studentName} has missed ${absenceCount} consecutive classes in ${className}`;
  
  for (const owner of owners) {
    await createNotification({
      user_id: owner.id,
      studio_id: studioId,
      type: 'student_consecutive_absence',
      title,
      message,
      priority: 'high',
      entity_id: studentId,
      entity_type: 'student',
      link: `/dashboard/students/${studentId}/attendance`,
      details: { absenceCount, className },
      email_required: true
    });
  }
  
  // Also notify teachers
  const teacherId = await getClassTeacher(className);
  if (teacherId) {
    await createNotification({
      user_id: teacherId,
      studio_id: studioId,
      type: 'student_consecutive_absence',
      title,
      message,
      priority: 'medium',
      entity_id: studentId,
      entity_type: 'student',
      link: `/dashboard/students/${studentId}/attendance`,
      details: { absenceCount, className },
      email_required: false
    });
  }
}

export async function notifyStudentBirthday(studioId: string, studentName: string, studentId: string) {
  const owners = await getStudioOwners(studioId);
  const teachers = await getStudioTeachers(studioId);
  
  const title = 'Student Birthday';
  const message = `Today is ${studentName}'s birthday!`;
  
  // Notify owners
  for (const owner of owners) {
    await createNotification({
      user_id: owner.id,
      studio_id: studioId,
      type: 'student_birthday',
      title,
      message,
      priority: 'low',
      entity_id: studentId,
      entity_type: 'student',
      link: `/dashboard/students/${studentId}`,
      email_required: false
    });
  }
  
  // Notify teachers
  for (const teacher of teachers) {
    await createNotification({
      user_id: teacher.id,
      studio_id: studioId,
      type: 'student_birthday',
      title,
      message,
      priority: 'low',
      entity_id: studentId,
      entity_type: 'student',
      link: `/dashboard/students/${studentId}`,
      email_required: false
    });
  }
}

export async function notifyPaymentReceived(studioId: string, parentName: string, amount: number, invoiceId: string) {
  const owners = await getStudioOwners(studioId);
  
  const title = 'Payment Received';
  const message = `${parentName} has made a payment of $${amount}`;
  
  for (const owner of owners) {
    await createNotification({
      user_id: owner.id,
      studio_id: studioId,
      type: 'payment_received',
      title,
      message,
      priority: 'medium',
      entity_id: invoiceId,
      entity_type: 'invoice',
      link: `/dashboard/billing/${invoiceId}`,
      email_required: false
    });
  }
}

export async function notifyPaymentOverdue(userId: string, studioId: string, invoiceId: string, amount: number, daysOverdue: number) {
  const title = 'Payment Overdue';
  const message = `Your payment of $${amount} is ${daysOverdue} days overdue`;
  
  // Notify parent
  await createNotification({
    user_id: userId,
    studio_id: studioId,
    type: 'payment_overdue',
    title,
    message,
    priority: 'high',
    entity_id: invoiceId,
    entity_type: 'invoice',
    link: `/dashboard/billing/${invoiceId}`,
    requires_action: true,
    email_required: true
  });
  
  // Notify owners
  const owners = await getStudioOwners(studioId);
  for (const owner of owners) {
    await createNotification({
      user_id: owner.id,
      studio_id: studioId,
      type: 'payment_overdue',
      title: 'Customer Payment Overdue',
      message: `Payment of $${amount} is ${daysOverdue} days overdue`,
      priority: 'medium',
      entity_id: invoiceId,
      entity_type: 'invoice',
      link: `/dashboard/billing/${invoiceId}`,
      email_required: true
    });
  }
}

export async function notifyMonthlyFinancialSummary(studioId: string, month: string, revenue: number, expenses: number, profit: number) {
  const owners = await getStudioOwners(studioId);
  
  const title = 'Monthly Financial Summary';
  const message = `Your financial summary for ${month} is ready`;
  
  for (const owner of owners) {
    await createNotification({
      user_id: owner.id,
      studio_id: studioId,
      type: 'monthly_summary',
      title,
      message,
      priority: 'medium',
      entity_type: 'financial_summary',
      link: `/dashboard/reports/financial`,
      details: { month, revenue, expenses, profit },
      email_required: true
    });
  }
}

export async function notifyStaffRegistration(studioId: string, staffName: string, staffId: string, role: string) {
  const owners = await getStudioOwners(studioId);
  
  const title = 'New Staff Registration';
  const message = `${staffName} has registered as a ${role}`;
  
  for (const owner of owners) {
    await createNotification({
      user_id: owner.id,
      studio_id: studioId,
      type: 'staff_registration',
      title,
      message,
      priority: 'high',
      entity_id: staffId,
      entity_type: 'staff',
      link: `/dashboard/staff/${staffId}`,
      requires_action: true,
      email_required: true
    });
  }
}

export async function notifyParentRegistration(studioId: string, parentName: string, parentId: string) {
  const owners = await getStudioOwners(studioId);
  
  const title = 'New Parent Registration';
  const message = `${parentName} has registered as a parent`;
  
  for (const owner of owners) {
    await createNotification({
      user_id: owner.id,
      studio_id: studioId,
      type: 'parent_registration',
      title,
      message,
      priority: 'medium',
      entity_id: parentId,
      entity_type: 'parent',
      link: `/dashboard/parents/${parentId}`,
      email_required: true
    });
  }
}

export async function notifyParentDeletion(studioId: string, parentName: string) {
  const owners = await getStudioOwners(studioId);
  
  const title = 'Parent Account Deleted';
  const message = `${parentName} has deleted their account`;
  
  for (const owner of owners) {
    await createNotification({
      user_id: owner.id,
      studio_id: studioId,
      type: 'parent_deletion',
      title,
      message,
      priority: 'medium',
      entity_type: 'parent',
      email_required: true
    });
  }
}

export async function notifyAttendanceNotFilled(teacherId: string, teacherName: string, studioId: string, classId: string, className: string) {
  // First notify the teacher
  await createNotification({
    user_id: teacherId,
    studio_id: studioId,
    type: 'attendance_missing',
    title: 'Attendance Register Not Filled',
    message: `You have not filled the attendance register for ${className}`,
    priority: 'high',
    entity_id: classId,
    entity_type: 'class',
    link: `/dashboard/classes/${classId}/attendance`,
    requires_action: true,
    email_required: true
  });
  
  // After 4 hours, notify owners (this would be handled by a scheduled function)
  // This is a placeholder for the concept - in a real app you'd use a cron job or scheduler
  const owners = await getStudioOwners(studioId);
  
  for (const owner of owners) {
    await createNotification({
      user_id: owner.id,
      studio_id: studioId,
      type: 'attendance_missing',
      title: 'Attendance Register Not Filled',
      message: `${teacherName} has not filled the attendance register for ${className}`,
      priority: 'medium',
      entity_id: classId,
      entity_type: 'class',
      link: `/dashboard/classes/${classId}/attendance`,
      email_required: true
    });
  }
}

export async function notifyClassCapacityReached(studioId: string, className: string, classId: string) {
  const owners = await getStudioOwners(studioId);
  
  const title = 'Drop-in Class Capacity Reached';
  const message = `${className} has reached its capacity limit`;
  
  for (const owner of owners) {
    await createNotification({
      user_id: owner.id,
      studio_id: studioId,
      type: 'class_capacity',
      title,
      message,
      priority: 'medium',
      entity_id: classId,
      entity_type: 'class',
      link: `/dashboard/classes/${classId}`,
      email_required: true
    });
  }
}

export async function notifyClassScheduleChange(studioId: string, className: string, classId: string, changes: object) {
  // Notify owners
  const owners = await getStudioOwners(studioId);
  for (const owner of owners) {
    await createNotification({
      user_id: owner.id,
      studio_id: studioId,
      type: 'class_schedule',
      title: 'Class Schedule Changed',
      message: `The schedule for ${className} has been updated`,
      priority: 'medium',
      entity_id: classId,
      entity_type: 'class',
      link: `/dashboard/classes/${classId}`,
      details: changes,
      email_required: true
    });
  }
  
  // Notify teachers
  const teacherId = await getClassTeacher(classId);
  if (teacherId) {
    await createNotification({
      user_id: teacherId,
      studio_id: studioId,
      type: 'class_schedule',
      title: 'Class Schedule Changed',
      message: `The schedule for ${className} has been updated`,
      priority: 'high',
      entity_id: classId,
      entity_type: 'class',
      link: `/dashboard/classes/${classId}`,
      details: changes,
      email_required: true
    });
  }
  
  // Notify parents of students in the class
  // This would require getting all students in the class and their parents
  // For simplicity, we're assuming you have a function to get all parent IDs for a class
  const parentIds = await getParentsForClass(classId);
  for (const parentId of parentIds) {
    await createNotification({
      user_id: parentId,
      studio_id: studioId,
      type: 'class_schedule',
      title: 'Class Schedule Changed',
      message: `The schedule for ${className} has been updated`,
      priority: 'high',
      entity_id: classId,
      entity_type: 'class',
      link: `/dashboard/classes/${classId}`,
      details: changes,
      email_required: true
    });
  }
}

// Helper function to get all parents for a class
async function getParentsForClass(classId: string) {
  try {
    // This would be your implementation based on your database structure
    // For example, you might need to join multiple tables to get all parents of students in a class
    const { data, error } = await supabase
      .from('class_students')
      .select('student_id')
      .eq('class_id', classId);
    
    if (error) throw error;
    
    // Get parent IDs for all students
    const parentIds = new Set<string>();
    for (const item of data || []) {
      const parents = await getStudentParents(item.student_id);
      parents.forEach(id => parentIds.add(id));
    }
    
    return Array.from(parentIds);
  } catch (error) {
    console.error('Error fetching parents for class:', error);
    return [];
  }
}

export async function notifyNewMessage(senderId: string, senderName: string, receiverId: string, studioId: string, conversationId: string, messagePreview: string) {
  await createNotification({
    user_id: receiverId,
    studio_id: studioId,
    type: 'new_message',
    title: 'New Message',
    message: `${senderName}: ${messagePreview}`,
    priority: 'medium',
    entity_id: conversationId,
    entity_type: 'conversation',
    link: `/dashboard/messages/${conversationId}`,
    email_required: true
  });
}

export async function notifyNewChannelPost(studioId: string, channelId: string, channelName: string, authorName: string, postId: string, postTitle: string) {
  // Notify all users in the studio
  // In a real app, you'd probably only notify users who have subscribed to the channel
  const { data: users, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('studio_id', studioId);
  
  if (error) {
    console.error('Error fetching users:', error);
    return;
  }
  
  for (const user of users || []) {
    await createNotification({
      user_id: user.id,
      studio_id: studioId,
      type: 'new_channel_post',
      title: 'New Post in Channel',
      message: `${authorName} posted "${postTitle}" in ${channelName}`,
      priority: 'medium',
      entity_id: postId,
      entity_type: 'post',
      link: `/dashboard/channels/${channelId}/posts/${postId}`,
      email_required: true
    });
  }
}

export async function notifyNewComment(studioId: string, channelId: string, channelName: string, postId: string, postTitle: string, commenterId: string, commenterName: string) {
  // Notify the post author and anyone who has commented
  // For simplicity, we'll notify all users
  const { data: users, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('studio_id', studioId);
  
  if (error) {
    console.error('Error fetching users:', error);
    return;
  }
  
  for (const user of users || []) {
    // Don't notify the commenter
    if (user.id === commenterId) continue;
    
    await createNotification({
      user_id: user.id,
      studio_id: studioId,
      type: 'new_comment',
      title: 'New Comment on Post',
      message: `${commenterName} commented on "${postTitle}" in ${channelName}`,
      priority: 'medium',
      entity_id: postId,
      entity_type: 'post',
      link: `/dashboard/channels/${channelId}/posts/${postId}`,
      email_required: true
    });
  }
}

// TEACHER NOTIFICATIONS

export async function notifyClassAssigned(teacherId: string, studioId: string, className: string, classId: string, schedule: object) {
  await createNotification({
    user_id: teacherId,
    studio_id: studioId,
    type: 'class_assigned',
    title: 'New Class Assigned',
    message: `You have been assigned to teach ${className}`,
    priority: 'high',
    entity_id: classId,
    entity_type: 'class',
    link: `/dashboard/classes/${classId}`,
    details: schedule,
    email_required: true
  });
}

export async function notifyClassReminder(teacherId: string, studioId: string, className: string, classId: string, startTime: string) {
  await createNotification({
    user_id: teacherId,
    studio_id: studioId,
    type: 'class_reminder',
    title: 'Class Reminder',
    message: `Your class ${className} starts at ${startTime}`,
    priority: 'medium',
    entity_id: classId,
    entity_type: 'class',
    link: `/dashboard/classes/${classId}`,
    email_required: false
  });
}

export async function notifyStudentAddedToClass(studioId: string, teacherId: string, studentName: string, studentId: string, className: string, classId: string) {
  await createNotification({
    user_id: teacherId,
    studio_id: studioId,
    type: 'student_added',
    title: 'New Student in Class',
    message: `${studentName} has been added to ${className}`,
    priority: 'medium',
    entity_id: studentId,
    entity_type: 'student',
    link: `/dashboard/classes/${classId}/roster`,
    email_required: false
  });
}

export async function notifyStudentRemovedFromClass(studioId: string, teacherId: string, studentName: string, studentId: string, className: string, classId: string) {
  await createNotification({
    user_id: teacherId,
    studio_id: studioId,
    type: 'student_removed',
    title: 'Student Removed from Class',
    message: `${studentName} has been removed from ${className}`,
    priority: 'medium',
    entity_id: studentId,
    entity_type: 'student',
    link: `/dashboard/classes/${classId}/roster`,
    email_required: false
  });
}

// PARENT NOTIFICATIONS

export async function notifyClassCancellation(studioId: string, className: string, classId: string, date: string, reason: string) {
  // Get all parents of students in the class
  const parentIds = await getParentsForClass(classId);
  
  for (const parentId of parentIds) {
    await createNotification({
      user_id: parentId,
      studio_id: studioId,
      type: 'class_cancellation',
      title: 'Class Cancelled',
      message: `${className} on ${date} has been cancelled`,
      priority: 'high',
      entity_id: classId,
      entity_type: 'class',
      details: { reason },
      email_required: true
    });
  }
}

export async function notifyAttendanceMarked(parentId: string, studioId: string, studentName: string, className: string, status: string, date: string) {
  await createNotification({
    user_id: parentId,
    studio_id: studioId,
    type: 'attendance_marked',
    title: 'Attendance Marked',
    message: `${studentName} was marked as ${status} in ${className} on ${date}`,
    priority: 'low',
    entity_type: 'attendance',
    email_required: false
  });
}

export async function notifyUnauthorizedAbsence(parentId: string, studioId: string, studentName: string, className: string, date: string) {
  await createNotification({
    user_id: parentId,
    studio_id: studioId,
    type: 'unauthorized_absence',
    title: 'Unauthorized Absence',
    message: `${studentName} was marked as absent in ${className} on ${date}`,
    priority: 'high',
    entity_type: 'attendance',
    requires_action: true,
    email_required: true
  });
}

export async function notifyPaymentRequest(parentId: string, studioId: string, amount: number, dueDate: string, invoiceId: string) {
  await createNotification({
    user_id: parentId,
    studio_id: studioId,
    type: 'payment_request',
    title: 'Payment Request',
    message: `Payment of $${amount} is due by ${dueDate}`,
    priority: 'high',
    entity_id: invoiceId,
    entity_type: 'invoice',
    link: `/dashboard/billing/${invoiceId}`,
    requires_action: true,
    email_required: true
  });
}

export async function notifyPaymentConfirmation(parentId: string, studioId: string, amount: number, invoiceId: string) {
  await createNotification({
    user_id: parentId,
    studio_id: studioId,
    type: 'payment_confirmation',
    title: 'Payment Confirmation',
    message: `Your payment of $${amount} has been received. Thank you!`,
    priority: 'medium',
    entity_id: invoiceId,
    entity_type: 'invoice',
    link: `/dashboard/billing/${invoiceId}`,
    email_required: true
  });
}

// Export all functions as a service
export const notificationService = {
  // Owner notifications
  notifyStudentEnrollment,
  notifyConsecutiveAbsences,
  notifyStudentBirthday,
  notifyPaymentReceived,
  notifyPaymentOverdue,
  notifyMonthlyFinancialSummary,
  notifyStaffRegistration,
  notifyParentRegistration,
  notifyParentDeletion,
  notifyAttendanceNotFilled,
  notifyClassCapacityReached,
  notifyClassScheduleChange,
  notifyNewMessage,
  notifyNewChannelPost,
  notifyNewComment,
  
  // Teacher notifications
  notifyClassAssigned,
  notifyClassReminder,
  notifyStudentAddedToClass,
  notifyStudentRemovedFromClass,
  
  // Parent notifications
  notifyClassCancellation,
  notifyAttendanceMarked,
  notifyUnauthorizedAbsence,
  notifyPaymentRequest,
  notifyPaymentConfirmation
};

export default notificationService;