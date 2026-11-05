import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Зарежда server/.env (ако го има), преди останалите модули да прочетат process.env.
const envFile = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '.env');
if (fs.existsSync(envFile)) process.loadEnvFile(envFile);
