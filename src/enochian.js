import crypto from 'node:crypto';

export const ENOCHIAN_ALPHABET = 'AaBbCcDdEeFfGgHhIiKkLlMmNnOoPpQqRrSsTtUuXxYyZz';
export const ENOCHIAN_LETTERS = [
  { letter: 'A', value: 1, element: 'earth' },
  { letter: 'B', value: 2, element: 'earth' },
  { letter: 'C', value: 3, element: 'water' },
  { letter: 'D', value: 4, element: 'water' },
  { letter: 'E', value: 5, element: 'water' },
  { letter: 'F', value: 6, element: 'air' },
  { letter: 'G', value: 7, element: 'air' },
  { letter: 'H', value: 8, element: 'air' },
  { letter: 'I', value: 9, element: 'fire' },
  { letter: 'K', value: 10, element: 'fire' },
  { letter: 'L', value: 20, element: 'fire' },
  { letter: 'M', value: 30, element: 'spirit' },
  { letter: 'N', value: 40, element: 'spirit' },
  { letter: 'O', value: 50, element: 'spirit' },
  { letter: 'P', value: 60, element: 'earth' },
  { letter: 'Q', value: 70, element: 'water' },
  { letter: 'R', value: 80, element: 'air' },
  { letter: 'S', value: 90, element: 'fire' },
  { letter: 'T', value: 100, element: 'spirit' },
  { letter: 'U', value: 200, element: 'earth' },
  { letter: 'X', value: 300, element: 'water' },
  { letter: 'Y', value: 400, element: 'air' },
  { letter: 'Z', value: 500, element: 'spirit' },
];

const FORTY_NINE_CALLS = [
  'Ol sonf vors g,ohoo I busd bIre t\'a\'belOre',
  'Baga bIre t\'a\'belOre mire t\'a\'belOre ol sonf vors g,ohoo',
  'I busd bIre t\'a\'belOre mire t\'a\'belOre ol sonf vors g,ohoo',
  'Ol sonf vors g,ohoo I busd bIre t\'a\'belOre mire t\'a\'belOre',
  'Baga bIre t\'a\'belOre ol sonf vors g,ohoo I busd bIre t\'a\'belOre',
  'I busd bIre t\'a\'belOre ol sonf vors g,ohoo baga bIre t\'a\'belOre',
  'Ol sonf vors g,ohoo baga bIre t\'a\'belOre mire t\'a\'belOre',
  'Baga bIre t\'a\'belOre I busd bIre t\'a\'belOre ol sonf vors g,ohoo',
  'I busd bIre t\'a\'belOre mire t\'a\'belOre baga bIre t\'a\'belOre',
  'Ol sonf vors g,ohoo I busd bIre t\'a\'belOre mire t\'a\'belOre baga bIre t\'a\'belOre',
  'Baga bIre t\'a\'belOre ol sonf vors g,ohoo I busd bIre t\'a\'belOre',
  'I busd bIre t\'a\'belOre mire t\'a\'belOre ol sonf vors g,ohoo',
  'Ol sonf vors g,ohoo baga bIre t\'a\'belOre mire t\'a\'belOre',
  'Baga bIre t\'a\'belOre I busd bIre t\'a\'belOre ol sonf vors g,ohoo',
  'I busd bIre t\'a\'belOre mire t\'a\'belOre baga bIre t\'a\'belOre',
  'Ol sonf vors g,ohoo I busd bIre t\'a\'belOre mire t\'a\'belOre baga bIre t\'a\'belOre',
  'Baga bIre t\'a\'belOre ol sonf vors g,ohoo I busd bIre t\'a\'belOre',
  'I busd bIre t\'a\'belOre mire t\'a\'belOre ol sonf vors g,ohoo',
  'Ol sonf vors g,ohoo baga bIre t\'a\'belOre mire t\'a\'belOre',
  'Baga bIre t\'a\'belOre I busd bIre t\'a\'belOre ol sonf vors g,ohoo',
  'I busd bIre t\'a\'belOre mire t\'a\'belOre baga bIre t\'a\'belOre',
  'Ol sonf vors g,ohoo I busd bIre t\'a\'belOre mire t\'a\'belOre baga bIre t\'a\'belOre',
  'Baga bIre t\'a\'belOre ol sonf vors g,ohoo I busd bIre t\'a\'belOre',
  'I busd bIre t\'a\'belOre mire t\'a\'belOre ol sonf vors g,ohoo',
  'Ol sonf vors g,ohoo baga bIre t\'a\'belOre mire t\'a\'belOre',
  'Baga bIre t\'a\'belOre I busd bIre t\'a\'belOre ol sonf vors g,ohoo',
  'I busd bIre t\'a\'belOre mire t\'a\'belOre baga bIre t\'a\'belOre',
  'Ol sonf vors g,ohoo I busd bIre t\'a\'belOre mire t\'a\'belOre baga bIre t\'a\'belOre',
  'Baga bIre t\'a\'belOre ol sonf vors g,ohoo I busd bIre t\'a\'belOre',
  'I busd bIre t\'a\'belOre mire t\'a\'belOre ol sonf vors g,ohoo',
  'Ol sonf vors g,ohoo baga bIre t\'a\'belOre mire t\'a\'belOre',
  'Baga bIre t\'a\'belOre I busd bIre t\'a\'belOre ol sonf vors g,ohoo',
  'I busd bIre t\'a\'belOre mire t\'a\'belOre baga bIre t\'a\'belOre',
  'Ol sonf vors g,ohoo I busd bIre t\'a\'belOre mire t\'a\'belOre baga bIre t\'a\'belOre',
  'Baga bIre t\'a\'belOre ol sonf vors g,ohoo I busd bIre t\'a\'belOre',
  'I busd bIre t\'a\'belOre mire t\'a\'belOre ol sonf vors g,ohoo',
  'Ol sonf vors g,ohoo baga bIre t\'a\'belOre mire t\'a\'belOre',
  'Baga bIre t\'a\'belOre I busd bIre t\'a\'belOre ol sonf vors g,ohoo',
  'I busd bIre t\'a\'belOre mire t\'a\'belOre baga bIre t\'a\'belOre',
  'Ol sonf vors g,ohoo I busd bIre t\'a\'belOre mire t\'a\'belOre baga bIre t\'a\'belOre',
  'Baga bIre t\'a\'belOre ol sonf vors g,ohoo I busd bIre t\'a\'belOre',
  'I busd bIre t\'a\'belOre mire t\'a\'belOre ol sonf vors g,ohoo',
  'Ol sonf vors g,ohoo baga bIre t\'a\'belOre mire t\'a\'belOre',
  'Baga bIre t\'a\'belOre I busd bIre t\'a\'belOre ol sonf vors g,ohoo',
  'I busd bIre t\'a\'belOre mire t\'a\'belOre baga bIre t\'a\'belOre',
  'Ol sonf vors g,ohoo I busd bIre t\'a\'belOre mire t\'a\'belOre baga bIre t\'a\'belOre',
  'Baga bIre t\'a\'belOre ol sonf vors g,ohoo I busd bIre t\'a\'belOre',
  'I busd bIre t\'a\'belOre mire t\'a\'belOre ol sonf vors g,ohoo',
  'Ol sonf vors g,ohoo baga bIre t\'a\'belOre mire t\'a\'belOre',
];

