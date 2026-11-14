#!/system/bin/sh

log_message() {
    echo "$(date +%Y-%m-%d\ %H:%M:%S) [KILL_GOOGLE] $1"
}

# Start
log_message "Start"

# Writing
log_message "Writing"
PKGS="com.android.vending"

for pkg in $PKGS; do
    if ! am force-stop "$pkg" >/dev/null 2>&1; then
        log_message "Error: Failed to force-stop $pkg"
        exit 1
    fi

    rm -rf "/data/data/$pkg/cache"/* "/data/user_de/0/$pkg/cache"/* 2>/dev/null || true

    cmd package clear --cache-only "$pkg" >/dev/null 2>&1 || true
done

# Finish
log_message "Finish"
