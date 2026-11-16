#!/system/bin/sh
#
# TEESimulator support shared by the YuriKey action scripts and WebUI actions.
#
# Sourced by Module/Yuri/*.sh (set TEESIM_LIB_SOURCED=1 first) and also runnable directly:
#   sh teesim_common.sh list-profiles
#
# Commands (direct invocation): list-profiles, select, check, apply-patch, apply-targets,
# apply-default-keybox. Everything the profile-dependent commands need comes from
# $TEESIM_DATA_DIR/config.json; nothing is written when the module, the config or the selected
# profile is missing, malformed, or of an unsupported schema version.
#
# The path roots are environment-overridable so the shell tests can point them at fixtures.

TEESIM_MODULE_ID="teesim"
TRICKY_MODULE_ID="tricky_store"
TEESIM_MODULES_DIR="${TEESIM_MODULES_DIR:-/data/adb/modules}"
TEESIM_MODULES_UPDATE_DIR="${TEESIM_MODULES_UPDATE_DIR:-/data/adb/modules_update}"
TEESIM_DATA_DIR="${TEESIM_DATA_DIR:-/data/adb/teesim}"
TRICKY_DATA_DIR="${TRICKY_DATA_DIR:-/data/adb/tricky_store}"
TEESIM_KEY_TIMEOUT="${TEESIM_KEY_TIMEOUT:-30}"
TEESIM_KEY_POLL="${TEESIM_KEY_POLL:-0.1}"
TEESIM_CONFIG="$TEESIM_DATA_DIR/config.json"
TEESIM_SELECTED=""
TEESIM_TMP_PRESET="${TEESIM_TMP_DIR:-}"

if [ -z "${TEESIM_COMMON_DIR:-}" ]; then
    if [ -n "${0%/*}" ] && [ "${0%/*}" != "$0" ]; then
        TEESIM_COMMON_DIR=$(CDPATH= cd -- "${0%/*}" && pwd)
    else
        TEESIM_COMMON_DIR=$(pwd)
    fi
    if [ ! -f "$TEESIM_COMMON_DIR/teesim_json.awk" ]; then
        TEESIM_COMMON_DIR=/data/adb/modules/Yurikey/Yuri
    fi
fi

teesim_log() {
    echo "$(date +%Y-%m-%d\ %H:%M:%S) [TEESIM] $*"
}

teesim_module_dir() {
    if [ -d "$TEESIM_MODULES_DIR/$TEESIM_MODULE_ID" ]; then
        echo "$TEESIM_MODULES_DIR/$TEESIM_MODULE_ID"
        return 0
    fi
    if [ -d "$TEESIM_MODULES_UPDATE_DIR/$TEESIM_MODULE_ID" ]; then
        echo "$TEESIM_MODULES_UPDATE_DIR/$TEESIM_MODULE_ID"
        return 0
    fi
    return 1
}

teesim_installed() {
    teesim_module_dir >/dev/null 2>&1
}

tricky_installed() {
    if [ -d "$TEESIM_MODULES_DIR/$TRICKY_MODULE_ID" ]; then
        return 0
    fi
    if [ -d "$TEESIM_MODULES_UPDATE_DIR/$TRICKY_MODULE_ID" ]; then
        return 0
    fi
    return 1
}

teesim_stat() {
    case "$1" in
        mode)
            stat -c '%a' "$2" 2>/dev/null || stat -f '%Lp' "$2" 2>/dev/null
            ;;
        uid)
            stat -c '%u' "$2" 2>/dev/null || stat -f '%u' "$2" 2>/dev/null
            ;;
        gid)
            stat -c '%g' "$2" 2>/dev/null || stat -f '%g' "$2" 2>/dev/null
            ;;
        *)
            return 1
            ;;
    esac
}

# Removes the scratch directory this run created. A directory handed in through TEESIM_TMP_DIR is
# the caller's and is left alone.
teesim_cleanup_tmp() {
    [ -n "${TEESIM_TMP_DIR:-}" ] || return 0
    if [ "$TEESIM_TMP_DIR" = "/" ] || [ "$TEESIM_TMP_DIR" = "${TEESIM_TMP_PRESET:-}" ]; then
        return 0
    fi
    rm -rf "$TEESIM_TMP_DIR"
}

