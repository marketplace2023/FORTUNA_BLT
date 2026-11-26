import fs from 'node:fs';
import path from 'node:path';
import { canonical, sha256 } from './util.js';

export const GENESIS = '0'.repeat(64);

export function entryHash(e) {
  const { hash, ...rest } = e;
  return sha256(canonical(rest));
}

/**
 * Libro mayor solo-anexar con cadena de hash.
 * Cada asiento lleva `prev` (hash del anterior) y `hash` (SHA-256 del asiento
 * canónico). Modificar o borrar cualquier línea rompe la cadena desde ese punto.
 */
export class Ledger {
  constructor(file) {
    this.file = file;
    this.entries = [];
    this.lastHash = GENESIS;
    fs.mkdirSync(path.dirname(file), { recursive: true });
    if (fs.existsSync(file)) {
      const lines = fs.readFileSync(file, 'utf8').split('\n').filter(Boolean);
      for (const line of lines) this.entries.push(JSON.parse(line));
      if (this.entries.length) this.lastHash = this.entries.at(-1).hash;
    }
  }

  get seq() { return this.entries.length; }

  append(data) {
    const e = { seq: this.entries.length + 1, ts: new Date().toISOString(), ...data, prev: this.lastHash };
    e.hash = entryHash(e);
    fs.appendFileSync(this.file, JSON.stringify(e) + '\n');
    this.entries.push(e);
    this.lastHash = e.hash;
    return e;
  }

  /** Recalcula toda la cadena leyendo el archivo en disco (no la memoria). */
  verify() {
    if (!fs.existsSync(this.file)) return { ok: true, count: 0 };
    const lines = fs.readFileSync(this.file, 'utf8').split('\n').filter(Boolean);
    let prev = GENESIS;
    for (let i = 0; i < lines.length; i++) {
      let e;
      try { e = JSON.parse(lines[i]); } catch { return { ok: false, count: lines.length, badSeq: i + 1, reason: 'JSON inválido' }; }
      if (e.seq !== i + 1) return { ok: false, count: lines.length, badSeq: i + 1, reason: 'secuencia rota' };
      if (e.prev !== prev) return { ok: false, count: lines.length, badSeq: e.seq, reason: 'prev no coincide' };
      if (entryHash(e) !== e.hash) return { ok: false, count: lines.length, badSeq: e.seq, reason: 'hash no coincide (asiento alterado)' };
      prev = e.hash;
    }
    return { ok: true, count: lines.length, head: prev };
  }
}
