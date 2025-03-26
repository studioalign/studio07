// src/services/emailService.ts
import { supabase } from '../lib/supabase';
import { emailTemplates } from '../utils/emailTemplates';

export class EmailService {
  private async sendEmail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<boolean> {
  try {
    console.log(`Attempting to send email to: ${params.to}`);
    
    // Use full URL instead of relative path
    const functionUrl = `${window.location.origin}/.netlify/functions/send-email`;
    
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        to: params.to,
        subject: params.subject,
        html: params.html
      })
    });
    
    // Check response status AND get the response body
    if (!response.ok) {
      const errorBody = await response.text();
      console.error('Email function returned error:', response.status, errorBody);
      return false;
    }
    
    const result = await response.json();
    console.log(`Email sent successfully:`, result);
    return true;
  } catch (err) {
    console.error('Email sending error:', err);
    return false;
  }
}

  // Test email configuration
  async testEmailConfiguration(email: string): Promise<boolean> {
    console.log(`Testing email configuration for: ${email}`);

    const testEmailHtml = `
      <h1>StudioAlign Email Configuration Test</h1>
      <p>If you can read this, your email configuration is working correctly.</p>
      <p>Sent: ${new Date().toLocaleString()}</p>
    `;

    try {
      const result = await this.sendEmail({
        to: email,
        subject: 'StudioAlign Email Configuration Test',
        html: testEmailHtml
      });

      console.log(`Email configuration test ${result ? 'PASSED' : 'FAILED'}`);
      return result;
    } catch (err) {
      console.error('Email configuration test failed:', err);
      return false;
    }
  }

  // Owner Notifications
  async sendStudentEnrollmentEmail(params: {
    recipientEmail: string;
    recipientName: string;
    studentName: string;
    className: string;
    studioId: string;
  }): Promise<boolean> {
    console.log('Preparing student enrollment email', {
      recipient: params.recipientEmail,
      recipientName: params.recipientName,
      studentName: params.studentName,
      className: params.className,
      studioId: params.studioId
    });

    const dashboardUrl = `https://app.studioalignpro.com/dashboard/students`;

    const emailHtml = emailTemplates.studentEnrollment({
      recipient: { name: params.recipientName },
      studentName: params.studentName,
      className: params.className,
      dashboardUrl
    });

    const result = await this.sendEmail({
      to: params.recipientEmail,
      subject: 'New Student Enrollment',
      html: emailHtml
    });

    console.log('Student enrollment email result', {
      recipient: params.recipientEmail,
      success: result
    });

    return result;
  }

  async sendConsecutiveAbsencesEmail(params: {
    recipientEmail: string;
    recipientName: string;
    studentName: string;
    className: string;
    absenceCount: number;
    studioId: string;
  }): Promise<boolean> {
    console.log('Preparing consecutive absences email', {
      recipient: params.recipientEmail,
      recipientName: params.recipientName,
      studentName: params.studentName,
      className: params.className,
      absenceCount: params.absenceCount
    });

    const dashboardUrl = `https://app.studioalignpro.com/dashboard/attendance`;

    const emailHtml = emailTemplates.consecutiveAbsences({
      recipient: { name: params.recipientName },
      studentName: params.studentName,
      className: params.className,
      absenceCount: params.absenceCount,
      dashboardUrl
    });

    const result = await this.sendEmail({
      to: params.recipientEmail,
      subject: 'Student Consecutive Absences Alert',
      html: emailHtml
    });

    console.log('Consecutive absences email result', {
      recipient: params.recipientEmail,
      success: result
    });

    return result;
  }

  async sendPaymentOverdueEmail(params: {
    recipientEmail: string;
    recipientName: string;
    amount: number;
    daysOverdue: number;
    invoiceId: string;
    currency: string;
    description?: string; // Add optional description
    invoiceNumber?: number; // Add optional invoice number
  }): Promise<boolean> {
    console.log('Preparing payment overdue email', {
      recipient: params.recipientEmail,
      recipientName: params.recipientName,
      amount: params.amount,
      daysOverdue: params.daysOverdue,
      invoiceId: params.invoiceId
    });
  
    const invoiceUrl = `https://app.studioalignpro.com/dashboard/payments`;
  
    const emailHtml = emailTemplates.paymentOverdue({
      recipient: { name: params.recipientName },
      amount: params.amount,
      daysOverdue: params.daysOverdue,
      invoiceUrl,
      currency: params.currency,
      description: params.description, // Pass description to the template
      invoiceNumber: params.invoiceNumber // Pass invoice number to the template
    });
  
    const result = await this.sendEmail({
      to: params.recipientEmail,
      subject: `Payment Overdue${params.invoiceNumber ? ` - Invoice #${params.invoiceNumber}` : ''}`,
      html: emailHtml
    });
  
    console.log('Payment overdue email result', {
      recipient: params.recipientEmail,
      success: result
    });
  
    return result;
  }

  async sendMonthlyFinancialSummaryEmail(params: {
    recipientEmail: string;
    recipientName: string;
    month: string;
    revenue: number;
    expenses: number;
    profit: number;
    currency: string;
  }): Promise<boolean> {
    console.log('Preparing monthly financial summary email', {
      recipient: params.recipientEmail,
      recipientName: params.recipientName,
      month: params.month,
      revenue: params.revenue,
      expenses: params.expenses,
      profit: params.profit
    });

    const dashboardUrl = `https://app.studioalignpro.com/dashboard/payments`;

    const emailHtml = emailTemplates.monthlyFinancialSummary({
      recipient: { name: params.recipientName },
      month: params.month,
      revenue: params.revenue,
      expenses: params.expenses,
      profit: params.profit,
      currency: params.currency,
      dashboardUrl
    });

    const result = await this.sendEmail({
      to: params.recipientEmail,
      subject: `Monthly Financial Summary - ${params.month}`,
      html: emailHtml
    });

    console.log('Monthly financial summary email result', {
      recipient: params.recipientEmail,
      success: result
    });

    return result;
  }

  async sendStaffRegistrationEmail(params: {
    recipientEmail: string;
    recipientName: string;
    staffName: string;
    role: string;
    studioId: string;
  }): Promise<boolean> {
    console.log('Preparing staff registration email', {
      recipient: params.recipientEmail,
      recipientName: params.recipientName,
      staffName: params.staffName,
      role: params.role
    });

    const dashboardUrl = `https://app.studioalignpro.com/dashboard/teachers`;

    const emailHtml = emailTemplates.staffRegistration({
      recipient: { name: params.recipientName },
      staffName: params.staffName,
      role: params.role,
      dashboardUrl
    });

    const result = await this.sendEmail({
      to: params.recipientEmail,
      subject: 'New Staff Registration',
      html: emailHtml
    });

    console.log('Staff registration email result', {
      recipient: params.recipientEmail,
      success: result
    });

    return result;
  }

  async sendParentAccountEmail(params: {
    recipientEmail: string;
    recipientName: string;
    parentName: string;
    type: 'registration' | 'deletion';
    studioId: string;
  }): Promise<boolean> {
    console.log('Preparing parent account email', {
      recipient: params.recipientEmail,
      recipientName: params.recipientName,
      parentName: params.parentName,
      type: params.type
    });

    const dashboardUrl = `https://app.studioalignpro.com/dashboard/parents`;

    const emailHtml = emailTemplates.parentAccount({
      recipient: { name: params.recipientName },
      parentName: params.parentName,
      type: params.type,
      dashboardUrl
    });

    const result = await this.sendEmail({
      to: params.recipientEmail,
      subject: `Parent Account ${params.type === 'registration' ? 'Registration' : 'Deletion'}`,
      html: emailHtml
    });

    console.log('Parent account email result', {
      recipient: params.recipientEmail,
      success: result
    });

    return result;
  }

  async sendAttendanceNotFilledEmail(params: {
    recipientEmail: string;
    recipientName: string;
    className: string;
    teacherName: string;
    studioId: string;
  }): Promise<boolean> {
    console.log('Preparing attendance not filled email', {
      recipient: params.recipientEmail,
      recipientName: params.recipientName,
      className: params.className,
      teacherName: params.teacherName
    });

    const dashboardUrl = `https://app.studioalignpro.com/dashboard/attendance`;

    const emailHtml = emailTemplates.attendanceNotFilled({
      recipient: { name: params.recipientName },
      className: params.className,
      teacherName: params.teacherName,
      dashboardUrl
    });

    const result = await this.sendEmail({
      to: params.recipientEmail,
      subject: 'Attendance Register Not Filled',
      html: emailHtml
    });

    console.log('Attendance not filled email result', {
      recipient: params.recipientEmail,
      success: result
    });

    return result;
  }

  async sendClassCapacityReachedEmail(params: {
    recipientEmail: string;
    recipientName: string;
    className: string;
    studioId: string;
  }): Promise<boolean> {
    console.log('Preparing class capacity reached email', {
      recipient: params.recipientEmail,
      recipientName: params.recipientName,
      className: params.className
    });

    const dashboardUrl = `https://app.studioalignpro.com/dashboard/classes`;

    const emailHtml = emailTemplates.classCapacity({
      recipient: { name: params.recipientName },
      className: params.className,
      dashboardUrl
    });

    const result = await this.sendEmail({
      to: params.recipientEmail,
      subject: 'Class Capacity Reached',
      html: emailHtml
    });

    console.log('Class capacity reached email result', {
      recipient: params.recipientEmail,
      success: result
    });

    return result;
  }

  async sendClassScheduleChangeEmail(params: {
    recipientEmail: string;
    recipientName: string;
    className: string;
    changes: string;
    studioId: string;
  }): Promise<boolean> {
    console.log('Preparing class schedule change email', {
      recipient: params.recipientEmail,
      recipientName: params.recipientName,
      className: params.className,
      changes: params.changes
    });

    const dashboardUrl = `https://app.studioalignpro.com/dashboard/classes`;

    const emailHtml = emailTemplates.classScheduleChange({
      recipient: { name: params.recipientName },
      className: params.className,
      changes: params.changes,
      dashboardUrl
    });

    const result = await this.sendEmail({
      to: params.recipientEmail,
      subject: 'Class Schedule Updated',
      html: emailHtml
    });

    console.log('Class schedule change email result', {
      recipient: params.recipientEmail,
      success: result
    });

    return result;
  }

  async sendNewMessageEmail(params: {
    recipientEmail: string;
    recipientName: string;
    senderName: string;
    messagePreview: string;
    conversationId: string;
  }): Promise<boolean> {
    console.log('Preparing new message email', {
      recipient: params.recipientEmail,
      recipientName: params.recipientName,
      senderName: params.senderName
    });

    const conversationUrl = `https://app.studioalignpro.com/dashboard/messages`;

    const emailHtml = emailTemplates.newMessage({
      recipient: { name: params.recipientName },
      senderName: params.senderName,
      messagePreview: params.messagePreview,
      conversationUrl
    });

    const result = await this.sendEmail({
      to: params.recipientEmail,
      subject: 'New Message',
      html: emailHtml
    });

    console.log('New message email result', {
      recipient: params.recipientEmail,
      success: result
    });

    return result;
  }

  async sendChannelActivityEmail(params: {
    recipientEmail: string;
    recipientName: string;
    type: 'post' | 'comment';
    channelName: string;
    authorName: string;
    content: string;
    channelId: string;
    postId: string;
  }): Promise<boolean> {
    console.log('Preparing channel activity email', {
      recipient: params.recipientEmail,
      recipientName: params.recipientName,
      type: params.type,
      channelName: params.channelName,
      authorName: params.authorName
    });

    const activityUrl = `https://app.studioalignpro.com/dashboard/channels`;

    const emailHtml = emailTemplates.channelActivity({
      recipient: { name: params.recipientName },
      type: params.type,
      channelName: params.channelName,
      authorName: params.authorName,
      content: params.content,
      activityUrl
    });

    const result = await this.sendEmail({
      to: params.recipientEmail,
      subject: `New ${params.type === 'post' ? 'Post' : 'Comment'} in ${params.channelName}`,
      html: emailHtml
    });

    console.log('Channel activity email result', {
      recipient: params.recipientEmail,
      success: result
    });

    return result;
  }

  async sendPaymentConfirmationEmail(params: {
    recipientEmail: string;
    recipientName: string;
    amount: number;
    invoiceId: string;
    currency: string;
    description?: string; // Add optional description
    invoiceNumber?: number; // Add optional invoice number
  }): Promise<boolean> {
    console.log('Preparing payment confirmation email', {
      recipient: params.recipientEmail,
      recipientName: params.recipientName,
      amount: params.amount,
      invoiceId: params.invoiceId
    });
  
    const invoiceUrl = `https://app.studioalignpro.com/dashboard/payments`;
  
    const emailHtml = emailTemplates.paymentConfirmation({
      recipient: { name: params.recipientName },
      amount: params.amount,
      invoiceId: params.invoiceId,
      invoiceUrl,
      currency: params.currency,
      description: params.description, // Pass description to the template
      invoiceNumber: params.invoiceNumber // Pass invoice number to the template
    });
  
    const result = await this.sendEmail({
      to: params.recipientEmail,
      subject: `Payment Confirmation${params.invoiceNumber ? ` - Invoice #${params.invoiceNumber}` : ''}`,
      html: emailHtml
    });
  
    console.log('Payment confirmation email result', {
      recipient: params.recipientEmail,
      success: result
    });
  
    return result;
  }

  async sendClassCancellationEmail(params: {
    recipientEmail: string;
    recipientName: string;
    className: string;
    date: string;
    reason?: string;
    studioId: string;
  }): Promise<boolean> {
    console.log('Preparing class cancellation email', {
      recipient: params.recipientEmail,
      recipientName: params.recipientName,
      className: params.className,
      date: params.date,
      reason: params.reason
    });

    const dashboardUrl = `https://app.studioalignpro.com/dashboard/classes`;

    const emailHtml = emailTemplates.classCancellation({
      recipient: { name: params.recipientName },
      className: params.className,
      date: params.date,
      reason: params.reason,
      dashboardUrl
    });

    const result = await this.sendEmail({
      to: params.recipientEmail,
      subject: 'Class Cancellation',
      html: emailHtml
    });

    console.log('Class cancellation email result', {
      recipient: params.recipientEmail,
      success: result
    });

    return result;
  }

  async testAuthToken(): Promise<boolean> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    
    if (!token) {
      console.error('No authentication token available');
      return false;
    }

    console.log('Token available:', token.substring(0, 10) + '...');
    
    // Try to access a protected resource to test the token
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .limit(1)
      .single();
      
    if (error) {
      console.error('Token validation failed:', error);
      return false;
    }
    
    console.log('Token is valid and working');
    return true;
    } catch (err) {
    console.error('Token validation error:', err);
    return false;
    }
  }
  
  async sendDocumentAssignedEmail(params: {
    recipientEmail: string;
    recipientName: string;
    documentName: string;
    requiresSignature: boolean;
    description?: string;
    studioId: string;
  }): Promise<boolean> {
    console.log('Preparing document assigned email', {
      recipient: params.recipientEmail,
      recipientName: params.recipientName,
      documentName: params.documentName,
      requiresSignature: params.requiresSignature
    });

    const dashboardUrl = `https://app.studioalignpro.com/dashboard/documents`;

    const emailHtml = emailTemplates.documentAssigned({
      recipient: { name: params.recipientName },
      documentName: params.documentName,
      requiresSignature: params.requiresSignature,
      description: params.description,
      dashboardUrl
    });

    const result = await this.sendEmail({
      to: params.recipientEmail,
      subject: 'New Document Assigned',
      html: emailHtml
    });

    console.log('Document assigned email result', {
      recipient: params.recipientEmail,
      success: result
    });

    return result;
  }

  async sendDocumentReminderEmail(params: {
    recipientEmail: string;
    recipientName: string;
    documentName: string;
    requiresSignature: boolean;
    studioId: string;
  }): Promise<boolean> {
    console.log('Preparing document reminder email', {
      recipient: params.recipientEmail,
      recipientName: params.recipientName,
      documentName: params.documentName,
      requiresSignature: params.requiresSignature
    });

    const dashboardUrl = `https://app.studioalignpro.com/dashboard/documents`;

    const emailHtml = emailTemplates.documentReminder({
      recipient: { name: params.recipientName },
      documentName: params.documentName,
      requiresSignature: params.requiresSignature,
      dashboardUrl
    });

    const result = await this.sendEmail({
      to: params.recipientEmail,
      subject: 'Document Reminder',
      html: emailHtml
    });

    console.log('Document reminder email result', {
      recipient: params.recipientEmail,
      success: result
    });

    return result;
  }

  async sendDocumentDeadlineEmail(params: {
    recipientEmail: string;
    recipientName: string;
    documentName: string;
    requiresSignature: boolean;
    unprocessedCount?: number;
    studioId: string;
  }): Promise<boolean> {
    console.log('Preparing document deadline email', {
      recipient: params.recipientEmail,
      recipientName: params.recipientName,
      documentName: params.documentName,
      requiresSignature: params.requiresSignature,
      unprocessedCount: params.unprocessedCount
    });

    const dashboardUrl = `https://app.studioalignpro.com/dashboard/documents`;

    const emailHtml = emailTemplates.documentDeadline({
      recipient: { name: params.recipientName },
      documentName: params.documentName,
      requiresSignature: params.requiresSignature,
      unprocessedCount: params.unprocessedCount,
      dashboardUrl
    });

    const result = await this.sendEmail({
      to: params.recipientEmail,
      subject: 'Document Deadline Missed',
      html: emailHtml
    });

    console.log('Document deadline email result', {
      recipient: params.recipientEmail,
      success: result
    });

    return result;
  }
}

// Create a singleton instance
export const emailService = new EmailService();

// IMPORTANT: Export default here
export default emailService;
