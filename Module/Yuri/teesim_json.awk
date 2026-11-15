# Strict JSON reader/writer for /data/adb/teesim/config.json (TEESimulator, schema version 1).
#
# Invoked by teesim_common.sh; never reads anything but the files named on the command line:
#   TEESIM_AWK_PROFILE=<name> TEESIM_AWK_VALUE=<text> \
#       awk -v op=<op> [-v payload=<file>] -f teesim_json.awk <config>
#
# The profile name and replacement value arrive through the environment (ENVIRON) so the shell
# quotes them without loss and awk does not interpret backslash escapes in them.
#
# Ops:
#   check              validate the document, print nothing
#   list               print a JSON array of profile names
#   list-lines         print profile names one per line (rejects control characters)
#   entries            print "<profile>\t<apps entry>" for every configured app entry
#   set-patch          set the profile patchLevel system/vendor/boot fields to `value`
#   set-targets        replace the profile apps array with the newline list in `payload`
#   set-keybox         point the sole "default" profile at keybox.xml
#
# Exit codes: 0 written to stdout, 1 rejected (reason on stderr), 10 nothing to change.
#
# The whole document is tokenised, parsed into parallel node arrays and re-emitted; values that
# are not edited are copied byte-for-byte from the input, so unknown fields and unrelated
# profiles survive. Object keys are re-emitted from their original tokens, and identity is a
# canonical encoding of the decoded bytes, so escapes such as \u0000 survive without aliasing
# another key even on awks that cannot hold a NUL byte. Line protocols (list-lines, entries)
# reject profile names and entry values containing control characters, including ones written as
# escapes, because a line cannot transport them. Malformed JSON, duplicate object keys (however
# escaped), an unexpected version and wrong field types are all rejected instead of rewritten.

BEGIN {
    # NUL is registered explicitly: sprintf("%c", 0) is empty on awks that cannot hold the byte.
    NUL_OK = (length(chr(0)) == 1)
    for (i = 1; i < 256; i++) ORD[sprintf("%c", i)] = i
    if (NUL_OK) ORD[chr(0)] = 0
    ERRMSG = ""
    NT = 0
    # Profile text travels through the environment so the shell never has to quote it and awk
    # never interprets backslash escapes in it.
    profile = ENVIRON["TEESIM_AWK_PROFILE"]
    value = ENVIRON["TEESIM_AWK_VALUE"]
}

{
    SRC = SRC $0 "\n"
}

END {
    if (!tokenize(SRC)) {
        emit_error(ERRMSG)
        exit 1
    }
    if (!parse()) {
        emit_error(ERRMSG)
        exit 1
    }
    if (!validate_config()) {
        emit_error(ERRMSG)
        exit 1
    }
    if (op == "check") exit 0
    if (op == "list") {
        if (!op_list()) { emit_error(ERRMSG); exit 1 }
        exit 0
    }
    if (op == "list-lines") {
        if (!op_list_lines()) { emit_error(ERRMSG); exit 1 }
        exit 0
    }
    if (op == "entries") {
        if (!op_entries()) { emit_error(ERRMSG); exit 1 }
        exit 0
    }
    if (op == "set-patch") {
        if (!op_set_patch()) { emit_error(ERRMSG); exit 1 }
    } else if (op == "set-targets") {
        if (!op_set_targets()) { emit_error(ERRMSG); exit 1 }
    } else if (op == "set-keybox") {
        rc = op_set_keybox()
        if (ERRMSG != "") { emit_error(ERRMSG); exit 1 }
        if (rc == 10) exit 10
    } else {
        emit_error("unknown op " op)
        exit 1
    }
    print render()
    exit 0
}

function emit_error(msg) {
    print "teesim-json: " msg > "/dev/stderr"
}

function fail(msg) {
    if (ERRMSG == "") ERRMSG = msg
    return 0
}

function ordch(c) {
    return (c in ORD) ? ORD[c] : -1
}

function chr(c) {
    return sprintf("%c", c)
}

