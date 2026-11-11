#!/system/bin/sh

log_message() {
    echo "$(date +%Y-%m-%d\ %H:%M:%S) [ZYGISK_NEXT] $1"
}

log_message "Start"

TARGET_FILE="/data/adb/modules/zygisksu/module.prop"
SCRIPT_FILE="/data/adb/modules/zygisksu/bin/zygiskd"
REQUIRED="1.3.0"

# Check if Zygisk Next installed
if [ ! -f "$TARGET_FILE" ]; then
  log_message "Error: Zygisk Next is not found, please install latest Zygisk Next."
  exit 1
fi

# Extract the version string
CURRENT=$(grep "^version=" "$TARGET_FILE" | cut -d'=' -f2 | cut -d' ' -f1)

# Compare versions
if [ "$(printf '%s\n%s' "$CURRENT" "$REQUIRED" | sort -V | head -n1)" != "$REQUIRED" ]; then
  log_message "Error: Zygisk Next version is too low (found $CURRENT, required $REQUIRED)."
  exit 1
fi

znctl() {
    [ -n "$1" ] && "$SCRIPT_FILE" "$@" 2>/dev/null
}

# Function to change configs
zn_configs() {
  znctl enforce-denylist just_umount
  znctl memory-type anonymous
  znctl linker builtin
}

set_zn_configs () {
  if ! zn_configs; then
    log_message "Failed to update configs!"
    return
  fi
}

# Start main logic
log_message "Writing"

if [ ! -x "$SCRIPT_FILE" ]; then
  log_message "Error: $SCRIPT_FILE is not executable or not found."
  exit 1
fi
set_zn_configs          # Begin the update process

log_message "Finish"
