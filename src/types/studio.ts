export interface StudioInfo {
	id: string;
	name: string;
	address: string;
	phone: string;
	email: string;
	currency: string;
	country: string;
	stripe_connect_id?: string;
	stripe_connect_enabled?: boolean;
	stripe_connect_onboarding_complete?: boolean;
	bank_account_name?: string;
	bank_account_last4?: string;
	payment_methods_enabled?: {
		stripe: boolean;
		bacs: boolean;
	} | null;
	bacs_enabled?: boolean;
}
