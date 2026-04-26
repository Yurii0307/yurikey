#!/system/bin/sh
#
# This file is part of LSPosed.
#
# LSPosed is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#
# LSPosed is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with LSPosed.  If not, see <https://www.gnu.org/licenses/>.
#
# Copyright (C) 2021 LSPosed Contributors
#

# lspmcfg — module_configs database interface
# Contributed by mhmrdd <https://github.com/mhmrdd>
#
#   lsp_get     <mod> <group> <key>              -> raw value
#   lsp_type    <mod> <group> <key>              -> string|int|long|bool
#   lsp_set     <mod> <group> <key> <val> [type] -> exit 0/1
#   lsp_del     <mod> <group> <key>              -> exit 0/1
#   lsp_has     <mod> <group> <key>              -> exit 0/1
#   lsp_keys    <mod> <group>                    -> one key per line
#   lsp_groups  <mod>                            -> one group per line
#   lsp_dump    <mod> <group>                    -> key\ttype\tvalue per line
#   lsp_raw     <mod> <group> <key>              -> hex blob
#   lsp_count   <mod> <group>                    -> integer
#
# Override before sourcing: LSP_DB, LSP_SQLITE, LSP_UID

LSP_DB="${LSP_DB:-/data/adb/lspd/config/modules_config.db}"
LSP_UID="${LSP_UID:-$(id -u)}"

if [ -z "$LSP_SQLITE" ]; then
    _lsp_abi=$(getprop ro.product.cpu.abi 2>/dev/null)
    LSP_SQLITE="/data/adb/modules/Yurikey/Yuri/rka/${_lsp_abi}/sqlite3"
fi

_LSP_SCHEMA_OK=""
_LSP_EXPECTED_COLS="module_pkg_name user_id group_name key_name data"

_lsp_hex_to_str() { printf '%s\n' "$1" | xxd -r -p; }
_lsp_str_to_hex() { printf '%s' "$1" | xxd -p | tr -d '\n' | tr 'a-f' 'A-F'; }

_lsp_query() { "$LSP_SQLITE" "$LSP_DB" "$1"; }

_lsp_check_schema() {
    [ -n "$_LSP_SCHEMA_OK" ] && return 0

    if [ ! -f "$LSP_DB" ]; then
        echo "lspmcfg: database not found: $LSP_DB" >&2
        return 1
    fi

    _tables=$(_lsp_query "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;")
    case "$_tables" in
        *module_configs*) ;;
        *)
            echo "lspmcfg: table 'module_configs' missing" >&2
            echo "lspmcfg: tables found: $_tables" >&2
            return 1
            ;;
    esac

    _cols=$(_lsp_query "PRAGMA table_info(module_configs);" | awk -F'|' '{print $2}' | tr '\n' ' ')
    _missing=""
    for _need in $_LSP_EXPECTED_COLS; do
        case "$_cols" in
            *${_need}*) ;;
            *) _missing="$_missing $_need" ;;
        esac
    done
    if [ -n "$_missing" ]; then
        echo "lspmcfg: incompatible schema, missing:$_missing" >&2
        echo "lspmcfg: columns found: $_cols" >&2
        return 1
    fi

    _LSP_SCHEMA_OK=1
    return 0
}

_lsp_query_blob() {
    _lsp_check_schema || return 1
    _lsp_query \
      "SELECT hex(data) FROM module_configs \
         WHERE module_pkg_name='$1' \
           AND user_id=$LSP_UID \
           AND \"group_name\"='$2' \
           AND key_name='$3';"
}

_lsp_write_blob() {
    _lsp_check_schema || return 1
    _lsp_query \
      "INSERT OR REPLACE INTO module_configs \
         (module_pkg_name, user_id, \"group_name\", key_name, data) \
       VALUES ('$1', $LSP_UID, '$2', '$3', x'$4');"
}

_lsp_delete_row() {
    _lsp_check_schema || return 1
    _lsp_query \
      "DELETE FROM module_configs \
         WHERE module_pkg_name='$1' \
           AND user_id=$LSP_UID \
           AND \"group_name\"='$2' \
           AND key_name='$3';"
}

_lsp_detect_type() {
    _hex=$1
    [ -z "$_hex" ] && return 1
    _tok=${_hex:8:2}
    case "$_tok" in
        74) echo string ;;
        73)
            case "$_hex" in
                *6A6176612E6C616E672E496E7465676572*) echo int ;;
                *6A6176612E6C616E672E4C6F6E67*)       echo long ;;
                *6A6176612E6C616E672E426F6F6C65616E*) echo bool ;;
                *) return 1 ;;
            esac
            ;;
        *) return 1 ;;
    esac
}

