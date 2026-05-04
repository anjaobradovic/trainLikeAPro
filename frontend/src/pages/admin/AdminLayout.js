import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './admin.css';

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <span className="logo-icon">LP</span>
          <span className="logo-text">LikeAPro</span>
        </div>
        <nav className="admin-nav">
          <NavLink to="/admin" end className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}>
            Dashboard
          </NavLink>
          <NavLink to="/admin/trainers" className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}>
            Trainers
          </NavLink>
          <NavLink to="/admin/equipment" className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}>
            Equipment
          </NavLink>
          <NavLink to="/admin/accessories" className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}>
            Accessories
          </NavLink>
          <NavLink to="/admin/goals" className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}>
            Training Goals
          </NavLink>
          <NavLink to="/admin/reports" className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}>
            Reports
          </NavLink>
        </nav>
        <div className="admin-sidebar-footer">
          <div className="admin-user">
            <div className="admin-user-name">{user?.username}</div>
            <div className="admin-user-role">Administrator</div>
          </div>
          <button className="admin-logout" onClick={handleLogout}>Logout</button>
        </div>
      </aside>
      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  );
}
