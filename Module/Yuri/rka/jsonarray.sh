#!/system/bin/sh
# jsonarray — flat JSON array manipulation library
# Contributed by mhmrdd <https://github.com/mhmrdd>
#
#   ja_count    <file>                          -> integer
#   ja_get      <file> <id|idx> <field>         -> raw value
#   ja_has      <file> <id|idx>                 -> exit 0/1
#   ja_index    <file> <id>                     -> 1-based index
#   ja_id       <file> <idx>                    -> id string
#   ja_ids      <file>                          -> one id per line
#   ja_keys     <file> <id|idx>                 -> one key per line
#   ja_dump     <file> <id|idx>                 -> key\tvalue per line
#   ja_search   <file> <field> <value>          -> matching indices per line
#   ja_add      <file> <k=v> [k=v ...]          -> prints assigned id
#   ja_set      <file> <id|idx> <field> <v> [t] -> exit 0/1 (t: s/n/b)
#   ja_del      <file> <id|idx>                 -> exit 0/1
#   ja_delfield <file> <id|idx> <field>         -> exit 0/1
#   ja_raw      <file>                          -> full JSON

_JA_AWK='
function split_objects(json, objs,    n, i, c, prev, in_str, depth, start) {
    n = 0; in_str = 0; depth = 0
    for (i = 1; i <= length(json); i++) {
        c = substr(json, i, 1)
        prev = (i > 1) ? substr(json, i-1, 1) : ""
        if (c == "\"" && prev != "\\") { in_str = !in_str; continue }
        if (in_str) continue
        if (c == "{") { depth++; if (depth == 1) start = i }
        else if (c == "}") { depth--; if (depth == 0) { n++; objs[n] = substr(json, start, i - start + 1) } }
    }
    return n
}

function get_field(obj, fname,    i, c, kstart, kend, key, vstart, val) {
    i = 1
    while (i <= length(obj)) {
        c = substr(obj, i, 1)
        if (c == "\"") {
            kstart = i + 1
            for (i = kstart; i <= length(obj); i++)
                if (substr(obj, i, 1) == "\"" && substr(obj, i-1, 1) != "\\") break
            kend = i - 1
            key = substr(obj, kstart, kend - kstart + 1)
            i++
            while (i <= length(obj)) { c = substr(obj, i, 1); if (c != ":" && c != " " && c != "\t") break; i++ }
            c = substr(obj, i, 1)
            if (c == "\"") {
                vstart = i; i++
                while (i <= length(obj))
                    if (substr(obj, i, 1) == "\"" && substr(obj, i-1, 1) != "\\") break; else i++
                val = substr(obj, vstart, i - vstart + 1)
            } else {
                vstart = i
                while (i <= length(obj)) { c = substr(obj, i, 1); if (c == "," || c == "}" || c == " " || c == "\n" || c == "\r" || c == "\t") break; i++ }
                val = substr(obj, vstart, i - vstart)
            }
            if (key == fname) return val
        }
        i++
    }
    return ""
}

function unquote(v) {
    if (substr(v, 1, 1) == "\"" && substr(v, length(v), 1) == "\"")
        return substr(v, 2, length(v) - 2)
    return v
}

function get_keys(obj, keys,    n, i, c, kstart, kend, key) {
    n = 0; i = 1
    while (i <= length(obj)) {
        c = substr(obj, i, 1)
        if (c == "\"") {
            kstart = i + 1
            for (i = kstart; i <= length(obj); i++)
                if (substr(obj, i, 1) == "\"" && substr(obj, i-1, 1) != "\\") break
            kend = i - 1; key = substr(obj, kstart, kend - kstart + 1); i++
            while (i <= length(obj) && (substr(obj,i,1)==" " || substr(obj,i,1)=="\t")) i++
            if (substr(obj, i, 1) == ":") {
                n++; keys[n] = key; i++
                while (i <= length(obj) && (substr(obj,i,1)==" " || substr(obj,i,1)=="\t")) i++
                c = substr(obj, i, 1)
                if (c == "\"") { i++; while (i <= length(obj)) { if (substr(obj,i,1) == "\"" && substr(obj,i-1,1) != "\\") break; i++ } }
                else { while (i <= length(obj)) { c = substr(obj, i, 1); if (c == "," || c == "}") break; i++ } }
            }
        }
        i++
    }
    return n
}

