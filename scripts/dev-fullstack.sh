#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
SERVER_DIR="$ROOT_DIR/FastProxy-Server"
BACKEND_ADDR="${FASTPROXY_SERVER_ADDR:-127.0.0.1:43171}"
BACKEND_PROXY_TARGET="${FASTPROXY_SERVER_PROXY_TARGET:-http://$BACKEND_ADDR}"
STATUS_DIR=$(mktemp -d "${TMPDIR:-/tmp}/fastproxy-dev.XXXXXX")
VITE_CACHE_DIR="${VITE_CACHE_DIR:-$STATUS_DIR/vite-cache}"

pids=()

cleanup() {
	local status=$?
	trap - EXIT INT TERM

	for pid in "${pids[@]}"; do
		if kill -0 "$pid" 2>/dev/null; then
			pkill -TERM -P "$pid" 2>/dev/null || true
			kill -TERM "$pid" 2>/dev/null || true
		fi
	done

	for pid in "${pids[@]}"; do
		wait "$pid" 2>/dev/null || true
	done

	rm -rf "$STATUS_DIR"
	exit "$status"
}

start_process() {
	local label=$1
	local workdir=$2
	shift 2

	(
		set +e
		cd "$workdir"
		"$@" 2>&1 | sed -u "s/^/[$label] /"
		status=${PIPESTATUS[0]}
		printf '%s\n' "$status" > "$STATUS_DIR/$label.status"
		exit "$status"
	) &

	pids+=("$!")
}

trap cleanup EXIT INT TERM

if [ ! -f "$SERVER_DIR/go.mod" ]; then
	printf 'Initializing backend submodule...\n'
	(cd "$ROOT_DIR" && git submodule update --init --recursive -- FastProxy-Server)
fi

printf 'Starting FastProxy full-stack development environment...\n'
printf '  frontend: pnpm dev\n'
printf '  backend:  FASTPROXY_SERVER_ADDR=%s go run ./cmd/fastproxy-server serve\n' "$BACKEND_ADDR"
printf '  proxy:    FASTPROXY_SERVER_PROXY_TARGET=%s\n' "$BACKEND_PROXY_TARGET"
printf '  cache:    VITE_CACHE_DIR=%s\n' "$VITE_CACHE_DIR"
printf '\nPress Ctrl+C to stop both services.\n\n'

start_process backend "$SERVER_DIR" env FASTPROXY_SERVER_ADDR="$BACKEND_ADDR" go run ./cmd/fastproxy-server serve
start_process frontend "$ROOT_DIR" env FASTPROXY_SERVER_PROXY_TARGET="$BACKEND_PROXY_TARGET" VITE_CACHE_DIR="$VITE_CACHE_DIR" pnpm dev

while true; do
	for status_file in "$STATUS_DIR"/*.status; do
		[ -e "$status_file" ] || continue
		status=$(cat "$status_file")
		service=$(basename "$status_file" .status)
		printf '\n%s exited with status %s; stopping the other service.\n' "$service" "$status" >&2
		exit "$status"
	done
	sleep 1
done
