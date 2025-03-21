import { supabase } from '../lib/supabase';
import emailService from '../services/emailService';

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
  | 'document_assigned'
  | 'document_reminder'
  | 'document_deadline_missed'
  
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

    // Create in-app notification
    const { data: notificationData, error } = await supabase.from('notifications').insert({
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
    }).select().single();

    if (error) {
      console.error('Supabase error creating notification:', error);
      throw error;
    }

    // Only attempt to send email if it's required
    if (data.email_required) {
      try {
        console.log('Email notification required, fetching user details...');
        
        // Get user email and name for email sending
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('email, name')
          .eq('id', data.user_id)
          .single();
        
        if (userError || !userData?.email) {
          console.error('Error fetching user email:', userError || 'No email found');
          return { success: true, emailSent: false };
        }

        // Send the appropriate email based on notification type
        let emailResult = false;

        console.log('Sending email notification of type:', data.type);
        
        // Handle different notification types and send appropriate emails
        switch (data.type) {
          case 'payment_request':
            emailResult = await emailService.sendPaymentOverdueEmail({
              recipientEmail: userData.email,
              recipientName: userData.name || 'User',
              amount: data.details?.amount || 0,
              daysOverdue: 0, // New request, not overdue yet
              invoiceId: data.entity_id || '',
              currency: data.details?.currency || 'USD'
            });
            break;
            
          case 'payment_overdue':
            emailResult = await emailService.sendPaymentOverdueEmail({
              recipientEmail: userData.email,
              recipientName: userData.name || 'User',
              amount: data.details?.amount || 0,
              daysOverdue: data.details?.daysOverdue || 1,
              invoiceId: data.entity_id || '',
              currency: data.details?.currency || 'USD'
            });
            break;
            
          case 'payment_confirmation':
            emailResult = await emailService.sendPaymentConfirmationEmail({
              recipientEmail: userData.email,
              recipientName: userData.name || 'User',
              amount: data.details?.amount || 0,
              invoiceId: data.entity_id || '',
              currency: data.details?.currency || 'USD'
            });
            break;
            
          case 'class_schedule':
            emailResult = await emailService.sendClassScheduleChangeEmail({
              recipientEmail: userData.email,
              recipientName: userData.name || 'User',
              className: data.details?.className || 'Your class',
              changes: typeof data.details === 'string' 
                ? data.details 
                : JSON.stringify(data.details || {}),
              studioId: data.studio_id
            });
            break;
            
          case 'class_assigned':
            emailResult = await emailService.sendClassAssignedEmail({
              recipientEmail: userData.email,
              recipientName: userData.name || 'User',
              className: data.details?.className || 'Your class',
              classId: data.entity_id || '',
              studioId: data.studio_id,
              schedule: data.details?.schedule || {}
            });
            break;
            
          case 'class_cancellation':
            emailResult = await emailService.sendClassCancellationEmail({
              recipientEmail: userData.email,
              recipientName: userData.name || 'User',
              className: data.details?.className || 'Your class',
              date: data.details?.date || new Date().toISOString().split('T')[0],
              reason: data.details?.reason,
              studioId: data.studio_id
            });
            break;
            
          case 'student_enrollment':
            emailResult = await emailService.sendStudentEnrollmentEmail({
              recipientEmail: userData.email,
              recipientName: userData.name || 'User',
              studentName: data.details?.studentName || 'A student',
              className: data.details?.className || 'a class',
              studioId: data.studio_id
            });
            break;
            
          case 'student_consecutive_absence':
            emailResult = await emailService.sendConsecutiveAbsencesEmail({
              recipientEmail: userData.email,
              recipientName: userData.name || 'User',
              studentName: data.details?.studentName || 'A student',
              className: data.details?.className || 'a class',
              absenceCount: data.details?.absenceCount || 2,
              studioId: data.studio_id
            });
            break;
            
          case 'new_message':
            emailResult = await emailService.sendNewMessageEmail({
              recipientEmail: userData.email,
              recipientName: userData.name || 'User',
              senderName: data.details?.senderName || 'Another user',
              messagePreview: data.details?.messagePreview || data.message || 'You have a new message',
              conversationId: data.details?.conversationId || data.entity_id || ''
            });
            break;
            
          case 'new_channel_post':
            emailResult = await emailService.sendChannelActivityEmail({
              recipientEmail: userData.email,
              recipientName: userData.name || 'User',
              type: 'post',
              channelName: data.details?.channelName || 'a channel',
              authorName: data.details?.authorName || 'Another user',
              content: data.details?.content || data.message || 'New post',
              channelId: data.details?.channelId || '',
              postId: data.entity_id || ''
            });
            break;
            
          case 'new_comment':
            emailResult = await emailService.sendChannelActivityEmail({
              recipientEmail: userData.email,
              recipientName: userData.name || 'User',
              type: 'comment',
              channelName: data.details?.channelName || 'a channel',
              authorName: data.details?.authorName || 'Another user',
              content: data.details?.content || data.message || 'New comment',
              channelId: data.details?.channelId || '',
              postId: data.entity_id || ''
            });
            break;
            
          case 'staff_registration':
            emailResult = await emailService.sendStaffRegistrationEmail({
              recipientEmail: userData.email,
              recipientName: userData.name || 'User',
              staffName: data.details?.staffName || 'A new staff member',
              role: data.details?.role || 'staff',
              studioId: data.studio_id
            });
            break;
            
          case 'unauthorized_absence':
            // This is usually sent to parents
            emailResult = await emailService.sendAttendanceNotFilledEmail({
              recipientEmail: userData.email,
              recipientName: userData.name || 'User',
              className: data.details?.className || 'Your class',
              teacherName: data.details?.teacherName || 'The teacher',
              studioId: data.studio_id
            });
            break;
            
            case 'document_assigned':
              emailResult = await emailService.sendDocumentAssignedEmail({
                recipientEmail: userData.email,
                recipientName: userData.name || 'User',
                documentName: data.details?.documentName || 'A document',
                requiresSignature: data.details?.requiresSignature || false,
                description: data.details?.description,
                studioId: data.studio_id
              });
              break;
              
            case 'document_reminder':
              emailResult = await emailService.sendDocumentReminderEmail({
                recipientEmail: userData.email,
                recipientName: userData.name || 'User',
                documentName: data.details?.documentName || 'A document',
                requiresSignature: data.details?.requiresSignature || false,
                studioId: data.studio_id
              });
              break;
              
            case 'document_deadline_missed':
              emailResult = await emailService.sendDocumentDeadlineEmail({
                recipientEmail: userData.email,
                recipientName: userData.name || 'User',
                documentName: data.details?.documentName || 'A document',
                requiresSignature: data.details?.requiresSignature || false,
                unprocessedCount: data.details?.unprocessedCount,
                studioId: data.studio_id
              });
              break;
            
          default:
            // Generic email for types without specific templates
            console.log('No specific email template for notification type:', data.type);
            break;
        }

        // Update the notification record to mark email as sent
        if (notificationData?.id) {
          await supabase
            .from('notifications')
            .update({ 
              email_sent: true,
              email_sent_at: new Date().toISOString(),
              email_success: emailResult 
            })
            .eq('id', notificationData.id);
          
          console.log('Notification updated with email status:', emailResult);
        }
        
        return { success: true, emailSent: emailResult };
      } catch (emailError) {
        console.error('Error sending email notification:', emailError);
        return { success: true, emailSent: false };
      }
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
      details: { studentName, className, classId },
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
      details: { studentName, absenceCount, className },
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
      details: { studentName, absenceCount, className },
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
      details: { parentName, amount },
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
    details: { amount, daysOverdue },
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
      details: { amount, daysOverdue },
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
      details: { staffName, role },
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
      details: { parentName },
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
      details: { parentName },
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
    details: { className, teacherName },
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
      details: { className, teacherName },
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
      details: { className },
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
      details: { className, ...changes },
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
      details: { className, ...changes },
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
      details: { className, ...changes },
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
    details: { senderName, messagePreview, conversationId },
    email_required: true
  });
}

