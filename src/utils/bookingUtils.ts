// src/utils/bookingUtils.ts - Updated booking function

import { supabase } from "../lib/supabase";
import { notificationService } from "../services/notificationService";
import { processStripePayment } from "./stripeUtils";

/**
 * Books a drop-in class for a student and processes payment
 */
export async function bookDropInClass(
	classId: string,
	studentId: string,
	stripePaymentMethodId: string, // This is the Stripe payment method ID (pm_...)
	studioId: string,
	databasePaymentMethodId?: string // Added parameter for database UUID
): Promise<{ success: boolean; bookingId?: string; error?: string }> {
	try {
		// Get user information
		const {
			data: { user },
		} = await supabase.auth.getUser();
		if (!user) throw new Error("User not authenticated");

		// Check if spots are available
		const { data: classData, error: classError } = await supabase
			.from("classes")
			.select(
				"capacity, booked_count, drop_in_price, name, studio_id, teacher_id, date"
			)
			.eq("id", classId)
			.single();

		if (classError) {
			console.error("Error fetching class data:", classError);
			throw classError;
		}

		if (!classData) {
			throw new Error("Class not found");
		}

		const capacity = classData.capacity || 0;
		const booked = classData.booked_count || 0;

		if (booked >= capacity) {
			throw new Error(`This class is full (${booked}/${capacity})`);
		}

		// Check if student is already booked
		const isAlreadyBooked = await isStudentBookedForClass(studentId, classId);
		if (isAlreadyBooked) {
			throw new Error("Student is already booked for this class");
		}

		// Get student's parent id and name to ensure it matches current user
		const { data: studentData, error: studentError } = await supabase
			.from("students")
			.select("parent_id, name")
			.eq("id", studentId)
			.single();

		if (studentError) {
			console.error("Error fetching student data:", studentError);
			throw studentError;
		}

		if (!studentData || studentData.parent_id !== user.id) {
			throw new Error("You can only book classes for your own students");
		}

		// Get studio data directly
		const { data: studioData, error: studioError } = await supabase
			.from("studios")
			.select(
				"currency, stripe_connect_id, stripe_connect_enabled, stripe_connect_onboarding_complete"
			)
			.eq("id", studioId)
			.single();

		if (studioError || !studioData) {
			console.error("Error fetching studio data:", studioError);
			throw new Error("Studio not found");
		}

		// Validate studio details
		if (
			!studioData.stripe_connect_id ||
			!studioData.stripe_connect_enabled ||
			!studioData.stripe_connect_onboarding_complete
		) {
			console.error("Studio Stripe Connect not fully configured:", {
				connectId: studioData.stripe_connect_id,
				enabled: studioData.stripe_connect_enabled,
				onboarding: studioData.stripe_connect_onboarding_complete,
			});
			return {
				success: false,
				error:
					"Studio payment setup is not complete. Please contact the studio.",
			};
		}

		// Get connected customer ID
		const { data: connectedCustomer, error: customerError } = await supabase
			.from("connected_customers")
			.select("stripe_connected_customer_id")
			.eq("parent_id", user.id)
			.eq("studio_id", studioId)
			.single();

		if (customerError) {
			console.error("Error fetching connected customer:", customerError);
			throw new Error(
				"Payment setup required. Please add a payment method first."
			);
		}

		if (!connectedCustomer?.stripe_connected_customer_id) {
			console.error("No connected customer found for user:", user.id);
			throw new Error(
				"Payment setup required. Please add a payment method first."
			);
		}

		const currency = studioData?.currency || "USD";

		// Create a temp booking id for payment reference
		const tempBookingId = "temp_" + Math.random().toString(36).substring(2, 15);

		// Process payment with Stripe

		const paymentResult = await processStripePayment(
			tempBookingId,
			classData.drop_in_price,
			stripePaymentMethodId,
			`Drop-in class: ${classData.name}`,
			user.id,
			currency,
			studioData.stripe_connect_id, // Connected account ID
			connectedCustomer.stripe_connected_customer_id // Connected customer ID
		);

		// If payment fails, immediately return with error
		if (!paymentResult.success) {
			console.error("Payment processing failed:", paymentResult.error);
			return {
				success: false,
				error: paymentResult.error || "Payment processing failed",
			};
		}

		// If no database payment method ID was provided, try to find one
		if (!databasePaymentMethodId) {
			try {
				const { data: paymentMethods } = await supabase
					.from("payment_methods")
					.select("id, stripe_payment_method_id")
					.eq("user_id", user.id)
					.limit(10);

				if (paymentMethods && paymentMethods.length > 0) {
					// First, try to find the exact payment method
					const exactMatch = paymentMethods.find(
						(pm) => pm.stripe_payment_method_id === stripePaymentMethodId
					);

					if (exactMatch) {
						databasePaymentMethodId = exactMatch.id;
					} else {
						// If no exact match, use the first one
						databasePaymentMethodId = paymentMethods[0].id;
					}
				}
			} catch (err) {
				console.warn("Error finding database payment method ID:", err);
			}
		}

		// Create the booking record - simple approach with clear fields
		const bookingData: any = {
			class_id: classId,
			student_id: studentId,
			parent_id: user.id,
			studio_id: classData.studio_id,
			payment_amount: classData.drop_in_price,
			payment_status: "completed",
			stripe_payment_id: paymentResult.paymentId,
			stripe_payment_method_id: stripePaymentMethodId,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
		};

		// Only include payment_method_id if we have a valid UUID
		if (databasePaymentMethodId) {
			bookingData.payment_method_id = databasePaymentMethodId;
		}

		// Create the booking record
		const { data: booking, error: bookingError } = await supabase
			.from("drop_in_bookings")
			.insert(bookingData)
			.select()
			.single();

		if (bookingError) {
			console.error("Error creating booking record:", bookingError);
			throw bookingError;
		}

		if (!booking) {
			throw new Error("Failed to create booking record - no data returned");
		}

		// Update class booked_count with careful handling
		try {
			// Get current count first to avoid race conditions
			const { data: currentClassData } = await supabase
				.from("classes")
				.select("booked_count")
				.eq("id", classId)
				.single();

			const currentCount = currentClassData?.booked_count || 0;
			const newCount = currentCount + 1;

			const { error: updateError } = await supabase
				.from("classes")
				.update({ booked_count: newCount })
				.eq("id", classId);

			if (updateError) {
				console.error("Error updating class booked count:", updateError);
			}
		} catch (err) {
			console.error("Error in class booked count update:", err);
		}

		// Add student to class_students table for attendance tracking
		// Try with is_drop_in first, fallback to without if needed
		try {
			try {
				// First attempt with is_drop_in field
				const { error: enrollError } = await supabase
					.from("class_students")
					.insert({
						class_id: classId,
						student_id: studentId,
						is_drop_in: true,
					});

				if (enrollError) {
					// If it mentions the is_drop_in column, retry without it
					if (
						enrollError.message &&
						enrollError.message.includes("is_drop_in")
					) {
						throw new Error("is_drop_in column not found");
					} else {
						throw enrollError;
					}
				}
			} catch (err) {
				// Second attempt without is_drop_in field
				await supabase.from("class_students").insert({
					class_id: classId,
					student_id: studentId,
				});
			}
		} catch (err) {
			console.error("Exception in class enrollment:", err);
		}

		// Create a payment record that will show up in the payments section
		try {
			const date = new Date().toISOString();
			const paymentRecord = {
				parent_id: user.id,
				studio_id: classData.studio_id,
				student_id: studentId,
				amount: classData.drop_in_price,
				currency: currency,
				type: "drop_in",
				status: "completed",
				reference: `Drop-in class: ${classData.name} on ${classData.date}`,
				booking_id: booking.id,
				stripe_payment_id: paymentResult.paymentId,
				created_at: date,
				updated_at: date,
				payment_date: date,
				description: `Drop-in class booking: ${classData.name}`,
				payment_method_id: databasePaymentMethodId,
			};

			// Check if a payments table exists first
			const { count: tableCount, error: tableError } = await supabase
				.from("payments")
				.select("*", { count: "exact", head: true });

			if (tableError) {
				throw tableError;
			} else {
				// Table exists, insert the payment record
				const { error: paymentError } = await supabase
					.from("payments")
					.insert(paymentRecord);

				if (paymentError) {
					console.error("Error creating payment record:", paymentError);
				}
			}
		} catch (err) {
			console.error("Error creating payment record:", err);
		}

		// Send notifications to teacher and studio owner
		try {
			await notificationService.notifyStudentAddedToClass(
				classData.studio_id,
				classData.teacher_id,
				studentData.name || "A student",
				studentId,
				classData.name,
				classId
			);

			// Send payment confirmation to parent
			await notificationService.notifyPaymentConfirmation(
				user.id,
				classData.studio_id,
				classData.drop_in_price,
				booking.id,
				currency
			);

			// Check if this fills the class
			const newCapacity = booked + 1;
			if (newCapacity >= capacity) {
				await notificationService.notifyClassCapacityReached(
					classData.studio_id,
					classData.name,
					classId
				);
			}
		} catch (notifyError) {
			// Log but don't fail if notifications have issues
			console.error("Error sending notifications:", notifyError);
		}

		return { success: true, bookingId: booking.id };
	} catch (err) {
		console.error("Full Error in bookDropInClass:", {
			errorName: err.name,
			errorMessage: err.message,
			errorStack: err.stack,
		});

		return {
			success: false,
			error:
				err instanceof Error ? err.message : "An error occurred during booking",
		};
	}
}

