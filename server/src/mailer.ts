/**
 * Имейли при поръчка чрез Resend (https://resend.com).
 * Праща потвърждение на клиента и известие на фирмения имейл.
 * Грешка при изпращане не проваля поръчката — само се записва в конзолата.
 */

type OrderItem = { name: string; price: number; qty: number };
export type MailOrder = {
  id: number;
  customerName: string;
  email: string;
  phone: string;
  city: string;
  address: string;
  note: string;
  paymentMethod: string;
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  couponCode: string | null;
  items: OrderItem[];
};

const PAYMENT_LABELS: Record<string, string> = {
  cod: 'Наложен платеж',
  card: 'Карта',
  bank: 'Банков превод',
};

const money = new Intl.NumberFormat('bg-BG', { style: 'currency', currency: 'EUR' });
const fmt = (n: number) => money.format(n);

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

async function sendEmail(to: string, subject: string, html: string, replyTo?: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn(`[имейл] Няма RESEND_API_KEY в server/.env — „${subject}“ не е изпратен.`);
    return;
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: process.env.MAIL_FROM || 'Slotlyy <onboarding@resend.dev>',
      to: [to],
      subject,
      html,
      ...(replyTo ? { reply_to: replyTo } : {}),
    }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
}

function itemsTable(o: MailOrder) {
  const rows = o.items
    .map(
      (i) => `<tr>
        <td style="padding:8px 0;border-bottom:1px solid #eee">${esc(i.name)} × ${i.qty}</td>
        <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;white-space:nowrap">${fmt(i.price * i.qty)}</td>
      </tr>`,
    )
    .join('');
  const line = (label: string, value: string, bold = false) =>
    `<tr><td style="padding:4px 0;${bold ? 'font-weight:700;font-size:16px' : 'color:#555'}">${label}</td>
     <td style="padding:4px 0;text-align:right;${bold ? 'font-weight:700;font-size:16px' : ''}">${value}</td></tr>`;
  return `<table style="width:100%;border-collapse:collapse;font-size:14px">
    ${rows}
    ${line('Междинна сума', fmt(o.subtotal))}
    ${o.discount > 0 ? line(`Отстъпка${o.couponCode ? ` (${esc(o.couponCode)})` : ''}`, `−${fmt(o.discount)}`) : ''}
    ${line('Доставка', o.shipping > 0 ? fmt(o.shipping) : 'Безплатна')}
    ${line('Общо', fmt(o.total), true)}
  </table>`;
}

function layout(title: string, body: string) {
  return `<!doctype html><html><body style="margin:0;background:#f4f4f7;font-family:Arial,Helvetica,sans-serif;color:#111">
  <div style="max-width:560px;margin:0 auto;padding:24px 16px">
    <div style="background:#0b0b18;color:#14dcf5;padding:18px 24px;border-radius:14px 14px 0 0;font-size:22px;font-weight:800;letter-spacing:.5px">SLOTLYY</div>
    <div style="background:#fff;padding:24px;border-radius:0 0 14px 14px">
      <h1 style="font-size:20px;margin:0 0 14px">${title}</h1>
      ${body}
    </div>
    <p style="color:#888;font-size:12px;text-align:center;margin-top:16px">Slotlyy — геймърски принадлежности</p>
  </div></body></html>`;
}

const PAYMENT_NOTE: Record<string, string> = {
  cod: `Плащаш <b>при получаване</b> в офиса на Еконт — в брой или с карта на гишето. Ще трябва да заплатиш точно <b>{total}</b>.`,
  card: `Плащането ти с карта е прието — при получаване в офиса не дължиш нищо.`,
  bank: `Ще ти изпратим данните за банков превод в отделно писмо. Поръчката тръгва веднага щом преводът пристигне.`,
};

