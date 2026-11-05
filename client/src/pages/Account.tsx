import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import type { Order } from '../types';
import { useAuth } from '../context/AuthContext';
import { PAYMENT_LABELS, STATUS_LABELS, formatDate, formatPrice } from '../format';
import { EmptyState, Spinner } from '../components/ui';
import { Package } from 'lucide-react';

export function OrderCard({ order: o, children }: { order: Order; children?: React.ReactNode }) {
  return (
    <div className="card order-card">
      <div className="order-head">
        <div>
          <strong>Поръчка #{o.id}</strong>
          <div className="muted small">{formatDate(o.createdAt)} · {PAYMENT_LABELS[o.paymentMethod]}</div>
        </div>
        <span className={`status status-${o.status}`}>{STATUS_LABELS[o.status]}</span>
      </div>
      <div className="order-items">
        {o.items.map((i, idx) => (
          <div key={idx} className="summary-row small">
            <span>{i.qty} × {i.slug ? <Link to={`/product/${i.slug}`} className="link">{i.name}</Link> : i.name}</span>
            <span>{formatPrice(i.price * i.qty)}</span>
          </div>
        ))}
      </div>
      <div className="order-foot">
        <span className="muted small">{o.city}, {o.address}</span>
        <strong>{formatPrice(o.total)}</strong>
      </div>
      {children}
    </div>
  );
}

export function Account() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = () => api<Order[]>('/orders/my').then(setOrders).catch((e) => setError(e.message));
    load();
    // Статусът се обновява на живо, когато администраторът го промени.
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="container page">
      <h1>Здравей, {user?.name}</h1>
      <p className="muted">{user?.email}</p>
      <h2>Моите поръчки</h2>
      {error ? <p className="error-box">{error}</p> : !orders ? <Spinner /> : orders.length === 0 ? (
        <EmptyState icon={<Package size={30} />} title="Още нямаш поръчки">
          <Link to="/catalog" className="btn btn-primary">Към магазина</Link>
        </EmptyState>
      ) : (
        <div className="orders-list">{orders.map((o) => <OrderCard key={o.id} order={o} />)}</div>
      )}
    </div>
  );
}
