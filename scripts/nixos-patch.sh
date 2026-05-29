#!/usr/bin/env bash
# Patches wdio-obsidian-service binaries (chromedriver + Obsidian installer) for NixOS.
# Run from any directory: bash scripts/nixos-patch.sh
# Re-run after `npm install` or after new Obsidian versions are downloaded.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CACHE_DIR="$SCRIPT_DIR/../.obsidian-cache"

if [[ ! -d "$CACHE_DIR" ]]; then
    echo "Cache directory not found: $CACHE_DIR"
    echo "Run 'npm run test:e2e' once first so wdio-obsidian-service downloads the binaries."
    exit 1
fi

CACHE_DIR="$(realpath "$CACHE_DIR")"

NIX_PACKAGES="patchelf glib nss libxcb nspr gtk3 at-spi2-atk cups libdrm mesa libxkbcommon systemd alsa-lib"

nix-shell -p $NIX_PACKAGES --run "
set -euo pipefail

CACHE_DIR='$CACHE_DIR'

INTERP=\$(ls /nix/store/*-glibc-*/lib/ld-linux-x86-64.so.2 2>/dev/null | head -1)
echo \"Using interpreter: \$INTERP\"

RPATH=\$(echo \"\$NIX_LDFLAGS\" | tr ' ' '\n' | grep '^-L' | sed 's/-L//' | sort -u | tr '\n' ':' | sed 's/:\$//')

GBM_LIB=\$(find /nix/store -maxdepth 3 -name 'libgbm.so.1' 2>/dev/null | head -1 | xargs dirname 2>/dev/null || true)
if [[ -n \"\$GBM_LIB\" ]]; then
    RPATH=\"\${RPATH}:\${GBM_LIB}\"
fi

patch_binary() {
    local bin=\"\$1\"
    local extra_rpath=\"\${2:-}\"

    [[ -f \"\$bin\" ]] || return

    local full_rpath=\"\$RPATH\"
    [[ -n \"\$extra_rpath\" ]] && full_rpath=\"\${full_rpath}:\${extra_rpath}\"

    echo \"Patching: \$bin\"
    if ! patchelf --set-interpreter \"\$INTERP\" \"\$bin\" 2>&1; then
        echo '  SKIPPED: file busy (stop any running tests and retry)'
        return
    fi
    patchelf --set-rpath \"\$full_rpath\" \"\$bin\"

    local missing
    missing=\$(ldd \"\$bin\" 2>&1 | grep 'not found' || true)
    if [[ -n \"\$missing\" ]]; then
        echo '  WARNING: still missing libraries:'
        echo \"\$missing\" | sed 's/^/    /'
    else
        echo '  OK: all libraries resolved'
    fi
}

echo ''
echo '=== Patching chromedrivers ==='
for chromedriver in \"\$CACHE_DIR\"/electron-chromedriver/linux-x64/*/chromedriver; do
    patch_binary \"\$chromedriver\"
done

echo ''
echo '=== Patching Obsidian installers ==='
for obsidian in \"\$CACHE_DIR\"/obsidian-installer/linux-x64/*/obsidian; do
    patch_binary \"\$obsidian\" \"\$(dirname \"\$obsidian\")\"
done

echo ''
echo 'Done. All binaries patched.'
"
