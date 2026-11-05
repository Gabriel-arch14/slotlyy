import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Flame, Gauge, Headphones, MousePointer2, RotateCcw, ShieldCheck, Sparkles, Star, Trophy, Truck } from 'lucide-react';
import { api } from '../api';
import type { Category, ProductList } from '../types';
import { ProductCard } from '../components/ProductCard';
import { CategoryIcon, IconBadge } from '../components/icons';
import { Spinner } from '../components/ui';
import { Testimonials } from '../components/Testimonials';
import { Marquee } from '../components/Marquee';

function ProductRow({ icon, title, query, link }: { icon: ReactNode; title: string; query: string; link: string }) {
  const [data, setData] = useState<ProductList | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api<ProductList>(`/products?${query}`).then(setData).catch((e) => setError(e.message));
  }, [query]);

  return (
    <section className="section">
      <div className="section-head">
        <h2 className="title-with-icon"><IconBadge size="sm">{icon}</IconBadge> {title}</h2>
        <Link to={link} className="link with-icon">Виж всички <ArrowRight size={16} /></Link>
      </div>
      {error ? <p className="error-box">{error}</p> : !data ? <Spinner /> : (
        <div className="grid products-grid">
          {data.items.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </section>
  );
}

export function Home() {
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    api<Category[]>('/categories').then(setCategories).catch(() => {});
  }, []);

  return (
    <>
      <section className="hero">
        <div className="container hero-inner">
          <div className="hero-text">
            <span className="pill"><Sparkles size={14} /> Gaming Tech Store</span>
            <h1>
              Екипирай се за <span className="gradient-text">победа</span>
            </h1>
            <p>Мишки, клавиатури, слушалки, монитори и столове от водещи марки. Доставка до 3 дни и 2 години гаранция.</p>
            <div className="hero-cta">
              <Link to="/catalog" className="btn btn-primary btn-lg">Разгледай магазина <ArrowRight size={18} /></Link>
              <Link to="/catalog?sale=1" className="btn btn-outline btn-lg"><Flame size={18} /> Промоции</Link>
            </div>
            <div className="hero-perks">
              <span className="with-icon"><Truck size={16} /> Безплатна доставка над 100 €</span>
              <span className="with-icon"><RotateCcw size={16} /> 14 дни връщане</span>
              <span className="with-icon"><ShieldCheck size={16} /> 2 г. гаранция</span>
            </div>
          </div>
          <div className="hero-art" aria-hidden>
            <div className="hero-photo glass">
              <img src="/products/hero.jpg" alt="" />
            </div>
            <div className="hero-chip glass chip-1"><IconBadge size="sm"><Gauge size={18} /></IconBadge><span><b>360 Hz</b><small>монитори</small></span></div>
            <div className="hero-chip glass chip-2"><IconBadge size="sm"><MousePointer2 size={18} /></IconBadge><span><b>58 г</b><small>ултралеки мишки</small></span></div>
            <div className="hero-chip glass chip-3"><IconBadge size="sm"><Headphones size={18} /></IconBadge><span><b>7.1</b><small>съраунд звук</small></span></div>
          </div>
        </div>
      </section>

      <Marquee />

      <div className="container">
        <section className="section">
          <div className="section-head">
            <h2>Категории</h2>
          </div>
          <div className="grid categories-grid">
            {categories.map((c) => (
              <Link key={c.id} to={`/catalog?category=${c.slug}`} className="card category-card">
                <IconBadge><CategoryIcon slug={c.slug} size={24} /></IconBadge>
                <div>
                  <strong>{c.name}</strong>
                  <div className="muted small">{c.productCount} продукта</div>
                </div>
                <ArrowRight size={16} className="category-arrow" />
              </Link>
            ))}
          </div>
        </section>

        <ProductRow icon={<Star size={18} />} title="Препоръчани" query="featured=1&limit=4" link="/catalog" />
        <ProductRow icon={<Flame size={18} />} title="Горещи оферти" query="sale=1&sort=discount&limit=4" link="/catalog?sale=1&sort=discount" />
        <ProductRow icon={<Trophy size={18} />} title="Най-продавани" query="sort=popular&limit=4" link="/catalog?sort=popular" />

        <Testimonials />
      </div>
    </>
  );
}
