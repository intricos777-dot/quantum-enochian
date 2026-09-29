#!/usr/bin/env node
// Secret sourcing for the layered CLI.
//
// The original CLI took --secret on argv, which leaks the secret into `ps`
// output for every process on the box and into shell history. This resolves it
// from, in order of preference:
//
//   1. $QE_SECRET_FILE   — path to a 0600 file holding the secret
//   2. $QE_SECRET        — environment variable (still visible to /proc/<pid>
//                          environ of same-uid processes, so it is a fallback)
//   3. --secret-file     — explicit path, same rules as (1)
//
// There is deliberately NO --secret <value> flag. A literal secret on argv is
// the one form that is always wrong.
import { readFileSync, statSync } from 'node:fs';

export class SecretError extends Error {}

export function resolveSecret(opts = {}, env = process.env) {
  const path = opts['secret-file'] || env.QE_SECRET_FILE;

  if (path) {
    let raw;
    try {
      raw = readFileSync(path, 'utf8');
    } catch (e) {
      throw new SecretError(`Cannot read secret file ${path}: ${e.message}`);
    }
    // A trailing newline is the normal result of `echo secret > file` and is
    // almost never intended to be part of the secret. Strip exactly one.
    const secret = raw.replace(/\n$/, '');
    if (!secret) {
      throw new SecretError(`Secret file ${path} is empty`);
    }
    if (env.QE_WARN_FILE_PERMS !== '0') {
      warnIfWorldReadable(path);
    }
    return secret;
  }

  if (env.QE_SECRET) {
    return env.QE_SECRET;
  }

  throw new SecretError(
    'No secret source. Set QE_SECRET_FILE=/path/to/0600-file, or export QE_SECRET.\n' +
    'Never pass the secret as a command-line argument — it is visible in `ps` to every user.'
  );
}

function warnIfWorldReadable(path) {
  try {
    const mode = statSync(path).mode & 0o777;
    if (mode & 0o077) {
      process.stderr.write(
        `WARNING: ${path} is mode ${mode.toString(8).padStart(4, '0')} — readable by ` +
        `group/other. Run: chmod 600 ${path}\n`
      );
    }
  } catch {
    // Non-fatal: the secret still loaded, we just could not stat the file.
  }
}
