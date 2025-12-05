import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ProductsAPI, CartAPI, FavoritesAPI } from '../api';
import type { Product } from '../types';

export default function ProductDetailsPage() {
  const { id } = useParams();
  const [p, setP] = useState<Product | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await ProductsAPI.byId(Number(id));
        setP(r.data);
        setErr(null);
      } catch (e: any) {
        setErr(e.response?.data?.error ?? 'Товар не найден');
      }
    })();
  }, [id]);

  const addToCart = async () => {
    if (!p) return;
    try { await CartAPI.addDelta(p.ProductID, 1); alert('Добавлено в корзину'); }
    catch (e: any) { alert(e.response?.data?.error ?? 'Ошибка добавления'); }
  };
  const addToFav = async () => {
    if (!p) return;
    try { await FavoritesAPI.add(p.ProductID); alert('Добавлено в избранное'); }
    catch (e: any) { alert(e.response?.data?.error ?? 'Ошибка добавления'); }
  };

  if (err) return <p style={{ color: 'red' }}>Ошибка: {err}</p>;
  if (!p) return <p>Загрузка...</p>;

  return (
    <div>
      <h2>{p.ProductName}</h2>
      <p>{p.Description}</p>
      <p>Категория: {p.CategoryName}</p>
      <p>Цена: {(p.DiscountedPrice ?? p.Price).toFixed(2)}</p>
      <button onClick={addToCart}>В корзину</button>{' '}
      <button onClick={addToFav}>В избранное</button>
    </div>
  );
}
