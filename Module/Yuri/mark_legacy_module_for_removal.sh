#!/system/bin/sh

LEGACY_MODULE_PATH="/data/adb/modules/yurikey"

if [ -d "$LEGACY_MODULE_PATH" ]; then
  touch "$LEGACY_MODULE_PATH/remove"
fi
