#!/system/bin/sh
# yurirka — RKA provisioning for PassIt
# Contributed by mhmrdd <https://github.com/mhmrdd>

SCRDIR=$(cd "$(dirname "$0")" && pwd)
. "$SCRDIR/jsonarray.sh"

MOD="io.github.mhmrdd.libxposed.ps.passit"

pm path "$MOD" >/dev/null 2>&1 || exit 1

CFG="/data/user/$(id -u)/${MOD}/files/rka_configs.json"
IDFILE="/data/local/tmp/yurid"

RKA_NAME="Yuri RKA"
RKA_HOST="rp.mhmrdd.me"
RKA_TCP=59416
RKA_UDP=0
RKA_TOKEN="yurikey-5b70e270d6d69cd399c59ca3d62ccf6e"

prev_id=""
if [ -f "$IDFILE" ]; then
    prev_id=$(cat "$IDFILE" 2>/dev/null)
    case "$prev_id" in
        ????????-????-????-????-????????????) ;;
        *) prev_id="" ;;
    esac
fi

if [ -n "$prev_id" ] && ja_has "$CFG" "$prev_id"; then
    ja_set "$CFG" "$prev_id" name      "$RKA_NAME"
    ja_set "$CFG" "$prev_id" host      "$RKA_HOST"
    ja_set "$CFG" "$prev_id" tcpPort       "$RKA_TCP"    n
    ja_set "$CFG" "$prev_id" udpPort       "$RKA_UDP"    n
    ja_set "$CFG" "$prev_id" authToken "$RKA_TOKEN"
    ja_set "$CFG" "$prev_id" isActive  true           b
else
    prev_id=$(ja_add "$CFG" \
        "name=$RKA_NAME" \
        "host=$RKA_HOST" \
        "tcpPort=$RKA_TCP" \
        "udpPort=$RKA_UDP" \
        "authToken=$RKA_TOKEN" \
        "isActive=true")
    printf '%s' "$prev_id" > "$IDFILE"
fi

for _oid in $(ja_ids "$CFG"); do
    [ "$_oid" = "$prev_id" ] && continue
    ja_set "$CFG" "$_oid" isActive false b
done
