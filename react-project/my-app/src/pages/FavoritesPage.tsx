import { useEffect, useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FavoritesAPI, CartAPI } from '../api';
import { getUser } from '../auth';
import type { Product } from '../types';

export default function FavoritesPage() {
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const nav = useNavigate();
  const user = useMemo(() => getUser(), []);

  useEffect(() => {
    if (!user) {
      nav('/auth');
      return;
    }
    load();
  }, []);

  const load = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const data = await FavoritesAPI.list();
      setItems(data.data || []);
    } catch (e: any) {
      if (e.response?.status === 401) {
        nav('/auth');
      } else {
        console.error('Ошибка загрузки избранного:', e);
        setItems([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const remove = async (pid: number) => {
    try {
      await FavoritesAPI.deleteByProduct(pid);
      load();
    } catch (e: any) {
      alert(e.response?.data?.error ?? 'Ошибка удаления');
    }
  };

  const addToCart = async (p: Product) => {
    try {
      await CartAPI.addDelta(p.ProductID, 1);
      alert('Добавлено в корзину');
    } catch (e: any) {
      alert(e.response?.data?.error ?? 'Ошибка добавления в корзину');
    }
  };

  if (!user) {
    return null;
  }

  if (loading) {
    return <div className="container"><p>Загрузка...</p></div>;
  }

  return (
    <div className="container">
      <h2>Избранное</h2>
      {items.length === 0 && <p>Нет избранных товаров</p>}
      <div className="grid grid-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))' }}>
        {items.map(p => (
          <div key={p.ProductID} className="product-card">
            {p.ImageURL && (
              <img 
                src={p.ImageURL} 
                alt={p.ProductName} 
                style={{ 
                  width: '100%', 
                  height: 200, 
                  objectFit: 'cover', 
                  borderRadius: 'var(--radius)', 
                  marginBottom: 'var(--spacing-sm)' 
                }} 
              />
            )}
            <h3 style={{ marginBottom: 'var(--spacing-xs)' }}>{p.ProductName}</h3>
            <p className="text-muted">{p.CategoryName}</p>
            <p style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 'var(--spacing-sm) 0' }}>
              {(p.DiscountedPrice ?? p.Price).toFixed(2)}
            </p>
            <div className="flex gap-sm" style={{ flexWrap: 'wrap' }}>
              <Link 
                to={`/product/${p.ProductID}`} 
                className="badge badge-primary"
                style={{ textDecoration: 'none', padding: 'var(--spacing-xs) var(--spacing-sm)' }}
              >
                Подробнее
              </Link>
              <button 
                onClick={() => addToCart(p)}
                style={{ flex: 1 }}
              >
                В корзину
              </button>
              <button 
                onClick={() => remove(p.ProductID)} 
                className="danger"
                style={{ flex: 1 }}
              >
                Удалить
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
