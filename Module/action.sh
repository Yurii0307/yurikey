MODPATH="${0%/*}"

# Show UI banner
echo ""
echo "*****************************************************"
echo "******************Yurikey Function******************"
echo "*********************************"
echo "- Press Volume UP button: Get Strong Integrity"
echo "- Press Volume DOWN button: Hide Root"
echo "- Press POWER button: Get Both"
echo "*****************************************************"
echo ""

# Remove any old event logs
rm -f /dev/.magisk_key_event

# Start listening to hardware events in the background and output to a temporary file
getevent -lqc 100 > /dev/.magisk_key_event &
GETEVENT_PID=$!

KEY_PRESSED="TIMEOUT"
COUNT=0

# Loop for 10 seconds (100 intervals of 0.1 sec)
while [ $COUNT -lt 100 ]; do
    # Check if Volume UP was pressed
    if grep -q "KEY_VOLUMEUP.*DOWN" /dev/.magisk_key_event; then
        KEY_PRESSED="UP"
        break
    # Check if Volume DOWN was pressed
    elif grep -q "KEY_VOLUMEDOWN.*DOWN" /dev/.magisk_key_event; then
        KEY_PRESSED="DOWN"
        break
    # Optional: If Power button is pressed
    elif grep -q "KEY_POWER.*DOWN" /dev/.magisk_key_event; then
        KEY_PRESSED="POWER"
        break
    fi
    sleep 0.1
    COUNT=$((COUNT + 1))
done

# Stop the getevent background process so it doesn't run forever
kill $GETEVENT_PID 2>/dev/null
rm -f /dev/.magisk_key_event

# Get device infomation
device_info () {
  if [ -f /data/adb/modules_update/Yurikey/webroot/common/device-info.sh ]; then
    sh /data/adb/modules_update/Yurikey/webroot/common/device-info.sh
  elif [ -f /data/adb/modules/yurikey/webroot/common/device-info.sh ]; then
    sh /data/adb/modules/yurikey/webroot/common/device-info.sh
  fi
}

# Execute scripts based on the key pressed and set the final message
case "$KEY_PRESSED" in
  "UP")
    echo -e "$(date +%Y-%m-%d\ %H:%M:%S) Volume UP detected! Running scripts..."
    sh "$MODPATH/Yuri/action/integrity.sh"
    FINAL_MSG="Meets Strong Integrity with Yurikey Manager✨✨"
    ;;
  "DOWN")
    echo -e "$(date +%Y-%m-%d\ %H:%M:%S) Volume DOWN detected! Running scripts..."
    sh "$MODPATH/Yuri/action/root.sh"
    FINAL_MSG="Hide root easily with Yurikey Manager✨✨"
    ;;
  "POWER")
    echo -e "$(date +%Y-%m-%d\ %H:%M:%S) POWER detected! Running scripts..."
    sh "$MODPATH/Yuri/action/integrity.sh"
    sh "$MODPATH/Yuri/action/root.sh"
    FINAL_MSG="Meets Strong Integrity and Hide root easily with Yurikey Manager✨✨"
    ;;
  *)
    echo -e "$(date +%Y-%m-%d\ %H:%M:%S) No input detected within 10 seconds! Running scripts..."
    sh "$MODPATH/Yuri/action/integrity.sh"
    sh "$MODPATH/Yuri/action/root.sh"
    FINAL_MSG="Meets Strong Integrity and Hide root easily with Yurikey Manager✨✨"
    ;;
esac

# Run device-info if it exists
if [ -f /data/adb/modules_update/Yurikey/webroot/common/device-info.sh ]; then
  sh /data/adb/modules_update/Yurikey/webroot/common/device-info.sh
elif [ -f /data/adb/modules/yurikey/webroot/common/device-info.sh ]; then
  sh /data/adb/modules/yurikey/webroot/common/device-info.sh
fi

# Print the final result message
echo -e "$(date +%Y-%m-%d\ %H:%M:%S) $FINAL_MSG"
