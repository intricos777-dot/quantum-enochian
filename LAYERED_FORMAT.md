# Quantum Enochian — Layered Format (21 Layers / 3 Triads)

Layered encryption with 21 keyed layers across 3 triads of 7, self-healing/debug wrappers, and BDE patrol.

## Triads
1. **Quantum Enochian** (layers 1–7): Root, Veil, Sigil, Aethyr, Choir, Watchtower, Seal
2. **Cypher Magick** (layers 8–14): Glyph, Charm, Hex, Ward, Talisman, Arcanum, Oracle
3. **The World Runes** (.hack//G.U. phases, layers 15–21): Skeith, Innis, Magus, Fidchell, Gorre, Macha, Tarvos

## Format
- `forward-seal` encrypts plaintext through all 21 layers in triad order
- `reverse-unseal` decrypts through all 21 layers in reverse
- Each layer uses its own name + user secret + context in key derivation
- Legacy layers 0–6 keep their original names/elements — pre-existing sealed blobs remain unsealable
- Layer keys are derived on-the-fly; no persistent key material required for normal use
- Stored personal layer keys live under `~/.quantum-enochian-layered/keys/`

## Usage
```bash
node src/layered-cli.js status
node src/layered-cli.js seal --input secret.txt --secret '<USER_SECRET>' --context 'project-x'
node src/layered-cli.js unseal --input sealed.txt --secret '<USER_SECRET>' --context 'project-x'
node src/layered-cli.js keygen --layer 4 --name 'my-mental-layer' --secret '<PERSONAL_SECRET>' --entropy /path/to/entropy-file
```

## Self-Heal / Debug / Patrol
```bash
bash scripts/self-heal-layered.sh
bash scripts/debug-layered.sh
bash scripts/bde-layered-patrol.sh
```

Run the full test suite: `node --test test/`

## Personal Layer Keys
Only you should know the mapping between layer indexes and your personal layer secrets. Record them offline and never commit them.
