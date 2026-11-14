#!/system/bin/sh

# Define important paths and file names
HMA_DIR="/data/user/0/org.frknkrc44.hma_oss/files"
HMA_FILE="/data/user/0/org.frknkrc44.hma_oss/files/config.json"
REMOTE_URL="https://raw.githubusercontent.com/YurikeyDev/yurikey/refs/heads/main/config.json"
ORG_PATH="$PATH"

log_message() {
    echo "$(date +%Y-%m-%d\ %H:%M:%S) [HMA_OSS] $1"
}

download() {
    PATH=/data/adb/magisk:/data/data/com.termux/files/usr/bin:$PATH
    if command -v curl >/dev/null 2>&1; then
        curl --connect-timeout 10 -Ls "$1"
    else
        busybox wget -T 10 --no-check-certificate -qO- "$1"
    fi
    PATH="$ORG_PATH"
}

if pm list packages | grep -q org.frknkrc44.hma_oss; then
  mkdir -p "$HMA_DIR"
  download "$REMOTE_URL" > "$HMA_FILE" || log_message "Error: HMA-oss configs download failed, please download and add it manually!"
elif pm list packages | grep -q com.tsng.hidemyapplist; then
  log_message "HMA is deprecated and not supported, please use latest HMA-oss to get latest configs"
else
  log_message "Error: HMA-oss not found, please install latest HMA-oss"
  exit 1
fi

# Determine owner from app data directory
APP_DATA_DIR="/data/user/0/org.frknkrc44.hma_oss"
[ -d "$APP_DATA_DIR" ] || APP_DATA_DIR="/data/data/org.frknkrc44.hma_oss"

APP_UID=$(stat -c '%u:%g' "$APP_DATA_DIR" 2>/dev/null)
if [ -z "$APP_UID" ] || [ "$APP_UID" = "0:0" ]; then
    APP_UID=$(stat -c '%U:%G' "$APP_DATA_DIR" 2>/dev/null)
fi

if [ -n "$APP_UID" ] && [ "$APP_UID" != "0:0" ] && [ "$APP_UID" != "root:root" ]; then
    chown "$APP_UID" "$HMA_DIR" "$HMA_FILE"
    chmod 700 "$HMA_DIR"
    chmod 600 "$HMA_FILE"
else
    chmod 666 "$HMA_FILE"
fi
