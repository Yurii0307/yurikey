#!/system/bin/sh

# Define important paths and file names
TRICKY_DIR="/data/adb/tricky_store"
REMOTE_URL="https://raw.githubusercontent.com/Yurii0307/yurikey/main/key"
TARGET_FILE="$TRICKY_DIR/keybox.xml"
BACKUP_FILE="$TRICKY_DIR/keybox.xml.bak"
DEPENDENCY_MODULE="/data/adb/modules/tricky_store"
DEPENDENCY_MODULE_UPDATE="/data/adb/modules_update/tricky_store"

# Detailed log
log_message() {
    echo "$(date +'%Y-%m-%d %H:%M:%S') [YURI_KEYBOX] $1"
}

log_message "Start"
log_message "Writing"

# Check if Tricky Store module is installed ( required dependency )
if [ -d "$DEPENDENCY_MODULE_UPDATE" ] || [ -d "$DEPENDENCY_MODULE" ]; then
  log_message "Tricky Store installed"
else
  log_message "Error: Tricky Store module file not found!"
  log_message "Please install Tricky Store before using Yuri Keybox."
  return 0
fi

download() {
    PATH=/data/adb/magisk:/data/data/com.termux/files/usr/bin:$PATH
    if command -v curl >/dev/null 2>&1; then
        curl --connect-timeout 10 -Ls "$1"
    else
        busybox wget -T 10 --no-check-certificate -qO- "$1"
    fi
    PATH="$PATH"
}

# Function to download the remote keybox
get_keybox() {
    ping -c 1 -w 5 raw.githubusercontent.com &>/dev/null || log_message "Error: Unable to connect to raw.githubusercontent.com, please download and add keybox manually!"
    download "$REMOTE_URL" > "$TRICKY_DIR" || log_message "Error: Keybox download failed, please download and add it manually!"
    base64 -d key > "$TARGET_FILE"
}

# Function to backup the keybox file
if [ -f "$TARGET_FILE" ]; then
  mv "$TARGET_FILE" "$BACKUP_FILE"
fi

# Function to update the keybox file
update_keybox() {
  if ! get_keybox; then
    mv "$BACKUP_FILE" "$TARGET_FILE"
    log_message "Error: Update keybox failed!"
    return 0
  fi
}

# Start main logic
mkdir -p "$TRICKY_DIR" # Make sure the directory exists
update_keybox          # Begin the update process

log_message "Finish"
