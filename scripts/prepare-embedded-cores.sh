#!/usr/bin/env sh
set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
SERVER_DIR="$ROOT_DIR/FastProxy-Server"
EMBED_DIR="$SERVER_DIR/internal/core/embedded_binaries"
CACHE_DIR="$ROOT_DIR/build/cache/embedded-cores"

TARGET_GOOS="${GOOS:-$(go env GOOS)}"
TARGET_GOARCH="${GOARCH:-$(go env GOARCH)}"
TARGET_GO386="${GO386:-sse2}"
TARGET_GOARM="${GOARM:-7}"
TARGET_VARIANT="${FASTPROXY_TARGET_VARIANT:-standard}"
MIHOMO_VERSION="${MIHOMO_VERSION:-v1.19.27}"
SING_BOX_VERSION="${SING_BOX_VERSION:-v1.13.14}"
SING_BOX_ASSET_VERSION=${SING_BOX_VERSION#v}

case "$TARGET_GOOS/$TARGET_GOARCH" in
	darwin/amd64|darwin/arm64|linux/386|linux/amd64|linux/arm|linux/arm64|windows/amd64|windows/arm64) ;;
	*)
		printf 'Unsupported embedded core target %s/%s\n' "$TARGET_GOOS" "$TARGET_GOARCH" >&2
		exit 1
		;;
esac

case "$TARGET_GOOS/$TARGET_GOARCH" in
	linux/386)
		case "$TARGET_GO386" in
			sse2|softfloat) ;;
			*)
				printf 'Unsupported GO386 value %s\n' "$TARGET_GO386" >&2
				exit 1
				;;
		esac
		;;
	linux/arm)
		case "$TARGET_GOARM" in
			5|6|7) ;;
			*)
				printf 'Unsupported GOARM value %s\n' "$TARGET_GOARM" >&2
				exit 1
				;;
		esac
		;;
esac

tmpdir=$(mktemp -d)
cleanup() {
	rm -rf "$tmpdir"
}
trap cleanup EXIT INT TERM

mkdir -p "$EMBED_DIR" "$CACHE_DIR"
rm -f "$EMBED_DIR"/mihomo-*.gz "$EMBED_DIR"/sing-box-*.gz

download() {
	download_url=$1
	download_output=$2
	cache_file="$CACHE_DIR/$(basename "$download_output")"
	cache_ok="$cache_file.ok"
	if [ -s "$cache_file" ] && [ -f "$cache_ok" ]; then
		cp "$cache_file" "$download_output"
		return
	fi
	curl -fL --retry 5 --retry-delay 2 --retry-all-errors --connect-timeout 20 -C - -o "$cache_file" "$download_url"
	touch "$cache_ok"
	cp "$cache_file" "$download_output"
}

prepare_mihomo() {
	mihomo_output="$EMBED_DIR/mihomo-$TARGET_GOOS-$TARGET_GOARCH.gz"
	mihomo_base="https://github.com/MetaCubeX/mihomo/releases/download/$MIHOMO_VERSION"

	case "$TARGET_GOOS/$TARGET_GOARCH" in
		windows/*)
			mihomo_asset="mihomo-windows-$TARGET_GOARCH-$MIHOMO_VERSION.zip"
			download "$mihomo_base/$mihomo_asset" "$tmpdir/$mihomo_asset"
			python3 - "$tmpdir/$mihomo_asset" "$tmpdir/mihomo" <<'PY'
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
		linux/386)
			if [ "$TARGET_GO386" = "softfloat" ]; then
				mihomo_asset="mihomo-linux-386-softfloat-$MIHOMO_VERSION.gz"
			else
				mihomo_asset="mihomo-linux-386-$MIHOMO_VERSION.gz"
			fi
			download "$mihomo_base/$mihomo_asset" "$tmpdir/$mihomo_asset"
			gzip -cd "$tmpdir/$mihomo_asset" > "$tmpdir/mihomo"
			;;
		linux/amd64)
			mihomo_asset="mihomo-linux-amd64-compatible-$MIHOMO_VERSION.gz"
			download "$mihomo_base/$mihomo_asset" "$tmpdir/$mihomo_asset"
			gzip -cd "$tmpdir/$mihomo_asset" > "$tmpdir/mihomo"
			;;
		linux/arm)
			mihomo_asset="mihomo-linux-armv$TARGET_GOARM-$MIHOMO_VERSION.gz"
			download "$mihomo_base/$mihomo_asset" "$tmpdir/$mihomo_asset"
			gzip -cd "$tmpdir/$mihomo_asset" > "$tmpdir/mihomo"
			;;
		*)
			mihomo_asset="mihomo-$TARGET_GOOS-$TARGET_GOARCH-$MIHOMO_VERSION.gz"
			download "$mihomo_base/$mihomo_asset" "$tmpdir/$mihomo_asset"
			gzip -cd "$tmpdir/$mihomo_asset" > "$tmpdir/mihomo"
			;;
	esac
	chmod +x "$tmpdir/mihomo"
	gzip -c "$tmpdir/mihomo" > "$mihomo_output"
}

prepare_sing_box() {
	sing_box_output="$EMBED_DIR/sing-box-$TARGET_GOOS-$TARGET_GOARCH.gz"
	case "$TARGET_GOOS/$TARGET_GOARCH" in
		linux/386)
			if [ "$TARGET_GO386" = "softfloat" ]; then
				sing_box_target="linux-386-softfloat"
			else
				sing_box_target="linux-386-musl"
			fi
			;;
		linux/amd64)
			sing_box_target="linux-amd64-musl"
			;;
		linux/arm)
			if [ "$TARGET_VARIANT" = "openwrt" ] && [ "$TARGET_GOARM" = "7" ]; then
				sing_box_target="linux-armv7-musl"
			else
				sing_box_target="linux-armv$TARGET_GOARM"
			fi
			;;
		linux/arm64)
			if [ "$TARGET_VARIANT" = "openwrt" ]; then
				sing_box_target="linux-arm64-musl"
			else
				sing_box_target="linux-arm64"
			fi
			;;
		*)
			sing_box_target="$TARGET_GOOS-$TARGET_GOARCH"
			;;
	esac
	if [ "$TARGET_GOOS" = "windows" ]; then
		sing_box_asset="sing-box-$SING_BOX_ASSET_VERSION-$sing_box_target.zip"
	else
		sing_box_asset="sing-box-$SING_BOX_ASSET_VERSION-$sing_box_target.tar.gz"
	fi
	sing_box_url="https://github.com/SagerNet/sing-box/releases/download/$SING_BOX_VERSION/$sing_box_asset"
	download "$sing_box_url" "$tmpdir/$sing_box_asset"
	if [ "$TARGET_GOOS" = "windows" ]; then
		python3 - "$tmpdir/$sing_box_asset" "$tmpdir/sing-box.exe" <<'PY'
import sys, zipfile
archive, output = sys.argv[1:]
with zipfile.ZipFile(archive) as zf:
    names = [name for name in zf.namelist() if name.lower().endswith("sing-box.exe")]
    if not names:
        raise SystemExit("sing-box binary not found in zip")
    with zf.open(names[0]) as src, open(output, "wb") as dst:
        dst.write(src.read())
PY
	else
		tar -xzf "$tmpdir/$sing_box_asset" -C "$tmpdir"
	fi
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
