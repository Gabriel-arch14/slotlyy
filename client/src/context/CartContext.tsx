import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { api } from '../api';
import type { CartItem, Product } from '../types';

const OLD_CART_KEY = 'slotlyy_cart';

type CartState = {
  items: CartItem[];
  count: number;
  subtotal: number;
  add: (product: Product, qty?: number) => void;
  setQty: (productId: number, qty: number) => void;
  remove: (productId: number) => void;
  clear: () => void;
};

const CartContext = createContext<CartState | null>(null);

/** Количка от старата версия (localStorage) — прехвърля се веднъж в бисквитката. */
function takeOldCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(OLD_CART_KEY);
    localStorage.removeItem(OLD_CART_KEY);
    return raw ? (JSON.parse(raw) as CartItem[]) : [];
  } catch {
    return [];
  }
}

const toLines = (items: CartItem[]) => items.map((i) => ({ productId: i.productId, qty: i.qty }));

/** Количката се пази в бисквитка от сървъра, затова остава и след презареждане. */
export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const ready = useRef(false);
  const lastSaved = useRef('');

  useEffect(() => {
    let cancelled = false;
    const old = takeOldCart();
    const load = old.length
      ? api<CartItem[]>('/cart', { method: 'PUT', body: { items: toLines(old) } })
      : api<CartItem[]>('/cart');
    load
      .then((saved) => {
        if (cancelled) return;
        lastSaved.current = JSON.stringify(toLines(saved));
        ready.current = true;
        // Ако клиентът е добавил нещо, докато количката се зарежда — пазим и двете.
        setItems((current) => [...saved.filter((s) => !current.some((c) => c.productId === s.productId)), ...current]);
      })
      .catch(() => {
        ready.current = true;
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready.current) return;
    const lines = JSON.stringify(toLines(items));
    if (lines === lastSaved.current) return;
    lastSaved.current = lines;
    api('/cart', { method: 'PUT', body: { items: toLines(items) } }).catch(() => {});
  }, [items]);

  const value = useMemo<CartState>(() => {
    const clamp = (qty: number, stock: number) => Math.max(1, Math.min(qty, stock, 99));
    return {
      items,
      count: items.reduce((s, i) => s + i.qty, 0),
      subtotal: Math.round(items.reduce((s, i) => s + i.price * i.qty, 0) * 100) / 100,
      add: (p, qty = 1) =>
        setItems((prev) => {
          const existing = prev.find((i) => i.productId === p.id);
          if (existing) {
            return prev.map((i) =>
              i.productId === p.id
                ? { ...i, qty: clamp(i.qty + qty, p.stock), stock: p.stock, price: p.price, imageUrl: p.imageUrl, categorySlug: p.category.slug }
                : i,
            );
          }
          return [
            ...prev,
            {
              productId: p.id, slug: p.slug, name: p.name, brand: p.brand, price: p.price,
              qty: clamp(qty, p.stock), stock: p.stock, imageUrl: p.imageUrl, categorySlug: p.category.slug,
            },
          ];
        }),
      setQty: (id, qty) => setItems((prev) => prev.map((i) => (i.productId === id ? { ...i, qty: clamp(qty, i.stock) } : i))),
      remove: (id) => setItems((prev) => prev.filter((i) => i.productId !== id)),
      clear: () => setItems([]),
    };
  }, [items]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
}
