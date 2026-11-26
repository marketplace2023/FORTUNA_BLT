import crypto from 'node:crypto';

/** 1 crédito = 10.000 unidades. Todo el dinero se guarda como entero. */
export const UNIT = 10000;
export const toUnits = (credits) => Math.round(Number(credits) * UNIT);
export const toCredits = (units) => units / UNIT;

export const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');

/** JSON canónico: claves ordenadas, sin `undefined`. Base de todos los hashes. */
export function canonical(v) {
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return '[' + v.map(canonical).join(',') + ']';
  return '{' + Object.keys(v).sort()
    .filter((k) => v[k] !== undefined)
    .map((k) => JSON.stringify(k) + ':' + canonical(v[k]))
    .join(',') + '}';
}

export const sig3 = (x) => Number(Number(x).toPrecision(3));

export const randomId = (bytes = 12) => crypto.randomBytes(bytes).toString('hex');
