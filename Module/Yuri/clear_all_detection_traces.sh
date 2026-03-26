#!/system/bin/sh

remove_path() {
    [ -n "$1" ] && rm -rf "$1" 2>/dev/null
}

detector_data() {
    for p in \
    /storage/emulated/0/Android/data/*detector* \
    /storage/emulated/0/Android/data/*checker* \
    /storage/emulated/0/Android/data/*root* \
    /storage/emulated/0/Android/data/*attestation* \
    /storage/emulated/0/meow_detector.log \
    /storage/emulated/0/keybox_status.json
    do
        remove_path "$p"
    done
}

detector_obb() {
    remove_path /storage/emulated/0/Android/obb/*detector*
}

detector_media() {
    remove_path /storage/emulated/0/Android/media/*detector*
}

tool_apps_data() {
    for p in \
    /storage/emulated/0/Android/data/bin.mt.plus* \
    /storage/emulated/0/Android/data/com.omarea.vtools \
    /storage/emulated/0/Android/data/moe.shizuku.privileged.api \
    /storage/emulated/0/MT2 \
    /storage/emulated/0/com.termux \
    /storage/emulated/0/bin.mt.termux \
    /storage/emulated/0/Android/data/com.sevtinge.hyperceiler \
    /storage/emulated/0/Android/data/com.coderstory.toolkit
    do
        remove_path "$p"
    done
}

remote_control_data_apps() {
    for p in \
    /storage/emulated/0/.anydesk \
    /storage/emulated/0/Android/data/*anydesk* \
    /storage/emulated/0/Android/data/*teamviewer* \
    /storage/emulated/0/Android/data/*airdroid* \
    /storage/emulated/0/Android/data/*vysor* \
    /storage/emulated/0/Android/data/*rustdesk* \
    /storage/emulated/0/.rustdesk \
    /storage/emulated/0/rustdesk
    do
        remove_path "$p"
    done
}

system_properties() {
    remove_path /data/property
}

tmp_data() {
    rm -rf /data/local/tmp/* 2>/dev/null
    mkdir -p /data/local/tmp 2>/dev/null
}

system_data() {
    for p in \
    /data/system/graphicsstats \
    /data/system/package_cache \
    /data/system/Freezer \
    /data/system/NoActive
    do
        remove_path "$p"
    done
}

dev_paths() {
    for p in \
    /dev/memcg/scene_idle \
    /dev/memcg/scene_active \
    /dev/scene \
    /dev/cpuset/scene-daemon
    do
        remove_path "$p"
    done
}

reset_prop() {
    while [ "$(getprop sys.boot_completed)" != "1" ]; do sleep 1; done

    resetprop sys.usb.config mtp
    resetprop service.adb.root 0
    resetprop service.adb.tcp.port -- -1

    settings put global development_settings_enabled 0
    settings put global adb_enabled 0
    settings put global oem_unlock_allowed 0
    settings put global adb_wifi_enabled 0
    settings put global adb_wifi_port -- -1

    resetprop ro.debuggable 0
    resetprop ro.secure 1
    resetprop ro.adb.secure 1
    resetprop ro.build.type user
    resetprop ro.build.tags release-keys

    resetprop ro.boot.verifiedbootstate green
    resetprop ro.boot.flash.locked 1
    resetprop ro.boot.vbmeta.device_state locked

    resetprop ro.oem_unlock_supported 0
    resetprop sys.oem_unlock_allowed 0

    [ "$(getenforce 2>/dev/null)" = "Enforcing" ] && {
        resetprop ro.boot.selinux enforcing
        resetprop ro.build.selinux 1
    }

    resetprop ro.kernel.qemu 0
}

odex_files() {
    find /data/app -type f -name "*.odex" -delete 2>/dev/null
}

main() {
    detector_data
    detector_obb
    detector_media
    tool_apps_data
    remote_control_data_apps
    system_properties
    tmp_data
    system_data
    dev_paths
    reset_prop
    odex_files
}

main