function utf8(cp,   s) {
    if (cp < 128) return chr(cp)
    if (cp < 2048) {
        s = chr(192 + int(cp / 64))
        return s chr(128 + cp % 64)
    }
    if (cp < 65536) {
        s = chr(224 + int(cp / 4096))
        s = s chr(128 + int((cp % 4096) / 64))
        return s chr(128 + cp % 64)
    }
    s = chr(240 + int(cp / 262144))
    s = s chr(128 + int((cp % 262144) / 4096))
    s = s chr(128 + int((cp % 4096) / 64))
    return s chr(128 + cp % 64)
}

function hexval(h,   i, d, n) {
    n = 0
    for (i = 1; i <= 4; i++) {
        d = ordch(substr(h, i, 1))
        if (d >= 48 && d <= 57) n = n * 16 + (d - 48)
        else if (d >= 65 && d <= 70) n = n * 16 + (d - 55)
        else n = n * 16 + (d - 87)
    }
    return n
}

function jesc(s,   out, i, n, c, code) {
    out = ""
    n = length(s)
    for (i = 1; i <= n; i++) {
        c = substr(s, i, 1)
        code = ordch(c)
        if (c == "\"") out = out "\\\""
        else if (c == "\\") out = out "\\\\"
        else if (code == 8) out = out "\\b"
        else if (code == 9) out = out "\\t"
        else if (code == 10) out = out "\\n"
        else if (code == 12) out = out "\\f"
        else if (code == 13) out = out "\\r"
        else if (code >= 0 && code < 32) out = out sprintf("\\u%04x", code)
        else out = out c
    }
    return out
}

function quote(s) {
    return "\"" jesc(s) "\""
}

# Canonical identity of a decoded string: two hex digits per byte. It is injective for byte
# strings and never contains a NUL, so keys that differ only by an embedded NUL, or that use
# different escape spellings for the same code point, compare exactly on every awk.
function canon_text(s,   i, n, out) {
    out = ""
    n = length(s)
    for (i = 1; i <= n; i++) out = out sprintf("%02x", ordch(substr(s, i, 1)))
    return out
}

# --- tokenizer ------------------------------------------------------------------------------

function scan_string(src, start,   i, n, ch, code, e, hex, hex2, cp, lo) {
    n = length(src)
    i = start + 1
    SVAL = ""
    S_CAN = ""
    S_CTRL = 0
    while (i <= n) {
        ch = substr(src, i, 1)
        if (ch == "\"") {
            SLEN = i - start + 1
            SNEXT = i + 1
            return 1
        }
        if (ch == "\\") {
            if (i + 1 > n) return fail("unterminated escape sequence")
            e = substr(src, i + 1, 1)
            if (e == "\"" || e == "\\" || e == "/") {
                scan_add(e)
                i += 2
                continue
            }
            if (e == "b") { S_CTRL = 1; scan_add(chr(8)); i += 2; continue }
            if (e == "f") { S_CTRL = 1; scan_add(chr(12)); i += 2; continue }
            if (e == "n") { S_CTRL = 1; scan_add(chr(10)); i += 2; continue }
            if (e == "r") { S_CTRL = 1; scan_add(chr(13)); i += 2; continue }
            if (e == "t") { S_CTRL = 1; scan_add(chr(9)); i += 2; continue }
            if (e != "u") return fail("invalid escape sequence")
            hex = substr(src, i + 2, 4)
            if (length(hex) != 4 || hex !~ /^[0-9A-Fa-f]+$/) return fail("invalid unicode escape")
            cp = hexval(hex)
            if (cp >= 55296 && cp <= 56319) {
                if (substr(src, i + 6, 2) != "\\u") return fail("invalid unicode surrogate pair")
                hex2 = substr(src, i + 8, 4)
                if (length(hex2) != 4 || hex2 !~ /^[0-9A-Fa-f]+$/) return fail("invalid unicode surrogate pair")
                lo = hexval(hex2)
                if (lo < 56320 || lo > 57343) return fail("invalid unicode surrogate pair")
                cp = 65536 + (cp - 55296) * 1024 + (lo - 56320)
                i += 12
            } else if (cp >= 56320 && cp <= 57343) {
                return fail("invalid unicode surrogate pair")
            } else {
                i += 6
            }
            if (cp < 32 || cp == 127) S_CTRL = 1
            if (cp == 0) {
                # The canonical form always records the NUL; the decoded value only carries it
                # when the awk running this script can represent the byte.
                S_CAN = S_CAN "00"
                if (NUL_OK) SVAL = SVAL chr(0)
            } else {
                scan_add(utf8(cp))
            }
            continue
        }
        code = ordch(ch)
        if (code >= 0 && code < 32) return fail("raw control character in string")
        if (code == 127) S_CTRL = 1
        scan_add(ch)
        i++
    }
    return fail("unterminated string")
}