/**
 * Gets the number of available spots for a drop-in class
 */
export async function getAvailableDropInSpots(
	classId: string
): Promise<number> {
	try {
		const { data, error } = await supabase
			.from("classes")
			.select("capacity, booked_count")
			.eq("id", classId)
			.single();

		if (error) throw error;

		if (!data) {
			throw new Error("Class not found");
		}

		return Math.max(0, data.capacity - (data.booked_count || 0));
	} catch (err) {
		console.error("Error getting available spots:", err);
		throw err;
	}
}

/**
 * Gets all drop-in bookings for a parent
 */
export async function getParentDropInBookings(parentId: string) {
	try {
		const { data, error } = await supabase
			.from("drop_in_bookings")
			.select(
				`
        id,
        payment_status,
        payment_amount,
        created_at,
        class:classes (
          id,
          name,
          date,
          start_time,
          end_time,
          teacher:teacher_id (
            name
          ),
          location:location_id (
            name
          ),
          studio:studio_id (
            id,
            name,
            currency
          )
        ),
        student:students (
          id,
          name
        )
      `
			)
			.eq("parent_id", parentId)
			.order("created_at", { ascending: false });

		if (error) throw error;
		return data || [];
	} catch (err) {
		console.error("Error fetching drop-in bookings:", err);
		throw err;
	}
}

