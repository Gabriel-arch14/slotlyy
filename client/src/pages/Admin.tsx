import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api, uploadFile } from '../api';
import type { Category, Order, OrderStatus, Product } from '../types';
import { STATUS_LABELS, formatDate, formatPrice } from '../format';
import { useToast } from '../context/ToastContext';
import { ProductImage } from '../components/ProductImage';
import { Spinner } from '../components/ui';
import { OrderCard } from './Account';
import { IconBadge } from '../components/icons';
import {
  ChartColumn, Download, FileSpreadsheet, LayoutDashboard, Mail, Package, Pencil, Phone, Plus, Receipt, StickyNote, Tag, Trash2,
  TriangleAlert, Trophy, Upload, User, X,
} from 'lucide-react';

/** Масов импорт на продукти от Excel + шаблон и експорт. */
function ExcelImport({ onImported }: { onImported: () => void }) {
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<{ message: string; details: string[] } | null>(null);

  const upload = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setProblem(null);
    try {
      const r = await uploadFile<{ created: number; updated: number }>('/admin/products/import', file);
      toast(`Импортът е готов: ${r.created} нови, ${r.updated} обновени продукта`);
      onImported();
    } catch (err) {
      const e = err as Error & { details?: string[] };
      setProblem({ message: e.message, details: e.details ?? [] });
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };

  return (
    <div className="card excel-import">
      <div className="excel-import-head">
        <IconBadge size="sm"><FileSpreadsheet size={18} /></IconBadge>
        <div>
          <strong>Масов импорт от Excel</strong>
          <div className="muted small">Изтегли шаблона, попълни продуктите и го качи. Празно ID = нов продукт, попълнено ID = обновяване.</div>
        </div>
      </div>
      <div className="excel-import-actions">
        <a className="btn btn-outline" href="/api/admin/products/template" download><Download size={16} /> Шаблон</a>
        <a className="btn btn-outline" href="/api/admin/products/export" download><Download size={16} /> Експорт на продуктите</a>
        <button type="button" className="btn btn-primary" disabled={busy} onClick={() => input.current?.click()}>
          <Upload size={16} /> {busy ? 'Импортиране…' : 'Импорт от Excel'}
        </button>
        <input
          ref={input}
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          hidden
          onChange={(e) => upload(e.target.files?.[0])}
        />
      </div>
      {problem && (
        <div className="error-box excel-errors">
          <div className="excel-errors-head">
            <strong>{problem.message}</strong>
            <button type="button" className="link-like" onClick={() => setProblem(null)} aria-label="Затвори"><X size={16} /></button>
          </div>
          {problem.details.length > 0 && (
            <ul>
              {problem.details.slice(0, 50).map((d, i) => <li key={i}>{d}</li>)}
              {problem.details.length > 50 && <li>… и още {problem.details.length - 50}</li>}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

type Stats = {
  revenue: number;
  orders: number;
  newOrders: number;
  products: number;
  customers: number;
  lowStock: Product[];
  topProducts: Product[];
  recentOrders: Order[];
};

type Tab = 'dashboard' | 'products' | 'orders';

export function Admin() {
  const [tab, setTab] = useState<Tab>('dashboard');
  return (
    <div className="container page">
      <h1 className="title-with-icon"><IconBadge><LayoutDashboard size={20} /></IconBadge> Контролен панел</h1>
      <div className="tabs">
        <button className={tab === 'dashboard' ? 'active' : ''} onClick={() => setTab('dashboard')}><ChartColumn size={16} /> Табло</button>
        <button className={tab === 'products' ? 'active' : ''} onClick={() => setTab('products')}><Package size={16} /> Продукти</button>
        <button className={tab === 'orders' ? 'active' : ''} onClick={() => setTab('orders')}><Receipt size={16} /> Поръчки</button>
      </div>
      {tab === 'dashboard' && <Dashboard onGoOrders={() => setTab('orders')} />}
      {tab === 'products' && <ProductsAdmin />}
      {tab === 'orders' && <OrdersAdmin />}
    </div>
  );
}

function Dashboard({ onGoOrders }: { onGoOrders: () => void }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [updated, setUpdated] = useState<Date | null>(null);

  useEffect(() => {
    const load = () =>
      api<Stats>('/admin/stats').then((s) => {
        setStats(s);
        setUpdated(new Date());
      }).catch(() => {});
    load();
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, []);

  if (!stats) return <Spinner />;

  return (
    <>
      <p className="muted small live-dot">На живо · обновено {updated?.toLocaleTimeString('bg-BG')}</p>
      <div className="grid stats-grid">
        <div className="card stat"><span className="muted small">Оборот</span><strong>{formatPrice(stats.revenue)}</strong></div>
        <div className="card stat"><span className="muted small">Поръчки</span><strong>{stats.orders}</strong></div>
        <button className="card stat stat-alert" onClick={onGoOrders}><span className="muted small">Нови поръчки</span><strong>{stats.newOrders}</strong></button>
        <div className="card stat"><span className="muted small">Продукти</span><strong>{stats.products}</strong></div>
        <div className="card stat"><span className="muted small">Клиенти</span><strong>{stats.customers}</strong></div>
      </div>

      <div className="admin-columns">
        <div className="card">
          <h3 className="title-with-icon"><TriangleAlert size={18} className="text-warn" /> Ниска наличност</h3>
          {stats.lowStock.length === 0 ? <p className="muted">Всичко е заредено.</p> : (
            <table className="table">
              <tbody>
                {stats.lowStock.map((p) => (
                  <tr key={p.id}>
                    <td><Link to={`/product/${p.slug}`} className="link">{p.name}</Link></td>
                    <td className={p.stock === 0 ? 'text-danger' : 'text-warn'}>{p.stock} бр.</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="card">
          <h3 className="title-with-icon"><Trophy size={18} className="text-accent" /> Най-продавани</h3>
          {stats.topProducts.length === 0 ? <p className="muted">Още няма продажби — направи тестова поръчка.</p> : (
            <table className="table">
              <tbody>
                {stats.topProducts.map((p) => (
                  <tr key={p.id}><td>{p.name}</td><td>{p.sold} бр.</td></tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="card">
        <h3>Последни поръчки</h3>
        {stats.recentOrders.length === 0 ? <p className="muted">Няма поръчки.</p> : (
          <table className="table">
            <thead><tr><th>#</th><th>Клиент</th><th>Дата</th><th>Сума</th><th>Статус</th></tr></thead>
            <tbody>
              {stats.recentOrders.map((o) => (
                <tr key={o.id}>
                  <td>{o.id}</td><td>{o.customerName}</td><td>{formatDate(o.createdAt)}</td><td>{formatPrice(o.total)}</td>
                  <td><span className={`status status-${o.status}`}>{STATUS_LABELS[o.status]}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

// ---------------- Продукти ----------------

type FormState = {
  id?: number;
  name: string; brand: string; categoryId: string; description: string;
  price: string; oldPrice: string; stock: string; imageUrl: string; featured: boolean; specs: string;
};

const emptyForm = (categoryId = ''): FormState => ({
  name: '', brand: '', categoryId, description: '', price: '', oldPrice: '', stock: '10', imageUrl: '', featured: false, specs: '',
});

function ProductsAdmin() {
  const toast = useToast();
  const [products, setProducts] = useState<Product[] | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState<FormState | null>(null);
  const [filter, setFilter] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => api<Product[]>('/admin/products').then(setProducts).catch((e) => toast(e.message, 'error')), [toast]);

  useEffect(() => {
    load();
    api<Category[]>('/categories').then(setCategories).catch(() => {});
  }, [load]);

  const edit = (p: Product) =>
    setForm({
      id: p.id, name: p.name, brand: p.brand, categoryId: String(p.category.id), description: p.description,
      price: String(p.price), oldPrice: p.oldPrice ? String(p.oldPrice) : '', stock: String(p.stock),
      imageUrl: p.imageUrl ?? '', featured: p.featured,
      specs: Object.entries(p.specs).map(([k, v]) => `${k}: ${v}`).join('\n'),
    });

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!form) return;
    const specs: Record<string, string> = {};
    for (const line of form.specs.split('\n')) {
      const i = line.indexOf(':');
      if (i > 0) specs[line.slice(0, i).trim()] = line.slice(i + 1).trim();
    }
    const body = {
      name: form.name, brand: form.brand, categoryId: Number(form.categoryId), description: form.description,
      price: Number(form.price), oldPrice: form.oldPrice ? Number(form.oldPrice) : null, stock: Number(form.stock),
      imageUrl: form.imageUrl, featured: form.featured, specs,
    };
    setSaving(true);
    try {
      if (form.id) await api(`/admin/products/${form.id}`, { method: 'PUT', body });
      else await api('/admin/products', { method: 'POST', body });
      toast(form.id ? 'Продуктът е обновен' : 'Продуктът е добавен');
      setForm(null);
      load();
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (p: Product) => {
    if (!window.confirm(`Да изтрия ли „${p.name}“?`)) return;
    try {
      await api(`/admin/products/${p.id}`, { method: 'DELETE' });
      toast('Продуктът е изтрит');
      load();
    } catch (err) {
      toast((err as Error).message, 'error');
    }
  };

  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => (f ? { ...f, [k]: e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value } : f));

  if (!products) return <Spinner />;
  const shown = products.filter((p) => `${p.name} ${p.brand} ${p.category.name}`.toLowerCase().includes(filter.toLowerCase()));

  return (
    <>
      <ExcelImport onImported={load} />
      <div className="admin-toolbar">
        <input placeholder="Филтрирай продукти…" value={filter} onChange={(e) => setFilter(e.target.value)} />
        <button className="btn btn-primary" onClick={() => setForm(emptyForm(String(categories[0]?.id ?? '')))}><Plus size={17} /> Нов продукт</button>
      </div>

      <div className="card table-wrap">
        <table className="table">
          <thead>
            <tr><th></th><th>Продукт</th><th>Категория</th><th>Цена</th><th>Наличност</th><th>Продадени</th><th></th></tr>
          </thead>
          <tbody>
            {shown.map((p) => (
              <tr key={p.id}>
                <td style={{ width: 52 }}><ProductImage id={p.id} name={p.name} brand={p.brand} category={p.category.slug} imageUrl={p.imageUrl} size="sm" /></td>
                <td>
                  <Link to={`/product/${p.slug}`} className="link">{p.name}</Link>
                  <div className="muted small">{p.brand}{p.featured ? ' · препоръчан' : ''}</div>
                </td>
                <td>{p.category.name}</td>
                <td>
                  {formatPrice(p.price)}
                  {p.oldPrice && <div className="old-price small">{formatPrice(p.oldPrice)}</div>}
                </td>
                <td className={p.stock === 0 ? 'text-danger' : p.stock <= 5 ? 'text-warn' : ''}>{p.stock}</td>
                <td>{p.sold}</td>
                <td className="nowrap">
                  <button className="btn btn-ghost btn-sm" onClick={() => edit(p)} aria-label="Редактирай"><Pencil size={16} /></button>
                  <button className="btn btn-ghost btn-sm text-danger" onClick={() => remove(p)} aria-label="Изтрий"><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {form && (
        <div className="modal-backdrop" onClick={() => setForm(null)}>
          <form className="card modal" onClick={(e) => e.stopPropagation()} onSubmit={save}>
            <h3>{form.id ? 'Редакция на продукт' : 'Нов продукт'}</h3>
            <div className="form-grid">
              <label className="span-2">Име<input required value={form.name} onChange={set('name')} /></label>
              <label>Марка<input required value={form.brand} onChange={set('brand')} /></label>
              <label>Категория
                <select required value={form.categoryId} onChange={set('categoryId')}>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </label>
              <label>Цена (€)<input required type="number" step="0.01" min="0.01" value={form.price} onChange={set('price')} /></label>
              <label>Стара цена (€) — за промоция<input type="number" step="0.01" min="0" value={form.oldPrice} onChange={set('oldPrice')} /></label>
              <label>Наличност (бр.)<input required type="number" min="0" step="1" value={form.stock} onChange={set('stock')} /></label>
              <label>Снимка (URL, по желание)<input value={form.imageUrl} onChange={set('imageUrl')} placeholder="https://…" /></label>
              <label className="span-2">Описание<textarea rows={3} value={form.description} onChange={set('description')} /></label>
              <label className="span-2">Характеристики (по една на ред, „Ключ: стойност“)
                <textarea rows={4} value={form.specs} onChange={set('specs')} placeholder={'Тегло: 60 г\nDPI: 26 000'} />
              </label>
              <label className="checkbox span-2"><input type="checkbox" checked={form.featured} onChange={set('featured')} /> Препоръчан продукт (показва се на началната страница)</label>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setForm(null)}>Отказ</button>
              <button className="btn btn-primary" disabled={saving}>{saving ? 'Запазване…' : 'Запази'}</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

// ---------------- Поръчки ----------------

function OrdersAdmin() {
  const toast = useToast();
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [status, setStatus] = useState('');

  const load = useCallback(
    () => api<Order[]>(`/admin/orders${status ? `?status=${status}` : ''}`).then(setOrders).catch((e) => toast(e.message, 'error')),
    [status, toast],
  );

  useEffect(() => {
    load();
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, [load]);

  const change = async (o: Order, next: OrderStatus) => {
    try {
      await api(`/admin/orders/${o.id}`, { method: 'PATCH', body: { status: next } });
      toast(`Поръчка #${o.id}: ${STATUS_LABELS[next]}`);
      load();
    } catch (err) {
      toast((err as Error).message, 'error');
    }
  };

  return (
    <>
      <div className="admin-toolbar">
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Всички статуси</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      {!orders ? <Spinner /> : orders.length === 0 ? <p className="muted">Няма поръчки.</p> : (
        <div className="orders-list">
          {orders.map((o) => (
            <OrderCard key={o.id} order={o}>
              <div className="order-admin">
                <span className="small with-icon"><User size={14} /> {o.customerName}</span>
                <span className="small with-icon"><Phone size={14} /> {o.phone}</span>
                <span className="small with-icon"><Mail size={14} /> {o.email}</span>
                {o.couponCode && <span className="small with-icon"><Tag size={14} /> {o.couponCode} (−{formatPrice(o.discount)})</span>}
                {o.note && <span className="small with-icon"><StickyNote size={14} /> {o.note}</span>}
                <label className="small">
                  Статус:{' '}
                  <select value={o.status} onChange={(e) => change(o, e.target.value as OrderStatus)}>
                    {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </label>
              </div>
            </OrderCard>
          ))}
        </div>
      )}
    </>
  );
}