function scan_add(s) {
    SVAL = SVAL s
    S_CAN = S_CAN canon_text(s)
}

function tokenize(src,   n, i, ch, code, j, c2, raw) {
    n = length(src)
    i = 1
    NT = 0
    while (i <= n) {
        ch = substr(src, i, 1)
        code = ordch(ch)
        if (code == 32 || code == 9 || code == 10 || code == 13) {
            i++
            continue
        }
        if (ch == "{" || ch == "}" || ch == "[" || ch == "]" || ch == ":" || ch == ",") {
            NT++
            TT[NT] = ch
            TR[NT] = ch
            TV[NT] = ""
            i++
            continue
        }
        if (ch == "\"") {
            if (!scan_string(src, i)) return 0
            NT++
            TT[NT] = "str"
            TR[NT] = substr(src, i, SLEN)
            TV[NT] = SVAL
            TCAN[NT] = S_CAN
            TCTRL[NT] = S_CTRL
            i = SNEXT
            continue
        }
        if (ch == "-" || (code >= 48 && code <= 57)) {
            j = i
            while (j <= n) {
                c2 = ordch(substr(src, j, 1))
                if ((c2 >= 48 && c2 <= 57) || c2 == 43 || c2 == 45 || c2 == 46 || c2 == 69 || c2 == 101) j++
                else break
            }
            raw = substr(src, i, j - i)
            if (raw !~ /^-?(0|[1-9][0-9]*)(\.[0-9]+)?([eE][+-]?[0-9]+)?$/)
                return fail("invalid number")
            NT++
            TT[NT] = "num"
            TR[NT] = raw
            TV[NT] = raw
            i = j
            continue
        }
        if (substr(src, i, 4) == "true") {
            NT++; TT[NT] = "bool"; TR[NT] = "true"; TV[NT] = "true"; i += 4; continue
        }
        if (substr(src, i, 5) == "false") {
            NT++; TT[NT] = "bool"; TR[NT] = "false"; TV[NT] = "false"; i += 5; continue
        }
        if (substr(src, i, 4) == "null") {
            NT++; TT[NT] = "null"; TR[NT] = "null"; TV[NT] = ""; i += 4; continue
        }
        return fail("unexpected character")
    }
    return 1
}

# --- parser ---------------------------------------------------------------------------------

function attach(id, parent, key, kraw, kcan, kctrl) {
    N_PARENT[id] = parent
    if (parent == 0) {
        ROOT = id
        return
    }
    # Children are addressed as (parent node, individual key), never as a concatenated path, so
    # a key containing a delimiter cannot alias another node. Key identity is the canonical
    # form, and the original key token is kept so rendering never has to decode and re-escape it
    # (which would lose NUL on some awks).
    N_KEY[id] = key
    N_KRAW[id] = kraw
    N_KCAN[id] = kcan
    N_KCTRL[id] = kctrl
    if (N_FIRST[parent] == 0) N_FIRST[parent] = id
    else N_NEXT[N_LAST[parent]] = id
    N_LAST[parent] = id
}

function start_value(k, parent, key, kraw, kcan, kctrl,   t, id) {
    t = TT[k]
    if (t == "{" || t == "[") {
        CNT++
        id = CNT
        N_TYPE[id] = (t == "{") ? "obj" : "arr"
        attach(id, parent, key, kraw, kcan, kctrl)
        if (SP > 0) S_STATE[SP] = "comma"
        SP++
        S_TYPE[SP] = N_TYPE[id]
        S_ID[SP] = id
        S_STATE[SP] = (t == "{") ? "key" : "val"
        S_KEY[SP] = ""
        return k + 1
    }
    if (t == "}" || t == "]" || t == ":" || t == ",") return fail("unexpected " t)
    CNT++
    id = CNT
    N_TYPE[id] = t
    N_RAW[id] = TR[k]
    N_VAL[id] = TV[k]
    N_CTRL[id] = TCTRL[k]
    attach(id, parent, key, kraw, kcan, kctrl)
    if (SP > 0) S_STATE[SP] = "comma"
    else DOC = "done"
    return k + 1
}

