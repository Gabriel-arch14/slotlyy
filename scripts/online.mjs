/**
 * Пуска магазина онлайн от този компютър:
 *   1. компилира сайта (client/dist)
 *   2. пуска сървъра, който обслужва и сайта, и API-то на един порт
 *   3. отваря безплатен Cloudflare Tunnel и показва публичния линк
 *
 * Стартиране: npm run online   (или двоен клик на „Пусни-онлайн.bat“)
 * Спиране:    Ctrl+C
 */
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = process.env.PORT || '4000';
const isWin = process.platform === 'win32';
const children = [];

const log = (msg) => console.log(`\x1b[36m[slotlyy]\x1b[0m ${msg}`);

function findCloudflared() {
  const candidates = [
    path.join(root, 'tools', isWin ? 'cloudflared.exe' : 'cloudflared'),
    'C:\\Program Files (x86)\\cloudflared\\cloudflared.exe',
    'C:\\Program Files\\cloudflared\\cloudflared.exe',
  ];
  for (const c of candidates) if (fs.existsSync(c)) return c;
  const which = spawnSync(isWin ? 'where' : 'which', ['cloudflared'], { encoding: 'utf8' });
  return which.status === 0 ? which.stdout.split(/\r?\n/)[0].trim() : null;
}

function stopAll() {
  for (const c of children) {
    if (c.exitCode === null) {
      if (isWin) spawnSync('taskkill', ['/pid', String(c.pid), '/T', '/F'], { stdio: 'ignore' });
      else c.kill('SIGTERM');
    }
  }
}
process.on('SIGINT', () => {
  log('Спиране…');
  stopAll();
  process.exit(0);
});

// --- 0. Проверки ---
const cloudflared = findCloudflared();
if (!cloudflared) {
  console.error(
    '\nНе е намерен cloudflared. Инсталирай го с:\n  winget install --id Cloudflare.cloudflared\n' +
      'или изтегли cloudflared-windows-amd64.exe от https://github.com/cloudflare/cloudflared/releases\n' +
      'и го сложи като tools/cloudflared.exe\n',
  );
  process.exit(1);
}
if (!fs.existsSync(path.join(root, 'server', '.env'))) {
  console.error('\nЛипсва server/.env — копирай server/.env.example като server/.env и попълни стойностите.\n');
  process.exit(1);
}

// --- 1. Билд на сайта ---
log('Компилиране на сайта…');
const build = spawnSync('npm', ['run', 'build'], { cwd: root, stdio: 'inherit', shell: isWin });
if (build.status !== 0) {
  console.error('\nБилдът не мина — виж грешките по-горе.');
  process.exit(1);
}

// --- 2. Сървър ---
log(`Пускане на сървъра на порт ${PORT}…`);
const server = spawn('npm', ['start'], { cwd: root, stdio: 'inherit', shell: isWin, env: { ...process.env, PORT } });
children.push(server);
server.on('exit', (code) => {
  log(`Сървърът спря (код ${code}).`);
  stopAll();
  process.exit(code ?? 1);
});

// Изчакваме сървъра да отговори.
const started = Date.now();
while (true) {
  try {
    const r = await fetch(`http://localhost:${PORT}/api/health`);
    if (r.ok) break;
  } catch {
    /* още не е готов */
  }
  if (Date.now() - started > 30000) {
    console.error(`\nСървърът не тръгна за 30 секунди. Зает ли е порт ${PORT}? (Спри „npm run dev“, ако върви.)`);
    stopAll();
    process.exit(1);
  }
  await new Promise((r) => setTimeout(r, 500));
}

// --- 3. Cloudflare Tunnel ---
log('Отваряне на Cloudflare Tunnel…');
const tunnel = spawn(cloudflared, ['tunnel', '--no-autoupdate', '--url', `http://localhost:${PORT}`], { stdio: ['ignore', 'pipe', 'pipe'] });
children.push(tunnel);
let shown = false;
const onOutput = (chunk) => {
  const m = String(chunk).match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/i);
  if (m && !shown) {
    shown = true;
    const line = '═'.repeat(m[0].length + 4);
    console.log(`\n\x1b[32m╔${line}╗\n║  ${m[0]}  ║\n╚${line}╝\x1b[0m`);
    console.log('Това е публичният адрес на магазина. Работи, докато този прозорец е отворен.');
    console.log(`Админ панел: ${m[0]}/admin`);
    console.log('Спиране: Ctrl+C\n');
  }
};
tunnel.stdout.on('data', onOutput);
tunnel.stderr.on('data', onOutput);
tunnel.on('exit', (code) => {
  log(`Тунелът спря (код ${code}).`);
  stopAll();
  process.exit(code ?? 1);
});
