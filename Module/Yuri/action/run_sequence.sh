#!/system/bin/sh

BASE_PATH="$1"
shift

if [ -z "$BASE_PATH" ] || [ "$#" -eq 0 ]; then
  echo "- Error: Missing script sequence."
  exit 1
fi

for SCRIPT in "$@"; do
  if ! sh "$BASE_PATH/$SCRIPT"; then
    echo "- Error: $SCRIPT failed. Aborting..."
    exit 1
  fi
done
