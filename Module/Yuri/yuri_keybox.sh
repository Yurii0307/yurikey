#!/system/bin/sh

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
TEESIM_LIB_SOURCED=1
. "$SCRIPT_DIR/teesim_common.sh"

# Define important paths and file names
TRICKY_DIR="$TRICKY_DATA_DIR"
TEESIM_KEYBOX_DIR="$TEESIM_DATA_DIR"
REMOTE_URL="https://raw.githubusercontent.com/Yurii0307/yurikey/main/key"
BACKUP_NAME="keybox.xml.bak"
DEPENDENCY_MODULE="/data/adb/modules/tricky_store"
DEPENDENCY_MODULE_UPDATE="/data/adb/modules_update/tricky_store"
BBIN="/data/adb/Yurikey/bin"
ORG_PATH="$PATH"

log_message() {
    echo "$(date +%Y-%m-%d\ %H:%M:%S) [YURI_KEYBOX] $1"
}

tricky_present=0
if tricky_installed; then
    tricky_present=1
fi
teesim_present=0
if teesim_installed; then
    teesim_present=1
fi

if [ "$tricky_present" -eq 0 ] && [ "$teesim_present" -eq 0 ]; then
  log_message "Error: Tricky Store or TEESimulator module file not found!"
  log_message "Please install Tricky Store or TEESimulator before using Yuri Keybox."
  exit 0
fi

if [ "$tricky_present" -eq 1 ]; then
  STAGE_DIR="$TRICKY_DIR"
else
  STAGE_DIR="$TEESIM_KEYBOX_DIR"
fi
DOWNLOAD_TMP="$STAGE_DIR/.keybox_dl.tmp"
DECODE_TMP="$STAGE_DIR/.keybox_stage.xml"

cleanup() {
    rm -f "$DOWNLOAD_TMP" "$DECODE_TMP"
}
trap cleanup EXIT INT TERM

log_message "Start"

download() {
    PATH=/data/adb/magisk:/data/data/com.termux/files/usr/bin:$PATH
    if command -v curl >/dev/null 2>&1; then
        curl --connect-timeout 10 -Ls "$1"
    else
        busybox wget -T 10 --no-check-certificate -qO- "$1"
    fi
    PATH="$ORG_PATH"
}

# Download and validate the remote keybox once, into the decoded staging file.
get_keybox() {
    mkdir -p "$STAGE_DIR" || return 1

    if ! download "$REMOTE_URL" > "$DOWNLOAD_TMP" || [ ! -s "$DOWNLOAD_TMP" ]; then
        log_message "Error: Keybox download failed, please download and add it manually!"
        return 1
    fi

    if ! base64 -d < "$DOWNLOAD_TMP" > "$DECODE_TMP" 2>/dev/null || [ ! -s "$DECODE_TMP" ]; then
        log_message "Error: Base64 decode failed!"
        return 1
    fi
    rm -f "$DOWNLOAD_TMP"

    if ! grep -q "<AndroidAttestation" "$DECODE_TMP" && ! grep -q "<Keybox" "$DECODE_TMP"; then
        log_message "Error: Invalid keybox format!"
        return 1
    fi

    return 0
}

# Install the staged keybox into one backend directory.
install_keybox() {
    install_dir="$1"
    target="$install_dir/keybox.xml"
    backup="$install_dir/$BACKUP_NAME"
    backup_tmp="$backup.tmp"
    stage="$install_dir/.keybox_install.xml.$$"

    if [ -f "$target" ] && cmp -s "$target" "$DECODE_TMP"; then
        log_message "Keybox already up to date in $install_dir."
        return 0
    fi

    if [ -f "$target" ]; then
        rm -f "$backup_tmp"
        if ! cp -f "$target" "$backup_tmp" || [ ! -s "$backup_tmp" ]; then
            rm -f "$backup_tmp"
            log_message "Error: Failed to back up the keybox in $install_dir, skipping that destination."
            return 1
        fi
        if ! mv -f "$backup_tmp" "$backup"; then
            rm -f "$backup_tmp"
            log_message "Error: Failed to commit the keybox backup in $install_dir, skipping that destination."
            return 1
        fi
    fi

    if ! cp -f "$DECODE_TMP" "$stage" || [ ! -s "$stage" ]; then
        rm -f "$stage"
        log_message "Error: Failed to stage the keybox in $install_dir, skipping that destination."
        return 1
    fi

    if ! mv -f "$stage" "$target"; then
        rm -f "$stage"
        log_message "Error: Failed to install the keybox in $install_dir, skipping that destination."
        return 1
    fi

    chmod 644 "$target"
    log_message "Keybox installed in $install_dir."
    return 0
}

# Start main logic
log_message "Writing"

if ! get_keybox; then
    log_message "Error: the keybox was not updated."
    log_message "Finish"
    exit 0
fi

if [ "$tricky_present" -eq 1 ]; then
    install_keybox "$TRICKY_DIR"
fi

if [ "$teesim_present" -eq 1 ]; then
    install_keybox "$TEESIM_KEYBOX_DIR"
    # A profile names its keybox by relative path; only the single default profile is safe to
    # repoint automatically, and only when it does not already point at keybox.xml.
    teesim_apply_default_keybox
fi

log_message "Finish"
