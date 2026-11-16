#!/system/bin/sh

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
TEESIM_LIB_SOURCED=1
. "$SCRIPT_DIR/teesim_common.sh"

log_message() {
    echo "$(date +%Y-%m-%d\ %H:%M:%S) [SET_SECURITY_PATCH] $1"
}

if ! teesim_parse_args "$@"; then
    log_message "Error: --teesim-profile needs a profile name"
    exit 1
fi

log_message "Start"

sp="$TRICKY_DATA_DIR/security_patch.txt"

# Get current year / month / day
current_year=$(date +%Y) || {
    log_message "Error: Failed to get current year"
    exit 1
}

current_month=$(date +%m | sed 's/^0*//') || {
    log_message "Error: Failed to get current month"
    exit 1
}

current_day=$(date +%d | sed 's/^0*//') || {
    log_message "Error: Failed to get current day"
    exit 1
}

# Logic: Security Patch drop on the 5th.
if [ "$current_day" -lt 10 ]; then
  # Before the 5th: Use previous month
  if [ "$current_month" -eq 1 ]; then
    target_month=12
    target_year=$((current_year - 1))
  else
    target_month=$((current_month - 1))
    target_year=$current_year
  fi
else
  # On or after the 10th: Use current month
  target_month=$current_month
  target_year=$current_year
fi

# Format the target month to always have two digits (e.g., 03)
formatted_month=$(printf "%02d" "$target_month") || {
    log_message "Error: Failed to format month"
    exit 1
}

patch_date="${target_year}-${formatted_month}-05"

log_message "Writing"

tricky_updated=0
if tricky_installed; then
    # Write correct Trickystore format
    cat > "$sp" <<EOF
system=prop
boot=$patch_date
vendor=$patch_date
EOF

    if [ $? -ne 0 ]; then
        log_message "Error: Failed to write $sp"
        exit 1
    fi
    tricky_updated=1
else
    log_message "Tricky Store is not installed, so $sp was left alone."
fi

# TEESimulator keeps its own per-profile patch level; the same date applies to both backends.
teesim_failure=""
teesim_select_profile
teesim_rc=$?
case "$teesim_rc" in
    0)
        teesim_apply_patch "$TEESIM_SELECTED" "$patch_date"
        teesim_rc=$?
        case "$teesim_rc" in
            0|10) ;;
            # An apply-stage 3 (module or config gone since selection) is a deliberate no-op;
            # 5 is a concurrent config change and stays a failure.
            3) ;;
            *) teesim_failure="the TEESimulator patch level was not updated" ;;
        esac
        ;;
    3)
        ;;
    5)
        log_message "TEESimulator patch level was skipped because no profile was selected."
        ;;
    *)
        teesim_failure="the TEESimulator profile could not be selected"
        ;;
esac

teesim_cleanup_tmp

if [ -n "$teesim_failure" ]; then
    if [ "$tricky_updated" -eq 1 ]; then
        log_message "Error: $sp was updated, but $teesim_failure."
    else
        log_message "Error: $teesim_failure."
    fi
    exit 1
fi

log_message "Finish"