function close_frame(k) {
    SP--
    if (SP > 0) S_STATE[SP] = "comma"
    else DOC = "done"
    return k + 1
}

function parse(   k, t, id, st, kid) {
    SP = 0
    CNT = 0
    ROOT = 0
    DOC = "want"
    if (NT == 0) return fail("empty document")
    k = 1
    while (1) {
        if (SP == 0) {
            if (DOC == "done") break
            k = start_value(k, 0, "", "", "", 0)
            if (ERRMSG != "") return 0
            continue
        }
        st = S_STATE[SP]
        id = S_ID[SP]
        t = (k <= NT) ? TT[k] : ""
        if (S_TYPE[SP] == "obj") {
            if (st == "key" || st == "more-key") {
                if (k > NT) return fail("unexpected end of document")
                if (t == "}") {
                    if (st == "more-key") return fail("trailing comma in object")
                    k = close_frame(k)
                    continue
                }
                if (t != "str") return fail("object key is not a string")
                # Keys are duplicates when they decode to the same bytes, whatever escape
                # spelling produced them. The canonical form keeps embedded NULs distinct even
                # on awks that drop NUL from strings.
                kid = TCAN[k]
                if ((id SUBSEP kid) in SEENKEY) return fail("duplicate object key " TR[k])
                SEENKEY[id SUBSEP kid] = 1
                S_KEY[SP] = TV[k]
                S_KRAW[SP] = TR[k]
                S_KCAN[SP] = TCAN[k]
                S_KCTRL[SP] = TCTRL[k]
                S_STATE[SP] = "colon"
                k++
                continue
            }
            if (st == "colon") {
                if (k > NT || t != ":") return fail("expected : after object key")
                S_STATE[SP] = "val"
                k++
                continue
            }
            if (st == "val") {
                if (k > NT) return fail("missing object value")
                k = start_value(k, id, S_KEY[SP], S_KRAW[SP], S_KCAN[SP], S_KCTRL[SP])
                if (ERRMSG != "") return 0
                continue
            }
            if (k > NT) return fail("unexpected end of document")
            if (t == ",") {
                S_STATE[SP] = "more-key"
                k++
                continue
            }
            if (t == "}") {
                k = close_frame(k)
                continue
            }
            return fail("expected , or } in object")
        }
        if (st == "val" || st == "more-val") {
            if (k > NT) return fail("unexpected end of document")
            if (t == "]") {
                if (st == "more-val") return fail("trailing comma in array")
                k = close_frame(k)
                continue
            }
            k = start_value(k, id, "", "", "", 0)
            if (ERRMSG != "") return 0
            continue
        }
        if (k > NT) return fail("unexpected end of document")
        if (t == ",") {
            S_STATE[SP] = "more-val"
            k++
            continue
        }
        if (t == "]") {
            k = close_frame(k)
            continue
        }
        return fail("expected , or ] in array")
    }
    if (k <= NT) return fail("trailing data after JSON value")
    if (ROOT == 0) return fail("missing JSON value")
    return 1
}

# --- lookups --------------------------------------------------------------------------------

# Looks a key up among the direct children of a node. Sibling keys are compared by canonical
# identity; no delimiter-joined path is built and no NUL-bearing key can alias its lossy form.
function child_at(node, key,   c, kc) {
    kc = canon_text(key)
    c = N_FIRST[node]
    while (c != 0) {
        if (N_KCAN[c] == kc) return c
        c = N_NEXT[c]
    }
    return 0
}

function profile_node(name) {
    return child_at(PROFILES, name)
}

# --- validation -----------------------------------------------------------------------------

