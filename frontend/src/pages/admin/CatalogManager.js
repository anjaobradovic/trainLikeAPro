import { useCallback, useEffect, useState } from 'react';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';

export default function CatalogManager({
  resourceLabel,
  resourceLabelPlural,
  endpoint,
  showImageField = true,
  extraColumns = [],
  nameBadges,
}) {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [showDeleted, setShowDeleted] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (showDeleted) params.include_deleted = 'true';
      const res = await api.get(endpoint, { params });
      setItems(Array.isArray(res.data) ? res.data : res.data.results || []);
    } catch {
      toast.error(`Failed to load ${resourceLabelPlural}.`);
    } finally {
      setLoading(false);
    }
  }, [endpoint, search, showDeleted, toast, resourceLabelPlural]);

  useEffect(() => {
    const t = setTimeout(load, search ? 250 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  const handleSaved = () => {
    setEditing(null);
    load();
  };

  const handleDelete = async () => {
    const item = confirmDelete;
    if (!item) return;
    try {
      await api.delete(`${endpoint}${item.id}/`);
      toast.success(`${resourceLabel} removed.`);
      setConfirmDelete(null);
      load();
    } catch {
      toast.error(`Failed to remove ${resourceLabel.toLowerCase()}.`);
    }
  };

  const formatDate = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString();
  };

  return (
    <div className="admin-page">
      <h1 className="admin-page-title">{resourceLabelPlural}</h1>
      <p className="admin-page-subtitle">
        Reference catalog used by trainers when building exercises.
      </p>

      <div className="admin-toolbar">
        <div className="catalog-search">
          <input
            type="text"
            placeholder={`Search ${resourceLabelPlural.toLowerCase()}...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <label className="catalog-toggle">
            <input
              type="checkbox"
              checked={showDeleted}
              onChange={(e) => setShowDeleted(e.target.checked)}
            />
            Show deleted
          </label>
        </div>
        <button className="btn-success" onClick={() => setEditing({})}>
          + Add {resourceLabel}
        </button>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              {showImageField && <th style={{ width: 56 }}></th>}
              <th>Name</th>
              <th>Description</th>
              <th>Created</th>
              {extraColumns.map((col) => (
                <th key={col.key} style={col.width ? { width: col.width } : undefined}>
                  {col.header}
                </th>
              ))}
              <th style={{ width: 120, textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={4 + (showImageField ? 1 : 0) + extraColumns.length} className="admin-empty">Loading...</td></tr>
            )}
            {!loading && items.length === 0 && (
              <tr><td colSpan={4 + (showImageField ? 1 : 0) + extraColumns.length} className="admin-empty">No {resourceLabelPlural.toLowerCase()} found.</td></tr>
            )}
            {!loading && items.map((it) => (
              <tr key={it.id} className={it.is_deleted ? 'row-deleted' : ''}>
                {showImageField && (
                  <td>
                    {it.image
                      ? <img src={it.image} alt="" className="catalog-thumb" />
                      : <div className="catalog-thumb catalog-thumb-empty" />}
                  </td>
                )}
                <td>
                  <div className="catalog-name">{it.name}</div>
                  <div className="catalog-badges">
                    {it.is_deleted && <span className="status-pill status-removed">Deleted</span>}
                    {nameBadges && nameBadges(it)}
                  </div>
                </td>
                <td className="catalog-description">{it.description || '—'}</td>
                <td>{formatDate(it.created_at)}</td>
                {extraColumns.map((col) => (
                  <td key={col.key}>{col.render(it, load)}</td>
                ))}
                <td className="catalog-actions">
                  <button
                    className="icon-btn"
                    title="Edit"
                    onClick={() => setEditing(it)}
                    disabled={it.is_deleted}
                  >✎</button>
                  <button
                    className="icon-btn icon-btn-danger"
                    title="Delete"
                    onClick={() => setConfirmDelete(it)}
                    disabled={it.is_deleted}
                  >🗑</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <CatalogFormModal
          endpoint={endpoint}
          resourceLabel={resourceLabel}
          item={editing}
          showImageField={showImageField}
          onClose={() => setEditing(null)}
          onSaved={handleSaved}
        />
      )}

      {confirmDelete && (
        <div className="modal-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="admin-modal-title">Remove {resourceLabel.toLowerCase()}?</h2>
            <p className="admin-confirm-text">
              This soft-deletes "<strong>{confirmDelete.name}</strong>". It will be hidden by default
              but can be recovered by toggling "Show deleted".
            </p>
            <div className="admin-modal-actions">
              <button className="btn-ghost" onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button className="btn-danger" onClick={handleDelete}>Confirm remove</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CatalogFormModal({ endpoint, resourceLabel, item, showImageField = true, onClose, onSaved }) {
  const toast = useToast();
  const isEdit = Boolean(item.id);
  const [name, setName] = useState(item.name || '');
  const [description, setDescription] = useState(item.description || '');
  const [imageFile, setImageFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!name.trim() || name.trim().length < 2) {
      e.name = 'Name must be at least 2 characters.';
    } else if (name.length > 120) {
      e.name = 'Name must be under 120 characters.';
    }
    if (description.length > 4000) {
      e.description = 'Description is too long.';
    }
    if (showImageField && imageFile && !imageFile.type.startsWith('image/')) {
      e.image = 'Selected file must be an image.';
    }
    if (showImageField && imageFile && imageFile.size > 5 * 1024 * 1024) {
      e.image = 'Image must be 5 MB or less.';
    }
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const v = validate();
    if (Object.keys(v).length) {
      setErrors(v);
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      let payload;
      let config;
      if (showImageField) {
        payload = new FormData();
        payload.append('name', name.trim());
        payload.append('description', description);
        if (imageFile) payload.append('image', imageFile);
        config = { headers: { 'Content-Type': 'multipart/form-data' } };
      } else {
        payload = { name: name.trim(), description };
        config = { headers: { 'Content-Type': 'application/json' } };
      }

      if (isEdit) {
        await api.patch(`${endpoint}${item.id}/`, payload, config);
        toast.success(`${resourceLabel} updated.`);
      } else {
        await api.post(endpoint, payload, config);
        toast.success(`${resourceLabel} added.`);
      }
      onSaved();
    } catch (err) {
      const data = err.response?.data;
      if (data && typeof data === 'object') {
        const fe = {};
        Object.entries(data).forEach(([k, v]) => {
          fe[k] = Array.isArray(v) ? v.join(' ') : String(v);
        });
        setErrors(fe);
        toast.error('Please fix the errors below.');
      } else {
        toast.error('Save failed.');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="admin-modal-title">
          {isEdit ? `Edit ${resourceLabel}` : `Add ${resourceLabel}`}
        </h2>

        <form onSubmit={handleSubmit} className="catalog-form" noValidate>
          <div className="form-group">
            <label>Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
            {errors.name && <span className="field-error">{errors.name}</span>}
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              className="admin-textarea"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            {errors.description && <span className="field-error">{errors.description}</span>}
          </div>

          {showImageField && (
            <div className="form-group">
              <label>Image (optional)</label>
              {item.image && !imageFile && (
                <div className="catalog-current-image">
                  <img src={item.image} alt="current" />
                  <span>Current image</span>
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setImageFile(e.target.files?.[0] || null)}
              />
              {errors.image && <span className="field-error">{errors.image}</span>}
            </div>
          )}

          <div className="admin-modal-actions">
            <button type="button" className="btn-ghost" onClick={onClose} disabled={busy}>
              Cancel
            </button>
            <button type="submit" className="btn-success" disabled={busy}>
              {busy ? 'Saving...' : isEdit ? 'Save changes' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
