import { useEffect, useState } from 'react';
import { CategoriesAPI } from '../api';
import type { Category } from '../types';

type Props = {
  value?: number;
  onChange: (id: number) => void;
};

export default function CategorySelect({ value, onChange }: Props) {
  const [cats, setCats] = useState<Category[]>([]);
  useEffect(() => {
    CategoriesAPI.list().then(r => setCats(r.data));
  }, []);
  return (
    <select value={value ?? 0} onChange={e => onChange(Number(e.target.value))}>
      <option value={0}>Все категории</option>
      {cats.map(c => (
        <option key={c.CategoryID} value={c.CategoryID}>{c.CategoryName}</option>
      ))}
    </select>
  );
}
