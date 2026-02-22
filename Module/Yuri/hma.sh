#!/system/bin/sh

# Define important paths and file names
HMA_DIR="/data/user/0/org.frknkrc44.hma_oss/files"
REMOTE_URL="https://raw.githubusercontent.com/YurikeyDev/yurikey/refs/heads/main/config.json"

download() {
    PATH=/data/adb/magisk:/data/data/com.termux/files/usr/bin:$PATH
    if command -v curl >/dev/null 2>&1; then
        curl --connect-timeout 10 -Ls "$1"
    else
        busybox wget -T 10 --no-check-certificate -qO- "$1"
    fi
    PATH="$PATH"
}

mkdir -p "$HMA_DIR"
ping -c 1 -w 5 raw.githubusercontent.com &>/dev/null || log_message "Error: Unable to connect to raw.githubusercontent.com, please download and add keybox manually!"
download "$REMOTE_URL" > "$HMA_DIR" || log_message "Error: Keybox download failed, please download and add it manually!"

chmod 777 /data/user/0/org.frknkrc44.hma_oss/files/config.json
chown u0_a0:u0_a0 /data/user/0/org.frknkrc44.hma_oss/files/config.json
