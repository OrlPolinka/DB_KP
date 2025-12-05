import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { OrdersAPI } from '../api';
import { getUser } from '../auth';
import type { OrderSummary, OrderDetail } from '../types';

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [details, setDetails] = useState<OrderDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const nav = useNavigate();
  const user = useMemo(() => getUser(), []); // Мемоизируем пользователя

  useEffect(() => {
    if (!user) {
      nav('/auth');
      return;
    }
    load();
  }, []); // Убираем зависимость от user

  const load = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const data = await OrdersAPI.myOrders();
      setOrders(data.data || []);
    } catch (e: any) {
      if (e.response?.status === 401) {
        nav('/auth');
      } else {
        console.error('Ошибка загрузки заказов:', e);
        setOrders([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const openDetails = async (orderId: number) => {
    try {
      setSelected(orderId);
      const data = await OrdersAPI.details(orderId);
      setDetails(data.data || []);
    } catch (e: any) {
      alert(e.response?.data?.error ?? 'Ошибка получения деталей');
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
      <h2>Мои заказы</h2>
      {orders.length === 0 && <p>Пока нет заказов</p>}
      {orders.map(o => (
        <div key={o.OrderID} className="card">
          <b>Заказ #{o.OrderID}</b> — Итого: {o.TotalPrice.toFixed(2)} — {o.DisplayName}
          <div className="mt-sm">
            <button onClick={() => openDetails(o.OrderID)}>
              {selected === o.OrderID ? 'Скрыть детали' : 'Показать детали'}
            </button>
          </div>
          {selected === o.OrderID && details.length > 0 && (
            <div className="mt-md" style={{ paddingLeft: 12, borderLeft: '2px solid var(--color-border)' }}>
              {details.map((d, idx) => (
                <div key={idx} className="mb-sm">
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
