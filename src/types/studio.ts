export interface StudioInfo {
	id: string;
	name: string;
	address: string;
	phone: string;
	email: string;
	stripe_connect_id?: string;
	stripe_connect_enabled?: boolean;
	stripe_connect_onboarding_complete?: boolean;
	uses_platform_payments?: boolean;
	bank_account_name?: string;
	bank_account_last4?: string;
}
