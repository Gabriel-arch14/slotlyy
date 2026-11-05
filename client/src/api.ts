export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function readCookie(name: string): string | null {
  const match = document.cookie.split('; ').find((c) => c.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

// Старата версия пазеше входа в localStorage — вече е в защитена бисквитка.
try {
  localStorage.removeItem('slotlyy_token');
} catch {
  /* няма достъп до localStorage */
}

const CSRF_COOKIE = 'slotlyy_csrf';

/** Сървърът слага CSRF бисквитката при първата заявка към API-то. */
async function csrfToken() {
  let token = readCookie(CSRF_COOKIE);
  if (!token) {
    await fetch('/api/health', { credentials: 'same-origin' }).catch(() => null);
    token = readCookie(CSRF_COOKIE);
  }
  return token;
}

/** Качва файл (напр. Excel) като суров поток. При грешка връща и списъка с подробности от сървъра. */
export async function uploadFile<T>(path: string, file: File): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method: 'POST',
      headers: { 'Content-Type': file.type || 'application/octet-stream', 'X-CSRF-Token': (await csrfToken()) ?? '' },
      credentials: 'same-origin',
      body: file,
    });
  } catch {
    throw new ApiError(0, 'Няма връзка със сървъра. Стартиран ли е?');
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) throw Object.assign(new ApiError(res.status, data?.error ?? `Грешка ${res.status}`), { details: (data?.errors ?? []) as string[] });
  return data as T;
}

export async function api<T>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  const method = options.method ?? 'GET';
  const headers: Record<string, string> = {};
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  if (method !== 'GET') headers['X-CSRF-Token'] = (await csrfToken()) ?? '';

  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers,
      credentials: 'same-origin',
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'Няма връзка със сървъра. Стартиран ли е?');
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, data?.error ?? `Грешка ${res.status}`);
  return data as T;
}
