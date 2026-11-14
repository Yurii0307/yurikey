#!/system/bin/sh

# Define important paths and file names
TRICKY_DIR="/data/adb/tricky_store"
REMOTE_URL="https://raw.githubusercontent.com/Yurii0307/yurikey/main/key"
DOWNLOAD_TMP="$TRICKY_DIR/.keybox_dl.tmp"
DECODE_TMP="$TRICKY_DIR/.keybox_stage.xml"
TARGET_FILE="$TRICKY_DIR/keybox.xml"
BACKUP_FILE="$TRICKY_DIR/keybox.xml.bak"
DEPENDENCY_MODULE="/data/adb/modules/tricky_store"
DEPENDENCY_MODULE_UPDATE="/data/adb/modules_update/tricky_store"
BBIN="/data/adb/Yurikey/bin"
ORG_PATH="$PATH"

cleanup() {
    rm -f "$DOWNLOAD_TMP" "$DECODE_TMP" "${BACKUP_FILE}.tmp"
}
trap cleanup EXIT INT TERM

log_message() {
    echo "$(date +%Y-%m-%d\ %H:%M:%S) [YURI_KEYBOX] $1"
}
log_message "Start"

# Check if Tricky Store module is installed (required dependency)
if [ ! -d "$DEPENDENCY_MODULE_UPDATE" ] && [ ! -d "$DEPENDENCY_MODULE" ]; then
  log_message "Error: Tricky Store module file not found!"
  log_message "Please install Tricky Store before using Yuri Keybox."
  exit 0
fi


download() {
    PATH=/data/adb/magisk:/data/data/com.termux/files/usr/bin:$PATH
    if command -v curl >/dev/null 2>&1; then
        curl --connect-timeout 10 -Ls "$1"
    else
        busybox wget -T 10 --no-check-certificate -qO- "$1"
    fi
    PATH="$ORG_PATH"
}

# Function to download the remote keybox
get_keybox() {
    if ! download "$REMOTE_URL" > "$DOWNLOAD_TMP" || [ ! -s "$DOWNLOAD_TMP" ]; then
        log_message "Error: Keybox download failed, please download and add it manually!"
        return 1
    fi

    if ! base64 -d "$DOWNLOAD_TMP" > "$DECODE_TMP" 2>/dev/null || [ ! -s "$DECODE_TMP" ]; then
        log_message "Error: Base64 decode failed!"
        return 1
    fi

    if ! grep -q "<AndroidAttestation" "$DECODE_TMP" && ! grep -q "<Keybox" "$DECODE_TMP"; then
        log_message "Error: Invalid keybox format!"
        return 1
    fi

    if [ -f "$TARGET_FILE" ] && cmp -s "$TARGET_FILE" "$DECODE_TMP"; then
        log_message "Keybox already up to date."
        return 0
    fi

    if [ -f "$TARGET_FILE" ]; then
        BACKUP_TMP="${BACKUP_FILE}.tmp"
        rm -f "$BACKUP_TMP"
        if ! cp -f "$TARGET_FILE" "$BACKUP_TMP" || [ ! -s "$BACKUP_TMP" ]; then
            rm -f "$BACKUP_TMP"
            log_message "Error: Failed to back up existing keybox, aborting update."
            return 1
        fi
        if ! mv -f "$BACKUP_TMP" "$BACKUP_FILE"; then
            rm -f "$BACKUP_TMP"
            log_message "Error: Failed to commit keybox backup, aborting update."
            return 1
        fi
    fi

    mv -f "$DECODE_TMP" "$TARGET_FILE"
    chmod 644 "$TARGET_FILE"
    return 0
}

# Function to update the keybox file
update_keybox() {
  if ! get_keybox; then
    log_message "Failed to fetch keybox!"
    return
  fi
}

# Start main logic
log_message "Writing"

mkdir -p "$TRICKY_DIR" # Make sure the directory exists
update_keybox          # Begin the update process

log_message "Finish"
