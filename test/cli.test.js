// Tests for the hardened CLI surface: secret resolution and the at-rest
// seal/unseal path. These cover the two defects the original CLI had — a
// secret accepted on argv, and no binary-safe file operation.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import { resolveSecret, SecretError } from '../src/secret.js';
import { seal, unseal, LAYER_NAMES } from '../src/layered-enochian.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const CLI = join(HERE, '..', 'src', 'layered-cli.js');

function tmpSecret() {
  const d = mkdtempSync(join(tmpdir(), 'qe-test-'));
  const p = join(d, 'secret');
  writeFileSync(p, randomBytes(48).toString('base64') + '\n');
  chmodSync(p, 0o600);
  return p;
}

test('resolveSecret reads a 0600 secret file and strips one trailing newline', () => {
  const p = tmpSecret();
  const s = resolveSecret({}, { QE_SECRET_FILE: p });
  assert.equal(s.endsWith('\n'), false, 'trailing newline must be stripped');
  assert.ok(s.length >= 64);
  rmSync(dirname(p), { recursive: true, force: true });
});

test('resolveSecret falls back to QE_SECRET env', () => {
  const s = resolveSecret({}, { QE_SECRET: 'from-env' });
  assert.equal(s, 'from-env');
});

test('resolveSecret throws SecretError with no source, naming the safe options', () => {
  assert.throws(() => resolveSecret({}, {}), (e) => {
    assert.ok(e instanceof SecretError);
    assert.match(e.message, /QE_SECRET_FILE/);
    assert.match(e.message, /Never pass the secret as a command-line argument/);
    return true;
  });
});

test('resolveSecret rejects an empty secret file rather than sealing with ""', () => {
  const d = mkdtempSync(join(tmpdir(), 'qe-test-'));
  const p = join(d, 'empty');
  writeFileSync(p, '\n');
  assert.throws(() => resolveSecret({}, { QE_SECRET_FILE: p }), SecretError);
  rmSync(d, { recursive: true, force: true });
});

test('CLI refuses a sealing operation when no secret source is configured', () => {
  // The CLI must exit non-zero and name the safe alternatives. Note the env
  // deliberately omits both QE_SECRET_FILE and QE_SECRET.
  assert.throws(
    () => execFileSync('node', [CLI, 'seal', '--input', 'hello'], {
      env: { PATH: process.env.PATH, HOME: process.env.HOME },
      encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
    }),
    (e) => {
      assert.notEqual(e.status, 0, 'must exit non-zero without a secret');
      assert.match(e.stderr, /No secret source/);
      assert.match(e.stderr, /Never pass the secret as a command-line argument/);
      return true;
    }
  );
});

test('seal-file / unseal-file round-trips BINARY data byte-identically', () => {
  const p = tmpSecret();
  const d = mkdtempSync(join(tmpdir(), 'qe-bin-'));
  const f = join(d, 'blob.dat');
  const data = randomBytes(8192);
  writeFileSync(f, data);

  const env = { ...process.env, QE_SECRET_FILE: p };
  execFileSync('node', [CLI, 'seal-file', '--input', f], { env, encoding: 'utf8' });
  assert.ok(existsSync(`${f}.sealed`), 'sealed file must exist');

  execFileSync('node', [CLI, 'unseal-file', '--input', `${f}.sealed`], { env, encoding: 'utf8' });
  assert.deepEqual(readFileSync(f), data, 'binary round-trip must be byte-identical');
  rmSync(d, { recursive: true, force: true });
  rmSync(dirname(p), { recursive: true, force: true });
});

test('unseal-file refuses the WRONG secret and does not write plaintext', () => {
  const good = tmpSecret();
  const bad = tmpSecret();
  const d = mkdtempSync(join(tmpdir(), 'qe-wrong-'));
  const f = join(d, 'secret-data.txt');
  const original = 'sensitive payload';
  writeFileSync(f, original);

  execFileSync('node', [CLI, 'seal-file', '--input', f, '--remove'], {
    env: { ...process.env, QE_SECRET_FILE: good }, encoding: 'utf8',
  });
  assert.equal(existsSync(f), false, '--remove must unlink the plaintext');

  assert.throws(
    () => execFileSync('node', [CLI, 'unseal-file', '--input', `${f}.sealed`], {
      env: { ...process.env, QE_SECRET_FILE: bad }, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
    }),
    (e) => {
      assert.notEqual(e.status, 0, 'wrong secret must exit non-zero');
      assert.match(e.stderr, /wrong secret, or the blob was tampered with/);
      return true;
    }
  );
  assert.equal(existsSync(f), false, 'a failed unseal must not leave plaintext behind');
  rmSync(d, { recursive: true, force: true });
  rmSync(dirname(good), { recursive: true, force: true });
  rmSync(dirname(bad), { recursive: true, force: true });
});

test('a tampered ciphertext is rejected', () => {
  const p = tmpSecret();
  const secret = resolveSecret({}, { QE_SECRET_FILE: p });
  const blob = Buffer.from(seal('original text', secret, 'ctx'), 'base64');
  blob[200] ^= 0xff;  // flip a bit in the ciphertext body
  assert.throws(() => unseal(blob.toString('base64'), secret, 'ctx'));
  rmSync(dirname(p), { recursive: true, force: true });
});

test('context is bound: a blob sealed under one context will not unseal under another', () => {
  const secret = 'ctx-test-secret';
  const blob = seal('payload', secret, 'context-a');
  assert.throws(() => unseal(blob, secret, 'context-b'),
    /unable to authenticate|Unsupported state/i);
});

test('patrol passes against a real secret file', () => {
  const p = tmpSecret();
  const out = execFileSync('node', [CLI, 'patrol'], {
    env: { ...process.env, QE_SECRET_FILE: p }, encoding: 'utf8',
  });
  assert.match(out, /PATROL OK/);
  assert.match(out, new RegExp(`${LAYER_NAMES.length}-layer`));
  rmSync(dirname(p), { recursive: true, force: true });
});
