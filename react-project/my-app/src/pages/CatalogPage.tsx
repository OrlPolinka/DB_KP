import { useEffect, useState } from 'react';
import { ProductsAPI } from '../api';
import type { Product } from '../types';
import ProductCard from '../components/ProductCard';
import CategorySelect from '../components/CategorySelect';

export default function CatalogPage() {
  const [items, setItems] = useState<Product[]>([]);
  const [q, setQ] = useState('');
  const [catName, setCatName] = useState<string>('');

  const loadAll = async () => setItems((await ProductsAPI.list()).data);
  useEffect(() => { loadAll(); }, []);

  const search = async () => setItems((await ProductsAPI.search(q)).data);
  const top = async () => setItems((await ProductsAPI.top100()).data);
  const byCategory = async (name: string) => {
    setCatName(name);
    if (!name) return loadAll();
    setItems((await ProductsAPI.byCategory({ categoryName: name })).data);
  };

  return (
    <div>
      <h2>Каталог одежды</h2>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button onClick={loadAll}>Все</button>
        <button onClick={top}>Топ-100</button>
        <input placeholder="Поиск..." value={q} onChange={e => setQ(e.target.value)} />
        <button onClick={search}>Найти</button>
        <CategorySelect value={catName} onChange={byCategory} />
      </div>
      {items.length === 0 && <p style={{ color: 'red' }}>Нет товаров по запросу</p>}
      {items.map(p => <ProductCard key={p.ProductID} p={p} onAction={loadAll} />)}
    </div>
  );
}
