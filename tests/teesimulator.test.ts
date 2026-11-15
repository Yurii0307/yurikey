import { test, expect, describe } from "bun:test";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  existsSync,
  chmodSync,
  readdirSync,
  statSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const ROOT = process.cwd();
const YURI = join(ROOT, "Module/Yuri");
const COMMON = join(YURI, "teesim_common.sh");

type Fixture = {
  root: string;
  data: string;
  bin: string;
  modules: string;
  updates: string;
  tricky: string;
};

const BASE_CONFIG = {
  version: 1,
  profiles: {
    default: {
      keybox: "keybox.xml",
      mode: "patch",
      patchLevel: { system: "today", vendor: "YYYY-MM-05", boot: "YYYY-MM-05" },
      osVersion: "",
      apps: ["com.android.vending"],
      autoIncludeNewApps: false,
      brand: "Google",
    },
    work: {
      keybox: "work.xml",
      patchLevel: { system: "today", vendor: "YYYY-MM-05", boot: "YYYY-MM-05" },
      apps: ["com.foo@10", "uid:10102"],
      autoIncludeNewApps: false,
    },
  },
};

function configText(config: unknown): string {
  return `${JSON.stringify(config, null, 2)}\n`;
}

function makeFixture(options: {
  teesim?: boolean;
  tricky?: boolean;
  config?: unknown;
  rawConfig?: string;
} = {}): Fixture {
  const root = mkdtempSync(join(tmpdir(), "yurikey-teesim-"));
  const data = join(root, "teesim-data");
  const bin = join(root, "bin");
  const modules = join(root, "modules");
  const updates = join(root, "modules_update");
  const tricky = join(root, "tricky-store");
  mkdirSync(data, { recursive: true });
  mkdirSync(bin, { recursive: true });
  mkdirSync(modules, { recursive: true });
  mkdirSync(updates, { recursive: true });
  mkdirSync(tricky, { recursive: true });
  if (options.teesim) mkdirSync(join(modules, "teesim"), { recursive: true });
  if (options.tricky) mkdirSync(join(modules, "tricky_store"), { recursive: true });
  if (options.rawConfig !== undefined) {
    writeFileSync(join(data, "config.json"), options.rawConfig);
  } else {
    writeFileSync(join(data, "config.json"), configText(options.config ?? BASE_CONFIG));
  }
  return { root, data, bin, modules, updates, tricky };
}

function stub(fx: Fixture, name: string, body: string) {
  const path = join(fx.bin, name);
  writeFileSync(path, body);
  chmodSync(path, 0o755);
}

function run(script: string, args: string[], fx: Fixture, env: Record<string, string> = {}, script_dir = YURI) {
  const result = Bun.spawnSync({
    cmd: ["sh", script_dir === YURI ? join(YURI, script) : join(script_dir, script), ...args],
    env: {
      ...process.env,
      PATH: `${fx.bin}:${process.env.PATH}`,
      TEESIM_DATA_DIR: fx.data,
      TEESIM_MODULES_DIR: fx.modules,
      TEESIM_MODULES_UPDATE_DIR: fx.updates,
      TRICKY_DATA_DIR: fx.tricky,
      TEESIM_KEY_TIMEOUT: "2",
      TEESIM_KEY_POLL: "0.05",
      TEESIM_TMP_DIR: join(fx.root, "tmp"),
      TEESIM_PROFILE: "",
      TEESIM_NO_SELECTION: "",
      ...env,
    },
    stdout: "pipe",
    stderr: "pipe",
  });
  return {
    code: result.exitCode,
    stdout: result.stdout.toString(),
    stderr: result.stderr.toString(),
  };
}

type TeesimProfile = {
  keybox?: string;
  patchLevel?: Record<string, string>;
  apps?: string[];
  autoIncludeNewApps?: boolean;
  brand?: string;
  osVersion?: string;
};

type TeesimConfig = { version: number; profiles: Record<string, TeesimProfile> };

function readConfig(fx: Fixture): TeesimConfig {
  return JSON.parse(readFileSync(join(fx.data, "config.json"), "utf-8")) as TeesimConfig;
}

function rawConfig(fx: Fixture): string {
  return readFileSync(join(fx.data, "config.json"), "utf-8");
}

function dataDirEntries(fx: Fixture): string[] {
  return readdirSync(fx.data).sort();
}

function stubDate(fx: Fixture, year: string, month: string, day: string) {
  stub(
    fx,
    "date",
    `#!/bin/sh
case "$1" in
  +%Y) echo ${year} ;;
  +%m) echo ${month} ;;
  +%d) echo ${day} ;;
  *) echo "${year}-${month}-${day} 00:00:00" ;;
esac
`,
  );
}

function stubPm(fx: Fixture, body: string) {
  stub(fx, "pm", body);
}

const PM_FULL = `#!/bin/sh
if [ "$1" != "list" ] || [ "$2" != "packages" ]; then exit 1; fi
case "$#" in
  3)
    case "$3" in
      -3) printf 'package:com.user.one\\npackage:com.user.two\\n' ;;
      -s) printf 'package:com.sys.one\\npackage:com.google.android.gms\\n' ;;
      -U) printf 'package:com.user.one uid:10101\\npackage:com.user.two uid:10102\\npackage:com.sys.one uid:10103\\npackage:com.google.android.gms uid:10104\\npackage:com.android.vending uid:10105\\npackage:android uid:1000\\n' ;;
      *) exit 1 ;;
    esac
    ;;
  5)
    if [ "$3" != "--user" ] || [ "$5" != "-U" ]; then exit 1; fi
    case "$4" in
      10) printf 'package:com.foo uid:1010150\\n' ;;
      *) exit 1 ;;
    esac
    ;;
  *) exit 1 ;;
esac
`;

const KEYBOX_XML = `<?xml version="1.0"?>
<AndroidAttestation>
  <Keybox DeviceID="yuri-test"/>
</AndroidAttestation>
`;

function stubCurl(fx: Fixture, payload: string) {
  const b64 = Buffer.from(payload).toString("base64");
  stub(fx, "curl", `#!/bin/sh\ntouch '${join(fx.root, "curl-called")}'\nprintf '%s' '${b64}'\n`);
}

describe("TEESimulator support without the module", () => {
  test("the action scripts stay inert when no backend is installed", () => {
    const fx = makeFixture();
    const before = rawConfig(fx);

    const patch = run("security_patch.sh", [], fx);
    expect(patch.code).toBe(0);
    expect(existsSync(join(fx.tricky, "security_patch.txt"))).toBe(false);
    expect(rawConfig(fx)).toBe(before);

    const targets = run("target_txt.sh", [], fx);
    expect(targets.code).toBe(0);
    expect(targets.stdout).toContain("Neither Tricky Store nor TEESimulator is installed");
    expect(rawConfig(fx)).toBe(before);
    expect(existsSync(join(fx.tricky, "target.txt"))).toBe(false);
  });

  test("list-profiles reports absence with exit code 3", () => {
    const fx = makeFixture();
    const result = run("teesim_common.sh", ["list-profiles"], fx);
    expect(result.code).toBe(3);
    expect(result.stdout.trim()).toBe("");
  });
});

describe("TEESimulator patch level", () => {
  test("a TEESimulator-only install patches its profile and writes no Tricky Store file", () => {
    const fx = makeFixture({ teesim: true });
    stubDate(fx, "2026", "03", "07");

    const result = run("security_patch.sh", ["--teesim-profile", "default"], fx);
    expect(result.code).toBe(0);

    const config = readConfig(fx);
    expect(config.profiles.default.patchLevel).toEqual({
      system: "system_property",
      vendor: "2026-02-05",
      boot: "2026-02-05",
    });
    expect(config.profiles.default.brand).toBe("Google");
    expect(config.profiles.default.osVersion).toBe("");
    expect(config.profiles.work.patchLevel.vendor).toBe("YYYY-MM-05");
    expect(existsSync(join(fx.tricky, "security_patch.txt"))).toBe(false);
    expect(dataDirEntries(fx)).toEqual(["config.json"]);
  });

  test("the day-10 boundary picks the current month", () => {
    const fx = makeFixture({ teesim: true });
    stubDate(fx, "2026", "03", "1");

    run("security_patch.sh", ["--teesim-profile", "default"], fx);
    expect(readConfig(fx).profiles.default.patchLevel.vendor).toBe("2026-02-05");

    stubDate(fx, "2026", "03", "10");
    run("security_patch.sh", ["--teesim-profile", "default"], fx);
    expect(readConfig(fx).profiles.default.patchLevel.vendor).toBe("2026-03-05");

    stubDate(fx, "2026", "01", "01");
    run("security_patch.sh", ["--teesim-profile", "default"], fx);
    expect(readConfig(fx).profiles.default.patchLevel.vendor).toBe("2025-12-05");
  });

  test("unknown fields survive the edit at every level", () => {
    const fx = makeFixture({
      teesim: true,
      rawConfig: configText({
        version: 1,
        schemaNote: "kept",
        profiles: {
          default: {
            keybox: "keybox.xml",
            patchLevel: { system: "today", vendor: "YYYY-MM-05", boot: "YYYY-MM-05", extra: "kept" },
            securityLevel: "tee",
            apps: ["com.android.vending"],
          },
        },
      }),
    });
    stubDate(fx, "2026", "07", "20");

    run("security_patch.sh", ["--teesim-profile", "default"], fx);
    const config = readConfig(fx) as TeesimConfig & { schemaNote?: string };
    expect(config.schemaNote).toBe("kept");
    expect(config.profiles.default.patchLevel).toEqual({
      system: "system_property",
      vendor: "2026-07-05",
      boot: "2026-07-05",
      extra: "kept",
    });
    expect((config.profiles.default as { securityLevel?: string }).securityLevel).toBe("tee");
  });

  test("with both backends installed each one is written", () => {
    const fx = makeFixture({ teesim: true, tricky: true });
    stubDate(fx, "2026", "05", "20");

    const result = run("security_patch.sh", ["--teesim-profile", "default"], fx);
    expect(result.code).toBe(0);

    const trickyFile = readFileSync(join(fx.tricky, "security_patch.txt"), "utf-8");
    expect(trickyFile).toBe("system=prop\nboot=2026-05-05\nvendor=2026-05-05\n");
    expect(readConfig(fx).profiles.default.patchLevel).toEqual({
      system: "system_property",
      vendor: "2026-05-05",
      boot: "2026-05-05",
    });
  });
});