function validate_config(   v, prof, c) {
    if (N_TYPE[ROOT] != "obj") return fail("config.json is not a JSON object")
    v = child_at(ROOT, "version")
    if (v == 0) return fail("config.json has no version field")
    if (N_TYPE[v] != "num") return fail("config.json version is not a number")
    if (N_RAW[v] + 0 != 1) return fail("unsupported config version " N_RAW[v] " (expected 1)")
    prof = child_at(ROOT, "profiles")
    if (prof == 0) return fail("config.json has no profiles object")
    if (N_TYPE[prof] != "obj") return fail("config.json profiles is not an object")
    if (N_FIRST[prof] == 0) return fail("config.json has no profiles")
    c = N_FIRST[prof]
    while (c != 0) {
        if (N_TYPE[c] != "obj") return fail("profile " quote(N_KEY[c]) " is not an object")
        c = N_NEXT[c]
    }
    PROFILES = prof
    return 1
}

function entries_of(profnode, out_arr,   apps, c) {
    apps = child_at(profnode, "apps")
    if (apps == 0) return 0
    if (N_TYPE[apps] != "arr") return -1
    c = N_FIRST[apps]
    while (c != 0) {
        if (N_TYPE[c] != "str") return -2
        # The line protocol cannot carry tabs, newlines or NULs (even escaped ones) without
        # changing which profile owns the entry, so refuse the whole listing.
        if (N_CTRL[c]) return -3
        out_arr[++ENTRIES_N] = N_VAL[c]
        c = N_NEXT[c]
    }
    return 0
}

# --- ops ------------------------------------------------------------------------------------

function op_list(   c, out, first) {
    out = "["
    first = 1
    c = N_FIRST[PROFILES]
    while (c != 0) {
        if (!first) out = out ","
        out = out N_KRAW[c]
        first = 0
        c = N_NEXT[c]
    }
    out = out "]"
    print out
    return 1
}

function op_list_lines(   c, n) {
    c = N_FIRST[PROFILES]
    n = 0
    while (c != 0) {
        if (N_KCTRL[c])
            return fail("profile name contains control characters and cannot be shown")
        n++
        c = N_NEXT[c]
    }
    c = N_FIRST[PROFILES]
    while (c != 0) {
        print N_KEY[c]
        c = N_NEXT[c]
    }
    return 1
}

function op_entries(   c, rc, i) {
    c = N_FIRST[PROFILES]
    while (c != 0) {
        if (N_KCTRL[c])
            return fail("profile " quote(N_KEY[c]) " name contains control characters")
        ENTRIES_N = 0
        split("", CUR_ENTRIES)
        rc = entries_of(c, CUR_ENTRIES)
        if (rc == -1) return fail("profile " quote(N_KEY[c]) " apps is not an array")
        if (rc == -2) return fail("profile " quote(N_KEY[c]) " has a non-string apps entry")
        if (rc == -3) return fail("profile " quote(N_KEY[c]) " has an apps entry with control characters")
        c = N_NEXT[c]
    }
    c = N_FIRST[PROFILES]
    while (c != 0) {
        ENTRIES_N = 0
        split("", CUR_ENTRIES)
        entries_of(c, CUR_ENTRIES)
        for (i = 1; i <= ENTRIES_N; i++) print N_KEY[c] "\t" CUR_ENTRIES[i]
        c = N_NEXT[c]
    }
    return 1
}

function op_set_patch(   p, pl, f, i, fields, vals, missing, existing) {
    p = profile_node(profile)
    if (p == 0) return fail("profile " quote(profile) " not found")
    fields[1] = "system"; vals[1] = "system_property"
    fields[2] = "vendor"; vals[2] = value
    fields[3] = "boot"; vals[3] = value
    pl = child_at(p, "patchLevel")
    if (pl != 0) {
        if (N_TYPE[pl] != "obj") return fail("profile " quote(profile) " patchLevel is not an object")
        missing = ""
        for (i = 1; i <= 3; i++) {
            existing = child_at(pl, fields[i])
            if (existing == 0) {
                if (missing != "") missing = missing ","
                missing = missing quote(fields[i]) ":" quote(vals[i])
            } else {
                if (N_TYPE[existing] != "str")
                    return fail("profile " quote(profile) " patchLevel." fields[i] " is not a string")
                REPL[existing] = quote(vals[i])
            }
        }
        if (missing != "") INS[pl] = missing
        return 1
    }
    missing = ""
    for (i = 1; i <= 3; i++) {
        if (missing != "") missing = missing ","
        missing = missing quote(fields[i]) ":" quote(vals[i])
    }
    INS[p] = "\"patchLevel\":{" missing "}"
    return 1
}

