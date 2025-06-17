import React, { ReactNode, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";

interface PrivateRouteProps {
	children: ReactNode;
	requiredRole?: string; // Comma-separated list of allowed roles
}

/**
 * PrivateRoute component that handles authentication and role-based access control
 * If user is not authenticated, redirects to login
 * If user doesn't have the required role, shows an access denied message
 */
export default function PrivateRoute({
	children,
	requiredRole,
}: PrivateRouteProps) {
	const { user, profile, loading } = useAuth();
	const location = useLocation();
	const [isConfirmed, setIsConfirmed] = useState<boolean | null>(null);
	const [checkingConfirmation, setCheckingConfirmation] = useState(true);

	// Check if user's email is confirmed
	useEffect(() => {
		async function checkEmailConfirmation() {
			if (!user) return;

			setCheckingConfirmation(true);
			try {
				const { data } = await supabase.auth.getUser();
				setIsConfirmed(!!data.user?.email_confirmed_at);
			} catch (error) {
				console.error("Error checking email confirmation:", error);
				setIsConfirmed(false);
			} finally {
				setCheckingConfirmation(false);
			}
		}

		if (user) {
			checkEmailConfirmation();
		} else {
			setCheckingConfirmation(false);
		}
	}, [user]);

	// Check auth and roles
	if (loading) {
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

	// All checks passed, render the protected component
	return <>{children}</>;
}
