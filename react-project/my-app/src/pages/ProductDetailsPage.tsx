import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ProductsAPI, CartAPI, FavoritesAPI } from '../api';
import { getUser } from '../auth';
import type { Product } from '../types';

export default function ProductDetailsPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const [p, setP] = useState<Product | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const user = getUser();

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const r = await ProductsAPI.byId(Number(id));
        setP(r.data);
        setErr(null);
      } catch (e: any) {
        setErr(e.response?.data?.error ?? 'Товар не найден');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const addToCart = async () => {
    if (!p) return;
    if (!user) {
      alert('Необходимо войти в систему');
      nav('/auth');
      return;
    }
    try {
      await CartAPI.addDelta(p.ProductID, 1);
      alert('Добавлено в корзину');
    } catch (e: any) {
      alert(e.response?.data?.error ?? 'Ошибка добавления');
    }
  };

  const addToFav = async () => {
    if (!p) return;
    if (!user) {
      alert('Необходимо войти в систему');
      nav('/auth');
      return;
    }
    try {
      await FavoritesAPI.add(p.ProductID);
      alert('Добавлено в избранное');
    } catch (e: any) {
      alert(e.response?.data?.error ?? 'Ошибка добавления');
    }
  };

  if (loading) {
    return (
      <div className="container" style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p>Загрузка...</p>
      </div>
    );
  }

  if (err) {
    return (
      <div className="container" style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <p className="text-error" style={{ fontSize: '1.25rem' }}>Ошибка: {err}</p>
          <button onClick={() => nav('/')} className="mt-md">Вернуться в каталог</button>
        </div>
      </div>
    );
  }

  if (!p) return null;

  return (
    <div className="container" style={{ maxWidth: '1200px', padding: 'var(--spacing-xl)' }}>
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr', 
        gap: 'var(--spacing-xl)',
        alignItems: 'start'
      }}>
        {/* Изображение */}
        <div style={{ 
          position: 'sticky',
          top: 'var(--spacing-xl)',
          backgroundColor: 'var(--color-bg)',
          borderRadius: 'var(--radius)',
          padding: 'var(--spacing-md)',
          boxShadow: 'var(--shadow-md)'
        }}>
          {p.ImageURL ? (
            <img 
              src={p.ImageURL} 
              alt={p.ProductName} 
              style={{ 
                width: '100%', 
                height: 'auto',
                borderRadius: 'var(--radius)',
                objectFit: 'contain',
                maxHeight: '600px'
              }} 
            />
          ) : (
            <div style={{
              width: '100%',
              height: '400px',
              backgroundColor: 'var(--color-bg-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 'var(--radius)',
              color: 'var(--color-text-light)'
            }}>
              Нет изображения
            </div>
          )}
        </div>

        {/* Информация о товаре */}
        <div>
          <h1 style={{ marginBottom: 'var(--spacing-md)', fontSize: '2.5rem' }}>{p.ProductName}</h1>
          
          {p.CategoryName && (
            <div className="mb-md">
              <span className="badge badge-primary">{p.CategoryName}</span>
            </div>
          )}

          <div style={{ 
            fontSize: '2rem', 
            fontWeight: 'bold',
            color: 'var(--color-primary)',
            marginBottom: 'var(--spacing-lg)'
          }}>
            {p.DiscountedPrice ? (
              <>
                <span style={{ textDecoration: 'line-through', color: 'var(--color-text-light)', fontSize: '1.5rem', marginRight: 'var(--spacing-sm)' }}>
                  {p.Price.toFixed(2)}
                </span>
                <span style={{ color: 'var(--color-success)' }}>
                  {p.DiscountedPrice.toFixed(2)}
                </span>
              </>
            ) : (
              <span>{p.Price.toFixed(2)}</span>
            )}
          </div>

          <div className="card mb-lg">
            <h3 style={{ marginBottom: 'var(--spacing-sm)' }}>Описание</h3>
            <p style={{ lineHeight: '1.8', fontSize: '1.1rem', color: 'var(--color-text)' }}>
              {p.Description || 'Описание отсутствует'}
            </p>
          </div>

          <div className="card mb-lg">
            <h3 style={{ marginBottom: 'var(--spacing-sm)' }}>Характеристики</h3>
            <div style={{ display: 'grid', gap: 'var(--spacing-sm)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="text-muted">Категория:</span>
                <span>{p.CategoryName || p.CategoryID || 'Не указана'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="text-muted">Наличие:</span>
                <span style={{ color: p.StockQuantity > 0 ? 'var(--color-success)' : 'var(--color-error)' }}>
                  {p.StockQuantity > 0 ? `В наличии (${p.StockQuantity} шт.)` : 'Нет в наличии'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-md" style={{ flexWrap: 'wrap' }}>
            <button 
              onClick={addToCart} 
              disabled={p.StockQuantity === 0}
              style={{ flex: 1, minWidth: 200, padding: 'var(--spacing-md)', fontSize: '1.1rem' }}
            >
              {p.StockQuantity > 0 ? 'В корзину' : 'Нет в наличии'}
            </button>
            <button 
              onClick={addToFav}
              className="secondary"
              style={{ flex: 1, minWidth: 200, padding: 'var(--spacing-md)', fontSize: '1.1rem' }}
            >
              В избранное
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
