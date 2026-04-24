MODPATH="${0%/*}"
SCRIPT_PATH="$MODPATH/.."

if ! sh "$MODPATH/run_sequence.sh" "$SCRIPT_PATH" \
  "hma.sh" \
  "znctl.sh"
then
  exit 1
fi
