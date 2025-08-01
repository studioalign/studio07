import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import SignupForm from "./components/SignupForm";
import SigninForm from "./components/SigninForm";
import ForgotPasswordForm from "./components/ForgotPasswordForm";
import ResetPasswordForm from "./components/ResetPasswordForm";
import AuthCallbackPage from "./components/AuthCallbackPage"; // Add this import
import DashboardLayout from "./components/dashboard/DashboardLayout";
import Classes from "./components/dashboard/Classes";
import StudioInfo from "./components/dashboard/StudioInfo";
import Teachers from "./components/dashboard/Teachers";
import Students from "./components/dashboard/Students";
import Payments from "./components/payments/Payments";
import Plans from "./components/payments/Plans";
import Invoices from "./components/payments/Invoices";
import ParentInvoices from "./components/payments/ParentInvoices";
import MessagesLayout from "./components/messages/MessagesLayout";
import DashboardOverview from "./components/dashboard/DashboardOverview";
import MyStudents from "./components/dashboard/MyStudents";
import ChannelLayout from "./components/channels/ChannelLayout";
import NotificationsPage from "./components/notifications/NotificationsPage";
import Profile from "./components/settings/Profile";
import Settings from "./components/settings/Settings";
import Billing from "./components/settings/Billing";
import UserManagement from "./components/settings/UserManagement";
import DocumentList from "./components/documents/DocumentList";
import OnboardingPage from "./components/dashboard/OnboardingPage";
import { AuthProvider } from "./contexts/AuthContext";
import { DataProvider } from "./contexts/DataContext";
import { MessagingProvider } from "./contexts/MessagingContext";
import { LocalizationProvider } from "./contexts/LocalizationContext";
import { DashboardProvider } from "./contexts/DashboardContext";
import PrivateRoute from "./components/PrivateRoute";
import { useAuth } from "./contexts/AuthContext";
import PaymentSettings from "./pages/dashboard/payment-settings";
import PaymentSuccessPage from "./pages/payment-success";
import PaymentCancelPage from "./pages/payment-cancel";

const DashboardRoutes = React.memo(() => {
	const { profile } = useAuth();

	return (
		<Routes>
			<Route
				path="/signup"
				element={
					<div className="min-h-screen bg-gradient-to-br from-brand-secondary-400 to-brand-primary flex items-center justify-center p-4">
						<SignupForm />
					</div>
				}
			/>
			<Route
				path="/"
				element={
					<div className="min-h-screen bg-gradient-to-br from-brand-secondary-400 to-brand-primary flex items-center justify-center p-4">
						<SigninForm />
					</div>
				}
			/>
			<Route
				path="/forgot-password"
				element={
					<div className="min-h-screen bg-gradient-to-br from-brand-secondary-400 to-brand-primary flex items-center justify-center p-4">
						<ForgotPasswordForm />
					</div>
				}
			/>
			<Route
				path="/reset-password"
				element={
					<div className="min-h-screen bg-gradient-to-br from-brand-secondary-400 to-brand-primary flex items-center justify-center p-4">
						<ResetPasswordForm />
					</div>
				}
			/>
			{/* Add auth callback route for email confirmations */}
			<Route path="/auth/callback" element={<AuthCallbackPage />} />
			{/* Handle old hash fragment redirects */}
			<Route path="/auth/callback#" element={<AuthCallbackPage />} />
			<Route
				path="/onboarding"
				element={
					<PrivateRoute requiredRole="owner">
						<OnboardingPage />
					</PrivateRoute>
				}
			/>
			<Route
				path="/dashboard"
				element={
					<PrivateRoute requiredRole="owner,teacher,parent">
						<DataProvider>
							<DashboardProvider>
								<DashboardLayout />
							</DashboardProvider>
						</DataProvider>
					</PrivateRoute>
				}
			>
				<Route index element={<DashboardOverview />} />

				{/* Common routes for all authenticated users */}
				<Route path="classes" element={<Classes />} />
				<Route path="messages" element={<MessagesLayout />} />
				<Route path="channels" element={<ChannelLayout />} />
				<Route path="channels/:channelId" element={<ChannelLayout />} />
				<Route path="notifications" element={<NotificationsPage />} />
				<Route path="profile" element={<Profile />} />
				<Route path="settings" element={<Settings />} />
				<Route path="users" element={<UserManagement />} />
				<Route path="documents" element={<DocumentList />} />

				{/* Owner-only routes */}
				<Route
					path="studio"
					element={
						<PrivateRoute requiredRole="owner">
							<StudioInfo />
						</PrivateRoute>
					}
				/>
				<Route
					path="teachers"
					element={
						<PrivateRoute requiredRole="owner">
							<Teachers />
						</PrivateRoute>
					}
				/>
				<Route
					path="students"
					element={
						<PrivateRoute requiredRole="owner">
							<Students />
						</PrivateRoute>
					}
				/>
				<Route
					path="payments"
					element={
						<PrivateRoute requiredRole="owner,parent">
							{profile?.role === "owner" ? <Payments /> : <ParentInvoices />}
						</PrivateRoute>
					}
				/>
				<Route path="payment-success" element={<PaymentSuccessPage />} />
				<Route path="payment-cancel" element={<PaymentCancelPage />} />
				<Route
					path="payment-settings"
					element={
						<PrivateRoute requiredRole="owner">
							<PaymentSettings />
						</PrivateRoute>
					}
				/>
				<Route
					path="plans"
					element={
						<PrivateRoute requiredRole="owner">
							<Plans />
						</PrivateRoute>
					}
				/>
				<Route
					path="invoices"
					element={
						<PrivateRoute requiredRole="owner">
							<Invoices />
						</PrivateRoute>
					}
				/>
				{/* Parent-only routes */}
				<Route
					path="my-students"
					element={
						<PrivateRoute requiredRole="parent">
							<MyStudents />
						</PrivateRoute>
					}
				/>
			</Route>
			<Route
				path="/dashboard/billing"
				element={
					<PrivateRoute requiredRole="owner">
						<Billing />
					</PrivateRoute>
				}
			/>
		</Routes>
	);
});

const App = () => {
	return (
		<AuthProvider>
			<LocalizationProvider>
				<BrowserRouter>
					<MessagingProvider>
						<DashboardRoutes />
					</MessagingProvider>
				</BrowserRouter>
			</LocalizationProvider>
		</AuthProvider>
	);
};

export default App;