teesim_tmpdir() {
    if [ -n "${TEESIM_TMP_DIR:-}" ] && [ -d "$TEESIM_TMP_DIR" ]; then
        echo "$TEESIM_TMP_DIR"
        return 0
    fi
    _dir=$(mktemp -d 2>/dev/null)
    if [ -z "$_dir" ] || [ ! -d "$_dir" ]; then
        _dir="${TMPDIR:-/data/local/tmp}/yurikey-teesim.$$"
        mkdir -p "$_dir" || return 1
    fi
    echo "$_dir"
}

# $1 = op, $2 = config path, remaining arguments = -v assignments for teesim_json.awk
teesim_awk() {
    _op="$1"
    _cfg="$2"
    shift 2
    LC_ALL=C awk -v op="$_op" "$@" -f "$TEESIM_COMMON_DIR/teesim_json.awk" "$_cfg"
}

teesim_drop_config_temps() {
    rm -f "$TEESIM_DATA_DIR/.config.json.snap.$$" "$TEESIM_DATA_DIR/.config.json.tmp.$$" "$TEESIM_DATA_DIR/.config.json.err.$$"
}

teesim_apply_op() {
    # $1 = op, $2 = profile, $3 = value, $4 = payload file ("" when unused)
    _op="$1"
    _profile="$2"
    _value="$3"
    _payload="$4"
    teesim_installed || return 3
    [ -f "$TEESIM_CONFIG" ] || return 3
    [ -f "$_payload" ] || _payload=""
    _snap="$TEESIM_DATA_DIR/.config.json.snap.$$"
    _tmp="$TEESIM_DATA_DIR/.config.json.tmp.$$"
    _err="$TEESIM_DATA_DIR/.config.json.err.$$"
    if ! cp -f "$TEESIM_CONFIG" "$_snap" 2>/dev/null || [ ! -f "$_snap" ]; then
        teesim_drop_config_temps
        teesim_log "Error: cannot read $TEESIM_CONFIG"
        return 4
    fi
    _mode=$(teesim_stat mode "$TEESIM_CONFIG")
    _uid=$(teesim_stat uid "$TEESIM_CONFIG")
    _gid=$(teesim_stat gid "$TEESIM_CONFIG")
    TEESIM_AWK_PROFILE=$_profile
    TEESIM_AWK_VALUE=$_value
    export TEESIM_AWK_PROFILE TEESIM_AWK_VALUE
    if [ -n "$_payload" ]; then
        teesim_awk "$_op" "$TEESIM_CONFIG" -v payload="$_payload" >"$_tmp" 2>"$_err"
    else
        teesim_awk "$_op" "$TEESIM_CONFIG" >"$_tmp" 2>"$_err"
    fi
    _rc=$?
    if [ "$_rc" -eq 10 ]; then
        teesim_drop_config_temps
        return 10
    fi
    if [ "$_rc" -ne 0 ] || [ ! -s "$_tmp" ]; then
        _msg=$(cat "$_err" 2>/dev/null)
        teesim_drop_config_temps
        [ -n "$_msg" ] || _msg="config.json edit failed"
        teesim_log "Error: $_msg"
        return 4
    fi
    if [ -n "$_mode" ]; then
        chmod "$_mode" "$_tmp" 2>/dev/null || {
            teesim_drop_config_temps
            teesim_log "Error: cannot preserve permissions on config.json"
            return 4
        }
    fi
    if [ -n "$_uid" ] && [ -n "$_gid" ]; then
        _tuid=$(teesim_stat uid "$_tmp")
        _tgid=$(teesim_stat gid "$_tmp")
        if [ "$_tuid" != "$_uid" ] || [ "$_tgid" != "$_gid" ]; then
            chown "$_uid:$_gid" "$_tmp" 2>/dev/null || {
                teesim_drop_config_temps
                teesim_log "Error: cannot preserve ownership on config.json"
                return 4
            }
        fi
    fi
    if ! cmp -s "$TEESIM_CONFIG" "$_snap"; then
        teesim_drop_config_temps
        teesim_log "Error: config.json changed while it was being updated"
        return 5
    fi
    if cmp -s "$TEESIM_CONFIG" "$_tmp"; then
        teesim_drop_config_temps
        return 10
    fi
    if ! mv -f "$_tmp" "$TEESIM_CONFIG"; then
        teesim_drop_config_temps
        teesim_log "Error: cannot replace config.json"
        return 4
    fi
    teesim_drop_config_temps
    return 0
}

