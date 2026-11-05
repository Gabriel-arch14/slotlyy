import express, { Router, type Response } from 'express';
import { db, round2, transaction } from '../db';
import { HttpError, requireAdmin, slugify } from '../http';
import { mapProduct, PRODUCT_SELECT } from '../productQuery';
import { loadOrders } from './orders';
import { buildWorkbook, parseWorkbook, type ExcelProduct } from '../productExcel';

const router = Router();
router.use(requireAdmin);

const STATUSES = ['new', 'processing', 'shipped', 'delivered', 'cancelled'];

router.get('/stats', (_req, res) => {
  const sales = db
    .prepare(`SELECT COALESCE(SUM(total), 0) AS revenue, COUNT(*) AS orders FROM orders WHERE status != 'cancelled'`)
    .get() as { revenue: number; orders: number };
  const count = (sql: string) => (db.prepare(sql).get() as { n: number }).n;

  const lowStock = db
    .prepare(`${PRODUCT_SELECT} WHERE p.stock <= 5 ORDER BY p.stock ASC LIMIT 10`)
    .all()
    .map(mapProduct);
  const topProducts = db
    .prepare(`${PRODUCT_SELECT} ORDER BY sold DESC LIMIT 5`)
    .all()
    .map(mapProduct)
    .filter((p) => p.sold > 0);

  res.json({
    revenue: round2(sales.revenue),
    orders: sales.orders,
    newOrders: count(`SELECT COUNT(*) AS n FROM orders WHERE status = 'new'`),
    products: count('SELECT COUNT(*) AS n FROM products'),
    customers: count(`SELECT COUNT(*) AS n FROM users WHERE role = 'customer'`),
    lowStock,
    topProducts,
    recentOrders: loadOrders('', []).slice(0, 5),
  });
});

// ---------- Продукти ----------
function readProductBody(body: any) {
  const name = String(body?.name ?? '').trim();
  const brand = String(body?.brand ?? '').trim();
  const description = String(body?.description ?? '').trim();
  const price = Number(body?.price);
  const oldPrice = body?.oldPrice === null || body?.oldPrice === '' || body?.oldPrice === undefined ? null : Number(body.oldPrice);
  const stock = Number(body?.stock);
  const categoryId = Number(body?.categoryId);
  const imageUrl = String(body?.imageUrl ?? '').trim() || null;
  const featured = body?.featured ? 1 : 0;
  const specs = body?.specs && typeof body.specs === 'object' ? body.specs : {};

  if (name.length < 2) throw new HttpError(400, 'Въведете име на продукта.');
  if (!brand) throw new HttpError(400, 'Въведете марка.');
  if (!(price > 0)) throw new HttpError(400, 'Цената трябва да е положително число.');
  if (oldPrice !== null && !(oldPrice > 0)) throw new HttpError(400, 'Старата цена е невалидна.');
  if (!Number.isInteger(stock) || stock < 0) throw new HttpError(400, 'Наличността трябва да е цяло число ≥ 0.');
  if (!db.prepare('SELECT id FROM categories WHERE id = ?').get(categoryId)) throw new HttpError(400, 'Невалидна категория.');

  return { name, brand, description, price: round2(price), oldPrice: oldPrice === null ? null : round2(oldPrice), stock, categoryId, imageUrl, featured, specs: JSON.stringify(specs) };
}

function uniqueSlug(name: string, excludeId?: number) {
  const base = slugify(name) || 'product';
  let slug = base;
  let i = 2;
  while (db.prepare('SELECT id FROM products WHERE slug = ? AND id != ?').get(slug, excludeId ?? -1)) slug = `${base}-${i++}`;
  return slug;
}

router.get('/products', (_req, res) => {
  res.json(db.prepare(`${PRODUCT_SELECT} ORDER BY p.id DESC`).all().map(mapProduct));
});

