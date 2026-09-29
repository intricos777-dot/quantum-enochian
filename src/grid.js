import crypto from 'node:crypto';
import { deriveSeed, ENOCHIAN_LETTERS } from './enochian.js';
import { generateKeyPair, serializeKey, deriveChildKey } from './cipher.js';

export const GRID_LAYERS = [
  { name: 'Earth', cell: 1, aethyrStart: 0, aethyrEnd: 2 },
  { name: 'Water', cell: 2, aethyrStart: 3, aethyrEnd: 8 },
  { name: 'Air', cell: 3, aethyrStart: 9, aethyrEnd: 14 },
  { name: 'Fire', cell: 4, aethyrStart: 15, aethyrEnd: 20 },
  { name: 'Spirit', cell: 5, aethyrStart: 21, aethyrEnd: 29 },
];

export function buildGrid(callIndex, passphrase = '', bits = 2048) {
  const grid = {
    algorithm: 'Enochian-Grid',
    callIndex,
    layers: {},
    generatedAt: new Date().toISOString(),
  };

  for (const layer of GRID_LAYERS) {
    const layerKeys = [];
    for (let a = layer.aethyrStart; a <= layer.aethyrEnd; a++) {
      const key = generateKeyPair(callIndex, a, bits, passphrase + layer.name, { fast: true });
      layerKeys.push({
        aethyrIndex: a,
        aethyr: key.aethyr,
        public: {
          n: key.n.toString(16),
          e: key.e.toString(16),
          enochianTag: key.enochianTag,
        },
        private: {
          d: key.d.toString(16),
        },
      });
    }
    grid.layers[layer.name] = {
      cell: layer.cell,
      aethyrs: layerKeys,
      signature: signLayer(layerKeys, passphrase, layer.name),
    };
  }

  return grid;
}

function signLayer(keys, passphrase, layerName) {
  const concat = keys.map(k => k.public.n + k.public.e).join('');
  const material = concat + passphrase + layerName;
  return crypto.createHash('sha3-512').update(material).digest('hex');
}

export function generateGridVault(callIndex, passphrase = '', bits = 2048) {
  const masterKey = generateKeyPair(callIndex, 0, bits, passphrase, { fast: true });
  const grid = buildGrid(callIndex, passphrase, bits);

  const vault = {
    name: `Enochian Vault — Call ${callIndex}`,
    masterFingerprint: crypto.createHash('sha256')
      .update(masterKey.n.toString())
      .digest('hex')
      .substring(0, 16),
    grid,
    childChains: {},
  };

  return vault;
}

export function addChildChain(vault, name, fromLayer, fromAethyr, toLayer, toAethyr) {
  const parentKey = generateKeyPair(vault.grid.callIndex, fromAethyr, 1024, '', { fast: true });
  const childKey = deriveChildKey(parentKey, toAethyr);

  if (!vault.childChains[name]) {
    vault.childChains[name] = [];
  }

  vault.childChains[name].push({
    from: { layer: fromLayer, aethyr: fromAethyr },
    to: { layer: toLayer, aethyr: toAethyr },
    childFingerprint: crypto.createHash('sha256')
      .update(childKey.n.toString())
      .digest('hex')
      .substring(0, 16),
  });

  return vault;
}
