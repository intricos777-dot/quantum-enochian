#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="$(dirname "$SCRIPT_DIR")"
cd "$REPO"
echo '=== layered debug ==='
node -e "import('./src/layered-enochian.js').then(m=>console.log('format:', m.status().format, '| layers:', m.LAYER_NAMES.length, '| triads:', m.TRIADS.join(', ')))"
echo
echo '--- smoke seal/unseal ---'
TMP=$(mktemp)
TMP_OUT=$(mktemp)
HOME_TMP=$(mktemp -d)
mkdir -p "$HOME_TMP/.quantum-enochian-layered/keys" "$HOME_TMP/.quantum-enochian-layered/sealed"
ORIG_HOME="$HOME"
export HOME="$HOME_TMP"
SECRET="${QE_TEST_SECRET:-user-only-secret}"
CONTEXT='smoke-test'
echo 'plaintext' > "$TMP.in"
node "$REPO/src/layered-cli.js" seal --input "$TMP.in" --secret "$SECRET" --context "$CONTEXT" --name smoke >/dev/null
node "$REPO/src/layered-cli.js" unseal --input "$HOME_TMP/.quantum-enochian-layered/sealed/smoke.sealed" --secret "$SECRET" --context "$CONTEXT"
export HOME="$ORIG_HOME"
rm -rf "$HOME_TMP" "$TMP.in" "$TMP_OUT"
echo
echo '--- layer diagnostics ---'
LAYER_COUNT=$(node -e "import('./src/layered-enochian.js').then(m=>console.log(m.LAYER_NAMES.length))")
TRIAD_NAMES=$(node -e "import('./src/layered-enochian.js').then(m=>console.log(m.TRIADS.join(',')))")
IFS=',' read -r -a TRIADS <<< "$TRIAD_NAMES"
for i in $(seq 0 $((LAYER_COUNT - 1))); do
  info=$(node -e "import('./src/layered-enochian.js').then(m=>{const t=Math.floor($i/7);const within=$i%7+1;console.log(\`\${m.LAYER_NAMES[$i]} [\${m.LAYER_ELEMENTS[$i]}] (triad \${t+1}: \${m.TRIADS[t]}, layer \${within}/7)\`)}")
  echo "Layer $((i + 1)): ${info}"
done
