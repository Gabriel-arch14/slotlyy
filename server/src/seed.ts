import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db, transaction } from './db';
import { slugify } from './http';

const categories = [
  { slug: 'mishki', name: 'Мишки', icon: '🖱️', description: 'Леки, прецизни и бързи геймърски мишки.' },
  { slug: 'klaviaturi', name: 'Клавиатури', icon: '⌨️', description: 'Механични и магнитни клавиатури за всеки стил.' },
  { slug: 'slushalki', name: 'Слушалки', icon: '🎧', description: 'Обемен звук и кристално чист микрофон.' },
  { slug: 'monitori', name: 'Монитори', icon: '🖥️', description: 'Високи честоти и минимално забавяне.' },
  { slug: 'stolove', name: 'Столове', icon: '💺', description: 'Ергономия за дългите сесии.' },
  { slug: 'podlozhki', name: 'Подложки', icon: '🟪', description: 'Контрол и скорост за мишката.' },
  { slug: 'kontroleri', name: 'Контролери', icon: '🎮', description: 'Геймпадове за PC и конзоли.' },
  { slug: 'mikrofoni', name: 'Микрофони', icon: '🎙️', description: 'За стрийминг, подкасти и чат.' },
];

type SeedProduct = {
  name: string; brand: string; cat: string; price: number; old?: number; stock: number;
  featured?: boolean; description: string; specs: Record<string, string>;
};

