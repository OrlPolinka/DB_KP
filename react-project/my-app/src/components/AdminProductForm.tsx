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
        await AdminProductsAPI.add({
          productName, description, categoryId, price, stockQuantity, imageUrl
        });
      } else if (mode === 'update') {
        await AdminProductsAPI.update({
          productId, productName, description, categoryId, price, stockQuantity, imageUrl
        });
      } else {
        await AdminProductsAPI.delete(productId);
      }
      alert('Готово');
    } catch (e: any) {
      alert(e.response?.data?.error ?? 'Ошибка');
    }
  };

  return (
    <div style={{ border: '1px solid #ddd', padding: 12, marginTop: 12 }}>
      <h3>{mode === 'add' ? 'Добавить товар' : mode === 'update' ? 'Изменить товар' : 'Удалить товар'}</h3>
      {(mode !== 'add') && (
        <input type="number" placeholder="ProductID" value={productId} onChange={e => setProductId(Number(e.target.value))} />
      )}
      {(mode !== 'delete') && (
        <>
          <input placeholder="Название" value={productName} onChange={e => setProductName(e.target.value)} />
          <textarea placeholder="Описание" value={description} onChange={e => setDescription(e.target.value)} />
          <select value={categoryId} onChange={e => setCategoryId(Number(e.target.value))}>
            <option value={0}>Выбери категорию</option>
            {cats.map(c => <option key={c.CategoryID} value={c.CategoryID}>{c.CategoryName}</option>)}
          </select>
          <input type="number" placeholder="Цена" value={price} onChange={e => setPrice(Number(e.target.value))} />
          <input type="number" placeholder="Склад" value={stockQuantity} onChange={e => setStockQuantity(Number(e.target.value))} />
          <input placeholder="Image URL" value={imageUrl} onChange={e => setImageUrl(e.target.value)} />
        </>
      )}
      <div><button onClick={submit}>Выполнить</button></div>
    </div>
  );
}
