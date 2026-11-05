import { Heart } from 'lucide-react';
import type { Product } from '../types';
import { useFavorites } from '../context/FavoritesContext';
import { useToast } from '../context/ToastContext';

/** Сърце за добавяне/махане от любими. */
export function FavoriteButton({ product, large = false }: { product: Product; large?: boolean }) {
  const favorites = useFavorites();
  const toast = useToast();
  const active = favorites.has(product.id);
  const label = active ? 'Махни от любими' : 'Добави в любими';

  return (
    <button
      type="button"
      className={`btn btn-outline btn-icon fav-btn ${large ? 'btn-lg' : ''} ${active ? 'active' : ''}`}
      aria-pressed={active}
      aria-label={label}
      title={label}
      onClick={() => {
        const added = favorites.toggle(product);
        toast(added ? `„${product.name}“ е добавен в любими` : `„${product.name}“ е махнат от любими`);
      }}
    >
      <Heart size={large ? 20 : 18} fill={active ? 'currentColor' : 'none'} />
    </button>
  );
}
