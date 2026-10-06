// @see https://bun.com/docs/runtime/secrets — Bun.secrets
/**
 * Desk logins live in the OS credential store.
 * A gitignored session.env file is only the bootstrap when a name is still empty.
 */

export const SECRET_SERVICE = "com.factorywager.sports-ops";

export const SECRET_NAMES = {
  f402User: "f402-user",
  f402Password: "f402-password",
  fourcEmail: "fourc-email",
  fourcPassword: "fourc-password",
} as const;

export type DeskLogins = {
  f402User: string;
  f402Password: string;
  fourcEmail: string;
  fourcPassword: string;
  store: "secrets" | "file";
};

const FILE_KEYS = {
  F402_USER: "f402User",
  F402_PASSWORD: "f402Password",
  FOURC_EMAIL: "fourcEmail",
  FOURC_PASSWORD: "fourcPassword",
} as const;

export function parseSessionEnv(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 1) continue;
    out[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return out;
}

function blankLogins(): DeskLogins {
  return { f402User: "", f402Password: "", fourcEmail: "", fourcPassword: "", store: "file" };
}

function applyFile(logins: DeskLogins, raw: Record<string, string>) {
  for (const [fileKey, field] of Object.entries(FILE_KEYS)) {
    const value = raw[fileKey];
    if (value && !logins[field]) logins[field] = value;
  }
}

async function withTimeout<T>(work: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("secrets timed out")), ms);
  });
  try {
    return await Promise.race([work, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** Point libsecret at an unlocked login keyring so Bun.secrets.set does not wait on a GUI prompt. */
export async function ensureSecretStore(): Promise<boolean> {
  if (typeof Bun.secrets?.get !== "function") return false;
  if (process.platform !== "linux") return true;
  const script = `
import os, subprocess, time
try:
    import dbus
except Exception:
    raise SystemExit(0)
addr = os.environ.get("DBUS_SESSION_BUS_ADDRESS", "")
def usable(value):
    if not value or value in {"autolaunch:", "disabled:"}:
        return False
    path = value.split("=", 1)[-1].split(",")[0]
    return path.startswith("/") and os.path.exists(path)
if not usable(addr):
    out = subprocess.check_output(["dbus-launch", "--sh-syntax"], text=True)
    for line in out.splitlines():
        if line.startswith("DBUS_SESSION_BUS_ADDRESS="):
            addr = line.split("=", 1)[1].strip().strip("';")
            os.environ["DBUS_SESSION_BUS_ADDRESS"] = addr
            break
def service():
    try:
        bus = dbus.SessionBus()
        bus.get_object("org.freedesktop.secrets", "/org/freedesktop/secrets")
        return bus
    except Exception:
        return None
bus = service()
if bus is None:
    subprocess.run(["gnome-keyring-daemon", "--start", "--components=secrets", "--unlock"], input=b"\\n", env=os.environ, check=False)
    time.sleep(0.4)
    bus = service()
if bus is None:
    raise SystemExit(0)
root = bus.get_object("org.freedesktop.secrets", "/org/freedesktop/secrets")
svc = dbus.Interface(root, "org.freedesktop.Secret.Service")
if str(svc.ReadAlias("default")) in {"/", ""}:
    login = str(svc.ReadAlias("login"))
    if login not in {"/", ""}:
        svc.SetAlias("default", dbus.ObjectPath(login))
print(os.environ.get("DBUS_SESSION_BUS_ADDRESS", ""))
`;
  try {
    const proc = Bun.spawn(["python3", "-c", script], {
      stdout: "pipe",
      stderr: "ignore",
      env: { ...Bun.env },
    });
    const address = (await new Response(proc.stdout).text()).trim();
    await proc.exited;
    if (address.startsWith("unix:")) Bun.env.DBUS_SESSION_BUS_ADDRESS = address;
    return true;
  } catch {
    return false;
  }
}

async function readSecret(name: string): Promise<string | null> {
  try {
    return await withTimeout(Bun.secrets.get({ service: SECRET_SERVICE, name }), 4000);
  } catch {
    return null;
  }
}

async function writeSecret(name: string, value: string): Promise<boolean> {
  try {
    await withTimeout(Bun.secrets.set({ service: SECRET_SERVICE, name, value }), 4000);
    return true;
  } catch {
    return false;
  }
}

export async function loadDeskLogins(sessionFile: string): Promise<DeskLogins> {
  const logins = blankLogins();
  const secretsReady = await ensureSecretStore();
  if (secretsReady) {
    logins.f402User = (await readSecret(SECRET_NAMES.f402User)) ?? "";
    logins.f402Password = (await readSecret(SECRET_NAMES.f402Password)) ?? "";
    logins.fourcEmail = (await readSecret(SECRET_NAMES.fourcEmail)) ?? "";
    logins.fourcPassword = (await readSecret(SECRET_NAMES.fourcPassword)) ?? "";
    if (logins.f402User && logins.f402Password) logins.store = "secrets";
  }
  applyFile(logins, {
    F402_USER: Bun.env.F402_USER ?? "",
    F402_PASSWORD: Bun.env.F402_PASSWORD ?? "",
    FOURC_EMAIL: Bun.env.FOURC_EMAIL ?? "",
    FOURC_PASSWORD: Bun.env.FOURC_PASSWORD ?? "",
  });
  let fileText = "";
  try {
    fileText = await Bun.file(sessionFile).text();
  } catch {
    fileText = "";
  }
  applyFile(logins, parseSessionEnv(fileText));
  if (!secretsReady) return logins;
  const pairs: [string, string][] = [
    [SECRET_NAMES.f402User, logins.f402User],
    [SECRET_NAMES.f402Password, logins.f402Password],
    [SECRET_NAMES.fourcEmail, logins.fourcEmail],
    [SECRET_NAMES.fourcPassword, logins.fourcPassword],
  ];
  let wrote = false;
  for (const [name, value] of pairs) {
    if (!value) continue;
    const existing = await readSecret(name);
    if (existing === value) {
      wrote = true;
      continue;
    }
    if (await writeSecret(name, value)) wrote = true;
  }
  if (wrote && logins.f402User && logins.f402Password) logins.store = "secrets";
  return logins;
}