teesim_list_profiles() {
    teesim_installed || return 3
    [ -f "$TEESIM_CONFIG" ] || return 3
    teesim_awk list "$TEESIM_CONFIG"
}

teesim_volume_menu() {
    # $1 = profile names file, $2 = profile count
    _names="$1"
    _total="$2"
    _idx=1
    _cur=$(sed -n "1p" "$_names")
    teesim_log "TEESimulator has $_total profiles."
    teesim_log "Current profile: $_cur"
    teesim_log "Press volume-up to change the profile, volume-down to confirm."
    if ! command -v getevent >/dev/null 2>&1; then
        teesim_log "Error: getevent is unavailable, so TEESimulator profile changes were skipped."
        return 5
    fi
    _keys="$TEESIM_TMP_DIR/keys.$$"
    _chunk="$TEESIM_TMP_DIR/chunk.$$"
    _ended="$TEESIM_TMP_DIR/keys.ended.$$"
    _report="$TEESIM_TMP_DIR/keys.err.$$"
    _gpid="$TEESIM_TMP_DIR/keys.pid.$$"
    rm -f "$_keys" "$_chunk" "$_ended" "$_report" "$_gpid"
    (getevent -l >"$_keys" 2>"$_report" &
        echo $! >"$_gpid"
        wait
        : >"$_ended") &
    _pid=$!
    _seen=0
    _confirmed=0
    _timeout_flag="$TEESIM_TMP_DIR/keys.deadline.$$"
    rm -f "$_timeout_flag"
    (sleep "$TEESIM_KEY_TIMEOUT"; : >"$_timeout_flag") &
    _watcher=$!
    while [ ! -f "$_timeout_flag" ]; do
        _lines=$(wc -l <"$_keys" 2>/dev/null | tr -d ' ')
        [ -n "$_lines" ] || _lines=0
        if [ "$_lines" -gt "$_seen" ]; then
            sed -n "$((_seen + 1)),${_lines}p" "$_keys" >"$_chunk" 2>/dev/null
            _seen=$_lines
            while IFS= read -r _line; do
                case "$_line" in
                    *KEY_VOLUMEUP*)
                        case "$_line" in
                            *REPEAT*) ;;
                            *DOWN*)
                                _idx=$((_idx + 1))
                                if [ "$_idx" -gt "$_total" ]; then
                                    _idx=1
                                fi
                                _cur=$(sed -n "${_idx}p" "$_names")
                                teesim_log "Selected profile: $_cur"
                                ;;
                        esac
                        ;;
                    *KEY_VOLUMEDOWN*)
                        case "$_line" in
                            *REPEAT*) ;;
                            *DOWN*)
                                _confirmed=1
                                break
                                ;;
                        esac
                        ;;
                esac
            done <"$_chunk"
        fi
        if [ "$_confirmed" -eq 1 ]; then
            break
        fi
        if [ -f "$_ended" ] && [ "$(wc -l <"$_keys" 2>/dev/null | tr -d ' ')" -le "$_seen" ]; then
            break
        fi
        sleep "$TEESIM_KEY_POLL"
    done
    if [ -s "$_gpid" ]; then
        kill "$(cat "$_gpid" 2>/dev/null)" 2>/dev/null
    fi
    kill "$_pid" "$_watcher" 2>/dev/null
    wait "$_pid" 2>/dev/null
    rm -f "$_keys" "$_chunk" "$_ended" "$_report" "$_gpid" "$_timeout_flag"
    if [ "$_confirmed" -eq 1 ]; then
        TEESIM_SELECTED="$_cur"
        teesim_log "Confirmed profile: $_cur"
        return 0
    fi
    teesim_log "TEESimulator profile selection timed out, so profile changes were skipped."
    return 5
}

