#!/usr/bin/env node

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { homedir } from 'node:os';
import crypto from 'node:crypto';
import { generateKeyPair, hybridEncrypt, hybridDecrypt, serializeKey, deserializeKey } from './cipher.js';

const HOME = homedir();
const PROJECTS = resolve(HOME, 'Projects');

const TARGETS = [
  { name: 'crypto-bot .env', path: resolve(PROJECTS, 'crypto-bot/.env'), keyName: 'crypto-bot' },
  { name: 'crypto-bot .env.example', path: resolve(PROJECTS, 'crypto-bot/.env.example'), keyName: 'crypto-bot' },
  { name: 'crypto-dashboard .env', path: resolve(PROJECTS, 'crypto-dashboard/.env'), keyName: 'crypto-dashboard' },
  { name: 'himalaya-exchange .env', path: resolve(PROJECTS, 'himalaya-exchange/.env'), keyName: 'himalaya' },
  { name: 'lia-groq-bridge .env', path: resolve(PROJECTS, 'lia-groq-bridge/.env'), keyName: 'lia-bridge' },
];

const KEYS_DIR = resolve(PROJECTS, 'quantum-enochian/keys');
const ENC_DIR = resolve(PROJECTS, 'quantum-enochian/encrypted');

function deriveChildKey(parentKey, childIndex) {
  const combined = parentKey.enochianTag + childIndex.toString() + 'child-chain-v1';
  const childPass = crypto.createHash('sha3-256').update(combined).digest('hex');
  return generateKeyPair(parentKey.callIndex, childIndex, parentKey.bits, childPass, { fast: true });
}

function main() {
  if (!existsSync(KEYS_DIR)) mkdirSync(KEYS_DIR, { recursive: true });
  if (!existsSync(ENC_DIR)) mkdirSync(ENC_DIR, { recursive: true });

  console.log('Enochian RSA — System Core Encryption');
  console.log('====================================\n');

  const rootKeyPath = resolve(KEYS_DIR, 'system-root.priv.json');

  let rootKey;
  if (existsSync(rootKeyPath)) {
    rootKey = deserializeKey(readFileSync(rootKeyPath, 'utf8'));
    console.log(`Loaded existing root key: Call ${rootKey.callIndex}, Aethyr ${rootKey.aethyr} (${rootKey.bits} bits)\n`);
  } else {
    console.log('Generating system root key pair (fast mode)...');
    rootKey = generateKeyPair(0, 0, 2048, 'system-core-v1', { fast: true });
    writeFileSync(rootKeyPath, serializeKey(rootKey, true));
    writeFileSync(resolve(KEYS_DIR, 'system-root.pub.json'), serializeKey(rootKey, false));
    console.log(`  Root key generated: ${rootKey.n.toString(16).substring(0, 32)}...\n`);
  }

  console.log('Scanning target files...\n');

  for (const target of TARGETS) {
    const filePath = target.path;
    const encPath = resolve(ENC_DIR, `${target.keyName}.enc`);

    if (!existsSync(filePath)) {
      console.log(`  \u26cc ${target.name}: not found, skipping`);
      continue;
    }

    const content = readFileSync(filePath, 'utf8').trim();
    if (!content) {
      console.log(`  \u26cc ${target.name}: empty, skipping`);
      continue;
    }

    console.log(`  \u{1F510} Encrypting ${target.name} (${content.length} bytes)...`);
    const ciphertext = hybridEncrypt(content, rootKey);
    writeFileSync(encPath, ciphertext.toString('base64'));

    const decrypted = hybridDecrypt(ciphertext, rootKey);
    const match = decrypted === content;
    console.log(`     \u2192 ${encPath}`);
    console.log(`     \u2192 Verification: ${match ? 'PASS' : 'FAIL'}`);
  }

  console.log('\nGenerating project-specific child keys...\n');

  const seen = {};
  for (const target of TARGETS) {
    if (seen[target.keyName]) continue;
    seen[target.keyName] = true;

    const childAethyr = Object.keys(seen).length;
    const childPubPath = resolve(KEYS_DIR, `${target.keyName}.pub.json`);
    const childPrivPath = resolve(KEYS_DIR, `${target.keyName}.priv.json`);

    if (!existsSync(childPubPath)) {
      const childKey = deriveChildKey(rootKey, childAethyr);
      writeFileSync(childPubPath, serializeKey(childKey, false));
      writeFileSync(childPrivPath, serializeKey(childKey, true));
      console.log(`  \u{1F511} ${target.keyName}: child key at Aethyr index ${childAethyr}`);
    } else {
      console.log(`  \u26cc ${target.keyName}: child key already exists`);
    }
  }

  console.log('\n\u2705 System core encryption complete.');
  console.log(`   Root key:  ${rootKeyPath}`);
  console.log(`   Encrypted: ${ENC_DIR}/`);
  console.log(`   Child keys: ${KEYS_DIR}/`);
}

main();
