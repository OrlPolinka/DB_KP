import { Link, useNavigate, useLocation } from 'react-router-dom';
import { getUser, clearAuth } from '../auth';

export default function NavBar() {
  const user = getUser();
  const nav = useNavigate();
  const loc = useLocation();

  const logout = () => {
    clearAuth();
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
      <div style={{ marginLeft: 'auto' }}>
        {user ? (
          <>
            <span>Привет, {user.Username} ({user.RoleName})</span>{' '}
            <button onClick={logout}>Выйти</button>
          </>
        ) : (
          <Link to="/auth">Войти / Регистрация</Link>
        )}
      </div>
    </nav>
  );
}
