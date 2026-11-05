import './env';
import express, { type NextFunction, type Request, type Response } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import './db';
import { attachLocalImages, seedIfEmpty, syncAdminPassword, upgradeSampleReviews } from './seed';
import { HttpError } from './http';
import productsRouter from './routes/products';
import authRouter from './routes/auth';
import ordersRouter from './routes/orders';
import adminRouter from './routes/admin';
import cartRouter from './routes/cart';
import favoritesRouter from './routes/favorites';
import { csrfProtection, rateLimit, securityHeaders } from './security';

seedIfEmpty();
syncAdminPassword();
attachLocalImages();
upgradeSampleReviews();

const app = express();
const orderLimit = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  message: 'Твърде много поръчки за кратко време. Опитайте отново след малко.',
});
const PORT = Number(process.env.PORT) || 4000;

app.disable('x-powered-by');
// Сайтът може да стои зад Cloudflare Tunnel, който идва от същия компютър.
// Така Express вижда истинския адрес на посетителя и че връзката е HTTPS.
app.set('trust proxy', 'loopback');
app.use(securityHeaders);
app.use(express.json({ limit: '1mb' }));
app.use('/api', csrfProtection);

app.get('/api/health', (_req, res) => res.json({ ok: true, time: new Date().toISOString() }));
app.use('/api', productsRouter);
app.use('/api/auth', authRouter);
app.use(
  '/api/orders',
  (req, res, next) => (req.method === 'POST' ? orderLimit(req, res, next) : next()),
  ordersRouter,
);
app.use('/api/cart', cartRouter);
app.use('/api/favorites', favoritesRouter);
app.use('/api/admin', adminRouter);
app.use('/api', (_req, _res, next) => next(new HttpError(404, 'Няма такъв адрес в API-то.')));

// След `npm run build` сървърът обслужва и самия сайт — един процес, един порт.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.resolve(__dirname, '..', '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
  if (err instanceof SyntaxError) return res.status(400).json({ error: 'Невалиден JSON.' });
  console.error(err);
  res.status(500).json({ error: 'Вътрешна грешка на сървъра.' });
});

app.listen(PORT, () => {
  console.log(`🎮 Slotlyy API работи на http://localhost:${PORT}`);
});
