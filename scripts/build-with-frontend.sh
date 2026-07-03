#!/usr/bin/env sh
set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
SERVER_DIR="$ROOT_DIR/FastProxy-Server"
FRONTEND_DIST="$ROOT_DIR/dist"
EMBED_DIR="$SERVER_DIR/internal/webui/dist"
OUTPUT_PATH="${FASTPROXY_OUTPUT:-$ROOT_DIR/build/fastproxy-server}"

printf 'Building frontend assets...\n'
rm -rf "$FRONTEND_DIST"
(cd "$ROOT_DIR" && pnpm exec vite build --outDir "$FRONTEND_DIST")

printf 'Embedding frontend assets into backend...\n'
mkdir -p "$EMBED_DIR"
find "$EMBED_DIR" -mindepth 1 ! -name '.gitkeep' -exec rm -rf {} +
cp -R "$FRONTEND_DIST/." "$EMBED_DIR/"

if [ ! -f "$EMBED_DIR/index.html" ]; then
	printf 'Frontend build did not produce %s\n' "$EMBED_DIR/index.html" >&2
	exit 1
fi

printf 'Preparing embedded core binaries...\n'
"$ROOT_DIR/scripts/prepare-embedded-cores.sh"

printf 'Building backend binary...\n'
mkdir -p "$(dirname -- "$OUTPUT_PATH")"
(cd "$SERVER_DIR" && go build -o "$OUTPUT_PATH" ./cmd/fastproxy-server)

printf 'Built %s\n' "$OUTPUT_PATH"