# Sets TEESIM_SELECTED. Returns 0 selected, 3 nothing to do (module or config absent),
# 5 skipped without a selection, 6 configuration error.
teesim_select_profile() {
    TEESIM_SELECTED=""
    if [ "${TEESIM_NO_SELECTION:-0}" = "1" ]; then
        return 5
    fi
    teesim_installed || return 3
    [ -f "$TEESIM_CONFIG" ] || return 3
    TEESIM_TMP_DIR=$(teesim_tmpdir)
    if [ -z "$TEESIM_TMP_DIR" ] || [ ! -d "$TEESIM_TMP_DIR" ]; then
        teesim_log "Error: no writable temporary directory"
        return 6
    fi
    _names="$TEESIM_TMP_DIR/profiles.$$"
    _err="$TEESIM_TMP_DIR/profiles.err.$$"
    if ! teesim_awk list-lines "$TEESIM_CONFIG" >"$_names" 2>"$_err"; then
        teesim_log "Error: cannot read TEESimulator profiles: $(cat "$_err" 2>/dev/null)"
        rm -f "$_names" "$_err"
        return 6
    fi
    rm -f "$_err"
    _count=$(wc -l <"$_names" 2>/dev/null | tr -d ' ')
    if [ -z "$_count" ] || [ "$_count" -eq 0 ]; then
        rm -f "$_names"
        teesim_log "Error: TEESimulator config.json has no profiles"
        return 6
    fi
    if [ -n "${TEESIM_PROFILE:-}" ]; then
        _match=$(grep -F -x -e "$TEESIM_PROFILE" "$_names" 2>/dev/null | sed -n "1p")
        rm -f "$_names"
        if [ -z "$_match" ]; then
            teesim_log "Error: TEESimulator profile \"$TEESIM_PROFILE\" no longer exists"
            return 6
        fi
        TEESIM_SELECTED="$_match"
        return 0
    fi
    if [ "$_count" -eq 1 ]; then
        TEESIM_SELECTED=$(sed -n "1p" "$_names")
        rm -f "$_names"
        return 0
    fi
    teesim_volume_menu "$_names" "$_count"
    _rc=$?
    rm -f "$_names"
    return "$_rc"
}

teesim_parse_args() {
    # Accepts --teesim-profile <name> from the WebUI.
    while [ $# -gt 0 ]; do
        case "$1" in
            --teesim-profile)
                if [ $# -lt 2 ] || [ -z "$2" ]; then
                    return 1
                fi
                TEESIM_PROFILE="$2"
                shift 2
                ;;
            *)
                shift
                ;;
        esac
    done
    return 0
}

teesim_apply_patch() {
    # $1 = profile, $2 = YYYY-MM-DD. Returns 0 updated, 10 unchanged, 3 absent, 4 failed.
    case "$2" in
        [0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]) ;;
        *)
            teesim_log "Error: refusing invalid patch date \"$2\""
            return 4
            ;;
    esac
    teesim_apply_op set-patch "$1" "$2" ""
    _rc=$?
    case "$_rc" in
        0) teesim_log "Updated profile \"$1\" patch level to $2." ;;
        10) : ;;
        # An apply-stage 3 means the module or config disappeared after selection; that is an
        # intentional no-op, unlike 5 (a concurrent change), which is a real failure.
        3) ;;
        *) teesim_log "Error: failed to update TEESimulator patch level for \"$1\"." ;;
    esac
    return "$_rc"
}

teesim_apply_default_keybox() {
    teesim_apply_op set-keybox "" "keybox.xml" ""
    _rc=$?
    case "$_rc" in
        0) teesim_log "Pointed profile \"default\" at keybox.xml." ;;
        10) : ;;
        *) teesim_log "Error: failed to update the TEESimulator default profile keybox." ;;
    esac
    return "$_rc"
}

teesim_uid_map() {
    # $1 = "" for the primary user or a numeric secondary user ID. The option and its value stay
    # separate arguments; pm does not parse a combined "--user N" string.
    #
    # pm runs outside the pipeline so its status is observable: an enumeration failure must not
    # look like an empty package list, because callers would then include packages they cannot
    # prove are unowned. Returns 1 when pm fails.
    if [ -n "$1" ]; then
        _pm_out=$(pm list packages --user "$1" -U 2>/dev/null)
    else
        _pm_out=$(pm list packages -U 2>/dev/null)
    fi
    [ $? -eq 0 ] || return 1
    printf '%s\n' "$_pm_out" | LC_ALL=C awk '
        $1 ~ /^package:/ && $2 ~ /^uid:/ {
            p = substr($1, 9)
            u = substr($2, 5)
            if (p != "" && u ~ /^[0-9]+$/) print p "\t" u
        }
    '
}

