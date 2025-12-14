import { useEffect, useState } from 'react';
import { AdminUsersAPI, AdminRolesAPI } from '../api';

type Role = {
  RoleID: number;
  RoleName: string;
};

export default function AdminUserRegistrationForm() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [username, setUsername] = useState('');
  const [passwordHash, setPasswordHash] = useState('');
  const [email, setEmail] = useState('');
  const [roleName, setRoleName] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    AdminRolesAPI.list()
      .then(r => {
        setRoles(r.data || []);
        if (r.data && r.data.length > 0) {
          setRoleName(r.data[0].RoleName);
        }
      })
      .catch(err => {
        console.error('Ошибка загрузки ролей:', err);
        alert('Ошибка загрузки ролей: ' + (err.response?.data?.error || err.message));
      });
  }, []);

  const submit = async () => {
    if (!username || !passwordHash || !email || !roleName) {
      alert('Заполните все обязательные поля');
      return;
    }

    try {
      setBusy(true);
      await AdminUsersAPI.register({
        username,
        passwordHash,
        email,
        roleName
      });
      alert('Пользователь успешно зарегистрирован');
      // Очистка полей
      setUsername('');
      setPasswordHash('');
      setEmail('');
      if (roles.length > 0) {
        setRoleName(roles[0].RoleName);
      }
    } catch (e: any) {
      console.error('Ошибка:', e);
      const errorMsg = e.response?.data?.error || e.message || 'Ошибка регистрации пользователя';
      alert('Ошибка: ' + errorMsg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card" style={{ marginBottom: 'var(--spacing-md)' }}>
      <h3>Регистрация нового пользователя</h3>
      <div className="form-group">
        <div className="form-group">
          <label>Имя пользователя:</label>
          <input 
            placeholder="Введите имя пользователя" 
            value={username} 
            onChange={e => setUsername(e.target.value)} 
          />
        </div>
        <div className="form-group">
          <label>Пароль (Hash):</label>
          <input 
            type="password"
            placeholder="Введите пароль" 
            value={passwordHash} 
            onChange={e => setPasswordHash(e.target.value)} 
          />
        </div>
        <div className="form-group">
          <label>Email:</label>
          <input 
            type="email"
            placeholder="Введите email" 
            value={email} 
            onChange={e => setEmail(e.target.value)} 
          />
        </div>
        <div className="form-group">
          <label>Роль:</label>
          <select 
            value={roleName} 
            onChange={e => setRoleName(e.target.value)}
            disabled={roles.length === 0}
          >
            {roles.length === 0 ? (
              <option value="">Загрузка ролей...</option>
            ) : (
              roles.map(r => (
                <option key={r.RoleID} value={r.RoleName}>
                  {r.RoleName}
                </option>
              ))
            )}
          </select>
        </div>
        <div className="form-actions">
          <button onClick={submit} disabled={busy || roles.length === 0}>
            {busy ? 'Регистрация...' : 'Зарегистрировать пользователя'}
          </button>
        </div>
      </div>
    </div>
  );
}


