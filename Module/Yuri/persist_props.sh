#!/system/bin/sh
# persist_props.sh — Backend CLI for Persistent Property Editor

DIFF_FILE="/data/adb/Yurikey/persist_props.diff"
mkdir -p "/data/adb/Yurikey"

ACTION="$1"
PROP_NAME="$2"
PROP_VAL="$3"
TAB=$(printf '\t')

NEWLINE='
'
fail_invalid() {
  echo '{"success": false, "error": "Invalid property argument"}'
  exit 1
}
invalid_name() {
  case "$1" in
    *"="*) fail_invalid ;;
    *"$NEWLINE"*) fail_invalid ;;
  esac
}
invalid_value() {
  case "$1" in
    *"$NEWLINE"*) fail_invalid ;;
  esac
}

json_escape() {
  printf '%s' "$1" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g' -e "s/${TAB}/\\\\t/g"
}

remove_disabled_entry() {
  [ -f "$DIFF_FILE" ] || return 0
  tmp="${DIFF_FILE}.tmp"
  : > "$tmp"
  while IFS= read -r entry; do
    case "$entry" in
      "DISABLED:$1="*) ;;
      *) printf '%s\n' "$entry" >> "$tmp" ;;
    esac
  done < "$DIFF_FILE"
  mv -f "$tmp" "$DIFF_FILE"
}

get_disabled_value() {
  [ -f "$DIFF_FILE" ] || return 1
  found=""
  while IFS= read -r entry; do
    case "$entry" in
      "DISABLED:$1="*) found="$entry" ;;
    esac
  done < "$DIFF_FILE"
  [ -n "$found" ] || return 1
  prefix="DISABLED:$1="
  printf '%s' "${found#"$prefix"}"
}

case "$ACTION" in
  list)
    LIST_TMP="${DIFF_FILE}.list.tmp"
    NAMES_TMP="${DIFF_FILE}.names.tmp"
    : > "$LIST_TMP"
    : > "$NAMES_TMP"

    getprop | grep -E '^\[persist\.' | while IFS= read -r line; do
      key=$(printf '%s\n' "$line" | sed -E 's/^\[([^]]+)\]:.*$/\1/')
      val=$(printf '%s\n' "$line" | sed -E 's/^\[[^]]+\]: \[(.*)\]$/\1/')
      printf 'false%s%s%s%s\n' "$TAB" "$key" "$TAB" "$val" >> "$LIST_TMP"
      printf '%s\n' "$key" >> "$NAMES_TMP"
    done

    if [ -f "$DIFF_FILE" ]; then
      while IFS= read -r entry; do
        case "$entry" in
          "DISABLED:"*"="*)
            rest=${entry#DISABLED:}
            key=${rest%%=*}
            val=${rest#*=}
            grep -Fxq "$key" "$NAMES_TMP" && continue
            printf 'true%s%s%s%s\n' "$TAB" "$key" "$TAB" "$val" >> "$LIST_TMP"
            ;;
        esac
      done < "$DIFF_FILE"
    fi

    echo "["
    first=1
    while IFS= read -r line; do
      [ -z "$line" ] && continue
      disabled=${line%%"$TAB"*}
      rest=${line#*"$TAB"}
      key=${rest%%"$TAB"*}
      val=${rest#*"$TAB"}
      if [ "$first" -eq 0 ]; then
        printf ',\n'
      fi
      first=0
      printf '  {"name": "%s", "value": "%s", "disabled": %s}' \
        "$(json_escape "$key")" "$(json_escape "$val")" "$disabled"
    done < "$LIST_TMP"
    echo ""
    echo "]"
    rm -f "$LIST_TMP" "$NAMES_TMP"
    ;;

  set)
    if [ -z "$PROP_NAME" ]; then
      echo '{"success": false, "error": "Missing property name"}'
      exit 1
    fi
    invalid_name "$PROP_NAME"
    invalid_value "$PROP_VAL"
    if ! resetprop "$PROP_NAME" "$PROP_VAL"; then
      echo '{"success": false, "error": "resetprop failed"}'
      exit 1
    fi
    remove_disabled_entry "$PROP_NAME"
    echo '{"success": true}'
    ;;

  disable)
    if [ -z "$PROP_NAME" ]; then
      echo '{"success": false, "error": "Missing property name"}'
      exit 1
    fi
    invalid_name "$PROP_NAME"
    cur_val=$(getprop "$PROP_NAME")
    if ! resetprop --delete "$PROP_NAME"; then
      echo '{"success": false, "error": "Failed to delete property"}'
      exit 1
    fi
    if [ -n "$cur_val" ]; then
      remove_disabled_entry "$PROP_NAME"
      printf 'DISABLED:%s=%s\n' "$PROP_NAME" "$cur_val" >> "$DIFF_FILE"
    elif ! get_disabled_value "$PROP_NAME" >/dev/null; then
      printf 'DISABLED:%s=\n' "$PROP_NAME" >> "$DIFF_FILE"
    fi
    echo '{"success": true}'
    ;;

  enable)
    if [ -z "$PROP_NAME" ]; then
      echo '{"success": false, "error": "Missing property name"}'
      exit 1
    fi
    invalid_name "$PROP_NAME"
    if ! orig_val=$(get_disabled_value "$PROP_NAME"); then
      echo '{"success": true}'
      exit 0
    fi
    if ! resetprop "$PROP_NAME" "$orig_val"; then
      echo '{"success": false, "error": "resetprop failed"}'
      exit 1
    fi
    remove_disabled_entry "$PROP_NAME"
    echo '{"success": true}'
    ;;

  delete)
    if [ -z "$PROP_NAME" ]; then
      echo '{"success": false, "error": "Missing property name"}'
      exit 1
    fi
    invalid_name "$PROP_NAME"
    resetprop --delete "$PROP_NAME"
    remove_disabled_entry "$PROP_NAME"
    echo '{"success": true}'
    ;;

  *)
    echo "Usage: persist_props.sh {list|set <name> <val>|disable <name>|enable <name>|delete <name>}"
    exit 1
    ;;
esac
