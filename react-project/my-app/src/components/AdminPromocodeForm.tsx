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
    try {
      const r = await AdminPromocodesAPI.list();
      setList(r.data || []);
    } catch (e: any) {
      console.error('Ошибка загрузки промокодов:', e);
      setList([]);
    }
  };

  useEffect(() => {
    CategoriesAPI.list().then(r => setCats(r.data));
    load();
  }, []);

  const add = async () => {
    if (!code.trim()) {
      alert('Введите код промокода');
      return;
    }
    if (discountPercent <= 0 || discountPercent > 100) {
      alert('Процент скидки должен быть от 1 до 100');
      return;
    }
    
    try {
      console.log('Отправка промокода:', { code, discountPercent, isGlobal, categoryId, validFrom, validTo });
      await AdminPromocodesAPI.add({
        code, 
        discountPercent, 
        isGlobal, 
        categoryId: isGlobal ? undefined : categoryId,
        validFrom: validFrom || undefined, 
        validTo: validTo || undefined
      });
      alert('Промокод добавлен');
      setCode('');
      setDiscountPercent(0);
      setIsGlobal(false);
      setCategoryId(undefined);
      setValidFrom('');
      setValidTo('');
      load();
    } catch (e: any) {
      console.error('Ошибка добавления промокода:', e);
      const errorMsg = e.response?.data?.error || e.message || 'Ошибка добавления промокода';
      alert('Ошибка: ' + errorMsg);
    }
  };

  const del = async () => {
    if (!promoIdToDelete) {
      alert('Введите ID промокода для удаления');
      return;
    }
    if (!confirm(`Вы уверены, что хотите удалить промокод с ID ${promoIdToDelete}?`)) {
      return;
    }
    try {
      console.log('Удаление промокода:', promoIdToDelete);
      await AdminPromocodesAPI.delete(promoIdToDelete);
      alert('Промокод удалён');
      setPromoIdToDelete(0);
      load();
    } catch (e: any) {
      console.error('Ошибка удаления промокода:', e);
      const errorMsg = e.response?.data?.error || e.message || 'Ошибка удаления промокода';
      alert('Ошибка: ' + errorMsg);
    }
  };

  return (
    <div className="card">
      <h3>Управление промокодами</h3>
      
      <div style={{ marginBottom: 'var(--spacing-lg)' }}>
        <h4>Добавить промокод</h4>
        <div className="form-group">
          <label>Код промокода:</label>
          <input 
            placeholder="Введите код промокода" 
            value={code} 
            onChange={e => setCode(e.target.value)} 
          />
        </div>
        <div className="form-group">
          <label>Процент скидки (1-100):</label>
          <input 
            type="number" 
            min="1"
            max="100"
            placeholder="Введите процент скидки" 
            value={discountPercent || ''} 
            onChange={e => setDiscountPercent(Number(e.target.value))} 
          />
        </div>
        <div className="form-group">
          <label>
            <input 
              type="checkbox" 
              checked={isGlobal} 
              onChange={e => {
                setIsGlobal(e.target.checked);
                if (e.target.checked) {
                  setCategoryId(undefined);
                }
              }} 
            /> 
            Глобальный промокод (применяется ко всем категориям)
          </label>
        </div>
        {!isGlobal && (
          <div className="form-group">
            <label>Категория (если не глобальный):</label>
            <select 
              value={categoryId ?? 0} 
              onChange={e => setCategoryId(Number(e.target.value) || undefined)}
            >
              <option value={0}>Выберите категорию</option>
              {cats.map(c => <option key={c.CategoryID} value={c.CategoryID}>{c.CategoryName}</option>)}
            </select>
          </div>
        )}
        <div className="form-group">
          <label>Действителен с (дата и время):</label>
          <input 
            type="datetime-local" 
            value={validFrom} 
            onChange={e => setValidFrom(e.target.value)} 
          />
        </div>
        <div className="form-group">
          <label>Действителен до (дата и время):</label>
          <input 
            type="datetime-local" 
            value={validTo} 
            onChange={e => setValidTo(e.target.value)} 
          />
        </div>
        <div className="form-actions">
          <button onClick={add}>Добавить промокод</button>
        </div>
      </div>

      <div>
        <h4>Список промокодов</h4>
        {list.length === 0 && <p className="text-muted">Промокодов нет</p>}
        {list.map(p => (
          <div key={p.PromoID} className="card" style={{ marginBottom: 'var(--spacing-sm)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong>{p.Code}</strong> — {p.DiscountPercent}% скидка
                {p.CategoryName ? ` на категорию "${p.CategoryName}"` : p.IsGlobal ? ' (Глобальный)' : ''}
                {p.ValidFrom && <span> — с {new Date(p.ValidFrom).toLocaleString('ru-RU')}</span>}
                {p.ValidTo && <span> до {new Date(p.ValidTo).toLocaleString('ru-RU')}</span>}
              </div>
              <span className="badge">ID: {p.PromoID}</span>
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 'var(--spacing-lg)' }}>
        <h4>Удалить промокод</h4>
        <div className="form-group">
          <label>ID промокода для удаления:</label>
          <input 
            type="number" 
            placeholder="Введите ID промокода" 
            value={promoIdToDelete || ''} 
            onChange={e => setPromoIdToDelete(Number(e.target.value))} 
          />
        </div>
        <div className="form-actions">
          <button onClick={del} className="danger">Удалить промокод</button>
        </div>
      </div>
    </div>
  );
}