function customerEmail(o: MailOrder, site: string) {
  const firstName = esc(o.customerName.split(' ')[0]);
  const p = (html: string) => `<p style="margin:0 0 14px;color:#333;line-height:1.6;font-size:15px">${html}</p>`;
  const h = (text: string) => `<h3 style="font-size:16px;margin:26px 0 10px;color:#0b0b18">${text}</h3>`;
  const step = (n: number, title: string, text: string) =>
    `<tr>
      <td style="vertical-align:top;padding:0 12px 14px 0">
        <div style="width:28px;height:28px;border-radius:50%;background:#14dcf5;color:#000;font-weight:800;text-align:center;line-height:28px">${n}</div>
      </td>
      <td style="vertical-align:top;padding-bottom:14px;color:#333;font-size:14px;line-height:1.55"><b>${title}</b><br>${text}</td>
    </tr>`;
  const payNote = (PAYMENT_NOTE[o.paymentMethod] ?? '').replace('{total}', fmt(o.total));

  return layout(
    `Благодарим ти, ${firstName}! 💙`,
    `${p(`Искаме лично да ти благодарим, че избра <b>Slotlyy</b>. Ние сме малък магазин, създаден от геймъри за геймъри, и всяка поръчка за нас означава много — тя ни помага да растем и да носим още по-добра техника на хора като теб.`)}
     ${p(`Поръчка <b>№${o.id}</b> е получена успешно и вече я подготвяме с внимание. По-долу ще намериш всичко, което трябва да знаеш.`)}

     ${h('🧾 Какво поръча')}
     ${itemsTable(o)}

     ${h('📦 Какво следва')}
     <table style="border-collapse:collapse">
       ${step(1, 'Подготвяме поръчката', 'Проверяваме всеки продукт и го опаковаме внимателно — обикновено до 1 работен ден.')}
       ${step(2, 'Изпращаме с Еконт', `Пратката тръгва към избрания от теб офис: <b>${esc(o.address)}</b>, гр. ${esc(o.city)}.`)}
       ${step(3, 'Получаваш SMS от Еконт', 'Когато пратката пристигне в офиса, Еконт ще ти изпрати SMS. Вземи я с лична карта или с кода от съобщението.')}
     </table>

     ${h('💳 Плащане')}
     ${p(payNote || `Начин на плащане: <b>${PAYMENT_LABELS[o.paymentMethod] ?? esc(o.paymentMethod)}</b>`)}

     ${h('🛡️ Спокойствие при покупка')}
     <ul style="margin:0 0 14px;padding-left:20px;color:#333;font-size:14px;line-height:1.7">
       <li><b>14 дни</b> право на връщане без да обясняваш защо</li>
       <li><b>2 години</b> гаранция на всички продукти</li>
       <li>Имаш въпрос? Просто <b>отговори на този имейл</b> — пишем си с истински хора, не с бот.</li>
     </ul>

     <div style="margin:26px 0 8px;padding:18px;border-radius:12px;background:#f0fdff;border:1px solid #bdf3fb;color:#0b0b18;font-size:15px;line-height:1.6">
       Още веднъж — <b>благодарим ти от сърце</b>, че пазаруваш при нас. Пожелаваме ти много победи с новата техника! 🎮
       <br><span style="color:#555">— Екипът на Slotlyy</span>
     </div>

     <p style="margin:22px 0 0;text-align:center"><a href="${esc(site)}" style="background:#14dcf5;color:#000;padding:12px 22px;border-radius:10px;text-decoration:none;font-weight:700;display:inline-block">Разгледай магазина</a></p>`,
  );
}

function shopEmail(o: MailOrder, site: string) {
  return layout(
    `Нова поръчка №${o.id} — ${fmt(o.total)}`,
    `<table style="font-size:14px;margin-bottom:16px;line-height:1.6">
       <tr><td style="color:#666;padding-right:14px">Клиент</td><td><b>${esc(o.customerName)}</b></td></tr>
       <tr><td style="color:#666;padding-right:14px">Имейл</td><td>${esc(o.email)}</td></tr>
       <tr><td style="color:#666;padding-right:14px">Телефон</td><td>${esc(o.phone)}</td></tr>
       <tr><td style="color:#666;padding-right:14px">Адрес</td><td>${esc(o.address)}, ${esc(o.city)}</td></tr>
       <tr><td style="color:#666;padding-right:14px">Плащане</td><td>${PAYMENT_LABELS[o.paymentMethod] ?? esc(o.paymentMethod)}</td></tr>
       ${o.note ? `<tr><td style="color:#666;padding-right:14px">Бележка</td><td>${esc(o.note)}</td></tr>` : ''}
     </table>
     ${itemsTable(o)}
     <p style="margin:22px 0 0"><a href="${esc(site)}/admin" style="background:#0b0b18;color:#14dcf5;padding:10px 18px;border-radius:10px;text-decoration:none;font-weight:700">Отвори контролния панел</a></p>`,
  );
}

/** Праща и двата имейла. Не хвърля грешки. */
export async function sendOrderEmails(o: MailOrder, origin?: string) {
  const shop = process.env.SHOP_EMAIL;
  if (!shop) console.warn('[имейл] Няма SHOP_EMAIL в server/.env — известие до фирмата няма да се прати.');
  // SITE_URL от .env има предимство; иначе — адресът, от който е дошла поръчката.
  const site = process.env.SITE_URL || origin || 'http://localhost:5173';
  const jobs = [
    sendEmail(o.email, `Потвърждение на поръчка №${o.id} — Slotlyy`, customerEmail(o, site), shop),
    shop
      ? sendEmail(shop, `🛒 Нова поръчка №${o.id} — ${fmt(o.total)}`, shopEmail(o, site), o.email)
      : Promise.reject(new Error('няма SHOP_EMAIL')),
  ];
  const results = await Promise.allSettled(jobs);
  const labels = ['клиент', 'фирма'];
  results.forEach((r, i) => {
    if (r.status === 'rejected') console.error(`[имейл] Поръчка №${o.id} (${labels[i]}) не е изпратен:`, r.reason?.message ?? r.reason);
    else console.log(`[имейл] Поръчка №${o.id} (${labels[i]}) — изпратен.`);
  });
}
