MODPATH="${0%/*}"

if ! sh "$MODPATH/Yuri/action/run_sequence.sh" "$MODPATH/Yuri" \
  "integrity.sh" \
  "root.sh"
then
  exit 1
fi

if [ -f /data/adb/modules_update/Yurikey/webroot/common/device-info.sh ]; then
  sh /data/adb/modules_update/Yurikey/webroot/common/device-info.sh
elif [ -f /data/adb/modules/yurikey/webroot/common/device-info.sh ]; then
  sh /data/adb/modules/yurikey/webroot/common/device-info.sh
fi

echo -e "$(date +%Y-%m-%d\ %H:%M:%S) Meets Strong Integrity with Yurikey Manager✨✨"
