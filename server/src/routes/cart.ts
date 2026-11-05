import { Router, type Request, type Response } from 'express';
import { db } from '../db';
import { mapProduct, PRODUCT_SELECT } from '../productQuery';
import { CART_MAX_AGE, COOKIES, clearCookie, readCookies, setCookie } from '../security';

/**
 * Количката живее в бисквитка (само номер на продукт и брой, напр. "12:1|7:2"),
 * а цените и наличностите се взимат винаги наново от базата.
 */
const router = Router();
const MAX_LINES = 50;

type Line = { productId: number; qty: number };

function parse(raw: string | undefined): Line[] {
  if (!raw) return [];
  const lines: Line[] = [];
  for (const part of raw.split('|').slice(0, MAX_LINES)) {
    const [id, qty] = part.split(':').map(Number);
    if (Number.isInteger(id) && id > 0 && Number.isInteger(qty) && qty > 0) lines.push({ productId: id, qty: Math.min(qty, 99) });
  }
  return lines;
}

function resolve(lines: Line[]) {
  if (!lines.length) return [];
  const rows = db
    .prepare(`${PRODUCT_SELECT} WHERE p.id IN (${lines.map(() => '?').join(',')})`)
    .all(...lines.map((l) => l.productId))
    .map(mapProduct);
  const byId = new Map(rows.map((p) => [p.id, p]));
  return lines.flatMap((l) => {
    const p = byId.get(l.productId);
    if (!p || p.stock < 1) return [];
    return [{
      productId: p.id, slug: p.slug, name: p.name, brand: p.brand, price: p.price,
      qty: Math.min(l.qty, p.stock), stock: p.stock, imageUrl: p.imageUrl, categorySlug: p.category.slug,
    }];
  });
}

function save(req: Request, res: Response, items: { productId: number; qty: number }[]) {
  if (!items.length) return clearCookie(req, res, COOKIES.cart);
  setCookie(req, res, COOKIES.cart, items.map((i) => `${i.productId}:${i.qty}`).join('|'), { httpOnly: true, maxAgeMs: CART_MAX_AGE });
}

router.get('/', (req, res) => {
  res.json(resolve(parse(readCookies(req)[COOKIES.cart])));
});

router.put('/', (req, res) => {
  const body = Array.isArray(req.body?.items) ? req.body.items : [];
  const merged = new Map<number, number>();
  for (const i of body.slice(0, MAX_LINES)) {
    const id = Number(i?.productId);
    const qty = Number(i?.qty);
    if (Number.isInteger(id) && id > 0 && Number.isInteger(qty) && qty > 0) merged.set(id, Math.min(99, qty));
  }
  const items = resolve([...merged].map(([productId, qty]) => ({ productId, qty })));
  save(req, res, items);
  res.json(items);
});

export default router;
