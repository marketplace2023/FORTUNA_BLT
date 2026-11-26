import crypto from 'node:crypto';

/** Semilla de 256 bits del CSPRNG del sistema operativo. */
export function newSeed() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * HMAC-DRBG simplificado (HMAC-SHA256 en modo contador).
 * Dada la misma semilla produce siempre la misma secuencia, por lo que
 * cualquier ronda se puede reproducir y auditar a partir de su semilla.
 * La selección de enteros usa muestreo por rechazo: sin sesgo de módulo.
 */
export class Drbg {
  constructor(seedHex) {
    this.key = Buffer.from(seedHex, 'hex');
    if (this.key.length < 16) throw new Error('seed too short');
    this.counter = 0;
    this.block = null;
    this.pos = 32;
    this.draws = 0;
    this.ctr = Buffer.alloc(8);
  }

  #refill() {
    this.ctr.writeUInt32BE(Math.floor(this.counter / 0x100000000), 0);
    this.ctr.writeUInt32BE(this.counter >>> 0, 4);
    this.counter++;
    this.block = crypto.createHmac('sha256', this.key).update(this.ctr).digest();
    this.pos = 0;
  }

  u32() {
    if (this.pos > 28) this.#refill();
    const v = this.block.readUInt32BE(this.pos);
    this.pos += 4;
    return v;
  }

  /** Entero uniforme en [0, n). */
  int(n) {
    if (!(n >= 1 && n <= 0x100000000)) throw new Error('bad range ' + n);
    const limit = 0x100000000 - (0x100000000 % n);
    let v;
    do { v = this.u32(); } while (v >= limit);
    this.draws++;
    return v % n;
  }

  /** Selección ponderada sobre una tabla creada con `table()`. */
  pick(t) {
    const r = this.int(t.total);
    const cum = t.cum;
    let i = 0;
    while (r >= cum[i]) i++;
    return t.keys[i];
  }
}

/** Tabla ponderada a partir de { valor: pesoEntero }. Orden de claves estable. */
export function table(obj) {
  const keys = [];
  const cum = [];
  let total = 0;
  for (const [k, w] of Object.entries(obj)) {
    if (!w) continue;
    if (!Number.isInteger(w) || w < 0) throw new Error(`weight must be a positive integer: ${k}=${w}`);
    total += w;
    keys.push(k);
    cum.push(total);
  }
  return { keys, cum, total };
}
