import { useAuth } from '../../context/AuthContext';

export default function AdminHome() {
  const { user } = useAuth();
  return (
    <div className="admin-page">
      <h1 className="admin-page-title">Hello {user?.username}</h1>
      <p className="admin-page-subtitle">
        Use the sidebar to manage trainers and other resources.
      </p>
    </div>
  );
}
