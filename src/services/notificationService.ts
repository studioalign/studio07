import { supabase } from '../lib/supabase';

// Define all notification types for type safety
export type NotificationType = 
  // Owner notifications
  | 'student_enrollment'
  | 'student_consecutive_absence'
  | 'student_birthday'
  | 'payment_received'
  | 'payment_overdue'
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
  | 'attendance_marked'
  | 'unauthorized_absence'
  
  // Parent notifications
  | 'class_cancellation'
  | 'payment_request'
  | 'payment_confirmation';

// Utility function to generate links based on notification type
export function generateNotificationLink(notification: {
  type: string;
  entity_type?: string;
  entity_id?: string;
  link?: string;
}) {
  // If a specific link is already provided, use that
  if (notification.link) return notification.link;

  // Route based on notification type
  switch (notification.type) {
    // Channel-related notifications
    case 'new_channel_post':
    case 'new_comment':
      return '/dashboard/channels';

    // Message-related notifications
    case 'new_message':
      return '/dashboard/messages';

    // User/Account-related notifications
    case 'staff_registration':
      return '/dashboard/teachers';
    case 'parent_registration':
    case 'parent_deletion':
      return '/dashboard/users';

    // Student-related notifications
    case 'student_enrollment':
    case 'student_consecutive_absence':
    case 'student_birthday':
      return '/dashboard/students';

    // Payment-related notifications
    case 'payment_received':
    case 'payment_overdue':
    case 'payment_request':
    case 'payment_confirmation':
      return '/dashboard/payments';

    // Class-related notifications
    case 'class_assigned':
    case 'class_reminder':
    case 'class_cancellation':
    case 'attendance_marked':
    case 'unauthorized_absence':
    case 'attendance_missing':
      return '/dashboard/classes';

    // Default fallback
    default:
      return '/dashboard';
  }
}

// Interface for Notification Data
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
    // Generate a default link if not provided
    const linkToUse = data.link || generateNotificationLink({
      type: data.type,
      entity_type: data.entity_type,
      entity_id: data.entity_id
    });

    const { error } = await supabase.from('notifications').insert({
      user_id: data.user_id,
      studio_id: data.studio_id,
      type: data.type,
      title: data.title,
      message: data.message,
      priority: data.priority || 'medium',
      entity_id: data.entity_id,
      entity_type: data.entity_type,
      link: linkToUse,
      details: data.details,
      requires_action: data.requires_action || false,
      email_required: data.email_required || false,
      email_sent: false,
      read: false,
      dismissed: false,
    });

    if (error) {
      console.error('Supabase error creating notification:', error);
      throw error;
    }

    return { success: true };
  } catch (error) {
    console.error('Error creating notification:', error);
    return { success: false, error };
  }
}

