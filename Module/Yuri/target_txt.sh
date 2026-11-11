#!/system/bin/sh

log_message() {
    echo "$(date +%Y-%m-%d\ %H:%M:%S) [SET_TARGET] $1"
}

log_message "Start"

t='/data/adb/tricky_store/target.txt'
tees='/data/adb/tricky_store/tee_status'

# tee status 
teeBroken="false"
if [ -f "$tees" ]; then
    teeBroken=$(grep -E '^teeBroken=' "$tees" | cut -d '=' -f2 2>/dev/null || echo "false")
    if [ -z "$teeBroken" ]; then
        log_message "Error: Failed to parse teeBroken status"
        exit 1
    fi
fi

# add list special
rm -rf "$t"
fixed_targets="\
android
com.android.vending
com.google.android.gsf
com.google.android.gms
com.google.android.ims
io.github.vvb2060.keyattestation?
io.github.vvb2060.mahoshojo?
io.github.qwq233.keyattestation?
com.google.android.contactkeys
com.google.android.safetycore
com.google.android.apps.walletnfcrel
com.google.android.apps.nbu.paisa.user
com.reveny.nativecheck?
icu.nullptr.nativetest?
com.android.nativetest?
io.liankong.riskdetector?
me.garfieldhan.holmes?
luna.safe.luna?
com.zhenxi.hunter?
com.studio.duckdetector?
com.eltavine.duckdetector?
com.rem01gaming.disclosure?
wu.keyChain.test?
com.kikyps.crackme?
com.chunqiunativecheck?"
for entry in $fixed_targets; do
    if ! echo "$entry" >> "$t"; then
        log_message "Error: Failed to write $entry to $t"
        exit 1
    fi
done

# add list
log_message "Writing"

add_packages() {
    flag="$1"
    pkgs=$(pm list packages "$flag" 2>/dev/null | cut -d: -f2 | tr -d '\r')
    if [ -z "$pkgs" ]; then
        return 0
    fi

    if [ "$teeBroken" = "true" ]; then
        echo "$pkgs" | awk -v target_file="$t" '
            BEGIN {
                while ((getline line < target_file) > 0) {
                    sub(/\?$/, "", line);
                    seen[line] = 1;
                }
                close(target_file);
            }
            NF && !seen[$1] {
                print $1 "?"
                seen[$1] = 1;
            }
        ' >> "$t"
    else
        echo "$pkgs" | awk -v target_file="$t" '
            BEGIN {
                while ((getline line < target_file) > 0) {
                    sub(/\?$/, "", line);
                    seen[line] = 1;
                }
                close(target_file);
            }
            NF && !seen[$1] {
                print $1
                seen[$1] = 1;
            }
        ' >> "$t"
    fi
}

# add user apps
add_packages "-3"

# add system apps
add_packages "-s"

log_message "Finish"
