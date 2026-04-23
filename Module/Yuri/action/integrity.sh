MODPATH="${0%/*}"
SCRIPT_PATH="$MODPATH/.."

if ! sh "$MODPATH/run_sequence.sh" "$SCRIPT_PATH" \
  "kill_google_process.sh" \
  "target_txt.sh" \
  "security_patch.sh" \
  "boot_hash.sh" \
  "yuri_keybox.sh" \
  "pif.sh"
then
  exit 1
fi