describe("TEESimulator app lists", () => {
  test("target_txt.sh strips the ? marker, dedupes and keeps other profiles", () => {
    const fx = makeFixture({ teesim: true, tricky: true });
    stubPm(fx, PM_FULL);

    const result = run("target_txt.sh", ["--teesim-profile", "default"], fx);
    expect(result.code).toBe(0);

    const config = readConfig(fx);
    const apps: string[] = config.profiles.default.apps;
    expect(apps).toContain("io.github.vvb2060.keyattestation");
    expect(apps.every(app => !app.includes("?"))).toBe(true);
    expect(apps).toContain("com.user.one");
    // com.user.two is uid 10102, which the other profile claims with a uid token.
    expect(apps).not.toContain("com.user.two");
    expect(new Set(apps).size).toBe(apps.length);
    expect(result.stdout).toContain("com.user.two");
    expect(config.profiles.work.apps).toEqual(["com.foo@10", "uid:10102"]);

    // The Tricky Store side keeps its own ? markers for the same run.
    const trickyFile = readFileSync(join(fx.tricky, "target.txt"), "utf-8");
    expect(trickyFile).toContain("io.github.vvb2060.keyattestation?");
    expect(trickyFile).toContain("com.user.one\n");
  });

  test("select_app_neccesary.sh writes the fixed list only", () => {
    const fx = makeFixture({ teesim: true });
    stubPm(fx, PM_FULL);
    const result = run("select_app_neccesary.sh", ["--teesim-profile", "default"], fx);
    expect(result.code).toBe(0);
    const apps: string[] = readConfig(fx).profiles.default.apps;
    expect(apps[0]).toBe("android");
    expect(apps).toContain("com.google.android.gms");
    expect(apps).not.toContain("com.user.one");
  });

  test("a failed app enumeration aborts the update instead of guessing ownership", () => {
    for (const action of ["target_txt.sh", "select_app_neccesary.sh"]) {
      const fx = makeFixture({
        teesim: true,
        tricky: true,
        rawConfig: configText({
          version: 1,
          profiles: {
            default: { keybox: "keybox.xml", apps: ["com.android.vending"] },
            work: { keybox: "work.xml", apps: ["uid:10102"] },
          },
        }),
      });
      const before = rawConfig(fx);
      const scratch = join(fx.root, "scratch");
      mkdirSync(scratch);
      stubPm(fx, "#!/bin/sh\nexit 1\n");

      const result = run(action, ["--teesim-profile", "default"], fx, {
        TEESIM_TMP_DIR: "",
        TMPDIR: scratch,
      });
      expect(result.code).not.toBe(0);
      expect(rawConfig(fx)).toBe(before);
      expect(result.stdout).toContain("cannot list installed packages");
      expect(readdirSync(scratch)).toEqual([]);
      expect(dataDirEntries(fx)).toEqual(["config.json"]);
    }
  });

  test("a colliding package stays with the profile that already owns its uid", () => {
    const fx = makeFixture({
      teesim: true,
      rawConfig: configText({
        version: 1,
        profiles: {
          default: { keybox: "keybox.xml", apps: ["com.android.vending"] },
          work: { keybox: "work.xml", apps: ["uid:10160"] },
        },
      }),
    });
    stubPm(
      fx,
      `#!/bin/sh
if [ "$1" != "list" ] || [ "$2" != "packages" ]; then exit 1; fi
case "$#" in
  3)
    case "$3" in
      -3) printf 'package:com.user.one\\n' ;;
      -s) printf '' ;;
      -U) printf 'package:com.user.one uid:10160\\npackage:android uid:1000\\n' ;;
      *) exit 1 ;;
    esac
    ;;
  *) exit 1 ;;
esac
`,
    );

    const result = run("target_txt.sh", ["--teesim-profile", "default"], fx);
    expect(result.code).toBe(0);
    const config = readConfig(fx);
    expect(config.profiles.default.apps).not.toContain("com.user.one");
    expect(config.profiles.work.apps).toEqual(["uid:10160"]);
    expect(result.stdout).toContain("uid 10160");
  });

  test("a secondary-user uid collision from another profile is excluded", () => {
    const fx = makeFixture({
      teesim: true,
      rawConfig: configText({
        version: 1,
        profiles: {
          default: { keybox: "keybox.xml", apps: ["com.android.vending"] },
          work: { keybox: "work.xml", apps: ["com.foo@10"] },
        },
      }),
    });
    // com.foo@10 resolves to uid 10101, the same uid as the generated com.user.one.
    stubPm(
      fx,
      `#!/bin/sh
if [ "$1" != "list" ] || [ "$2" != "packages" ]; then exit 1; fi
case "$#" in
  3)
    case "$3" in
      -3) printf 'package:com.user.one\\n' ;;
      -s) printf '' ;;
      -U) printf 'package:com.user.one uid:10101\\npackage:android uid:1000\\n' ;;
      *) exit 1 ;;
    esac
    ;;
  5)
    if [ "$3" != "--user" ] || [ "$5" != "-U" ]; then exit 1; fi
    case "$4" in
      10) printf 'package:com.foo uid:10101\\n' ;;
      *) exit 1 ;;
    esac
    ;;
  *) exit 1 ;;
esac
`,
    );

    const result = run("target_txt.sh", ["--teesim-profile", "default"], fx);
    expect(result.code).toBe(0);
    const config = readConfig(fx);
    expect(config.profiles.default.apps).toContain("android");
    expect(config.profiles.default.apps).not.toContain("com.user.one");
    expect(config.profiles.work.apps).toEqual(["com.foo@10"]);
    expect(result.stdout).toContain("uid 10101");
  });

  test("an unresolvable pkg@user claim aborts the app update", () => {
    const fx = makeFixture({ teesim: true });
    const before = rawConfig(fx);
    stubPm(
      fx,
      `#!/bin/sh
if [ "$1" != "list" ] || [ "$2" != "packages" ]; then exit 1; fi
case "$#" in
  3)
    case "$3" in
      -3) printf 'package:com.user.one\\n' ;;
      -s) printf '' ;;
      -U) printf 'package:com.user.one uid:10101\\n' ;;
      *) exit 1 ;;
    esac
    ;;
  5) printf 'package:com.other uid:1099\\n' ;;
  *) exit 1 ;;
esac
`,
    );

    const result = run("target_txt.sh", ["--teesim-profile", "default"], fx);
    expect(result.code).not.toBe(0);
    expect(rawConfig(fx)).toBe(before);
    expect(result.stdout).toContain("cannot resolve app ownership");
  });

  test("an empty apps list is rejected unless the profile auto-includes", () => {
    const fx = makeFixture({
      teesim: true,
      rawConfig: configText({
        version: 1,
        profiles: { default: { keybox: "keybox.xml", apps: ["com.android.vending"] } },
      }),
    });
    const before = rawConfig(fx);
    const empty = join(fx.root, "generated.txt");
    writeFileSync(empty, "");
    stubPm(fx, PM_FULL);

    const rejected = run("teesim_common.sh", ["apply-targets", "default", empty], fx);
    expect(rejected.code).toBe(4);
    expect(rawConfig(fx)).toBe(before);

    writeFileSync(
      join(fx.data, "config.json"),
      configText({
        version: 1,
        profiles: {
          default: { keybox: "keybox.xml", apps: ["com.a"], autoIncludeNewApps: true },
        },
      }),
    );
    const accepted = run("teesim_common.sh", ["apply-targets", "default", empty], fx);
    expect(accepted.code).toBe(0);
    expect(readConfig(fx).profiles.default.apps).toEqual([]);
  });
});

