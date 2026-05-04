import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';
import CatalogManager from './CatalogManager';

export default function AdminGoals() {
  return (
    <CatalogManager
      resourceLabel="Goal"
      resourceLabelPlural="Training Goals"
      endpoint="/admin/goals/"
      showImageField={false}
      nameBadges={(item) => (
        !item.is_active && !item.is_deleted
          ? <span className="status-pill status-pending">Inactive</span>
          : null
      )}
      extraColumns={[
        {
          key: 'active',
          header: 'Active',
          width: 100,
          render: (item, refresh) => <ActiveSwitch item={item} refresh={refresh} />,
        },
      ]}
    />
  );
}

function ActiveSwitch({ item, refresh }) {
  const toast = useToast();

  const handleToggle = async (e) => {
    e.stopPropagation();
    try {
      await api.patch(`/admin/goals/${item.id}/toggle-active/`);
      toast.success(`Goal ${item.is_active ? 'deactivated' : 'activated'}.`);
      refresh();
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to toggle goal.';
      toast.error(msg);
    }
  };

  return (
    <label className={`switch ${item.is_deleted ? 'switch-disabled' : ''}`}>
      <input
        type="checkbox"
        checked={item.is_active}
        disabled={item.is_deleted}
        onChange={handleToggle}
      />
      <span className="switch-slider" />
    </label>
  );
}
