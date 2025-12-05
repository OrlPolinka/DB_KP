import { useEffect, useState } from 'react';
import { OrdersAPI } from '../api';
import type { OrderSummary, OrderDetail } from '../types';

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [details, setDetails] = useState<OrderDetail[]>([]);

  const load = async () => {
    try { setOrders((await OrdersAPI.myOrders()).data); }
    catch (e: any) { alert(e.response?.data?.error ?? 'Ошибка: Требуется авторизация'); }
  };
  useEffect(() => { load(); }, []);

  const openDetails = async (orderId: number) => {
    try { setSelected(orderId); setDetails((await OrdersAPI.details(orderId)).data); }
    catch (e: any) { alert(e.response?.data?.error ?? 'Ошибка получения деталей'); }
  };

  return (
    <div>
      <h2>Мои заказы</h2>
      {orders.length === 0 && <p>Пока нет заказов</p>}
      {orders.map(o => (
        <div key={o.OrderID} style={{ borderBottom: '1px solid #eee', padding: 8 }}>
          <b>Заказ #{o.OrderID}</b> — Итого: {o.TotalPrice.toFixed(2)} — {o.DisplayName}
          <div><button onClick={() => openDetails(o.OrderID)}>Детали</button></div>
          {selected === o.OrderID && (
            <div style={{ marginTop: 8, paddingLeft: 12 }}>
              {details.map((d, idx) => (
                <div key={idx}>
                  {d.ProductName}: {d.Quantity} × {d.UnitPrice.toFixed(2)} = {d.LineTotal.toFixed(2)} ({d.Status})
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
