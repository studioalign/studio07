export type Json =
	| string
	| number
	| boolean
	| null
	| { [key: string]: Json | undefined }
	| Json[];

export type Database = {
	public: {
		Tables: {
			attendance: {
				Row: {
					class_student_id: string | null;
					created_at: string | null;
					id: string;
					notes: string | null;
					status: string;
					updated_at: string | null;
				};
				Insert: {
					class_student_id?: string | null;
					created_at?: string | null;
					id?: string;
					notes?: string | null;
					status: string;
					updated_at?: string | null;
				};
				Update: {
					class_student_id?: string | null;
					created_at?: string | null;
					id?: string;
					notes?: string | null;
					status?: string;
					updated_at?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: "attendance_class_student_id_fkey";
						columns: ["class_student_id"];
						isOneToOne: false;
						referencedRelation: "class_students";
						referencedColumns: ["id"];
					}
				];
			};
			channel_members: {
				Row: {
					channel_id: string;
					joined_at: string | null;
					role: string;
					user_id: string;
				};
				Insert: {
					channel_id: string;
					joined_at?: string | null;
					role: string;
					user_id: string;
				};
				Update: {
					channel_id?: string;
					joined_at?: string | null;
					role?: string;
					user_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: "channel_members_channel_id_fkey";
						columns: ["channel_id"];
						isOneToOne: false;
						referencedRelation: "class_channels";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "channel_members_user_id_fkey1";
						columns: ["user_id"];
						isOneToOne: false;
						referencedRelation: "users";
						referencedColumns: ["id"];
					}
				];
			};
			channel_posts: {
				Row: {
					author_id: string | null;
					channel_id: string | null;
					content: string;
					created_at: string | null;
					edited_at: string | null;
					id: string;
				};
				Insert: {
					author_id?: string | null;
					channel_id?: string | null;
					content: string;
					created_at?: string | null;
					edited_at?: string | null;
					id?: string;
				};
				Update: {
					author_id?: string | null;
					channel_id?: string | null;
					content?: string;
					created_at?: string | null;
					edited_at?: string | null;
					id?: string;
				};
				Relationships: [
					{
						foreignKeyName: "channel_posts_author_id_fkey1";
						columns: ["author_id"];
						isOneToOne: false;
						referencedRelation: "users";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "channel_posts_channel_id_fkey";
						columns: ["channel_id"];
						isOneToOne: false;
						referencedRelation: "class_channels";
						referencedColumns: ["id"];
					}
				];
			};
			class_channels: {
				Row: {
					class_id: string | null;
					created_at: string | null;
					created_by: string;
					description: string | null;
					id: string;
					name: string;
					updated_at: string | null;
				};
				Insert: {
					class_id?: string | null;
					created_at?: string | null;
					created_by: string;
					description?: string | null;
					id?: string;
					name: string;
					updated_at?: string | null;
				};
				Update: {
					class_id?: string | null;
					created_at?: string | null;
					created_by?: string;
					description?: string | null;
					id?: string;
					name?: string;
					updated_at?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: "class_channels_class_id_fkey";
						columns: ["class_id"];
						isOneToOne: false;
						referencedRelation: "classes";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "class_channels_created_by_fkey1";
						columns: ["created_by"];
						isOneToOne: false;
						referencedRelation: "users";
						referencedColumns: ["id"];
					}
				];
			};
			class_instances_backup: {
				Row: {
					class_id: string | null;
					created_at: string | null;
					date: string | null;
					end_time: string | null;
					id: string;
					location_id: string | null;
					name: string | null;
					notes: string | null;
					start_time: string | null;
					status: string | null;
					teacher_id: string | null;
					updated_at: string | null;
				};
				Insert: {
					class_id?: string | null;
					created_at?: string | null;
					date?: string | null;
					end_time?: string | null;
					id: string;
					location_id?: string | null;
					name?: string | null;
					notes?: string | null;
					start_time?: string | null;
					status?: string | null;
					teacher_id?: string | null;
					updated_at?: string | null;
				};
				Update: {
					class_id?: string | null;
					created_at?: string | null;
					date?: string | null;
					end_time?: string | null;
					id?: string;
					location_id?: string | null;
					name?: string | null;
					notes?: string | null;
					start_time?: string | null;
					status?: string | null;
					teacher_id?: string | null;
					updated_at?: string | null;
				};
				Relationships: [];
			};
			class_modifications: {
				Row: {
					class_instance_id: string;
					created_at: string;
					end_time: string | null;
					id: string;
					name: string | null;
					start_time: string | null;
					teacher_id: string | null;
					updated_at: string;
				};
				Insert: {
					class_instance_id: string;
					created_at?: string;
					end_time?: string | null;
					id?: string;
					name?: string | null;
					start_time?: string | null;
					teacher_id?: string | null;
					updated_at?: string;
				};
				Update: {
					class_instance_id?: string;
					created_at?: string;
					end_time?: string | null;
					id?: string;
					name?: string | null;
					start_time?: string | null;
					teacher_id?: string | null;
					updated_at?: string;
				};
				Relationships: [
					{
						foreignKeyName: "class_modifications_class_instance_id_fkey";
						columns: ["class_instance_id"];
						isOneToOne: false;
						referencedRelation: "classes";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "class_modifications_teacher_id_fkey";
						columns: ["teacher_id"];
						isOneToOne: false;
						referencedRelation: "users";
						referencedColumns: ["id"];
					}
				];
			};
			class_students: {
				Row: {
					class_id: string;
					created_at: string | null;
					id: string;
					student_id: string;
				};
				Insert: {
					class_id: string;
					created_at?: string | null;
					id?: string;
					student_id: string;
				};
				Update: {
					class_id?: string;
					created_at?: string | null;
					id?: string;
					student_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: "class_students_class_id_fkey";
						columns: ["class_id"];
						isOneToOne: false;
						referencedRelation: "classes";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "class_students_student_id_fkey";
						columns: ["student_id"];
						isOneToOne: false;
						referencedRelation: "students";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "fk_class";
						columns: ["class_id"];
						isOneToOne: false;
						referencedRelation: "classes";
						referencedColumns: ["id"];
					}
				];
			};
			class_students_backup: {
				Row: {
					class_id: string | null;
					created_at: string | null;
					id: string;
					student_id: string | null;
				};
				Insert: {
					class_id?: string | null;
					created_at?: string | null;
					id?: string;
					student_id?: string | null;
				};
				Update: {
					class_id?: string | null;
					created_at?: string | null;
					id?: string;
					student_id?: string | null;
				};
				Relationships: [];
			};
			classes: {
				Row: {
					capacity: number | null;
					created_at: string | null;
					date: string | null;
					drop_in_price: number | null;
					end_date: string;
					end_time: string;
					id: string;
					is_drop_in: boolean;
					is_recurring: boolean | null;
					location_id: string | null;
					name: string;
					notes: string | null;
					parent_class_id: string | null;
					start_time: string;
					status: string | null;
					studio_id: string;
					teacher_id: string;
					updated_at: string | null;
				};
				Insert: {
					capacity?: number | null;
					created_at?: string | null;
					date?: string | null;
					drop_in_price?: number | null;
					end_date: string;
					end_time: string;
					id?: string;
					is_drop_in: boolean;
					is_recurring?: boolean | null;
					location_id?: string | null;
					name: string;
					notes?: string | null;
					parent_class_id?: string | null;
					start_time: string;
					status?: string | null;
					studio_id: string;
					teacher_id: string;
					updated_at?: string | null;
				};
				Update: {
					capacity?: number | null;
					created_at?: string | null;
					date?: string | null;
					drop_in_price?: number | null;
					end_date?: string;
					end_time?: string;
					id?: string;
					is_drop_in?: boolean;
					is_recurring?: boolean | null;
					location_id?: string | null;
					name?: string;
					notes?: string | null;
					parent_class_id?: string | null;
					start_time?: string;
					status?: string | null;
					studio_id?: string;
					teacher_id?: string;
					updated_at?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: "classes_location_id_fkey";
						columns: ["location_id"];
						isOneToOne: false;
						referencedRelation: "locations";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "classes_studio_id_fkey";
						columns: ["studio_id"];
						isOneToOne: false;
						referencedRelation: "studios";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "classes_teacher_id_fkey";
						columns: ["teacher_id"];
						isOneToOne: false;
						referencedRelation: "users";
						referencedColumns: ["id"];
					}
				];
			};
			classes_backup: {
				Row: {
					created_at: string | null;
					date: string | null;
					day_of_week: number | null;
					end_date: string | null;
					end_time: string | null;
					id: string;
					is_recurring: boolean | null;
					location_id: string | null;
					name: string | null;
					start_time: string | null;
					studio_id: string | null;
					teacher_id: string | null;
					updated_at: string | null;
				};
				Insert: {
					created_at?: string | null;
					date?: string | null;
					day_of_week?: number | null;
					end_date?: string | null;
					end_time?: string | null;
					id: string;
					is_recurring?: boolean | null;
					location_id?: string | null;
					name?: string | null;
					start_time?: string | null;
					studio_id?: string | null;
					teacher_id?: string | null;
					updated_at?: string | null;
				};
				Update: {
					created_at?: string | null;
					date?: string | null;
					day_of_week?: number | null;
					end_date?: string | null;
					end_time?: string | null;
					id?: string;
					is_recurring?: boolean | null;
					location_id?: string | null;
					name?: string | null;
					start_time?: string | null;
					studio_id?: string | null;
					teacher_id?: string | null;
					updated_at?: string | null;
				};
				Relationships: [];
			};
			connected_customers: {
				Row: {
					created_at: string;
					id: number;
					parent_id: string;
					stripe_connected_customer_id: string | null;
					studio_id: string;
				};
				Insert: {
					created_at?: string;
					id?: number;
					parent_id: string;
					stripe_connected_customer_id?: string | null;
					studio_id: string;
				};
				Update: {
					created_at?: string;
					id?: number;
					parent_id?: string;
					stripe_connected_customer_id?: string | null;
					studio_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: "connected_customers_parent_id_fkey";
						columns: ["parent_id"];
						isOneToOne: false;
						referencedRelation: "users";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "connected_customers_studio_id_fkey";
						columns: ["studio_id"];
						isOneToOne: false;
						referencedRelation: "studios";
						referencedColumns: ["id"];
					}
				];
			};
			conversation_participants: {
				Row: {
					conversation_id: string;
					created_at: string | null;
					last_read_at: string | null;
					unread_count: number | null;
					user_id: string;
				};
				Insert: {
					conversation_id: string;
					created_at?: string | null;
					last_read_at?: string | null;
					unread_count?: number | null;
					user_id: string;
				};
				Update: {
					conversation_id?: string;
					created_at?: string | null;
					last_read_at?: string | null;
					unread_count?: number | null;
					user_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: "conversation_participants_conversation_id_fkey";
						columns: ["conversation_id"];
						isOneToOne: false;
						referencedRelation: "conversations";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "conversation_participants_user_id_fkey1";
						columns: ["user_id"];
						isOneToOne: false;
						referencedRelation: "users";
						referencedColumns: ["id"];
					}
				];
			};
			conversations: {
				Row: {
					created_at: string | null;
					created_by: string;
					id: string;
					last_message: string | null;
					last_message_at: string | null;
					participant_ids: string[] | null;
					updated_at: string | null;
				};
				Insert: {
					created_at?: string | null;
					created_by: string;
					id?: string;
					last_message?: string | null;
					last_message_at?: string | null;
					participant_ids?: string[] | null;
					updated_at?: string | null;
				};
				Update: {
					created_at?: string | null;
					created_by?: string;
					id?: string;
					last_message?: string | null;
					last_message_at?: string | null;
					participant_ids?: string[] | null;
					updated_at?: string | null;
				};
				Relationships: [];
			};
			emergency_contacts: {
				Row: {
					email: string | null;
					id: string;
					name: string;
					phone: string;
					relationship: string;
					student_id: string | null;
				};
				Insert: {
					email?: string | null;
					id?: string;
					name: string;
					phone: string;
					relationship: string;
					student_id?: string | null;
				};
				Update: {
					email?: string | null;
					id?: string;
					name?: string;
					phone?: string;
					relationship?: string;
					student_id?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: "emergency_contacts_student_id_fkey";
						columns: ["student_id"];
						isOneToOne: false;
						referencedRelation: "students";
						referencedColumns: ["id"];
					}
				];
			};
			instance_enrollments: {
				Row: {
					class_instance_id: string | null;
					created_at: string | null;
					id: string;
					student_id: string | null;
				};
				Insert: {
					class_instance_id?: string | null;
					created_at?: string | null;
					id?: string;
					student_id?: string | null;
				};
				Update: {
					class_instance_id?: string | null;
					created_at?: string | null;
					id?: string;
					student_id?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: "instance_enrollments_student_id_fkey";
						columns: ["student_id"];
						isOneToOne: false;
						referencedRelation: "students";
						referencedColumns: ["id"];
					}
				];
			};
			invoice_items: {
				Row: {
					created_at: string | null;
					description: string;
					id: string;
					invoice_id: string | null;
					plan_enrollment_id: string | null;
					quantity: number;
					student_id: string | null;
					subtotal: number;
					tax: number;
					total: number;
					type: string;
					unit_price: number;
				};
				Insert: {
					created_at?: string | null;
					description: string;
					id?: string;
					invoice_id?: string | null;
					plan_enrollment_id?: string | null;
					quantity?: number;
					student_id?: string | null;
					subtotal: number;
					tax?: number;
					total: number;
					type: string;
					unit_price: number;
				};
				Update: {
					created_at?: string | null;
					description?: string;
					id?: string;
					invoice_id?: string | null;
					plan_enrollment_id?: string | null;
					quantity?: number;
					student_id?: string | null;
					subtotal?: number;
					tax?: number;
					total?: number;
					type?: string;
					unit_price?: number;
				};
				Relationships: [
					{
						foreignKeyName: "invoice_items_invoice_id_fkey";
						columns: ["invoice_id"];
						isOneToOne: false;
						referencedRelation: "invoices";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "invoice_items_plan_enrollment_id_fkey";
						columns: ["plan_enrollment_id"];
						isOneToOne: false;
						referencedRelation: "plan_enrollments";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "invoice_items_student_id_fkey";
						columns: ["student_id"];
						isOneToOne: false;
						referencedRelation: "students";
						referencedColumns: ["id"];
					}
				];
			};
			invoices: {
				Row: {
					created_at: string | null;
					discount_reason: string | null;
					discount_type: string | null;
					discount_value: number | null;
					due_date: string;
					id: string;
					is_recurring: boolean | null;
					notes: string | null;
					paid_at: string | null;
					parent_id: string;
					pdf_url: string | null;
					recurring_end_date: string | null;
					recurring_interval: string;
					status: string;
					stripe_invoice_id: string | null;
					studio_id: string | null;
					subtotal: number;
					tax: number;
					total: number;
					updated_at: string | null;
				};
				Insert: {
					created_at?: string | null;
					discount_reason?: string | null;
					discount_type?: string | null;
					discount_value?: number | null;
					due_date: string;
					id?: string;
					is_recurring?: boolean | null;
					notes?: string | null;
					paid_at?: string | null;
					parent_id: string;
					pdf_url?: string | null;
					recurring_end_date?: string | null;
					recurring_interval: string;
					status?: string;
					stripe_invoice_id?: string | null;
					studio_id?: string | null;
					subtotal: number;
					tax?: number;
					total: number;
					updated_at?: string | null;
				};
				Update: {
					created_at?: string | null;
					discount_reason?: string | null;
					discount_type?: string | null;
					discount_value?: number | null;
					due_date?: string;
					id?: string;
					is_recurring?: boolean | null;
					notes?: string | null;
					paid_at?: string | null;
					parent_id?: string;
					pdf_url?: string | null;
					recurring_end_date?: string | null;
					recurring_interval?: string;
					status?: string;
					stripe_invoice_id?: string | null;
					studio_id?: string | null;
					subtotal?: number;
					tax?: number;
					total?: number;
					updated_at?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: "invoices_parent_id_fkey";
						columns: ["parent_id"];
						isOneToOne: false;
						referencedRelation: "users";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "invoices_studio_id_fkey";
						columns: ["studio_id"];
						isOneToOne: false;
						referencedRelation: "studios";
						referencedColumns: ["id"];
					}
				];
			};
			locations: {
				Row: {
					address: string | null;
					created_at: string | null;
					description: string | null;
					id: string;
					name: string;
					studio_id: string;
					updated_at: string | null;
				};
				Insert: {
					address?: string | null;
					created_at?: string | null;
					description?: string | null;
					id?: string;
					name: string;
					studio_id: string;
					updated_at?: string | null;
				};
				Update: {
					address?: string | null;
					created_at?: string | null;
					description?: string | null;
					id?: string;
					name?: string;
					studio_id?: string;
					updated_at?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: "locations_studio_id_fkey";
						columns: ["studio_id"];
						isOneToOne: false;
						referencedRelation: "studios";
						referencedColumns: ["id"];
					}
				];
			};
			messages: {
				Row: {
					content: string;
					conversation_id: string | null;
					created_at: string | null;
					edited_at: string | null;
					id: string;
					is_deleted: boolean | null;
					sender_id: string | null;
				};
				Insert: {
					content: string;
					conversation_id?: string | null;
					created_at?: string | null;
					edited_at?: string | null;
					id?: string;
					is_deleted?: boolean | null;
					sender_id?: string | null;
				};
				Update: {
					content?: string;
					conversation_id?: string | null;
					created_at?: string | null;
					edited_at?: string | null;
					id?: string;
					is_deleted?: boolean | null;
					sender_id?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: "messages_conversation_id_fkey";
						columns: ["conversation_id"];
						isOneToOne: false;
						referencedRelation: "conversations";
						referencedColumns: ["id"];
					}
				];
			};
			payment_methods: {
				Row: {
					created_at: string | null;
					expiry_month: number | null;
					expiry_year: number | null;
					id: string;
					is_default: boolean | null;
					last_four: string;
					parent_id: string | null;
					stripe_payment_method_id: string | null;
					type: string;
					updated_at: string | null;
				};
				Insert: {
					created_at?: string | null;
					expiry_month?: number | null;
					expiry_year?: number | null;
					id?: string;
					is_default?: boolean | null;
					last_four: string;
					parent_id?: string | null;
					stripe_payment_method_id?: string | null;
					type: string;
					updated_at?: string | null;
				};
				Update: {
					created_at?: string | null;
					expiry_month?: number | null;
					expiry_year?: number | null;
					id?: string;
					is_default?: boolean | null;
					last_four?: string;
					parent_id?: string | null;
					stripe_payment_method_id?: string | null;
					type?: string;
					updated_at?: string | null;
				};
				Relationships: [];
			};
			payment_schedules: {
				Row: {
					amount: number;
					created_at: string | null;
					due_date: string;
					id: string;
					plan_enrollment_id: string | null;
					status: string;
					updated_at: string | null;
				};
				Insert: {
					amount: number;
					created_at?: string | null;
					due_date: string;
					id?: string;
					plan_enrollment_id?: string | null;
					status: string;
					updated_at?: string | null;
				};
				Update: {
					amount?: number;
					created_at?: string | null;
					due_date?: string;
					id?: string;
					plan_enrollment_id?: string | null;
					status?: string;
					updated_at?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: "payment_schedules_plan_enrollment_id_fkey";
						columns: ["plan_enrollment_id"];
						isOneToOne: false;
						referencedRelation: "plan_enrollments";
						referencedColumns: ["id"];
					}
				];
			};
			payments: {
				Row: {
					amount: number;
					created_at: string | null;
					destination_account_id: string | null;
					discount_amount: number | null;
					id: string;
					invoice_id: string | null;
					is_recurring: boolean;
					original_amount: number | null;
					payment_date: string;
					payment_method: string | null;
					recurring_interval: string | null;
					status: string;
					stripe_invoice_id: string | null;
					stripe_payment_intent_id: string | null;
					transaction_id: string | null;
					transfer_id: string | null;
					transfer_status: string | null;
					updated_at: string | null;
				};
				Insert: {
					amount: number;
					created_at?: string | null;
					destination_account_id?: string | null;
					discount_amount?: number | null;
					id?: string;
					invoice_id?: string | null;
					is_recurring?: boolean;
					original_amount?: number | null;
					payment_date?: string;
					payment_method?: string | null;
					recurring_interval?: string | null;
					status: string;
					stripe_invoice_id?: string | null;
					stripe_payment_intent_id?: string | null;
					transaction_id?: string | null;
					transfer_id?: string | null;
					transfer_status?: string | null;
					updated_at?: string | null;
				};
				Update: {
					amount?: number;
					created_at?: string | null;
					destination_account_id?: string | null;
					discount_amount?: number | null;
					id?: string;
					invoice_id?: string | null;
					is_recurring?: boolean;
					original_amount?: number | null;
					payment_date?: string;
					payment_method?: string | null;
					recurring_interval?: string | null;
					status?: string;
					stripe_invoice_id?: string | null;
					stripe_payment_intent_id?: string | null;
					transaction_id?: string | null;
					transfer_id?: string | null;
					transfer_status?: string | null;
					updated_at?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: "payments_invoice_id_fkey";
						columns: ["invoice_id"];
						isOneToOne: false;
						referencedRelation: "invoices";
						referencedColumns: ["id"];
					}
				];
			};
			plan_enrollments: {
				Row: {
					created_at: string | null;
					end_date: string | null;
					id: string;
					plan_id: string | null;
					start_date: string;
					status: string;
					student_id: string | null;
					updated_at: string | null;
				};
				Insert: {
					created_at?: string | null;
					end_date?: string | null;
					id?: string;
					plan_id?: string | null;
					start_date: string;
					status: string;
					student_id?: string | null;
					updated_at?: string | null;
				};
				Update: {
					created_at?: string | null;
					end_date?: string | null;
					id?: string;
					plan_id?: string | null;
					start_date?: string;
					status?: string;
					student_id?: string | null;
					updated_at?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: "plan_enrollments_plan_id_fkey";
						columns: ["plan_id"];
						isOneToOne: false;
						referencedRelation: "pricing_plans";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "plan_enrollments_student_id_fkey";
						columns: ["student_id"];
						isOneToOne: false;
						referencedRelation: "students";
						referencedColumns: ["id"];
					}
				];
			};
			post_comments: {
				Row: {
					author_id: string | null;
					content: string;
					created_at: string | null;
					edited_at: string | null;
					id: string;
					post_id: string | null;
				};
				Insert: {
					author_id?: string | null;
					content: string;
					created_at?: string | null;
					edited_at?: string | null;
					id?: string;
					post_id?: string | null;
				};
				Update: {
					author_id?: string | null;
					content?: string;
					created_at?: string | null;
					edited_at?: string | null;
					id?: string;
					post_id?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: "post_comments_author_id_fkey1";
						columns: ["author_id"];
						isOneToOne: false;
						referencedRelation: "users";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "post_comments_post_id_fkey";
						columns: ["post_id"];
						isOneToOne: false;
						referencedRelation: "channel_posts";
						referencedColumns: ["id"];
					}
				];
			};
			post_media: {
				Row: {
					created_at: string | null;
					filename: string;
					id: string;
					post_id: string | null;
					size_bytes: number;
					type: string;
					url: string;
				};
				Insert: {
					created_at?: string | null;
					filename: string;
					id?: string;
					post_id?: string | null;
					size_bytes: number;
					type: string;
					url: string;
				};
				Update: {
					created_at?: string | null;
					filename?: string;
					id?: string;
					post_id?: string | null;
					size_bytes?: number;
					type?: string;
					url?: string;
				};
				Relationships: [
					{
						foreignKeyName: "post_media_post_id_fkey";
						columns: ["post_id"];
						isOneToOne: false;
						referencedRelation: "channel_posts";
						referencedColumns: ["id"];
					}
				];
			};
			post_reactions: {
				Row: {
					created_at: string | null;
					post_id: string;
					user_id: string;
				};
				Insert: {
					created_at?: string | null;
					post_id: string;
					user_id: string;
				};
				Update: {
					created_at?: string | null;
					post_id?: string;
					user_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: "post_reactions_post_id_fkey";
						columns: ["post_id"];
						isOneToOne: false;
						referencedRelation: "channel_posts";
						referencedColumns: ["id"];
					}
				];
			};
			pricing_plans: {
				Row: {
					active: boolean | null;
					amount: number;
					created_at: string | null;
					description: string | null;
					id: string;
					interval: string;
					name: string;
					studio_id: string | null;
					updated_at: string | null;
				};
				Insert: {
					active?: boolean | null;
					amount: number;
					created_at?: string | null;
					description?: string | null;
					id?: string;
					interval: string;
					name: string;
					studio_id?: string | null;
					updated_at?: string | null;
				};
				Update: {
					active?: boolean | null;
					amount?: number;
					created_at?: string | null;
					description?: string | null;
					id?: string;
					interval?: string;
					name?: string;
					studio_id?: string | null;
					updated_at?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: "pricing_plans_studio_id_fkey";
						columns: ["studio_id"];
						isOneToOne: false;
						referencedRelation: "studios";
						referencedColumns: ["id"];
					}
				];
			};
			refunds: {
				Row: {
					amount: number;
					created_at: string | null;
					id: string;
					payment_id: string | null;
					reason: string;
					refund_date: string;
					status: string;
					updated_at: string | null;
				};
				Insert: {
					amount: number;
					created_at?: string | null;
					id?: string;
					payment_id?: string | null;
					reason: string;
					refund_date?: string;
					status: string;
					updated_at?: string | null;
				};
				Update: {
					amount?: number;
					created_at?: string | null;
					id?: string;
					payment_id?: string | null;
					reason?: string;
					refund_date?: string;
					status?: string;
					updated_at?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: "refunds_payment_id_fkey";
						columns: ["payment_id"];
						isOneToOne: false;
						referencedRelation: "payments";
						referencedColumns: ["id"];
					}
				];
			};
			students: {
				Row: {
					allergies: string | null;
					created_at: string | null;
					date_of_birth: string;
					doctor_name: string | null;
					doctor_phone: string | null;
					gender: string | null;
					id: string;
					medical_conditions: string | null;
					medications: string | null;
					name: string;
					parent_id: string;
					participation_consent: boolean | null;
					photo_consent: boolean | null;
					social_media_consent: boolean | null;
					studio_id: string;
				};
				Insert: {
					allergies?: string | null;
					created_at?: string | null;
					date_of_birth: string;
					doctor_name?: string | null;
					doctor_phone?: string | null;
					gender?: string | null;
					id?: string;
					medical_conditions?: string | null;
					medications?: string | null;
					name: string;
					parent_id: string;
					participation_consent?: boolean | null;
					photo_consent?: boolean | null;
					social_media_consent?: boolean | null;
					studio_id: string;
				};
				Update: {
					allergies?: string | null;
					created_at?: string | null;
					date_of_birth?: string;
					doctor_name?: string | null;
					doctor_phone?: string | null;
					gender?: string | null;
					id?: string;
					medical_conditions?: string | null;
					medications?: string | null;
					name?: string;
					parent_id?: string;
					participation_consent?: boolean | null;
					photo_consent?: boolean | null;
					social_media_consent?: boolean | null;
					studio_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: "students_parent_id_fkey";
						columns: ["parent_id"];
						isOneToOne: false;
						referencedRelation: "users";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "students_studio_id_fkey";
						columns: ["studio_id"];
						isOneToOne: false;
						referencedRelation: "studios";
						referencedColumns: ["id"];
					}
				];
			};
			studios: {
				Row: {
					address: string;
					bank_account_last4: string | null;
					bank_account_name: string | null;
					country: string;
					created_at: string | null;
					currency: string | null;
					email: string;
					id: string;
					name: string;
					owner_id: string;
					phone: string;
					stripe_connect_enabled: boolean | null;
					stripe_connect_id: string | null;
					stripe_connect_onboarding_complete: boolean | null;
					timezone: string;
					updated_at: string | null;
				};
				Insert: {
					address: string;
					bank_account_last4?: string | null;
					bank_account_name?: string | null;
					country?: string;
					created_at?: string | null;
					currency?: string | null;
					email: string;
					id?: string;
					name: string;
					owner_id: string;
					phone: string;
					stripe_connect_enabled?: boolean | null;
					stripe_connect_id?: string | null;
					stripe_connect_onboarding_complete?: boolean | null;
					timezone?: string;
					updated_at?: string | null;
				};
				Update: {
					address?: string;
					bank_account_last4?: string | null;
					bank_account_name?: string | null;
					country?: string;
					created_at?: string | null;
					currency?: string | null;
					email?: string;
					id?: string;
					name?: string;
					owner_id?: string;
					phone?: string;
					stripe_connect_enabled?: boolean | null;
					stripe_connect_id?: string | null;
					stripe_connect_onboarding_complete?: boolean | null;
					timezone?: string;
					updated_at?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: "studios_owner_id_fkey";
						columns: ["owner_id"];
						isOneToOne: false;
						referencedRelation: "users";
						referencedColumns: ["id"];
					}
				];
			};
			subscriptions: {
				Row: {
					amount: number;
					created_at: string | null;
					end_date: string | null;
					id: string;
					interval: string;
					invoice_id: string | null;
					payment_method_id: string | null;
					status: string;
					stripe_subscription_id: string;
					updated_at: string | null;
				};
				Insert: {
					amount: number;
					created_at?: string | null;
					end_date?: string | null;
					id?: string;
					interval: string;
					invoice_id?: string | null;
					payment_method_id?: string | null;
					status: string;
					stripe_subscription_id: string;
					updated_at?: string | null;
				};
				Update: {
					amount?: number;
					created_at?: string | null;
					end_date?: string | null;
					id?: string;
					interval?: string;
					invoice_id?: string | null;
					payment_method_id?: string | null;
					status?: string;
					stripe_subscription_id?: string;
					updated_at?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: "subscriptions_invoice_id_fkey";
						columns: ["invoice_id"];
						isOneToOne: false;
						referencedRelation: "invoices";
						referencedColumns: ["id"];
					}
				];
			};
			uniform_assignments: {
				Row: {
					created_at: string | null;
					id: string;
					student_id: string;
					uniform_id: string;
				};
				Insert: {
					created_at?: string | null;
					id?: string;
					student_id: string;
					uniform_id: string;
				};
				Update: {
					created_at?: string | null;
					id?: string;
					student_id?: string;
					uniform_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: "uniform_assignments_student_id_fkey";
						columns: ["student_id"];
						isOneToOne: false;
						referencedRelation: "students";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "uniform_assignments_uniform_id_fkey";
						columns: ["uniform_id"];
						isOneToOne: false;
						referencedRelation: "uniforms";
						referencedColumns: ["id"];
					}
				];
			};
			uniform_responses: {
				Row: {
					assignment_id: string;
					created_at: string | null;
					id: string;
					size_option_id: string;
					updated_at: string | null;
					value: string;
				};
				Insert: {
					assignment_id: string;
					created_at?: string | null;
					id?: string;
					size_option_id: string;
					updated_at?: string | null;
					value: string;
				};
				Update: {
					assignment_id?: string;
					created_at?: string | null;
					id?: string;
					size_option_id?: string;
					updated_at?: string | null;
					value?: string;
				};
				Relationships: [
					{
						foreignKeyName: "uniform_responses_assignment_id_fkey";
						columns: ["assignment_id"];
						isOneToOne: false;
						referencedRelation: "uniform_assignments";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "uniform_responses_size_option_id_fkey";
						columns: ["size_option_id"];
						isOneToOne: false;
						referencedRelation: "uniform_size_options";
						referencedColumns: ["id"];
					}
				];
			};
			uniform_size_options: {
				Row: {
					created_at: string | null;
					id: string;
					label: string;
					options: Json | null;
					type: string;
					uniform_id: string;
					unit: string | null;
				};
				Insert: {
					created_at?: string | null;
					id?: string;
					label: string;
					options?: Json | null;
					type: string;
					uniform_id: string;
					unit?: string | null;
				};
				Update: {
					created_at?: string | null;
					id?: string;
					label?: string;
					options?: Json | null;
					type?: string;
					uniform_id?: string;
					unit?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: "uniform_size_options_uniform_id_fkey";
						columns: ["uniform_id"];
						isOneToOne: false;
						referencedRelation: "uniforms";
						referencedColumns: ["id"];
					}
				];
			};
			uniforms: {
				Row: {
					created_at: string | null;
					description: string | null;
					id: string;
					name: string;
					studio_id: string;
					updated_at: string | null;
				};
				Insert: {
					created_at?: string | null;
					description?: string | null;
					id?: string;
					name: string;
					studio_id: string;
					updated_at?: string | null;
				};
				Update: {
					created_at?: string | null;
					description?: string | null;
					id?: string;
					name?: string;
					studio_id?: string;
					updated_at?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: "uniforms_studio_id_fkey";
						columns: ["studio_id"];
						isOneToOne: false;
						referencedRelation: "studios";
						referencedColumns: ["id"];
					}
				];
			};
			users: {
				Row: {
					created_at: string | null;
					email: string;
					id: string;
					name: string;
					phone: string | null;
					photo_url: string | null;
					role: Database["public"]["Enums"]["user_role"];
					stripe_customer_id: string | null;
					studio_id: string | null;
					timezone: string | null;
					updated_at: string | null;
				};
				Insert: {
					created_at?: string | null;
					email: string;
					id: string;
					name: string;
					phone?: string | null;
					photo_url?: string | null;
					role?: Database["public"]["Enums"]["user_role"];
					stripe_customer_id?: string | null;
					studio_id?: string | null;
					timezone?: string | null;
					updated_at?: string | null;
				};
				Update: {
					created_at?: string | null;
					email?: string;
					id?: string;
					name?: string;
					phone?: string | null;
					photo_url?: string | null;
					role?: Database["public"]["Enums"]["user_role"];
					stripe_customer_id?: string | null;
					studio_id?: string | null;
					timezone?: string | null;
					updated_at?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: "users_studio_id_fkey";
						columns: ["studio_id"];
						isOneToOne: false;
						referencedRelation: "studios";
						referencedColumns: ["id"];
					}
				];
			};
		};
		Views: {
			[_ in never]: never;
		};
		Functions: {
			bulk_update_class_instances: {
				Args: {
					target_class_id: string;
					target_date: string;
					modification_scope: string;
					updated_name: string;
					updated_teacher_id: string;
					updated_location_id: string;
					updated_start_time: string;
					updated_end_time: string;
				};
				Returns: undefined;
			};
			cleanup_old_instances: {
				Args: Record<PropertyKey, never>;
				Returns: undefined;
			};
			create_conversation: {
				Args: {
					participant_ids: string[];
					created_by: string;
				};
				Returns: string;
			};
			generate_invoice_number: {
				Args: {
					p_studio_id: string;
				};
				Returns: string;
			};
			get_user_role: {
				Args: Record<PropertyKey, never>;
				Returns: Database["public"]["Enums"]["user_role"];
			};
			get_user_studio: {
				Args: Record<PropertyKey, never>;
				Returns: string;
			};
			has_role: {
				Args: {
					required_role: Database["public"]["Enums"]["user_role"];
				};
				Returns: boolean;
			};
			is_studio_owner: {
				Args: {
					p_studio_id: string;
				};
				Returns: boolean;
			};
			is_studio_teacher: {
				Args: {
					p_studio_id: string;
				};
				Returns: boolean;
			};
			mark_messages_as_read: {
				Args: {
					p_conversation_id: string;
					p_user_id: string;
				};
				Returns: undefined;
			};
			modify_class_instance:
				| {
						Args: {
							p_class_id: string;
							p_date: string;
							p_name: string;
							p_teacher_id: string;
							p_location_id: string;
							p_start_time: string;
							p_end_time: string;
						};
						Returns: undefined;
				  }
				| {
						Args: {
							p_class_id: string;
							p_date: string;
							p_name: string;
							p_teacher_id: string;
							p_start_time: string;
							p_end_time: string;
						};
						Returns: undefined;
				  }
				| {
						Args: {
							p_instance_id: string;
							p_name: string;
							p_teacher_id: string;
							p_start_time: string;
							p_end_time: string;
						};
						Returns: undefined;
				  };
			modify_future_class_instances:
				| {
						Args: {
							p_class_id: string;
							p_from_date: string;
							p_name: string;
							p_teacher_id: string;
							p_location_id: string;
							p_start_time: string;
							p_end_time: string;
						};
						Returns: undefined;
				  }
				| {
						Args: {
							p_class_id: string;
							p_from_date: string;
							p_name?: string;
							p_teacher_id?: string;
							p_start_time?: string;
							p_end_time?: string;
						};
						Returns: undefined;
				  };
		};
		Enums: {
			class_status: "scheduled" | "cancelled" | "completed";
			user_role: "owner" | "teacher" | "student" | "parent";
		};
		CompositeTypes: {
			[_ in never]: never;
		};
	};
};

