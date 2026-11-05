import { Router, type Request, type Response } from 'express';
import { db } from '../db';
import { mapProduct, PRODUCT_SELECT } from '../productQuery';
import { CART_MAX_AGE, COOKIES, clearCookie, readCookies, setCookie } from '../security';

/**
 * Любимите продукти живеят в бисквитка (само номерата им, напр. "12|7|3"),
 * а данните за продуктите се взимат винаги наново от базата.
 */
const router = Router();
const MAX_FAVORITES = 100;

function parse(raw: string | undefined): number[] {
  if (!raw) return [];
  const ids = raw.split('|').map(Number).filter((n) => Number.isInteger(n) && n > 0);
  return [...new Set(ids)].slice(0, MAX_FAVORITES);
}

/** Връща продуктите в реда, в който са добавени (последно добавените — първи). */
function resolve(ids: number[]) {
  if (!ids.length) return [];
  const rows = db
    .prepare(`${PRODUCT_SELECT} WHERE p.id IN (${ids.map(() => '?').join(',')})`)
    .all(...ids)
    .map(mapProduct);
  const byId = new Map(rows.map((p) => [p.id, p]));
  return ids.flatMap((id) => byId.get(id) ?? []);
}

function save(req: Request, res: Response, ids: number[]) {
  if (!ids.length) return clearCookie(req, res, COOKIES.favorites);
  setCookie(req, res, COOKIES.favorites, ids.join('|'), { httpOnly: true, maxAgeMs: CART_MAX_AGE });
}

router.get('/', (req, res) => {
  res.json(resolve(parse(readCookies(req)[COOKIES.favorites])));
});

router.put('/', (req, res) => {
  const body = Array.isArray(req.body?.ids) ? req.body.ids : [];
  const products = resolve(parse(body.join('|')));
  save(req, res, products.map((p) => p.id));
  res.json(products);
});

export default router;
