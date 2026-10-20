#!/usr/bin/env bash
# Watermark: Living_Sin (intricos777-dot) + AI agents (Hermes, Lia, opencode) - collaborative work
# Copyright (c) 2026 Living Sin (intricos777-dot) + AI agents (Hermes, Lia, opencode) - collaborative work
# Licensed under Living Sin Proprietary License (LSPL-1.0)
# See LICENSE file for details.
set -euo pipefail
REPO="$HOME/Projects/quantum-enochian"
echo "=== BDE layered patrol $(date -u +%Y-%m-%dT%H:%M:%SZ) ==="
node --check "$REPO/src/layered-enochian.js" >/dev/null && echo 'OK layered cipher' || echo 'FAIL layered cipher'
node --check "$REPO/src/layered-cli.js" >/dev/null && echo 'OK layered cli' || echo 'FAIL layered cli'
node "$REPO/test/layered.test.js" >/dev/null 2>&1 && echo 'OK layered tests' || echo 'FAIL layered tests'
node "$REPO/test/run-tests.js" >/dev/null 2>&1 && echo 'OK suite' || echo 'FAIL suite'
chmod 700 "$HOME/.quantum-enochian-layered" >/dev/null 2>&1 || true
chmod 700 "$HOME/.quantum-enochian-layered/keys" >/dev/null 2>&1 || true
chmod 700 "$HOME/.quantum-enochian-layered/sealed" >/dev/null 2>&1 || true
echo '=== patrol complete ==='
