import { Link, useLocation, useParams } from 'react-router-dom';
import type { Order } from '../types';
import { PAYMENT_LABELS, formatPrice } from '../format';
import { useAuth } from '../context/AuthContext';
import { IconBadge } from '../components/icons';
import { CircleCheck } from 'lucide-react';

export function OrderSuccess() {
  const { id } = useParams();
  const { user } = useAuth();
  const order = (useLocation().state as { order?: Order } | null)?.order;

  return (
    <div className="container page narrow">
      <div className="card success-card">
        <IconBadge size="lg"><CircleCheck size={34} /></IconBadge>
        <h1>Благодарим за поръчката!</h1>
        <p>Поръчка <b>#{id}</b> е приета успешно. Ще получиш потвърждение на имейла си.</p>
        {order && (
          <div className="success-details">
            {order.items.map((i, idx) => (
              <div key={idx} className="summary-row small"><span>{i.qty} × {i.name}</span><span>{formatPrice(i.price * i.qty)}</span></div>
            ))}
            {order.discount > 0 && <div className="summary-row discount"><span>Отстъпка</span><span>−{formatPrice(order.discount)}</span></div>}
            <div className="summary-row"><span>Доставка</span><span>{order.shipping ? formatPrice(order.shipping) : 'Безплатна'}</span></div>
            <div className="summary-row total"><span>Общо</span><span>{formatPrice(order.total)}</span></div>
            <p className="muted small">Плащане: {PAYMENT_LABELS[order.paymentMethod]} · Доставка до: {order.city}, {order.address}</p>
          </div>
        )}
        <div className="hero-cta center">
          {user && <Link to="/account" className="btn btn-outline">Моите поръчки</Link>}
          <Link to="/catalog" className="btn btn-primary">Продължи пазаруването</Link>
        </div>
      </div>
    </div>
  );
}
