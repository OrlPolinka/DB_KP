import { useEffect, useState } from 'react';
import { ProductsAPI } from '../api';
import type { Product } from '../types';
import ProductCard from '../components/ProductCard';
import CategorySelect from '../components/CategorySelect';

export default function CatalogPage() {
  const [items, setItems] = useState<Product[]>([]);
  const [q, setQ] = useState('');
  const [catName, setCatName] = useState<string>('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isTop100, setIsTop100] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pageSize = 50;

  const loadPage = async (pageNum: number = page) => {
    try {
      setLoading(true);
      setError(null);
      const r = await ProductsAPI.listPaged(pageNum, pageSize);
      const data = r.data || [];
      setItems(Array.isArray(data) ? data : []);
      setIsTop100(false);
    } catch (e: any) {
      console.error('Ошибка загрузки:', e);
      setError('Ошибка загрузки товаров');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isTop100 && !q && !catName) {
      loadPage(page);
    }
  }, [page]);

  const search = async () => {
    if (!q.trim()) {
      loadPage(1);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const r = await ProductsAPI.searchPaged(q, 1, pageSize);
      const data = r.data || [];
      const products = Array.isArray(data) ? data : [];
      setItems(products);
      setIsTop100(false);
      setPage(1);
      if (products.length === 0) {
        setError('Товары не найдены');
      }
    } catch (e: any) {
      console.error('Ошибка поиска:', e);
      const errorMsg = e.response?.data?.error || e.message || 'Ошибка поиска';
      setError('Ошибка поиска: ' + errorMsg);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const top = async () => {
    try {
      setLoading(true);
      setError(null);
      const r = await ProductsAPI.top100();
      const data = r.data || [];
      const products = Array.isArray(data) ? data : [];
      setItems(products);
      setIsTop100(true);
      setQ('');
      setCatName('');
      setPage(1);
      if (products.length === 0) {
        setError('Товары не найдены');
      }
    } catch (e: any) {
      console.error('Ошибка загрузки топ-100:', e);
      const errorMsg = e.response?.data?.error || e.message || 'Ошибка загрузки топ-100';
      setError('Ошибка загрузки топ-100: ' + errorMsg);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const byCategory = async (name: string) => {
    setCatName(name);
    setQ('');
    setIsTop100(false);
    if (!name) {
      loadPage(1);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const r = await ProductsAPI.byCategoryPaged({ categoryName: name, page: 1, size: pageSize });
      const data = r.data || [];
      const products = Array.isArray(data) ? data : [];
      setItems(products);
      setPage(1);
      if (products.length === 0) {
        setError('Товары не найдены');
      }
    } catch (e: any) {
      console.error('Ошибка фильтрации:', e);
      const errorMsg = e.response?.data?.error || e.message || 'Ошибка фильтрации';
      setError('Ошибка фильтрации: ' + errorMsg);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      search();
    }
  };

  return (
    <div className="container">
      <h2>Каталог одежды</h2>
      <div className="flex gap-md mb-md" style={{ flexWrap: 'wrap', alignItems: 'center' }}>
        <button onClick={() => { 
          setPage(1); 
          setQ(''); 
          setCatName(''); 
          setIsTop100(false); 
          setError(null);
          loadPage(1); 
        }}>
          Все
        </button>
        <button onClick={top}>Топ-100</button>
        <input 
          placeholder="Поиск..." 
          value={q} 
          onChange={e => setQ(e.target.value)}
          onKeyPress={handleKeyPress}
          style={{ flex: 1, minWidth: 200 }}
        />
        <button onClick={search}>Найти</button>
        <CategorySelect value={catName} onChange={byCategory} />
      </div>
      
      {loading && <p>Загрузка...</p>}
      {error && <p className="text-error">{error}</p>}
      {!loading && !error && items.length === 0 && <p className="text-muted">Нет товаров по запросу</p>}
      
      {!loading && items.length > 0 && (
        <div className="grid grid-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))' }}>
          {items.map(p => (
            <ProductCard key={p.ProductID} p={p} onAction={() => {
              if (isTop100) top();
              else if (q) search();
              else if (catName) byCategory(catName);
              else loadPage(page);
            }} />
          ))}
        </div>
      )}

      {/* Пагинация - показываем только если не топ-100 и не поиск/категория */}
      {!isTop100 && !q && !catName && !loading && items.length > 0 && (
        <div className="flex gap-md mt-lg items-center">
          <button disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
            ← Назад
          </button>
          <span>Страница {page}</span>
          <button disabled={items.length < pageSize} onClick={() => setPage(p => p + 1)}>
            Вперёд →
          </button>
        </div>
      )}
    </div>
  );
}