import React, { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabase";

interface OwnerGuardProps {
	children: React.ReactNode;
}

export default function OwnerGuard({ children }: OwnerGuardProps) {
	const [loading, setLoading] = useState(true);
	const [shouldRedirect, setShouldRedirect] = useState(false);
	const location = useLocation();

	useEffect(() => {
		checkOwnerStatus();
	}, []);

	const checkOwnerStatus = async () => {
		try {
			const {
				data: { user },
			} = await supabase.auth.getUser();

			if (!user) {
				setShouldRedirect(true);
				return;
			}

			// Check if user is an owner
			const { data: userData } = await supabase
				.from("users")
				.select("role")
				.eq("id", user.id)
				.single();

			if (userData?.role !== "owner") {
				setLoading(false);
				return;
			}

			// Check if owner has a studio
			const { data: studio } = await supabase
				.from("studios")
				.select("id")
				.eq("owner_id", user.id)
				.single();

			// If we're not on the onboarding page and the owner doesn't have a studio,
			// redirect to onboarding
			if (!studio && location.pathname !== "/onboarding") {
				setShouldRedirect(true);
			}
		} catch (error) {
			console.error("Error checking owner status:", error);
		} finally {
			setLoading(false);
		}
	};

	if (loading) {
		return <div>Loading...</div>; // You might want to use a proper loading component
	}

	if (shouldRedirect) {
		return <Navigate to="/onboarding" state={{ from: location }} replace />;
	}

	return <>{children}</>;
}