describe("explicit TEESimulator profile selection", () => {
  function singleProfile(name: string): string {
    return configText({
      version: 1,
      profiles: {
        [name]: {
          keybox: "keybox.xml",
          patchLevel: { system: "today", vendor: "YYYY-MM-05", boot: "YYYY-MM-05" },
          apps: ["com.android.vending"],
        },
      },
    });
  }

  test("an explicit choice is honoured when it is the only profile", () => {
    const fx = makeFixture({ teesim: true, rawConfig: singleProfile("solo") });
    stubDate(fx, "2026", "04", "20");

    const result = run("security_patch.sh", ["--teesim-profile", "solo"], fx);
    expect(result.code).toBe(0);
    expect(readConfig(fx).profiles.solo.patchLevel?.vendor).toBe("2026-04-05");
  });

  test("an explicit choice selects among several profiles", () => {
    const fx = makeFixture({ teesim: true });
    stubDate(fx, "2026", "08", "20");

    const result = run("security_patch.sh", ["--teesim-profile", "work"], fx);
    expect(result.code).toBe(0);
    const config = readConfig(fx);
    expect(config.profiles.work.patchLevel?.vendor).toBe("2026-08-05");
    expect(config.profiles.default.patchLevel?.vendor).toBe("YYYY-MM-05");
  });

  test("a missing explicit choice with one profile changes nothing", () => {
    const fx = makeFixture({ teesim: true, rawConfig: singleProfile("solo") });
    const before = rawConfig(fx);
    stubDate(fx, "2026", "04", "20");

    const result = run("security_patch.sh", ["--teesim-profile", "ghost"], fx);
    expect(result.code).not.toBe(0);
    expect(rawConfig(fx)).toBe(before);
    expect(result.stdout).toContain('TEESimulator profile "ghost" no longer exists');
  });

  test("a missing explicit choice with several profiles changes nothing", () => {
    const fx = makeFixture({ teesim: true });
    const before = rawConfig(fx);
    stubDate(fx, "2026", "04", "20");

    const result = run("security_patch.sh", ["--teesim-profile", "ghost"], fx);
    expect(result.code).not.toBe(0);
    expect(rawConfig(fx)).toBe(before);
    expect(result.stdout).toContain("no longer exists");
  });

  test("a deliberate skip wins over an explicit choice", () => {
    const fx = makeFixture({ teesim: true });
    const before = rawConfig(fx);
    stubDate(fx, "2026", "04", "20");

    const result = run("security_patch.sh", ["--teesim-profile", "default"], fx, { TEESIM_NO_SELECTION: "1" });
    expect(result.code).toBe(0);
    expect(rawConfig(fx)).toBe(before);
    expect(result.stdout).toContain("no profile was selected");
  });
});

describe("action status reporting", () => {
  const ACTIONS = ["target_txt.sh", "security_patch.sh", "select_app_neccesary.sh"];

  test("a configuration error fails every action without touching the config", () => {
    for (const action of ACTIONS) {
      const fx = makeFixture({
        teesim: true,
        tricky: true,
        rawConfig: '{"version":2,"profiles":{"a":{"keybox":"k.xml"}}}\n',
      });
      const before = rawConfig(fx);
      stubDate(fx, "2026", "04", "20");

      const result = run(action, [], fx);
      expect(result.code).not.toBe(0);
      expect(rawConfig(fx)).toBe(before);
      expect(result.stdout).toContain("unsupported config version 2");
    }
  });

  test("a failed TEESimulator write fails the action after Tricky Store succeeded", () => {
    for (const action of ACTIONS) {
      const fx = makeFixture({ teesim: true, tricky: true });
      const before = rawConfig(fx);
      stubDate(fx, "2026", "04", "20");
      stubPm(fx, PM_FULL);
      chmodSync(fx.data, 0o500);
      try {
        const result = run(action, ["--teesim-profile", "default"], fx);
        expect(result.code).not.toBe(0);
        expect(rawConfig(fx)).toBe(before);
        expect(result.stdout).toContain("but the TEESimulator");
      } finally {
        chmodSync(fx.data, 0o700);
      }
    }
  });

  test("an apply-stage absence after selection is a no-op, not a failure", () => {
    const plainProfiles = configText({
      version: 1,
      profiles: {
        default: { keybox: "keybox.xml", apps: ["com.android.vending"] },
        work: { keybox: "work.xml", apps: ["uid:10102"] },
      },
    });

    // target_txt.sh: `pm list packages -U` runs after selection, so dropping the module there
    // makes teesim_apply_targets hit apply-stage status 3.
    {
      const fx = makeFixture({ teesim: true, tricky: true, rawConfig: plainProfiles });
      const before = rawConfig(fx);
      const scratch = join(fx.root, "scratch");
      mkdirSync(scratch);
      stubPm(
        fx,
        `#!/bin/sh
if [ "$1" != "list" ] || [ "$2" != "packages" ]; then exit 1; fi
case "$3" in
  -U) rm -rf '${join(fx.modules, "teesim")}'; printf 'package:android uid:1000\\n' ;;
  -3) printf 'package:com.user.one\\n' ;;
  -s) printf '' ;;
  *) exit 1 ;;
esac
`,
      );

      const result = run("target_txt.sh", ["--teesim-profile", "default"], fx, {
        TEESIM_TMP_DIR: "",
        TMPDIR: scratch,
      });
      expect(result.code).toBe(0);
      expect(rawConfig(fx)).toBe(before);
      expect(result.stdout).toContain("Finish");
      expect(readdirSync(scratch)).toEqual([]);
    }

    // select_app_neccesary.sh asks pm only inside teesim_apply_targets, after selection.
    {
      const fx = makeFixture({ teesim: true, rawConfig: plainProfiles });
      const before = rawConfig(fx);
      stubPm(fx, `#!/bin/sh\nrm -rf '${join(fx.modules, "teesim")}'\nprintf 'package:android uid:1000\\n'\n`);

      const result = run("select_app_neccesary.sh", ["--teesim-profile", "default"], fx);
      expect(result.code).toBe(0);
      expect(rawConfig(fx)).toBe(before);
    }

    // security_patch.sh has no command between selection and apply; drop the module while the
    // explicit-profile lookup runs.
    {
      const fx = makeFixture({ teesim: true, rawConfig: plainProfiles });
      const before = rawConfig(fx);
      stub(
        fx,
        "grep",
        `#!/bin/sh
rm -rf '${join(fx.modules, "teesim")}'
PATH="\${PATH#*:}"; export PATH
exec grep "$@"
`,
      );

      const result = run("security_patch.sh", ["--teesim-profile", "default"], fx);
      expect(result.code).toBe(0);
      expect(rawConfig(fx)).toBe(before);
      expect(result.stdout).toContain("Finish");
    }
  });

  test("a concurrent config change fails every action and leaves no scratch", () => {
    for (const action of ACTIONS) {
      const fx = makeFixture({ teesim: true, tricky: true });
      const before = rawConfig(fx);
      stubDate(fx, "2026", "04", "20");
      stubPm(fx, PM_FULL);
      stub(fx, "cmp", "#!/bin/sh\nexit 1\n");
      const scratch = join(fx.root, "scratch");
      mkdirSync(scratch);

      const result = run(action, ["--teesim-profile", "default"], fx, {
        TEESIM_TMP_DIR: "",
        TMPDIR: scratch,
      });
      expect(result.code).not.toBe(0);
      expect(rawConfig(fx)).toBe(before);
      expect(result.stdout).toContain("changed while it was being updated");
      expect(readdirSync(scratch)).toEqual([]);
      expect(dataDirEntries(fx)).toEqual(["config.json"]);
    }
  });

  test("a repeat run that changes nothing still succeeds", () => {
    for (const action of ACTIONS) {
      const fx = makeFixture({ teesim: true });
      stubDate(fx, "2026", "09", "20");
      stubPm(fx, PM_FULL);

      expect(run(action, ["--teesim-profile", "default"], fx).code).toBe(0);
      const settled = rawConfig(fx);
      const second = run(action, ["--teesim-profile", "default"], fx);
      expect(second.code).toBe(0);
      expect(rawConfig(fx)).toBe(settled);
    }
  });

  test("a deliberate no-selection skip is not an error", () => {
    for (const action of ACTIONS) {
      const fx = makeFixture({ teesim: true, tricky: true });
      const before = rawConfig(fx);
      stubDate(fx, "2026", "09", "20");
      stubPm(fx, PM_FULL);

      const result = run(action, ["--teesim-profile", "default"], fx, { TEESIM_NO_SELECTION: "1" });
      expect(result.code).toBe(0);
      expect(rawConfig(fx)).toBe(before);
      expect(result.stdout).toContain("no profile was selected");
    }
  });

  test("an absent TEESimulator keeps the Tricky Store work and succeeds", () => {
    for (const action of ACTIONS) {
      const fx = makeFixture({ tricky: true });
      const before = rawConfig(fx);
      stubDate(fx, "2026", "09", "20");
      stubPm(fx, PM_FULL);

      const result = run(action, [], fx);
      expect(result.code).toBe(0);
      expect(rawConfig(fx)).toBe(before);
    }
  });
});

