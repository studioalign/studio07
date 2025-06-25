export const emailTemplates = {
	generateBaseTemplate: (params: {
		recipient: { name: string };
		content: string;
		title?: string;
	}) => {
		// Your existing base template logic
		return "";
	},

	invitation: (params: {
		recipientEmail: string;
		inviterName: string;
		studioName: string;
		role: string;
		invitationUrl: string;
	}) => {
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

		return emailTemplates.generateBaseTemplate({
			recipient: { name: params.recipientEmail.split("@")[0] },
			content,
			title: "Studio Invitation",
		});
	},

	// ... your existing email templates ...
};
