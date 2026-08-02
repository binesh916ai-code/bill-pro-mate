/**
 * App lock: 4-6 digit PIN (SHA-256 hashed, per device) plus optional
 * fingerprint / Face unlock through WebAuthn platform authenticators.
 */

const KEY = "pos-lock-v1";

export type LockConfig = {
  enabled: boolean;
  pinHash: string | null;
  /** base64url WebAuthn credential id */
  credentialId: string | null;
};

const blank: LockConfig = { enabled: false, pinHash: null, credentialId: null };

export function readLock(): LockConfig {
  if (typeof window === "undefined") return blank;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? { ...blank, ...(JSON.parse(raw) as Partial<LockConfig>) } : blank;
  } catch {
    return blank;
  }
}

export function writeLock(next: LockConfig) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

export async function hashPin(pin: string) {
  const bytes = new TextEncoder().encode("counterbook:" + pin);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function verifyPin(pin: string) {
  const cfg = readLock();
  if (!cfg.pinHash) return false;
  return (await hashPin(pin)) === cfg.pinHash;
}

export async function setPin(pin: string) {
  const cfg = readLock();
  writeLock({ ...cfg, pinHash: await hashPin(pin), enabled: true });
}

export function disableLock() {
  writeLock(blank);
}

/* ---------------- WebAuthn (fingerprint / Face unlock) ---------------- */

const b64url = (buf: ArrayBuffer) =>
  btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

const fromB64url = (s: string) => {
  const pad = s.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(pad + "=".repeat((4 - (pad.length % 4)) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
};

export async function isBiometricAvailable() {
  if (typeof window === "undefined" || !window.PublicKeyCredential) return false;
  try {
    return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

/** Register this device's fingerprint / face as an unlock method. */
export async function registerBiometric(label: string) {
  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const userId = crypto.getRandomValues(new Uint8Array(16));
  const cred = (await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: { name: "CounterBook POS", id: window.location.hostname },
      user: { id: userId, name: label, displayName: label },
      pubKeyCredParams: [
        { type: "public-key", alg: -7 },
        { type: "public-key", alg: -257 },
      ],
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        userVerification: "required",
        residentKey: "preferred",
      },
      timeout: 60_000,
      attestation: "none",
    },
  })) as PublicKeyCredential | null;
  if (!cred) throw new Error("Biometric setup was cancelled.");
  const cfg = readLock();
  writeLock({ ...cfg, credentialId: b64url(cred.rawId), enabled: true });
  return true;
}

/** Prompt the platform authenticator to unlock. */
export async function unlockWithBiometric() {
  const cfg = readLock();
  if (!cfg.credentialId) throw new Error("No fingerprint registered on this device.");
  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const assertion = await navigator.credentials.get({
    publicKey: {
      challenge,
      allowCredentials: [{ type: "public-key", id: fromB64url(cfg.credentialId) }],
      userVerification: "required",
      timeout: 60_000,
    },
  });
  if (!assertion) throw new Error("Unlock cancelled.");
  return true;
}

export function removeBiometric() {
  const cfg = readLock();
  writeLock({ ...cfg, credentialId: null });
}
