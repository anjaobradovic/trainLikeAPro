import CatalogManager from './CatalogManager';

export default function AdminEquipment() {
  return (
    <CatalogManager
      resourceLabel="Equipment"
      resourceLabelPlural="Equipment"
      endpoint="/admin/equipment/"
    />
  );
}
