#!/system/bin/sh

log_message() {
    echo "$(date +%Y-%m-%d\ %H:%M:%S) [ZYGISK_NEXT] $1"
}

log_message "Start"

TARGET_FILE="/data/adb/modules/zygisksu/module.prop"
REQUIRED="1.3.0"

# Check if Zygisk Next installed
if [ ! -f "$TARGET_FILE" ]; then
  echo "Error: Zygisk Next is not found or file corrupted, please install latest Zygisk Next."
  return 1
fi

# Extract the version string
CURRENT=$(grep "^version=" "$FILE" | cut -d'=' -f2 | cut -d' ' -f1)

# Compare versions
if [ "$(printf '%s\n%s' "$CURRENT" "$VERSION" | sort -V | head -n1)" != "$CURRENT" ]; then
  log_messgae "Error: Zygisk Nex
  return 1
fi

znctl() {
    [ -n "$1" ] && /data/adb/modules/zygisksu/bin/zygiskd "$@" 2>/dev/null
}

log_message "Writing"

znctl enforce-denylist just_umount
znctl memory-type anonymous
znctl linker builtin

log_message "Finish"
