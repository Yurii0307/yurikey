#!/system/bin/sh

SCRIPT_DIR="${0%/*}"
RESOLVE_SCRIPT="${SCRIPT_DIR%/webroot/common}/Yuri/resolve_module_path.sh"

BASE_PATH="$(sh "$RESOLVE_SCRIPT" 2>/dev/null)"
[ -z "$BASE_PATH" ] && BASE_PATH="${SCRIPT_DIR%/webroot/common}"

INFO_PATH="$BASE_PATH/webroot/json/device-info.json"

android_ver=$(getprop ro.build.version.release)
kernel_ver=$(uname -r)

# Root Implementation
if [ -d "/data/adb/magisk" ] && [ -f "/data/adb/magisk.db" ]; then
  root_type="Magisk"
elif [ -f "/data/apatch/apatch" ]; then
  root_type="Apatch"
elif [ -d "/data/adb/ksu" ] && { [ -d "/data/adb/kpm" ] || [ -f "/data/adb/ksu/.dynamic_sign" ]; }; then
  root_type="SukiSU-Ultra"
elif [ -d "/data/adb/ksu" ] && { [ -f "/data/adb/ksud" ] || [ -f "/sys/module/kernelsu/parameters/expected_manager_size" ]; }; then
  root_type="KernelSU-Next"
elif [ -d "/data/adb/ksu" ]; then
  root_type="KernelSU"
else
  root_type="Unknown"
fi

# Output JSON
cat <<EOF > "$INFO_PATH"
{
  "android": "$android_ver",
  "kernel": "$kernel_ver",
  "root": "$root_type"
}
EOF
