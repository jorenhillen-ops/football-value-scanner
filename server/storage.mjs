import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.join(here, '..');
export const DATA = path.join(ROOT, 'data');

export function readJson(name, fallback = {}) {
  const p = path.join(DATA, name);
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); }
  catch { return fallback; }
}

export function writeJson(name, value) {
  const p = path.join(DATA, name);
  const tmp = p + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2), 'utf8');
  fs.renameSync(tmp, p);
}

export function publicSettings() {
  const s = readJson('settings.json', {});
  const mask = v => v ? `${String(v).slice(0, 4)}••••${String(v).slice(-3)}` : '';
  return {
    sportmonksConfigured: Boolean(s.sportmonksToken),
    oddsPapiConfigured: Boolean(s.oddsPapiKey),
    sportmonksMasked: mask(s.sportmonksToken),
    oddsPapiMasked: mask(s.oddsPapiKey),
    refreshMinutes: Number(s.refreshMinutes || 240),
    scanDays: Math.max(1,Math.min(4,Number(s.scanDays||2))),
    useFreeFallback: s.useFreeFallback !== false
  };
}
