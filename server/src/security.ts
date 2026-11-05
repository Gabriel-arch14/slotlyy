import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { HttpError } from './http';

/** Имената на бисквитките на сайта — само необходими, без реклами и проследяване. */
export const COOKIES = {
  session: 'slotlyy_session', // вход в профил
  cart: 'slotlyy_cart', // количка
  favorites: 'slotlyy_favorites', // любими продукти
  csrf: 'slotlyy_csrf', // защита от фалшиви заявки
} as const;

const DAY = 24 * 60 * 60 * 1000;

export function readCookies(req: Request): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of (req.headers.cookie ?? '').split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    const key = part.slice(0, i).trim();
    try {
      out[key] = decodeURIComponent(part.slice(i + 1).trim());
    } catch {
      /* повредена бисквитка — пропускаме */
    }
  }
  return out;
}

type CookieOpts = { maxAgeMs?: number; httpOnly?: boolean; sameSite?: 'Strict' | 'Lax' };

export function setCookie(req: Request, res: Response, name: string, value: string, opts: CookieOpts = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`, 'Path=/', `SameSite=${opts.sameSite ?? 'Lax'}`];
  if (opts.maxAgeMs !== undefined) parts.push(`Max-Age=${Math.floor(opts.maxAgeMs / 1000)}`);
  if (opts.httpOnly) parts.push('HttpOnly');
  if (req.secure) parts.push('Secure');
  res.append('Set-Cookie', parts.join('; '));
}

export function clearCookie(req: Request, res: Response, name: string) {
  setCookie(req, res, name, '', { maxAgeMs: 0, httpOnly: true });
}

export const SESSION_MAX_AGE = 7 * DAY;
export const CART_MAX_AGE = 30 * DAY;

/** Основни защитни заглавки срещу вграждане в чужди сайтове и подмяна на типа на файловете. */
export function securityHeaders(_req: Request, res: Response, next: NextFunction) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'same-origin');
  next();
}

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * CSRF защита (double-submit): сървърът дава случаен токен в бисквитка,
 * а сайтът го връща в заглавка X-CSRF-Token. Чужд сайт не може да прочете
 * бисквитката, затова не може да изпрати валидна заявка от името на клиента.
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction) {
  let token = readCookies(req)[COOKIES.csrf];
  if (!token || !/^[a-f0-9]{64}$/.test(token)) {
    token = crypto.randomBytes(32).toString('hex');
    setCookie(req, res, COOKIES.csrf, token, { sameSite: 'Strict' });
  }
  if (SAFE_METHODS.has(req.method)) return next();

  const sent = String(req.headers['x-csrf-token'] ?? '');
  const ok = sent.length === token.length && crypto.timingSafeEqual(Buffer.from(sent), Buffer.from(token));
  if (!ok) return next(new HttpError(403, 'Сесията изтече от съображения за сигурност. Опреснете страницата и опитайте пак.'));
  next();
}

/** Ограничава броя опити от един адрес — срещу налучкване на пароли и спам поръчки. */
export function rateLimit(opts: { windowMs: number; max: number; message: string }) {
  const hits = new Map<string, { count: number; reset: number }>();
  return (req: Request, _res: Response, next: NextFunction) => {
    const now = Date.now();
    const key = req.ip ?? 'unknown';
    let entry = hits.get(key);
    if (!entry || entry.reset < now) {
      entry = { count: 0, reset: now + opts.windowMs };
      hits.set(key, entry);
    }
    entry.count++;
    if (hits.size > 10_000) for (const [k, v] of hits) if (v.reset < now) hits.delete(k);
    if (entry.count > opts.max) return next(new HttpError(429, opts.message));
    next();
  };
}
