import { useEffect, useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { api } from '../api';
import type { Order } from '../types';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { FREE_SHIPPING_FROM, SHIPPING_PRICE, formatPrice } from '../format';
import { IconBadge } from '../components/icons';
import { Banknote, CreditCard, Landmark, MapPin, X } from 'lucide-react';

type EcontOffice = { code: string; name: string; address: string };

export function Checkout() {
  const cart = useCart();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: user?.name ?? '', email: user?.email ?? '', phone: '', econtOffice: '', note: '' });
  const [offices, setOffices] = useState<EcontOffice[]>([]);

  useEffect(() => {
    api<EcontOffice[]>('/orders/econt-offices')
      .then(setOffices)
      .catch(() => setError('Не успяхме да заредим офисите на Еконт. Опреснете страницата.'));
  }, []);

  const selectedOffice = offices.find((o) => o.code === form.econtOffice);
  const [payment, setPayment] = useState<'cod' | 'card' | 'bank'>('cod');
  const [couponInput, setCouponInput] = useState('');
  const [coupon, setCoupon] = useState<{ code: string; percent: number } | null>(null);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  if (cart.items.length === 0) return <Navigate to="/cart" replace />;

  const discount = coupon ? Math.round(cart.subtotal * coupon.percent) / 100 : 0;
  const afterDiscount = cart.subtotal - discount;
  const shipping = afterDiscount >= FREE_SHIPPING_FROM ? 0 : SHIPPING_PRICE;
  const total = afterDiscount + shipping;

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const applyCoupon = async () => {
    if (!couponInput.trim()) return;
    try {
      const c = await api<{ code: string; percent: number }>(`/coupons/${encodeURIComponent(couponInput.trim())}`);
      setCoupon(c);
      toast(`Кодът ${c.code} е приложен: −${c.percent}%`);
    } catch (e) {
      setCoupon(null);
      toast((e as Error).message, 'error');
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSending(true);
    try {
      const order = await api<Order>('/orders', {
        method: 'POST',
        body: {
          items: cart.items.map((i) => ({ productId: i.productId, qty: i.qty })),
          customer: form,
          paymentMethod: payment,
          couponCode: coupon?.code,
        },
      });
      navigate(`/order/${order.id}`, { state: { order } });
      cart.clear();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="container page">
      <h1>Завършване на поръчката</h1>
      {!user && (
        <p className="muted">
          Имаш профил? <Link to="/login?next=/checkout" className="link">Влез</Link>, за да следиш поръчките си.
        </p>
      )}
      <form className="checkout-layout" onSubmit={submit}>
        <div className="card form-card">
          <h3>1. Данни за доставка</h3>
          <div className="form-grid">
            <label>Име и фамилия<input required value={form.name} onChange={set('name')} autoComplete="name" /></label>
            <label>Телефон<input required value={form.phone} onChange={set('phone')} placeholder="0888 123 456" autoComplete="tel" /></label>
            <label className="span-2">Имейл<input required type="email" value={form.email} onChange={set('email')} autoComplete="email" /></label>
            <label className="span-2">
              Офис на Еконт в Габрово
              <select required value={form.econtOffice} onChange={set('econtOffice')} className="econt-select">
                <option value="" disabled>{offices.length ? 'Избери офис…' : 'Зареждане на офисите…'}</option>
                {offices.map((o) => (
                  <option key={o.code} value={o.code}>{o.name} — {o.address}</option>
                ))}
              </select>
            </label>
            {selectedOffice && (
              <div className="econt-picked span-2">
                <MapPin size={18} />
                <div>
                  <strong>Еконт „{selectedOffice.name}“</strong>
                  <div className="muted small">{selectedOffice.address}, гр. Габрово</div>
                </div>
              </div>
            )}
            <label className="span-2">Бележка (по желание)<textarea rows={2} value={form.note} onChange={set('note')} /></label>
          </div>

          <h3>2. Начин на плащане</h3>
          <div className="pay-options">
            {([
              ['cod', <Banknote size={20} />, 'Наложен платеж', 'Плащаш при получаване'],
              ['card', <CreditCard size={20} />, 'Карта', 'Демо — без реално плащане'],
              ['bank', <Landmark size={20} />, 'Банков превод', 'Ще получиш IBAN по имейл'],
            ] as const).map(([v, icon, label, hint]) => (
              <label key={v} className={`pay-option ${payment === v ? 'active' : ''}`}>
                <input type="radio" name="pay" checked={payment === v} onChange={() => setPayment(v)} />
                <IconBadge size="sm">{icon}</IconBadge>
                <div><strong>{label}</strong><div className="muted small">{hint}</div></div>
              </label>
            ))}
          </div>
        </div>

        <aside className="card summary">
          <h3>Твоята поръчка</h3>
          {cart.items.map((i) => (
            <div key={i.productId} className="summary-row small">
              <span>{i.qty} × {i.name}</span>
              <span>{formatPrice(i.price * i.qty)}</span>
            </div>
          ))}
          <div className="coupon">
            <input value={couponInput} onChange={(e) => setCouponInput(e.target.value)} placeholder="Промо код" />
            <button type="button" className="btn btn-outline" onClick={applyCoupon}>Приложи</button>
          </div>
          <div className="summary-row"><span>Междинна сума</span><span>{formatPrice(cart.subtotal)}</span></div>
          {coupon && (
            <div className="summary-row discount">
              <span>Отстъпка {coupon.code} (−{coupon.percent}%) <button type="button" className="link-like" onClick={() => setCoupon(null)} aria-label="Махни кода"><X size={14} /></button></span>
              <span>−{formatPrice(discount)}</span>
            </div>
          )}
          <div className="summary-row"><span>Доставка</span><span>{shipping ? formatPrice(shipping) : 'Безплатна'}</span></div>
          <div className="summary-row total"><span>Общо</span><span>{formatPrice(total)}</span></div>
          {error && <p className="error-box">{error}</p>}
          <button className="btn btn-primary btn-lg btn-block" disabled={sending}>{sending ? 'Изпращане…' : 'Потвърди поръчката'}</button>
          <p className="muted small">С натискането приемаш общите условия на магазина.</p>
        </aside>
      </form>
    </div>
  );
}
