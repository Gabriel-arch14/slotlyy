import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { api } from '../api';
import type { Product } from '../types';

type FavoritesState = {
  items: Product[];
  count: number;
  has: (productId: number) => boolean;
  /** Добавя или маха продукта. Връща true, ако вече е в любими. */
  toggle: (product: Product) => boolean;
};

const FavoritesContext = createContext<FavoritesState | null>(null);

/** Любимите се пазят в бисквитка от сървъра, затова остават и след презареждане. */
export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Product[]>([]);
  const latest = useRef<Product[]>([]);

  useEffect(() => {
    api<Product[]>('/favorites')
      .then((saved) => {
        // Ако клиентът е натиснал сърце, докато списъкът се зарежда — пазим и двете.
        const merged = [...latest.current, ...saved.filter((s) => !latest.current.some((c) => c.id === s.id))];
        latest.current = merged;
        setItems(merged);
      })
      .catch(() => {});
  }, []);

  const value = useMemo<FavoritesState>(() => {
    const has = (id: number) => items.some((p) => p.id === id);
    return {
      items,
      count: items.length,
      has,
      toggle: (product) => {
        // Работим с най-новия списък (ref), за да не се губят бързи последователни натискания.
        const current = latest.current;
        const added = !current.some((p) => p.id === product.id);
        const next = added ? [product, ...current] : current.filter((p) => p.id !== product.id);
        latest.current = next;
        setItems(next);
        api<Product[]>('/favorites', { method: 'PUT', body: { ids: next.map((p) => p.id) } }).catch(() => {});
        return added;
      },
    };
  }, [items]);

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error('useFavorites must be used inside FavoritesProvider');
  return ctx;
}
