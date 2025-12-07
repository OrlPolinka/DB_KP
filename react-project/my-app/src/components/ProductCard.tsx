import type { Product } from '../types';
import { Link } from 'react-router-dom';
import { CartAPI, FavoritesAPI } from '../api';
import { getUser } from '../auth';

type Props = { p: Product; onAction?: () => void };

export default function ProductCard({ p, onAction }: Props) {
  const user = getUser();

  const addToCart = async () => {
    if (!user) {
      alert('Необходимо войти в систему');
      return;
    }
    if (p.StockQuantity <= 0) {
      alert('Товара нет на складе');
      return;
    }
    try {
      await CartAPI.addDelta(p.ProductID, 1);
      // Не вызываем onAction, чтобы страница не перезагружалась
    } catch (e: any) {
      alert(e.response?.data?.error ?? 'Ошибка добавления в корзину');
    }
  };

  const addToFav = async () => {
    if (!user) {
      alert('Необходимо войти в систему');
      return;
    }
    try {
      await FavoritesAPI.add(p.ProductID);
      // Не вызываем onAction, чтобы страница не перезагружалась
    } catch (e: any) {
      alert(e.response?.data?.error ?? 'Ошибка добавления в избранное');
    }
  };

  return (
    <div className="product-card">
      {p.ImageURL && (
        <img src={p.ImageURL} alt={p.ProductName} style={{ width: '100%', height: 200, objectFit: 'cover' }} />
      )}
      <h3 style={{ marginTop: 'var(--spacing-sm)' }}>{p.ProductName}</h3>
      <p className="text-muted" style={{ fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
        {p.Description}
      </p>
      <p className="text-muted">Категория: {p.CategoryName ?? p.CategoryID}</p>
      <p style={{ 
        marginBottom: 'var(--spacing-xs)', 
        color: p.StockQuantity > 0 ? 'var(--color-success)' : 'var(--color-error)',
        fontWeight: 'bold',
        fontSize: '0.9rem'
      }}>
        {p.StockQuantity > 0 ? `В наличии (${p.StockQuantity} шт.)` : 'Нет в наличии'}
      </p>
      <p><strong>Цена: {(p.DiscountedPrice ?? p.Price).toFixed(2)}</strong></p>
      <div className="flex gap-sm" style={{ flexWrap: 'wrap' }}>
        <Link to={`/product/${p.ProductID}`} className="badge badge-primary">Подробнее</Link>
        <button 
          onClick={addToCart} 
          disabled={p.StockQuantity <= 0}
          style={{ flex: 1 }}
          title={p.StockQuantity <= 0 ? 'Товара нет на складе' : ''}
        >
          {p.StockQuantity <= 0 ? 'Нет в наличии' : 'В корзину'}
        </button>
        <button onClick={addToFav} className="secondary" style={{ flex: 1 }}>В избранное</button>
      </div>
    </div>
  );
}
