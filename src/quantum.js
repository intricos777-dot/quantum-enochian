import crypto from 'node:crypto';

const SMALL_PRIMES = [
  2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47,
  53, 59, 61, 67, 71, 73, 79, 83, 89, 97, 101, 103, 107,
  109, 113, 127, 131, 137, 139, 149, 151, 157, 163, 167,
  173, 179, 181, 191, 193, 197, 199, 211, 223, 227, 229,
  233, 239, 241, 251,
];

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

function randomBigInt(min, max) {
  const range = max - min;
  const bytes = Math.ceil(range.toString(16).length / 2);
  const buf = crypto.randomBytes(bytes);
  let result = BigInt('0x' + buf.toString('hex'));
  result = min + (result % (range + 1n));
  if (result < 2n) result = 2n;
  return result;
}

function isProbablePrime(n, k = 20) {
  if (n < 2n) return false;
  if (n < 4n) return true;
  if (n % 2n === 0n) return false;

  for (const p of SMALL_PRIMES) {
    if (n % BigInt(p) === 0n) return false;
  }

  const targetWitnesses = n < 341550071728321n
    ? [2n, 3n, 5n, 7n, 11n, 13n, 17n]
    : [];

  let d = n - 1n;
  let s = 0n;
  while (d % 2n === 0n) {
    d /= 2n;
    s += 1n;
  }

  const witnesses = targetWitnesses.length > 0 ? targetWitnesses : [];
  const iterCount = witnesses.length > 0 ? witnesses.length : k;

  for (let i = 0; i < iterCount; i++) {
    const a = i < witnesses.length ? witnesses[i] : randomBigInt(2n, n - 2n);
    let x = modPow(a, d, n);
    if (x === 1n || x === n - 1n) continue;
    let cont = false;
    for (let r = 1n; r < s; r++) {
      x = modPow(x, 2n, n);
      if (x === n - 1n) {
        cont = true;
        break;
      }
    }
    if (!cont) return false;
  }
  return true;
}

function generatePrimeCandidate(bits, seed) {
  const bytes = Math.ceil(bits / 8);
  let candidate;
  const entropy = crypto.randomBytes(bytes);

  if (seed) {
    const mixed = Buffer.alloc(bytes);
    for (let i = 0; i < bytes; i++) {
      mixed[i] = entropy[i] ^ seed[i % seed.length];
    }
    candidate = BigInt('0x' + mixed.toString('hex'));
  } else {
    candidate = BigInt('0x' + entropy.toString('hex'));
  }

  const highBit = 1n << BigInt(bits - 1);
  candidate |= highBit;
  candidate |= 1n;

  return candidate;
}

export function generatePrime(bits, seed = null) {
  const k = Math.min(40, Math.max(12, Math.floor(bits / 16)));
  let candidate = generatePrimeCandidate(bits, seed);

  while (!isProbablePrime(candidate, k)) {
    candidate += 2n;
    if (candidate >> BigInt(bits)) {
      candidate = (1n << BigInt(bits - 1)) | 1n;
    }
  }
  return candidate;
}

export function* superpositionPrimes(bits, seed, count = 3) {
  const seeds = [];
  for (let i = 0; i < count; i++) {
    const s = Buffer.alloc(seed ? seed.length : 32);
    for (let j = 0; j < s.length; j++) {
      s[j] = seed ? seed[j] ^ crypto.randomBytes(1)[0] : crypto.randomBytes(1)[0];
    }
    seeds.push(s);
  }

  const workers = seeds.map(s => generatePrime(bits, s));
  for (const p of workers) {
    yield p;
  }
}

export function collapse(primes) {
  const list = [...primes];
  const idx = crypto.randomInt(list.length);
  return list[idx];
}

export function generateSafePrime(bits, seed = null) {
  let q;
  let p;
  const iterLimit = 10000;

  for (let i = 0; i < iterLimit; i++) {
    const s = seed ? Buffer.from(seed) : null;
    if (s) {
      for (let j = 0; j < 8; j++) {
        s[j % s.length] ^= crypto.randomBytes(1)[0];
      }
    }
    q = generatePrime(bits - 1, s);
    p = 2n * q + 1n;
    if (isProbablePrime(p, 20)) {
      return { p, q };
    }
  }
  throw new Error('Failed to generate safe prime after ' + iterLimit + ' iterations');
}
