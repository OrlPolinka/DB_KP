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
  const pageSize = 50; // сколько товаров на странице

  const loadPage = async (pageNum: number = page) => {
    const r = await ProductsAPI.listPaged(pageNum, pageSize);
    setItems(r.data);
  };

  useEffect(() => {
    loadPage();
  }, [page]);

  const search = async () => {
    const r = await ProductsAPI.searchPaged(q, page, pageSize);
    setItems(r.data);
  };

  const top = async () => {
    const r = await ProductsAPI.top100();
    setItems(r.data);
  };

  const byCategory = async (name: string) => {
    setCatName(name);
    if (!name) return loadPage();
    const r = await ProductsAPI.byCategoryPaged({ categoryName: name, page, size: pageSize });
    setItems(r.data);
  };

  return (
    <div>
      <h2>Каталог одежды</h2>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button onClick={() => { setPage(1); loadPage(1); }}>Все</button>
        <button onClick={top}>Топ-100</button>
        <input placeholder="Поиск..." value={q} onChange={e => setQ(e.target.value)} />
        <button onClick={() => { setPage(1); search(); }}>Найти</button>
        <CategorySelect value={catName} onChange={(n) => { setPage(1); byCategory(n); }} />
      </div>

      {items.length === 0 && <p style={{ color: 'red' }}>Нет товаров по запросу</p>}
      {items.map(p => <ProductCard key={p.ProductID} p={p} onAction={() => loadPage(page)} />)}

      {/* Пагинация */}
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
          ← Назад
        </button>
        <span>Страница {page}</span>
        <button onClick={() => setPage(p => p + 1)}>
          Вперёд →
        </button>
      </div>
    </div>
  );
}
