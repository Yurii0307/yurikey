#!/system/bin/sh

SCRIPT_DIR="${0%/*}"

exec sh "$SCRIPT_DIR/run_package_actions.sh" "KILL_GOOGLE" "trim-cache" \
  "com.android.vending"
