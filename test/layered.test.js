import { test } from 'node:test';
import assert from 'node:assert';
import { seal, unseal, LAYER_NAMES, LAYER_ELEMENTS, TRIADS, layerPassphrase, derivePersonalLayerKey, status, wrapLayer, unwrapLayer } from '../src/layered-enochian.js';

test('status reports 21 layers across 3 triads', () => {
  const s = status();
  assert.strictEqual(s.layers.length, 21);
  assert.strictEqual(s.triads.length, 3);
  assert.deepStrictEqual(s.triads.map(t => t.layers.length), [7, 7, 7]);
  assert.deepStrictEqual(s.triads.map(t => t.name), ['quantum-enochian', 'cypher-magick', 'world-runes']);
  assert.deepStrictEqual(s.layers.slice(0, 7), ['Root', 'Veil', 'Sigil', 'Aethyr', 'Choir', 'Watchtower', 'Seal']);
  assert.deepStrictEqual(s.layers.slice(7, 14), ['Glyph', 'Charm', 'Hex', 'Ward', 'Talisman', 'Arcanum', 'Oracle']);
  assert.deepStrictEqual(s.layers.slice(14, 21), ['Skeith', 'Innis', 'Magus', 'Fidchell', 'Gorre', 'Macha', 'Tarvos']);
});

test('legacy layers 0-6 keep original names and elements', () => {
  const s = status();
  assert.deepStrictEqual(s.elements.slice(0, 7), ['spirit', 'earth', 'water', 'air', 'fire', 'spirit', 'earth']);
});

test('seal/unseal roundtrip preserves plaintext across all 21 layers', () => {
  const secret = process.env.QE_TEST_SECRET || "test-secret";
  const context = 'roundtrip';
  const plaintext = 'quantum enochian layered roundtrip';
  const sealed = seal(plaintext, secret, context);
  const recovered = unseal(sealed, secret, context);
  assert.strictEqual(recovered, plaintext);
});

test('different contexts change output', () => {
  const secret = process.env.QE_TEST_SECRET || "test-secret";
  const ctx1 = seal('x', secret, 'ctx-a');
  const ctx2 = seal('x', secret, 'ctx-b');
  assert.notStrictEqual(ctx1, ctx2);
});

test('layer passphrase is deterministic per triad index', () => {
  const a0 = layerPassphrase(0, 'secret', 'ctx');
  const b0 = layerPassphrase(0, 'secret', 'ctx');
  assert.strictEqual(a0, b0);
  const a20 = layerPassphrase(20, 'secret', 'ctx');
  const b20 = layerPassphrase(20, 'secret', 'ctx');
  assert.strictEqual(a20, b20);
  assert.notStrictEqual(a0, a20);
});

test('personal layer key derivation is deterministic', () => {
  const a = derivePersonalLayerKey(2, 'name', 'entropy');
  const b = derivePersonalLayerKey(2, 'name', 'entropy');
  assert.strictEqual(a, b);
});

test('wrong secret fails unseal', async () => {
  const sealed = seal('data', 'correct', 'ctx');
  let failed = false;
  try {
    unseal(sealed, 'wrong', 'ctx');
  } catch {
    failed = true;
  }
  assert.strictEqual(failed, true);
});

test('each triad wraps independently: partial unseal of first-layer blob fails', () => {
  const data = Buffer.from('triad-check', 'utf8');
  const wrapped = wrapLayer(data, 14, 'secret', 'ctx');
  let failed = false;
  try {
    unwrapLayer(wrapped, 13, 'secret', 'ctx');
  } catch {
    failed = true;
  }
  assert.strictEqual(failed, true);
  const recovered = Buffer.from(unwrapLayer(wrapped, 14, 'secret', 'ctx'), 'utf8');
  assert.deepStrictEqual(recovered, data);
});

test('layer 0 wrapLayer/unwrapLayer preserves bytes', () => {
  const data = Buffer.from('layer-zero-check', 'utf8');
  const wrapped = wrapLayer(data, 0, 'secret', 'ctx');
  const recovered = Buffer.from(unwrapLayer(wrapped, 0, 'secret', 'ctx'), 'utf8');
  assert.deepStrictEqual(recovered, data);
});

test('layer 20 (Tarvos) wrapLayer/unwrapLayer preserves bytes', () => {
  const data = Buffer.from('world-rune-final-check', 'utf8');
  const wrapped = wrapLayer(data, 20, 'secret', 'ctx');
  const recovered = Buffer.from(unwrapLayer(wrapped, 20, 'secret', 'ctx'), 'utf8');
  assert.deepStrictEqual(recovered, data);
});
