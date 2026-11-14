(function (global) {
  const NOTIFICATION_MODE_KEY = "notificationMode";
  const NOTIFICATION_MODES = ["toast", "android"];
  const DEFAULT_NOTIFICATION_MODE = "toast";
  const NOTIFICATION_TAG = "yurikey";
  const DESCRIPTION_KEYS = {
    toast: {
      key: "notification_mode_toast_desc",
      fallback: "Messages appear as in-page toasts while this page is open.",
    },
    android: {
      key: "notification_mode_android_desc",
      fallback: "Messages appear as Android system notifications while this page is open.",
    },
  };

  function getNotificationMode() {
    try {
      const stored = global.localStorage.getItem(NOTIFICATION_MODE_KEY);
      return NOTIFICATION_MODES.includes(stored) ? stored : DEFAULT_NOTIFICATION_MODE;
    } catch {
      return DEFAULT_NOTIFICATION_MODE;
    }
  }

  function shellQuote(value) {
    return `'${String(value).replace(/'/g, `'\\''`)}'`;
  }

  function buildAndroidNotificationCommand(message, title) {
    const post = `cmd notification post -t ${shellQuote(title)} ${NOTIFICATION_TAG} ${shellQuote(message)}`;
    return `su -lp 2000 -c ${shellQuote(post)}`;
  }

  function updateNotificationDescription(mode = getNotificationMode()) {
    const element = global.document?.getElementById("notification-mode-desc");
    if (!element) return;

    const description = DESCRIPTION_KEYS[mode] || DESCRIPTION_KEYS[DEFAULT_NOTIFICATION_MODE];
    element.textContent = global.t ? global.t(description.key, description.fallback) : description.fallback;
  }

  let deliveryQueue = Promise.resolve();

  function sendAndroidNotification(message) {
    if (!global.Bridge || !global.Bridge.isAvailable()) {
      return Promise.reject(new Error("Root execution bridge unavailable"));
    }

    const title = global.t ? global.t("notification_title", "Yurikey") : "Yurikey";
    const command = buildAndroidNotificationCommand(message, title);

    const delivery = deliveryQueue.then(() => global.Bridge.exec(command)).then(
      ({ code, stdout, stderr }) => {
        if (code !== 0) {
          throw new Error(stderr || stdout || `Notification command exited with ${code}`);
        }
      }
    );

    deliveryQueue = delivery.catch(() => {});
    return delivery;
  }

  global.getNotificationMode = getNotificationMode;
  global.sendAndroidNotification = sendAndroidNotification;
  global.buildAndroidNotificationCommand = buildAndroidNotificationCommand;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = {
      NOTIFICATION_MODE_KEY,
      NOTIFICATION_MODES,
      DEFAULT_NOTIFICATION_MODE,
      getNotificationMode,
      shellQuote,
      buildAndroidNotificationCommand,
      sendAndroidNotification,
    };
  }

  if (typeof global.addEventListener !== "function" || typeof global.document === "undefined") {
    return;
  }

  global.addEventListener("DOMContentLoaded", () => {
    if (typeof global.initSegmentedPicker !== "function") return;

    const picker = global.initSegmentedPicker({
      root: document.getElementById("notification-mode-picker"),
      valueAttribute: "notificationMode",
      values: NOTIFICATION_MODES,
      defaultValue: DEFAULT_NOTIFICATION_MODE,
      storageKey: NOTIFICATION_MODE_KEY,
      onApply(mode) {
        updateNotificationDescription(mode);
        if (mode !== "android") return;

        const enabledMessage = global.t
          ? global.t("notification_mode_android_enabled", "Android notifications enabled.")
          : "Android notifications enabled.";

        sendAndroidNotification(enabledMessage).catch(() => {
          const failureMessage = global.t
            ? global.t("notification_mode_android_failed", "Android notifications unavailable. Showing in-page toast instead.")
            : "Android notifications unavailable. Showing in-page toast instead.";
          global.showToastVisual(failureMessage, "error", 4500);
        });
      },
    });

    updateNotificationDescription(picker ? picker.getValue() : getNotificationMode());
    global.document.addEventListener("languageChanged", () => updateNotificationDescription());
  });
})(typeof window !== "undefined" ? window : globalThis);