describe("config safety", () => {
  test("an unsupported schema version is rejected and left alone", () => {
    const fx = makeFixture({ teesim: true, rawConfig: '{"version":2,"profiles":{"a":{"keybox":"k.xml"}}}\n' });
    const before = rawConfig(fx);
    const result = run("security_patch.sh", ["--teesim-profile", "a"], fx);
    expect(result.code).not.toBe(0);
    expect(rawConfig(fx)).toBe(before);
    expect(result.stdout).toContain("unsupported config version 2");
  });

  test("malformed JSON and duplicate keys are rejected", () => {
    const broken = makeFixture({ teesim: true, rawConfig: '{"version":1,"profiles":{"a":{}}} trailing\n' });
    const brokenBefore = rawConfig(broken);
    run("security_patch.sh", ["--teesim-profile", "a"], broken);
    expect(rawConfig(broken)).toBe(brokenBefore);

    const duplicate = makeFixture({
      teesim: true,
      rawConfig: '{"version":1,"version":1,"profiles":{"a":{"keybox":"k.xml"}}}\n',
    });
    const duplicateBefore = rawConfig(duplicate);
    run("security_patch.sh", ["--teesim-profile", "a"], duplicate);
    expect(rawConfig(duplicate)).toBe(duplicateBefore);
  });

  test("a failing write leaves the original bytes and no temporary files", () => {
    const fx = makeFixture({ teesim: true });
    const before = rawConfig(fx);
    stubDate(fx, "2026", "03", "20");
    chmodSync(fx.data, 0o500);
    try {
      const result = run("security_patch.sh", ["--teesim-profile", "default"], fx);
      expect(result.code).not.toBe(0);
      expect(rawConfig(fx)).toBe(before);
    } finally {
      chmodSync(fx.data, 0o700);
    }
    expect(dataDirEntries(fx)).toEqual(["config.json"]);
  });

  test("a config that changes mid-update aborts the rename", () => {
    const fx = makeFixture({ teesim: true });
    const before = rawConfig(fx);
    stubDate(fx, "2026", "03", "20");
    stub(fx, "cmp", "#!/bin/sh\nexit 1\n");

    const result = run("security_patch.sh", ["--teesim-profile", "default"], fx);
    expect(result.code).not.toBe(0);
    expect(rawConfig(fx)).toBe(before);
    expect(result.stdout).toContain("changed while it was being updated");
    expect(dataDirEntries(fx)).toEqual(["config.json"]);
  });

  test("the scratch directory does not outlive the run", () => {
    const fx = makeFixture({ teesim: true });
    const scratch = join(fx.root, "scratch");
    mkdirSync(scratch);
    stubDate(fx, "2026", "03", "20");

    run("security_patch.sh", ["--teesim-profile", "default"], fx, { TEESIM_TMP_DIR: "", TMPDIR: scratch });
    expect(readdirSync(scratch)).toEqual([]);
    expect(readConfig(fx).profiles.default.patchLevel?.system).toBe("system_property");
  });

  test("permissions and layout are preserved by a successful edit", () => {
    const fx = makeFixture({ teesim: true });
    chmodSync(join(fx.data, "config.json"), 0o640);
    stubDate(fx, "2026", "03", "20");
    run("security_patch.sh", ["--teesim-profile", "default"], fx);
    expect(statSync(join(fx.data, "config.json")).mode & 0o777).toBe(0o640);
    expect(rawConfig(fx)).toContain('"brand": "Google"');
  });
});

describe("config JSON identity", () => {
  const DELIM = "\u001f";
  const PATCHED = { system: "today", vendor: "YYYY-MM-05", boot: "YYYY-MM-05" };

  test("delimiter-shaped unrelated keys never capture the edited fields", () => {
    const alias = `profiles${DELIM}default${DELIM}patchLevel${DELIM}vendor`;
    const nested = `patchLevel${DELIM}vendor`;
    const fx = makeFixture({
      teesim: true,
      rawConfig: configText({
        version: 1,
        [alias]: "keep-root",
        profiles: {
          default: {
            keybox: "keybox.xml",
            patchLevel: PATCHED,
            [nested]: "keep-nested",
            apps: ["com.android.vending"],
          },
          work: { keybox: "work.xml", apps: ["com.foo@10"] },
        },
      }),
    });
    stubDate(fx, "2026", "04", "20");

    const result = run("security_patch.sh", ["--teesim-profile", "default"], fx);
    expect(result.code).toBe(0);
    const config = readConfig(fx) as unknown as Record<string, any>;
    expect(config[alias]).toBe("keep-root");
    expect(config.profiles.default[nested]).toBe("keep-nested");
    expect(config.profiles.default.patchLevel).toEqual({
      system: "system_property",
      vendor: "2026-04-05",
      boot: "2026-04-05",
    });
    expect(config.profiles.work.apps).toEqual(["com.foo@10"]);
  });

  test("an escaped NUL in an unrelated key round-trips as valid JSON", () => {
    const nulKey = "note\u0000key";
    const fx = makeFixture({
      teesim: true,
      rawConfig: configText({
        version: 1,
        [nulKey]: { note: "keep\u0000value" },
        profiles: {
          default: { keybox: "keybox.xml", patchLevel: PATCHED, apps: ["com.android.vending"] },
        },
      }),
    });
    stubDate(fx, "2026", "04", "20");

    const result = run("security_patch.sh", ["--teesim-profile", "default"], fx);
    expect(result.code).toBe(0);
    const config = JSON.parse(rawConfig(fx)) as Record<string, any>;
    expect(config[nulKey]).toEqual({ note: "keep\u0000value" });
    expect(config.profiles.default.patchLevel.vendor).toBe("2026-04-05");
  });

  test("trailing commas are rejected before any write", () => {
    const cases = [
      '{"version":1,"profiles":{"default":{"keybox":"k.xml",}}}\n',
      '{"version":1,"profiles":{"default":{"keybox":"k.xml","apps":["com.a",]}}}\n',
    ];
    for (const raw of cases) {
      const fx = makeFixture({ teesim: true, rawConfig: raw });
      const result = run("security_patch.sh", ["--teesim-profile", "default"], fx);
      expect(result.code).not.toBe(0);
      expect(rawConfig(fx)).toBe(raw);
    }
  });

  test("empty arrays and objects stay valid", () => {
    const fx = makeFixture({
      teesim: true,
      rawConfig: configText({
        version: 1,
        extra: {},
        profiles: {
          default: { keybox: "keybox.xml", patchLevel: PATCHED, apps: [], note: {} },
        },
      }),
    });
    stubDate(fx, "2026", "04", "20");

    const result = run("security_patch.sh", ["--teesim-profile", "default"], fx);
    expect(result.code).toBe(0);
    const config = readConfig(fx) as unknown as Record<string, any>;
    expect(config.extra).toEqual({});
    expect(config.profiles.default.note).toEqual({});
    expect(config.profiles.default.apps).toEqual([]);
    expect(config.profiles.default.patchLevel.vendor).toBe("2026-04-05");
  });

  test("alternate escape spellings of one NUL-bearing key are duplicates", () => {
    const raw =
      '{"version":1,"profiles":{"default":{"keybox":"k.xml"}},"note\\u0000key":1,"\\u006eote\\u0000key":2}\n';
    const fx = makeFixture({ teesim: true, rawConfig: raw });

    const result = run("security_patch.sh", ["--teesim-profile", "default"], fx);
    expect(result.code).not.toBe(0);
    expect(rawConfig(fx)).toBe(raw);
    expect(result.stdout).toContain("duplicate object key");
  });

  test("NUL-suffixed keys cannot alias version, profiles or default", () => {
    const raw = `{
  "version": 1,
  "version\\u0000": 2,
  "profiles": {
    "default": { "keybox": "keybox.xml", "patchLevel": ${JSON.stringify(PATCHED)}, "apps": ["com.android.vending"] },
    "default\\u0000": { "keybox": "alias.xml", "patchLevel": ${JSON.stringify(PATCHED)}, "apps": ["com.alias"] }
  },
  "profiles\\u0000": { "default": { "keybox": "decoy.xml" } }
}
`;
    const fx = makeFixture({ teesim: true, rawConfig: raw });

    // The profile-name menu rejects control-bearing names, so exercise the alias directly.
    const result = run("teesim_common.sh", ["apply-patch", "default", "2026-04-05"], fx);
    expect(result.code).toBe(0);
    const config = JSON.parse(rawConfig(fx)) as Record<string, any>;
    expect(config.version).toBe(1);
    expect(config["version\u0000"]).toBe(2);
    expect(config.profiles.default.patchLevel.vendor).toBe("2026-04-05");
    expect(config.profiles["default\u0000"].keybox).toBe("alias.xml");
    expect(config.profiles["default\u0000"].patchLevel).toEqual(PATCHED);
    expect(config["profiles\u0000"]).toEqual({ default: { keybox: "decoy.xml" } });
  });

  test("a document with only NUL aliases of required fields is rejected", () => {
    const raw = '{"version\\u0000":1,"profiles\\u0000":{"default":{"keybox":"k.xml"}}}\n';
    const fx = makeFixture({ teesim: true, rawConfig: raw });

    const result = run("teesim_common.sh", ["apply-patch", "default", "2026-04-05"], fx);
    expect(result.code).not.toBe(0);
    expect(rawConfig(fx)).toBe(raw);
    expect(result.stdout).toContain("Error:");
  });
});