function rebuild_object(obj, skip_field,    keys, nk, k, v, out, sep) {
    nk = get_keys(obj, keys); out = "{"; sep = ""
    for (k = 1; k <= nk; k++) {
        if (keys[k] == skip_field) continue
        v = get_field(obj, keys[k]); out = out sep "\"" keys[k] "\":" v; sep = ","
    }
    return out "}"
}

function set_field_in_obj(obj, fname, fval,    keys, nk, k, v, out, sep, found) {
    nk = get_keys(obj, keys); out = "{"; sep = ""; found = 0
    for (k = 1; k <= nk; k++) {
        v = get_field(obj, keys[k])
        if (keys[k] == fname) { v = fval; found = 1 }
        out = out sep "\"" keys[k] "\":" v; sep = ","
    }
    if (!found) out = out sep "\"" fname "\":" fval
    return out "}"
}

function rebuild_array(objs, count,    out, i) {
    out = "["
    for (i = 1; i <= count; i++) { if (i > 1) out = out ","; out = out objs[i] }
    return out "]"
}

function find_entry(objs, count, target,    i, idx) {
    for (i = 1; i <= count; i++)
        if (unquote(get_field(objs[i], "id")) == target) return i
    idx = int(target)
    if (idx >= 1 && idx <= count) return idx
    return 0
}

{ if (NR == 1) json = $0; else json = json "\n" $0 }

END {
    count = split_objects(json, objs)

    if (OP == "count") { print count }

    else if (OP == "get") {
        idx = find_entry(objs, count, P1)
        if (idx == 0) exit 1
        print unquote(get_field(objs[idx], P2))
    }

    else if (OP == "has") {
        exit (find_entry(objs, count, P1) > 0) ? 0 : 1
    }

    else if (OP == "index") {
        for (i = 1; i <= count; i++)
            if (unquote(get_field(objs[i], "id")) == P1) { print i; exit 0 }
        exit 1
    }

    else if (OP == "id") {
        idx = int(P1)
        if (idx >= 1 && idx <= count) { print unquote(get_field(objs[idx], "id")); exit 0 }
        exit 1
    }

    else if (OP == "ids") {
        for (i = 1; i <= count; i++) print unquote(get_field(objs[i], "id"))
    }

    else if (OP == "keys") {
        idx = find_entry(objs, count, P1)
        if (idx == 0) exit 1
        nk = get_keys(objs[idx], keys)
        for (k = 1; k <= nk; k++) print keys[k]
    }

    else if (OP == "dump") {
        idx = find_entry(objs, count, P1)
        if (idx == 0) exit 1
        nk = get_keys(objs[idx], keys)
        for (k = 1; k <= nk; k++) printf "%s\t%s\n", keys[k], unquote(get_field(objs[idx], keys[k]))
    }

    else if (OP == "search") {
        needle = tolower(P2)
        for (i = 1; i <= count; i++) {
            v = tolower(unquote(get_field(objs[i], P1)))
            if (index(v, needle) > 0) print i
        }
    }

    else if (OP == "raw") {
        print rebuild_array(objs, count)
    }

    else if (OP == "del") {
        idx = find_entry(objs, count, P1)
        if (idx == 0) exit 1
        nc = 0
        for (i = 1; i <= count; i++) { if (i == idx) continue; nc++; no[nc] = objs[i] }
        print rebuild_array(no, nc)
    }

    else if (OP == "set") {
        vtype = (P4 == "") ? "s" : P4
        if (vtype == "s") fval = "\"" P3 "\""; else fval = P3
        idx = find_entry(objs, count, P1)
        if (idx == 0) exit 1
        objs[idx] = set_field_in_obj(objs[idx], P2, fval)
        print rebuild_array(objs, count)
    }

    else if (OP == "delfield") {
        idx = find_entry(objs, count, P1)
        if (idx == 0) exit 1
        objs[idx] = rebuild_object(objs[idx], P2)
        print rebuild_array(objs, count)
    }

    else if (OP == "add") {
        new_obj = "{"; sep = ""
        n = split(PAIRS, plines, "\n")
        for (p = 1; p <= n; p++) {
            eq = index(plines[p], "=")
            if (eq == 0) continue
            k = substr(plines[p], 1, eq - 1)
            v = substr(plines[p], eq + 1)
            if (v == "true" || v == "false") fval = v
            else if (v ~ /^[0-9]+$/) fval = v
            else fval = "\"" v "\""
            new_obj = new_obj sep "\"" k "\":" fval; sep = ","
        }
        new_obj = new_obj "}"
        count++; objs[count] = new_obj
        print rebuild_array(objs, count)
    }

    else exit 1
}
'

