import { useEffect, useState } from 'react';
import { FavoritesAPI } from '../api';
import type { Product } from '../types';

export default function FavoritesPage() {
  const [items, setItems] = useState<Product[]>([]);
  const load = async () => {
    try { setItems((await FavoritesAPI.list()).data); }
    catch (e: any) { alert(e.response?.data?.error ?? 'Ошибка: Требуется авторизация'); }
  };
  useEffect(() => { load(); }, []);
  const remove = async (pid: number) => { await FavoritesAPI.deleteByProduct(pid); load(); };

  return (
    <div>
      <h2>Избранное</h2>
      {items.length === 0 && <p>Нет избранных товаров</p>}
      {items.map(p => (
        <div key={p.ProductID} style={{ borderBottom: '1px solid #eee', padding: 8 }}>
          <b>{p.ProductName}</b> — {p.CategoryName} — {(p.DiscountedPrice ?? p.Price).toFixed(2)}
          <div><button onClick={() => remove(p.ProductID)}>Удалить из избранного</button></div>
        </div>
      ))}
    </div>
  );
}
