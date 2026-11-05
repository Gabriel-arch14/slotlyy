import ExcelJS from 'exceljs';

/**
 * Excel шаблон за масов импорт на продукти и четене на попълнения файл.
 * Един и същ формат се ползва за празния шаблон и за експорта на текущите продукти,
 * така че експортът може да се редактира и да се качи обратно.
 */

export const SHEET = 'Продукти';
const MAX_ROWS = 2000;
const VALIDATION_ROWS = 1000;

type Col = { key: string; header: string; width: number; note: string; required?: boolean };

export const COLUMNS: Col[] = [
  { key: 'id', header: 'ID', width: 8, note: 'Остави празно за НОВ продукт. Попълни ID, за да ОБНОВИШ съществуващ (виж експорта).' },
  { key: 'name', header: 'Име', width: 34, note: 'Името на продукта, както ще се вижда в магазина.', required: true },
  { key: 'brand', header: 'Марка', width: 16, note: 'Напр. Logitech, Razer.', required: true },
  { key: 'category', header: 'Категория', width: 16, note: 'Избери от падащото меню.', required: true },
  { key: 'price', header: 'Цена (€)', width: 12, note: 'Текуща цена, напр. 59.99', required: true },
  { key: 'oldPrice', header: 'Стара цена (€)', width: 14, note: 'По желание. Ако е по-висока от цената, продуктът излиза като промоция.' },
  { key: 'stock', header: 'Наличност (бр.)', width: 14, note: 'Цяло число, 0 или повече.', required: true },
  { key: 'description', header: 'Описание', width: 50, note: 'Текст за страницата на продукта.' },
  { key: 'imageUrl', header: 'Снимка (URL)', width: 36, note: 'Линк към снимка (https://…). По желание.' },
  { key: 'featured', header: 'Топ продукт', width: 12, note: '„Да“ — показва се на началната страница. Иначе „Не“.' },
  { key: 'specs', header: 'Характеристики', width: 44, note: 'По една на ред (Alt+Enter) или разделени с „;“ във формат „Ключ: стойност“.' },
];

export type ExcelProduct = {
  id?: number;
  name: string;
  brand: string;
  category: string;
  price: number;
  oldPrice: number | null;
  stock: number;
  description: string;
  imageUrl: string | null;
  featured: boolean;
  specs: Record<string, string>;
};

const BRAND = 'FF14DCF5';
const DARK = 'FF0B0B18';

export async function buildWorkbook(categories: string[], products: ExcelProduct[] | null): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Slotlyy';
  wb.created = new Date();

  // ---- Лист с продуктите ----
  const ws = wb.addWorksheet(SHEET, { views: [{ state: 'frozen', ySplit: 1 }] });
  ws.columns = COLUMNS.map((c) => ({ key: c.key, width: c.width }));

  const head = ws.getRow(1);
  COLUMNS.forEach((c, i) => {
    const cell = head.getCell(i + 1);
    cell.value = c.required ? `${c.header} *` : c.header;
    cell.font = { bold: true, color: { argb: c.required ? DARK : 'FF333333' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: c.required ? BRAND : 'FFD9F7FC' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = { bottom: { style: 'thin', color: { argb: 'FF999999' } } };
    cell.note = c.note;
  });
  head.height = 30;

  const rows: ExcelProduct[] =
    products ??
    [
      {
        name: 'Примерна мишка Pro X', brand: 'NovaStrike', category: categories[0] ?? '', price: 59.99, oldPrice: 79.99, stock: 25,
        description: 'Лека безжична геймърска мишка с прецизен сензор. (Изтрий този пример преди импорт.)',
        imageUrl: 'https://example.com/mishka.jpg', featured: false,
        specs: { 'Сензор': '26 000 DPI', 'Тегло': '58 г', 'Връзка': '2.4 GHz / Bluetooth' },
      },
      {
        name: 'Примерна клавиатура TKL', brand: 'HyperForge', category: categories[1] ?? categories[0] ?? '', price: 119.99, oldPrice: null, stock: 10,
        description: 'Механична клавиатура без цифров блок. (Изтрий този пример преди импорт.)',
        imageUrl: null, featured: true,
        specs: { 'Суичове': 'Red linear', 'Подсветка': 'RGB' },
      },
    ];

  for (const p of rows) {
    const r = ws.addRow({
      id: p.id ?? null,
      name: p.name,
      brand: p.brand,
      category: p.category,
      price: p.price,
      oldPrice: p.oldPrice,
      stock: p.stock,
      description: p.description,
      imageUrl: p.imageUrl,
      featured: p.featured ? 'Да' : 'Не',
      specs: Object.entries(p.specs).map(([k, v]) => `${k}: ${v}`).join('\n'),
    });
    r.alignment = { vertical: 'top', wrapText: true };
    if (!products) r.font = { italic: true, color: { argb: 'FF777777' } };
  }

  // Формат на числата и падащи менюта за първите VALIDATION_ROWS реда.
  const colIndex = (key: string) => COLUMNS.findIndex((c) => c.key === key) + 1;
  for (let row = 2; row <= VALIDATION_ROWS + 1; row++) {
    const r = ws.getRow(row);
    r.getCell(colIndex('category')).dataValidation = {
      type: 'list', allowBlank: true, formulae: [`'Категории'!$A$2:$A$${categories.length + 1}`],
      showErrorMessage: true, errorTitle: 'Невалидна категория', error: 'Избери категория от падащото меню.',
    };
    r.getCell(colIndex('featured')).dataValidation = {
      type: 'list', allowBlank: true, formulae: ['"Да,Не"'],
    };
    for (const key of ['price', 'oldPrice']) {
      const cell = r.getCell(colIndex(key));
      cell.numFmt = '#,##0.00 [$€-x-euro2]';
      cell.dataValidation = {
        type: 'decimal', operator: 'greaterThan', allowBlank: true, formulae: [0],
        showErrorMessage: true, errorTitle: 'Невалидна цена', error: 'Цената трябва да е число, по-голямо от 0.',
      };
    }
    r.getCell(colIndex('stock')).dataValidation = {
      type: 'whole', operator: 'greaterThanOrEqual', allowBlank: true, formulae: [0],
      showErrorMessage: true, errorTitle: 'Невалидна наличност', error: 'Наличността трябва да е цяло число ≥ 0.',
    };
  }

  // ---- Лист с категориите (източник за падащото меню) ----
  const cs = wb.addWorksheet('Категории');
  cs.getColumn(1).width = 22;
  cs.getCell('A1').value = 'Категория';
  cs.getCell('A1').font = { bold: true };
  categories.forEach((c, i) => (cs.getCell(`A${i + 2}`).value = c));

  // ---- Инструкции ----
  const help = wb.addWorksheet('Инструкции');
  help.getColumn(1).width = 110;
  const lines = [
    ['Как се ползва шаблонът', true],
    ['1. Попълни листа „Продукти“ — по един продукт на ред. Колоните с * са задължителни.', false],
    ['2. Примерните редове (в сив курсив) изтрий или замени със свои продукти.', false],
    ['3. Категорията се избира от падащото меню. Топ продукт — „Да“ или „Не“.', false],
    ['4. Характеристики: по една на ред в клетката (Alt+Enter) или разделени с „;“, напр. „Тегло: 58 г; DPI: 26 000“.', false],
    ['5. Нов продукт — остави колоната ID празна. За обновяване на съществуващ — изтегли „Експорт“ от контролния панел, промени редовете и ги качи обратно.', false],
    ['6. В контролния панел → Продукти → „Импорт от Excel“ избери файла.', false],
    ['', false],
    ['Ако някой ред има грешка, НИЩО не се импортира и ще видиш списък с грешките и номерата на редовете им.', true],
    [`Максимум ${MAX_ROWS} продукта в един файл.`, false],
  ] as const;
  lines.forEach(([text, bold], i) => {
    const cell = help.getCell(`A${i + 1}`);
    cell.value = text;
    cell.font = { bold, size: bold ? 13 : 11 };
    cell.alignment = { wrapText: true };
  });

  return Buffer.from(await wb.xlsx.writeBuffer());
}

/** Текстът на клетката, независимо дали е число, формула, линк или форматиран текст. */
function cellText(v: ExcelJS.CellValue): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string') return v.trim();
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (v instanceof Date) return v.toISOString();
  if (typeof v === 'object') {
    if ('richText' in v) return v.richText.map((t) => t.text).join('').trim();
    if ('hyperlink' in v) return String(v.hyperlink ?? '').trim();
    if ('result' in v) return cellText(v.result as ExcelJS.CellValue);
    if ('text' in v) return String((v as { text: unknown }).text ?? '').trim();
  }
  return String(v).trim();
}