const products: SeedProduct[] = [
  {
    name: 'NovaStrike Viper X Wireless', brand: 'NovaStrike', cat: 'mishki', price: 89.99, old: 109.99, stock: 25, featured: true,
    description: 'Ултралека безжична мишка с 26K сензор и до 90 часа батерия. Създадена за състезателни FPS игри.',
    specs: { 'Сензор': 'Оптичен, 26 000 DPI', 'Тегло': '58 г', 'Връзка': '2.4 GHz / Bluetooth / USB-C', 'Батерия': 'до 90 ч', 'Бутони': '6 програмируеми' },
  },
  {
    name: 'ZeroLag Pulse 8K', brand: 'ZeroLag', cat: 'mishki', price: 64.99, stock: 40,
    description: 'Кабелна мишка с 8000 Hz polling rate за най-бързата реакция на пазара.',
    specs: { 'Сензор': 'Оптичен, 30 000 DPI', 'Тегло': '63 г', 'Polling rate': '8000 Hz', 'Кабел': 'Паракорд, 1.8 м' },
  },
  {
    name: 'HyperForge Titan MMO', brand: 'HyperForge', cat: 'mishki', price: 74.99, stock: 12,
    description: 'MMO мишка с 12 странични бутона и RGB подсветка за макроси и умения.',
    specs: { 'Сензор': 'Оптичен, 20 000 DPI', 'Тегло': '110 г', 'Бутони': '18 програмируеми', 'Подсветка': 'RGB, 3 зони' },
  },
  {
    name: 'HyperForge K87 Mechanical TKL', brand: 'HyperForge', cat: 'klaviaturi', price: 119.99, old: 139.99, stock: 18, featured: true,
    description: 'Компактна TKL механична клавиатура с hot-swap суичове и алуминиева рамка.',
    specs: { 'Формат': 'TKL (87 клавиша)', 'Суичове': 'Linear Red, hot-swap', 'Подсветка': 'RGB per-key', 'Рамка': 'Алуминий' },
  },
  {
    name: 'NovaStrike Blade 60%', brand: 'NovaStrike', cat: 'klaviaturi', price: 79.99, stock: 30,
    description: 'Миниатюрна 60% клавиатура — повече място за мишката, без компромис в качеството.',
    specs: { 'Формат': '60% (61 клавиша)', 'Суичове': 'Tactile Brown', 'Връзка': 'USB-C, откачащ се кабел', 'Капачета': 'PBT double-shot' },
  },
  {
    name: 'ZeroLag Rapid HE Magnetic', brand: 'ZeroLag', cat: 'klaviaturi', price: 159.99, stock: 4,
    description: 'Магнитни Hall-effect суичове с регулируема точка на задействане и Rapid Trigger.',
    specs: { 'Суичове': 'Магнитни Hall-effect', 'Задействане': '0.1 – 4.0 мм', 'Rapid Trigger': 'Да', 'Формат': '75%' },
  },
  {
    name: 'AuraSound Pro 7.1 Wireless', brand: 'AuraSound', cat: 'slushalki', price: 149.99, old: 179.99, stock: 22, featured: true,
    description: 'Безжични слушалки с 7.1 виртуален съраунд, шумопотискащ микрофон и 40 ч батерия.',
    specs: { 'Говорители': '50 мм', 'Звук': '7.1 виртуален съраунд', 'Батерия': 'до 40 ч', 'Микрофон': 'Откачащ се, с шумопотискане' },
  },
  {
    name: 'AuraSound Lite', brand: 'AuraSound', cat: 'slushalki', price: 49.99, stock: 55,
    description: 'Леки и удобни слушалки с 3.5 мм жак — работят с PC, PlayStation, Xbox и Switch.',
    specs: { 'Говорители': '40 мм', 'Връзка': '3.5 мм жак', 'Тегло': '240 г', 'Съвместимост': 'PC / PS / Xbox / Switch' },
  },
  {
    name: 'NovaStrike Echo Studio', brand: 'NovaStrike', cat: 'slushalki', price: 199.99, stock: 0,
    description: 'Отворени студийни слушалки за максимално точен звук и широка звукова сцена.',
    specs: { 'Тип': 'Отворени', 'Говорители': '50 мм планарни', 'Импеданс': '32 Ω', 'Кабел': 'Откачащ се, 2 м' },
  },
  {
    name: 'PixelPeak 27" QHD 240Hz', brand: 'PixelPeak', cat: 'monitori', price: 399.99, old: 449.99, stock: 9, featured: true,
    description: '27-инчов IPS монитор с QHD резолюция, 240 Hz и 1 ms време за реакция.',
    specs: { 'Размер': '27"', 'Резолюция': '2560 × 1440', 'Честота': '240 Hz', 'Панел': 'Fast IPS', 'Реакция': '1 ms (GtG)' },
  },
  {
    name: 'PixelPeak 24.5" FHD 360Hz', brand: 'PixelPeak', cat: 'monitori', price: 329.99, stock: 14,
    description: 'Състезателен монитор с 360 Hz — изборът на професионалните играчи.',
    specs: { 'Размер': '24.5"', 'Резолюция': '1920 × 1080', 'Честота': '360 Hz', 'Панел': 'Fast IPS' },
  },
  {
    name: 'PixelPeak 34" Ultrawide OLED', brand: 'PixelPeak', cat: 'monitori', price: 899.99, stock: 3,
    description: 'Извит OLED монитор 21:9 с безкраен контраст и 175 Hz.',
    specs: { 'Размер': '34" извит', 'Резолюция': '3440 × 1440', 'Честота': '175 Hz', 'Панел': 'QD-OLED', 'HDR': 'True Black 400' },
  },
  {
    name: 'TitanSeat Apex Pro', brand: 'TitanSeat', cat: 'stolove', price: 349.99, stock: 7, featured: true,
    description: 'Премиум геймърски стол с магнитна възглавница за глава и 4D подлакътници.',
    specs: { 'Материал': 'Еко кожа', 'Подлакътници': '4D', 'Наклон': '90° – 165°', 'Макс. тегло': '150 кг' },
  },
  {
    name: 'TitanSeat Core', brand: 'TitanSeat', cat: 'stolove', price: 199.99, old: 229.99, stock: 16,
    description: 'Дишаща мрежеста облегалка и регулируема лумбална опора на достъпна цена.',
    specs: { 'Материал': 'Дишаща тъкан', 'Подлакътници': '2D', 'Наклон': '90° – 135°', 'Макс. тегло': '120 кг' },
  },
  {
    name: 'ZeroLag Glide XL', brand: 'ZeroLag', cat: 'podlozhki', price: 29.99, stock: 80,
    description: 'Голяма текстилна подложка с прошити ръбове и противоплъзгаща основа.',
    specs: { 'Размер': '900 × 400 мм', 'Дебелина': '4 мм', 'Повърхност': 'Control' },
  },
  {
    name: 'NovaStrike RGB Arena XXL', brand: 'NovaStrike', cat: 'podlozhki', price: 44.99, stock: 33,
    description: 'Подложка с RGB рамка, синхронизирана с останалата ти периферия.',
    specs: { 'Размер': '930 × 400 мм', 'Подсветка': 'RGB, 14 режима', 'Повърхност': 'Speed' },
  },
  {
    name: 'HyperForge Pro Controller', brand: 'HyperForge', cat: 'kontroleri', price: 69.99, stock: 28, featured: true,
    description: 'Безжичен контролер с Hall-effect стикове (без drift) за PC и Switch.',
    specs: { 'Стикове': 'Hall-effect', 'Връзка': '2.4 GHz / Bluetooth / USB-C', 'Батерия': 'до 20 ч', 'Съвместимост': 'PC / Switch / Android' },
  },
  {
    name: 'ZeroLag Elite Paddles', brand: 'ZeroLag', cat: 'kontroleri', price: 129.99, stock: 6,
    description: 'Професионален контролер с 4 задни бутона и сменяеми стикове.',
    specs: { 'Задни бутони': '4', 'Тригери': 'С регулируем ход', 'Връзка': 'Безжична / кабелна', 'Калъф': 'Включен' },
  },
  {
    name: 'AuraSound StreamCast USB', brand: 'AuraSound', cat: 'mikrofoni', price: 99.99, stock: 19,
    description: 'USB кондензаторен микрофон с mute бутон и мониторинг без забавяне.',
    specs: { 'Тип': 'Кондензаторен', 'Връзка': 'USB-C', 'Диаграма': 'Кардиоидна', 'Резолюция': '24 bit / 96 kHz' },
  },
  {
    name: 'AuraSound Podcast XLR Kit', brand: 'AuraSound', cat: 'mikrofoni', price: 179.99, old: 199.99, stock: 5,
    description: 'Динамичен XLR микрофон с рамо, поп филтър и USB аудио интерфейс.',
    specs: { 'Тип': 'Динамичен', 'Връзка': 'XLR + USB интерфейс', 'В комплекта': 'Рамо, поп филтър, кабел' },
  },
];

