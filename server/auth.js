import crypto from 'node:crypto';

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { salt, hash };
}

export function checkPassword(password, rec) {
  if (!rec?.salt || !rec?.hash) return false;
  const a = crypto.scryptSync(password, rec.salt, 64);
  const b = Buffer.from(rec.hash, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** Sesiones en memoria. Un reinicio del servidor cierra todas las sesiones. */
export class Sessions {
  constructor(ttlMs) { this.ttl = ttlMs; this.map = new Map(); }
  create(subject) {
    const token = crypto.randomBytes(32).toString('base64url');
    this.map.set(token, { subject, exp: Date.now() + this.ttl });
    return token;
  }
  get(token) {
    const s = token && this.map.get(token);
    if (!s) return null;
    if (s.exp < Date.now()) { this.map.delete(token); return null; }
    s.exp = Date.now() + this.ttl;
    return s.subject;
  }
  destroy(token) { this.map.delete(token); }
  destroyWhere(pred) { for (const [k, v] of this.map) if (pred(v.subject)) this.map.delete(k); }
}

/** Limitador simple por clave (IP + ruta). */
export class RateLimit {
  constructor(max, windowMs) { this.max = max; this.win = windowMs; this.hits = new Map(); }
  allow(key) {
    const now = Date.now();
    const h = this.hits.get(key);
    if (!h || h.reset < now) { this.hits.set(key, { n: 1, reset: now + this.win }); return true; }
    h.n++;
    return h.n <= this.max;
  }
}
