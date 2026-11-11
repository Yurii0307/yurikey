#!/system/bin/sh

# Check if KmInstallKeybox binary exists
KM_BIN=""
for path in /vendor/bin/KmInstallKeybox /vendor/bin/hw/KmInstallKeybox /system/vendor/bin/KmInstallKeybox; do
  if [ -f "$path" ] || [ -x "$path" ]; then
    KM_BIN="$path"
    break
  fi
done

if [ -z "$KM_BIN" ]; then
  echo "Error: KmInstallKeybox not found. Device/ROM does not support hardware keybox installation."
  exit 1
fi

# Determine script directory
SCRIPT_DIR="$(cd "$(dirname "$0")" 2>/dev/null && pwd)"
[ ! -d "$SCRIPT_DIR/FixWidevineL1" ] && SCRIPT_DIR="/data/adb/modules/Yurikey/webroot/common"

# Copy FixWidevineL1 contents to /data/local/tmp
cp -r "$SCRIPT_DIR/FixWidevineL1/"* /data/local/tmp/

# Set correct permissions
chmod 777 /data/local/tmp/FixWidevineL1.sh
chmod 777 /data/local/tmp/attestation

# Set owner and group to root:root
chown root:root /data/local/tmp/FixWidevineL1.sh
chown root:root /data/local/tmp/attestation

# Execute the script
su -c sh /data/local/tmp/FixWidevineL1.sh