describe("literal profile names", () => {
  const PATCHED = { system: "today", vendor: "YYYY-MM-05", boot: "YYYY-MM-05" };

  test("backslashes, quotes and spaces survive the shell boundary", () => {
    for (const name of ["work\\lab", "a\\tb", "it's here"]) {
      const fx = makeFixture({
        teesim: true,
        rawConfig: configText({
          version: 1,
          profiles: {
            [name]: { keybox: "keybox.xml", patchLevel: PATCHED, apps: ["com.android.vending"] },
            other: { keybox: "other.xml", patchLevel: PATCHED, apps: ["keep.me"] },
          },
        }),
      });
      stubDate(fx, "2026", "04", "20");

      const result = run("security_patch.sh", ["--teesim-profile", name], fx);
      expect(result.code).toBe(0);
      const config = readConfig(fx);
      expect(config.profiles[name].patchLevel?.vendor).toBe("2026-04-05");
      expect(config.profiles.other.patchLevel?.vendor).toBe("YYYY-MM-05");
    }
  });

  test("the app-claim filter compares the literal selected name", () => {
    const name = "work\\lab";
    const fx = makeFixture({
      teesim: true,
      tricky: true,
      rawConfig: configText({
        version: 1,
        profiles: {
          [name]: { keybox: "keybox.xml", apps: ["com.android.vending"] },
          other: { keybox: "other.xml", apps: ["com.keep.app"] },
        },
      }),
    });
    stubPm(
      fx,
      `#!/bin/sh
if [ "$1" != "list" ] || [ "$2" != "packages" ]; then exit 1; fi
case "$#" in
  3)
    case "$3" in
      -3) printf 'package:com.user.one\\n' ;;
      -s) printf '' ;;
      -U) printf 'package:com.user.one uid:10101\\n' ;;
      *) exit 1 ;;
    esac
    ;;
  *) exit 1 ;;
esac
`,
    );

    const result = run("target_txt.sh", ["--teesim-profile", name], fx);
    expect(result.code).toBe(0);
    const config = readConfig(fx);
    expect(config.profiles[name].apps).toContain("com.user.one");
    expect(config.profiles.other.apps).toEqual(["com.keep.app"]);
  });

  test("a profile name containing a control character stays rejected", () => {
    const fx = makeFixture({
      teesim: true,
      rawConfig: configText({
        version: 1,
        profiles: {
          "tab\tname": { keybox: "k.xml", apps: ["com.a"] },
          default: { keybox: "k2.xml", apps: ["com.b"] },
        },
      }),
    });
    const before = rawConfig(fx);

    const result = run("security_patch.sh", ["--teesim-profile", "default"], fx);
    expect(result.code).not.toBe(0);
    expect(rawConfig(fx)).toBe(before);
  });

  test("escaped controls in another profile's ownership data are rejected", () => {
    const cases = [
      configText({
        version: 1,
        profiles: {
          default: { keybox: "keybox.xml", apps: ["com.android.vending"] },
          "work\tprofile": { keybox: "work.xml", apps: ["uid:10101"] },
        },
      }),
      configText({
        version: 1,
        profiles: {
          default: { keybox: "keybox.xml", apps: ["com.android.vending"] },
          work: { keybox: "work.xml", apps: ["uid:10101", "com.keep\u0009app"] },
        },
      }),
    ];
    for (const raw of cases) {
      const fx = makeFixture({ teesim: true, tricky: true, rawConfig: raw });
      stubPm(fx, PM_FULL);

      const result = run("target_txt.sh", ["--teesim-profile", "default"], fx);
      expect(result.code).not.toBe(0);
      expect(rawConfig(fx)).toBe(raw);
      expect(result.stdout).toContain("Error:");
    }
  });
});

describe("keybox installation", () => {
  test("a TEESimulator-only install writes its keybox and repoints the default profile", () => {
    const fx = makeFixture({
      teesim: true,
      rawConfig: configText({
        version: 1,
        profiles: { default: { keybox: "old.xml", apps: ["com.android.vending"] } },
      }),
    });
    writeFileSync(join(fx.data, "keybox.xml"), "<AndroidAttestation>old</AndroidAttestation>");
    stubCurl(fx, KEYBOX_XML);

    const result = run("yuri_keybox.sh", [], fx);
    expect(result.code).toBe(0);
    expect(readFileSync(join(fx.data, "keybox.xml"), "utf-8")).toBe(KEYBOX_XML);
    expect(readFileSync(join(fx.data, "keybox.xml.bak"), "utf-8")).toContain("old");
    expect(readConfig(fx).profiles.default.keybox).toBe("keybox.xml");
  });

  test("both backends are installed independently", () => {
    const fx = makeFixture({ teesim: true, tricky: true });
    stubCurl(fx, KEYBOX_XML);

    const result = run("yuri_keybox.sh", [], fx);
    expect(result.code).toBe(0);
    expect(readFileSync(join(fx.data, "keybox.xml"), "utf-8")).toBe(KEYBOX_XML);
    expect(readFileSync(join(fx.tricky, "keybox.xml"), "utf-8")).toBe(KEYBOX_XML);
  });

  test("a failing destination does not stop the other one", () => {
    const fx = makeFixture({ teesim: true, tricky: true });
    writeFileSync(join(fx.tricky, "keybox.xml"), "<AndroidAttestation>tricky</AndroidAttestation>");
    // A read-only directory squatting on the backup path makes the Tricky Store backup fail.
    const blocked = join(fx.tricky, "keybox.xml.bak");
    mkdirSync(blocked);
    writeFileSync(join(blocked, "keep"), "");
    chmodSync(blocked, 0o500);
    stubCurl(fx, KEYBOX_XML);
    try {
      const result = run("yuri_keybox.sh", [], fx);
      expect(result.code).toBe(0);
      expect(readFileSync(join(fx.tricky, "keybox.xml"), "utf-8")).toContain("tricky");
      expect(readFileSync(join(fx.data, "keybox.xml"), "utf-8")).toBe(KEYBOX_XML);
      expect(result.stdout).toContain("skipping that destination");
    } finally {
      chmodSync(blocked, 0o700);
    }
  });

  test("an invalid download leaves every keybox in place", () => {
    const fx = makeFixture({ teesim: true, tricky: true });
    writeFileSync(join(fx.data, "keybox.xml"), "<AndroidAttestation>keep-me</AndroidAttestation>");
    writeFileSync(join(fx.tricky, "keybox.xml"), "<AndroidAttestation>keep-me-too</AndroidAttestation>");
    stubCurl(fx, "not a keybox");

    const result = run("yuri_keybox.sh", [], fx);
    expect(result.code).toBe(0);
    expect(readFileSync(join(fx.data, "keybox.xml"), "utf-8")).toContain("keep-me");
    expect(readFileSync(join(fx.tricky, "keybox.xml"), "utf-8")).toContain("keep-me-too");
    expect(result.stdout).toContain("Invalid keybox format");
  });

  test("several profiles keep their own keybox references", () => {
    const fx = makeFixture({ teesim: true });
    const before = rawConfig(fx);
    stubCurl(fx, KEYBOX_XML);

    run("yuri_keybox.sh", [], fx);
    expect(rawConfig(fx)).toBe(before);
    expect(readFileSync(join(fx.data, "keybox.xml"), "utf-8")).toBe(KEYBOX_XML);
  });
});

