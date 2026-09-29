#!/usr/bin/env bash
set -euo pipefail
REPO="$HOME/Projects/quantum-enochian"
echo '=== layered enochian self-heal ==='
node --check "$REPO/src/layered-enochian.js" >/dev/null && echo 'OK layered-enochian.js' || echo 'FAIL layered-enochian.js'
node --check "$REPO/src/layered-cli.js" >/dev/null && echo 'OK layered-cli.js' || echo 'FAIL layered-cli.js'
[ -f "$REPO/test/layered.test.js" ] && node "$REPO/test/layered.test.js" >/dev/null 2>&1 && echo 'OK layered tests' || echo 'FAIL layered tests'
[ -d "$HOME/.quantum-enochian-layered/keys" ] && echo 'OK personal key dir' || echo 'MISSING personal key dir'