teesim_filter_targets() {
    # $1 generated packages, $2 other-profile entries, $3 primary uid map, $4 per-user uid map
    LC_ALL=C awk -v gen="$1" -v other="$2" -v umap="$3" -v nmap="$4" '
        function trim(s) {
            sub(/\r$/, "", s)
            gsub(/^[ \t]+/, "", s)
            gsub(/[ \t]+$/, "", s)
            return s
        }
        BEGIN {
            tab = sprintf("%c", 9)
            line = ""
            while ((getline line < other) > 0) {
                line = trim(line)
                if (line == "") continue
                i = index(line, tab)
                if (i == 0) continue
                prof = substr(line, 1, i - 1)
                entry = substr(line, i + 1)
                if (entry ~ /^uid:[0-9]+$/) {
                    uidClaims[substr(entry, 5)] = prof
                } else if ((j = index(entry, "@")) > 0) {
                    userClaims[substr(entry, j + 1) tab substr(entry, 1, j - 1)] = prof
                } else {
                    bareClaims[entry] = prof
                }
            }
            close(other)
            while ((getline line < umap) > 0) {
                line = trim(line)
                if (line == "") continue
                i = index(line, tab)
                if (i == 0) continue
                primary[substr(line, 1, i - 1)] = substr(line, i + 1)
            }
            close(umap)
            while ((getline line < nmap) > 0) {
                line = trim(line)
                if (line == "") continue
                i = index(line, tab)
                if (i == 0) continue
                user = substr(line, 1, i - 1)
                rest = substr(line, i + 1)
                j = index(rest, tab)
                if (j == 0) continue
                perUser[user tab substr(rest, 1, j - 1)] = substr(rest, j + 1)
            }
            close(nmap)

            for (key in userClaims) {
                split(key, parts, tab)
                user = parts[1]
                pkg = parts[2]
                if (user == "0") u = primary[pkg]
                else u = perUser[key]
                if (u == "") {
                    print "cannot resolve the uid of " pkg "@" user " (profile " userClaims[key] ")" > "/dev/stderr"
                    exit 1
                }
                uidClaims[u] = userClaims[key]
            }

            while ((getline line < gen) > 0) {
                line = trim(line)
                if (line == "") continue
                if (line in seen) continue
                seen[line] = 1
                if (line in bareClaims) {
                    print "skipped " line " (kept by profile " bareClaims[line] ")" > "/dev/stderr"
                    continue
                }
                u = primary[line]
                if (u == "") {
                    # Not installed for the primary user, so it has no caller uid to collide with.
                    print line
                    continue
                }
                if (u in uidClaims) {
                    print "skipped " line " (uid " u " kept by profile " uidClaims[u] ")" > "/dev/stderr"
                    continue
                }
                print line
            }
            close(gen)
            exit 0
        }
    '
}