/**
 * Checks if a student is already booked for a drop-in class
 */
export async function isStudentBookedForClass(
	studentId: string,
	classId: string
): Promise<boolean> {
	try {
		const { data, error } = await supabase
			.from("drop_in_bookings")
			.select("id")
			.eq("student_id", studentId)
			.eq("class_id", classId)
			.eq("payment_status", "completed")
			.maybeSingle();

		if (error) throw error;
		return !!data;
	} catch (err) {
		console.error("Error checking if student is booked:", err);
		return false;
	}
}

/**
 * Gets all drop-in bookings for the current user
 */
export async function getCurrentUserDropInBookings() {
	try {
		const {
			data: { user },
		} = await supabase.auth.getUser();
		if (!user) return [];

		return await getParentDropInBookings(user.id);
	} catch (err) {
		console.error("Error fetching current user bookings:", err);
		return [];
	}
}

/**
 * Gets all upcoming drop-in classes for a student
 */
export async function getUpcomingDropInClassesForStudent(studentId: string) {
	try {
		// Get today's date
		const today = new Date().toISOString().split("T")[0];

		// Get completed bookings for this student
		const { data: bookings, error: bookingsError } = await supabase
			.from("drop_in_bookings")
			.select(
				`
        class_id,
        class:classes (
          id,
          name,
          date,
          start_time,
          end_time,
          teacher:teacher_id (
            name
          ),
          location:location_id (
            name
          )
        )
      `
			)
			.eq("student_id", studentId)
			.eq("payment_status", "completed")
			.gte("class.date", today)
			.order("class.date", { ascending: true });

		if (bookingsError) throw bookingsError;

		// Map to a more usable format
		return (bookings || []).map((booking) => booking.class);
	} catch (err) {
		console.error("Error fetching upcoming drop-in classes:", err);
		return [];
	}
}
