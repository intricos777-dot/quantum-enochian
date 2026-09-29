# quantum-enochian

21-layer authenticated encryption: **7 Enochian + 7 Cypher Magick + 7 .hack//G.U.
World rune layers**, applied as nested AES-256-GCM.

Each layer independently derives a key and seals the previous layer's output, so
a blob must be unwrapped from the inside out. Any single layer failing to
authenticate aborts the whole unseal.

| Triad | Layers | Names |
|---|---|---|
| I — quantum-enochian | 1–7 | Root, Veil, Sigil, Aethyr, Choir, Watchtower, Seal |
| II — cypher-magick | 8–14 | Glyph, Charm, Hex, Ward, Talisman, Arcanum, Oracle |
| III — world-runes | 15–21 | Skeith, Innis, Magus, Fidchell, Gorre, Macha, Tarvos |

## What the cryptography actually is

Be clear-eyed about this, because the naming is thematic:

- **Cipher: AES-256-GCM.** Standard, authenticated, sound.
- **Key derivation:** scrypt with a per-layer salt, itself derived via SHA3-512
  from a PBKDF2-SHA3 passphrase (150,000 iterations).
- **Per-layer AAD** binds the layer name, index, and caller-supplied context, so
  a blob cannot be replayed under a different context or layer identity.
- **The "quantum" in `quantum.js` is a Miller-Rabin primality tester** used for
  prime generation in the separate `cipher.js` Enochian-RSA path. It is not
  quantum cryptography and makes no quantum claims. The 21-layer path does not
  use RSA at all.
- **Layer count is not multiplicative strength.** Every layer derives from the
  same `userSecret`, so this is one secret stretched, not 21 independent keys.
  The security is AES-256-GCM plus the quality of your secret — 21 layers add
  defense in depth and format versioning, not 21× the hardness.

## Install

```bash
git clone git@github.com:intricos777-dot/quantum-enochian.git
cd quantum-enochian
npm install        # no dependencies; this just wires the bin entry
```

## Secret setup

The secret is the whole security boundary. Generate a high-entropy one and keep
it in a `0600` file:

```bash
mkdir -p ~/.config/quantum-enochian && chmod 700 ~/.config/quantum-enochian
umask 077 && head -c 48 /dev/urandom | base64 | tr -d '\n' \
  > ~/.config/quantum-enochian/secret
chmod 600 ~/.config/quantum-enochian/secret
export QE_SECRET_FILE=~/.config/quantum-enochian/secret
```

**There is deliberately no `--secret <value>` flag.** A literal secret on the
command line is visible in `ps` to every user on the machine and lands in shell
history. The CLI reads `$QE_SECRET_FILE` (preferred) or `$QE_SECRET`, and warns
if the secret file is group- or world-readable.

Losing the secret means losing the data — there is no recovery path. Back the
file up somewhere you control, separately from the ciphertext.

## Usage

```bash
qe-layered status                        # the 21 layers and their elements
qe-layered patrol                        # real round-trip against the live secret
qe-layered seal --input "text"           # -> ~/.quantum-enochian-layered/sealed/
qe-layered unseal --input <file>

qe-layered seal-file --input ./data.json            # -> data.json.sealed
qe-layered seal-file --input ./data.json --remove   # overwrite + unlink plaintext
qe-layered unseal-file --input ./data.json.sealed
```

`seal-file` round-trips through base64 internally, so **binary files are safe** —
verified with an 8 KiB random file comparing SHA-256 before and after.

## Verification

```bash
npm test          # 10/10: round-trip, context binding, wrong-secret rejection
npm run patrol    # deployment check against the real secret
```

`npm test` proves the *code*. `patrol` proves the *deployment* — it performs a
real 21-layer round-trip using the live secret file, so it fails if the secret
is missing, unreadable, or mismatched.

Wrong secret and tampered ciphertext are both rejected, and deliberately
indistinguishable: AES-GCM cannot tell "you used the wrong key" from "someone
modified this", and collapsing the two would leak information.

## License

MIT
