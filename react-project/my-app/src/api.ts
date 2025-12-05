import axios from 'axios';
import { getToken } from './auth';

export const api = axios.create({
  baseURL: 'http://localhost:3001', // при желании поставь '/api' и добавь proxy в vite.config.ts
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auth
export const AuthAPI = {
  register: (data: { username: string; passwordHash: string; email: string }) =>
    api.post('/auth/register', data),
  login: (data: { username: string; passwordHash: string }) =>
    api.post('/auth/login', data),
  deleteOwn: (passwordHash?: string) =>
    api.post('/auth/delete-own', { passwordHash }),
};

// Products
export const ProductsAPI = {
  list: () => api.get('/products'),
  top100: () => api.get('/products/top100'),
  byId: (id: number) => api.get(`/products/${id}`),
  search: (q: string) => api.get('/products/search', { params: { q } }),
  byCategory: (params: { categoryId?: number; categoryName?: string }) =>
    api.get('/products/by-category', { params }),
};

// Categories
export const CategoriesAPI = {
  list: () => api.get('/categories'),
};

// Favorites
export const FavoritesAPI = {
  list: () => api.get('/favorites'),
  add: (productId: number) => api.post('/favorites', { productId }),
  deleteByProduct: (productId: number) => api.delete(`/favorites/by-product/${productId}`),
};

// Cart
export const CartAPI = {
  list: () => api.get('/cart'),
  addDelta: (productId: number, quantityDelta = 1) =>
    api.post('/cart/add', { productId, quantity: quantityDelta }),
  setQuantity: (productId: number, quantity: number) =>
    api.post('/cart/set', { productId, quantity }),
  remove: (productId: number) => api.delete(`/cart/${productId}`),
};

// Orders
export const OrdersAPI = {
  create: (promoCode?: string) => api.post('/orders/create', { promoCode }),
  myOrders: () => api.get('/orders'),
  details: (orderId: number) => api.get(`/orders/${orderId}`),
};

// Admin: Products
export const AdminProductsAPI = {
  add: (payload: {
    productName: string;
    description: string;
    categoryId: number;
    price: number;
    stockQuantity: number;
    imageUrl?: string;
  }) => api.post('/admin/products/add', payload),
  update: (payload: {
    productId: number;
    productName: string;
    description: string;
    categoryId: number;
    price: number;
    stockQuantity: number;
    imageUrl?: string;
  }) => api.post('/admin/products/update', payload),
  delete: (productId: number) => api.post('/admin/products/delete', { productId }),
};

// Admin: Promocodes
export const AdminPromocodesAPI = {
  list: () => api.get('/admin/promocodes'),
  add: (payload: {
    code: string;
    discountPercent: number;
    isGlobal: boolean;
    categoryId?: number;
    validFrom?: string;
    validTo?: string;
  }) => api.post('/admin/promocodes/add', payload),
  delete: (promoId: number) => api.post('/admin/promocodes/delete', { promoId }),
};

// Admin: Logs
export const AdminLogsAPI = {
  list: () => api.get('/admin/logs'),
  exportJSON: () => api.get('/admin/logs/export'),
  importJSON: (filePath: string) => api.post('/admin/logs/import', { filePath }),
};
