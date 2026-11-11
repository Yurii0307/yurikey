#!/system/bin/sh

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

LD_LIBRARY_PATH=/vendor/lib64/hw "$KM_BIN" /data/local/tmp/attestation attestation true
