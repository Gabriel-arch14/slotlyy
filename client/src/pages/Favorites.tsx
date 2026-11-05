import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { useFavorites } from '../context/FavoritesContext';
import { ProductCard } from '../components/ProductCard';
import { EmptyState } from '../components/ui';

export function Favorites() {
  const { items } = useFavorites();

  if (items.length === 0) {
    return (
      <div className="container page">
        <EmptyState icon={<Heart size={30} />} title="Нямаш любими продукти">
          <p className="muted">Натисни сърцето до количката на всеки продукт и той ще се появи тук.</p>
          <Link to="/catalog" className="btn btn-primary">Към магазина</Link>
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="container page">
      <h1>Любими</h1>
      <p className="muted">{items.length} {items.length === 1 ? 'продукт' : 'продукта'}, които си харесал.</p>
      <div className="grid products-grid">
        {items.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </div>
  );
}
