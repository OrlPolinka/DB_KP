import { useEffect, useState } from 'react';
import { AdminProductsAPI, CategoriesAPI } from '../api';
import type { Category } from '../types';

type Props = {
  mode: 'add' | 'update' | 'delete';
};

export default function AdminProductForm({ mode }: Props) {
  const [cats, setCats] = useState<Category[]>([]);
  const [productId, setProductId] = useState<number>(0);
  const [productName, setProductName] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState<number>(0);
  const [price, setPrice] = useState<number>(0);
  const [stockQuantity, setStockQuantity] = useState<number>(0);
  const [imageUrl, setImageUrl] = useState('');

  useEffect(() => {
    CategoriesAPI.list().then(r => setCats(r.data));
  }, []);

  const submit = async () => {
    try {
      if (mode === 'add') {
        if (!productName || !description || !categoryId || !price || !stockQuantity) {
          alert('Заполните все обязательные поля');
          return;
        }
        await AdminProductsAPI.add({
          productName, description, categoryId, price, stockQuantity, imageUrl
        });
        alert('Товар добавлен');
        // Очистка полей
        setProductName('');
        setDescription('');
        setCategoryId(0);
        setPrice(0);
        setStockQuantity(0);
        setImageUrl('');
      } else if (mode === 'update') {
        if (!productId || !productName || !description || !categoryId || !price || !stockQuantity) {
          alert('Заполните все обязательные поля');
          return;
        }
        await AdminProductsAPI.update({
          productId, productName, description, categoryId, price, stockQuantity, imageUrl
        });
        alert('Товар обновлен');
      } else {
        if (!productId) {
          alert('Введите ID товара');
          return;
        }
        if (!confirm(`Вы уверены, что хотите удалить товар с ID ${productId}?`)) {
          return;
        }
        await AdminProductsAPI.delete(productId);
        alert('Товар удален');
        setProductId(0);
      }
    } catch (e: any) {
      console.error('Ошибка:', e);
      const errorMsg = e.response?.data?.error || e.message || 'Ошибка';
      alert('Ошибка: ' + errorMsg);
    }
  };

  return (
    <div className="card" style={{ marginBottom: 'var(--spacing-md)' }}>
      <h3>{mode === 'add' ? 'Добавить товар' : mode === 'update' ? 'Изменить товар' : 'Удалить товар'}</h3>
      <div className="form-group">
        {(mode !== 'add') && (
          <div className="form-group">
            <label>ID товара (ProductID):</label>
            <input 
              type="number" 
              placeholder="Введите ID товара" 
              value={productId || ''} 
              onChange={e => setProductId(Number(e.target.value))} 
            />
          </div>
        )}
        {(mode !== 'delete') && (
          <>
            <div className="form-group">
              <label>Название товара:</label>
              <input 
                placeholder="Введите название товара" 
                value={productName} 
                onChange={e => setProductName(e.target.value)} 
              />
            </div>
            <div className="form-group">
              <label>Описание товара:</label>
              <textarea 
                placeholder="Введите описание товара" 
                value={description} 
                onChange={e => setDescription(e.target.value)}
                rows={4}
              />
            </div>
            <div className="form-group">
              <label>Категория товара:</label>
              <select value={categoryId} onChange={e => setCategoryId(Number(e.target.value))}>
                <option value={0}>Выберите категорию</option>
                {cats.map(c => <option key={c.CategoryID} value={c.CategoryID}>{c.CategoryName}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Цена товара (в рублях):</label>
              <input 
                type="number" 
                step="0.01"
                placeholder="Введите цену товара" 
                value={price || ''} 
                onChange={e => setPrice(Number(e.target.value))} 
              />
            </div>
            <div className="form-group">
              <label>Количество на складе:</label>
              <input 
                type="number" 
                placeholder="Введите количество товара на складе" 
                value={stockQuantity || ''} 
                onChange={e => setStockQuantity(Number(e.target.value))} 
              />
            </div>
            <div className="form-group">
              <label>URL изображения товара:</label>
              <input 
                placeholder="Введите URL изображения (необязательно)" 
                value={imageUrl} 
                onChange={e => setImageUrl(e.target.value)} 
              />
            </div>
          </>
        )}
        <div className="form-actions">
          <button onClick={submit}>
            {mode === 'add' ? 'Добавить товар' : mode === 'update' ? 'Обновить товар' : 'Удалить товар'}
          </button>
        </div>
      </div>
    </div>
  );
}
