#!/system/bin/sh

LOG_TAG="$1"
ACTION="$2"
shift 2

if [ -z "$LOG_TAG" ] || [ -z "$ACTION" ] || [ "$#" -eq 0 ]; then
  echo "- Error: Missing package action arguments."
  exit 1
fi

log_message() {
  echo "$(date +%Y-%m-%d\ %H:%M:%S) [$LOG_TAG] $1"
}

run_action() {
  pkg="$1"

  if ! am force-stop "$pkg" >/dev/null 2>&1; then
    log_message "Error: Failed to force-stop $pkg"
    exit 1
  fi

  case "$ACTION" in
    clear-data)
      if ! pm clear "$pkg" >/dev/null 2>&1; then
        log_message "Error: Failed to clear data for $pkg"
        exit 1
      fi
      ;;
    trim-cache)
      if ! cmd package trim-caches 0 "$pkg" >/dev/null 2>&1; then
        log_message "Error: Failed to clear cache for $pkg"
        exit 1
      fi
      ;;
    *)
      log_message "Error: Unsupported action $ACTION"
      exit 1
      ;;
  esac
}

log_message "Start"
log_message "Writing"

for pkg in "$@"; do
  run_action "$pkg"
done

log_message "Finish"
