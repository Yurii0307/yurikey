#!/system/bin/sh

SUBPATH="$1"

for BASE_PATH in \
  "/data/adb/modules_update/Yurikey" \
  "/data/adb/modules/Yurikey" \
  "/data/adb/modules/yurikey"
do
  if [ -d "$BASE_PATH" ]; then
    if [ -n "$SUBPATH" ]; then
      printf '%s/%s\n' "$BASE_PATH" "$SUBPATH"
    else
      printf '%s\n' "$BASE_PATH"
    fi
    exit 0
  fi
done

exit 1
