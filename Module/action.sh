MODPATH="${0%/*}"

for SCRIPT in \
  "integrity.sh" \
  "root.sh"
do
  if ! sh "$MODPATH/Yuri/$SCRIPT"; then
    exit 1
  fi
done

if [ -f /data/adb/modules_update/Yurikey/webroot/common/device-info.sh ]; then
  sh /data/adb/modules_update/Yurikey/webroot/common/device-info.sh
elif [ -f /data/adb/modules/yurikey/webroot/common/device-info.sh ]; then
  sh /data/adb/modules/yurikey/webroot/common/device-info.sh
fi

echo -e "$(date +%Y-%m-%d\ %H:%M:%S) Meets Strong Integrity with Yurikey Manager✨✨"
