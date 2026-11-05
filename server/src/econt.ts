/**
 * Офисите на Еконт в Габрово.
 * Списъкът се обновява от публичното API на Еконт веднъж на ден.
 * Ако Еконт не отговаря, ползваме вградения списък по-долу.
 */

export type EcontOffice = { code: string; name: string; address: string };

const CITY = 'Габрово';
const ECONT_URL = 'https://ee.econt.com/services/Nomenclatures/NomenclaturesService.getOffices.json';
const DAY = 24 * 60 * 60 * 1000;

// Актуални към 05.11.2026.
const FALLBACK: EcontOffice[] = [
  { code: '5306', name: 'Габрово', address: 'ул. Доктор Заменхоф №3, под Автогарата' },
  { code: '5304', name: 'Габрово ЕСА', address: 'ул. Нарцис №1, до стадион „В. Априлов“' },
  { code: '5307', name: 'Габрово Колелото', address: 'пл. Белорусия №3' },
  { code: '5301', name: 'Габрово Мадара', address: 'ул. Орловска №27' },
  { code: '5303', name: 'Габрово Театъра', address: 'ул. Св. Св. Кирил и Методий №10, до Куклен театър' },
  { code: '5305', name: 'Габрово Шиваров мост', address: 'ул. Йосиф Соколски №4' },
];

let cache: { offices: EcontOffice[]; at: number } = { offices: FALLBACK, at: 0 };

async function fetchFromEcont(): Promise<EcontOffice[]> {
  const res = await fetch(ECONT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ countryCode: 'BGR' }),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`Еконт ${res.status}`);
  const data = (await res.json()) as { offices?: any[] };
  const offices = (data.offices ?? [])
    .filter((o) => o.address?.city?.name === CITY && !o.isAPS) // без автоматичните машини
    .map((o) => ({
      code: String(o.code),
      name: String(o.name),
      address: String(o.address?.fullAddress ?? '').replace(new RegExp(`^\\s*${CITY}\\s*`), '').trim(),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'bg'));
  if (!offices.length) throw new Error('Еконт върна празен списък');
  return offices;
}

export async function getGabrovoOffices(): Promise<EcontOffice[]> {
  if (Date.now() - cache.at > DAY) {
    try {
      cache = { offices: await fetchFromEcont(), at: Date.now() };
    } catch (err) {
      console.warn('[еконт] Ползваме вградения списък:', (err as Error).message);
      cache = { offices: cache.offices, at: Date.now() - DAY + 60 * 60 * 1000 }; // нов опит след час
    }
  }
  return cache.offices;
}
