#!/system/bin/sh

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
TEESIM_LIB_SOURCED=1
. "$SCRIPT_DIR/teesim_common.sh"

log_message() {
    echo "$(date +%Y-%m-%d\ %H:%M:%S) [SELECT_APP] $1"
}

if ! teesim_parse_args "$@"; then
    log_message "Error: --teesim-profile needs a profile name"
    exit 1
fi

# Start
log_message "Start"

t="$TRICKY_DATA_DIR/target.txt"

TEESIM_TMP_DIR=$(teesim_tmpdir)
if [ -z "$TEESIM_TMP_DIR" ] || [ ! -d "$TEESIM_TMP_DIR" ]; then
    log_message "Error: no writable temporary directory"
    exit 1
fi
teesim_pkgs="$TEESIM_TMP_DIR/packages.$$"
: >"$teesim_pkgs"

# Writing
log_message "Writing"
tricky_present=0
if tricky_installed; then
    tricky_present=1
    mkdir -p "$(dirname "$t")"
    rm -rf "$t"
fi
# add list special
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
    if [ "$tricky_present" -eq 1 ]; then
        if ! echo "$entry" >> "$t"; then
            log_message "Error: Failed to write $entry to $t"
            rm -f "$teesim_pkgs"
            teesim_cleanup_tmp
            exit 1
        fi
    fi
    # TEESimulator has no "?" marker and rejects it in apps[], so keep the bare package name.
    teesim_entry="$entry"
    case "$teesim_entry" in
        *\?) teesim_entry="${teesim_entry%\?}" ;;
    esac
    printf '%s\n' "$teesim_entry" >>"$teesim_pkgs"
done

# TEESimulator target entries: the same names, with the Tricky Store marker stripped.
teesim_failure=""
teesim_select_profile
teesim_rc=$?
case "$teesim_rc" in
    0)
        teesim_apply_targets "$TEESIM_SELECTED" "$teesim_pkgs"
        teesim_rc=$?
        case "$teesim_rc" in
            0|10) ;;
            # An apply-stage 3 (module or config gone since selection) is a deliberate no-op;
            # 5 is a concurrent config change and stays a failure.
            3) ;;
            *) teesim_failure="the TEESimulator apps were not updated" ;;
        esac
        ;;
    3)
        ;;
    5)
        log_message "TEESimulator apps were left alone because no profile was selected."
        ;;
    *)
        teesim_failure="the TEESimulator profile could not be selected"
        ;;
esac
rm -f "$teesim_pkgs"
teesim_cleanup_tmp

if [ -n "$teesim_failure" ]; then
    if [ "$tricky_present" -eq 1 ]; then
        log_message "Error: $t was updated, but $teesim_failure."
    else
        log_message "Error: $teesim_failure."
    fi
    exit 1
fi

log_message "Finish"
