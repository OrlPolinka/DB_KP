import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { getUser, clearAuth } from '../auth';
import type { SessionUser } from '../auth';

export default function NavBar() {
  const [user, setUser] = useState<SessionUser | null>(getUser());
  const nav = useNavigate();
  const loc = useLocation();

// Слушаем изменения localStorage для обновления состояния пользователя
useEffect(() => {
  const handleStorageChange = () => {
    setUser(getUser());
  };

  // Слушаем события storage (когда localStorage изменяется в другой вкладке)
  window.addEventListener('storage', handleStorageChange);
  
  // Также проверяем при изменении маршрута
  setUser(getUser());

  return () => {
    window.removeEventListener('storage', handleStorageChange);
  };
}, [loc.pathname]);

  const logout = () => {
    clearAuth();
    setUser(null);
    if (loc.pathname !== '/') nav('/');
  };

  return (
    <nav style={{ display: 'flex', gap: 12, padding: 12, borderBottom: '1px solid #ddd' }}>
      <Link to="/">Каталог</Link>
      <Link to="/cart">Корзина</Link>
      <Link to="/favorites">Избранное</Link>
      <Link to="/orders">Мои заказы</Link>
      {user?.RoleName === 'Admin' && <Link to="/admin">Админка</Link>}
      {user?.RoleName === 'Admin' && <Link to="/admin/logs">Лог</Link>}
      <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
        {user ? (
          <>
            <span>Привет, {user.Username} ({user.RoleName})</span>{' '}
            <Link to="/auth" style={{ color: '#d32f2f', textDecoration: 'none' }}>
              Удалить аккаунт
            </Link>{' '}
            <button onClick={logout}>Выйти</button>
          </>
        ) : (
          <Link to="/auth">Войти / Регистрация</Link>
        )}
      </div>
    </nav>
  );
}
