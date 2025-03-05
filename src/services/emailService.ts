// src/services/emailService.ts
import { supabase } from '../lib/supabase';
import * as emailTemplates from '../utils/emailTemplates';

export class EmailService {
  // Base method for sending emails via Supabase edge function
  private async sendEmail(params: {
    to: string;
    subject: string;
    html: string;
  }): Promise<boolean> {
    try {
      console.log(`Attempting to send email`, {
        recipient: params.to,
        subject: params.subject,
        htmlLength: params.html.length
      });

      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          to: params.to,
          subject: params.subject,
          html: params.html
        }
      });

      if (error) {
        console.error('Email sending error:', {
          recipient: params.to,
          subject: params.subject,
          errorDetails: error
        });
        return false;
      }

      console.log(`Email sent successfully`, {
        recipient: params.to,
        subject: params.subject
      });

      return true;
    } catch (err) {
      console.error('Comprehensive email sending error:', {
        recipient: params.to,
        subject: params.subject,
        errorDetails: err instanceof Error ? err.message : err
      });
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

    const emailHtml = emailTemplates.studentEnrollmentTemplate({
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

    const emailHtml = emailTemplates.consecutiveAbsencesTemplate({
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
  }): Promise<boolean> {
    console.log('Preparing payment overdue email', {
      recipient: params.recipientEmail,
      recipientName: params.recipientName,
      amount: params.amount,
      daysOverdue: params.daysOverdue,
      invoiceId: params.invoiceId
    });

    const invoiceUrl = `https://app.studioalignpro.com/dashboard/payments/${params.invoiceId}`;

    const emailHtml = emailTemplates.paymentOverdueTemplate({
      recipient: { name: params.recipientName },
      amount: params.amount,
      daysOverdue: params.daysOverdue,
      invoiceUrl,
      currency: params.currency
    });

    const result = await this.sendEmail({
      to: params.recipientEmail,
      subject: 'Payment Overdue',
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

    const dashboardUrl = `https://app.studioalignpro.com/dashboard/reports/financial`;

    const emailHtml = emailTemplates.monthlyFinancialSummaryTemplate({
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

    const dashboardUrl = `https://app.studioalignpro.com/dashboard/staff`;

    const emailHtml = emailTemplates.staffRegistrationTemplate({
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

    const emailHtml = emailTemplates.parentAccountTemplate({
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

    const emailHtml = emailTemplates.attendanceNotFilledTemplate({
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

    const emailHtml = emailTemplates.classCapacityTemplate({
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

    const emailHtml = emailTemplates.classScheduleChangeTemplate({
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

    const conversationUrl = `https://app.studioalignpro.com/dashboard/messages/${params.conversationId}`;

    const emailHtml = emailTemplates.newMessageTemplate({
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

    const activityUrl = `https://app.studioalignpro.com/dashboard/channels/${params.channelId}/posts/${params.postId}`;

    const emailHtml = emailTemplates.channelActivityTemplate({
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
  }): Promise<boolean> {
    console.log('Preparing payment confirmation email', {
      recipient: params.recipientEmail,
      recipientName: params.recipientName,
      amount: params.amount,
      invoiceId: params.invoiceId
    });

    const invoiceUrl = `https://app.studioalignpro.com/dashboard/payments/${params.invoiceId}`;

    const emailHtml = emailTemplates.paymentConfirmationTemplate({
      recipient: { name: params.recipientName },
      amount: params.amount,
      invoiceId: params.invoiceId,
      invoiceUrl,
      currency: params.currency
    });

    const result = await this.sendEmail({
      to: params.recipientEmail,
      subject: 'Payment Confirmation',
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

    const emailHtml = emailTemplates.classCancellationTemplate({
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
}

// Create a singleton instance
export const emailService = new EmailService();
export default emailService;