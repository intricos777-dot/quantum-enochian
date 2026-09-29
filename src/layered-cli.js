#!/usr/bin/env node
// qe-layered — CLI for the 21-layer sealed format.
//
// Secret handling: resolved by src/secret.js from $QE_SECRET_FILE (preferred) or
// $QE_SECRET. There is no --secret <value> flag; a literal secret on argv is
// visible in `ps` to every user on the box.
import {
  readFileSync, writeFileSync, existsSync, mkdirSync, statSync,
  openSync, writeSync, fsyncSync, closeSync, unlinkSync,
} from 'node:fs';
import { resolve } from 'node:path';
import { seal, unseal, LAYER_NAMES, status } from './layered-enochian.js';
import { resolveSecret, SecretError } from './secret.js';

const LAYERED_DIR = resolve(process.env.HOME || '.', '.quantum-enochian-layered');
const PERSONAL_SEALS = resolve(LAYERED_DIR, 'sealed');

for (const d of [LAYERED_DIR, PERSONAL_SEALS]) {
  if (!existsSync(d)) mkdirSync(d, { recursive: true, mode: 0o700 });
}

function cmdStatus() {
  const s = status();
  console.log('Quantum Enochian Layered Format');
  console.log('================================');
  s.triads.forEach((t, i) => {
    console.log(`  Triad ${i + 1}: ${t.name}`);
    t.layers.forEach((l, j) => {
      const idx = i * 7 + j;
      console.log(`    Layer ${String(idx + 1).padStart(2)}: ${l.padEnd(11)} (${s.elements[idx]})`);
    });
  });
  console.log(`\n  ${s.layers.length} layers total. Cipher: AES-256-GCM per layer,`);
  console.log('  scrypt key derivation, PBKDF2-SHA3 150k iterations, per-layer AAD.');
}

function cmdSeal(opts) {
  const input = opts.input || opts._?.[0];
  const context = opts.context || '';
  const name = opts.name || `seal-${Date.now()}`;
  if (!input) usageExit('seal needs --input <text|file>');

  const secret = resolveSecret(opts);
  const plaintext = existsSync(resolve(input)) ? readFileSync(resolve(input), 'utf8') : input;
  const outPath = opts.out ? resolve(opts.out) : resolve(PERSONAL_SEALS, `${name}.sealed`);
  writeFileSync(outPath, seal(plaintext, secret, context), { mode: 0o600 });
  console.log(`Sealed across ${LAYER_NAMES.length} layers -> ${outPath}`);
}

function cmdUnseal(opts) {
  const input = opts.input || opts._?.[0];
  const context = opts.context || '';
  if (!input) usageExit('unseal needs --input <sealed-file|base64>');

  const secret = resolveSecret(opts);
  const blob = existsSync(resolve(input)) ? readFileSync(resolve(input), 'utf8') : input;
  const recovered = unseal(blob, secret, context);

  if (opts.out) {
    writeFileSync(resolve(opts.out), recovered, { mode: 0o600 });
    console.log(`Unsealed -> ${resolve(opts.out)}`);
  } else {
    process.stdout.write(recovered);
  }
}