const reviewers = [
  { name: 'Иван Петров', email: 'ivan@example.com' },
  { name: 'Мария Георгиева', email: 'maria@example.com' },
  { name: 'Георги Димитров', email: 'georgi@example.com' },
  { name: 'Николай Стоянов', email: 'nikolay@example.com' },
  { name: 'Елена Василева', email: 'elena@example.com' },
  { name: 'Стефан Колев', email: 'stefan@example.com' },
];

/** Реалистични мнения според категорията на продукта. */
const categoryComments: Record<string, string[]> = {
  mishki: [
    'Сензорът е безупречен, а теглото е идеално за бързи флик шотове. Играя CS2 и усещам разликата веднага.',
    'Кликовете са отчетливи и прецизни, а формата пасва идеално на ръката ми.',
    'Много удобна форма, страничните бутони са супер за макроси. Качеството личи отдалеч.',
  ],
  klaviaturi: [
    'Суичовете са гладки и приятни, а подсветката изглежда страхотно на тъмно. Писането е удоволствие.',
    'Реакцията е мигновена, а клавишите са стабилни и без никакво клатене. Истински ъпгрейд.',
    'Компактна и много здрава. Освободи ми място за мишката и бюрото изглежда много по-чисто.',
  ],
  slushalki: [
    'Звукът е кристален, стъпките в игрите се чуват отлично. Микрофонът също е много чист.',
    'Нося ги по 6–7 часа на ден без да ме стягат. Възглавничките са меки и не загряват.',
    'Съраунд звукът ми помага да локализирам противниците много по-лесно. Струват си всеки цент.',
  ],
  monitori: [
    'Картината е невероятно плавна — след 240 Hz няма връщане назад. Цветовете са живи и наситени.',
    'Пристигна перфектно опакован, без нито един мъртъв пиксел. Стойката е стабилна и се регулира лесно.',
    'Разликата в състезателните игри е огромна. Препоръчвам го на всеки, който играе сериозно.',
  ],
  stolove: [
    'Сглобих го за 20 минути, а гърбът ми вече не боли след дълги сесии. Много качествени материали.',
    'Лумбалната опора и подлакътниците правят чудеса. Работя и играя на него по цял ден.',
  ],
  podlozhki: [
    'Мишката се плъзга равномерно по цялата повърхност, а ръбовете са прошити качествено.',
    'Голяма и удобна повърхност, не се плъзга по бюрото и изглежда страхотно в сетъпа.',
  ],
  kontroleri: [
    'Стиковете са точни и без drift, а хватката е много удобна. Най-добрият контролер, който съм имал.',
    'Бутоните са отзивчиви, а батерията държи цяла вечер игра. Работи безупречно и на PC.',
  ],
  mikrofoni: [
    'Гласът ми звучи като в студио — зрителите в стрийма веднага забелязаха разликата.',
    'Лесен за настройка, а качеството на звука е отлично за подкаст и Discord.',
  ],
};

