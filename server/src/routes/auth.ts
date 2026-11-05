import { Router, type Request, type Response } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db';
import { AuthUser, HttpError, readUser, requireAuth, signToken } from '../http';
import { COOKIES, SESSION_MAX_AGE, clearCookie, rateLimit, setCookie } from '../security';

const router = Router();
const authLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Твърде много опити. Изчакайте 15 минути и опитайте отново.',
});

/** Сесията е в HttpOnly бисквитка — JavaScript на страницата (и евентуален зловреден код) не може да я прочете. */
function startSession(req: Request, res: Response, user: AuthUser) {
  setCookie(req, res, COOKIES.session, signToken(user), { httpOnly: true, maxAgeMs: SESSION_MAX_AGE });
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.post('/register', authLimit, (req, res) => {
  const name = String(req.body?.name ?? '').trim();
  const email = String(req.body?.email ?? '').trim().toLowerCase();
  const password = String(req.body?.password ?? '');

  if (name.length < 2) throw new HttpError(400, 'Името трябва да е поне 2 символа.');
  if (!EMAIL_RE.test(email)) throw new HttpError(400, 'Невалиден имейл адрес.');
  if (password.length < 6) throw new HttpError(400, 'Паролата трябва да е поне 6 символа.');
  if (db.prepare('SELECT id FROM users WHERE email = ?').get(email)) throw new HttpError(409, 'Вече има профил с този имейл.');

  const r = db
    .prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)')
    .run(name, email, bcrypt.hashSync(password, 10));
  const user: AuthUser = { id: Number(r.lastInsertRowid), name, email, role: 'customer' };
  startSession(req, res, user);
  res.status(201).json({ user });
});

router.post('/login', authLimit, (req, res) => {
  const email = String(req.body?.email ?? '').trim().toLowerCase();
  const password = String(req.body?.password ?? '');
  const row = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
  if (!row || !bcrypt.compareSync(password, row.password_hash)) throw new HttpError(401, 'Грешен имейл или парола.');
  const user: AuthUser = { id: row.id, name: row.name, email: row.email, role: row.role };
  startSession(req, res, user);
  res.json({ user });
});

router.post('/logout', (req, res) => {
  clearCookie(req, res, COOKIES.session);
  res.json({ ok: true });
});

/** Кой е влязъл в момента (или null) — без грешка за гостите. */
router.get('/session', (req, res) => {
  const u = readUser(req);
  const row = u ? db.prepare('SELECT id, name, email, role FROM users WHERE id = ?').get(u.id) : null;
  if (u && !row) clearCookie(req, res, COOKIES.session);
  res.json({ user: row ?? null });
});

router.get('/me', requireAuth, (_req, res) => {
  const row = db.prepare('SELECT id, name, email, role FROM users WHERE id = ?').get(res.locals.user.id);
  if (!row) throw new HttpError(401, 'Профилът не съществува.');
  res.json(row);
});

export default router;
