import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import ScrollToTop from '../components/common/ScrollToTop';
import PublicLayout from '../layouts/PublicLayout';
import DashboardLayout from '../layouts/DashboardLayout';
import ProtectedRoute from './ProtectedRoute';
import LandingPage from '../pages/LandingPage';
import LoginPage from '../pages/LoginPage';
import ForgotPasswordPage from '../pages/ForgotPasswordPage';
import ChangePasswordPage from '../pages/ChangePasswordPage';
import DashboardPage from '../pages/DashboardPage';
import TasksPage from '../pages/TasksPage';
import MessagesPage from '../pages/MessagesPage';
import AttendancePage from '../pages/AttendancePage';
import LeavePage from '../pages/LeavePage';
import CalendarPage from '../pages/CalendarPage';
import VaultPage from '../pages/VaultPage';
import AnnouncementsPage from '../pages/AnnouncementsPage';
import DocumentsPage from '../pages/DocumentsPage';
import PayslipsPage from '../pages/PayslipsPage';
import StandupsPage from '../pages/StandupsPage';
import ExpensesPage from '../pages/ExpensesPage';
import RoomBookingPage from '../pages/RoomBookingPage';
import ReviewsPage from '../pages/ReviewsPage';
import ShiftsPage from '../pages/ShiftsPage';
import TicketsPage from '../pages/TicketsPage';
import ReportsPage from '../pages/ReportsPage';
import ActivityLogPage from '../pages/ActivityLogPage';
import DirectoryPage from '../pages/DirectoryPage';
import SettingsPage from '../pages/SettingsPage';
import NotificationsPage from '../pages/NotificationsPage';
import UsersPage from '../pages/UsersPage';
import ProfilePage from '../pages/ProfilePage';
import CelebrationsPage from '../pages/CelebrationsPage';
import SpacesPage from '../pages/SpacesPage';
import SpaceDetailPage from '../pages/SpaceDetailPage';
import TimesheetPage from '../pages/TimesheetPage';
import NotFoundPage from '../pages/NotFoundPage';

const AppRoutes = () => {
  const { user } = useAuth();

  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        {/* Public Routes */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={user ? <Navigate to="/dashboard" /> : <LandingPage />} />
          <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        </Route>

        {/* Change Password (no layout) */}
        <Route path="/change-password" element={
          <ProtectedRoute><ChangePasswordPage /></ProtectedRoute>
        } />

        {/* Protected Routes */}
        <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/announcements" element={<AnnouncementsPage />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/messages" element={<MessagesPage />} />
          <Route path="/standups" element={<StandupsPage />} />
          <Route path="/attendance" element={<AttendancePage />} />
          <Route path="/leave" element={<LeavePage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/payslips" element={<PayslipsPage />} />
          <Route path="/expenses" element={<ExpensesPage />} />
          <Route path="/shifts" element={<ShiftsPage />} />
          <Route path="/reviews" element={<ReviewsPage />} />
          <Route path="/documents" element={<DocumentsPage />} />
          <Route path="/room-booking" element={<RoomBookingPage />} />
          <Route path="/tickets" element={<TicketsPage />} />
          <Route path="/vault" element={<VaultPage />} />
          <Route path="/directory" element={<DirectoryPage />} />
          <Route path="/celebrations" element={<CelebrationsPage />} />
          <Route path="/spaces" element={<SpacesPage />} />
          <Route path="/spaces/:id" element={<SpaceDetailPage />} />
          <Route path="/timesheet" element={<TimesheetPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          {/* Admin only */}
          <Route path="/users" element={<ProtectedRoute allowedRoles={['admin']}><UsersPage /></ProtectedRoute>} />
          <Route path="/reports" element={<ProtectedRoute allowedRoles={['admin']}><ReportsPage /></ProtectedRoute>} />
          <Route path="/activity-log" element={<ProtectedRoute allowedRoles={['admin']}><ActivityLogPage /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute allowedRoles={['admin']}><SettingsPage /></ProtectedRoute>} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRoutes;
