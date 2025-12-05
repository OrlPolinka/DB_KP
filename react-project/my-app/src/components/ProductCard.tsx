import type { Product } from '../types';
import { Link } from 'react-router-dom';
import { CartAPI, FavoritesAPI } from '../api';

type Props = { p: Product; onAction?: () => void };

export default function ProductCard({ p, onAction }: Props) {
  const addToCart = async () => {
    try { await CartAPI.addDelta(p.ProductID, 1); onAction?.(); }
    catch (e: any) { alert(e.response?.data?.error ?? 'Ошибка добавления в корзину'); }
  };
  const addToFav = async () => {
    try { await FavoritesAPI.add(p.ProductID); onAction?.(); }
    catch (e: any) { alert(e.response?.data?.error ?? 'Ошибка добавления в избранное'); }
  };
  return (
    <div style={{ border: '1px solid #eee', padding: 12, marginBottom: 12 }}>
      <h3>{p.ProductName}</h3>
      <p>{p.Description}</p>
      <p>Категория: {p.CategoryName ?? p.CategoryID}</p>
      <p>Цена: {(p.DiscountedPrice ?? p.Price).toFixed(2)}</p>
      <div style={{ display: 'flex', gap: 8 }}>
        <Link to={`/product/${p.ProductID}`}>Подробнее</Link>
        <button onClick={addToCart}>В корзину</button>
        <button onClick={addToFav}>В избранное</button>
      </div>
    </div>
  );
}
