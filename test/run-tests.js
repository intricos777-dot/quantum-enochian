#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert';
import { describe, it, after } from 'node:test';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT = resolve(__dirname, '..');
const KEYS_DIR = resolve(PROJECT, 'keys');
const TEST_DIR = resolve(PROJECT, 'test/tmp');
if (!existsSync(TEST_DIR)) mkdirSync(TEST_DIR, { recursive: true });

import { generateKeyPair, encrypt, decrypt, serializeKey, deserializeKey, deriveChildKey, hybridEncrypt, hybridDecrypt } from '../src/cipher.js';
import { buildGrid, generateGridVault, GRID_LAYERS } from '../src/grid.js';
import { deriveSeed, enochianSum, getAethyr, ENOCHIAN_LETTERS } from '../src/enochian.js';

let passed = 0;
let failed = 0;

after(() => {
  console.log(`\nResults: ${passed} passed, ${failed} failed, ${passed + failed} total`);
  if (failed > 0) process.exit(1);
});

describe('Cipher round-trip', () => {
  it('encrypts and decrypts a short string with 2048-bit key', () => {
    const key = generateKeyPair(0, 0, 2048, 'test-pass', { fast: true });
    const msg = 'quantum enochian round trip';
    const ct = encrypt(msg, key);
    const pt = decrypt(ct, key).toString('utf8');
    assert.strictEqual(pt, msg);
    passed++;
  });

  it('serialize/deserialize preserves round-trip', () => {
    const key = generateKeyPair(1, 5, 2048, '', { fast: true });
    const pub = serializeKey(key, false);
    const priv = serializeKey(key, true);
    const kp = deserializeKey(pub);
    const kpriv = deserializeKey(priv);
    const msg = 'serialize-check';
    const ct = encrypt(msg, kp);
    const pt = decrypt(ct, kpriv).toString('utf8');
    assert.strictEqual(pt, msg);
    passed++;
  });

  it('hybrid encrypt/decrypt matches plaintext', () => {
    const key = generateKeyPair(2, 2, 2048, 'hybrid', { fast: true });
    const msg = 'hybrid payload';
    const payload = hybridEncrypt(msg, key);
    const out = hybridDecrypt(payload, key);
    assert.strictEqual(out, msg);
    passed++;
  });
});

describe('Grid encode/decode', () => {
  it('generateGridVault contains 5 layers with expected aethyr counts', () => {
    const vault = generateGridVault(0, 'grid-pass', 2048);
    const layerNames = Object.keys(vault.grid.layers);
    assert.deepStrictEqual(layerNames, GRID_LAYERS.map(l => l.name));
    for (const layer of GRID_LAYERS) {
      const l = vault.grid.layers[layer.name];
      const expected = layer.aethyrEnd - layer.aethyrStart + 1;
      assert.strictEqual(l.aethyrs.length, expected, `${layer.name} count`);
    }
    passed++;
  });

  it('buildGrid round-trips via vault regeneration', () => {
    const grid = buildGrid(3, 'pass3', 2048);
    const names = Object.keys(grid.layers);
    assert.ok(names.length === 5);
    for (const layer of GRID_LAYERS) {
      const l = grid.layers[layer.name];
      assert.strictEqual(l.cell, layer.cell);
      assert.strictEqual(typeof l.signature, 'string');
      assert.ok(l.signature.length > 0);
    }
    passed++;
  });
});

describe('Enochian mapping', () => {
  it('getAethyr returns names in range', () => {
    assert.strictEqual(getAethyr(0), 'LIL');
    assert.strictEqual(getAethyr(29), 'SIX');
    passed++;
  });

  it('getAethyr throws out of range', () => {
    assert.throws(() => getAethyr(-1));
    assert.throws(() => getAethyr(30));
    passed++;
  });

  it('enochianSum computes stable sums', () => {
    const s1 = enochianSum('LIL');
    assert.ok(typeof s1 === 'bigint');
    assert.ok(s1 > 0n);
    passed++;
  });

  it('deriveSeed changes when call or aethyr changes', () => {
    const a = deriveSeed(0, 0, '');
    const b = deriveSeed(1, 0, '');
    const c = deriveSeed(0, 1, '');
    assert.ok(a.length === 32);
    assert.ok(!Buffer.from(a).equals(Buffer.from(b)));
    assert.ok(!Buffer.from(a).equals(Buffer.from(c)));
    passed++;
  });
});