async function notifyNewChannelPost(
  studioId: string, 
  channelId: string, 
  channelName: string, 
  authorName: string, 
  postId: string, 
  postTitle: string,
  authorId: string
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
      // Skip notification to the author
      if (userId === authorId) continue;
      
      await createNotification({
        user_id: userId,
        studio_id: studioId,
        type: 'new_channel_post',
        title: 'New Post in Channel',
        message: `${authorName} posted "${postTitle}" in ${channelName}`,
        priority: 'medium',
        entity_id: postId,
        entity_type: 'post',
        details: { authorName, postTitle, channelName, channelId, content: postTitle },
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
  commenterName: string,
  commentContent: string
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
        details: { commenterName, postTitle, channelId, content: commentContent },
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
    details: { className, schedule },
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
    details: { className, startTime },
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
    details: { studentName, className, classId },
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
    details: { studentName, className, classId },
    email_required: false
  });
}

// Parent Notifications (continued)
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
      details: { className, date, reason },
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
    details: { studentName, className, status, date },
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
    details: { studentName, className, date },
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
  currency: string
) {
  await createNotification({
    user_id: parentId,
    studio_id: studioId,
    type: 'payment_request',
    title: 'Payment Request',
    message: `Payment of ${new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount)} is due by ${dueDate}`,
    priority: 'high',
    entity_id: invoiceId,
    entity_type: 'invoice',
    details: { amount, dueDate, currency },
    requires_action: true,
    email_required: true
  });
}

