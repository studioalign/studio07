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
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          to: params.to,
          subject: params.subject,
          html: params.html
        }
      });

      if (error) {
        console.error('Email sending error:', error);
        return false;
      }

      return true;
    } catch (err) {
      console.error('Comprehensive email sending error:', err);
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
    const dashboardUrl = `https://app.studioalignpro.com/dashboard/students`;

    const emailHtml = emailTemplates.studentEnrollmentTemplate({
      recipient: { name: params.recipientName },
      studentName: params.studentName,
      className: params.className,
      dashboardUrl
    });

    return this.sendEmail({
      to: params.recipientEmail,
      subject: 'New Student Enrollment',
      html: emailHtml
    });
  }

  async sendConsecutiveAbsencesEmail(params: {
    recipientEmail: string;
    recipientName: string;
    studentName: string;
    className: string;
    absenceCount: number;
    studioId: string;
  }): Promise<boolean> {
    const dashboardUrl = `https://app.studioalignpro.com/dashboard/attendance`;

    const emailHtml = emailTemplates.consecutiveAbsencesTemplate({
      recipient: { name: params.recipientName },
      studentName: params.studentName,
      className: params.className,
      absenceCount: params.absenceCount,
      dashboardUrl
    });

    return this.sendEmail({
      to: params.recipientEmail,
      subject: 'Student Consecutive Absences Alert',
      html: emailHtml
    });
  }

  async sendPaymentOverdueEmail(params: {
    recipientEmail: string;
    recipientName: string;
    amount: number;
    daysOverdue: number;
    invoiceId: string;
    currency: string;
  }): Promise<boolean> {
    const invoiceUrl = `https://app.studioalignpro.com/dashboard/payments/${params.invoiceId}`;

    const emailHtml = emailTemplates.paymentOverdueTemplate({
      recipient: { name: params.recipientName },
      amount: params.amount,
      daysOverdue: params.daysOverdue,
      invoiceUrl,
      currency: params.currency
    });

    return this.sendEmail({
      to: params.recipientEmail,
      subject: 'Payment Overdue',
      html: emailHtml
    });
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

    return this.sendEmail({
      to: params.recipientEmail,
      subject: `Monthly Financial Summary - ${params.month}`,
      html: emailHtml
    });
  }

  async sendStaffRegistrationEmail(params: {
    recipientEmail: string;
    recipientName: string;
    staffName: string;
    role: string;
    studioId: string;
  }): Promise<boolean> {
    const dashboardUrl = `https://app.studioalignpro.com/dashboard/staff`;

    const emailHtml = emailTemplates.staffRegistrationTemplate({
      recipient: { name: params.recipientName },
      staffName: params.staffName,
      role: params.role,
      dashboardUrl
    });

    return this.sendEmail({
      to: params.recipientEmail,
      subject: 'New Staff Registration',
      html: emailHtml
    });
  }

  async sendParentAccountEmail(params: {
    recipientEmail: string;
    recipientName: string;
    parentName: string;
    type: 'registration' | 'deletion';
    studioId: string;
  }): Promise<boolean> {
    const dashboardUrl = `https://app.studioalignpro.com/dashboard/parents`;

    const emailHtml = emailTemplates.parentAccountTemplate({
      recipient: { name: params.recipientName },
      parentName: params.parentName,
      type: params.type,
      dashboardUrl
    });

    return this.sendEmail({
      to: params.recipientEmail,
      subject: `Parent Account ${params.type === 'registration' ? 'Registration' : 'Deletion'}`,
      html: emailHtml
    });
  }

  async sendAttendanceNotFilledEmail(params: {
    recipientEmail: string;
    recipientName: string;
    className: string;
    teacherName: string;
    studioId: string;
  }): Promise<boolean> {
    const dashboardUrl = `https://app.studioalignpro.com/dashboard/attendance`;

    const emailHtml = emailTemplates.attendanceNotFilledTemplate({
      recipient: { name: params.recipientName },
      className: params.className,
      teacherName: params.teacherName,
      dashboardUrl
    });

    return this.sendEmail({
      to: params.recipientEmail,
      subject: 'Attendance Register Not Filled',
      html: emailHtml
    });
  }

  async sendClassCapacityReachedEmail(params: {
    recipientEmail: string;
    recipientName: string;
    className: string;
    studioId: string;
  }): Promise<boolean> {
    const dashboardUrl = `https://app.studioalignpro.com/dashboard/classes`;

    const emailHtml = emailTemplates.classCapacityTemplate({
      recipient: { name: params.recipientName },
      className: params.className,
      dashboardUrl
    });

    return this.sendEmail({
      to: params.recipientEmail,
      subject: 'Class Capacity Reached',
      html: emailHtml
    });
  }

  async sendClassScheduleChangeEmail(params: {
    recipientEmail: string;
    recipientName: string;
    className: string;
    changes: string;
    studioId: string;
  }): Promise<boolean> {
    const dashboardUrl = `https://app.studioalignpro.com/dashboard/classes`;

    const emailHtml = emailTemplates.classScheduleChangeTemplate({
      recipient: { name: params.recipientName },
      className: params.className,
      changes: params.changes,
      dashboardUrl
    });

    return this.sendEmail({
      to: params.recipientEmail,
      subject: 'Class Schedule Updated',
      html: emailHtml
    });
  }

  async sendNewMessageEmail(params: {
    recipientEmail: string;
    recipientName: string;
    senderName: string;
    messagePreview: string;
    conversationId: string;
  }): Promise<boolean> {
    const conversationUrl = `https://app.studioalignpro.com/dashboard/messages/${params.conversationId}`;

    const emailHtml = emailTemplates.newMessageTemplate({
      recipient: { name: params.recipientName },
      senderName: params.senderName,
      messagePreview: params.messagePreview,
      conversationUrl
    });

    return this.sendEmail({
      to: params.recipientEmail,
      subject: 'New Message',
      html: emailHtml
    });
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
    const activityUrl = `https://app.studioalignpro.com/dashboard/channels/${params.channelId}/posts/${params.postId}`;

    const emailHtml = emailTemplates.channelActivityTemplate({
      recipient: { name: params.recipientName },
      type: params.type,
      channelName: params.channelName,
      authorName: params.authorName,
      content: params.content,
      activityUrl
    });

    return this.sendEmail({
      to: params.recipientEmail,
      subject: `New ${params.type === 'post' ? 'Post' : 'Comment'} in ${params.channelName}`,
      html: emailHtml
    });
  }

  async sendPaymentConfirmationEmail(params: {
    recipientEmail: string;
    recipientName: string;
    amount: number;
    invoiceId: string;
    currency: string;
  }): Promise<boolean> {
    const invoiceUrl = `https://app.studioalignpro.com/dashboard/payments/${params.invoiceId}`;

    const emailHtml = emailTemplates.paymentConfirmationTemplate({
      recipient: { name: params.recipientName },
      amount: params.amount,
      invoiceId: params.invoiceId,
      invoiceUrl,
      currency: params.currency
    });

    return this.sendEmail({
      to: params.recipientEmail,
      subject: 'Payment Confirmation',
      html: emailHtml
    });
  }

  async sendClassCancellationEmail(params: {
    recipientEmail: string;
    recipientName: string;
    className: string;
    date: string;
    reason?: string;
    studioId: string;
  }): Promise<boolean> {
    const dashboardUrl = `https://app.studioalignpro.com/dashboard/classes`;

    const emailHtml = emailTemplates.classCancellationTemplate({
      recipient: { name: params.recipientName },
      className: params.className,
      date: params.date,
      reason: params.reason,
      dashboardUrl
    });

    return this.sendEmail({
      to: params.recipientEmail,
      subject: 'Class Cancellation',
      html: emailHtml
    });
  }
}

// Create a singleton instance
export const emailService = new EmailService();
export default emailService;