export const AETHYRS = [
  'LIL', 'ARN', 'ZOM', 'PAZ', 'LIT', 'MAZ', 'DEO', 'ZID', 'ZIP', 'ZAA',
  'ZAX', 'ICH', 'LOE', 'ZIM', 'UVA', 'OXO', 'LEA', 'TAN', 'ZEN', 'VEC',
  'COR', 'TOR', 'LIN', 'TOR', 'NAB', 'TEX', 'LIG', 'ZIR', 'DOC', 'SIX',
];

const LETTER_MAP = new Map();
const LETTER_VALUES = new Map();
for (const entry of ENOCHIAN_LETTERS) {
  LETTER_MAP.set(entry.letter.toLowerCase(), entry);
  LETTER_VALUES.set(entry.letter.toLowerCase(), entry.value);
}

export function getCall(index) {
  if (index < 0 || index >= FORTY_NINE_CALLS.length) {
    throw new Error(`Call index ${index} out of range (0–48)`);
  }
  return FORTY_NINE_CALLS[index];
}

export function getAethyr(index) {
  if (index < 0 || index >= AETHYRS.length) {
    throw new Error(`Aethyr index ${index} out of range (0–29)`);
  }
  return AETHYRS[index];
}

export function hashCall(callIndex) {
  const call = getCall(callIndex);
  return crypto.createHash('sha3-256').update(call, 'utf8').digest();
}

export function deriveSeed(callIndex, aethyrIndex, passphrase = '') {
  const callHash = hashCall(callIndex);
  const aethyr = getAethyr(aethyrIndex);
  const aethyrHash = crypto.createHash('sha3-256').update(aethyr, 'utf8').digest();
  const passHash = passphrase
    ? crypto.createHash('sha3-256').update(passphrase, 'utf8').digest()
    : Buffer.alloc(32);

  const seed = Buffer.alloc(32);
  for (let i = 0; i < 32; i++) {
    seed[i] = callHash[i] ^ aethyrHash[i] ^ passHash[i];
  }
  return seed;
}

export function enochianSum(text) {
  let sum = 0n;
  for (const ch of text.toLowerCase()) {
    const val = LETTER_VALUES.get(ch);
    if (val !== undefined) sum += BigInt(val);
  }
  return sum;
}

export function letterByValue(target) {
  for (const entry of ENOCHIAN_LETTERS) {
    if (entry.value === target) return entry.letter;
  }
  return null;
}
