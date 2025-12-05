import { useEffect, useState } from 'react';
import { AdminLogsAPI } from '../api';
import type { LogRow } from '../types';

export default function LogsPage() {
  const [logs, setLogs] = useState<LogRow[]>([]);

  const load = async () => {
    try { setLogs((await AdminLogsAPI.list(1)).data); }
    catch (e: any) { alert(e.response?.data?.error ?? 'Ошибка загрузки лога'); }
  };

  const exportJSON = async () => {
    try {
      const r = await AdminLogsAPI.exportJSON();
      const json = typeof r.data === 'string' ? r.data : JSON.stringify(r.data);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'logs.json'; a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert(e.response?.data?.error ?? 'Ошибка экспорта');
    }
  };

  const importJSON = async () => {
    try { 
      await AdminLogsAPI.importJSON(); 
      alert('Лог импортирован'); 
      load(); 
    } catch (e: any) { 
      alert(e.response?.data?.error ?? 'Ошибка импорта'); 
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div>
      <h2>Лог действий админа</h2>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button onClick={exportJSON}>Экспорт в JSON</button>
        <button onClick={importJSON}>Импорт из JSON</button>
      </div>
      {logs.map(l => (
        <div key={l.LogID} style={{ borderBottom: '1px solid #eee', padding: 8 }}>
          <b>#{l.LogID}</b> — UserID: {l.UserID} — {l.Action} — {l.Timestamp}
        </div>
      ))}
    </div>
  );
}
