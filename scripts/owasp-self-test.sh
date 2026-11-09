#!/usr/bin/env bash
# Rule self-test: project Semgrep rules must fire on deliberate fixtures.
# Fixtures are built in a scratch tree (not committed as .js) so CodeQL stays quiet.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SCRATCH=$(mktemp -d)
trap 'rm -rf "$SCRATCH"' EXIT

mkdir -p "$SCRATCH/Jellyfin.Plugin.VrchatShare/Web"
{
  echo 'function bad() {'
  echo '  eval(window.location.hash);'
  echo '  console.log("token=" + window.__fake);'
  echo '}'
} > "$SCRATCH/Jellyfin.Plugin.VrchatShare/Web/bad-share.js"

SEMGREP_IMAGE="${SEMGREP_IMAGE:-semgrep/semgrep:1.122.0}"
RULES="$ROOT/security/semgrep"
OUT_FILE="$SCRATCH/out.json"

if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
  docker run --rm \
    -v "$SCRATCH:/src" \
    -v "$RULES:/rules:ro" \
    -w /src \
    "$SEMGREP_IMAGE" \
    semgrep scan --config /rules --json --metrics=off /src \
    > "$OUT_FILE" || true
elif command -v semgrep >/dev/null 2>&1; then
  semgrep scan --config "$RULES" --json --metrics=off "$SCRATCH" \
    > "$OUT_FILE" || true
else
  echo "Need Docker or local semgrep for owasp-self-test" >&2
  exit 1
fi

python3 - "$OUT_FILE" <<'PY'
import json, sys
path = sys.argv[1]
with open(path, encoding="utf-8") as f:
    data = json.load(f)
ids = {r.get("check_id", "") for r in data.get("results", [])}
needed = {"js-eval-on-dynamic-input", "js-log-token-or-secret"}
found = {n for n in needed if any(n in i for i in ids)}
missing = needed - found
if missing:
    print("self-test FAIL: rules did not fire:", sorted(missing), file=sys.stderr)
    print("seen:", sorted(ids), file=sys.stderr)
    sys.exit(1)
print("OWASP self-test: OK (", ", ".join(sorted(found)), ")")
PY
