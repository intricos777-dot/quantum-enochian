import crypto from 'node:crypto';
import { deriveSeed, enochianSum } from './enochian.js';
import { generateSafePrime, generatePrime, collapse, superpositionPrimes } from './quantum.js';

function modPos(a, m) {
  const r = a % m;
  return r < 0n ? r + m : r;
}

function modInverse(a, m) {
  let [old_r, r] = [a, m];
  let [old_s, s] = [1n, 0n];
  while (r !== 0n) {
    const q = old_r / r;
    [old_r, r] = [r, old_r - q * r];
    [old_s, s] = [s, old_s - q * s];
  }
  if (old_r !== 1n) throw new Error('No modular inverse');
  return old_s < 0n ? old_s + m : old_s;
}

function uint8ArrayToBigInt(buf) {
  return BigInt('0x' + buf.toString('hex'));
}

function bigIntToUint8Array(n, minBytes = 1) {
  if (n < 0n) throw new Error('Negative BigInt cannot be converted to buffer');
  if (n === 0n) return Buffer.alloc(minBytes, 0x00);
  const hex = n.toString(16);
  const paddedHex = hex.length % 2 === 0 ? hex : '0' + hex;
  const buf = Buffer.from(paddedHex, 'hex');
  if (buf.length === minBytes) return buf;
  if (buf.length > minBytes) return buf.subarray(buf.length - minBytes);
  const result = Buffer.alloc(minBytes, 0x00);
  buf.copy(result, result.length - buf.length);
  return result;
}

function padMessage(msg, blockSize) {
  const maxMsgLen = blockSize - 11;
  if (msg.length > maxMsgLen) {
    throw new Error(`Message too long (max ${maxMsgLen} bytes for ${blockSize}-byte block)`);
  }
  const psLen = blockSize - 3 - msg.length;
  const result = Buffer.alloc(blockSize, 0x00);
  result[0] = 0x00;
  result[1] = 0x02;
  for (let i = 2; i < 2 + psLen; i++) {
    result[i] = crypto.randomInt(1, 256);
  }
  const sepIdx = 2 + psLen;
  result[sepIdx] = 0x00;
  msg.copy(result, sepIdx + 1);
  return result;
}

function unpadMessage(padded) {
  if (padded[0] !== 0x00 || padded[1] !== 0x02) {
    throw new Error('Invalid padding');
  }
  let idx = 2;
  while (idx < padded.length && padded[idx] !== 0x00) idx++;
  if (idx >= padded.length) throw new Error('Invalid padding');
  return padded.subarray(idx + 1);
}

export function generateKeyPair(callIndex, aethyrIndex, bits = 2048, passphrase = '', { fast = false } = {}) {
  if (bits < 512) bits = 512;

  const seed = deriveSeed(callIndex, aethyrIndex, passphrase);

  const primeBits = bits / 2;
  const qSeed = Buffer.alloc(seed.length);
  for (let i = 0; i < seed.length; i++) {
    qSeed[i] = seed[i] ^ 0xAA;
  }

  let primeData;
  if (fast) {
    primeData = { p: generatePrime(primeBits, seed), q: generatePrime(primeBits, qSeed) };
  } else {
    const pData = generateSafePrime(primeBits, seed);
    const qData = generateSafePrime(primeBits, qSeed);
    primeData = { p: pData.p, q: qData.p };
  }
  const p = primeData.p;
  const q = primeData.q;
  const n = p * q;
  const phi = (p - 1n) * (q - 1n);
  const e = 65537n;
  const d = modInverse(e, phi);

  const dp = d % (p - 1n);
  const dq = d % (q - 1n);
  const qinv = modInverse(q, p);

  const enochianTag = enochianSum(getAethyrName(aethyrIndex));

  return {
    algorithm: 'Enochian-RSA',
    callIndex,
    aethyrIndex,
    aethyr: getAethyrName(aethyrIndex),
    enochianTag: enochianTag.toString(),
    bits,
    n,
    e,
    d,
    p,
    q,
    dp,
    dq,
    qinv,
  };
}

function getAethyrName(idx) {
  const names = [
    'LIL', 'ARN', 'ZOM', 'PAZ', 'LIT', 'MAZ', 'DEO', 'ZID', 'ZIP', 'ZAA',
    'ZAX', 'ICH', 'LOE', 'ZIM', 'UVA', 'OXO', 'LEA', 'TAN', 'ZEN', 'VEC',
    'COR', 'TOR', 'LIN', 'TOR', 'NAB', 'TEX', 'LIG', 'ZIR', 'DOC', 'SIX',
  ];
  return names[idx] || 'UNK';
}

