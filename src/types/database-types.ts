export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      attendance: {
        Row: {
          class_student_id: string | null
          created_at: string | null
          id: string
          notes: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          class_student_id?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          status: string
          updated_at?: string | null
        }
        Update: {
          class_student_id?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_class_student_id_fkey"
            columns: ["class_student_id"]
            isOneToOne: false
            referencedRelation: "class_students"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_history: {
        Row: {
          amount_gbp: number
          billing_interval: string | null
          created_at: string | null
          description: string
          id: string
          invoice_url: string | null
          proration_amount: number | null
          status: string
          stripe_invoice_id: string | null
          stripe_invoice_item_id: string | null
          stripe_payment_intent_id: string | null
          stripe_subscription_id: string | null
          studio_id: string
          superseded_at: string | null
          superseded_by: string | null
          transaction_type: string | null
          upgrade_from_tier: string | null
          upgrade_to_tier: string | null
        }
        Insert: {
          amount_gbp: number
          billing_interval?: string | null
          created_at?: string | null
          description: string
          id?: string
          invoice_url?: string | null
          proration_amount?: number | null
          status: string
          stripe_invoice_id?: string | null
          stripe_invoice_item_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_subscription_id?: string | null
          studio_id: string
          superseded_at?: string | null
          superseded_by?: string | null
          transaction_type?: string | null
          upgrade_from_tier?: string | null
          upgrade_to_tier?: string | null
        }
        Update: {
          amount_gbp?: number
          billing_interval?: string | null
          created_at?: string | null
          description?: string
          id?: string
          invoice_url?: string | null
          proration_amount?: number | null
          status?: string
          stripe_invoice_id?: string | null
          stripe_invoice_item_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_subscription_id?: string | null
          studio_id?: string
          superseded_at?: string | null
          superseded_by?: string | null
          transaction_type?: string | null
          upgrade_from_tier?: string | null
          upgrade_to_tier?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "billing_history_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      channel_members: {
        Row: {
          channel_id: string
          joined_at: string | null
          role: string
          user_id: string
        }
        Insert: {
          channel_id: string
          joined_at?: string | null
          role: string
          user_id: string
        }
        Update: {
          channel_id?: string
          joined_at?: string | null
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "channel_members_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "class_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channel_members_user_id_fkey1"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      channel_posts: {
        Row: {
          author_id: string | null
          channel_id: string | null
          content: string
          created_at: string | null
          edited_at: string | null
          id: string
        }
        Insert: {
          author_id?: string | null
          channel_id?: string | null
          content: string
          created_at?: string | null
          edited_at?: string | null
          id?: string
        }
        Update: {
          author_id?: string | null
          channel_id?: string | null
          content?: string
          created_at?: string | null
          edited_at?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "channel_posts_author_id_fkey1"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channel_posts_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "class_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      class_channels: {
        Row: {
          created_at: string | null
          created_by: string
          description: string | null
          id: string
          name: string
          studio_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          description?: string | null
          id?: string
          name: string
          studio_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          description?: string | null
          id?: string
          name?: string
          studio_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "class_channels_created_by_fkey1"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_channels_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      class_students: {
        Row: {
          class_id: string
          created_at: string | null
          id: string
          is_drop_in: boolean | null
          student_id: string
        }
        Insert: {
          class_id: string
          created_at?: string | null
          id?: string
          is_drop_in?: boolean | null
          student_id: string
        }
        Update: {
          class_id?: string
          created_at?: string | null
          id?: string
          is_drop_in?: boolean | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_students_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_students_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_class"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          booked_count: number | null
          capacity: number | null
          created_at: string | null
          date: string | null
          drop_in_price: number | null
          end_date: string
          end_time: string
          id: string
          is_drop_in: boolean
          is_recurring: boolean | null
          location_id: string | null
          name: string
          notes: string | null
          parent_class_id: string | null
          start_time: string
          status: string | null
          studio_id: string
          teacher_id: string
          updated_at: string | null
        }
        Insert: {
          booked_count?: number | null
          capacity?: number | null
          created_at?: string | null
          date?: string | null
          drop_in_price?: number | null
          end_date: string
          end_time: string
          id?: string
          is_drop_in: boolean
          is_recurring?: boolean | null
          location_id?: string | null
          name: string
          notes?: string | null
          parent_class_id?: string | null
          start_time: string
          status?: string | null
          studio_id: string
          teacher_id: string
          updated_at?: string | null
        }
        Update: {
          booked_count?: number | null
          capacity?: number | null
          created_at?: string | null
          date?: string | null
          drop_in_price?: number | null
          end_date?: string
          end_time?: string
          id?: string
          is_drop_in?: boolean
          is_recurring?: boolean | null
          location_id?: string | null
          name?: string
          notes?: string | null
          parent_class_id?: string | null
          start_time?: string
          status?: string | null
          studio_id?: string
          teacher_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "classes_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      connected_customers: {
        Row: {
          created_at: string
          id: number
          parent_id: string
          stripe_connected_customer_id: string | null
          studio_id: string
        }
        Insert: {
          created_at?: string
          id?: number
          parent_id: string
          stripe_connected_customer_id?: string | null
          studio_id: string
        }
        Update: {
          created_at?: string
          id?: number
          parent_id?: string
          stripe_connected_customer_id?: string | null
          studio_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "connected_customers_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "connected_customers_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_participants: {
        Row: {
          conversation_id: string
          created_at: string | null
          last_read_at: string | null
          unread_count: number | null
          user_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string | null
          last_read_at?: string | null
          unread_count?: number | null
          user_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string | null
          last_read_at?: string | null
          unread_count?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_participants_user_id_fkey1"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string | null
          created_by: string
          id: string
          last_message: string | null
          last_message_at: string | null
          participant_ids: string[] | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          id?: string
          last_message?: string | null
          last_message_at?: string | null
          participant_ids?: string[] | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          id?: string
          last_message?: string | null
          last_message_at?: string | null
          participant_ids?: string[] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      document_recipients: {
        Row: {
          created_at: string
          document_id: string
          id: string
          last_reminder_sent: string | null
          signature: string | null
          signed_at: string | null
          user_id: string
          viewed_at: string | null
        }
        Insert: {
          created_at?: string
          document_id: string
          id?: string
          last_reminder_sent?: string | null
          signature?: string | null
          signed_at?: string | null
          user_id: string
          viewed_at?: string | null
        }
        Update: {
          created_at?: string
          document_id?: string
          id?: string
          last_reminder_sent?: string | null
          signature?: string | null
          signed_at?: string | null
          user_id?: string
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_recipients_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_recipients_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          archived_at: string | null
          created_at: string
          created_by: string
          description: string | null
          expires_at: string | null
          file_url: string
          id: string
          name: string
          requires_signature: boolean
          status: string
          studio_id: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          expires_at?: string | null
          file_url: string
          id?: string
          name: string
          requires_signature?: boolean
          status?: string
          studio_id: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          expires_at?: string | null
          file_url?: string
          id?: string
          name?: string
          requires_signature?: boolean
          status?: string
          studio_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      drop_in_bookings: {
        Row: {
          class_id: string
          created_at: string
          id: string
          parent_id: string
          payment_amount: number
          payment_method_id: string | null
          payment_status: string
          stripe_payment_id: string | null
          stripe_payment_method_id: string | null
          student_id: string
          studio_id: string | null
          updated_at: string | null
        }
        Insert: {
          class_id: string
          created_at?: string
          id?: string
          parent_id: string
          payment_amount: number
          payment_method_id?: string | null
          payment_status?: string
          stripe_payment_id?: string | null
          stripe_payment_method_id?: string | null
          student_id: string
          studio_id?: string | null
          updated_at?: string | null
        }
        Update: {
          class_id?: string
          created_at?: string
          id?: string
          parent_id?: string
          payment_amount?: number
          payment_method_id?: string | null
          payment_status?: string
          stripe_payment_id?: string | null
          stripe_payment_method_id?: string | null
          student_id?: string
          studio_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "drop_in_bookings_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drop_in_bookings_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drop_in_bookings_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "payment_methods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drop_in_bookings_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drop_in_bookings_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      emergency_contacts: {
        Row: {
          email: string | null
          id: string
          name: string
          phone: string
          relationship: string
          student_id: string | null
        }
        Insert: {
          email?: string | null
          id?: string
          name: string
          phone: string
          relationship: string
          student_id?: string | null
        }
        Update: {
          email?: string | null
          id?: string
          name?: string
          phone?: string
          relationship?: string
          student_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "emergency_contacts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      function_logs: {
        Row: {
          created_at: string | null
          details: Json | null
          function_name: string
          id: number
          message: string
          status: string
        }
        Insert: {
          created_at?: string | null
          details?: Json | null
          function_name: string
          id?: number
          message: string
          status: string
        }
        Update: {
          created_at?: string | null
          details?: Json | null
          function_name?: string
          id?: number
          message?: string
          status?: string
        }
        Relationships: []
      }
      invoice_items: {
        Row: {
          created_at: string | null
          description: string
          id: string
          invoice_id: string | null
          plan_enrollment_id: string | null
          quantity: number
          student_id: string | null
          subtotal: number
          tax: number
          total: number
          type: string
          unit_price: number
        }
        Insert: {
          created_at?: string | null
          description: string
          id?: string
          invoice_id?: string | null
          plan_enrollment_id?: string | null
          quantity?: number
          student_id?: string | null
          subtotal: number
          tax?: number
          total: number
          type: string
          unit_price: number
        }
        Update: {
          created_at?: string | null
          description?: string
          id?: string
          invoice_id?: string | null
          plan_enrollment_id?: string | null
          quantity?: number
          student_id?: string | null
          subtotal?: number
          tax?: number
          total?: number
          type?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          created_at: string | null
          discount_reason: string | null
          discount_type: string | null
          discount_value: number | null
          due_date: string
          id: string
          index: number
          is_recurring: boolean | null
          notes: string | null
          paid_at: string | null
          parent_id: string
          pdf_url: string | null
          recurring_end_date: string | null
          recurring_interval: string
          status: string
          stripe_invoice_id: string | null
          studio_id: string | null
          subtotal: number
          tax: number
          total: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          discount_reason?: string | null
          discount_type?: string | null
          discount_value?: number | null
          due_date: string
          id?: string
          index?: number
          is_recurring?: boolean | null
          notes?: string | null
          paid_at?: string | null
          parent_id: string
          pdf_url?: string | null
          recurring_end_date?: string | null
          recurring_interval: string
          status?: string
          stripe_invoice_id?: string | null
          studio_id?: string | null
          subtotal: number
          tax?: number
          total: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          discount_reason?: string | null
          discount_type?: string | null
          discount_value?: number | null
          due_date?: string
          id?: string
          index?: number
          is_recurring?: boolean | null
          notes?: string | null
          paid_at?: string | null
          parent_id?: string
          pdf_url?: string | null
          recurring_end_date?: string | null
          recurring_interval?: string
          status?: string
          stripe_invoice_id?: string | null
          studio_id?: string | null
          subtotal?: number
          tax?: number
          total?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          address: string | null
          created_at: string | null
          description: string | null
          id: string
          name: string
          studio_id: string
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          studio_id: string
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          studio_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "locations_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string | null
          edited_at: string | null
          id: string
          is_deleted: boolean | null
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string | null
          edited_at?: string | null
          id?: string
          is_deleted?: boolean | null
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string | null
          edited_at?: string | null
          id?: string
          is_deleted?: boolean | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          details: Json | null
          dismissed: boolean | null
          email_required: boolean | null
          email_sent: boolean | null
          email_sent_at: string | null
          email_success: boolean | null
          entity_id: string | null
          entity_type: string | null
          id: string
          link: string | null
          message: string
          priority: string | null
          read: boolean | null
          requires_action: boolean | null
          studio_id: string
          title: string
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          details?: Json | null
          dismissed?: boolean | null
          email_required?: boolean | null
          email_sent?: boolean | null
          email_sent_at?: string | null
          email_success?: boolean | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          link?: string | null
          message: string
          priority?: string | null
          read?: boolean | null
          requires_action?: boolean | null
          studio_id: string
          title: string
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          details?: Json | null
          dismissed?: boolean | null
          email_required?: boolean | null
          email_sent?: boolean | null
          email_sent_at?: string | null
          email_success?: boolean | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          link?: string | null
          message?: string
          priority?: string | null
          read?: boolean | null
          requires_action?: boolean | null
          studio_id?: string
          title?: string
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      payment_methods: {
        Row: {
          created_at: string | null
          expiry_month: number | null
          expiry_year: number | null
          id: string
          is_default: boolean | null
          last_four: string
          parent_id: string | null
          stripe_payment_method_id: string | null
          type: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          expiry_month?: number | null
          expiry_year?: number | null
          id?: string
          is_default?: boolean | null
          last_four: string
          parent_id?: string | null
          stripe_payment_method_id?: string | null
          type: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          expiry_month?: number | null
          expiry_year?: number | null
          id?: string
          is_default?: boolean | null
          last_four?: string
          parent_id?: string | null
          stripe_payment_method_id?: string | null
          type?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string | null
          destination_account_id: string | null
          discount_amount: number | null
          id: string
          invoice_id: string | null
          is_recurring: boolean
          original_amount: number | null
          payment_date: string
          payment_method: string | null
          recurring_interval: string | null
          status: string
          stripe_invoice_id: string | null
          stripe_payment_intent_id: string | null
          transfer_id: string | null
          transfer_status: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          destination_account_id?: string | null
          discount_amount?: number | null
          id?: string
          invoice_id?: string | null
          is_recurring?: boolean
          original_amount?: number | null
          payment_date?: string
          payment_method?: string | null
          recurring_interval?: string | null
          status: string
          stripe_invoice_id?: string | null
          stripe_payment_intent_id?: string | null
          transfer_id?: string | null
          transfer_status?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          destination_account_id?: string | null
          discount_amount?: number | null
          id?: string
          invoice_id?: string | null
          is_recurring?: boolean
          original_amount?: number | null
          payment_date?: string
          payment_method?: string | null
          recurring_interval?: string | null
          status?: string
          stripe_invoice_id?: string | null
          stripe_payment_intent_id?: string | null
          transfer_id?: string | null
          transfer_status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      post_comments: {
        Row: {
          author_id: string | null
          content: string
          created_at: string | null
          edited_at: string | null
          id: string
          post_id: string | null
        }
        Insert: {
          author_id?: string | null
          content: string
          created_at?: string | null
          edited_at?: string | null
          id?: string
          post_id?: string | null
        }
        Update: {
          author_id?: string | null
          content?: string
          created_at?: string | null
          edited_at?: string | null
          id?: string
          post_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_author_id_fkey1"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "channel_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_media: {
        Row: {
          created_at: string | null
          filename: string
          id: string
          post_id: string | null
          size_bytes: number
          type: string
          url: string
        }
        Insert: {
          created_at?: string | null
          filename: string
          id?: string
          post_id?: string | null
          size_bytes: number
          type: string
          url: string
        }
        Update: {
          created_at?: string | null
          filename?: string
          id?: string
          post_id?: string | null
          size_bytes?: number
          type?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_media_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "channel_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_reactions: {
        Row: {
          created_at: string | null
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "channel_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      refunds: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          payment_id: string | null
          reason: string
          refund_date: string
          status: string
          stripe_refund_id: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          payment_id?: string | null
          reason: string
          refund_date?: string
          status: string
          stripe_refund_id?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          payment_id?: string | null
          reason?: string
          refund_date?: string
          status?: string
          stripe_refund_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "refunds_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_prices: {
        Row: {
          active: boolean | null
          amount_gbp: number
          billing_interval: string
          created_at: string | null
          currency: string | null
          id: string
          interval_count: number | null
          product_id: string
          stripe_price_id: string
          stripe_product_id: string
          trial_period_days: number | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          amount_gbp: number
          billing_interval: string
          created_at?: string | null
          currency?: string | null
          id?: string
          interval_count?: number | null
          product_id: string
          stripe_price_id: string
          stripe_product_id: string
          trial_period_days?: number | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          amount_gbp?: number
          billing_interval?: string
          created_at?: string | null
          currency?: string | null
          id?: string
          interval_count?: number | null
          product_id?: string
          stripe_price_id?: string
          stripe_product_id?: string
          trial_period_days?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stripe_prices_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "stripe_products"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_products: {
        Row: {
          active: boolean | null
          created_at: string | null
          description: string | null
          id: string
          max_students: number
          name: string
          stripe_product_id: string
          student_range_max: number
          student_range_min: number
          tier_name: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          description?: string | null
          id?: string
          max_students: number
          name: string
          stripe_product_id: string
          student_range_max: number
          student_range_min: number
          tier_name: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          description?: string | null
          id?: string
          max_students?: number
          name?: string
          stripe_product_id?: string
          student_range_max?: number
          student_range_min?: number
          tier_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      students: {
        Row: {
          allergies: string | null
          created_at: string | null
          date_of_birth: string
          doctor_name: string | null
          doctor_phone: string | null
          gender: string | null
          id: string
          medical_conditions: string | null
          medications: string | null
          name: string
          parent_id: string
          participation_consent: boolean | null
          photo_consent: boolean | null
          social_media_consent: boolean | null
          studio_id: string
        }
        Insert: {
          allergies?: string | null
          created_at?: string | null
          date_of_birth: string
          doctor_name?: string | null
          doctor_phone?: string | null
          gender?: string | null
          id?: string
          medical_conditions?: string | null
          medications?: string | null
          name: string
          parent_id: string
          participation_consent?: boolean | null
          photo_consent?: boolean | null
          social_media_consent?: boolean | null
          studio_id: string
        }
        Update: {
          allergies?: string | null
          created_at?: string | null
          date_of_birth?: string
          doctor_name?: string | null
          doctor_phone?: string | null
          gender?: string | null
          id?: string
          medical_conditions?: string | null
          medications?: string | null
          name?: string
          parent_id?: string
          participation_consent?: boolean | null
          photo_consent?: boolean | null
          social_media_consent?: boolean | null
          studio_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "students_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      studio_subscriptions: {
        Row: {
          auto_upgrade_enabled: boolean | null
          billing_interval: string | null
          cancel_at_period_end: boolean | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          id: string
          is_lifetime: boolean | null
          lifetime_payment_id: string | null
          max_students: number
          next_billing_date: string | null
          price_gbp: number
          scheduled_tier: string | null
          status: string
          stripe_customer_id: string | null
          stripe_price_id: string | null
          stripe_product_id: string | null
          stripe_subscription_id: string | null
          studio_id: string
          tier: string
          trial_end: string | null
          trial_start: string | null
          updated_at: string | null
        }
        Insert: {
          auto_upgrade_enabled?: boolean | null
          billing_interval?: string | null
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          is_lifetime?: boolean | null
          lifetime_payment_id?: string | null
          max_students: number
          next_billing_date?: string | null
          price_gbp: number
          scheduled_tier?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          stripe_subscription_id?: string | null
          studio_id: string
          tier: string
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string | null
        }
        Update: {
          auto_upgrade_enabled?: boolean | null
          billing_interval?: string | null
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          is_lifetime?: boolean | null
          lifetime_payment_id?: string | null
          max_students?: number
          next_billing_date?: string | null
          price_gbp?: number
          scheduled_tier?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          stripe_subscription_id?: string | null
          studio_id?: string
          tier?: string
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "studio_subscriptions_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: true
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      studios: {
        Row: {
          address: string
          bank_account_last4: string | null
          bank_account_name: string | null
          billing_setup_complete: boolean | null
          country: string
          created_at: string | null
          currency: string | null
          email: string
          id: string
          max_students: number | null
          name: string
          owner_id: string
          phone: string
          stripe_connect_enabled: boolean | null
          stripe_connect_id: string | null
          stripe_connect_onboarding_complete: boolean | null
          subscription_id: string | null
          subscription_tier: string | null
          timezone: string
          updated_at: string | null
        }
        Insert: {
          address: string
          bank_account_last4?: string | null
          bank_account_name?: string | null
          billing_setup_complete?: boolean | null
          country?: string
          created_at?: string | null
          currency?: string | null
          email: string
          id?: string
          max_students?: number | null
          name: string
          owner_id: string
          phone: string
          stripe_connect_enabled?: boolean | null
          stripe_connect_id?: string | null
          stripe_connect_onboarding_complete?: boolean | null
          subscription_id?: string | null
          subscription_tier?: string | null
          timezone?: string
          updated_at?: string | null
        }
        Update: {
          address?: string
          bank_account_last4?: string | null
          bank_account_name?: string | null
          billing_setup_complete?: boolean | null
          country?: string
          created_at?: string | null
          currency?: string | null
          email?: string
          id?: string
          max_students?: number | null
          name?: string
          owner_id?: string
          phone?: string
          stripe_connect_enabled?: boolean | null
          stripe_connect_id?: string | null
          stripe_connect_onboarding_complete?: boolean | null
          subscription_id?: string | null
          subscription_tier?: string | null
          timezone?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "studios_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "studios_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "studio_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      uniform_assignments: {
        Row: {
          created_at: string | null
          id: string
          student_id: string
          uniform_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          student_id: string
          uniform_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          student_id?: string
          uniform_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "uniform_assignments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "uniform_assignments_uniform_id_fkey"
            columns: ["uniform_id"]
            isOneToOne: false
            referencedRelation: "uniforms"
            referencedColumns: ["id"]
          },
        ]
      }
      uniform_responses: {
        Row: {
          assignment_id: string
          created_at: string | null
          id: string
          size_option_id: string
          updated_at: string | null
          value: string
        }
        Insert: {
          assignment_id: string
          created_at?: string | null
          id?: string
          size_option_id: string
          updated_at?: string | null
          value: string
        }
        Update: {
          assignment_id?: string
          created_at?: string | null
          id?: string
          size_option_id?: string
          updated_at?: string | null
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "uniform_responses_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "uniform_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "uniform_responses_size_option_id_fkey"
            columns: ["size_option_id"]
            isOneToOne: false
            referencedRelation: "uniform_size_options"
            referencedColumns: ["id"]
          },
        ]
      }
      uniform_size_options: {
        Row: {
          created_at: string | null
          id: string
          label: string
          options: Json | null
          type: string
          uniform_id: string
          unit: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          label: string
          options?: Json | null
          type: string
          uniform_id: string
          unit?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          label?: string
          options?: Json | null
          type?: string
          uniform_id?: string
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "uniform_size_options_uniform_id_fkey"
            columns: ["uniform_id"]
            isOneToOne: false
            referencedRelation: "uniforms"
            referencedColumns: ["id"]
          },
        ]
      }
      uniforms: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          studio_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          studio_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          studio_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "uniforms_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      user_invitations: {
        Row: {
          created_at: string | null
          email: string
          expires_at: string
          id: string
          invitation_token: string
          invited_by: string
          role: Database["public"]["Enums"]["user_role"]
          studio_id: string
          used_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          expires_at?: string
          id?: string
          invitation_token: string
          invited_by: string
          role: Database["public"]["Enums"]["user_role"]
          studio_id: string
          used_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          invitation_token?: string
          invited_by?: string
          role?: Database["public"]["Enums"]["user_role"]
          studio_id?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_invitations_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          created_at: string | null
          email_billing: boolean | null
          email_class_updates: boolean | null
          email_messages: boolean | null
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email_billing?: boolean | null
          email_class_updates?: boolean | null
          email_messages?: boolean | null
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email_billing?: boolean | null
          email_class_updates?: boolean | null
          email_messages?: boolean | null
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          email: string
          id: string
          name: string
          phone: string | null
          photo_url: string | null
          role: Database["public"]["Enums"]["user_role"]
          status: string | null
          stripe_customer_id: string | null
          studio_id: string | null
          timezone: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          email: string
          id: string
          name: string
          phone?: string | null
          photo_url?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          status?: string | null
          stripe_customer_id?: string | null
          studio_id?: string | null
          timezone?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          email?: string
          id?: string
          name?: string
          phone?: string | null
          photo_url?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          status?: string | null
          stripe_customer_id?: string | null
          studio_id?: string | null
          timezone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      recent_function_logs: {
        Row: {
          created_at: string | null
          details: Json | null
          function_name: string | null
          id: number | null
          message: string | null
          status: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      bulk_update_class_instances: {
        Args: {
          target_class_id: string
          target_date: string
          modification_scope: string
          updated_name: string
          updated_teacher_id: string
          updated_location_id: string
          updated_start_time: string
          updated_end_time: string
        }
        Returns: undefined
      }
      calculate_proration_amount: {
        Args: {
          p_studio_id: string
          p_new_tier_name: string
          p_billing_interval: string
        }
        Returns: number
      }
      check_billing_setup_complete: {
        Args: { p_studio_id: string }
        Returns: boolean
      }
      check_student_capacity: {
        Args: { p_studio_id: string }
        Returns: Json
      }
      check_studio_subscription_tier: {
        Args: { p_studio_id: string }
        Returns: boolean
      }
      check_upgrade_required: {
        Args: { p_studio_id: string }
        Returns: {
          requires_upgrade: boolean
          current_tier: string
          required_tier: string
          current_student_count: number
          max_allowed: number
        }[]
      }
      cleanup_old_instances: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      create_conversation: {
        Args: { participant_ids: string[]; created_by: string }
        Returns: string
      }
      create_user_invitation: {
        Args:
          | {
              p_studio_id: string
              p_email: string
              p_role: Database["public"]["Enums"]["user_role"]
              p_invited_by: string
            }
          | {
              p_studio_id: string
              p_email: string
              p_role: Database["public"]["Enums"]["user_role"]
              p_invited_by: string
              p_token: string
            }
        Returns: {
          invitation_id: string
          invitation_token: string
        }[]
      }
      delete_owner_keep_studio: {
        Args: { p_owner_id: string }
        Returns: undefined
      }
      delete_parent_account: {
        Args: { p_parent_id: string }
        Returns: undefined
      }
      delete_studio: {
        Args: { p_studio_id: string; p_owner_id: string }
        Returns: boolean
      }
      delete_studio_and_owner: {
        Args: { p_owner_id: string; p_studio_id: string }
        Returns: undefined
      }
      delete_teacher_account: {
        Args: { p_teacher_id: string }
        Returns: undefined
      }
      delete_user: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      delete_user_account: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      delete_user_auth: {
        Args: { user_id: string }
        Returns: boolean
      }
      generate_invoice_number: {
        Args: { p_studio_id: string }
        Returns: string
      }
      get_available_spots: {
        Args: { class_id: string }
        Returns: number
      }
      get_available_tiers: {
        Args: Record<PropertyKey, never>
        Returns: {
          tier_name: string
          max_students: number
          student_range_min: number
          student_range_max: number
          monthly_price: number
          yearly_price: number
          lifetime_price: number
          stripe_product_id: string
        }[]
      }
      get_next_invoice_number: {
        Args: { studio_id_param: string }
        Returns: number
      }
      get_remaining_student_slots: {
        Args: { p_studio_id: string }
        Returns: number
      }
      get_required_subscription_tier: {
        Args: { student_count: number }
        Returns: {
          tier: string
          max_students: number
          price_gbp: number
        }[]
      }
      get_required_tier_for_count: {
        Args: { student_count: number }
        Returns: {
          tier_name: string
          max_students: number
          monthly_price: number
          yearly_price: number
          lifetime_price: number
          stripe_product_id: string
        }[]
      }
      get_studio_student_count: {
        Args: { p_studio_id: string }
        Returns: number
      }
      get_user_role: {
        Args: Record<PropertyKey, never>
        Returns: Database["public"]["Enums"]["user_role"]
      }
      get_user_studio: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      has_other_owners: {
        Args: { p_user_id: string; p_studio_id: string }
        Returns: boolean
      }
      has_role: {
        Args: { required_role: Database["public"]["Enums"]["user_role"] }
        Returns: boolean
      }
      is_studio_owner: {
        Args: { p_studio_id: string }
        Returns: boolean
      }
      is_studio_teacher: {
        Args: { p_studio_id: string }
        Returns: boolean
      }
      mark_invitation_used: {
        Args: { p_token: string }
        Returns: boolean
      }
      mark_messages_as_read: {
        Args: { p_conversation_id: string; p_user_id: string }
        Returns: undefined
      }
      modify_class_instance: {
        Args:
          | {
              p_class_id: string
              p_date: string
              p_name: string
              p_teacher_id: string
              p_location_id: string
              p_start_time: string
              p_end_time: string
            }
          | {
              p_class_id: string
              p_date: string
              p_name: string
              p_teacher_id: string
              p_start_time: string
              p_end_time: string
            }
          | {
              p_instance_id: string
              p_name: string
              p_teacher_id: string
              p_start_time: string
              p_end_time: string
            }
        Returns: undefined
      }
      modify_future_class_instances: {
        Args:
          | {
              p_class_id: string
              p_from_date: string
              p_name: string
              p_teacher_id: string
              p_location_id: string
              p_start_time: string
              p_end_time: string
            }
          | {
              p_class_id: string
              p_from_date: string
              p_name?: string
              p_teacher_id?: string
              p_start_time?: string
              p_end_time?: string
            }
        Returns: undefined
      }
      process_attendance_reminders: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      process_birthday_notifications: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      process_overdue_payment_notifications: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      validate_invitation_token: {
        Args: { p_token: string }
        Returns: {
          studio_id: string
          email: string
          role: Database["public"]["Enums"]["user_role"]
          studio_name: string
        }[]
      }
    }
    Enums: {
      class_status: "scheduled" | "cancelled" | "completed"
      user_role: "owner" | "teacher" | "student" | "parent" | "deleted"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      class_status: ["scheduled", "cancelled", "completed"],
      user_role: ["owner", "teacher", "student", "parent", "deleted"],
    },
  },
} as const
