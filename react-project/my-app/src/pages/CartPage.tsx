import { useEffect, useState } from 'react';
import { CartAPI, OrdersAPI } from '../api';
import type { CartItem } from '../types';

export default function CartPage() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [promo, setPromo] = useState('');

  const load = async () => {
    try { setItems((await CartAPI.list()).data); }
    catch (e: any) { alert(e.response?.data?.error ?? 'Ошибка: Требуется авторизация'); }
  };
  useEffect(() => { load(); }, []);

  const setQty = async (productId: number, q: number) => {
    await CartAPI.setQuantity(productId, q);
    load();
  };
  const remove = async (productId: number) => {
    await CartAPI.remove(productId);
    load();
  };
  const inc = async (productId: number) => { await CartAPI.addDelta(productId, 1); load(); };
  const dec = async (productId: number, curr: number) => { await CartAPI.setQuantity(productId, Math.max(0, curr - 1)); load(); };

  const total = items.reduce((s, i) => s + (i.DiscountedPrice ?? i.Price) * i.Quantity, 0);

  const order = async () => {
    try { await OrdersAPI.create(promo || undefined); alert('Заказ оформлен'); setPromo(''); load(); }
    catch (e: any) { alert(e.response?.data?.error ?? 'Ошибка оформления'); }
  };

  return (
    <div>
      <h2>Корзина</h2>
      {items.length === 0 && <p>Корзина пуста</p>}
      {items.map(i => (
        <div key={i.CartItemID} style={{ borderBottom: '1px solid #eee', padding: 8 }}>
          <b>{i.ProductName}</b> — {i.Quantity} × {(i.DiscountedPrice ?? i.Price).toFixed(2)}
          <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
            <button onClick={() => dec(i.ProductID, i.Quantity)}>-</button>
            <button onClick={() => inc(i.ProductID)}>+</button>
            <button onClick={() => remove(i.ProductID)}>Удалить</button>
            <input type="number" min={0} value={i.Quantity}
              onChange={e => setQty(i.ProductID, Number(e.target.value))} />
          </div>
        </div>
      ))}
      <p>Итого: {total.toFixed(2)}</p>
      <div style={{ display: 'flex', gap: 8 }}>
        <input placeholder="Промокод" value={promo} onChange={e => setPromo(e.target.value)} />
        <button onClick={order}>Оформить заказ</button>
      </div>
    </div>
  );
}
