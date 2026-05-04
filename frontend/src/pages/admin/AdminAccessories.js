import CatalogManager from './CatalogManager';

export default function AdminAccessories() {
  return (
    <CatalogManager
      resourceLabel="Accessory"
      resourceLabelPlural="Accessories"
      endpoint="/admin/accessories/"
    />
  );
}
