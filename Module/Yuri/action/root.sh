MODPATH="${0%/*}"
SCRIPT_PATH="$MODPATH/.."

for SCRIPT in \
  "hma.sh"
do
  if ! sh "$SCRIPT_PATH/$SCRIPT"; then
    echo "- Error: $SCRIPT failed. Aborting..."
    exit 1
  fi
done
  sh "$SCRIPT_PATH/znctl.sh"