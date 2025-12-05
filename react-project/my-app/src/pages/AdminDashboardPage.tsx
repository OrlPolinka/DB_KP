import AdminProductForm from '../components/AdminProductForm';
import AdminPromocodeForm from '../components/AdminPromocodeForm';

export default function AdminDashboardPage() {
  return (
    <div>
      <h2>Админ-панель</h2>
      <AdminProductForm mode="add" />
      <AdminProductForm mode="update" />
      <AdminProductForm mode="delete" />
      <AdminPromocodeForm />
    </div>
  );
}