const neutralComments = [
  'Добро качество за цената, макар че софтуерът може да бъде по-удобен.',
  'Като цяло съм доволен, доставката беше бърза. Очаквах малко повече за тези пари.',
];

function sampleRating(pi: number, ri: number) {
  // Предимно 4 и 5 звезди, от време на време 3.
  return [5, 4, 5, 5, 3, 4, 5][(pi * 7 + ri * 3) % 7];
}

function sampleComment(cat: string, rating: number, seed: number) {
  if (rating <= 3) return neutralComments[seed % neutralComments.length];
  const list = categoryComments[cat] ?? neutralComments;
  return list[seed % list.length];
}

/** Старите шаблонни мнения от първата версия — заменят се с реалистичните при стартиране. */
const legacyComments = [
  'Страхотно качество за цената, препоръчвам!',
  'Пристигна бързо, всичко работи перфектно.',
  'Доволен съм, но очаквах малко повече.',
  'Най-добрата покупка тази година.',
  'Много удобно за дълги сесии.',
];

/**
 * Закача локалните снимки от client/public/products/<slug>.jpg към продуктите без снимка.
 * Работи и за вече съществуваща база — не презаписва снимки, сменени от админа.
 */
export function attachLocalImages() {
  const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'client', 'public', 'products');
  if (!fs.existsSync(dir)) return;
  const rows = db.prepare(`SELECT id, slug FROM products WHERE image_url IS NULL OR image_url = ''`).all() as { id: number; slug: string }[];
  const upd = db.prepare('UPDATE products SET image_url = ? WHERE id = ?');
  for (const r of rows) {
    if (fs.existsSync(path.join(dir, `${r.slug}.jpg`))) upd.run(`/products/${r.slug}.jpg`, r.id);
  }
}

/**
 * Обновява примерните мнения в база, създадена с първата версия:
 * сменя шаблонните текстове и добавя новите демо ревюъри. Истинските мнения на клиенти не се пипат.
 */
/** Текстове от предишна версия на примерните мнения, които вече са заменени. */
const commentFixes: [string, string][] = [
  [
    "Безжичната връзка е без никакво забавяне, а батерията издържа повече от седмица игра.",
    "Кликовете са отчетливи и прецизни, а формата пасва идеално на ръката ми."
  ],
  [
    "Rapid Trigger функцията е истински game changer — реакцията в Valorant е мигновена.",
    "Реакцията е мигновена, а клавишите са стабилни и без никакво клатене. Истински ъпгрейд."
  ],
  [
    "RGB подсветката прави сетъпа ми да изглежда като от снимка. Не се плъзга по бюрото.",
    "Голяма и удобна повърхност, не се плъзга по бюрото и изглежда страхотно в сетъпа."
  ],
  [
    "Hall-effect стиковете са точни и без drift. Най-добрият контролер, който съм имал досега.",
    "Стиковете са точни и без drift, а хватката е много удобна. Най-добрият контролер, който съм имал."
  ],
  [
    "Задните бутони дават огромно предимство в шутърите. Батерията държи цяла вечер игра.",
    "Бутоните са отзивчиви, а батерията държи цяла вечер игра. Работи безупречно и на PC."
  ]
];

