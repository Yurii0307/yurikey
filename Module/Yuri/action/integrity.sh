MODPATH="${0%/*}"
SCRIPT_PATH="$MODPATH/.."

for SCRIPT in \
  "kill_google_process.sh" \
  "target_txt.sh" \
  "security_patch.sh" \
  "boot_hash.sh" \
  "yuri_keybox.sh"
do
  if ! sh "$SCRIPT_PATH/$SCRIPT"; then
    echo "- Error: $SCRIPT failed. Aborting..."
    exit 1
  fi
done
  sh "$SCRIPT_PATH/pif.sh"