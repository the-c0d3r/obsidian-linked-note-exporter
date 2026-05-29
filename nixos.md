# Running e2e Tests on NixOS

NixOS doesn't use a standard FHS filesystem, so binaries downloaded by `wdio-obsidian-service` (the Obsidian installer and matching chromedriver) can't find their shared libraries and will crash.

## Quick Start

```bash
# First run (downloads binaries, will fail — that's expected):
npm run test:e2e

# Patch the downloaded binaries for NixOS:
bash scripts/nixos-patch.sh

# Now tests will work:
npm run test:e2e
```

Re-run `nixos-patch.sh` any time new Obsidian versions are downloaded (e.g. after `npm install` bumps `wdio-obsidian-service`, or after new installer versions are fetched).

## What the Script Does

`scripts/nixos-patch.sh` uses `patchelf` to fix every binary under `.obsidian-cache/`:

1. Sets the ELF interpreter to the current NixOS glibc path (`/nix/store/*-glibc-*/lib/ld-linux-x86-64.so.2`)
2. Sets the rpath to include all required Nix store library paths (glib, nss, libxcb, nspr, gtk3, mesa, etc.)
3. For the Obsidian binary specifically, also adds the installer directory itself to the rpath (for `libffmpeg.so` which ships bundled)

## `wdio.conf.mts` — Use Latest Installer

By default, `wdio-obsidian-service` uses `installerVersion: "earliest"` which downloads a very old Obsidian/Electron binary (1.5.8). On NixOS this binary crashes immediately with SIGTRAP (a Chromium `CHECK()` assertion failure in the Electron runtime).

The fix is to explicitly set `installerVersion: "latest"` in `wdio:obsidianOptions`:

```typescript
"wdio:obsidianOptions": {
    plugins: ["."],
    vault: "./.obsidian-vaults/e2e-vault",
    installerVersion: "latest",
},
```

## Diagnosing Crashes

If Obsidian crashes on startup (SIGTRAP / DevToolsActivePort never created):

```bash
# Check for coredumps
coredumpctl list | tail -5

# Get a backtrace (needs gdb)
coredumpctl debug <PID> --debugger-arguments="-batch -ex 'thread apply all bt' -ex quit"

# Check for missing libraries
ldd .obsidian-cache/obsidian-installer/linux-x64/Obsidian-*/obsidian | grep 'not found'
ldd .obsidian-cache/electron-chromedriver/linux-x64/*/chromedriver | grep 'not found'
```

Common causes:
- **Missing shared libraries** → run `nixos-patch.sh`
- **SIGTRAP with old installer** → set `installerVersion: "latest"` in `wdio.conf.mts`
- **32-bit libxcb picked up** → the script uses `NIX_LDFLAGS` which selects the correct 64-bit paths

## Chrome Flags

`--disable-gpu` is added to `goog:chromeOptions.args` in `wdio.conf.mts` to avoid GPU-related startup failures in test environments.
