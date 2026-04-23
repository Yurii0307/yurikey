MODPATH="${0%/*}"
RESOLVE_SCRIPT="$MODPATH/Yuri/resolve_module_path.sh"

if ! sh "$MODPATH/Yuri/action/run_sequence.sh" "$MODPATH/Yuri" \
  "integrity.sh" \
  "root.sh"
then
  exit 1
fi

DEVICE_INFO_SCRIPT="$(sh "$RESOLVE_SCRIPT" "webroot/common/device-info.sh" 2>/dev/null)"
if [ -n "$DEVICE_INFO_SCRIPT" ] && [ -f "$DEVICE_INFO_SCRIPT" ]; then
  sh "$DEVICE_INFO_SCRIPT"
fi

echo -e "$(date +%Y-%m-%d\ %H:%M:%S) Meets Strong Integrity with Yurikey Manager✨✨"
