import { Router } from 'express';
import { db } from '../db';
import { HttpError, requireAuth } from '../http';
import { mapProduct, PRODUCT_SELECT } from '../productQuery';

const router = Router();

const SORTS: Record<string, string> = {
  popular: 'sold DESC, review_count DESC, p.id DESC',
  newest: 'p.created_at DESC, p.id DESC',
  price_asc: 'p.price ASC',
  price_desc: 'p.price DESC',
  rating: 'rating IS NULL, rating DESC, review_count DESC',
  discount: '(COALESCE(p.old_price, p.price) - p.price) / COALESCE(p.old_price, p.price) DESC',
};

router.get('/categories', (_req, res) => {
  const rows = db
    .prepare(
      `SELECT c.*, (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id) AS product_count
       FROM categories c ORDER BY c.id`,
    )
    .all();
  res.json(rows.map((r: any) => ({ id: r.id, slug: r.slug, name: r.name, icon: r.icon, description: r.description, productCount: r.product_count })));
});

router.get('/products/meta', (_req, res) => {
  const brands = db.prepare('SELECT DISTINCT brand FROM products ORDER BY brand').all().map((r: any) => r.brand as string);
  const range = db.prepare('SELECT MIN(price) AS min, MAX(price) AS max FROM products').get() as { min: number; max: number };
  res.json({ brands, minPrice: Math.floor(range.min ?? 0), maxPrice: Math.ceil(range.max ?? 0) });
});

router.get('/products', (req, res) => {
  const q = req.query as Record<string, string | undefined>;
  const page = Math.max(1, parseInt(q.page ?? '') || 1);
  const limit = Math.min(48, Math.max(1, parseInt(q.limit ?? '') || 12));

  const where: string[] = [];
  const params: (string | number)[] = [];

  if (q.q?.trim()) {
    const like = `%${q.q.trim()}%`;
    where.push('(p.name LIKE ? OR p.brand LIKE ? OR p.description LIKE ? OR c.name LIKE ?)');
    params.push(like, like, like, like);
  }
  if (q.category) {
    where.push('c.slug = ?');
    params.push(q.category);
  }
  if (q.brand) {
    const brands = q.brand.split(',').filter(Boolean);
    if (brands.length) {
      where.push(`p.brand IN (${brands.map(() => '?').join(',')})`);
      params.push(...brands);
    }
  }
  if (q.min && !isNaN(Number(q.min))) {
    where.push('p.price >= ?');
    params.push(Number(q.min));
  }
  if (q.max && !isNaN(Number(q.max))) {
    where.push('p.price <= ?');
    params.push(Number(q.max));
  }
  if (q.inStock === '1') where.push('p.stock > 0');
  if (q.featured === '1') where.push('p.featured = 1');
  if (q.sale === '1') where.push('p.old_price IS NOT NULL AND p.old_price > p.price');

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const orderBy = SORTS[q.sort ?? ''] ?? SORTS.popular;

  const { n: total } = db
    .prepare(`SELECT COUNT(*) AS n FROM products p JOIN categories c ON c.id = p.category_id ${whereSql}`)
    .get(...params) as { n: number };

  const rows = db
    .prepare(`${PRODUCT_SELECT} ${whereSql} ORDER BY ${orderBy} LIMIT ? OFFSET ?`)
    .all(...params, limit, (page - 1) * limit);

  res.json({ items: rows.map(mapProduct), total, page, pages: Math.max(1, Math.ceil(total / limit)) });
});

router.get('/products/:slug', (req, res) => {
  const row = db.prepare(`${PRODUCT_SELECT} WHERE p.slug = ?`).get(req.params.slug);
  if (!row) throw new HttpError(404, 'Продуктът не е намерен.');
  const product = mapProduct(row);

  const reviews = db
    .prepare(
      `SELECT r.id, r.rating, r.comment, r.created_at, u.name AS user_name, r.user_id
       FROM reviews r JOIN users u ON u.id = r.user_id
       WHERE r.product_id = ? ORDER BY r.created_at DESC, r.id DESC`,
    )
    .all(product.id)
    .map((r: any) => ({ id: r.id, rating: r.rating, comment: r.comment, createdAt: r.created_at, userName: r.user_name, userId: r.user_id }));

  const related = db
    .prepare(`${PRODUCT_SELECT} WHERE p.category_id = ? AND p.id != ? ORDER BY sold DESC LIMIT 4`)
    .all(product.category.id, product.id)
    .map(mapProduct);

  res.json({ product, reviews, related });
});