_ja_ensure() { [ ! -f "$1" ] && printf '[]' > "$1"; }
_ja_uuid() { cat /proc/sys/kernel/random/uuid 2>/dev/null || printf '%s-%s' "$(date +%s)" "$$"; }

ja_count() { _ja_ensure "$1"; awk -v OP=count "$_JA_AWK" "$1"; }
ja_get()   { _ja_ensure "$1"; awk -v OP=get -v P1="$2" -v P2="$3" "$_JA_AWK" "$1"; }
ja_has()   { _ja_ensure "$1"; awk -v OP=has -v P1="$2" "$_JA_AWK" "$1" >/dev/null 2>&1; }
ja_index() { _ja_ensure "$1"; awk -v OP=index -v P1="$2" "$_JA_AWK" "$1"; }
ja_id()    { _ja_ensure "$1"; awk -v OP=id -v P1="$2" "$_JA_AWK" "$1"; }
ja_ids()   { _ja_ensure "$1"; awk -v OP=ids "$_JA_AWK" "$1"; }
ja_keys()  { _ja_ensure "$1"; awk -v OP=keys -v P1="$2" "$_JA_AWK" "$1"; }
ja_dump()  { _ja_ensure "$1"; awk -v OP=dump -v P1="$2" "$_JA_AWK" "$1"; }
ja_search(){ _ja_ensure "$1"; awk -v OP=search -v P1="$2" -v P2="$3" "$_JA_AWK" "$1"; }
ja_raw()   { _ja_ensure "$1"; awk -v OP=raw "$_JA_AWK" "$1"; }

ja_add() {
    _f=$1; shift; _ja_ensure "$_f"
    _has_id=0
    for _a in "$@"; do case "$_a" in id=*) _has_id=1 ;; esac; done
    _pairs=""
    if [ "$_has_id" -eq 0 ]; then
        _uid=$(_ja_uuid)
        _pairs="id=$_uid"
    fi
    for _a in "$@"; do
        [ -n "$_pairs" ] && _pairs="$_pairs
$_a" || _pairs="$_a"
    done
    _pairs_esc=$(printf '%s\n' "$_pairs" | awk '{gsub(/\\/,"\\\\")}{if(NR>1)printf "\\n";printf "%s",$0}')
    _out=$(awk -v OP=add -v PAIRS="$_pairs_esc" "$_JA_AWK" "$_f") || return 1
    printf '%s\n' "$_out" > "$_f"
    if [ "$_has_id" -eq 0 ]; then
        printf '%s\n' "$_uid"
    else
        for _a in "$@"; do case "$_a" in id=*) printf '%s\n' "${_a#id=}"; break ;; esac; done
    fi
}

ja_set() {
    _ja_ensure "$1"
    _out=$(awk -v OP=set -v P1="$2" -v P2="$3" -v P3="$4" -v P4="$5" "$_JA_AWK" "$1") || return 1
    printf '%s\n' "$_out" > "$1"
}

ja_del() {
    _ja_ensure "$1"
    _out=$(awk -v OP=del -v P1="$2" "$_JA_AWK" "$1") || return 1
    printf '%s\n' "$_out" > "$1"
}

ja_delfield() {
    _ja_ensure "$1"
    _out=$(awk -v OP=delfield -v P1="$2" -v P2="$3" "$_JA_AWK" "$1") || return 1
    printf '%s\n' "$_out" > "$1"
}