function op_set_targets(   p, apps, c, line, out, sep, n, seen, list) {
    p = profile_node(profile)
    if (p == 0) return fail("profile " quote(profile) " not found")
    apps = child_at(p, "apps")
    if (apps != 0) {
        if (N_TYPE[apps] != "arr") return fail("profile " quote(profile) " apps is not an array")
        c = N_FIRST[apps]
        while (c != 0) {
            if (N_TYPE[c] != "str")
                return fail("profile " quote(profile) " has a non-string apps entry")
            c = N_NEXT[c]
        }
    }
    n = 0
    while ((getline line < payload) > 0) {
        sub(/\r$/, "", line)
        gsub(/^[ \t]+/, "", line)
        gsub(/[ \t]+$/, "", line)
        if (line == "") continue
        if (line !~ /^[A-Za-z0-9_.]+(@[0-9]+)?$/ && line !~ /^uid:[0-9]+$/)
            return fail("refusing to write invalid app entry " quote(line))
        if (line in seen) continue
        seen[line] = 1
        list[++n] = line
    }
    close(payload)
    if (n == 0) {
        c = child_at(p, "autoIncludeNewApps")
        if (c == 0 || N_TYPE[c] != "bool" || N_VAL[c] != "true")
            return fail("profile " quote(profile) " would end up with no apps")
    }
    out = "["
    for (c = 1; c <= n; c++) {
        if (c > 1) out = out ","
        out = out quote(list[c])
    }
    out = out "]"
    if (apps != 0) REPL[apps] = out
    else INS[p] = "\"apps\":" out
    return 1
}

function op_set_keybox(   c, only, kb, i) {
    only = 0
    i = 0
    c = N_FIRST[PROFILES]
    while (c != 0) {
        i++
        only = c
        c = N_NEXT[c]
    }
    if (i != 1) return 10
    if (N_KCAN[only] != canon_text("default")) return 10
    kb = child_at(only, "keybox")
    if (kb == 0) return fail("profile \"default\" has no keybox")
    if (N_TYPE[kb] != "str") return fail("profile \"default\" keybox is not a string")
    if (N_VAL[kb] == value) return 10
    REPL[kb] = quote(value)
    return 1
}

# --- rendering ------------------------------------------------------------------------------

function indent(d,   s) {
    s = ""
    while (d-- > 0) s = s "  "
    return s
}

function scalar_raw(n) {
    if (n in REPL) return REPL[n]
    return N_RAW[n]
}

function render(   out, sp, n, t, c) {
    out = ""
    sp = 1
    R_NODE[1] = ROOT
    R_START[1] = 0
    R_CUR[1] = 0
    R_CNT[1] = 0
    while (sp > 0) {
        n = R_NODE[sp]
        t = N_TYPE[n]
        if (!R_START[sp]) {
            R_START[sp] = 1
            if (t == "obj" || t == "arr") {
                if (n in REPL) {
                    out = out REPL[n]
                    sp--
                    continue
                }
                out = out (t == "obj" ? "{" : "[")
            } else {
                out = out scalar_raw(n)
                sp--
                continue
            }
            R_CUR[sp] = N_FIRST[n]
            continue
        }
        c = R_CUR[sp]
        if (c != 0) {
            R_CUR[sp] = N_NEXT[c]
            if (R_CNT[sp] > 0) out = out ","
            R_CNT[sp]++
            out = out "\n" indent(sp)
            if (t == "obj") out = out N_KRAW[c] ": "
            sp++
            R_NODE[sp] = c
            R_START[sp] = 0
            R_CUR[sp] = 0
            R_CNT[sp] = 0
            continue
        }
        if (t == "obj" && (n in INS) && INS[n] != "") {
            if (R_CNT[sp] > 0) out = out ","
            R_CNT[sp]++
            out = out "\n" indent(sp) INS[n]
        }
        if (R_CNT[sp] == 0) out = out (t == "obj" ? "}" : "]")
        else out = out "\n" indent(sp - 1) (t == "obj" ? "}" : "]")
        sp--
    }
    return out
}
