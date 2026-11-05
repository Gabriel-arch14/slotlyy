import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, BadgeCheck, MessageSquareQuote, Quote, ThumbsUp, Users } from 'lucide-react';
import { api } from '../api';
import { formatDate } from '../format';
import { IconBadge } from './icons';
import { ProductImage } from './ProductImage';
import { Stars } from './ui';

type LatestReview = {
  id: number;
  rating: number;
  comment: string;
  createdAt: string;
  userName: string;
  product: { name: string; slug: string; imageUrl: string | null; categorySlug: string };
};

type Data = {
  items: LatestReview[];
  stats: { average: number; total: number; positivePercent: number; customers: number };
};

const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();

function ReviewCard({ r }: { r: LatestReview }) {
  return (
    <figure className="t-card">
      <Quote className="t-quote" size={34} aria-hidden />
      <Stars value={r.rating} size={16} />
      <blockquote>{r.comment}</blockquote>
      <Link to={`/product/${r.product.slug}`} className="t-product" title={r.product.name}>
        <ProductImage id={r.id} name={r.product.name} brand="" category={r.product.categorySlug} imageUrl={r.product.imageUrl} size="sm" />
        <span>{r.product.name}</span>
        <ArrowUpRight size={14} />
      </Link>
      <figcaption>
        <span className="t-avatar" aria-hidden>{initials(r.userName)}</span>
        <span className="t-author">
          <b>{r.userName}</b>
          <small>{formatDate(r.createdAt).split(',')[0]}</small>
        </span>
        <span className="t-verified"><BadgeCheck size={14} /> Клиент</span>
      </figcaption>
    </figure>
  );
}

/** Секция „Мнения на клиенти“ — данните идват на живо от базата. */
export function Testimonials() {
  const [data, setData] = useState<Data | null>(null);

  useEffect(() => {
    api<Data>('/reviews/latest?limit=8').then(setData).catch(() => {});
  }, []);

  if (!data || data.items.length === 0) return null;
  const { stats, items } = data;

  return (
    <section className="section testimonials">
      <div className="section-head testimonials-head">
        <div>
          <h2 className="title-with-icon"><IconBadge size="sm"><MessageSquareQuote size={18} /></IconBadge> Какво казват геймърите</h2>
          <p className="muted">Реални мнения от клиенти на Slotlyy за продуктите, които са купили.</p>
        </div>
      </div>

      <div className="t-stats reveal-block">
        <div className="t-score">
          <strong className="gradient-text">{stats.average.toFixed(1)}</strong>
          <div>
            <Stars value={stats.average} size={18} />
            <span className="muted small">от {stats.total} отзива</span>
          </div>
        </div>
        <div className="t-stat"><IconBadge size="sm"><ThumbsUp size={17} /></IconBadge><span><b>{stats.positivePercent}%</b><small>препоръчват</small></span></div>
        <div className="t-stat"><IconBadge size="sm"><Users size={17} /></IconBadge><span><b>{stats.customers}+</b><small>доволни клиенти</small></span></div>
        <Link to="/catalog?sort=rating" className="btn btn-outline t-stats-cta">Най-високо оценени <ArrowRight size={16} /></Link>
      </div>

      <div className="t-marquee reveal-block" aria-label="Мнения на клиенти">
        <div className="t-track">
          {[...items, ...items].map((r, i) => (
            <div key={`${r.id}-${i}`} aria-hidden={i >= items.length}>
              <ReviewCard r={r} />
            </div>
          ))}
        </div>
      </div>

      <p className="muted small center t-cta">
        Купил си от нас? Остави мнение на страницата на продукта — помагаш на други геймъри да изберат.
      </p>
    </section>
  );
}
