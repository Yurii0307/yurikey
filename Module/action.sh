MODPATH="${0%/*}"

# Setup
set +o standalone
unset ASH_STANDALONE


# Hide Zygisk Next
/data/adb/modules/zygisksu/bin/zygiskd enforce-denylist just_umount
/data/adb/modules/zygisksu/bin/zygiskd memory-type anonymous
/data/adb/modules/zygisksu/bin/zygiskd linker builtin

# Fetch new fingerprint (Play Integrity Fix [INJECT])
PIF="/data/adb/modules/playintegrityfix"
sh $PIF/autopif_ota.sh || true
sh $PIF/autopif.sh


for SCRIPT in \
  "kill_google_process.sh" \
  "target_txt.sh" \
  "security_patch.sh" \
  "boot_hash.sh" \
  "yuri_keybox.sh" \
  "yurirka.sh"
do
  if ! sh "$MODPATH/Yuri/$SCRIPT"; then
    echo "- Error: $SCRIPT failed. Aborting..."
    exit 1
  fi
done


if [ -f /data/adb/modules_update/Yurikey/webroot/common/device-info.sh ]; then
  sh /data/adb/modules_update/Yurikey/webroot/common/device-info.sh
elif [ -f /data/adb/modules/yurikey/webroot/common/device-info.sh ]; then
  sh /data/adb/modules/yurikey/webroot/common/device-info.sh
fi

echo -e "$(date +%Y-%m-%d\ %H:%M:%S) Meets Strong Integrity with Yurikey Manager✨✨"
