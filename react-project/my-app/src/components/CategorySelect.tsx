import { useEffect, useState } from 'react';
import { CategoriesAPI } from '../api';
import type { Category } from '../types';

type Props = {
  value?: string;
  onChange: (name: string) => void;
};

export default function CategorySelect({ value, onChange }: Props) {
  const [cats, setCats] = useState<Category[]>([]);
  useEffect(() => {
    CategoriesAPI.list().then(r => setCats(r.data));
  }, []);
  return (
    <select value={value ?? ''} onChange={e => onChange(e.target.value)}>
      <option value="">Все категории</option>
      {cats.map(c => (
        <option key={c.CategoryID} value={c.CategoryName}>{c.CategoryName}</option>
      ))}
    </select>
  );
}