describe("volume key selection", () => {
  const stubGetevent = (fx: Fixture, body: string) => stub(fx, "getevent", body);

  test("volume-up cycles and volume-down confirms", () => {
    const fx = makeFixture({ teesim: true });
    stubGetevent(
      fx,
      `#!/bin/sh
cat <<'X'
add device 1: /dev/input/event0
/dev/input/event0: EV_KEY       KEY_VOLUMEUP        DOWN
/dev/input/event0: EV_KEY       KEY_VOLUMEUP        UP
/dev/input/event0: EV_KEY       KEY_VOLUMEUP        REPEAT
/dev/input/event0: EV_KEY       KEY_VOLUMEDOWN      DOWN
X
exit 0
`,
    );

    const result = run("teesim_common.sh", ["select"], fx);
    expect(result.code).toBe(0);
    expect(result.stdout.trim().split("\n").pop()).toBe("work");
    expect(result.stdout).toContain("Selected profile: work");
  });

  test("repeats alone never confirm a profile", () => {
    const fx = makeFixture({ teesim: true });
    stubGetevent(
      fx,
      `#!/bin/sh
printf '/dev/input/event0: EV_KEY       KEY_VOLUMEUP        REPEAT\\n'
printf '/dev/input/event0: EV_KEY       KEY_VOLUMEDOWN      REPEAT\\n'
exit 0
`,
    );

    const result = run("teesim_common.sh", ["select"], fx);
    expect(result.code).toBe(5);
    expect(result.stdout).not.toContain("Confirmed profile");
  });

  test("a stalled stream times out", () => {
    const fx = makeFixture({ teesim: true });
    stubGetevent(fx, "#!/bin/sh\nwhile :; do sleep 0.05; done\n");

    const result = run("teesim_common.sh", ["select"], fx, { TEESIM_KEY_TIMEOUT: "1" });
    expect(result.code).toBe(5);
    expect(result.stdout).toContain("skipped");
  });

  test("a missing getevent skips rather than guessing", () => {
    const fx = makeFixture({ teesim: true });
    const result = run("teesim_common.sh", ["select"], fx, { PATH: "/usr/bin:/bin" });
    expect(result.code).toBe(5);
    expect(result.stdout).toContain("getevent is unavailable");
  });

  test("one selection in action.sh serves both target and patch", () => {
    const fx = makeFixture({ teesim: true });
    stubPm(fx, PM_FULL);
    stubDate(fx, "2026", "06", "20");
    stubCurl(fx, KEYBOX_XML);
    stubGetevent(
      fx,
      `#!/bin/sh
cat <<'X'
/dev/input/event0: EV_KEY       KEY_VOLUMEUP        DOWN
/dev/input/event0: EV_KEY       KEY_VOLUMEDOWN      DOWN
X
exit 0
`,
    );

    const moduleDir = mkdtempSync(join(tmpdir(), "yurikey-action-"));
    Bun.spawnSync({ cmd: ["cp", "-R", join(ROOT, "Module/Yuri"), join(moduleDir, "Yuri")] });
    mkdirSync(join(moduleDir, "webroot/common"), { recursive: true });
    Bun.spawnSync({ cmd: ["cp", join(ROOT, "Module/action.sh"), join(moduleDir, "action.sh")] });
    for (const name of ["kill_google_process.sh", "boot_hash.sh", "pif.sh"]) {
      writeFileSync(
        join(moduleDir, "Yuri", name),
        `#!/system/bin/sh\necho "[stub] ${name} profile=\${TEESIM_PROFILE:-none} noSelect=\${TEESIM_NO_SELECTION:-0}"\n`,
      );
    }

    const result = run("action.sh", [], fx, { TEESIM_KEY_TIMEOUT: "2" }, moduleDir);
    expect(result.code).toBe(0);
    expect(existsSync(join(fx.root, "curl-called"))).toBe(true);
    // The picker starts on "default" and one volume-up moves it to "work", for both children.
    expect(readConfig(fx).profiles.work.patchLevel.vendor).toBe("2026-06-05");
    expect(readConfig(fx).profiles.work.apps).not.toContain("com.android.vending");
    expect(result.stdout).toContain("[stub] kill_google_process.sh profile=work");
    expect(result.stdout).toContain("[stub] pif.sh profile=work");
    expect(result.stdout.match(/TEESimulator has 2 profiles/g)?.length).toBe(1);
  });

  test("action.sh asks nothing when TEESimulator is absent", () => {
    const fx = makeFixture();
    const moduleDir = mkdtempSync(join(tmpdir(), "yurikey-action-"));
    Bun.spawnSync({ cmd: ["cp", "-R", join(ROOT, "Module/Yuri"), join(moduleDir, "Yuri")] });
    Bun.spawnSync({ cmd: ["cp", join(ROOT, "Module/action.sh"), join(moduleDir, "action.sh")] });
    for (const name of ["kill_google_process.sh", "target_txt.sh", "security_patch.sh", "boot_hash.sh", "yuri_keybox.sh", "pif.sh"]) {
      writeFileSync(join(moduleDir, "Yuri", name), `#!/system/bin/sh\necho "[stub] ${name}"\n`);
    }

    const result = run("action.sh", [], fx, {}, moduleDir);
    expect(result.code).toBe(0);
    expect(result.stdout).not.toContain("TEESimulator");
  });
});

type FakeEvent = { key?: string; preventDefault(): void };
type FakeListener = (event: FakeEvent) => void;

class FakeElement {
  readonly tagName: string;
  id = "";
  className = "";
  type = "";
  open = false;
  children: FakeElement[] = [];
  attrs: Record<string, string> = {};
  dataset: Record<string, string> = {};
  private text = "";
  private listeners: Record<string, FakeListener[]> = {};
  private tokens = new Set<string>();

  constructor(tagName: string) {
    this.tagName = tagName;
  }

  get textContent(): string {
    return this.text;
  }

  set textContent(value: string) {
    this.text = value;
    this.children = [];
  }

  get classList() {
    const tokens = this.tokens;
    return {
      add: (token: string) => tokens.add(token),
      remove: (token: string) => tokens.delete(token),
      contains: (token: string) => tokens.has(token),
    };
  }

  setAttribute(name: string, value: string) {
    this.attrs[name] = value;
  }

  getAttribute(name: string) {
    return this.attrs[name] ?? null;
  }

  append(...nodes: FakeElement[]) {
    this.children.push(...nodes);
  }

  addEventListener(type: string, listener: FakeListener) {
    (this.listeners[type] ||= []).push(listener);
  }

  removeEventListener(type: string, listener: FakeListener) {
    this.listeners[type] = (this.listeners[type] ?? []).filter(entry => entry !== listener);
  }

  dispatch(type: string, event: FakeEvent) {
    (this.listeners[type] ?? []).forEach(listener => listener(event));
  }

  listenerCount(type: string) {
    return (this.listeners[type] ?? []).length;
  }

  focus() {
    fakeDocument.activeElement = this;
  }

  show() {
    this.open = true;
  }

  close() {
    this.open = false;
  }
}

class FakeDocument {
  readonly nodes = new Map<string, FakeElement>();
  activeElement: FakeElement | null = null;
  private listeners: Record<string, FakeListener[]> = {};

  createElement(tag: string) {
    return new FakeElement(tag);
  }

  getElementById(id: string) {
    return this.nodes.get(id) ?? null;
  }

  contains() {
    return true;
  }

  addEventListener(type: string, listener: FakeListener) {
    (this.listeners[type] ||= []).push(listener);
  }

  removeEventListener(type: string, listener: FakeListener) {
    this.listeners[type] = (this.listeners[type] ?? []).filter(entry => entry !== listener);
  }

  dispatch(type: string, event: FakeEvent) {
    (this.listeners[type] ?? []).forEach(listener => listener(event));
  }

  listenerCount(type: string) {
    return (this.listeners[type] ?? []).length;
  }
}

const DIALOG_IDS = [
  "teesim-dialog",
  "teesim-dialog-overlay",
  "teesim-profile-list",
  "teesim-dialog-hint",
  "teesim-dialog-confirm",
  "teesim-dialog-cancel",
  "teesim-dialog-close",
];

const fakeDocument = new FakeDocument();

function installDialog() {
  fakeDocument.nodes.clear();
  for (const id of DIALOG_IDS) {
    const element = new FakeElement(id === "teesim-profile-list" ? "div" : "button");
    element.id = id;
    fakeDocument.nodes.set(id, element);
  }
  (globalThis as { document?: unknown }).document = fakeDocument;
}

function uninstallDialog() {
  delete (globalThis as { document?: unknown }).document;
}

type ExecResult = { code: number; stdout: string; stderr: string };

type TeesimModule = {
  runTeesimAction(scriptName: string, basePath: string, button: FakeElement | null): Promise<void>;
  shellQuote(value: string): string;
  isTeesimAction(name: string): boolean;
  ACTIONS: string[];
};

function loadTeesimModule(): TeesimModule {
  return require("../Module/webroot/js/utils/teesimProfile.js") as TeesimModule;
}

const BASE = "/data/adb/modules/Yurikey/Yuri/";

function setupHarness(responses: ExecResult[]) {
  const execCalls: string[] = [];
  const queue = [...responses];
  const results: { code: number; stdout: string; stderr: string }[] = [];
  const toasts: { message: string; type: string }[] = [];
  const history: { script: string; message: string }[] = [];
  const plainRuns: string[] = [];
  const globals = globalThis as Record<string, unknown>;

  globals.Bridge = {
    isAvailable: () => true,
    exec: (command: string) => {
      execCalls.push(command);
      const next = queue.shift();
      if (!next) return Promise.reject(new Error(`unexpected exec: ${command}`));
      return Promise.resolve(next);
    },
  };
  globals.resolveScriptPath = (name: string, base: string) => `${base}${name}`;
  globals.handleScriptResult = (result: ExecResult, script: string) => {
    results.push(result);
    history.push({ script, message: result.stdout });
  };
  globals.showToast = (message: string, type: string) => {
    toasts.push({ message, type });
  };
  globals.addScriptHistory = (script: string, message: string) => {
    history.push({ script, message });
  };
  globals.runScript = (name: string) => {
    plainRuns.push(name);
  };
  globals.t = (key: string, fallback: string) => fallback || key;
  globals.tFormat = (key: string, vars: Record<string, string>, fallback: string) => {
    let out = fallback || key;
    Object.keys(vars).forEach(k => {
      out = out.split(`{${k}}`).join(vars[k]);
    });
    return out;
  };

  return { execCalls, results, toasts, history, plainRuns, globals };
}

function flush() {
  return new Promise(resolve => setTimeout(resolve, 0));
}

type Deferred<T> = {
  promise: Promise<T>;
  resolve(value: T): void;
  reject(error: unknown): void;
};

function defer<T>(): Deferred<T> {
  const { promise, resolve, reject } = Promise.withResolvers<T>();
  return { promise, resolve, reject };
}