export function upgradeSampleReviews() {
  const fix = db.prepare('UPDATE reviews SET comment = ? WHERE comment = ?');
  for (const [oldText, newText] of commentFixes) fix.run(newText, oldText);

  const placeholders = legacyComments.map(() => '?').join(',');
  const legacy = db
    .prepare(
      `SELECT r.id, r.rating, c.slug AS cat FROM reviews r
       JOIN products p ON p.id = r.product_id JOIN categories c ON c.id = p.category_id
       WHERE r.comment IN (${placeholders})`,
    )
    .all(...legacyComments) as { id: number; rating: number; cat: string }[];
  if (!legacy.length) return;

  transaction(() => {
    const upd = db.prepare(`UPDATE reviews SET comment = ?, rating = ?, created_at = datetime('now', ?) WHERE id = ?`);
    legacy.forEach((r, i) => {
      const rating = r.rating === 3 && i % 2 === 0 ? 4 : r.rating;
      upd.run(sampleComment(r.cat, rating, i), rating, `-${(i * 7) % 60} hours`, r.id);
    });

    const products = db
      .prepare('SELECT p.id, c.slug AS cat FROM products p JOIN categories c ON c.id = p.category_id ORDER BY p.id')
      .all() as { id: number; cat: string }[];
    const insUser = db.prepare('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)');
    const insReview = db.prepare(
      `INSERT OR IGNORE INTO reviews (product_id, user_id, rating, comment, created_at) VALUES (?, ?, ?, ?, datetime('now', ?))`,
    );
    reviewers.forEach((rv, ri) => {
      if (db.prepare('SELECT id FROM users WHERE email = ?').get(rv.email)) return;
      const uid = Number(insUser.run(rv.name, rv.email, bcrypt.hashSync('demo1234', 10), 'customer').lastInsertRowid);
      products.forEach((p, pi) => {
        if ((pi + ri) % 3 === 0) return;
        const rating = sampleRating(pi, ri);
        insReview.run(p.id, uid, rating, sampleComment(p.cat, rating, pi + ri), `-${(pi * 3 + ri * 5) % 30} hours`);
      });
    });
  });
  console.log(`💬 Обновени ${legacy.length} примерни мнения.`);
}

/**
 * Паролата на админа идва от ADMIN_PASSWORD в server/.env.
 * При всяко пускане, ако е сменена там, се обновява и в базата.
 */
export function syncAdminPassword() {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return;
  const admin = db.prepare("SELECT id, password_hash FROM users WHERE role = 'admin' ORDER BY id LIMIT 1").get() as
    | { id: number; password_hash: string }
    | undefined;
  if (!admin || bcrypt.compareSync(password, admin.password_hash)) return;
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(bcrypt.hashSync(password, 10), admin.id);
  console.log('[сигурност] Паролата на админа е обновена от server/.env.');
}

export function seedIfEmpty() {
  const { n } = db.prepare('SELECT COUNT(*) AS n FROM categories').get() as { n: number };
  if (n > 0) return;

  transaction(() => {
    const insCat = db.prepare('INSERT INTO categories (slug, name, icon, description) VALUES (?, ?, ?, ?)');
    const catIds: Record<string, number> = {};
    for (const c of categories) {
      catIds[c.slug] = Number(insCat.run(c.slug, c.name, c.icon, c.description).lastInsertRowid);
    }

    const insProd = db.prepare(`INSERT INTO products
      (slug, name, brand, category_id, description, price, old_price, stock, specs, featured, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', ?))`);
    const productIds: number[] = [];
    products.forEach((p, i) => {
      const r = insProd.run(
        slugify(p.name), p.name, p.brand, catIds[p.cat], p.description, p.price, p.old ?? null, p.stock,
        JSON.stringify(p.specs), p.featured ? 1 : 0, `-${products.length - i} days`,
      );
      productIds.push(Number(r.lastInsertRowid));
    });

    const insUser = db.prepare('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)');
    insUser.run('Администратор', 'admin@slotlyy.bg', bcrypt.hashSync(process.env.ADMIN_PASSWORD || crypto.randomBytes(24).toString('hex'), 10), 'admin');
    insUser.run('Демо Клиент', 'user@slotlyy.bg', bcrypt.hashSync('user123', 10), 'customer');

    const insReview = db.prepare(
      `INSERT INTO reviews (product_id, user_id, rating, comment, created_at) VALUES (?, ?, ?, ?, datetime('now', ?))`,
    );
    reviewers.forEach((rv, ri) => {
      const uid = Number(insUser.run(rv.name, rv.email, bcrypt.hashSync('demo1234', 10), 'customer').lastInsertRowid);
      productIds.forEach((pid, pi) => {
        if ((pi + ri) % 3 === 0) return; // не всеки продукт има ревю от всеки
        const rating = sampleRating(pi, ri);
        insReview.run(pid, uid, rating, sampleComment(products[pi].cat, rating, pi + ri), `-${(pi * 3 + ri * 5) % 40} hours`);
      });
    });

    db.prepare('INSERT INTO coupons (code, percent) VALUES (?, ?)').run('SLOTLYY10', 10);
    db.prepare('INSERT INTO coupons (code, percent) VALUES (?, ?)').run('GAMER20', 20);
  });

  console.log('🌱 Базата е попълнена с примерни данни.');
}
