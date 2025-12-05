import { Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import NavBar from './components/NavBar';
import CatalogPage from './pages/CatalogPage';
import ProductDetailsPage from './pages/ProductDetailsPage';
import CartPage from './pages/CartPage';
import FavoritesPage from './pages/FavoritesPage';
import OrdersPage from './pages/OrdersPage';
import AuthPage from './pages/AuthPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import LogsPage from './pages/LogsPage';
import { getToken } from './auth';
import { api } from './api';

export default function App() {

  useEffect(() => {
    // Проверяем токен при загрузке приложения
    const token = getToken();
    if (token) {
      // Можно добавить эндпоинт для проверки токена, но пока просто проверяем наличие
      // Если токен есть, он будет автоматически добавлен в запросы через interceptor
    }
  }, []);

  return (
    <div>
      <NavBar />
      <div style={{ padding: 16 }}>
        <Routes>
          <Route path="/" element={<CatalogPage />} />
          <Route path="/product/:id" element={<ProductDetailsPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/favorites" element={<FavoritesPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/admin" element={<AdminDashboardPage />} />
          <Route path="/admin/logs" element={<LogsPage />} />
        </Routes>
      </div>
    </div>
  );
}
