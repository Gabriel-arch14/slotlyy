import { useState, type FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Lock } from 'lucide-react';

/**
 * Скрит вход за администратора — показва се само на /admin.
 * Няма линк към него никъде в сайта.
 */
export function AdminLogin() {
  const { user, login, logout } = useAuth();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const u = await login(email, password);
      if (u.role !== 'admin') {
        logout();
        setError('Невалидни данни за достъп.');
        return;
      }
      toast(`Добре дошъл, ${u.name}`);
    } catch {
      setError('Невалидни данни за достъп.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="admin-gate">
      <form className="glass admin-gate-card" onSubmit={submit}>
        <img src="/brand/logo-mark.png" alt="Slotlyy" className="admin-gate-logo" />
        <div className="admin-gate-lock"><Lock size={14} /> Защитена зона</div>
        <h1>Контролен панел</h1>
        <p className="muted small">Достъп само за администратори.</p>
        {user && user.role !== 'admin' && (
          <p className="muted small">Влязъл си като {user.email}. Въведи администраторски данни.</p>
        )}
        <label>
          Имейл
          <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" autoFocus />
        </label>
        <label>
          Парола
          <input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
        </label>
        {error && <p className="error-box">{error}</p>}
        <button className="btn btn-primary btn-lg btn-block" disabled={busy}>{busy ? 'Проверка…' : 'Вход'}</button>
      </form>
    </div>
  );
}
