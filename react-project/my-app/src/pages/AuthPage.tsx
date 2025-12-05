import { useState } from 'react';
import { AuthAPI } from '../api';
import { setAuth, getUser, clearAuth } from '../auth';
import { useNavigate } from 'react-router-dom';

export default function AuthPage() {
  const nav = useNavigate();
  const current = getUser();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState(''); // простота: используем как PasswordHash
  const [email, setEmail] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const submit = async () => {
    try {
      if (mode === 'register') {
        const r = await AuthAPI.register({ username, passwordHash: password, email });
        setAuth(r.data.token, r.data.user);
      } else {
        const r = await AuthAPI.login({ username, passwordHash: password });
        setAuth(r.data.token, r.data.user);
      }
      nav('/');
    } catch (e: any) {
      alert(e.response?.data?.error ?? 'Ошибка авторизации');
    }
  };

  const deleteOwn = async () => {
    try {
      await AuthAPI.deleteOwn(password || undefined);
      clearAuth();
      alert('Учетная запись удалена');
      nav('/');
    } catch (e: any) {
      alert(e.response?.data?.error ?? 'Ошибка удаления аккаунта');
    }
  };

  return (
    <div>
      <h2>{mode === 'login' ? 'Вход' : 'Регистрация'}</h2>
      {!current && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 320 }}>
          <input placeholder="Логин" value={username} onChange={e => setUsername(e.target.value)} />
          {mode === 'register' && <input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />}
          <input type="password" placeholder="Пароль" value={password} onChange={e => setPassword(e.target.value)} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={submit}>{mode === 'login' ? 'Войти' : 'Зарегистрироваться'}</button>
            <button onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
              {mode === 'login' ? 'Перейти к регистрации' : 'Перейти ко входу'}
            </button>
          </div>
        </div>
      )}
      {current && (
        <div style={{ maxWidth: 320, marginTop: 16 }}>
          <h3>Удаление учетной записи</h3>
          <p>Введи пароль и подтверди удаление.</p>
          <input type="password" placeholder="Пароль" value={password} onChange={e => setPassword(e.target.value)} />
          <label style={{ display: 'block', marginTop: 8 }}>
            <input type="checkbox" checked={confirmDelete} onChange={e => setConfirmDelete(e.target.checked)} /> Подтверждаю удаление
          </label>
          <button disabled={!confirmDelete} onClick={deleteOwn} style={{ marginTop: 8 }}>Удалить учетную запись</button>
        </div>
      )}
    </div>
  );
}
