import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export function AuthPage({ mode }: { mode: 'login' | 'register' }) {
  const { login, register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get('next') || '/';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const user = mode === 'login' ? await login(email, password) : await register(name, email, password);
      toast(`Здравей, ${user.name}!`);
      navigate(next);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container page narrow">
      <form className="card auth-card" onSubmit={submit}>
        <h1>{mode === 'login' ? 'Вход' : 'Регистрация'}</h1>
        {mode === 'register' && (
          <label>Име<input required value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" /></label>
        )}
        <label>Имейл<input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></label>
        <label>
          Парола
          <input required type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
        </label>
        {error && <p className="error-box">{error}</p>}
        <button className="btn btn-primary btn-lg btn-block" disabled={busy}>
          {busy ? 'Моля, изчакай…' : mode === 'login' ? 'Влез' : 'Създай профил'}
        </button>
        {mode === 'login' ? (
          <>
            <p className="muted center">Нямаш профил? <Link to={`/register?next=${encodeURIComponent(next)}`} className="link">Регистрирай се</Link></p>
            {import.meta.env.DEV && (
            <div className="demo-box small">
              <b>Демо профил:</b>
              <button type="button" className="link-like" onClick={() => { setEmail('user@slotlyy.bg'); setPassword('user123'); }}>
                user@slotlyy.bg / user123
              </button>
            </div>
            )}
          </>
        ) : (
          <p className="muted center">Вече имаш профил? <Link to={`/login?next=${encodeURIComponent(next)}`} className="link">Влез</Link></p>
        )}
      </form>
    </div>
  );
}
