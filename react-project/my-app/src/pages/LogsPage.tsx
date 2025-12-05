import { useEffect, useState } from 'react';
import { AdminLogsAPI } from '../api';
import type { LogRow } from '../types';

export default function LogsPage() {
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setLoading(true);
      const data = await AdminLogsAPI.list(1);
      setLogs(data.data || []);
    } catch (e: any) {
      alert(e.response?.data?.error ?? 'Ошибка загрузки лога');
    } finally {
      setLoading(false);
    }
  };

  const exportJSON = async () => {
    try {
      const r = await AdminLogsAPI.exportJSON();
      const json = typeof r.data === 'string' ? r.data : JSON.stringify(r.data, null, 2);
      // Создаем Blob с правильной кодировкой UTF-8
      const blob = new Blob(['\ufeff' + json], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'logs.json';
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert(e.response?.data?.error ?? 'Ошибка экспорта');
    }
  };

  const importJSON = async () => {
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'application/json';
      input.onchange = async (e: any) => {
        const file = e.target.files[0];
        if (!file) return;
        
        try {
          // Читаем файл с правильной кодировкой UTF-8
          const text = await file.text();
          // Убираем BOM если есть
          const cleanText = text.replace(/^\ufeff/, '');
          const jsonData = JSON.parse(cleanText);
          
          await AdminLogsAPI.importJSON(jsonData);
          alert('Лог импортирован');
          load();
        } catch (err: any) {
          alert('Ошибка чтения файла: ' + err.message);
        }
      };
      input.click();
    } catch (e: any) {
      alert(e.response?.data?.error ?? 'Ошибка импорта');
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return <div className="container"><p>Загрузка...</p></div>;
  }

  return (
    <div className="container">
      <h2>Лог действий админа</h2>
      <div className="flex gap-md mb-md">
        <button onClick={exportJSON}>Экспорт в JSON</button>
        <button onClick={importJSON}>Импорт из JSON</button>
        <button onClick={load} className="secondary">Обновить</button>
      </div>
      {logs.length === 0 && <p className="text-muted">Логи отсутствуют</p>}
      <div style={{ maxHeight: '70vh', overflowY: 'auto' }}>
        {logs.map(l => (
          <div key={l.LogID} className="card" style={{ marginBottom: 'var(--spacing-sm)' }}>
            <div style={{ display: 'flex', gap: 'var(--spacing-md)', alignItems: 'center', flexWrap: 'wrap' }}>
              <span className="badge">#{l.LogID}</span>
              <span className="text-muted">UserID: {l.UserID}</span>
              <span style={{ flex: 1, fontWeight: 500 }}>{l.Action}</span>
              <span className="text-muted">{new Date(l.Timestamp).toLocaleString('ru-RU')}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
