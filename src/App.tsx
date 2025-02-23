import { BrowserRouter, Routes, Route } from "react-router-dom";
import SignupForm from "./components/SignupForm";
import SigninForm from "./components/SigninForm";
import ForgotPasswordForm from "./components/ForgotPasswordForm";
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
import Overview from "./components/dashboard/Overview";
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
import PrivateRoute from "./components/PrivateRoute";
import { useAuth } from "./contexts/AuthContext";

const DashboardRoutes = () => {
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
              <DashboardLayout />
            </DataProvider>
          </PrivateRoute>
        }
      >
        <Route index element={<Overview />} />

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
              {profile?.role === 'owner' ? <Payments /> : <ParentInvoices />}
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
        <Route
          path="billing"
          element={
            <PrivateRoute requiredRole="owner">
              <Billing />
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
    </Routes>
  );
};

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
