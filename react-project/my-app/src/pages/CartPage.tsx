import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { CartAPI, OrdersAPI, AdminPromocodesAPI } from '../api';
import { getUser } from '../auth';
import type { CartItem, Promocode } from '../types';

export default function CartPage() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [promo, setPromo] = useState('');
  const [promocodes, setPromocodes] = useState<Promocode[]>([]);
  const [loading, setLoading] = useState(true);
  const nav = useNavigate();
  const user = useMemo(() => getUser(), []);

  useEffect(() => {
    if (!user) {
      nav('/auth');
      return;
    }
    load();
    loadPromocodes();
  }, []);

  const load = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const data = await CartAPI.list();
      setItems(data.data || []);
    } catch (e: any) {
      if (e.response?.status === 401) {
        nav('/auth');
      } else {
        console.error('Ошибка загрузки корзины:', e);
        setItems([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadPromocodes = async () => {
    try {
      const data = await AdminPromocodesAPI.list();
      setPromocodes(data.data || []);
    } catch (e: any) {
      console.error('Ошибка загрузки промокодов:', e);
    }
  };

  const setQty = async (productId: number, q: number) => {
    try {
      await CartAPI.setQuantity(productId, q);
      load();
    } catch (e: any) {
      alert(e.response?.data?.error ?? 'Ошибка обновления количества');
    }
  };

  const remove = async (productId: number) => {
    try {
      await CartAPI.remove(productId);
      load();
    } catch (e: any) {
      alert(e.response?.data?.error ?? 'Ошибка удаления');
    }
  };

  const inc = async (productId: number) => {
    try {
      await CartAPI.addDelta(productId, 1);
      load();
    } catch (e: any) {
      alert(e.response?.data?.error ?? 'Ошибка добавления');
    }
  };

  const dec = async (productId: number, curr: number) => {
    try {
      await CartAPI.setQuantity(productId, Math.max(0, curr - 1));
      load();
    } catch (e: any) {
      alert(e.response?.data?.error ?? 'Ошибка уменьшения');
    }
  };

  // Вычисляем скидку на основе выбранного промокода
  const selectedPromo = promocodes.find(p => p.Code === promo);
  
  const getItemPrice = (item: CartItem) => {
    if (!selectedPromo) return item.Price;
    
    // Проверяем, применяется ли промокод к этому товару
    // Глобальный промокод применяется ко всем товарам
    // Промокод по категории применяется только к товарам этой категории
    const appliesToItem = selectedPromo.IsGlobal || 
      (selectedPromo.CategoryName && item.CategoryName === selectedPromo.CategoryName);
    
    if (appliesToItem) {
      return item.Price * (1 - selectedPromo.DiscountPercent / 100);
    }
    return item.Price;
  };
  
  const total = items.reduce((s, i) => s + getItemPrice(i) * i.Quantity, 0);

  const order = async () => {
    // Проверка наличия товаров на складе
    const outOfStock = items.filter(i => (i.StockQuantity ?? 0) < i.Quantity);
    if (outOfStock.length > 0) {
      const productNames = outOfStock.map(i => i.ProductName).join(', ');
      alert(`Товара нет на складе: ${productNames}`);
      return;
    }

    try {
      await OrdersAPI.create(promo || undefined);
      alert('Заказ оформлен');
      setPromo('');
      load();
    } catch (e: any) {
      const errorMsg = e.response?.data?.error ?? 'Ошибка оформления';
      alert(errorMsg);
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
      <h2>Корзина</h2>
      {items.length === 0 && <p>Корзина пуста</p>}
      {items.map(i => (
        <div key={i.CartItemID} className="card" style={{ display: 'flex', gap: 'var(--spacing-md)', alignItems: 'flex-start' }}>
          {/* Картинка товара */}
          <div style={{ flexShrink: 0, width: 150 }}>
            {i.ImageURL ? (
              <Link to={`/product/${i.ProductID}`}>
                <img 
                  src={i.ImageURL} 
                  alt={i.ProductName} 
                  style={{ 
                    width: '100%', 
                    height: 150, 
                    objectFit: 'cover', 
                    borderRadius: 'var(--radius)',
                    cursor: 'pointer'
                  }} 
                />
              </Link>
            ) : (
              <div style={{
                width: '100%',
                height: 150,
                backgroundColor: 'var(--color-bg-secondary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 'var(--radius)',
                color: 'var(--color-text-light)',
                fontSize: '0.875rem'
              }}>
                Нет изображения
              </div>
            )}
          </div>
          
          {/* Информация о товаре */}
          <div style={{ flex: 1 }}>
            <Link to={`/product/${i.ProductID}`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <h3 style={{ marginBottom: 'var(--spacing-xs)', cursor: 'pointer' }}>{i.ProductName}</h3>
            </Link>
            <p className="text-muted" style={{ marginBottom: 'var(--spacing-sm)' }}>{i.CategoryName}</p>
            {i.StockQuantity !== undefined && (
              <p style={{ 
                marginBottom: 'var(--spacing-xs)', 
                color: i.StockQuantity < i.Quantity ? 'var(--color-error)' : 'var(--color-text)',
                fontWeight: i.StockQuantity < i.Quantity ? 'bold' : 'normal'
              }}>
                На складе: {i.StockQuantity} {i.StockQuantity < i.Quantity && '(недостаточно)'}
              </p>
            )}
            {(() => {
              const itemPrice = getItemPrice(i);
              const hasDiscount = selectedPromo && itemPrice < i.Price;
              return (
                <>
                  {hasDiscount && (
                    <p style={{ 
                      marginBottom: 'var(--spacing-xs)', 
                      color: 'var(--color-success)',
                      fontWeight: 'bold'
                    }}>
                      🎉 Акция! Скидка {selectedPromo.DiscountPercent}%
                    </p>
                  )}
                  <p style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: 'var(--spacing-sm)' }}>
                    {i.Quantity} × {itemPrice.toFixed(2)} = 
                    <span style={{ color: 'var(--color-primary)' }}>
                      {' '}{(itemPrice * i.Quantity).toFixed(2)}
                    </span>
                    {hasDiscount && (
                      <span style={{ 
                        textDecoration: 'line-through', 
                        color: 'var(--color-text-light)', 
                        fontSize: '0.9rem',
                        marginLeft: 'var(--spacing-xs)'
                      }}>
                        {(i.Price * i.Quantity).toFixed(2)}
                      </span>
                    )}
                  </p>
                </>
              );
            })()}
            <div className="flex gap-sm" style={{ flexWrap: 'wrap', alignItems: 'center' }}>
              <button onClick={() => dec(i.ProductID, i.Quantity)}>-</button>
              <input 
                type="number" 
                min={0} 
                value={i.Quantity}
                onChange={e => setQty(i.ProductID, Number(e.target.value))}
                style={{ width: 80, textAlign: 'center' }}
              />
              <button onClick={() => inc(i.ProductID)}>+</button>
              <button onClick={() => remove(i.ProductID)} className="danger">Удалить</button>
            </div>
          </div>
        </div>
      ))}
      {items.length > 0 && (
        <>
          <div className="card mt-lg" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
              <h3 style={{ margin: 0 }}>Итого:</h3>
              <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--color-primary)' }}>
                {total.toFixed(2)}
              </span>
            </div>
            <div className="flex gap-md" style={{ flexWrap: 'wrap' }}>
              <select 
                value={promo} 
                onChange={e => setPromo(e.target.value)}
                style={{ flex: 1, minWidth: 200 }}
              >
                <option value="">Выберите промокод</option>
                {promocodes
                  .filter(p => {
                    // Показываем только активные промокоды
                    const now = new Date();
                    const validFrom = p.ValidFrom ? new Date(p.ValidFrom) : null;
                    const validTo = p.ValidTo ? new Date(p.ValidTo) : null;
                    if (validFrom && now < validFrom) return false;
                    if (validTo && now > validTo) return false;
                    return true;
                  })
                  .map(p => (
                    <option key={p.PromoID} value={p.Code}>
                      {p.Code} ({p.DiscountPercent}% скидка{p.CategoryName ? ` на ${p.CategoryName}` : ' глобальная'})
                    </option>
                  ))}
              </select>
              <button onClick={order} style={{ padding: 'var(--spacing-md)', fontSize: '1.1rem' }}>
                Оформить заказ
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}