export function encrypt(message, key) {
  const blockSize = Math.floor(Number(BigInt(key.n).toString(16).length / 2));
  const padded = padMessage(Buffer.from(message, 'utf8'), blockSize);
  const m = uint8ArrayToBigInt(padded);
  if (m >= key.n) throw new Error('Message too large for modulus');
  const c = modPow(m, key.e, key.n);
  return bigIntToUint8Array(c, blockSize);
}

export function decrypt(ciphertext, key) {
  const c = uint8ArrayToBigInt(ciphertext);
  if (c >= key.n) throw new Error('Ciphertext too large for modulus');

  let m;
  if (key.p && key.q && key.dp && key.dq && key.qinv) {
    const m1 = modPow(c, key.dp, key.p);
    const m2 = modPow(c, key.dq, key.q);
    const diff = modPos(m1 - m2, key.p);
    const h = modPos(key.qinv * diff, key.p);
    m = m2 + h * key.q;
  } else {
    m = modPow(c, key.d, key.n);
  }

  const blockSize = Math.floor(Number(BigInt(key.n).toString(16).length / 2));
  const padded = bigIntToUint8Array(m, blockSize);
  return unpadMessage(padded);
}

function modPow(base, exp, mod) {
  let result = 1n;
  base %= mod;
  while (exp > 0n) {
    if (exp & 1n) result = (result * base) % mod;
    exp >>= 1n;
    base = (base * base) % mod;
  }
  return result;
}

export function serializeKey(key, includePrivate = false) {
  const obj = {
    algorithm: key.algorithm,
    callIndex: key.callIndex,
    aethyrIndex: key.aethyrIndex,
    aethyr: key.aethyr,
    enochianTag: key.enochianTag,
    bits: key.bits,
    n: key.n.toString(16),
    e: key.e.toString(16),
  };
  if (includePrivate) {
    obj.d = key.d.toString(16);
    if (key.p) obj.p = key.p.toString(16);
    if (key.q) obj.q = key.q.toString(16);
    if (key.dp) obj.dp = key.dp.toString(16);
    if (key.dq) obj.dq = key.dq.toString(16);
    if (key.qinv) obj.qinv = key.qinv.toString(16);
  }
  return JSON.stringify(obj, null, 2);
}

export function deserializeKey(jsonStr) {
  const obj = JSON.parse(jsonStr);
  const key = {
    algorithm: obj.algorithm,
    callIndex: obj.callIndex,
    aethyrIndex: obj.aethyrIndex,
    aethyr: obj.aethyr,
    enochianTag: obj.enochianTag,
    bits: obj.bits,
    n: BigInt('0x' + obj.n),
    e: BigInt('0x' + obj.e),
  };
  if (obj.d) key.d = BigInt('0x' + obj.d);
  if (obj.p) key.p = BigInt('0x' + obj.p);
  if (obj.q) key.q = BigInt('0x' + obj.q);
  if (obj.dp) key.dp = BigInt('0x' + obj.dp);
  if (obj.dq) key.dq = BigInt('0x' + obj.dq);
  if (obj.qinv) key.qinv = BigInt('0x' + obj.qinv);
  return key;
}

export function deriveChildKey(parentKey, childAethyrIndex, options = {}) {
  const combinedTag = parentKey.enochianTag + childAethyrIndex.toString();
  const childPass = crypto.createHash('sha3-256').update(combinedTag).digest('hex');
  return generateKeyPair(
    parentKey.callIndex,
    childAethyrIndex,
    parentKey.bits,
    childPass,
    { fast: true, ...options }
  );
}

export function hybridEncrypt(plaintext, rsaKey) {
  const aesKey = crypto.randomBytes(32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', aesKey, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  const wrappedKey = encrypt(aesKey.toString('base64'), rsaKey);

  const payload = JSON.stringify({
    version: 1,
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
    wrappedKey: wrappedKey.toString('base64'),
    ciphertext: encrypted.toString('base64'),
  });
  return Buffer.from(payload, 'utf8');
}

export function hybridDecrypt(payload, rsaKey) {
  const p = JSON.parse(payload.toString('utf8'));
  const wrappedKey = Buffer.from(p.wrappedKey, 'base64');
  const aesKeyB64 = decrypt(wrappedKey, rsaKey).toString('utf8');
  const aesKey = Buffer.from(aesKeyB64, 'base64');
  const iv = Buffer.from(p.iv, 'base64');
  const authTag = Buffer.from(p.authTag, 'base64');
  const encrypted = Buffer.from(p.ciphertext, 'base64');

  const decipher = crypto.createDecipheriv('aes-256-gcm', aesKey, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
}
