import { useRef, useState } from 'react';
import AdminProductForm from '../components/AdminProductForm';
import AdminPromocodeForm from '../components/AdminPromocodeForm';
import { AdminProductsAPI } from '../api';

export default function AdminDashboardPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const exportProducts = async () => {
    try {
      setBusy(true);
      const resp = await AdminProductsAPI.export();
      const jsonStr = typeof resp.data === 'string' ? resp.data : JSON.stringify(resp.data ?? []);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `products-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`;
      a.click();
      URL.revokeObjectURL(url);
      alert('Выгрузка завершена');
    } catch (e: any) {
      alert(e.response?.data?.error || e.message || 'Ошибка выгрузки товаров');
    } finally {
      setBusy(false);
    }
  };

  const importProducts = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      setBusy(true);
      await AdminProductsAPI.import(data);
      alert('Импорт завершен');
    } catch (err: any) {
      alert(err.response?.data?.error || err.message || 'Ошибка импорта товаров. Проверьте формат JSON.');
    } finally {
      setBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const clearAll = async () => {
    if (!confirm('Удалить ВСЕ товары? Будут очищены товары, связанные позиции корзины/избранного/заказы. Действие необратимо.')) {
      return;
    }
    try {
      setBusy(true);
      await AdminProductsAPI.clearAll();
      alert('Все товары удалены');
    } catch (e: any) {
      alert(e.response?.data?.error || e.message || 'Ошибка очистки товаров');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <h2>Админ-панель</h2>
      <div className="card" style={{ marginBottom: 'var(--spacing-md)' }}>
        <h3>Экспорт / Импорт товаров</h3>
        <div className="flex gap-sm" style={{ flexWrap: 'wrap' }}>
          <button onClick={exportProducts} disabled={busy}>Выгрузить товары (JSON)</button>
          <button onClick={importProducts} disabled={busy}>Загрузить товары (JSON)</button>
          <button className="danger" onClick={clearAll} disabled={busy}>Очистить таблицу товаров</button>
          <input
            type="file"
            ref={fileInputRef}
            accept="application/json"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
        </div>
      </div>
      <AdminProductForm mode="add" />
      <AdminProductForm mode="update" />
      <AdminProductForm mode="delete" />
      <AdminPromocodeForm />
    </div>
  );
}