_lsp_extract_value() {
    _hex=$1
    [ -z "$_hex" ] && return 1
    _tok=${_hex:8:2}
    case "$_tok" in
        74)
            _len=$((16#${_hex:10:4}))
            _lsp_hex_to_str "${_hex:14:$((_len*2))}"
            ;;
        73)
            case "$_hex" in
                *6A6176612E6C616E672E496E7465676572*)
                    printf '%d' "$((16#${_hex: -8}))" ;;
                *6A6176612E6C616E672E4C6F6E67*)
                    printf '%s' "${_hex: -16}" ;;
                *6A6176612E6C616E672E426F6F6C65616E*)
                    case "${_hex: -2}" in
                        01) printf 'true' ;;
                        00) printf 'false' ;;
                    esac ;;
                *) return 1 ;;
            esac
            ;;
        *) return 1 ;;
    esac
}

_lsp_build_blob() {
    _type=$1
    _val=$2
    _hdr="ACED0005"
    case "$_type" in
        string)
            _vh=$(_lsp_str_to_hex "$_val")
            _ln=$(printf '%04X' "${#_val}")
            printf '%s' "${_hdr}74${_ln}${_vh}"
            ;;
        int)
            _ch=$(_lsp_str_to_hex "java.lang.Integer")
            _cl=$(printf '%04X' 17)
            _fh=$(_lsp_str_to_hex "value")
            _fl=$(printf '%04X' 5)
            _vx=$(printf '%08X' "$_val")
            printf '%s' "${_hdr}7372${_cl}${_ch}12E2A0A4F781873802000149${_fl}${_fh}7870${_vx}"
            ;;
        long)
            _ch=$(_lsp_str_to_hex "java.lang.Long")
            _cl=$(printf '%04X' 14)
            _fh=$(_lsp_str_to_hex "value")
            _fl=$(printf '%04X' 5)
            _vx=$(printf '%016X' "$_val")
            printf '%s' "${_hdr}7372${_cl}${_ch}3B8BE490CC8F23DF0200014A${_fl}${_fh}7870${_vx}"
            ;;
        bool)
            _ch=$(_lsp_str_to_hex "java.lang.Boolean")
            _cl=$(printf '%04X' 17)
            _fh=$(_lsp_str_to_hex "value")
            _fl=$(printf '%04X' 5)
            case "$_val" in
                true|1)  _vx="01" ;;
                false|0) _vx="00" ;;
                *) return 1 ;;
            esac
            printf '%s' "${_hdr}7372${_cl}${_ch}CD207280D59CFAEE0200015A${_fl}${_fh}7870${_vx}"
            ;;
        *) return 1 ;;
    esac
}

lsp_get() {
    _hex=$(_lsp_query_blob "$1" "$2" "$3")
    [ -z "$_hex" ] && return 1
    _lsp_extract_value "$_hex"
    echo
}

lsp_type() {
    _hex=$(_lsp_query_blob "$1" "$2" "$3")
    _lsp_detect_type "$_hex"
}

lsp_set() {
    _type=${5:-string}
    _blob=$(_lsp_build_blob "$_type" "$4") || return 1
    _blob=$(printf '%s' "$_blob" | tr 'a-f' 'A-F')
    _lsp_write_blob "$1" "$2" "$3" "$_blob"
}

lsp_del() { _lsp_delete_row "$1" "$2" "$3"; }

lsp_has() {
    _hex=$(_lsp_query_blob "$1" "$2" "$3")
    [ -n "$_hex" ]
}

lsp_keys() {
    _lsp_check_schema || return 1
    _lsp_query \
      "SELECT key_name FROM module_configs \
         WHERE module_pkg_name='$1' \
           AND user_id=$LSP_UID \
           AND \"group_name\"='$2' \
       ORDER BY rowid;"
}

lsp_groups() {
    _lsp_check_schema || return 1
    _lsp_query \
      "SELECT DISTINCT \"group_name\" FROM module_configs \
         WHERE module_pkg_name='$1' \
           AND user_id=$LSP_UID \
       ORDER BY \"group_name\";"
}

lsp_dump() {
    _mod=$1; _grp=$2
    lsp_keys "$_mod" "$_grp" | while IFS= read -r _k; do
        [ -z "$_k" ] && continue
        _hex=$(_lsp_query_blob "$_mod" "$_grp" "$_k")
        _t=$(_lsp_detect_type "$_hex")
        _v=$(_lsp_extract_value "$_hex")
        printf '%s\t%s\t%s\n' "$_k" "$_t" "$_v"
    done
}

lsp_raw() { _lsp_query_blob "$1" "$2" "$3"; }

lsp_count() {
    _lsp_check_schema || return 1
    _lsp_query \
      "SELECT count(*) FROM module_configs \
         WHERE module_pkg_name='$1' \
           AND user_id=$LSP_UID \
           AND \"group_name\"='$2';"
}
