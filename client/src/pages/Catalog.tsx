import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api';
import type { Category, ProductList } from '../types';
import { ProductCard } from '../components/ProductCard';
import { EmptyState, Spinner } from '../components/ui';
import { CategoryIcon, IconBadge } from '../components/icons';
import { Flame, LayoutGrid, Search, SearchX, SlidersHorizontal, X } from 'lucide-react';

type Meta = { brands: string[]; minPrice: number; maxPrice: number };

const SORT_OPTIONS = [
  ['popular', 'Най-продавани'],
  ['newest', 'Най-нови'],
  ['price_asc', 'Цена: ниска → висока'],
  ['price_desc', 'Цена: висока → ниска'],
  ['rating', 'Най-висока оценка'],
  ['discount', 'Най-голяма отстъпка'],
];

export function Catalog() {
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState<ProductList | null>(null);
  const [error, setError] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [minInput, setMinInput] = useState(params.get('min') ?? '');
  const [maxInput, setMaxInput] = useState(params.get('max') ?? '');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const query = params.toString();
  const selectedBrands = (params.get('brand') ?? '').split(',').filter(Boolean);
  const activeCategory = categories.find((c) => c.slug === params.get('category'));

  useEffect(() => {
    api<Category[]>('/categories').then(setCategories).catch(() => {});
    api<Meta>('/products/meta').then(setMeta).catch(() => {});
  }, []);

  useEffect(() => {
    setData(null);
    setError('');
    api<ProductList>(`/products?${query}`).then(setData).catch((e) => setError(e.message));
  }, [query]);

  useEffect(() => {
    setMinInput(params.get('min') ?? '');
    setMaxInput(params.get('max') ?? '');
  }, [params]);

  const update = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(changes)) {
      if (v === null || v === '') next.delete(k);
      else next.set(k, v);
    }
    if (!('page' in changes)) next.delete('page');
    setParams(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleBrand = (b: string) => {
    const set = new Set(selectedBrands);
    if (set.has(b)) set.delete(b);
    else set.add(b);
    update({ brand: [...set].join(',') || null });
  };

  const hasFilters = ['q', 'category', 'brand', 'min', 'max', 'inStock', 'sale'].some((k) => params.get(k));
  const title = params.get('q')
    ? `Резултати за „${params.get('q')}“`
    : activeCategory
      ? activeCategory.name
      : params.get('sale') === '1'
        ? 'Промоции'
        : 'Всички продукти';
  const titleIcon = params.get('q') ? (
    <Search size={20} />
  ) : activeCategory ? (
    <CategoryIcon slug={activeCategory.slug} size={20} />
  ) : params.get('sale') === '1' ? (
    <Flame size={20} />
  ) : (
    <LayoutGrid size={20} />
  );

  return (
    <div className="container page">
      <div className="catalog-head">
        <div>
          <h1 className="title-with-icon"><IconBadge>{titleIcon}</IconBadge> {title}</h1>
          {data && <p className="muted">{data.total} {data.total === 1 ? 'продукт' : 'продукта'}</p>}
        </div>
        <div className="catalog-tools">
          <button className="btn btn-outline show-sm" onClick={() => setFiltersOpen((o) => !o)}><SlidersHorizontal size={16} /> Филтри</button>
          <select value={params.get('sort') ?? 'popular'} onChange={(e) => update({ sort: e.target.value })} aria-label="Подреди по">
            {SORT_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
      </div>

      <div className="catalog-layout">
        <aside className={`filters card ${filtersOpen ? 'open' : ''}`}>
          <div className="filter-group">
            <h4>Категория</h4>
            <label className="radio">
              <input type="radio" checked={!params.get('category')} onChange={() => update({ category: null })} /> Всички
            </label>
            {categories.map((c) => (
              <label key={c.id} className="radio">
                <input type="radio" checked={params.get('category') === c.slug} onChange={() => update({ category: c.slug })} />
                <CategoryIcon slug={c.slug} size={15} className="muted" /> {c.name} <span className="muted small">({c.productCount})</span>
              </label>
            ))}
          </div>

          {meta && (
            <div className="filter-group">
              <h4>Марка</h4>
              {meta.brands.map((b) => (
                <label key={b} className="checkbox">
                  <input type="checkbox" checked={selectedBrands.includes(b)} onChange={() => toggleBrand(b)} /> {b}
                </label>
              ))}
            </div>
          )}

          <div className="filter-group">
            <h4>Цена (€)</h4>
            <form
              className="price-range"
              onSubmit={(e) => {
                e.preventDefault();
                update({ min: minInput, max: maxInput });
              }}
            >
              <input type="number" min={0} placeholder={`от ${meta?.minPrice ?? 0}`} value={minInput} onChange={(e) => setMinInput(e.target.value)} />
              <span>–</span>
              <input type="number" min={0} placeholder={`до ${meta?.maxPrice ?? ''}`} value={maxInput} onChange={(e) => setMaxInput(e.target.value)} />
              <button className="btn btn-outline btn-sm" type="submit">OK</button>
            </form>
          </div>

          <div className="filter-group">
            <label className="checkbox">
              <input type="checkbox" checked={params.get('inStock') === '1'} onChange={(e) => update({ inStock: e.target.checked ? '1' : null })} />
              Само налични
            </label>
            <label className="checkbox">
              <input type="checkbox" checked={params.get('sale') === '1'} onChange={(e) => update({ sale: e.target.checked ? '1' : null })} />
              Само с отстъпка
            </label>
          </div>

          {hasFilters && (
            <button className="btn btn-ghost btn-block" onClick={() => setParams(params.get('sort') ? { sort: params.get('sort')! } : {})}>
              <X size={16} /> Изчисти филтрите
            </button>
          )}
        </aside>

        <div>
          {error ? (
            <p className="error-box">{error}</p>
          ) : !data ? (
            <Spinner />
          ) : data.items.length === 0 ? (
            <EmptyState icon={<SearchX size={30} />} title="Няма намерени продукти">
              <p className="muted">Опитай с други филтри или ключови думи.</p>
            </EmptyState>
          ) : (
            <>
              <div className="grid products-grid">
                {data.items.map((p) => <ProductCard key={p.id} product={p} />)}
              </div>
              {data.pages > 1 && (
                <div className="pagination">
                  {Array.from({ length: data.pages }, (_, i) => i + 1).map((n) => (
                    <button key={n} className={`btn ${n === data.page ? 'btn-primary' : 'btn-outline'} btn-sm`} onClick={() => update({ page: String(n) })}>
                      {n}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
