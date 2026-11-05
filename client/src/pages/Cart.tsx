import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { FREE_SHIPPING_FROM, SHIPPING_PRICE, formatPrice } from '../format';
import { ProductImage } from '../components/ProductImage';
import { EmptyState, QtyInput } from '../components/ui';
import { ArrowRight, BadgeCheck, ShoppingCart, Trash2 } from 'lucide-react';

export function Cart() {
  const cart = useCart();

  if (cart.items.length === 0) {
    return (
      <div className="container page">
        <EmptyState icon={<ShoppingCart size={30} />} title="Количката е празна">
          <p className="muted">Разгледай магазина и добави нещо готино.</p>
          <Link to="/catalog" className="btn btn-primary">Към магазина</Link>
        </EmptyState>
      </div>
    );
  }

  const shipping = cart.subtotal >= FREE_SHIPPING_FROM ? 0 : SHIPPING_PRICE;
  const missing = FREE_SHIPPING_FROM - cart.subtotal;

  return (
    <div className="container page">
      <h1>Количка</h1>
      <div className="checkout-layout">
        <div className="card cart-list">
          {cart.items.map((i) => (
            <div key={i.productId} className="cart-item">
              <Link to={`/product/${i.slug}`}>
                <ProductImage id={i.productId} name={i.name} brand={i.brand} category={i.categorySlug} imageUrl={i.imageUrl} size="sm" />
              </Link>
              <div className="cart-item-info">
                <Link to={`/product/${i.slug}`} className="product-card-title">{i.name}</Link>
                <div className="muted small">{formatPrice(i.price)} / бр.</div>
              </div>
              <QtyInput value={i.qty} max={i.stock} onChange={(v) => cart.setQty(i.productId, v)} />
              <strong className="cart-item-total">{formatPrice(i.price * i.qty)}</strong>
              <button className="btn btn-ghost btn-icon" onClick={() => cart.remove(i.productId)} aria-label="Премахни"><Trash2 size={17} /></button>
            </div>
          ))}
          <button className="btn btn-ghost" onClick={cart.clear}>Изпразни количката</button>
        </div>

        <aside className="card summary">
          <h3>Обобщение</h3>
          {missing > 0 ? (
            <div className="ship-progress">
              <div className="small">Още <b>{formatPrice(missing)}</b> до безплатна доставка</div>
              <div className="bar"><div style={{ width: `${Math.min(100, (cart.subtotal / FREE_SHIPPING_FROM) * 100)}%` }} /></div>
            </div>
          ) : (
            <div className="ship-progress small with-icon ok"><BadgeCheck size={17} /> Имаш безплатна доставка!</div>
          )}
          <div className="summary-row"><span>Продукти ({cart.count})</span><span>{formatPrice(cart.subtotal)}</span></div>
          <div className="summary-row"><span>Доставка</span><span>{shipping ? formatPrice(shipping) : 'Безплатна'}</span></div>
          <div className="summary-row total"><span>Общо</span><span>{formatPrice(cart.subtotal + shipping)}</span></div>
          <p className="muted small">Промо код можеш да въведеш на следващата стъпка.</p>
          <Link to="/checkout" className="btn btn-primary btn-lg btn-block">Към поръчка <ArrowRight size={18} /></Link>
          <Link to="/catalog" className="btn btn-ghost btn-block">Продължи пазаруването</Link>
        </aside>
      </div>
    </div>
  );
}