teesim_apply_targets() {
    # $1 = profile, $2 = file with the generated package names (Tricky Store ? suffix stripped)
    # Returns 0 updated, 10 unchanged, 3 absent (module or config gone), 4 failed,
    # 5 config changed concurrently, 6 unresolved ownership.
    _profile="$1"
    _gen="$2"
    teesim_installed || return 3
    [ -f "$TEESIM_CONFIG" ] || return 3
    [ -f "$_gen" ] || return 4
    TEESIM_TMP_DIR=$(teesim_tmpdir)
    if [ -z "$TEESIM_TMP_DIR" ] || [ ! -d "$TEESIM_TMP_DIR" ]; then
        teesim_log "Error: no writable temporary directory"
        return 4
    fi
    _other="$TEESIM_TMP_DIR/other.$$"
    _umap="$TEESIM_TMP_DIR/umap.$$"
    _nmap="$TEESIM_TMP_DIR/nmap.$$"
    _final="$TEESIM_TMP_DIR/final.$$"
    _report="$TEESIM_TMP_DIR/target.err.$$"
    rm -f "$_other" "$_umap" "$_nmap" "$_final" "$_report"
    _entries="$TEESIM_TMP_DIR/entries.$$"
    if ! teesim_awk entries "$TEESIM_CONFIG" >"$_entries" 2>"$_report"; then
        teesim_log "Error: cannot read TEESimulator app entries: $(cat "$_report" 2>/dev/null)"
        rm -f "$_entries" "$_other" "$_umap" "$_nmap" "$_final" "$_report"
        return 4
    fi
    TEESIM_AWK_PROFILE=$_profile
    export TEESIM_AWK_PROFILE
    LC_ALL=C awk '
        BEGIN { p = ENVIRON["TEESIM_AWK_PROFILE"] }
        { if (substr($0, 1, length(p) + 1) != p "\t") print }
    ' "$_entries" >"$_other"
    rm -f "$_entries"
    if ! teesim_uid_map "" >"$_umap"; then
        teesim_log "Error: cannot list installed packages for profile \"$_profile\"."
        rm -f "$_other" "$_umap" "$_nmap" "$_final" "$_report"
        return 6
    fi
    : >"$_nmap"
    for _user in $(sed -n "s/.*@\([0-9][0-9]*\)$/\\1/p" "$_other" | sort -u); do
        if [ "$_user" = "0" ]; then
            continue
        fi
        _user_map=$(teesim_uid_map "$_user") || {
            teesim_log "Error: cannot list installed packages for user $_user (profile \"$_profile\")."
            rm -f "$_other" "$_umap" "$_nmap" "$_final" "$_report"
            return 6
        }
        if ! printf '%s\n' "$_user_map" | LC_ALL=C awk -v n="$_user" '
            { print n "\t" $0 }
        ' >>"$_nmap"; then
            teesim_log "Error: cannot record installed packages for user $_user (profile \"$_profile\")."
            rm -f "$_other" "$_umap" "$_nmap" "$_final" "$_report"
            return 6
        fi
    done
    teesim_filter_targets "$_gen" "$_other" "$_umap" "$_nmap" >"$_final" 2>"$_report"
    if [ $? -ne 0 ]; then
        teesim_log "Error: cannot resolve app ownership for profile \"$_profile\": $(cat "$_report" 2>/dev/null)"
        rm -f "$_other" "$_umap" "$_nmap" "$_final" "$_report"
        return 6
    fi
    while IFS= read -r _line; do
        [ -n "$_line" ] || continue
        teesim_log "$_line"
    done <"$_report"
    teesim_apply_op set-targets "$_profile" "" "$_final"
    _rc=$?
    rm -f "$_other" "$_umap" "$_nmap" "$_final" "$_report"
    case "$_rc" in
        0) teesim_log "Updated profile \"$_profile\" apps." ;;
        10) : ;;
        # An apply-stage 3 means the module or config disappeared after selection; that is an
        # intentional no-op, unlike 5 (a concurrent change), which is a real failure.
        3) ;;
        *) teesim_log "Error: failed to update TEESimulator apps for \"$_profile\"." ;;
    esac
    return "$_rc"
}

teesim_main() {
    case "$1" in
        list-profiles)
            teesim_list_profiles
            return $?
            ;;
        select)
            teesim_select_profile
            _rc=$?
            if [ "$_rc" -eq 0 ]; then
                echo "$TEESIM_SELECTED"
            fi
            teesim_cleanup_tmp
            return "$_rc"
            ;;
        check)
            teesim_installed || return 3
            [ -f "$TEESIM_CONFIG" ] || return 3
            teesim_awk check "$TEESIM_CONFIG"
            return $?
            ;;
        apply-patch)
            shift
            teesim_apply_patch "$@"
            return $?
            ;;
        apply-targets)
            shift
            teesim_apply_targets "$@"
            _rc=$?
            teesim_cleanup_tmp
            return "$_rc"
            ;;
        apply-default-keybox)
            teesim_apply_default_keybox
            return $?
            ;;
        *)
            echo "usage: teesim_common.sh list-profiles|select|check|apply-patch|apply-targets|apply-default-keybox" >&2
            return 2
            ;;
    esac
}

if [ "${TEESIM_LIB_SOURCED:-0}" != "1" ]; then
    teesim_main "$@"
    exit $?
fi