router.post('/products/:id/reviews', requireAuth, (req, res) => {
  const productId = Number(req.params.id);
  const rating = Number(req.body?.rating);
  const comment = String(req.body?.comment ?? '').trim().slice(0, 1000);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new HttpError(400, 'Оценката трябва да е между 1 и 5.');
  const exists = db.prepare('SELECT id FROM products WHERE id = ?').get(productId);
  if (!exists) throw new HttpError(404, 'Продуктът не е намерен.');

  // Всеки потребител може да остави само един отзив за продукт и не може да го променя.
  const r = db
    .prepare(
      `INSERT INTO reviews (product_id, user_id, rating, comment) VALUES (?, ?, ?, ?)
       ON CONFLICT (product_id, user_id) DO NOTHING`,
    )
    .run(productId, res.locals.user.id, rating, comment);
  if (r.changes === 0) throw new HttpError(409, 'Вече си оставил отзив за този продукт.');
  res.status(201).json({ ok: true });
});

/** Последни отзиви от клиенти + обща статистика — за секцията „Мнения“ на сайта. */
router.get('/reviews/latest', (req, res) => {
  const limit = Math.min(12, Math.max(1, parseInt(String(req.query.limit ?? '')) || 6));
  const rows = db
    .prepare(
      `SELECT r.id, r.rating, r.comment, r.created_at, u.name AS user_name,
              p.name AS product_name, p.slug AS product_slug, p.image_url, c.slug AS category_slug
       FROM reviews r
       JOIN users u ON u.id = r.user_id
       JOIN products p ON p.id = r.product_id
       JOIN categories c ON c.id = p.category_id
       WHERE r.rating >= 4 AND length(trim(r.comment)) >= 15
       ORDER BY r.created_at DESC, r.id DESC
       LIMIT 60`,
    )
    .all() as any[];

  // Различни автори и текстове, за да не се повтаря едно и също мнение.
  const seenText = new Set<string>();
  const perUser = new Map<string, number>();
  const items = [];
  for (const r of rows) {
    if (seenText.has(r.comment) || (perUser.get(r.user_name) ?? 0) >= 2) continue;
    seenText.add(r.comment);
    perUser.set(r.user_name, (perUser.get(r.user_name) ?? 0) + 1);
    items.push({
      id: r.id, rating: r.rating, comment: r.comment, createdAt: r.created_at, userName: r.user_name,
      product: { name: r.product_name, slug: r.product_slug, imageUrl: r.image_url, categorySlug: r.category_slug },
    });
    if (items.length >= limit) break;
  }

  const stats = db
    .prepare('SELECT ROUND(AVG(rating), 1) AS avg, COUNT(*) AS total, SUM(rating >= 4) AS positive FROM reviews')
    .get() as { avg: number | null; total: number; positive: number | null };
  const { n: customers } = db.prepare('SELECT COUNT(DISTINCT user_id) AS n FROM reviews').get() as { n: number };

  res.json({
    items,
    stats: {
      average: stats.avg ?? 0,
      total: stats.total,
      positivePercent: stats.total ? Math.round(((stats.positive ?? 0) / stats.total) * 100) : 0,
      customers,
    },
  });
});

router.get('/coupons/:code', (req, res) => {
  const row = db.prepare('SELECT code, percent FROM coupons WHERE code = ? AND active = 1').get(req.params.code.toUpperCase()) as
    | { code: string; percent: number }
    | undefined;
  if (!row) throw new HttpError(404, 'Невалиден промо код.');
  res.json(row);
});

export default router;