// Helper function to get studio owners
async function getStudioOwners(studioId: string) {
  try {
    const { data, error } = await supabase
      .from('users')
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

// Helper function to get studio teachers
async function getStudioTeachers(studioId: string) {
  try {
    const { data, error } = await supabase
      .from('users')
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

// Helper function to get student's parent
async function getStudentParent(studentId: string) {
  try {
    const { data, error } = await supabase
      .from('students')
      .select('parent_id')
      .eq('id', studentId)
      .single();
    
    if (error) throw error;
    return data?.parent_id;
  } catch (error) {
    console.error('Error fetching student parent:', error);
    return null;
  }
}

// Helper function to get all parents for a class
async function getParentsForClass(classId: string) {
  try {
    const { data: classStudents, error: classError } = await supabase
      .from('class_students')
      .select('student_id');
    
    if (classError) throw classError;
    
    const parentIds = new Set<string>();
    for (const item of classStudents || []) {
      const parentId = await getStudentParent(item.student_id);
      if (parentId) parentIds.add(parentId);
    }
    
    return Array.from(parentIds);
  } catch (error) {
    console.error('Error fetching parents for class:', error);
    return [];
  }
}

// Owner Notifications
async function notifyStudentEnrollment(studioId: string, studentName: string, className: string, studentId: string, classId: string) {
  const owners = await getStudioOwners(studioId);
  
  for (const owner of owners) {
    await createNotification({
      user_id: owner.id,
      studio_id: studioId,
      type: 'student_enrollment',
      title: 'New Student Enrollment',
      message: `${studentName} has enrolled in ${className}`,
      priority: 'medium',
      entity_id: studentId,
      entity_type: 'student',
      details: { classId, className },
      email_required: true
    });
  }
}

async function notifyConsecutiveAbsences(studioId: string, studentName: string, studentId: string, className: string, absenceCount: number) {
  const owners = await getStudioOwners(studioId);
  
  for (const owner of owners) {
    await createNotification({
      user_id: owner.id,
      studio_id: studioId,
      type: 'student_consecutive_absence',
      title: 'Student Consecutive Absences',
      message: `${studentName} has missed ${absenceCount} consecutive classes in ${className}`,
      priority: 'high',
      entity_id: studentId,
      entity_type: 'student',
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
      title: 'Student Consecutive Absences',
      message: `${studentName} has missed ${absenceCount} consecutive classes in ${className}`,
      priority: 'medium',
      entity_id: studentId,
      entity_type: 'student',
      details: { absenceCount, className },
      email_required: false
    });
  }
}

async function notifyPaymentReceived(studioId: string, parentName: string, amount: number, invoiceId: string) {
  const owners = await getStudioOwners(studioId);
  
  for (const owner of owners) {
    await createNotification({
      user_id: owner.id,
      studio_id: studioId,
      type: 'payment_received',
      title: 'Payment Received',
      message: `${parentName} has made a payment of $${amount}`,
      priority: 'medium',
      entity_id: invoiceId,
      entity_type: 'invoice',
      email_required: false
    });
  }
}

async function notifyPaymentOverdue(userId: string, studioId: string, invoiceId: string, amount: number, daysOverdue: number) {
  // Notify parent
  await createNotification({
    user_id: userId,
    studio_id: studioId,
    type: 'payment_overdue',
    title: 'Payment Overdue',
    message: `Your payment of $${amount} is ${daysOverdue} days overdue`,
    priority: 'high',
    entity_id: invoiceId,
    entity_type: 'invoice',
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
      email_required: true
    });
  }
}

async function notifyStaffRegistration(studioId: string, staffName: string, staffId: string, role: string) {
  const owners = await getStudioOwners(studioId);
  
  for (const owner of owners) {
    await createNotification({
      user_id: owner.id,
      studio_id: studioId,
      type: 'staff_registration',
      title: 'New Staff Registration',
      message: `${staffName} has registered as a ${role}`,
      priority: 'high',
      entity_id: staffId,
      entity_type: 'staff',
      requires_action: true,
      email_required: true
    });
  }
}

async function notifyParentRegistration(studioId: string, parentName: string, parentId: string) {
  const owners = await getStudioOwners(studioId);
  
  for (const owner of owners) {
    await createNotification({
      user_id: owner.id,
      studio_id: studioId,
      type: 'parent_registration',
      title: 'New Parent Registration',
      message: `${parentName} has registered as a parent`,
      priority: 'medium',
      entity_id: parentId,
      entity_type: 'parent',
      email_required: true
    });
  }
}

async function notifyParentDeletion(studioId: string, parentName: string) {
  const owners = await getStudioOwners(studioId);
  
  for (const owner of owners) {
    await createNotification({
      user_id: owner.id,
      studio_id: studioId,
      type: 'parent_deletion',
      title: 'Parent Account Deleted',
      message: `${parentName} has deleted their account`,
      priority: 'medium',
      entity_type: 'parent',
      email_required: true
    });
  }
}

async function notifyAttendanceNotFilled(teacherId: string, teacherName: string, studioId: string, classId: string, className: string) {
  // Notify the teacher
  await createNotification({
    user_id: teacherId,
    studio_id: studioId,
    type: 'attendance_missing',
    title: 'Attendance Register Not Filled',
    message: `You have not filled the attendance register for ${className}`,
    priority: 'high',
    entity_id: classId,
    entity_type: 'class',
    requires_action: true,
    email_required: true
  });
  
  // Notify owners
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
      email_required: true
    });
  }
}

async function notifyClassCapacityReached(studioId: string, className: string, classId: string) {
  const owners = await getStudioOwners(studioId);
  
  for (const owner of owners) {
    await createNotification({
      user_id: owner.id,
      studio_id: studioId,
      type: 'class_capacity',
      title: 'Drop-in Class Capacity Reached',
      message: `${className} has reached its capacity limit`,
      priority: 'medium',
      entity_id: classId,
      entity_type: 'class',
      email_required: true
    });
  }
}

async function notifyClassScheduleChange(studioId: string, className: string, classId: string, changes: object) {
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
      details: changes,
      email_required: true
    });
  }
  
  // Notify parents of students in the class
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
      details: changes,
      email_required: true
    });
  }
}

async function notifyNewMessage(senderId: string, senderName: string, receiverId: string, studioId: string, conversationId: string, messagePreview: string) {
  await createNotification({
    user_id: receiverId,
    studio_id: studioId,
    type: 'new_message',
    title: 'New Message',
    message: `${senderName}: ${messagePreview}`,
    priority: 'medium',
    entity_id: conversationId,
    entity_type: 'conversation',
    email_required: true
  });
}

async function notifyNewChannelPost(
  studioId: string, 
  channelId: string, 
  channelName: string, 
  authorName: string, 
  postId: string, 
  postTitle: string
) {
  try {
    const { data: channelMembers, error: memberError } = await supabase
      .from('channel_members')
      .select('user_id')
      .eq('channel_id', channelId);
    
    if (memberError) {
      console.error('Error fetching channel members:', memberError);
      return;
    }
    
    if (!channelMembers || channelMembers.length === 0) {
      return;
    }
    
    const memberUserIds = channelMembers.map(member => member.user_id);
    
    for (const userId of memberUserIds) {
      await createNotification({
        user_id: userId,
        studio_id: studioId,
        type: 'new_channel_post',
        title: 'New Post in Channel',
        message: `${authorName} posted "${postTitle}" in ${channelName}`,
        priority: 'medium',
        entity_id: postId,
        entity_type: 'post',
        email_required: true
      });
    }
  } catch (error) {
    console.error('Error in notifyNewChannelPost:', error);
  }
}