type PublicSchema = Database[Extract<keyof Database, "public">];

export type Tables<
	PublicTableNameOrOptions extends
		| keyof (PublicSchema["Tables"] & PublicSchema["Views"])
		| { schema: keyof Database },
	TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
		? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
				Database[PublicTableNameOrOptions["schema"]]["Views"])
		: never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
	? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
			Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
			Row: infer R;
	  }
		? R
		: never
	: PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
			PublicSchema["Views"])
	? (PublicSchema["Tables"] &
			PublicSchema["Views"])[PublicTableNameOrOptions] extends {
			Row: infer R;
	  }
		? R
		: never
	: never;

export type TablesInsert<
	PublicTableNameOrOptions extends
		| keyof PublicSchema["Tables"]
		| { schema: keyof Database },
	TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
		? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
		: never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
	? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
			Insert: infer I;
	  }
		? I
		: never
	: PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
	? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
			Insert: infer I;
	  }
		? I
		: never
	: never;

export type TablesUpdate<
	PublicTableNameOrOptions extends
		| keyof PublicSchema["Tables"]
		| { schema: keyof Database },
	TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
		? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
		: never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
	? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
			Update: infer U;
	  }
		? U
		: never
	: PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
	? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
			Update: infer U;
	  }
		? U
		: never
	: never;

export type Enums<
	PublicEnumNameOrOptions extends
		| keyof PublicSchema["Enums"]
		| { schema: keyof Database },
	EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
		? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
		: never = never
> = PublicEnumNameOrOptions extends { schema: keyof Database }
	? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
	: PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
	? PublicSchema["Enums"][PublicEnumNameOrOptions]
	: never;

export type CompositeTypes<
	PublicCompositeTypeNameOrOptions extends
		| keyof PublicSchema["CompositeTypes"]
		| { schema: keyof Database },
	CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
		schema: keyof Database;
	}
		? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
		: never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
	? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
	: PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
	? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
	: never;
