import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import LandingPage from './pages/LandingPage';
import ResetPassword from './pages/ResetPassword';
import TrainerDashboard from './pages/TrainerDashboard';
import ClientDashboard from './pages/ClientDashboard';
import AdminLayout from './pages/admin/AdminLayout';
import AdminHome from './pages/admin/AdminHome';
import AdminTrainers from './pages/admin/AdminTrainers';
import AdminEquipment from './pages/admin/AdminEquipment';
import AdminAccessories from './pages/admin/AdminAccessories';
import AdminGoals from './pages/admin/AdminGoals';
import AdminReports from './pages/admin/AdminReports';
import AdminUsers from './pages/admin/AdminUsers';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ color: '#fff', padding: '2rem' }}>Loading...</div>;
  if (!user) return <Navigate to="/" />;
  if (!allowedRoles.includes(user.role)) return <Navigate to="/" />;
  return children;
};

const AppRoutes = () => {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ color: '#fff', padding: '2rem' }}>Loading...</div>;

  return (
    <Routes>
      <Route path="/" element={user ? <Navigate to={`/${user.role}`} /> : <LandingPage />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/admin" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <AdminLayout />
        </ProtectedRoute>
      }>
        <Route index element={<AdminHome />} />
        <Route path="trainers" element={<AdminTrainers />} />
        <Route path="equipment" element={<AdminEquipment />} />
        <Route path="accessories" element={<AdminAccessories />} />
        <Route path="goals" element={<AdminGoals />} />
        <Route path="reports" element={<AdminReports />} />
        <Route path="users" element={<AdminUsers />} />
      </Route>
      <Route path="/trainer" element={
        <ProtectedRoute allowedRoles={['trainer']}>
          <TrainerDashboard />
        </ProtectedRoute>
      } />
      <Route path="/client" element={
        <ProtectedRoute allowedRoles={['client']}>
          <ClientDashboard />
        </ProtectedRoute>
      } />
    </Routes>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}
