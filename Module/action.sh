#!/system/bin/sh
MODPATH="${0%/*}"

# only busybox ash knows this option; dash exits on it, so probe in a subshell first
if (set +o standalone) >/dev/null 2>&1; then
  set +o standalone
fi
unset ASH_STANDALONE

TEESIM_COMMON_DIR="$MODPATH/Yuri"
TEESIM_LIB_SOURCED=1
. "$TEESIM_COMMON_DIR/teesim_common.sh"

TEESIM_PROFILE=""
TEESIM_NO_SELECTION=0
if teesim_installed; then
  teesim_select_profile
  case $? in
    0)
      TEESIM_PROFILE="$TEESIM_SELECTED"
      export TEESIM_PROFILE
      ;;
    3)
      ;;
    *)
      TEESIM_NO_SELECTION=1
      export TEESIM_NO_SELECTION
      ;;
  esac
fi
teesim_cleanup_tmp
export TEESIM_DATA_DIR TEESIM_MODULES_DIR TEESIM_MODULES_UPDATE_DIR TRICKY_DATA_DIR

for SCRIPT in \
  "kill_google_process.sh" \
  "target_txt.sh" \
  "security_patch.sh" \
  "boot_hash.sh" \
  "yuri_keybox.sh" \
  "pif.sh"
do
  if ! sh "$MODPATH/Yuri/$SCRIPT"; then
    echo "- Error: $SCRIPT failed. Aborting..."
    exit 1
  fi
done

if [ -f "$MODPATH/webroot/common/device-info.sh" ]; then
  sh "$MODPATH/webroot/common/device-info.sh"
fi

echo -e "$(date +%Y-%m-%d\ %H:%M:%S) Meets Strong Integrity with Yurikey Manager✨✨"