const toNumber = (s: string) => (s === '' ? NaN : Number(s.replace(/\s/g, '').replace('€', '').replace(',', '.')));

export type ParsedRow = { row: number; data: ExcelProduct } | { row: number; error: string };

/** Чете качения файл. Връща по един резултат за всеки непразен ред. */
export async function parseWorkbook(buffer: Buffer): Promise<ParsedRow[]> {
  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(buffer as unknown as ArrayBuffer);
  } catch {
    throw new Error('Файлът не може да се прочете. Качи .xlsx файл, запазен от Excel.');
  }
  const ws = wb.getWorksheet(SHEET) ?? wb.worksheets[0];
  if (!ws) throw new Error('Файлът е празен.');

  // Колоните се намират по заглавие, така че редът им може да се разменя.
  const header = ws.getRow(1);
  const pos: Record<string, number> = {};
  header.eachCell((cell, col) => {
    const title = cellText(cell.value).replace(/\s*\*$/, '').toLowerCase();
    const c = COLUMNS.find((x) => x.header.toLowerCase() === title);
    if (c) pos[c.key] = col;
  });
  const missing = COLUMNS.filter((c) => c.required && !pos[c.key]).map((c) => c.header);
  if (missing.length) throw new Error(`Липсват колони: ${missing.join(', ')}. Ползвай шаблона от контролния панел.`);

  const out: ParsedRow[] = [];
  for (let r = 2; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const get = (key: string) => (pos[key] ? cellText(row.getCell(pos[key]).value) : '');
    if (COLUMNS.every((c) => get(c.key) === '')) continue; // празен ред
    if (out.length >= MAX_ROWS) throw new Error(`Файлът има повече от ${MAX_ROWS} продукта. Раздели го на няколко.`);

    const idText = get('id');
    const id = idText ? Number(idText) : undefined;
    if (idText && !(Number.isInteger(id) && id! > 0)) {
      out.push({ row: r, error: `ID „${idText}“ е невалидно.` });
      continue;
    }

    const specs: Record<string, string> = {};
    for (const line of get('specs').split(/\r?\n|;/)) {
      const i = line.indexOf(':');
      if (i > 0) specs[line.slice(0, i).trim()] = line.slice(i + 1).trim();
    }

    const oldPriceText = get('oldPrice');
    out.push({
      row: r,
      data: {
        id,
        name: get('name'),
        brand: get('brand'),
        category: get('category'),
        price: toNumber(get('price')),
        oldPrice: oldPriceText ? toNumber(oldPriceText) : null,
        stock: toNumber(get('stock')),
        description: get('description'),
        imageUrl: get('imageUrl') || null,
        featured: /^(да|yes|true|1|x)$/i.test(get('featured')),
        specs,
      },
    });
  }
  return out;
}
