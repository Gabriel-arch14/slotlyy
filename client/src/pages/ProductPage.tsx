import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api';
import type { Product, Review } from '../types';
import { discountPercent, formatDate, formatPrice } from '../format';
import { useCart } from '../context/CartContext';
import { FavoriteButton } from '../components/FavoriteButton';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ProductImage } from '../components/ProductImage';
import { ProductCard } from '../components/ProductCard';
import { EmptyState, QtyInput, Spinner, StarPicker, Stars } from '../components/ui';
import { IconBadge } from '../components/icons';
import { CheckCircle2, PackageX, RotateCcw, ShieldCheck, ShoppingCart, Truck } from 'lucide-react';

type Data = { product: Product; reviews: Review[]; related: Product[] };

export function ProductPage() {
  const { slug } = useParams();
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState('');
  const [qty, setQty] = useState(1);
  const [tab, setTab] = useState<'desc' | 'specs' | 'reviews'>('desc');
  const cart = useCart();
  const toast = useToast();

  const load = useCallback(() => {
    api<Data>(`/products/${slug}`).then(setData).catch((e) => setError(e.message));
  }, [slug]);

  useEffect(() => {
    setData(null);
    setError('');
    setQty(1);
    load();
    window.scrollTo(0, 0);
  }, [load]);

  if (error) {
    return (
      <div className="container page">
        <EmptyState icon={<PackageX size={30} />} title={error}>
          <Link to="/catalog" className="btn btn-primary">Към магазина</Link>
        </EmptyState>
      </div>
    );
  }
  if (!data) return <div className="container page"><Spinner /></div>;

  const { product: p, reviews, related } = data;
  const off = discountPercent(p.price, p.oldPrice);
  const inCart = cart.items.find((i) => i.productId === p.id)?.qty ?? 0;
  const available = Math.max(0, p.stock - inCart);

  return (
    <div className="container page">
      <nav className="breadcrumbs muted small">
        <Link to="/">Начало</Link> / <Link to={`/catalog?category=${p.category.slug}`}>{p.category.name}</Link> / <span>{p.name}</span>
      </nav>

      <div className="product-layout">
        <div className="product-gallery">
          <ProductImage id={p.id} name={p.name} brand={p.brand} category={p.category.slug} imageUrl={p.imageUrl} size="lg" />
          {off > 0 && <span className="badge badge-sale badge-lg">−{off}%</span>}
        </div>

        <div className="product-info">
          <div className="muted">{p.brand}</div>
          <h1>{p.name}</h1>
          <button className="rating-row link-like" onClick={() => setTab('reviews')}>
            <Stars value={p.rating} size={18} />
            <span className="muted">{p.rating ?? '—'} · {p.reviewCount} отзива · {p.sold} продадени</span>
          </button>

          <div className="price-big">
            <span className="price">{formatPrice(p.price)}</span>
            {off > 0 && (
              <>
                <span className="old-price">{formatPrice(p.oldPrice!)}</span>
                <span className="save">Спестяваш {formatPrice(p.oldPrice! - p.price)}</span>
              </>
            )}
          </div>

          <div className={`stock ${p.stock === 0 ? 'stock-out' : p.stock <= 5 ? 'stock-low' : 'stock-ok'}`}>
            {p.stock === 0 ? '● Няма наличност' : p.stock <= 5 ? `● Последни ${p.stock} бр.` : '● В наличност'}
          </div>

          {p.stock > 0 && (
            <div className="buy-row">
              <QtyInput value={qty} max={Math.max(1, available)} onChange={(v) => setQty(Math.max(1, Math.min(v, available)))} />
              <button
                className="btn btn-primary btn-lg"
                disabled={available === 0}
                onClick={() => {
                  cart.add(p, qty);
                  toast(`Добавени ${qty} бр. „${p.name}“`);
                  setQty(1);
                }}
              >
                {available === 0 ? 'Всички налични са в количката' : <><ShoppingCart size={19} /> Добави в количката</>}
              </button>
              <FavoriteButton product={p} large />
            </div>
          )}

          <ul className="perks">
            <li><IconBadge size="sm"><Truck size={16} /></IconBadge> Доставка 1–3 работни дни {p.price >= 100 ? '— безплатна' : ''}</li>
            <li><IconBadge size="sm"><RotateCcw size={16} /></IconBadge> Връщане до 14 дни</li>
            <li><IconBadge size="sm"><ShieldCheck size={16} /></IconBadge> 2 години гаранция</li>
          </ul>
        </div>
      </div>

      <div className="tabs">
        <button className={tab === 'desc' ? 'active' : ''} onClick={() => setTab('desc')}>Описание</button>
        <button className={tab === 'specs' ? 'active' : ''} onClick={() => setTab('specs')}>Характеристики</button>
        <button className={tab === 'reviews' ? 'active' : ''} onClick={() => setTab('reviews')}>Отзиви ({p.reviewCount})</button>
      </div>
      <div className="card tab-panel">
        {tab === 'desc' && <p>{p.description}</p>}
        {tab === 'specs' && (
          Object.keys(p.specs).length ? (
            <table className="specs">
              <tbody>
                {Object.entries(p.specs).map(([k, v]) => (
                  <tr key={k}><th>{k}</th><td>{v}</td></tr>
                ))}
              </tbody>
            </table>
          ) : <p className="muted">Няма въведени характеристики.</p>
        )}
        {tab === 'reviews' && <Reviews productId={p.id} reviews={reviews} onSaved={load} />}
      </div>

      {related.length > 0 && (
        <section className="section">
          <div className="section-head"><h2>Подобни продукти</h2></div>
          <div className="grid products-grid">
            {related.map((r) => <ProductCard key={r.id} product={r} />)}
          </div>
        </section>
      )}
    </div>
  );
}

function Reviews({ productId, reviews, onSaved }: { productId: number; reviews: Review[]; onSaved: () => void }) {
  const { user } = useAuth();
  const toast = useToast();
  const mine = reviews.find((r) => r.userId === user?.id);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api(`/products/${productId}/reviews`, { method: 'POST', body: { rating, comment } });
      toast('Благодарим за отзива!');
      onSaved();
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="reviews">
      {user && mine ? (
        <p className="review-done"><CheckCircle2 size={18} /> Вече си оставил отзив за този продукт. Благодарим ти!</p>
      ) : user ? (
        <form className="review-form" onSubmit={submit}>
          <strong>Напиши отзив</strong>
          <span className="muted small">Можеш да оставиш само един отзив за продукт и после не може да се променя.</span>
          <StarPicker value={rating} onChange={setRating} />
          <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Сподели мнението си за продукта…" rows={3} maxLength={1000} />
          <button className="btn btn-primary" disabled={saving}>{saving ? 'Запазване…' : 'Публикувай'}</button>
        </form>
      ) : (
        <p className="muted"><Link to="/login" className="link">Влез в профила си</Link>, за да напишеш отзив.</p>
      )}

      {reviews.length === 0 ? (
        <p className="muted">Все още няма отзиви. Бъди първият!</p>
      ) : (
        reviews.map((r) => (
          <div key={r.id} className="review">
            <div className="review-head">
              <span className="avatar">{r.userName[0]}</span>
              <div>
                <strong>{r.userName}</strong>
                <div className="muted small">{formatDate(r.createdAt)}</div>
              </div>
              <Stars value={r.rating} />
            </div>
            {r.comment && <p>{r.comment}</p>}
          </div>
        ))
      )}
    </div>
  );
}