async function notifyPaymentConfirmation(parentId: string, studioId: string, amount: number, invoiceId: string, currency: string) {
  await createNotification({
    user_id: parentId,
    studio_id: studioId,
    type: 'payment_confirmation',
    title: 'Payment Confirmation',
    message: `Your payment of ${new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount)} has been received. Thank you!`,
    priority: 'medium',
    entity_id: invoiceId,
    entity_type: 'invoice',
    details: { amount, currency },
    email_required: true
  });
}

// Notify when a document is assigned
async function notifyDocumentAssigned(
  userId: string, 
  studioId: string, 
  documentName: string, 
  documentId: string, 
  requiresSignature: boolean,
  description?: string
) {
  await createNotification({
    user_id: userId,
    studio_id: studioId,
    type: 'document_assigned',
    title: 'New Document Assigned',
    message: `A new document "${documentName}" has been ${requiresSignature ? 'assigned for signature' : 'shared with you'}`,
    priority: 'high',
    entity_id: documentId,
    entity_type: 'document',
    details: {
      documentName,
      requiresSignature,
      description
    },
    requires_action: requiresSignature,
    email_required: true
  });
}

// Send a reminder for a specific document
async function notifyDocumentReminder(
  userId: string, 
  studioId: string, 
  documentName: string, 
  documentId: string, 
  requiresSignature: boolean
) {
  await createNotification({
    user_id: userId,
    studio_id: studioId,
    type: 'document_reminder',
    title: 'Document Reminder',
    message: `Reminder: Please ${requiresSignature ? 'sign' : 'view'} the document "${documentName}"`,
    priority: 'high',
    entity_id: documentId,
    entity_type: 'document',
    details: {
      documentName,
      requiresSignature
    },
    requires_action: true,
    email_required: true
  });
}

// Notify studio owners about missed document deadlines
async function notifyDocumentDeadlineMissed(
  ownerId: string, 
  studioId: string, 
  documentName: string, 
  documentId: string, 
  unprocessedCount: number, 
  requiresSignature: boolean
) {
  await createNotification({
    user_id: ownerId,
    studio_id: studioId,
    type: 'document_deadline_missed',
    title: 'Document Deadline Passed',
    message: `${unprocessedCount} recipient(s) did not ${requiresSignature ? 'sign' : 'view'} "${documentName}"`,
    priority: 'high',
    entity_id: documentId,
    entity_type: 'document',
    details: {
      documentName,
      unprocessedCount,
      requiresSignature
    },
    requires_action: true,
    email_required: true
  });
}

// Notify individual recipients about missed document deadlines
async function notifyIndividualDocumentDeadline(
  userId: string, 
  studioId: string, 
  documentName: string, 
  documentId: string, 
  requiresSignature: boolean
) {
  await createNotification({
    user_id: userId,
    studio_id: studioId,
    type: 'document_deadline_missed',
    title: 'Document Deadline Passed',
    message: `The deadline for "${documentName}" has passed. Please ${requiresSignature ? 'sign' : 'view'} the document immediately.`,
    priority: 'high',
    entity_id: documentId,
    entity_type: 'document',
    details: {
      documentName,
      requiresSignature
    },
    requires_action: true,
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
  notifyDocumentAssigned,
  notifyDocumentReminder,
  notifyDocumentDeadlineMissed,
  notifyIndividualDocumentDeadline,
  
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
  notifyDocumentAssigned,
  notifyDocumentReminder,
  notifyDocumentDeadlineMissed,
  notifyIndividualDocumentDeadline,
  
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
