import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

interface PrivateRouteProps {
	requiredRole?: string;
	children: React.ReactNode;
}

export default function PrivateRoute({
	requiredRole,
	children,
}: PrivateRouteProps) {
	const { user, profile, loading } = useAuth();
	const location = useLocation();

	if (loading) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				loading...
			</div>
		);
	}

	if (!user) {
		return <Navigate to="/" state={{ from: location }} replace />;
	}

	if (requiredRole && profile?.role) {
		const requiredRoles = requiredRole.split(",").map((role) => role.trim());
		if (!requiredRoles.includes(profile?.role)) {
			return <Navigate to="/dashboard" replace />;
		}
	}

	return children;
}