router.post('/products', (req, res) => {
  const p = readProductBody(req.body);
  const r = db
    .prepare(
      `INSERT INTO products (slug, name, brand, category_id, description, price, old_price, stock, image_url, specs, featured)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(uniqueSlug(p.name), p.name, p.brand, p.categoryId, p.description, p.price, p.oldPrice, p.stock, p.imageUrl, p.specs, p.featured);
  res.status(201).json(mapProduct(db.prepare(`${PRODUCT_SELECT} WHERE p.id = ?`).get(Number(r.lastInsertRowid))));
});

router.put('/products/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!db.prepare('SELECT id FROM products WHERE id = ?').get(id)) throw new HttpError(404, 'Продуктът не е намерен.');
  const p = readProductBody(req.body);
  db.prepare(
    `UPDATE products SET slug = ?, name = ?, brand = ?, category_id = ?, description = ?, price = ?, old_price = ?,
       stock = ?, image_url = ?, specs = ?, featured = ? WHERE id = ?`,
  ).run(uniqueSlug(p.name, id), p.name, p.brand, p.categoryId, p.description, p.price, p.oldPrice, p.stock, p.imageUrl, p.specs, p.featured, id);
  res.json(mapProduct(db.prepare(`${PRODUCT_SELECT} WHERE p.id = ?`).get(id)));
});

// ---------- Масов импорт / експорт в Excel ----------
const XLSX_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

function categoryNames() {
  return (db.prepare('SELECT name FROM categories ORDER BY id').all() as { name: string }[]).map((c) => c.name);
}

function sendXlsx(res: Response, buffer: Buffer, filename: string) {
  res.setHeader('Content-Type', XLSX_TYPE);
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"; filename*=UTF-8''${encodeURIComponent(filename)}`);
  res.send(buffer);
}

router.get('/products/template', (_req, res, next) => {
  buildWorkbook(categoryNames(), null)
    .then((buf) => sendXlsx(res, buf, 'slotlyy-shablon-produkti.xlsx'))
    .catch(next);
});

router.get('/products/export', (_req, res, next) => {
  const products: ExcelProduct[] = db
    .prepare(`${PRODUCT_SELECT} ORDER BY p.id`)
    .all()
    .map(mapProduct)
    .map((p: any) => ({
      id: p.id, name: p.name, brand: p.brand, category: p.category.name, price: p.price, oldPrice: p.oldPrice,
      stock: p.stock, description: p.description, imageUrl: p.imageUrl, featured: !!p.featured, specs: p.specs ?? {},
    }));
  const date = new Date().toISOString().slice(0, 10);
  buildWorkbook(categoryNames(), products)
    .then((buf) => sendXlsx(res, buf, `slotlyy-produkti-${date}.xlsx`))
    .catch(next);
});

/**
 * Качва попълнения шаблон. Първо се проверяват ВСИЧКИ редове —
 * ако има поне една грешка, нищо не се записва и се връща списък с грешките.
 */
router.post('/products/import', express.raw({ type: () => true, limit: '10mb' }), (req, res, next) => {
  if (!Buffer.isBuffer(req.body) || !req.body.length) return next(new HttpError(400, 'Не е избран файл.'));

  parseWorkbook(req.body)
    .then((rows) => {
      if (!rows.length) throw new HttpError(400, 'Във файла няма продукти.');

      const categories = db.prepare('SELECT id, name FROM categories').all() as { id: number; name: string }[];
      const byName = new Map(categories.map((c) => [c.name.toLowerCase(), c.id]));
      const exists = db.prepare('SELECT id FROM products WHERE id = ?');
      const errors: string[] = [];
      const valid: { id?: number; product: ReturnType<typeof readProductBody> }[] = [];

      for (const r of rows) {
        if ('error' in r) {
          errors.push(`Ред ${r.row}: ${r.error}`);
          continue;
        }
        const d = r.data;
        const categoryId = byName.get(d.category.toLowerCase());
        if (!categoryId) {
          errors.push(`Ред ${r.row}: категорията „${d.category || '(празна)'}“ не съществува.`);
          continue;
        }
        if (d.id && !exists.get(d.id)) {
          errors.push(`Ред ${r.row}: няма продукт с ID ${d.id}. Остави ID празно за нов продукт.`);
          continue;
        }
        try {
          valid.push({ id: d.id, product: readProductBody({ ...d, categoryId }) });
        } catch (err) {
          errors.push(`Ред ${r.row}: ${(err as Error).message}`);
        }
      }

      if (errors.length) {
        return res.status(400).json({ error: `Импортът е спрян — ${errors.length} ${errors.length === 1 ? 'грешка' : 'грешки'}. Нищо не е записано.`, errors });
      }

      let created = 0;
      let updated = 0;
      transaction(() => {
        const insert = db.prepare(
          `INSERT INTO products (slug, name, brand, category_id, description, price, old_price, stock, image_url, specs, featured)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        );
        const update = db.prepare(
          `UPDATE products SET slug = ?, name = ?, brand = ?, category_id = ?, description = ?, price = ?, old_price = ?,
             stock = ?, image_url = ?, specs = ?, featured = ? WHERE id = ?`,
        );
        for (const { id, product: p } of valid) {
          if (id) {
            update.run(uniqueSlug(p.name, id), p.name, p.brand, p.categoryId, p.description, p.price, p.oldPrice, p.stock, p.imageUrl, p.specs, p.featured, id);
            updated++;
          } else {
            insert.run(uniqueSlug(p.name), p.name, p.brand, p.categoryId, p.description, p.price, p.oldPrice, p.stock, p.imageUrl, p.specs, p.featured);
            created++;
          }
        }
      });
      res.json({ created, updated });
    })
    .catch((err) => next(err instanceof HttpError ? err : new HttpError(400, (err as Error).message)));
});

router.delete('/products/:id', (req, res) => {
  const r = db.prepare('DELETE FROM products WHERE id = ?').run(Number(req.params.id));
  if (!r.changes) throw new HttpError(404, 'Продуктът не е намерен.');
  res.json({ ok: true });
});

// ---------- Поръчки ----------
router.get('/orders', (req, res) => {
  const status = String(req.query.status ?? '');
  res.json(STATUSES.includes(status) ? loadOrders('WHERE status = ?', [status]) : loadOrders('', []));
});

router.patch('/orders/:id', (req, res) => {
  const id = Number(req.params.id);
  const status = String(req.body?.status ?? '');
  if (!STATUSES.includes(status)) throw new HttpError(400, 'Невалиден статус.');
  const order = db.prepare('SELECT status FROM orders WHERE id = ?').get(id) as { status: string } | undefined;
  if (!order) throw new HttpError(404, 'Поръчката не е намерена.');

  transaction(() => {
    const items = db.prepare('SELECT product_id, qty FROM order_items WHERE order_id = ?').all(id) as any[];
    const adjust = db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?');
    // Отказана поръчка връща бройките в наличност; повторно активиране ги взема пак.
    if (status === 'cancelled' && order.status !== 'cancelled') {
      for (const i of items) if (i.product_id) adjust.run(i.qty, i.product_id);
    } else if (status !== 'cancelled' && order.status === 'cancelled') {
      for (const i of items) if (i.product_id) adjust.run(-i.qty, i.product_id);
    }
    db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, id);
  });

  res.json(loadOrders('WHERE id = ?', [id])[0]);
});

export default router;
