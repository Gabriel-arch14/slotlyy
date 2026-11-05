import { Link } from 'react-router-dom';
import { ShoppingCart } from 'lucide-react';
import type { Product } from '../types';
import { discountPercent, formatPrice } from '../format';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { ProductImage } from './ProductImage';
import { FavoriteButton } from './FavoriteButton';
import { Stars } from './ui';

export function ProductCard({ product: p }: { product: Product }) {
  const cart = useCart();
  const toast = useToast();
  const off = discountPercent(p.price, p.oldPrice);
  const inCart = cart.items.find((i) => i.productId === p.id)?.qty ?? 0;
  const canAdd = p.stock > inCart;

  return (
    <article className="card product-card">
      <Link to={`/product/${p.slug}`} className="product-card-media">
        <ProductImage id={p.id} name={p.name} brand={p.brand} category={p.category.slug} imageUrl={p.imageUrl} />
        <div className="badges">
          {off > 0 && <span className="badge badge-sale">−{off}%</span>}
          {p.featured && <span className="badge badge-hot">ТОП</span>}
          {p.stock === 0 && <span className="badge badge-out">Изчерпан</span>}
        </div>
      </Link>
      <div className="product-card-body">
        <div className="muted small">{p.brand} · {p.category.name}</div>
        <Link to={`/product/${p.slug}`} className="product-card-title">{p.name}</Link>
        <div className="rating-row">
          <Stars value={p.rating} />
          <span className="muted small">({p.reviewCount})</span>
        </div>
        <div className="product-card-footer">
          <div className="price-block">
            <span className="price">{formatPrice(p.price)}</span>
            {p.oldPrice && p.oldPrice > p.price && <span className="old-price">{formatPrice(p.oldPrice)}</span>}
          </div>
          <div className="product-card-actions">
          <FavoriteButton product={p} />
          <button
            className="btn btn-primary btn-icon"
            disabled={!canAdd}
            title={p.stock === 0 ? 'Няма наличност' : canAdd ? 'Добави в количката' : 'Максимално количество'}
            aria-label="Добави в количката"
            onClick={() => {
              cart.add(p);
              toast(`„${p.name}“ е добавен в количката`);
            }}
          >
            <ShoppingCart size={18} />
          </button>
          </div>
        </div>
        {p.stock > 0 && p.stock <= 5 && <div className="low-stock">Само {p.stock} бр. в наличност!</div>}
      </div>
    </article>
  );
}
