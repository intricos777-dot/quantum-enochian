// Watermark: Living_Sin (intricos777-dot) + AI agents (Hermes, Lia, opencode) - collaborative work
import crypto from 'node:crypto';

// Triad I — Quantum Enochian (layers 1-7)
export const ENOCHIAN_LAYERS = ['Root', 'Veil', 'Sigil', 'Aethyr', 'Choir', 'Watchtower', 'Seal'];
export const ENOCHIAN_ELEMENTS = ['spirit', 'earth', 'water', 'air', 'fire', 'spirit', 'earth'];

// Triad II — Cypher Magick (layers 8-14)
export const CYPHER_LAYERS = ['Glyph', 'Charm', 'Hex', 'Ward', 'Talisman', 'Arcanum', 'Oracle'];
export const CYPHER_ELEMENTS = ['air', 'fire', 'water', 'earth', 'spirit', 'void', 'aether'];

// Triad III — .hack//G.U. "The World" rune phases (layers 15-21)
export const WORLD_RUNE_LAYERS = ['Skeith', 'Innis', 'Magus', 'Fidchell', 'Gorre', 'Macha', 'Tarvos'];
export const WORLD_RUNE_ELEMENTS = ['terror', 'mirage', 'propagation', 'prophecy', 'machination', 'temptation', 'vengeance'];

export const LAYER_NAMES = [...ENOCHIAN_LAYERS, ...CYPHER_LAYERS, ...WORLD_RUNE_LAYERS];
export const LAYER_ELEMENTS = [...ENOCHIAN_ELEMENTS, ...CYPHER_ELEMENTS, ...WORLD_RUNE_ELEMENTS];
export const TRIADS = ['quantum-enochian', 'cypher-magick', 'world-runes'];

export function layerPassphrase(layerIndex, userSecret, context = '') {
  const salt = crypto.createHash('sha3-256').update(
    [layerIndex, userSecret, context, LAYER_NAMES[layerIndex]].join('||')
  ).digest();
  return crypto.pbkdf2Sync(userSecret, salt, 150000, 32, 'sha3-256').toString('base64');
}

export function sealMaterial(layerIndex, passphrase) {
  const mat = crypto.createHash('sha3-512').update(
    [LAYER_NAMES[layerIndex], passphrase, layerIndex].join('::')
  ).digest();
  return mat;
}

export function wrapLayer(plaintext, layerIndex, userSecret, context = '') {
  const passphrase = layerPassphrase(layerIndex, userSecret, context);
  const key = crypto.scryptSync(passphrase, sealMaterial(layerIndex, passphrase), 32);
  const iv = crypto.randomBytes(16);
  const aad = crypto.createHash('sha3-256').update(
    [LAYER_NAMES[layerIndex], context, layerIndex].join('||')
  ).digest();
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(aad);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([aad, iv, tag, ciphertext]);
}

export function unwrapLayer(blob, layerIndex, userSecret, context = '') {
  const aadLen = 32;
  const ivLen = 16;
  const tagLen = 16;
  const aad = blob.subarray(0, aadLen);
  const iv = blob.subarray(aadLen, aadLen + ivLen);
  const tag = blob.subarray(aadLen + ivLen, aadLen + ivLen + tagLen);
  const ciphertext = blob.subarray(aadLen + ivLen + tagLen);
  const passphrase = layerPassphrase(layerIndex, userSecret, context);
  const key = crypto.scryptSync(passphrase, sealMaterial(layerIndex, passphrase), 32);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAAD(aad);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

export function seal(plaintext, userSecret, context = '') {
  let current = Buffer.from(plaintext, 'utf8');
  for (let i = 0; i < LAYER_NAMES.length; i++) {
    current = wrapLayer(current, i, userSecret, context);
  }
  return current.toString('base64');
}

export function unseal(blobB64, userSecret, context = '') {
  let current = Buffer.from(blobB64, 'base64');
  for (let i = LAYER_NAMES.length - 1; i >= 0; i--) {
    current = unwrapLayer(current, i, userSecret, context);
  }
  return current.toString('utf8');
}

export function derivePersonalLayerKey(layerIndex, personalSecret, entropyFile = '') {
  const material = crypto.createHash('sha3-512').update(
    [layerIndex, personalSecret, entropyFile, LAYER_NAMES[layerIndex]].join('::')
  ).digest();
  return crypto.scryptSync(personalSecret, material, 32).toString('base64');
}

export function status() {
  return {
    format: 'quantum-enochian-layered',
    triads: TRIADS.map((triad, t) => ({
      name: triad,
      layers: LAYER_NAMES.slice(t * 7, t * 7 + 7),
      elements: LAYER_ELEMENTS.slice(t * 7, t * 7 + 7),
    })),
    layers: LAYER_NAMES,
    elements: LAYER_ELEMENTS,
    rotation: 'forward-seal / reverse-unseal',
  };
}
