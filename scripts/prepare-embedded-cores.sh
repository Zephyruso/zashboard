#!/usr/bin/env sh
set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
SERVER_DIR="$ROOT_DIR/FastProxy-Server"
EMBED_DIR="$SERVER_DIR/internal/core/embedded_binaries"

TARGET_GOOS="${GOOS:-$(go env GOOS)}"
TARGET_GOARCH="${GOARCH:-$(go env GOARCH)}"
MIHOMO_VERSION="${MIHOMO_VERSION:-v1.19.27}"
SING_BOX_VERSION="${SING_BOX_VERSION:-v1.13.14}"
SING_BOX_ASSET_VERSION=${SING_BOX_VERSION#v}

case "$TARGET_GOOS/$TARGET_GOARCH" in
	darwin/amd64|darwin/arm64|linux/amd64|linux/arm64|windows/amd64|windows/arm64) ;;
	*)
		printf 'Unsupported embedded core target %s/%s\n' "$TARGET_GOOS" "$TARGET_GOARCH" >&2
		exit 1
		;;
esac

tmpdir=$(mktemp -d)
cleanup() {
	rm -rf "$tmpdir"
}
trap cleanup EXIT INT TERM

mkdir -p "$EMBED_DIR"
rm -f "$EMBED_DIR"/mihomo-*.gz "$EMBED_DIR"/sing-box-*.gz

download() {
	download_url=$1
	download_output=$2
	curl -fL --retry 3 --connect-timeout 20 -o "$download_output" "$download_url"
}

prepare_mihomo() {
	mihomo_output="$EMBED_DIR/mihomo-$TARGET_GOOS-$TARGET_GOARCH.gz"
	mihomo_base="https://github.com/MetaCubeX/mihomo/releases/download/$MIHOMO_VERSION"

	case "$TARGET_GOOS" in
		windows)
			mihomo_asset="mihomo-windows-$TARGET_GOARCH-$MIHOMO_VERSION.zip"
			download "$mihomo_base/$mihomo_asset" "$tmpdir/mihomo.zip"
			python3 - "$tmpdir/mihomo.zip" "$tmpdir/mihomo" <<'PY'
import sys, zipfile
archive, output = sys.argv[1:]
with zipfile.ZipFile(archive) as zf:
    names = [name for name in zf.namelist() if name.lower().endswith(("mihomo.exe", "mihomo-windows-amd64.exe", "mihomo-windows-arm64.exe"))]
    if not names:
        raise SystemExit("mihomo binary not found in zip")
    with zf.open(names[0]) as src, open(output, "wb") as dst:
        dst.write(src.read())
PY
			;;
		*)
			if [ "$TARGET_GOOS/$TARGET_GOARCH" = "linux/amd64" ]; then
				mihomo_asset="mihomo-linux-amd64-compatible-$MIHOMO_VERSION.gz"
			else
				mihomo_asset="mihomo-$TARGET_GOOS-$TARGET_GOARCH-$MIHOMO_VERSION.gz"
			fi
			download "$mihomo_base/$mihomo_asset" "$tmpdir/mihomo.release.gz"
			gzip -cd "$tmpdir/mihomo.release.gz" > "$tmpdir/mihomo"
			;;
	esac
	chmod +x "$tmpdir/mihomo"
	gzip -c "$tmpdir/mihomo" > "$mihomo_output"
}

prepare_sing_box() {
	sing_box_output="$EMBED_DIR/sing-box-$TARGET_GOOS-$TARGET_GOARCH.gz"
	if [ "$TARGET_GOOS/$TARGET_GOARCH" = "linux/amd64" ]; then
		sing_box_asset="sing-box-$SING_BOX_ASSET_VERSION-linux-amd64-musl.tar.gz"
	else
		sing_box_asset="sing-box-$SING_BOX_ASSET_VERSION-$TARGET_GOOS-$TARGET_GOARCH.tar.gz"
	fi
	sing_box_url="https://github.com/SagerNet/sing-box/releases/download/$SING_BOX_VERSION/$sing_box_asset"
	download "$sing_box_url" "$tmpdir/sing-box.tar.gz"
	tar -xzf "$tmpdir/sing-box.tar.gz" -C "$tmpdir"
	sing_box_binary=$(find "$tmpdir" -type f \( -name sing-box -o -name sing-box.exe \) | head -n 1)
	if [ -z "$sing_box_binary" ]; then
		printf 'sing-box binary not found in %s\n' "$sing_box_asset" >&2
		exit 1
	fi
	cp "$sing_box_binary" "$tmpdir/sing-box"
	chmod +x "$tmpdir/sing-box"
	gzip -c "$tmpdir/sing-box" > "$sing_box_output"
}

printf 'Preparing embedded cores for %s/%s...\n' "$TARGET_GOOS" "$TARGET_GOARCH"
prepare_mihomo
prepare_sing_box
printf 'Embedded cores prepared in %s\n' "$EMBED_DIR"