// Unlike setupHarness, every bridge call stays pending until the test settles it, so overlap
// scenarios can hold the first profile read open and inspect what a second click does meanwhile.
function setupDeferredHarness() {
  const execCalls: string[] = [];
  const pending: Deferred<ExecResult>[] = [];
  const results: { code: number; stdout: string; stderr: string }[] = [];
  const toasts: { message: string; type: string }[] = [];
  const history: { script: string; message: string }[] = [];
  const plainRuns: string[] = [];
  const globals = globalThis as Record<string, unknown>;

  globals.Bridge = {
    isAvailable: () => true,
    exec: async (command: string) => {
      execCalls.push(command);
      const next = defer<ExecResult>();
      pending.push(next);
      return next.promise;
    },
  };
  globals.resolveScriptPath = (name: string, base: string) => `${base}${name}`;
  globals.handleScriptResult = (result: ExecResult, script: string) => {
    results.push(result);
    history.push({ script, message: result.stdout });
  };
  globals.showToast = (message: string, type: string) => {
    toasts.push({ message, type });
  };
  globals.addScriptHistory = (script: string, message: string) => {
    history.push({ script, message });
  };
  globals.runScript = (name: string) => {
    plainRuns.push(name);
  };
  globals.t = (key: string, fallback: string) => fallback || key;
  globals.tFormat = (key: string, vars: Record<string, string>, fallback: string) => {
    let out = fallback || key;
    Object.keys(vars).forEach(k => {
      out = out.split(`{${k}}`).join(vars[k]);
    });
    return out;
  };

  const release = (index: number, result: ExecResult) => {
    const call = pending[index];
    if (!call) throw new Error(`bridge call ${index} was never made`);
    call.resolve(result);
  };
  const fail = (index: number, error: unknown) => {
    const call = pending[index];
    if (!call) throw new Error(`bridge call ${index} was never made`);
    call.reject(error);
  };

  return { execCalls, pending, results, toasts, history, plainRuns, globals, release, fail };
}

const PROFILES = { code: 0, stdout: '["default","banking"]\n', stderr: "" };

// Advances only through microtasks; the deferred bridge gives every wait a real condition.
async function until(condition: () => boolean, what: string) {
  for (let attempt = 0; attempt < 100 && !condition(); attempt += 1) {
    await Promise.resolve();
  }
  if (!condition()) throw new Error(`timed out waiting for ${what}`);
}

