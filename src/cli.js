#!/usr/bin/env node

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  generateKeyPair,
  encrypt,
  decrypt,
  serializeKey,
  deserializeKey,
  deriveChildKey,
} from './cipher.js';
import { buildGrid, generateGridVault, GRID_LAYERS } from './grid.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const KEYS_DIR = resolve(__dirname, '../keys');

if (!existsSync(KEYS_DIR)) mkdirSync(KEYS_DIR, { recursive: true });

function parseArgs() {
  const args = process.argv.slice(2);
  const cmd = args[0];
  const opts = {};

  for (let i = 1; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2);
      const val = args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true;
      opts[key] = val;
      if (val !== true) i++;
    }
  }

  return { cmd, opts };
}

function printKey(key, includePrivate) {
  console.log('+---------------------------------------------+');
  console.log(`| ${key.algorithm.padEnd(44)}|`);
  console.log(`| Call ${String(key.callIndex).padEnd(4)}  Aethyr ${key.aethyr.padEnd(4)}  ${key.bits} bits        |`);
  console.log(`| Enochian Tag: ${String(key.enochianTag).padEnd(35)}|`);
  console.log(`| n: ${key.n.toString(16).substring(0, 40)}... |`);
  console.log(`| e: ${key.e.toString(16)}                                      |`);
  if (includePrivate) {
    console.log(`| d: ${key.d.toString(16).substring(0, 40)}... |`);
    console.log(`| p: ${key.p.toString(16).substring(0, 40)}... |`);
    console.log(`| q: ${key.q.toString(16).substring(0, 40)}... |`);
  }
  console.log('+---------------------------------------------+');
}

function cmdKeygen(opts) {
  const call = parseInt(opts.call) || 0;
  const aethyr = parseInt(opts.aethyr) || 0;
  const bits = parseInt(opts.bits) || 2048;
  const pass = opts.passphrase || '';
  const name = opts.name || `key-c${call}-a${aethyr}`;

  console.log(`Generating Enochian-RSA key pair...`);
  console.log(`   Call ${call} -> Aethyr ${aethyr} (${bits} bits)`);

  const key = generateKeyPair(call, aethyr, bits, pass);
  const pubPath = resolve(KEYS_DIR, `${name}.pub.json`);
  const privPath = resolve(KEYS_DIR, `${name}.priv.json`);

  writeFileSync(pubPath, serializeKey(key, false));
  writeFileSync(privPath, serializeKey(key, true));

  printKey(key, true);
  console.log(`   Public key:  ${pubPath}`);
  console.log(`   Private key: ${privPath}`);
  return key;
}

function cmdEncrypt(opts) {
  const input = opts.input || opts._?.[0];
  const keyFile = opts.key || opts.pubkey;
  const output = opts.output || opts.out;

  if (!input || !keyFile) {
    console.error('Usage: enochian encrypt --input <file|text> --key <pubkey.json> [--output <file>]');
    process.exit(1);
  }

  const key = deserializeKey(readFileSync(resolve(keyFile), 'utf8'));
  let plaintext;

  if (existsSync(resolve(input))) {
    plaintext = readFileSync(resolve(input), 'utf8');
  } else {
    plaintext = input;
  }

  console.log(`Encrypting ${plaintext.length} bytes with ${key.aethyr} (Call ${key.callIndex})...`);
  const ciphertext = encrypt(plaintext, key);

  if (output) {
    writeFileSync(resolve(output), ciphertext.toString('base64'));
    console.log(`   Ciphertext written to: ${output}`);
  } else {
    console.log(`   Ciphertext (base64): ${ciphertext.toString('base64')}`);
  }
}

function cmdDecrypt(opts) {
  const input = opts.input || opts._?.[0];
  const keyFile = opts.key || opts.privkey;
  const output = opts.output || opts.out;

  if (!input || !keyFile) {
    console.error('Usage: enochian decrypt --input <file|base64> --key <privkey.json> [--output <file>]');
    process.exit(1);
  }

  const key = deserializeKey(readFileSync(resolve(keyFile), 'utf8'));
  let ciphertext;

  if (existsSync(resolve(input))) {
    ciphertext = Buffer.from(readFileSync(resolve(input), 'utf8').trim(), 'base64');
  } else {
    ciphertext = Buffer.from(input, 'base64');
  }

  console.log(`Decrypting ${ciphertext.length} bytes with ${key.aethyr} (Call ${key.callIndex})...`);
  const plaintext = decrypt(ciphertext, key);

  if (output) {
    writeFileSync(resolve(output), plaintext, 'utf8');
    console.log(`   Plaintext written to: ${output}`);
  } else {
    console.log(`   Plaintext: ${plaintext.toString('utf8')}`);
  }
}

function cmdGrid(opts) {
  const call = parseInt(opts.call) || 0;
  const bits = parseInt(opts.bits) || 2048;
  const pass = opts.passphrase || '';
  const name = opts.name || `vault-c${call}`;

  console.log(`Building Enochian Grid (Call ${call}, ${bits} bits)...`);
  const vault = generateGridVault(call, pass, bits);

  const vaultPath = resolve(KEYS_DIR, `${name}.vault.json`);
  writeFileSync(vaultPath, JSON.stringify(vault, null, 2));
  console.log(`   Vault written to: ${vaultPath}`);
  console.log(`   Layers: ${Object.keys(vault.grid.layers).join(', ')}`);
  for (const layer of GRID_LAYERS) {
    const l = vault.grid.layers[layer.name];
    console.log(`     ${layer.name}: ${l.aethyrs.length} keys, sig=${l.signature.substring(0, 16)}...`);
  }
}

function cmdChild(opts) {
  const parentKeyFile = opts.parent;
  const childAethyr = parseInt(opts.aethyr);
  const name = opts.name || `child-a${childAethyr}`;

  if (!parentKeyFile) {
    console.error('Usage: enochian child --parent <privkey.json> --aethyr <index> [--name <name>]');
    process.exit(1);
  }

  const parentKey = deserializeKey(readFileSync(resolve(parentKeyFile), 'utf8'));
  const childKey = deriveChildKey(parentKey, childAethyr);

  const pubPath = resolve(KEYS_DIR, `${name}.pub.json`);
  const privPath = resolve(KEYS_DIR, `${name}.priv.json`);

  writeFileSync(pubPath, serializeKey(childKey, false));
  writeFileSync(privPath, serializeKey(childKey, true));

  printKey(childKey, true);
  console.log(`   Child public key:  ${pubPath}`);
  console.log(`   Child private key: ${privPath}`);
}

function main() {
  const { cmd, opts } = parseArgs();

  switch (cmd) {
    case 'keygen':
      cmdKeygen(opts);
      break;
    case 'encrypt':
      cmdEncrypt(opts);
      break;
    case 'decrypt':
      cmdDecrypt(opts);
      break;
    case 'grid':
      cmdGrid(opts);
      break;
    case 'child':
      cmdChild(opts);
      break;
    default:
      console.log('Enochian RSA -- Quantum Cryptography Toolkit');
      console.log('');
      console.log('Usage:');
      console.log('  enochian keygen   --call <n> --aethyr <n> [--bits 2048] [--passphrase <pw>] [--name <name>]');
      console.log('  enochian encrypt  --input <file|text> --key <pubkey.json> [--output <file>]');
      console.log('  enochian decrypt  --input <file|base64> --key <privkey.json> [--output <file>]');
      console.log('  enochian grid     --call <n> [--bits 2048] [--passphrase <pw>] [--name <name>]');
      console.log('  enochian child    --parent <privkey.json> --aethyr <n> [--name <name>]');
      break;
  }
}

main();
