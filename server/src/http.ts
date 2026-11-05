import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { COOKIES, readCookies } from './security';

import crypto from 'node:crypto';

// Тайният ключ за подписване на входовете идва от server/.env.
// Ако липсва, се генерира случаен при всяко пускане (тогава всички излизат от профила си при рестарт).
export const JWT_SECRET =
  process.env.JWT_SECRET ||
  (console.warn('[сигурност] Няма JWT_SECRET в server/.env — ползвам временен случаен ключ.'), crypto.randomBytes(48).toString('hex'));

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export type AuthUser = { id: number; name: string; email: string; role: 'customer' | 'admin' };

export function signToken(user: AuthUser) {
  return jwt.sign(user, JWT_SECRET, { expiresIn: '7d' });
}

export function readUser(req: Request): AuthUser | null {
  const token = readCookies(req)[COOKIES.session];
  if (!token) return null;
  try {
    const p = jwt.verify(token, JWT_SECRET) as AuthUser;
    return { id: p.id, name: p.name, email: p.email, role: p.role };
  } catch {
    return null;
  }
}

/** Слага res.locals.user, ако има валиден токен. Не изисква вход. */
export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  res.locals.user = readUser(req);
  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const user = readUser(req);
  if (!user) return next(new HttpError(401, 'Моля, влезте в профила си.'));
  res.locals.user = user;
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const user = readUser(req);
  if (!user) return next(new HttpError(401, 'Моля, влезте в профила си.'));
  if (user.role !== 'admin') return next(new HttpError(403, 'Нямате администраторски достъп.'));
  res.locals.user = user;
  next();
}

export function slugify(text: string) {
  const map: Record<string, string> = {
    а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm',
    н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh',
    щ: 'sht', ъ: 'a', ь: 'y', ю: 'yu', я: 'ya',
  };
  return text
    .toLowerCase()
    .split('')
    .map((ch) => map[ch] ?? ch)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