describe("WebUI profile picker", () => {
  test("a single profile runs without a dialog", async () => {
    const teesim = loadTeesimModule();
    uninstallDialog();
    const harness = setupHarness([
      { code: 0, stdout: '["default"]\n', stderr: "" },
      { code: 0, stdout: '["default"]\n', stderr: "" },
      { code: 0, stdout: "patch done\n", stderr: "" },
    ]);
    try {
      await teesim.runTeesimAction("security_patch.sh", BASE, null);
      expect(harness.execCalls[0]).toBe(`sh '/data/adb/modules/Yurikey/Yuri/teesim_common.sh' list-profiles`);
      expect(harness.execCalls[2]).toBe(`sh '${BASE}security_patch.sh' --teesim-profile 'default'`);
      expect(harness.results.length).toBe(1);
      expect(harness.results[0].stdout).toBe("patch done\n");
    } finally {
      uninstallDialog();
    }
  });

  test("several profiles ask once and pass the chosen one", async () => {
    const teesim = loadTeesimModule();
    installDialog();
    const harness = setupHarness([
      { code: 0, stdout: '["default","banking"]\n', stderr: "" },
      { code: 0, stdout: '["default","banking"]\n', stderr: "" },
      { code: 0, stdout: "targets done\n", stderr: "" },
    ]);
    try {
      const action = teesim.runTeesimAction("target_txt.sh", BASE, null);
      await flush();
      const list = fakeDocument.getElementById("teesim-profile-list") as FakeElement;
      expect(list.children.length).toBe(2);
      // Names are written as text nodes, never parsed as markup.
      expect(list.children[0].children[0].textContent).toBe("default");
      expect(list.children[1].children[0].textContent).toBe("banking");
      const option = list.children[1];
      expect(option.dataset.profile).toBe("banking");
      expect(option.getAttribute("aria-checked")).toBe("false");

      option.dispatch("click", { preventDefault() {} });
      expect(option.getAttribute("aria-checked")).toBe("true");
      const confirm = fakeDocument.getElementById("teesim-dialog-confirm") as FakeElement;
      expect(confirm.textContent).toBe("Update banking");
      confirm.dispatch("click", { preventDefault() {} });

      await action;
      expect(harness.execCalls[2]).toBe(`sh '${BASE}target_txt.sh' --teesim-profile 'banking'`);
      expect(harness.results.length).toBe(1);
      expect(fakeDocument.getElementById("teesim-dialog")?.open).toBe(false);
    } finally {
      uninstallDialog();
    }
  });

  test("the dialog supports arrow keys and Escape", async () => {
    const teesim = loadTeesimModule();
    installDialog();
    const harness = setupHarness([
      { code: 0, stdout: '["default","banking"]\n', stderr: "" },
    ]);
    try {
      const action = teesim.runTeesimAction("target_txt.sh", BASE, null);
      await flush();
      const list = fakeDocument.getElementById("teesim-profile-list") as FakeElement;
      fakeDocument.dispatch("keydown", { key: "ArrowDown", preventDefault() {} });
      expect(list.children[1].getAttribute("aria-checked")).toBe("true");
      fakeDocument.dispatch("keydown", { key: "ArrowUp", preventDefault() {} });
      expect(list.children[0].getAttribute("aria-checked")).toBe("true");
      fakeDocument.dispatch("keydown", { key: "Escape", preventDefault() {} });
      await action;
      expect(harness.execCalls.length).toBe(1);
      expect(harness.results.length).toBe(0);
      expect(harness.toasts.some(entry => entry.message.includes("nothing was run"))).toBe(true);
    } finally {
      uninstallDialog();
    }
  });

  test("cancelling runs no backend operation", async () => {
    const teesim = loadTeesimModule();
    installDialog();
    const harness = setupHarness([
      { code: 0, stdout: '["default","banking"]\n', stderr: "" },
    ]);
    try {
      const action = teesim.runTeesimAction("select_app_neccesary.sh", BASE, null);
      await flush();
      const cancel = fakeDocument.getElementById("teesim-dialog-cancel") as FakeElement;
      cancel.dispatch("click", { preventDefault() {} });
      await action;
      expect(harness.execCalls.length).toBe(1);
      expect(harness.results.length).toBe(0);
      expect(harness.plainRuns.length).toBe(0);
    } finally {
      uninstallDialog();
    }
  });

  test("profile names are quoted, never interpolated", async () => {
    const teesim = loadTeesimModule();
    uninstallDialog();
    const hostile = "we'ird; rm -rf / tmp/$(id)";
    const harness = setupHarness([
      { code: 0, stdout: JSON.stringify([hostile]) + "\n", stderr: "" },
      { code: 0, stdout: JSON.stringify([hostile]) + "\n", stderr: "" },
      { code: 0, stdout: "ok\n", stderr: "" },
    ]);
    try {
      await teesim.runTeesimAction("target_txt.sh", BASE, null);
      expect(harness.execCalls[2]).toBe(`sh '${BASE}target_txt.sh' --teesim-profile 'we'\\''ird; rm -rf / tmp/$(id)'`);
      expect(teesim.shellQuote("a b")).toBe("'a b'");
    } finally {
      uninstallDialog();
    }
  });

  test("a profile that disappears before the run stops the action", async () => {
    const teesim = loadTeesimModule();
    uninstallDialog();
    const harness = setupHarness([
      { code: 0, stdout: '["default"]\n', stderr: "" },
      { code: 0, stdout: '["default","banking"]\n', stderr: "" },
    ]);
    try {
      await teesim.runTeesimAction("security_patch.sh", BASE, null);
      expect(harness.execCalls.length).toBe(2);
      expect(harness.results.length).toBe(0);
      expect(harness.toasts.some(entry => entry.message.includes("configuration changed"))).toBe(true);
    } finally {
      uninstallDialog();
    }
  });

  test("a broken config is an error, not an absent module", async () => {
    const teesim = loadTeesimModule();
    uninstallDialog();
    const harness = setupHarness([
      { code: 6, stdout: "", stderr: "teesim-json: duplicate object key \"version\"\n" },
    ]);
    try {
      await teesim.runTeesimAction("security_patch.sh", BASE, null);
      expect(harness.plainRuns.length).toBe(0);
      expect(harness.results.length).toBe(0);
      expect(harness.toasts.some(entry => entry.type === "error" && entry.message.includes("duplicate object key"))).toBe(true);
    } finally {
      uninstallDialog();
    }
  });

  test("an absent module falls back to the plain executor", async () => {
    const teesim = loadTeesimModule();
    uninstallDialog();
    const harness = setupHarness([{ code: 3, stdout: "", stderr: "" }]);
    try {
      await teesim.runTeesimAction("security_patch.sh", BASE, null);
      expect(harness.plainRuns).toEqual(["security_patch.sh"]);
      expect(harness.execCalls.length).toBe(1);
    } finally {
      uninstallDialog();
    }
  });

  test("only the three config-writing actions use the picker", () => {
    const teesim = loadTeesimModule();
    expect(teesim.ACTIONS).toEqual(["target_txt.sh", "security_patch.sh", "select_app_neccesary.sh"]);
    expect(teesim.isTeesimAction("yuri_keybox.sh")).toBe(false);
  });

  test("a double click on one action runs it once with the visible profile", async () => {
    const teesim = loadTeesimModule();
    installDialog();
    const harness = setupDeferredHarness();
    try {
      const first = teesim.runTeesimAction("security_patch.sh", BASE, null);
      const second = teesim.runTeesimAction("security_patch.sh", BASE, null);
      await second;

      // The second click settles without touching the bridge while the first read is open.
      expect(harness.execCalls.length).toBe(1);

      harness.release(0, PROFILES);
      await until(
        () => (fakeDocument.getElementById("teesim-profile-list") as FakeElement).children.length === 2,
        "the profile list",
      );

      // A click while the first action owns the dialog is ignored as well.
      await teesim.runTeesimAction("security_patch.sh", BASE, null);
      expect(harness.execCalls.length).toBe(1);

      const list = fakeDocument.getElementById("teesim-profile-list") as FakeElement;
      list.children[1].dispatch("click", { preventDefault() {} });
      const confirm = fakeDocument.getElementById("teesim-dialog-confirm") as FakeElement;
      expect(confirm.textContent).toBe("Update banking");
      confirm.dispatch("click", { preventDefault() {} });

      await until(() => harness.execCalls.length === 2, "the profile recheck");
      harness.release(1, PROFILES);
      await until(() => harness.execCalls.length === 3, "the action command");
      harness.release(2, { code: 0, stdout: "patch done\n", stderr: "" });
      await first;

      const actionCalls = harness.execCalls.filter(command => command.includes("--teesim-profile"));
      expect(actionCalls).toEqual([`sh '${BASE}security_patch.sh' --teesim-profile 'banking'`]);
      expect(harness.results.length).toBe(1);
      expect(fakeDocument.listenerCount("keydown")).toBe(0);
    } finally {
      uninstallDialog();
    }
  });

  test("clicks on different actions run only the first one", async () => {
    const teesim = loadTeesimModule();
    installDialog();
    const harness = setupDeferredHarness();
    try {
      const first = teesim.runTeesimAction("target_txt.sh", BASE, null);
      const second = teesim.runTeesimAction("security_patch.sh", BASE, null);
      await second;
      expect(harness.execCalls.length).toBe(1);

      harness.release(0, PROFILES);
      await until(
        () => (fakeDocument.getElementById("teesim-profile-list") as FakeElement).children.length === 2,
        "the profile list",
      );

      const list = fakeDocument.getElementById("teesim-profile-list") as FakeElement;
      list.children[1].dispatch("click", { preventDefault() {} });
      const confirm = fakeDocument.getElementById("teesim-dialog-confirm") as FakeElement;
      confirm.dispatch("click", { preventDefault() {} });

      await until(() => harness.execCalls.length === 2, "the profile recheck");
      harness.release(1, PROFILES);
      await until(() => harness.execCalls.length === 3, "the action command");
      harness.release(2, { code: 0, stdout: "targets done\n", stderr: "" });
      await first;

      expect(harness.execCalls.filter(command => command.includes("--teesim-profile"))).toEqual([
        `sh '${BASE}target_txt.sh' --teesim-profile 'banking'`,
      ]);
      expect(harness.execCalls.some(command => command.includes("security_patch.sh"))).toBe(false);
      expect(harness.results.length).toBe(1);
    } finally {
      uninstallDialog();
    }
  });

  test("Escape cancels an overlapped action and the next action still runs", async () => {
    const teesim = loadTeesimModule();
    installDialog();
    const harness = setupDeferredHarness();
    try {
      const first = teesim.runTeesimAction("security_patch.sh", BASE, null);
      const second = teesim.runTeesimAction("security_patch.sh", BASE, null);
      await second;

      harness.release(0, PROFILES);
      await until(
        () => (fakeDocument.getElementById("teesim-profile-list") as FakeElement).children.length === 2,
        "the profile list",
      );

      fakeDocument.dispatch("keydown", { key: "Escape", preventDefault() {} });
      await first;

      expect(harness.execCalls.length).toBe(1);
      expect(harness.results.length).toBe(0);
      expect(harness.toasts.some(entry => entry.message.includes("nothing was run"))).toBe(true);
      expect(fakeDocument.listenerCount("keydown")).toBe(0);

      const fresh = teesim.runTeesimAction("target_txt.sh", BASE, null);
      await until(() => harness.execCalls.length === 2, "the fresh profile read");
      harness.release(1, { code: 0, stdout: '["default"]\n', stderr: "" });
      await until(() => harness.execCalls.length === 3, "the fresh profile recheck");
      harness.release(2, { code: 0, stdout: '["default"]\n', stderr: "" });
      await until(() => harness.execCalls.length === 4, "the action command");
      harness.release(3, { code: 0, stdout: "done\n", stderr: "" });
      await fresh;

      expect(harness.execCalls[3]).toBe(`sh '${BASE}target_txt.sh' --teesim-profile 'default'`);
      expect(harness.results.length).toBe(1);
    } finally {
      uninstallDialog();
    }
  });

  test("a rejected bridge read is reported and a later action still runs", async () => {
    const teesim = loadTeesimModule();
    uninstallDialog();
    const harness = setupDeferredHarness();
    try {
      const failed = teesim.runTeesimAction("security_patch.sh", BASE, null);
      harness.fail(0, new Error("bridge exploded"));
      await failed;

      expect(harness.execCalls.length).toBe(1);
      expect(harness.results.length).toBe(0);
      expect(
        harness.toasts.some(entry => entry.type === "error" && entry.message.includes("bridge exploded")),
      ).toBe(true);

      const fresh = teesim.runTeesimAction("target_txt.sh", BASE, null);
      await until(() => harness.execCalls.length === 2, "the fresh profile read");
      harness.release(1, { code: 0, stdout: '["default"]\n', stderr: "" });
      await until(() => harness.execCalls.length === 3, "the fresh profile recheck");
      harness.release(2, { code: 0, stdout: '["default"]\n', stderr: "" });
      await until(() => harness.execCalls.length === 4, "the action command");
      harness.release(3, { code: 0, stdout: "done\n", stderr: "" });
      await fresh;

      expect(harness.execCalls[3]).toBe(`sh '${BASE}target_txt.sh' --teesim-profile 'default'`);
      expect(harness.results.length).toBe(1);
    } finally {
      uninstallDialog();
    }
  });

  test("closing the dialog removes its listeners so later events run nothing", async () => {
    const teesim = loadTeesimModule();
    installDialog();
    const harness = setupDeferredHarness();
    try {
      const first = teesim.runTeesimAction("security_patch.sh", BASE, null);
      harness.release(0, PROFILES);
      await until(
        () => (fakeDocument.getElementById("teesim-profile-list") as FakeElement).children.length === 2,
        "the profile list",
      );

      const list = fakeDocument.getElementById("teesim-profile-list") as FakeElement;
      const staleOption = list.children[1];
      const confirm = fakeDocument.getElementById("teesim-dialog-confirm") as FakeElement;
      const cancel = fakeDocument.getElementById("teesim-dialog-cancel") as FakeElement;
      const overlay = fakeDocument.getElementById("teesim-dialog-overlay") as FakeElement;

      cancel.dispatch("click", { preventDefault() {} });
      await first;

      expect(harness.execCalls.length).toBe(1);
      expect(harness.results.length).toBe(0);
      expect(fakeDocument.listenerCount("keydown")).toBe(0);
      expect(confirm.listenerCount("click")).toBe(0);
      expect(cancel.listenerCount("click")).toBe(0);
      expect(overlay.listenerCount("click")).toBe(0);

      // Stale nodes cannot settle anything after the dialog closed.
      staleOption.dispatch("click", { preventDefault() {} });
      confirm.dispatch("click", { preventDefault() {} });
      fakeDocument.dispatch("keydown", { key: "Escape", preventDefault() {} });
      expect(harness.execCalls.length).toBe(1);
      expect(harness.results.length).toBe(0);

      const fresh = teesim.runTeesimAction("target_txt.sh", BASE, null);
      await until(() => harness.execCalls.length === 2, "the fresh profile read");
      harness.release(1, PROFILES);
      await until(() => fakeDocument.listenerCount("keydown") === 1, "the fresh dialog");
      expect(
        (fakeDocument.getElementById("teesim-profile-list") as FakeElement).children.length,
      ).toBe(2);

      const freshList = fakeDocument.getElementById("teesim-profile-list") as FakeElement;
      freshList.children[1].dispatch("click", { preventDefault() {} });
      confirm.dispatch("click", { preventDefault() {} });
      await until(() => harness.execCalls.length === 3, "the fresh profile recheck");
      harness.release(2, PROFILES);
      await until(() => harness.execCalls.length === 4, "the fresh action command");
      harness.release(3, { code: 0, stdout: "done\n", stderr: "" });
      await fresh;

      expect(harness.execCalls.filter(command => command.includes("--teesim-profile")).length).toBe(1);
      expect(harness.execCalls[3]).toBe(`sh '${BASE}target_txt.sh' --teesim-profile 'banking'`);
      expect(harness.results.length).toBe(1);
      expect(fakeDocument.listenerCount("keydown")).toBe(0);
    } finally {
      uninstallDialog();
    }
  });
});
