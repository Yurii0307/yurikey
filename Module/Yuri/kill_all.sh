#!/system/bin/sh

SCRIPT_DIR="${0%/*}"

exec sh "$SCRIPT_DIR/run_package_actions.sh" "KILL_ALL" "clear-data" \
  "com.android.vending" \
  "com.google.android.gsf" \
  "com.google.android.gms" \
  "com.google.android.contactkeys" \
  "com.google.android.ims" \
  "com.google.android.safetycore" \
  "com.google.android.apps.walletnfcrel" \
  "com.google.android.apps.nbu.paisa.user" \
  "com.zhenxi.hunter" \
  "com.reveny.nativecheck" \
  "io.github.vvb2060.keyattestation" \
  "io.github.vvb2060.mahoshojo" \
  "icu.nullptr.nativetest" \
  "com.android.nativetest" \
  "io.liankong.riskdetector" \
  "me.garfieldhan.holmes" \
  "luna.safe.luna" \
  "gr.nikolasspyr.integritycheck" \
  "com.youhu.laifu"
