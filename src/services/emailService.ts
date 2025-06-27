// src/services/emailService.ts
import { supabase, supabaseAdmin } from "../lib/supabase";
import { emailTemplates } from "../utils/emailTemplates";

export class EmailService {
	private async sendEmail(params: {
		to: string;
		subject: string;
		html: string;
	}): Promise<boolean> {
		try {
			const { data: result, error } = await supabaseAdmin.functions.invoke(
				"send-mail",
				{
					body: {
						to: params.to,
						subject: params.subject,
						html: params.html,
					},
				}
			);

			if (error) {
				console.error("Email sending error:", error);
				return false;
			}

			return true;
		} catch (err) {
			console.error("Email sending error:", err);
			return false;
		}
	}

	// Test email configuration
	async testEmailConfiguration(email: string): Promise<boolean> {
		const testEmailHtml = `
      <h1>StudioAlign Email Configuration Test</h1>
      <p>If you can read this, your email configuration is working correctly.</p>
      <p>Sent: ${new Date().toLocaleString()}</p>
    `;

		try {
			const result = await this.sendEmail({
				to: email,
				subject: "StudioAlign Email Configuration Test",
				html: testEmailHtml,
			});

			return result;
		} catch (err) {
			console.error("Email configuration test failed:", err);
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

		const emailHtml = emailTemplates.studentEnrollment({
			recipient: { name: params.recipientName },
			studentName: params.studentName,
			className: params.className,
			dashboardUrl,
		});

		const result = await this.sendEmail({
			to: params.recipientEmail,
			subject: "New Student Enrollment",
			html: emailHtml,
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
		const dashboardUrl = `https://app.studioalignpro.com/dashboard/attendance`;

		const emailHtml = emailTemplates.consecutiveAbsences({
			recipient: { name: params.recipientName },
			studentName: params.studentName,
			className: params.className,
			absenceCount: params.absenceCount,
			dashboardUrl,
		});

		const result = await this.sendEmail({
			to: params.recipientEmail,
			subject: "Student Consecutive Absences Alert",
			html: emailHtml,
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
		const invoiceUrl = `https://app.studioalignpro.com/dashboard/payments`;

		const emailHtml = emailTemplates.paymentOverdue({
			recipient: { name: params.recipientName },
			amount: params.amount,
			daysOverdue: params.daysOverdue,
			invoiceUrl,
			currency: params.currency,
		});

		const result = await this.sendEmail({
			to: params.recipientEmail,
			subject: "Payment Overdue",
			html: emailHtml,
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
		const dashboardUrl = `https://app.studioalignpro.com/dashboard/payments`;

		const emailHtml = emailTemplates.monthlyFinancialSummary({
			recipient: { name: params.recipientName },
			month: params.month,
			revenue: params.revenue,
			expenses: params.expenses,
			profit: params.profit,
			currency: params.currency,
			dashboardUrl,
		});

		const result = await this.sendEmail({
			to: params.recipientEmail,
			subject: `Monthly Financial Summary - ${params.month}`,
			html: emailHtml,
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
		const dashboardUrl = `https://app.studioalignpro.com/dashboard/teachers`;

		const emailHtml = emailTemplates.staffRegistration({
			recipient: { name: params.recipientName },
			staffName: params.staffName,
			role: params.role,
			dashboardUrl,
		});

		const result = await this.sendEmail({
			to: params.recipientEmail,
			subject: "New Staff Registration",
			html: emailHtml,
		});

		return result;
	}

	async sendParentAccountEmail(params: {
		recipientEmail: string;
		recipientName: string;
		parentName: string;
		type: "registration" | "deletion";
		studioId: string;
	}): Promise<boolean> {
		const dashboardUrl = `https://app.studioalignpro.com/dashboard/parents`;

		const emailHtml = emailTemplates.parentAccount({
			recipient: { name: params.recipientName },
			parentName: params.parentName,
			type: params.type,
			dashboardUrl,
		});

		const result = await this.sendEmail({
			to: params.recipientEmail,
			subject: `Parent Account ${
				params.type === "registration" ? "Registration" : "Deletion"
			}`,
			html: emailHtml,
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
		const dashboardUrl = `https://app.studioalignpro.com/dashboard/attendance`;

		const emailHtml = emailTemplates.attendanceNotFilled({
			recipient: { name: params.recipientName },
			className: params.className,
			teacherName: params.teacherName,
			dashboardUrl,
		});

		const result = await this.sendEmail({
			to: params.recipientEmail,
			subject: "Attendance Register Not Filled",
			html: emailHtml,
		});
		return result;
	}

	async sendClassCapacityReachedEmail(params: {
		recipientEmail: string;
		recipientName: string;
		className: string;
		studioId: string;
	}): Promise<boolean> {
		const dashboardUrl = `https://app.studioalignpro.com/dashboard/classes`;

		const emailHtml = emailTemplates.classCapacity({
			recipient: { name: params.recipientName },
			className: params.className,
			dashboardUrl,
		});

		const result = await this.sendEmail({
			to: params.recipientEmail,
			subject: "Class Capacity Reached",
			html: emailHtml,
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
		const dashboardUrl = `https://app.studioalignpro.com/dashboard/classes`;

		const emailHtml = emailTemplates.classScheduleChange({
			recipient: { name: params.recipientName },
			className: params.className,
			changes: params.changes,
			dashboardUrl,
		});

		const result = await this.sendEmail({
			to: params.recipientEmail,
			subject: "Class Schedule Updated",
			html: emailHtml,
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
		const conversationUrl = `https://app.studioalignpro.com/dashboard/messages`;

		const emailHtml = emailTemplates.newMessage({
			recipient: { name: params.recipientName },
			senderName: params.senderName,
			messagePreview: params.messagePreview,
			conversationUrl,
		});

		const result = await this.sendEmail({
			to: params.recipientEmail,
			subject: "New Message",
			html: emailHtml,
		});

		return result;
	}

	async sendChannelActivityEmail(params: {
		recipientEmail: string;
		recipientName: string;
		type: "post" | "comment";
		channelName: string;
		authorName: string;
		content: string;
		channelId: string;
		postId: string;
	}): Promise<boolean> {
		const activityUrl = `https://app.studioalignpro.com/dashboard/channels`;

		const emailHtml = emailTemplates.channelActivity({
			recipient: { name: params.recipientName },
			type: params.type,
			channelName: params.channelName,
			authorName: params.authorName,
			content: params.content,
			activityUrl,
		});

		const result = await this.sendEmail({
			to: params.recipientEmail,
			subject: `New ${params.type === "post" ? "Post" : "Comment"} in ${
				params.channelName
			}`,
			html: emailHtml,
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
		const invoiceUrl = `https://app.studioalignpro.com/dashboard/payments`;

		const emailHtml = emailTemplates.paymentConfirmation({
			recipient: { name: params.recipientName },
			amount: params.amount,
			invoiceId: params.invoiceId,
			invoiceUrl,
			currency: params.currency,
		});

		const result = await this.sendEmail({
			to: params.recipientEmail,
			subject: "Payment Confirmation",
			html: emailHtml,
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
		const dashboardUrl = `https://app.studioalignpro.com/dashboard/classes`;

		const emailHtml = emailTemplates.classCancellation({
			recipient: { name: params.recipientName },
			className: params.className,
			date: params.date,
			reason: params.reason,
			dashboardUrl,
		});

		const result = await this.sendEmail({
			to: params.recipientEmail,
			subject: "Class Cancellation",
			html: emailHtml,
		});

		return result;
	}

	async testAuthToken(): Promise<boolean> {
		try {
			const {
				data: { session },
			} = await supabase.auth.getSession();
			const token = session?.access_token;

			if (!token) {
				console.error("No authentication token available");
				return false;
			}

			// Try to access a protected resource to test the token
			const { error } = await supabase
				.from("users")
				.select("id")
				.limit(1)
				.single();

			if (error) {
				console.error("Token validation failed:", error);
				return false;
			}

			return true;
		} catch (err) {
			console.error("Token validation error:", err);
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
		const dashboardUrl = `https://app.studioalignpro.com/dashboard/documents`;

		const emailHtml = emailTemplates.documentAssigned({
			recipient: { name: params.recipientName },
			documentName: params.documentName,
			requiresSignature: params.requiresSignature,
			description: params.description,
			dashboardUrl,
		});

		const result = await this.sendEmail({
			to: params.recipientEmail,
			subject: "New Document Assigned",
			html: emailHtml,
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
		const dashboardUrl = `https://app.studioalignpro.com/dashboard/documents`;

		const emailHtml = emailTemplates.documentReminder({
			recipient: { name: params.recipientName },
			documentName: params.documentName,
			requiresSignature: params.requiresSignature,
			dashboardUrl,
		});

		const result = await this.sendEmail({
			to: params.recipientEmail,
			subject: "Document Reminder",
			html: emailHtml,
		});

		return result;
	}

	async sendClassAssignedEmail(params: {
		recipientEmail: string;
		recipientName: string;
		className: string;
		classId: string;
		studioId: string;
		schedule: {
			startTime: string;
			endTime: string;
			dayOfWeek?: string | null;
			date?: string | null;
			endDate?: string | null;
			isRecurring: boolean;
			location?: string;
		};
	}): Promise<boolean> {
		const baseUrl = window.location.origin;
		const dashboardUrl = `${baseUrl}/dashboard/classes`;

		// Make sure this function exists in your emailTemplates
		const emailHtml = emailTemplates.sendClassAssignedEmail({
			recipient: { name: params.recipientName },
			className: params.className,
			scheduleDetails: params.schedule,
			dashboardUrl,
		});

		const result = await this.sendEmail({
			to: params.recipientEmail,
			subject: `Class Assignment: ${params.className}`,
			html: emailHtml,
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
		const dashboardUrl = `https://app.studioalignpro.com/dashboard/documents`;

		const emailHtml = emailTemplates.documentDeadline({
			recipient: { name: params.recipientName },
			documentName: params.documentName,
			requiresSignature: params.requiresSignature,
			unprocessedCount: params.unprocessedCount,
			dashboardUrl,
		});

		const result = await this.sendEmail({
			to: params.recipientEmail,
			subject: "Document Deadline Missed",
			html: emailHtml,
		});

		return result;
	}

	async sendInvitationEmail(params: {
		recipientEmail: string;
		inviterName: string;
		studioName: string;
		role: string;
		invitationUrl: string;
	}): Promise<boolean> {
		const emailHtml = emailTemplates.invitation({
			recipientEmail: params.recipientEmail,
			inviterName: params.inviterName,
			studioName: params.studioName,
			role: params.role,
			invitationUrl: params.invitationUrl,
		});

		const result = await this.sendEmail({
			to: params.recipientEmail,
			subject: `Join ${params.studioName} as ${params.role}`,
			html: emailHtml,
		});
		return result;
	}
}

// Create a singleton instance
export const emailService = new EmailService();

// IMPORTANT: Export default here
export default emailService;
