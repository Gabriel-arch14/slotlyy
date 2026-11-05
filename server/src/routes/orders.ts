import { Router, type RequestHandler } from 'express';
import { db, round2, transaction } from '../db';
import { HttpError, optionalAuth, requireAuth } from '../http';
import { sendOrderEmails } from '../mailer';
import { getGabrovoOffices, type EcontOffice } from '../econt';

const router = Router();

export const FREE_SHIPPING_FROM = 100;
export const SHIPPING_PRICE = 5.99;
const PAYMENT_METHODS = ['cod', 'card', 'bank'];

export function loadOrders(whereSql: string, params: (string | number)[]) {
  const orders = db.prepare(`SELECT * FROM orders ${whereSql} ORDER BY created_at DESC, id DESC`).all(...params) as any[];
  const itemsStmt = db.prepare(
    `SELECT oi.*, p.slug FROM order_items oi LEFT JOIN products p ON p.id = oi.product_id WHERE oi.order_id = ?`,
  );
  return orders.map((o) => ({
    id: o.id,
    userId: o.user_id,
    customerName: o.customer_name,
    email: o.email,
    phone: o.phone,
    city: o.city,
    address: o.address,
    note: o.note,
    paymentMethod: o.payment_method,
    status: o.status,
    subtotal: o.subtotal,
    discount: o.discount,
    shipping: o.shipping,
    total: o.total,
    couponCode: o.coupon_code,
    createdAt: o.created_at,
    items: (itemsStmt.all(o.id) as any[]).map((i) => ({
      productId: i.product_id, slug: i.slug, name: i.name, price: i.price, qty: i.qty,
    })),
  }));
}

router.get('/econt-offices', (_req, res, next) => {
  getGabrovoOffices().then((offices) => res.json(offices), next);
});

// Зарежда офисите преди обработката на поръчката (Express 4 не хваща грешки от async функции).
const loadOffices: RequestHandler = (_req, res, next) => {
  getGabrovoOffices().then((offices) => {
    res.locals.econtOffices = offices;
    next();
  }, next);
};

router.post('/', optionalAuth, loadOffices, (req, res) => {
  const body = req.body ?? {};
  const items = Array.isArray(body.items) ? body.items : [];
  const c = body.customer ?? {};

  // Доставката е само до офис на Еконт в Габрово — адресът се взима от списъка, не от клиента.
  const offices = res.locals.econtOffices as EcontOffice[];
  const office = offices.find((o) => o.code === String(c.econtOffice ?? ''));
  if (!office) throw new HttpError(400, 'Изберете офис на Еконт.');

  const customer = {
    name: String(c.name ?? '').trim(),
    email: String(c.email ?? '').trim(),
    phone: String(c.phone ?? '').trim(),
    city: 'Габрово',
    address: `Офис на Еконт „${office.name}“ — ${office.address}`,
    note: String(c.note ?? '').trim().slice(0, 500),
  };
  const paymentMethod = String(body.paymentMethod ?? 'cod');

  if (!items.length) throw new HttpError(400, 'Количката е празна.');
  if (customer.name.length < 2) throw new HttpError(400, 'Въведете име.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) throw new HttpError(400, 'Невалиден имейл.');
  if (!/^[+\d][\d\s-]{6,}$/.test(customer.phone)) throw new HttpError(400, 'Невалиден телефон.');
  if (!PAYMENT_METHODS.includes(paymentMethod)) throw new HttpError(400, 'Невалиден метод на плащане.');

  let percent = 0;
  let couponCode: string | null = null;
  if (body.couponCode) {
    const coupon = db.prepare('SELECT * FROM coupons WHERE code = ? AND active = 1').get(String(body.couponCode).toUpperCase()) as any;
    if (!coupon) throw new HttpError(400, 'Промо кодът е невалиден.');
    percent = coupon.percent;
    couponCode = coupon.code;
  }

  const orderId = transaction(() => {
    const getProduct = db.prepare('SELECT id, name, price, stock FROM products WHERE id = ?');
    const lines: { id: number; name: string; price: number; qty: number }[] = [];

    for (const it of items) {
      const qty = Number(it.qty);
      if (!Number.isInteger(qty) || qty < 1 || qty > 99) throw new HttpError(400, 'Невалидно количество.');
      const p = getProduct.get(Number(it.productId)) as any;
      if (!p) throw new HttpError(400, 'Един от продуктите вече не съществува.');
      if (p.stock < qty) throw new HttpError(409, `Недостатъчна наличност за „${p.name}“ (налични: ${p.stock}).`);
      lines.push({ id: p.id, name: p.name, price: p.price, qty });
    }

    const subtotal = round2(lines.reduce((s, l) => s + l.price * l.qty, 0));
    const discount = round2((subtotal * percent) / 100);
    const shipping = subtotal - discount >= FREE_SHIPPING_FROM ? 0 : SHIPPING_PRICE;
    const total = round2(subtotal - discount + shipping);

    const r = db
      .prepare(
        `INSERT INTO orders (user_id, customer_name, email, phone, city, address, note, payment_method, subtotal, discount, shipping, total, coupon_code)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        res.locals.user?.id ?? null, customer.name, customer.email, customer.phone, customer.city, customer.address,
        customer.note, paymentMethod, subtotal, discount, shipping, total, couponCode,
      );
    const id = Number(r.lastInsertRowid);

    const insItem = db.prepare('INSERT INTO order_items (order_id, product_id, name, price, qty) VALUES (?, ?, ?, ?, ?)');
    const decStock = db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?');
    for (const l of lines) {
      insItem.run(id, l.id, l.name, l.price, l.qty);
      decStock.run(l.qty, l.id);
    }
    return id;
  });

  const [order] = loadOrders('WHERE id = ?', [orderId]);
  res.status(201).json(order);

  // Имейлите тръгват след отговора, за да не бавят клиента.
  // Линковете в имейлите водят към адреса на сайта — само ако е наш (localhost или Cloudflare Tunnel).
  const host = req.get('host') ?? '';
  const trusted = /^(localhost|127.0.0.1)(:d+)?$|^[a-z0-9-]+.trycloudflare.com$/i.test(host);
  void sendOrderEmails(order, trusted ? `${req.protocol}://${host}` : undefined);
});

router.get('/my', requireAuth, (_req, res) => {
  res.json(loadOrders('WHERE user_id = ?', [res.locals.user.id]));
});

export default router;
