#!/system/bin/sh

log_message() {
    echo "$(date +%Y-%m-%d\ %H:%M:%S) [PIF] $1"
}

log_message "Start"

TARGET_FILE="/data/adb/modules/playintegrityfix"

# Check if the directory exists 
if [ ! -d "$TARGET_FILE" ]; then
    log_message "Error: Play Integrity Fix is not found, please install the latest Play Integrity Fix."
    return 1
fi

fetch_pif () {
    # Using 'sh' for better Android compatibility
    sh "$TARGET_FILE/autopif_ota.sh" || true
    sh "$TARGET_FILE/autopif.sh"
}

update_pif () {
    if ! fetch_pif; then
        log_message "Failed to update fingerprints!"
        return
    fi
}

# Start main logic
log_message "Writing"

# Ensure directory exists before proceeding
mkdir -p "$TARGET_FILE"
update_pif

log_message "Finish"
