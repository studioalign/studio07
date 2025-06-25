import React, { ReactNode, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";

interface PrivateRouteProps {
	children: ReactNode;
	requiredRole?: string; // Comma-separated list of allowed roles
}

// Database types for subscription
type StudioSubscription = {
	id: string;
	studio_id: string;
	status: string | null;
	tier: string;
	is_lifetime: boolean | null;
	stripe_subscription_id?: string | null;
	current_period_end?: string | null;
	trial_end?: string | null;
};

/**
 * PrivateRoute component that handles authentication and role-based access control
 * If user is not authenticated, redirects to login
 * If user doesn't have the required role, shows an access denied message
 * If owner doesn't have active subscription, redirects to billing
 */
export default function PrivateRoute({
	children,
	requiredRole,
}: PrivateRouteProps) {
	const { user, profile, loading } = useAuth();
	const location = useLocation();
	const [isConfirmed, setIsConfirmed] = useState<boolean | null>(null);
	// const [checkingConfirmation, setCheckingConfirmation] = useState(true);
	const [subscription, setSubscription] = useState<StudioSubscription | null>(
		null
	);
	const [subscriptionChecked, setSubscriptionChecked] = useState(false);

	// Routes that owners can access without a subscription
	const allowedWithoutSubscription = [
		"/onboarding",
		"/dashboard/billing",
		"/dashboard/profile",
		"/dashboard/settings",
		"/dashboard/payment-success",
		"/dashboard/payment-cancel",
		"/auth/callback",
	];

	// Check if user's email is confirmed
	// useEffect(() => {
	// 	async function checkEmailConfirmation() {
	// 		if (!user) return;

	// 		setCheckingConfirmation(true);
	// 		try {
	// 			const { data } = await supabase.auth.getUser();
	// 			setIsConfirmed(!!data.user?.email_confirmed_at);
	// 		} catch (error) {
	// 			console.error("Error checking email confirmation:", error);
	// 			setIsConfirmed(false);
	// 		} finally {
	// 			setCheckingConfirmation(false);
	// 		}
	// 	}

	// 	if (user) {
	// 		checkEmailConfirmation();
	// 	} else {
	// 		setCheckingConfirmation(false);
	// 	}
	// }, [user]);

	// Check subscription status for owners
	useEffect(() => {
		async function checkSubscription() {
			if (!profile || profile.role !== "owner" || !profile.studio?.id) {
				setSubscriptionChecked(true);
				return;
			}

			try {
				const { data: subscriptionData, error } = await supabase
					.from("studio_subscriptions")
					.select("*")
					.eq("studio_id", profile.studio.id)
					.or("status.eq.active,status.eq.trialing")
					.single();

				if (error && error.code !== "PGRST116") {
					console.error("Error checking subscription:", error);
				}

				setSubscription(subscriptionData);
			} catch (error) {
				console.error("Error loading subscription:", error);
			} finally {
				setSubscriptionChecked(true);
			}
		}

		if (profile && isConfirmed !== false) {
			checkSubscription();
		}
	}, [profile, isConfirmed]);

	// Check auth and roles
	if (loading || (profile?.role === "owner" && !subscriptionChecked)) {
		// Show loading state
		return (
			<div className="flex justify-center items-center min-h-screen bg-gray-50">
				<div className="w-16 h-16 border-4 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
			</div>
		);
	}

	// If user is not logged in, redirect to login page
	if (!user) {
		return <Navigate to="/" state={{ from: location }} replace />;
	}

	// If email is not confirmed
	if (isConfirmed === false) {
		return (
			<div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
				<div className="w-full max-w-md p-8 bg-white rounded-lg shadow-md">
					<h2 className="text-2xl font-bold text-red-600 mb-4">
						Email Not Confirmed
					</h2>
					<p className="mb-4">
						Please check your email and click the confirmation link to activate
						your account.
					</p>
					<p className="text-sm text-gray-500 mb-4">
						If you don't see the email, please check your spam folder.
					</p>
					<button
						onClick={async () => {
							await supabase.auth.signOut();
							window.location.href = "/";
						}}
						className="w-full px-4 py-2 bg-brand-primary text-white rounded-md"
					>
						Back to Sign In
					</button>
				</div>
			</div>
		);
	}

	// If a role is required, check if the user has it
	if (requiredRole && profile) {
		const allowedRoles = requiredRole.split(",");
		if (!allowedRoles.includes(profile.role)) {
			// User doesn't have the required role
			return (
				<div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
					<div className="w-full max-w-md p-8 bg-white rounded-lg shadow-md">
						<h2 className="text-2xl font-bold text-red-600 mb-4">
							Access Denied
						</h2>
						<p className="mb-4">
							You don't have the required permissions to access this page.
						</p>
						<button
							onClick={() => (window.location.href = "/dashboard")}
							className="w-full px-4 py-2 bg-brand-primary text-white rounded-md"
						>
							Back to Dashboard
						</button>
					</div>
				</div>
			);
		}
	}

	// If user is an owner without a studio, redirect to onboarding
	if (
		profile?.role === "owner" &&
		(!profile.studio || !profile.studio.name) &&
		location.pathname !== "/onboarding"
	) {
		return <Navigate to="/onboarding" replace />;
	}

	// Check subscription requirement for owners
	if (
		profile?.role === "owner" &&
		profile.studio?.id &&
		!allowedWithoutSubscription.includes(location.pathname) &&
		!subscription
	) {
		// Owner without active subscription trying to access restricted area
		return (
			<div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
				<div className="w-full max-w-lg p-8 bg-white rounded-lg shadow-md">
					<div className="text-center mb-6">
						<div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								className="h-8 w-8 text-orange-600"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
								/>
							</svg>
						</div>
						<h2 className="text-2xl font-bold text-orange-600 mb-4">
							Subscription Required
						</h2>
						<p className="text-gray-700 mb-6">
							To access your studio dashboard and manage your dance studio, you
							need an active subscription. Choose a plan that fits your studio's
							needs and start managing your classes, students, and payments.
						</p>
						<div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6 text-left">
							<h3 className="font-medium text-blue-900 mb-2">
								What you'll get with a subscription:
							</h3>
							<ul className="text-sm text-blue-800 space-y-1">
								<li>• Manage unlimited classes and schedules</li>
								<li>• Track student progress and attendance</li>
								<li>• Process payments and generate invoices</li>
								<li>• Communicate with parents and students</li>
								<li>• Access detailed reports and analytics</li>
							</ul>
						</div>
					</div>
					<div className="space-y-3">
						<button
							onClick={() => (window.location.href = "/dashboard/billing")}
							className="w-full px-4 py-3 bg-brand-primary text-white rounded-md hover:bg-brand-secondary-400 transition-colors font-medium"
						>
							Get started for free with a 5-day free trial
						</button>
						<button
							onClick={async () => {
								await supabase.auth.signOut();
								window.location.href = "/";
							}}
							className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
						>
							Sign Out
						</button>
					</div>
				</div>
			</div>
		);
	}

	// All checks passed, render the protected component
	return <>{children}</>;
}
