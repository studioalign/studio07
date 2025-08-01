import { formatCurrency, formatDate } from "./formatters";

// Base template interface
interface BaseTemplateParams {
	recipient: { name: string };
}

// Generic base template function
export function generateBaseTemplate(params: {
	recipient: { name: string };
	content: string;
	title?: string;
}) {
	return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${params.title || "StudioAlign Notification"}</title>
      <style>
        body { 
          font-family: 'Inter', Arial, sans-serif; 
          line-height: 1.6; 
          color: #333; 
          background-color: #f4f6f9;
          margin: 0;
          padding: 0;
        }
        .container { 
          max-width: 600px; 
          margin: 0 auto; 
          padding: 20px; 
          background-color: white;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          border-radius: 8px;
        }
        .header { 
          background-color: #131a56; 
          color: white;
          padding: 20px; 
          text-align: center;
          border-top-left-radius: 8px;
          border-top-right-radius: 8px;
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
        }
        .content { 
          background-color: white; 
          padding: 30px; 
          border-bottom-left-radius: 8px;
          border-bottom-right-radius: 8px;
        }
        .btn {
          display: inline-block;
          background-color: #131a56;
          color: white;
          padding: 12px 24px;
          text-decoration: none;
          border-radius: 6px;
          margin-top: 20px;
        }
        .alert {
          background-color: #FFF4E5;
          border-left: 4px solid #e6a4fe;
          padding: 15px;
          margin-top: 20px;
        }
        .table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
        }
        .table th, .table td {
          border: 1px solid #ddd;
          padding: 8px;
          text-align: left;
        }
        .table th {
          background-color: #f2f2f2;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>StudioAlign</h1>
        </div>
        <div class="content">
          <p>Hi ${params.recipient.name},</p>
          ${params.content}
          <p style="margin-top: 20px;">Best regards,<br>StudioAlign Team</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// Specific email template types
export interface StudentEnrollmentParams extends BaseTemplateParams {
	studentName: string;
	className: string;
	dashboardUrl: string;
}

export interface ConsecutiveAbsencesParams extends BaseTemplateParams {
	studentName: string;
	className: string;
	absenceCount: number;
	dashboardUrl: string;
}

export interface PaymentOverdueParams extends BaseTemplateParams {
	amount: number;
	daysOverdue: number;
	invoiceUrl: string;
	currency: string;
}

export interface MonthlyFinancialSummaryParams extends BaseTemplateParams {
	month: string;
	revenue: number;
	expenses: number;
	profit: number;
	currency: string;
	dashboardUrl: string;
}

export interface StaffRegistrationParams extends BaseTemplateParams {
	staffName: string;
	role: string;
	dashboardUrl: string;
}

export interface ParentAccountParams extends BaseTemplateParams {
	parentName: string;
	type: "registration" | "deletion";
	dashboardUrl: string;
}

export interface AttendanceNotFilledParams extends BaseTemplateParams {
	className: string;
	teacherName: string;
	dashboardUrl: string;
}

export interface ClassCapacityParams extends BaseTemplateParams {
	className: string;
	dashboardUrl: string;
}

export interface ClassScheduleChangeParams extends BaseTemplateParams {
	className: string;
	changes: string;
	dashboardUrl: string;
}

export interface NewMessageParams extends BaseTemplateParams {
	senderName: string;
	messagePreview: string;
	conversationUrl: string;
}

export interface ChannelActivityParams extends BaseTemplateParams {
	type: "post" | "comment";
	channelName: string;
	authorName: string;
	content: string;
	activityUrl: string;
}

export interface PaymentConfirmationParams extends BaseTemplateParams {
	amount: number;
	invoiceId: string;
	invoiceUrl: string;
	currency: string;
}

export interface ClassCancellationParams extends BaseTemplateParams {
	className: string;
	date: string;
	reason?: string;
	dashboardUrl: string;
}

export interface DocumentAssignedParams extends BaseTemplateParams {
	documentName: string;
	requiresSignature: boolean;
	description?: string;
	dashboardUrl: string;
}

export interface DocumentReminderParams extends BaseTemplateParams {
	documentName: string;
	requiresSignature: boolean;
	dashboardUrl: string;
}

export interface DocumentDeadlineParams extends BaseTemplateParams {
	documentName: string;
	requiresSignature: boolean;
	unprocessedCount?: number;
	dashboardUrl: string;
}

export interface ClassAssignedParams extends BaseTemplateParams {
	className: string;
	scheduleDetails: {
		startTime: string;
		endTime: string;
		dayOfWeek?: string | null;
		date?: string | null;
		endDate?: string | null;
		isRecurring: boolean;
		location?: string;
	};
	dashboardUrl: string;
}

export interface InvitationParams {
	recipientEmail: string;
	inviterName: string;
	studioName: string;
	role: string;
	invitationUrl: string;
}

// Template generator functions
export function studentEnrollmentTemplate(params: StudentEnrollmentParams) {
	const content = `
    <h2>New Student Enrollment</h2>
    <p>${params.studentName} has enrolled in ${params.className}.</p>
    <a href="${params.dashboardUrl}" class="btn">View Student Details</a>
  `;

	return generateBaseTemplate({
		recipient: params.recipient,
		content,
		title: "New Student Enrollment",
	});
}

export function consecutiveAbsencesTemplate(params: ConsecutiveAbsencesParams) {
	const content = `
    <div class="alert">
      <h2>Student Attendance Concern</h2>
      <p>${params.studentName} has missed ${params.absenceCount} consecutive classes in ${params.className}.</p>
    </div>
    <a href="${params.dashboardUrl}" class="btn">View Attendance Details</a>
  `;

	return generateBaseTemplate({
		recipient: params.recipient,
		content,
		title: "Student Consecutive Absences",
	});
}

export function paymentOverdueTemplate(params: PaymentOverdueParams) {
	const formattedAmount = formatCurrency(params.amount, params.currency);

	const content = `
    <div class="alert">
      <h2>Payment Overdue</h2>
      <p>Your payment of ${formattedAmount} is ${params.daysOverdue} days overdue.</p>
      <p>Please complete your payment to avoid any additional fees.</p>
    </div>
    <a href="${params.invoiceUrl}" class="btn">View Invoice</a>
  `;

	return generateBaseTemplate({
		recipient: params.recipient,
		content,
		title: "Payment Overdue",
	});
}

export function monthlyFinancialSummaryTemplate(
	params: MonthlyFinancialSummaryParams
) {
	const formatCurrencyFn = (amount: number) =>
		formatCurrency(amount, params.currency);

	const content = `
    <h2>Monthly Financial Summary - ${params.month}</h2>
    <table class="table">
      <tr>
        <th>Revenue</th>
        <td>${formatCurrencyFn(params.revenue)}</td>
      </tr>
      <tr>
        <th>Expenses</th>
        <td>${formatCurrencyFn(params.expenses)}</td>
      </tr>
      <tr>
        <th>Profit</th>
        <td>${formatCurrencyFn(params.profit)}</td>
      </tr>
    </table>
    <a href="${params.dashboardUrl}" class="btn">View Full Report</a>
  `;

	return generateBaseTemplate({
		recipient: params.recipient,
		content,
		title: `Financial Summary - ${params.month}`,
	});
}

export function staffRegistrationTemplate(params: StaffRegistrationParams) {
	const content = `
    <h2>New Staff Registration</h2>
    <p>${params.staffName} has registered as a ${params.role}.</p>
    <a href="${params.dashboardUrl}" class="btn">View Staff Profile</a>
  `;

	return generateBaseTemplate({
		recipient: params.recipient,
		content,
		title: "New Staff Registration",
	});
}

export function parentAccountTemplate(params: ParentAccountParams) {
	const content = `
    <h2>Parent Account ${
			params.type === "registration" ? "Registration" : "Deletion"
		}</h2>
    <p>${params.parentName} has ${
		params.type === "registration"
			? "registered a new account"
			: "deleted their account"
	}.</p>
    <a href="${params.dashboardUrl}" class="btn">View Details</a>
  `;

	return generateBaseTemplate({
		recipient: params.recipient,
		content,
		title: `Parent Account ${
			params.type === "registration" ? "Registration" : "Deletion"
		}`,
	});
}

export function attendanceNotFilledTemplate(params: AttendanceNotFilledParams) {
	const content = `
    <div class="alert">
      <h2>Attendance Register Not Filled</h2>
      <p>${params.teacherName} has not filled the attendance register for ${params.className}.</p>
    </div>
    <a href="${params.dashboardUrl}" class="btn">Fill Attendance</a>
  `;

	return generateBaseTemplate({
		recipient: params.recipient,
		content,
		title: "Attendance Register Pending",
	});
}

export function classCapacityTemplate(params: ClassCapacityParams) {
	const content = `
    <div class="alert">
      <h2>Class Capacity Reached</h2>
      <p>${params.className} has reached its maximum capacity.</p>
    </div>
    <a href="${params.dashboardUrl}" class="btn">View Class Details</a>
  `;

	return generateBaseTemplate({
		recipient: params.recipient,
		content,
		title: "Class Capacity Reached",
	});
}

export function classScheduleChangeTemplate(params: ClassScheduleChangeParams) {
	const content = `
    <h2>Class Schedule Updated</h2>
    <p>Schedule for ${params.className} has been updated:</p>
    <blockquote>${params.changes}</blockquote>
    <a href="${params.dashboardUrl}" class="btn">View Updated Schedule</a>
  `;

	return generateBaseTemplate({
		recipient: params.recipient,
		content,
		title: "Class Schedule Change",
	});
}

export function newMessageTemplate(params: NewMessageParams) {
	const content = `
    <h2>New Message</h2>
    <p>You have a new message from ${params.senderName}:</p>
    <blockquote>${params.messagePreview}</blockquote>
    <a href="${params.conversationUrl}" class="btn">View Message</a>
  `;

	return generateBaseTemplate({
		recipient: params.recipient,
		content,
		title: "New Message",
	});
}

export function channelActivityTemplate(params: ChannelActivityParams) {
	const typeText = params.type === "post" ? "Posted" : "Commented";
	const content = `
    <h2>New Channel Activity</h2>
    <p>${params.authorName} ${typeText} in ${params.channelName}:</p>
    <blockquote>${params.content}</blockquote>
    <a href="${params.activityUrl}" class="btn">View ${
		typeText === "Posted" ? "Post" : "Comment"
	}</a>
  `;

	return generateBaseTemplate({
		recipient: params.recipient,
		content,
		title: `New ${params.type === "post" ? "Post" : "Comment"} in ${
			params.channelName
		}`,
	});
}

export function paymentConfirmationTemplate(params: PaymentConfirmationParams) {
	const formattedAmount = formatCurrency(params.amount, params.currency);

	const content = `
    <h2>Payment Confirmation</h2>
    <p>Your payment of ${formattedAmount} has been received. Thank you!</p>
    <a href="${params.invoiceUrl}" class="btn">View Invoice</a>
  `;

	return generateBaseTemplate({
		recipient: params.recipient,
		content,
		title: "Payment Confirmation",
	});
}

export function classCancellationTemplate(params: ClassCancellationParams) {
	const content = `
    <div class="alert">
      <h2>Class Cancellation</h2>
      <p>${params.className} on ${formatDate(
		params.date
	)} has been cancelled.</p>
      ${params.reason ? `<p>Reason: ${params.reason}</p>` : ""}
    </div>
    <a href="${params.dashboardUrl}" class="btn">View Details</a>
  `;

	return generateBaseTemplate({
		recipient: params.recipient,
		content,
		title: "Class Cancellation",
	});
}

export function documentAssignedTemplate(params: DocumentAssignedParams) {
	const action = params.requiresSignature ? "sign" : "view";
	const content = `
    <h2>New Document Assigned</h2>
    <p>A new document "${
			params.documentName
		}" has been assigned to you for ${action}ing.</p>
    ${params.description ? `<p>Description: ${params.description}</p>` : ""}
    <a href="${params.dashboardUrl}" class="btn">Go to Document</a>
  `;

	return generateBaseTemplate({
		recipient: params.recipient,
		content,
		title: "New Document Assigned",
	});
}

export function documentReminderTemplate(params: DocumentReminderParams) {
	const action = params.requiresSignature ? "sign" : "view";
	const content = `
    <h2>Document Reminder</h2>
    <p>This is a reminder to ${action} the document "${params.documentName}".</p>
    <a href="${params.dashboardUrl}" class="btn">Go to Document</a>
  `;

	return generateBaseTemplate({
		recipient: params.recipient,
		content,
		title: "Document Reminder",
	});
}

export function documentDeadlineTemplate(params: DocumentDeadlineParams) {
	const action = params.requiresSignature ? "signed" : "viewed";
	const content = `
    <div class="alert">
      <h2>Document Deadline Passed</h2>
      ${
				params.unprocessedCount !== undefined
					? `<p>${params.unprocessedCount} recipient(s) did not ${action} the document "${params.documentName}".</p>`
					: `<p>The deadline for the document "${params.documentName}" has passed.</p>`
			}
    </div>
    <a href="${params.dashboardUrl}" class="btn">Go to Document</a>
  `;

	return generateBaseTemplate({
		recipient: params.recipient,
		content,
		title: "Document Deadline Missed",
	});
}

export function sendClassAssignedEmail(params: ClassAssignedParams) {
	const formatTimeStr = (time: string) => {
		return new Date(`2000-01-01T${time}`).toLocaleTimeString([], {
			hour: "numeric",
			minute: "2-digit",
		});
	};

	// Format schedule information
	let scheduleInfo = "";
	if (params.scheduleDetails.isRecurring && params.scheduleDetails.dayOfWeek) {
		const days = [
			"Sunday",
			"Monday",
			"Tuesday",
			"Wednesday",
			"Thursday",
			"Friday",
			"Saturday",
		];
		const dayName = days[parseInt(params.scheduleDetails.dayOfWeek)];
		scheduleInfo = `Weekly on ${dayName}s from ${formatTimeStr(
			params.scheduleDetails.startTime
		)} to ${formatTimeStr(params.scheduleDetails.endTime)}`;
		if (params.scheduleDetails.endDate) {
			scheduleInfo += ` until ${new Date(
				params.scheduleDetails.endDate
			).toLocaleDateString()}`;
		}
	} else if (params.scheduleDetails.date) {
		scheduleInfo = `On ${new Date(
			params.scheduleDetails.date
		).toLocaleDateString()} from ${formatTimeStr(
			params.scheduleDetails.startTime
		)} to ${formatTimeStr(params.scheduleDetails.endTime)}`;
	} else {
		scheduleInfo = `From ${formatTimeStr(
			params.scheduleDetails.startTime
		)} to ${formatTimeStr(params.scheduleDetails.endTime)}`;
	}

	if (params.scheduleDetails.location) {
		scheduleInfo += ` at ${params.scheduleDetails.location}`;
	}

	const content = `
    <h2>Class Assignment</h2>
    <p>You have been assigned to teach the class "${params.className}".</p>
    <div style="background-color: #f8f9fa; padding: 15px; border-radius: 6px; margin: 15px 0;">
      <p><strong>Schedule:</strong> ${scheduleInfo}</p>
    </div>
    <p>Please review the class details and prepare accordingly.</p>
    <a href="${params.dashboardUrl}" class="btn">View Class Details</a>
  `;

	return generateBaseTemplate({
		recipient: params.recipient,
		content,
		title: "Class Assignment",
	});
}

export function invitationTemplate(params: InvitationParams) {
	const content = `
    <div style="text-align: center; padding: 20px;">
      <h1 style="color: #333; margin-bottom: 20px;">You're Invited!</h1>
      <p style="font-size: 16px; color: #666; margin-bottom: 30px;">
        ${params.inviterName} has invited you to join <strong>${params.studioName}</strong> as a <strong>${params.role}</strong>.
      </p>
      <div style="margin: 30px 0;">
        <a href="${params.invitationUrl}" 
           style="background-color: #4F46E5; color: white; padding: 12px 24px; 
                  text-decoration: none; border-radius: 6px; font-weight: 500;">
          Create Your Account
        </a>
      </div>
      <p style="font-size: 14px; color: #666; margin-top: 30px;">
        This invitation link will expire in 7 days.
      </p>
    </div>
  `;

	return generateBaseTemplate({
		recipient: { name: params.recipientEmail.split("@")[0] },
		content,
		title: "Studio Invitation",
	});
}

export interface PaymentRequestParams extends BaseTemplateParams {
  amount: number;
  dueDate: string;
  invoiceUrl: string;
  currency: string;
  paymentMethod: string;
}

export function paymentRequestTemplate(params: PaymentRequestParams) {
  const formattedAmount = formatCurrency(params.amount, params.currency);
  const formattedDueDate = new Date(params.dueDate).toLocaleDateString();

  const content = `
    <h2>New Invoice - Payment Required</h2>
    <p>A new invoice has been created for you.</p>
    <div style="background-color: #f9fafb; padding: 15px; margin: 20px 0; border-radius: 5px;">
      <p><strong>Amount:</strong> ${formattedAmount}</p>
      <p><strong>Due Date:</strong> ${formattedDueDate}</p>
      ${params.paymentMethod === 'bacs' ? 
        '<p><strong>Payment Method:</strong> Bank Transfer Required</p>' :
        '<p><strong>Payment Method:</strong> Card Payment</p>'
      }
    </div>
    ${params.paymentMethod === 'bacs' ? 
      '<p>Please make payment via bank transfer using the details provided in your invoice.</p>' :
      '<p>Please complete your payment at your earliest convenience.</p>'
    }
    <a href="${params.invoiceUrl}" class="btn">View Invoice</a>
  `;

  return generateBaseTemplate({
    recipient: params.recipient,
    content,
    title: "New Invoice",
  });
}

export interface RefundPendingParams extends BaseTemplateParams {
  amount: number;
  currency: string;
  invoiceReference: string;
  reason: string;
  refundMethod: 'stripe' | 'bank_transfer';
}

export function refundPendingTemplate(params: RefundPendingParams) {
  const formattedAmount = formatCurrency(params.amount, params.currency);
  
  const content = params.refundMethod === 'bank_transfer' ? `
    <h2>Bank Transfer Refund Pending</h2>
    <p>We are processing a refund for your payment via bank transfer.</p>
    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="margin-top: 0; color: #131a56;">Refund Details</h3>
      <p><strong>Invoice Reference:</strong> ${params.invoiceReference}</p>
      <p><strong>Refund Amount:</strong> ${formattedAmount}</p>
      <p><strong>Reason:</strong> ${params.reason}</p>
    </div>
    <div style="background-color: #e3f2fd; padding: 15px; border-radius: 8px; margin: 20px 0;">
      <p style="margin: 0;"><strong>Important:</strong> This refund will be processed as a bank transfer back to your original payment account. Please allow 3-5 business days for the funds to appear in your account.</p>
    </div>
    <p>If you have any questions about this refund, please contact us.</p>
  ` : `
    <h2>Refund Processed</h2>
    <p>Your refund has been processed successfully.</p>
    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="margin-top: 0; color: #131a56;">Refund Details</h3>
      <p><strong>Invoice Reference:</strong> ${params.invoiceReference}</p>
      <p><strong>Refund Amount:</strong> ${formattedAmount}</p>
      <p><strong>Reason:</strong> ${params.reason}</p>
    </div>
    <p>The refund will appear on your card statement within 3-5 business days.</p>
  `;

  return generateBaseTemplate({
    recipient: params.recipient,
    content,
    title: params.refundMethod === 'bank_transfer' ? "Bank Transfer Refund Pending" : "Refund Processed",
  });
}

// Export all template functions and interfaces
export const emailTemplates = {
	generateBaseTemplate,
	studentEnrollment: studentEnrollmentTemplate,
	consecutiveAbsences: consecutiveAbsencesTemplate,
	paymentOverdue: paymentOverdueTemplate,
	monthlyFinancialSummary: monthlyFinancialSummaryTemplate,
	staffRegistration: staffRegistrationTemplate,
	parentAccount: parentAccountTemplate,
	attendanceNotFilled: attendanceNotFilledTemplate,
	classCapacity: classCapacityTemplate,
	classScheduleChange: classScheduleChangeTemplate,
	newMessage: newMessageTemplate,
	channelActivity: channelActivityTemplate,
	paymentConfirmation: paymentConfirmationTemplate,
	classCancellation: classCancellationTemplate,
	documentAssigned: documentAssignedTemplate,
	documentReminder: documentReminderTemplate,
	documentDeadline: documentDeadlineTemplate,
	sendClassAssignedEmail,
	invitation: invitationTemplate,
	paymentRequest: paymentRequestTemplate,
	refundPending: refundPendingTemplate,
};

export default emailTemplates;
