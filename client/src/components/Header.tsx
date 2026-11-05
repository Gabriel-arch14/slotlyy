import { useEffect, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Flame, Heart, LayoutDashboard, LogOut, Package, Search, ShoppingCart, Truck, User } from 'lucide-react';
import { api } from '../api';
import type { Category } from '../types';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useFavorites } from '../context/FavoritesContext';
import { CategoryIcon } from './icons';
import { Logo } from './Logo';

export function Header() {
  const { user, logout } = useAuth();
  const { count } = useCart();
  const favorites = useFavorites();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const [q, setQ] = useState(params.get('q') ?? '');
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    api<Category[]>('/categories').then(setCategories).catch(() => {});
  }, []);

  useEffect(() => setMenuOpen(false), [location.pathname, location.search]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    navigate(`/catalog${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''}`);
  };

  // Категориите се разделят на две половини — отляво и отдясно на логото.
  const onCatalog = location.pathname === '/catalog';
  const activeCat = onCatalog ? params.get('category') : null;
  const isSale = onCatalog && params.get('sale') === '1';
  const isAll = onCatalog && !activeCat && !isSale;
  const half = Math.ceil(categories.length / 2);
  const left = categories.slice(0, half);
  const right = categories.slice(half);

  const catLink = (c: Category) => (
    <Link key={c.id} to={`/catalog?category=${c.slug}`} className={`catnav-link ${activeCat === c.slug ? 'active' : ''}`}>
      <CategoryIcon slug={c.slug} size={15} /> {c.name}
    </Link>
  );

  return (
    <header className="header">
      <div className="topbar">
        <Truck size={14} strokeWidth={2} aria-hidden /> Безплатна доставка за поръчки над 100 € · Код <b>SLOTLYY10</b> за −10%
      </div>

      <div className="container header-main">
        <form className="search" onSubmit={submit} role="search">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Търси мишки, клавиатури, слушалки…" aria-label="Търсене" />
          <button type="submit" aria-label="Търси"><Search size={17} /></button>
        </form>

        <nav className="header-actions">
          {user ? (
            <div className="user-menu">
              <button className="btn btn-ghost" onClick={() => setMenuOpen((o) => !o)}>
                <User size={18} /> <span className="hide-sm">{user.name.split(' ')[0]}</span>
              </button>
              {menuOpen && (
                <div className="dropdown">
                  <Link to="/account"><Package size={16} /> Моите поръчки</Link>
                  {user.role === 'admin' && <Link to="/admin"><LayoutDashboard size={16} /> Контролен панел</Link>}
                  <button
                    onClick={() => {
                      logout();
                      navigate('/');
                    }}
                  >
                    <LogOut size={16} /> Изход
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link to="/login" className="btn btn-ghost"><User size={18} /> <span className="hide-sm">Вход</span></Link>
          )}
          <Link to="/favorites" className="btn btn-ghost cart-btn" aria-label="Любими">
            <Heart size={18} /> <span className="hide-sm">Любими</span>
            {favorites.count > 0 && <span className="cart-count">{favorites.count}</span>}
          </Link>
          <Link to="/cart" className="btn btn-ghost cart-btn" aria-label="Количка">
            <ShoppingCart size={18} /> <span className="hide-sm">Количка</span>
            {count > 0 && <span className="cart-count">{count}</span>}
          </Link>
        </nav>
      </div>

      <div className="pillnav-wrap">
        <nav className="pillnav" aria-label="Категории">
          <div className="pillnav-side pillnav-left">
            <Link to="/catalog" className={`catnav-link ${isAll ? 'active' : ''}`}>Всички</Link>
            {left.map(catLink)}
          </div>
          <div className="pillnav-logo">
            <Logo size="xl" />
          </div>
          <div className="pillnav-side pillnav-right">
            {right.map(catLink)}
            <Link to="/catalog?sale=1" className={`catnav-link catnav-sale ${isSale ? 'active' : ''}`}><Flame size={15} /> Промоции</Link>
          </div>
        </nav>
      </div>
    </header>
  );
}