async function notifyNewComment(
  studioId: string, 
  channelId: string, 
  postId: string, 
  postTitle: string, 
  commenterId: string, 
  commenterName: string
) {
  try {
    const { data: channelMembers, error: memberError } = await supabase
      .from('channel_members')
      .select('user_id')
      .eq('channel_id', channelId);
    
    if (memberError) {
      console.error('Error fetching channel members:', memberError);
      return;
    }
    
    if (!channelMembers || channelMembers.length === 0) {
      return;
    }
    
    const memberUserIds = channelMembers.map(member => member.user_id);
    
    for (const userId of memberUserIds) {
      // Skip sending notification to the commenter
      if (userId === commenterId) continue;
      
      await createNotification({
        user_id: userId,
        studio_id: studioId,
        type: 'new_comment',
        title: 'New Comment on Post',
        message: `${commenterName} commented on "${postTitle}"`,
        priority: 'medium',
        entity_id: postId,
        entity_type: 'post',
        email_required: true
      });
    }
  } catch (error) {
    console.error('Error in notifyNewComment:', error);
  }
}

// Teacher Notifications
async function notifyClassAssigned(teacherId: string, studioId: string, className: string, classId: string, schedule: object) {
  await createNotification({
    user_id: teacherId,
    studio_id: studioId,
    type: 'class_assigned',
    title: 'New Class Assigned',
    message: `You have been assigned to teach ${className}`,
    priority: 'high',
    entity_id: classId,
    entity_type: 'class',
    details: schedule,
    email_required: true
  });
}

async function notifyClassReminder(teacherId: string, studioId: string, className: string, classId: string, startTime: string) {
  await createNotification({
    user_id: teacherId,
    studio_id: studioId,
    type: 'class_reminder',
    title: 'Class Reminder',
    message: `Your class ${className} starts at ${startTime}`,
    priority: 'medium',
    entity_id: classId,
    entity_type: 'class',
    email_required: false
  });
}

async function notifyStudentAddedToClass(studioId: string, teacherId: string, studentName: string, studentId: string, className: string, classId: string) {
  await createNotification({
    user_id: teacherId,
    studio_id: studioId,
    type: 'student_added',
    title: 'New Student in Class',
    message: `${studentName} has been added to ${className}`,
    priority: 'medium',
    entity_id: studentId,
    entity_type: 'student',
    email_required: false
  });
}

async function notifyStudentRemovedFromClass(studioId: string, teacherId: string, studentName: string, studentId: string, className: string, classId: string) {
  await createNotification({
    user_id: teacherId,
    studio_id: studioId,
    type: 'student_removed',
    title: 'Student Removed from Class',
    message: `${studentName} has been removed from ${className}`,
    priority: 'medium',
    entity_id: studentId,
    entity_type: 'student',
    email_required: false
  });
}

// Parent Notifications
async function notifyClassCancellation(studioId: string, className: string, classId: string, date: string, reason: string) {
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

async function notifyAttendanceMarked(parentId: string, studioId: string, studentName: string, className: string, status: string, date: string) {
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

async function notifyUnauthorizedAbsence(parentId: string, studioId: string, studentName: string, className: string, date: string) {
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

async function notifyPaymentRequest(
  parentId: string, 
  studioId: string, 
  amount: number, 
  dueDate: string, 
  invoiceId: string,
  studioCurrency: string
) {
  await createNotification({
    user_id: parentId,
    studio_id: studioId,
    type: 'payment_request',
    title: 'Payment Request',
    message: `Payment of ${new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: studioCurrency
    }).format(amount)} is due by ${dueDate}`,
    priority: 'high',
    entity_id: invoiceId,
    entity_type: 'invoice',
    requires_action: true,
    email_required: true
  });
}

async function notifyPaymentConfirmation(parentId: string, studioId: string, amount: number, invoiceId: string) {
  await createNotification({
    user_id: parentId,
    studio_id: studioId,
    type: 'payment_confirmation',
    title: 'Payment Confirmation',
    message: `Your payment of $${amount} has been received. Thank you!`,
    priority: 'medium',
    entity_id: invoiceId,
    entity_type: 'invoice',
    email_required: true
  });
}

// Export all functions
export {
  createNotification,
  // Owner notifications
  notifyStudentEnrollment,
  notifyConsecutiveAbsences,
  notifyPaymentReceived,
  notifyPaymentOverdue,
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

// Export as a service object
export const notificationService = {
  createNotification,
  generateNotificationLink,
  
  // Owner notifications
  notifyStudentEnrollment,
  notifyConsecutiveAbsences,
  notifyPaymentReceived,
  notifyPaymentOverdue,
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