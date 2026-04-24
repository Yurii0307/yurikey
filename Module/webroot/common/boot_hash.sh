#!/system/bin/sh

MODPATH="${0%/*}"
YURI_SCRIPT="${MODPATH%/webroot/common}/Yuri/boot_hash.sh"

if [ -f "$YURI_SCRIPT" ]; then
  exec sh "$YURI_SCRIPT"
fi

echo "- Error: boot_hash.sh not found at $YURI_SCRIPT"
exit 1
