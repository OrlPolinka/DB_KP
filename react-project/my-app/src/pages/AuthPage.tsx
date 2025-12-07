import { useState, useEffect } from 'react';
import { AuthAPI } from '../api';
import { setAuth, getUser, clearAuth } from '../auth';
import { useNavigate } from 'react-router-dom';

export default function AuthPage() {
  const nav = useNavigate();
  const [current, setCurrent] = useState(getUser());

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState(''); // простота: используем как PasswordHash
  const [email, setEmail] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    setCurrent(getUser());
  }, []);

  const submit = async () => {
    try {
      if (mode === 'register') {
        const r = await AuthAPI.register({ username, passwordHash: password, email });
        setAuth(r.data.token, r.data.user);
      } else {
        const r = await AuthAPI.login({ username, passwordHash: password });
        setAuth(r.data.token, r.data.user);
      }
      setCurrent(getUser());
      nav('/');
      // Обновляем страницу для синхронизации состояния
      window.dispatchEvent(new Event('storage'));
    } catch (e: any) {
      alert(e.response?.data?.error ?? 'Ошибка авторизации');
    }
  };

  const deleteOwn = async () => {
    if (!confirm('Вы уверены, что хотите удалить свою учетную запись? Это действие необратимо и приведет к удалению всех ваших данных (заказы, избранное, корзина).')) {
      return;
    }

    if (!password.trim()) {
      alert('Для удаления аккаунта необходимо ввести пароль');
      return;
    }

    try {
      await AuthAPI.deleteOwn(password);
      clearAuth();
      alert('Учетная запись успешно удалена');
      nav('/');
      window.dispatchEvent(new Event('storage'));
    } catch (e: any) {
      const errorMsg = e.response?.data?.error || e.message || 'Ошибка удаления аккаунта';
      alert('Ошибка: ' + errorMsg);
    }
  };

  return (
    <div>
      {!current ? (
        <>
          <h2>{mode === 'login' ? 'Вход' : 'Регистрация'}</h2>
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
        </>
      ) : (
        <>
          <h2>Удаление учетной записи</h2>
          <div className="card" style={{ maxWidth: 400, marginTop: 24 }}>
          <div style={{ 
            padding: 16, 
            backgroundColor: '#ffebee', 
            borderRadius: 4, 
            marginBottom: 16,
            border: '1px solid #ffcdd2'
          }}>
            <p style={{ margin: 0, color: '#c62828', fontWeight: 'bold' }}>
              ⚠️ Внимание! Это действие необратимо.
            </p>
            <p style={{ margin: '8px 0 0 0', fontSize: '14px', color: '#d32f2f' }}>
              При удалении аккаунта будут удалены все ваши данные:
            </p>
            <ul style={{ margin: '8px 0 0 20px', fontSize: '14px', color: '#d32f2f' }}>
              <li>История заказов</li>
              <li>Избранные товары</li>
              <li>Корзина</li>
              <li>Все настройки аккаунта</li>
            </ul>
          </div>
          <div className="form-group">
            <label>Введите пароль для подтверждения:</label>
            <input 
              type="password" 
              placeholder="Пароль" 
              value={password} 
              onChange={e => setPassword(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <input 
              type="checkbox" 
              checked={confirmDelete} 
              onChange={e => setConfirmDelete(e.target.checked)} 
            /> 
            <span>Я понимаю последствия и подтверждаю удаление аккаунта</span>
          </label>
          <button 
            disabled={!confirmDelete || !password.trim()} 
            onClick={deleteOwn} 
            className="danger"
            style={{ 
              width: '100%',
              padding: '12px',
              fontSize: '16px',
              fontWeight: 'bold'
            }}
          >
            Удалить учетную запись
          </button>
          </div>
        </>
      )}
    </div>
  );
}
