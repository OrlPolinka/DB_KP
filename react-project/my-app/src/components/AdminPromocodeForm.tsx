import { useEffect, useState } from 'react';
import { AdminPromocodesAPI, CategoriesAPI } from '../api';
import type { Category, Promocode } from '../types';

export default function AdminPromocodeForm() {
  const [cats, setCats] = useState<Category[]>([]);
  const [list, setList] = useState<Promocode[]>([]);
  const [code, setCode] = useState('');
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [isGlobal, setIsGlobal] = useState<boolean>(false);
  const [categoryId, setCategoryId] = useState<number | undefined>(undefined);
  const [validFrom, setValidFrom] = useState<string>('');
  const [validTo, setValidTo] = useState<string>('');
  const [promoIdToDelete, setPromoIdToDelete] = useState<number>(0);

  const load = async () => {
    const r = await AdminPromocodesAPI.list();
    setList(r.data);
  };

  useEffect(() => {
    CategoriesAPI.list().then(r => setCats(r.data));
    load();
  }, []);

  const add = async () => {
    try {
      await AdminPromocodesAPI.add({
        code, discountPercent, isGlobal, categoryId,
        validFrom: validFrom || undefined, validTo: validTo || undefined
      });
      alert('Промокод добавлен'); setCode(''); setDiscountPercent(0); setIsGlobal(false); setCategoryId(undefined); setValidFrom(''); setValidTo(''); load();
    } catch (e: any) {
      alert(e.response?.data?.error ?? 'Ошибка добавления промокода');
    }
  };

  const del = async () => {
    try {
      await AdminPromocodesAPI.delete(promoIdToDelete);
      alert('Промокод удалён'); setPromoIdToDelete(0); load();
    } catch (e: any) {
      alert(e.response?.data?.error ?? 'Ошибка удаления промокода');
    }
  };

  return (
    <div style={{ border: '1px solid #ddd', padding: 12, marginTop: 12 }}>
      <h3>Промокоды (админ)</h3>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <input placeholder="Код" value={code} onChange={e => setCode(e.target.value)} />
        <input type="number" placeholder="% скидки" value={discountPercent} onChange={e => setDiscountPercent(Number(e.target.value))} />
        <label><input type="checkbox" checked={isGlobal} onChange={e => setIsGlobal(e.target.checked)} /> Глобальный</label>
        <select value={categoryId ?? 0} onChange={e => setCategoryId(Number(e.target.value) || undefined)}>
          <option value={0}>Без категории</option>
          {cats.map(c => <option key={c.CategoryID} value={c.CategoryID}>{c.CategoryName}</option>)}
        </select>
        <input type="datetime-local" value={validFrom} onChange={e => setValidFrom(e.target.value)} />
        <input type="datetime-local" value={validTo} onChange={e => setValidTo(e.target.value)} />
        <button onClick={add}>Добавить</button>
      </div>

      <h4>Список промокодов</h4>
      {list.map(p => (
        <div key={p.PromoID} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span>{p.Code} — {p.DiscountPercent}% — {p.CategoryName ?? (p.IsGlobal ? 'Глобальный' : 'Без категории')} — {p.ValidFrom ?? ''} → {p.ValidTo ?? ''}</span>
        </div>
      ))}
      <div style={{ marginTop: 8 }}>
        <input type="number" placeholder="PromoID для удаления" value={promoIdToDelete} onChange={e => setPromoIdToDelete(Number(e.target.value))} />
        <button onClick={del}>Удалить</button>
      </div>
    </div>
  );
}