// Seal a file at rest. This is the operation that actually protects data, so it
// gets a first-class command rather than a shell incantation.
function cmdSealFile(opts) {
  const path = opts.input || opts._?.[0];
  if (!path) usageExit('seal-file needs --input <path>');
  const target = resolve(path);
  if (!existsSync(target)) { console.error(`No such file: ${target}`); process.exit(1); }
  if (!statSync(target).isFile()) { console.error(`Not a regular file: ${target}`); process.exit(1); }

  const secret = resolveSecret(opts);
  const context = `file:${target}`;
  const outPath = `${target}.sealed`;
  const plaintext = readFileSync(target);

  // seal() takes a string, so round-trip via base64 to stay binary-safe.
  writeFileSync(outPath, seal(plaintext.toString('base64'), secret, context), { mode: 0o600 });

  if (opts.remove) {
    // Overwrite before unlinking. On btrfs with compression a bare rm can leave
    // data recoverable from a snapshot, so overwrite first. Best-effort: CoW
    // and wear-levelling make this a mitigation, not a guarantee.
    try {
      const fd = openSync(target, 'r+');
      try {
        writeSync(fd, Buffer.alloc(plaintext.length, 0), 0, plaintext.length, 0);
        fsyncSync(fd);
      } finally {
        closeSync(fd);
      }
    } catch { /* best effort only */ }
    unlinkSync(target);
    console.log(`Sealed ${target} -> ${outPath} (plaintext overwritten and removed)`);
  } else {
    console.log(`Sealed ${target} -> ${outPath} (plaintext kept; pass --remove to drop it)`);
  }
}

function cmdUnsealFile(opts) {
  const path = opts.input || opts._?.[0];
  if (!path) usageExit('unseal-file needs --input <path.sealed>');
  const target = resolve(path);
  if (!existsSync(target)) { console.error(`No such file: ${target}`); process.exit(1); }

  const secret = resolveSecret(opts);
  const original = target.replace(/\.sealed$/, '');
  const recovered = unseal(readFileSync(target, 'utf8'), secret, `file:${original}`);

  const outPath = opts.out ? resolve(opts.out) : original;
  writeFileSync(outPath, Buffer.from(recovered, 'base64'), { mode: 0o600 });
  console.log(`Unsealed -> ${outPath}`);
}

function cmdPatrol() {
  // The format is only trustworthy if a real round-trip works with the live
  // secret — a green unit test proves the code, not the deployment.
  const secret = resolveSecret({});
  const probe = `qe-patrol-${Date.now()}`;
  const back = unseal(seal(probe, secret, 'patrol'), secret, 'patrol');
  if (back !== probe) {
    console.error('PATROL FAILED: round-trip did not reproduce the plaintext');
    process.exit(1);
  }
  console.log(`PATROL OK: ${LAYER_NAMES.length}-layer round-trip verified against the live secret`);
}

function usageExit(msg) {
  if (msg) console.error(`ERROR: ${msg}\n`);
  console.log(`Quantum Enochian Layered Encryption — ${LAYER_NAMES.length} layers
  (7 Enochian + 7 Cypher Magick + 7 .hack//G.U. World runes), AES-256-GCM each.

Secret source (required by every command except status):
  export QE_SECRET_FILE=~/.config/quantum-enochian/secret   # 0600 file, preferred
  export QE_SECRET=...                                      # fallback, weaker

Commands:
  status                          show the 21 layers and their elements
  seal --input <text|file>         seal text or a file into the sealed store
  unseal --input <file>            recover a sealed blob
  seal-file --input <path>         seal a file at rest -> <path>.sealed [--remove]
  unseal-file --input <p.sealed>   restore a sealed file
  patrol                          verify a real round-trip against the live secret`);
  process.exit(msg ? 1 : 0);
}

function main() {
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
  try {
    switch (cmd) {
      case 'status': cmdStatus(); break;
      case 'seal': cmdSeal(opts); break;
      case 'unseal': cmdUnseal(opts); break;
      case 'seal-file': cmdSealFile(opts); break;
      case 'unseal-file': cmdUnsealFile(opts); break;
      case 'patrol': cmdPatrol(); break;
      default: usageExit();
    }
  } catch (e) {
    if (e instanceof SecretError) {
      console.error(`ERROR: ${e.message}`);
      process.exit(1);
    }
    if (/unable to authenticate|Unsupported state|authenticate data/i.test(e.message)) {
      console.error('ERROR: unseal failed — wrong secret, or the blob was tampered with.');
      console.error('       AES-256-GCM rejects both cases identically, by design.');
      process.exit(1);
    }
    throw e;
  }
}

main();
