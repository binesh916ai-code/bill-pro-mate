/* Minimal ESC/POS builder + Web Bluetooth transport for 80mm thermal printers */

import { Capacitor } from "@capacitor/core";

const ESC = 0x1b;
const GS = 0x1d;

export class EscPosBuilder {
  private parts: number[] = [];

  raw(...bytes: number[]) {
    this.parts.push(...bytes);
    return this;
  }

  init() {
    return this.raw(ESC, 0x40);
  }

  align(a: "left" | "center" | "right") {
    return this.raw(ESC, 0x61, a === "left" ? 0 : a === "center" ? 1 : 2);
  }

  bold(on: boolean) {
    return this.raw(ESC, 0x45, on ? 1 : 0);
  }

  underline(on: boolean) {
    return this.raw(ESC, 0x2d, on ? 1 : 0);
  }

  size(w: 0 | 1, h: 0 | 1) {
    return this.raw(GS, 0x21, (w << 4) | h);
  }

  /** white-on-black reverse printing (GS B n) */
  invert(on: boolean) {
    return this.raw(GS, 0x42, on ? 1 : 0);
  }

  /**
   * Native condensed mode (Font B) — ESC ! n with bit0 set, plus ESC M 1
   * so printers that only honour one of the two still switch fonts.
   * Font B is ~1.33x denser: 64 cols on 80mm, 42 on 58mm.
   */
  condensed(on: boolean, bold = false) {
    this.raw(ESC, 0x4d, on ? 1 : 0);
    return this.raw(ESC, 0x21, (on ? 0x01 : 0x00) | (bold ? 0x08 : 0x00));
  }




  text(s: string) {
    const enc = new TextEncoder().encode(s);
    this.parts.push(...Array.from(enc));
    return this;
  }

  line(s = "") {
    return this.text(s + "\n");
  }

  feed(n = 1) {
    return this.raw(ESC, 0x64, n);
  }

  cut() {
    return this.raw(GS, 0x56, 0x42, 0x00);
  }

  build() {
    return new Uint8Array(this.parts);
  }
}

/** pad a 2-column row to `width` chars (48 for 80mm, 32 for 58mm, font A) */
export function row(left: string, right: string, width = 48) {
  const l = left.length + right.length > width ? left.slice(0, Math.max(0, width - right.length - 1)) : left;
  const gap = Math.max(1, width - l.length - right.length);
  return l + " ".repeat(gap) + right;
}

export function center(s: string, width = 48) {
  if (s.length >= width) return s.slice(0, width);
  const pad = Math.floor((width - s.length) / 2);
  return " ".repeat(pad) + s;
}

export function repeat(ch: string, width = 48) {
  return ch.repeat(width);
}

/** hard-wrap a string into fixed-width lines (optionally indenting continuations) */
export function wrap(s: string, width: number, indent = "") {
  const out: string[] = [];
  let rest = s.trim();
  let first = true;
  const w = Math.max(4, width);
  while (rest.length > 0) {
    const limit = first ? w : w - indent.length;
    if (rest.length <= limit) {
      out.push((first ? "" : indent) + rest);
      break;
    }
    let cut = rest.lastIndexOf(" ", limit);
    if (cut <= 0) cut = limit;
    out.push((first ? "" : indent) + rest.slice(0, cut).trimEnd());
    rest = rest.slice(cut).trimStart();
    first = false;
  }
  return out.length ? out : [""];
}

const padLeft = (s: string, n: number) =>
  s.length >= n ? s.slice(s.length - n) : " ".repeat(n - s.length) + s;
const padRight = (s: string, n: number) =>
  s.length >= n ? s.slice(0, n) : s + " ".repeat(n - s.length);

/**
 * Fixed-width item row: NAME | QTY | RATE | AMOUNT.
 * Long names wrap onto their own lines so the numeric columns never shift.
 */
export function itemRow(
  name: string,
  qty: string,
  rate: string,
  amount: string,
  width = 48,
): string[] {
  const qtyW = width >= 48 ? 5 : 4;
  const rateW = width >= 48 ? 9 : 7;
  const amtW = width >= 48 ? 10 : 8;
  const nameW = width - qtyW - rateW - amtW - 1;
  const parts = wrap(name, nameW);
  const head = padRight(parts[0]!, nameW);
  const first =
    head + " " + padLeft(qty, qtyW) + padLeft(rate, rateW) + padLeft(amount, amtW);
  return [first, ...parts.slice(1).map((p) => p)];
}

/** Column header matching itemRow() */
export function itemHeader(width = 48) {
  return itemRow("ITEM", "QTY", "RATE", "AMOUNT", width)[0]!;
}


/* Minimal Web Bluetooth typings (not in default TS lib) */
type BluetoothCharProps = { write: boolean; writeWithoutResponse: boolean };
type BluetoothRemoteGATTCharacteristic = {
  properties: BluetoothCharProps;
  writeValue: (v: BufferSource) => Promise<void>;
  writeValueWithoutResponse: (v: BufferSource) => Promise<void>;
};
type BluetoothRemoteGATTService = {
  getCharacteristics: () => Promise<BluetoothRemoteGATTCharacteristic[]>;
};
type BluetoothRemoteGATTServer = {
  connected?: boolean;
  connect: () => Promise<BluetoothRemoteGATTServer>;
  disconnect: () => void;
  getPrimaryServices: () => Promise<BluetoothRemoteGATTService[]>;
};
type BluetoothDevice = {
  id?: string;
  name?: string | null;
  gatt?: BluetoothRemoteGATTServer;
  addEventListener: (type: string, cb: () => void) => void;
  watchAdvertisements?: () => Promise<void>;
};
type BluetoothApi = {
  requestDevice: (opts: {
    acceptAllDevices?: boolean;
    optionalServices?: string[];
  }) => Promise<BluetoothDevice>;
  getDevices?: () => Promise<BluetoothDevice[]>;
};

function getBluetooth(): BluetoothApi | undefined {
  return (navigator as unknown as { bluetooth?: BluetoothApi }).bluetooth;
}

/* ---------- native (Capacitor Android) transport ---------- */

export function isNativeApp() {
  return Capacitor.isNativePlatform();
}

type NativeConn = { deviceId: string; name: string; service: string; characteristic: string; withoutResponse: boolean };
let nativeConn: NativeConn | null = null;
let bleReady = false;

/** Turn plugin / OS errors into a message the cashier can act on. */
function explainBleError(e: unknown): Error {
  const msg = String((e as Error)?.message ?? e ?? "").toLowerCase();
  if (msg.includes("permission") || msg.includes("denied"))
    return new Error(
      "Bluetooth permission was denied. Open Android Settings → Apps → CounterBook → Permissions and allow Nearby devices & Location, then try again.",
    );
  if (msg.includes("not enabled") || msg.includes("disabled") || msg.includes("bluetooth is off"))
    return new Error("Bluetooth is turned off. Switch it on and try again.");
  if (msg.includes("location"))
    return new Error("Location services must be on for Bluetooth scanning on this Android version.");
  if (msg.includes("cancel")) return new Error("Printer selection was cancelled.");
  return new Error((e as Error)?.message || "Could not reach the Bluetooth printer.");
}

/**
 * Initialise the native BLE plugin. On Android this explicitly requests the
 * BLUETOOTH_SCAN / BLUETOOTH_CONNECT (API 31+) or ACCESS_FINE_LOCATION (≤ API 30)
 * runtime permissions and rejects with a readable error if they are denied.
 */
async function ble() {
  const { BleClient } = await import("@capacitor-community/bluetooth-le");
  if (!bleReady) {
    try {
      await BleClient.initialize({ androidNeverForLocation: true });
    } catch (e) {
      throw explainBleError(e);
    }
    bleReady = true;
  }
  return BleClient;
}

/** Request runtime permissions + make sure the Bluetooth radio is on. */
export async function ensureBlePermissions() {
  const BleClient = await ble();
  try {
    const on = await BleClient.isEnabled();
    if (!on) {
      await BleClient.requestEnable().catch(() => {});
      if (!(await BleClient.isEnabled())) throw new Error("Bluetooth is turned off. Switch it on and try again.");
    }
    // Android ≤ 11 also needs location services for BLE scans.
    const loc = await BleClient.isLocationEnabled().catch(() => true);
    if (!loc) await BleClient.openLocationSettings().catch(() => {});
  } catch (e) {
    throw explainBleError(e);
  }
}

export type ScannedPrinter = { id: string; name: string; rssi?: number };

/** Start a native LE scan; calls `onDevice` for every (de-duplicated) device found. */
export async function startPrinterScan(onDevice: (d: ScannedPrinter) => void) {
  await ensureBlePermissions();
  const BleClient = await ble();
  try {
    await BleClient.requestLEScan({ allowDuplicates: false }, (r) => {
      const name = r.device.name || r.localName || "";
      onDevice({ id: r.device.deviceId, name: name || `Unknown (${r.device.deviceId.slice(-5)})`, rssi: r.rssi });
    });
  } catch (e) {
    throw explainBleError(e);
  }
}

export async function stopPrinterScan() {
  if (!bleReady) return;
  const BleClient = await ble();
  await BleClient.stopLEScan().catch(() => {});
}

/** Connect to a device chosen from the in-app picker (native only). */
export async function connectScannedPrinter(d: ScannedPrinter): Promise<string> {
  await stopPrinterScan();
  connecting = true;
  emit();
  try {
    return await nativeAttach(d.id, d.name);
  } catch (e) {
    throw explainBleError(e);
  } finally {
    connecting = false;
    emit();
  }
}

async function nativeConnect(): Promise<string> {
  await ensureBlePermissions();
  const BleClient = await ble();
  connecting = true;
  emit();
  try {
    const device = await BleClient.requestDevice({ optionalServices: SERVICES });
    return await nativeAttach(device.deviceId, device.name || "Thermal printer");
  } catch (e) {
    throw explainBleError(e);
  } finally {
    connecting = false;
    emit();
  }
}

async function nativeAutoReconnect(): Promise<string | null> {
  const saved = savedPrinter();
  if (!saved?.id) return null;
  connecting = true;
  emit();
  try {
    return await nativeAttach(saved.id, saved.name);
  } catch {
    return null;
  } finally {
    connecting = false;
    emit();
  }
}

async function nativePrint(data: Uint8Array) {
  if (!nativeConn) throw new Error("No printer connected.");
  const BleClient = await ble();
  const chunk = 180;
  for (let i = 0; i < data.length; i += chunk) {
    const slice = data.slice(i, i + chunk);
    const view = new DataView(slice.buffer, slice.byteOffset, slice.byteLength);
    if (nativeConn.withoutResponse) {
      await BleClient.writeWithoutResponse(nativeConn.deviceId, nativeConn.service, nativeConn.characteristic, view);
    } else {
      await BleClient.write(nativeConn.deviceId, nativeConn.service, nativeConn.characteristic, view);
    }
    await new Promise((r) => setTimeout(r, 25));
  }
}

const SERVICES = [
  "000018f0-0000-1000-8000-00805f9b34fb",
  "0000ffe0-0000-1000-8000-00805f9b34fb",
  "e7810a71-73ae-499d-8c15-faa9aef0c3f2",
  "49535343-fe7d-4ae5-8fa9-9fafd205e455",
];

type Conn = { device: BluetoothDevice; characteristic: BluetoothRemoteGATTCharacteristic };
let conn: Conn | null = null;

/* ---------- saved pairing + status broadcasting ---------- */

const PAIR_KEY = "pos-printer-v1";

export type PrinterStatus = {
  connected: boolean;
  name: string | null;
  savedName: string | null;
  connecting: boolean;
};

let connecting = false;
const statusListeners = new Set<(s: PrinterStatus) => void>();

export function savedPrinter(): { id: string; name: string } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PAIR_KEY);
    return raw ? (JSON.parse(raw) as { id: string; name: string }) : null;
  } catch {
    return null;
  }
}

function rememberPrinter(device: BluetoothDevice) {
  try {
    window.localStorage.setItem(
      PAIR_KEY,
      JSON.stringify({ id: device.id ?? "", name: device.name || "Thermal printer" }),
    );
  } catch {
    /* ignore */
  }
}

export function forgetPrinter() {
  try {
    window.localStorage.removeItem(PAIR_KEY);
  } catch {
    /* ignore */
  }
  disconnectPrinter();
}

export function printerStatus(): PrinterStatus {
  const saved = savedPrinter();
  return {
    connected: !!conn || !!nativeConn,
    name: conn?.device.name ?? nativeConn?.name ?? null,
    savedName: saved?.name ?? null,
    connecting,
  };
}

function emit() {
  const s = printerStatus();
  statusListeners.forEach((l) => l(s));
}

export function subscribePrinter(cb: (s: PrinterStatus) => void) {
  statusListeners.add(cb);
  cb(printerStatus());
  return () => statusListeners.delete(cb);
}

export function isBluetoothSupported() {
  if (typeof navigator === "undefined") return false;
  return isNativeApp() || !!getBluetooth();
}

export function connectedPrinterName() {
  return conn?.device.name ?? nativeConn?.name ?? null;
}

async function attach(device: BluetoothDevice): Promise<string> {
  const server = await device.gatt!.connect();
  let characteristic: BluetoothRemoteGATTCharacteristic | null = null;
  const services = await server.getPrimaryServices();
  for (const service of services) {
    const chars = await service.getCharacteristics();
    const writable = chars.find(
      (c: BluetoothRemoteGATTCharacteristic) =>
        c.properties.write || c.properties.writeWithoutResponse,
    );
    if (writable) {
      characteristic = writable;
      break;
    }
  }
  if (!characteristic) throw new Error("No writable characteristic found on this printer.");
  device.addEventListener("gattserverdisconnected", () => {
    conn = null;
    emit();
  });
  conn = { device, characteristic };
  rememberPrinter(device);
  emit();
  return device.name || "Thermal printer";
}

/** Full scanner dialog — used by "Change printer". */
export async function connectPrinter(): Promise<string> {
  if (isNativeApp()) return nativeConnect();
  if (!isBluetoothSupported()) throw new Error("Web Bluetooth is not supported in this browser.");
  connecting = true;
  emit();
  try {
    const device = await getBluetooth()!.requestDevice({
      acceptAllDevices: true,
      optionalServices: SERVICES,
    });
    return await attach(device);
  } finally {
    connecting = false;
    emit();
  }
}

/** Silent reconnect to the previously paired printer. Returns name or null. */
export async function autoReconnect(): Promise<string | null> {
  if (isNativeApp()) return nativeConn ? nativeConn.name : nativeAutoReconnect();
  if (conn) return conn.device.name ?? "Thermal printer";
  const bt = getBluetooth();
  const saved = savedPrinter();
  if (!bt?.getDevices || !saved?.id) return null;
  connecting = true;
  emit();
  try {
    const devices = await bt.getDevices();
    const device = devices.find((d) => d.id === saved.id);
    if (!device?.gatt) return null;
    return await attach(device);
  } catch {
    return null;
  } finally {
    connecting = false;
    emit();
  }
}

/** Reconnect if possible, otherwise open the scanner. */
export async function ensurePrinter(): Promise<string> {
  if (nativeConn) return nativeConn.name;
  if (conn) return conn.device.name ?? "Thermal printer";
  const auto = await autoReconnect();
  if (auto) return auto;
  return connectPrinter();
}

export function disconnectPrinter() {
  conn?.device.gatt?.disconnect();
  conn = null;
  if (nativeConn) {
    const id = nativeConn.deviceId;
    nativeConn = null;
    void ble().then((c) => c.disconnect(id)).catch(() => {});
  }
  emit();
}

/** Base64 of raw ESC/POS bytes (used for the RawBT intent scheme). */
export function bytesToBase64(data: Uint8Array) {
  let bin = "";
  for (let i = 0; i < data.length; i += 0x8000)
    bin += String.fromCharCode(...Array.from(data.subarray(i, i + 0x8000)));
  return btoa(bin);
}

export async function printBytes(data: Uint8Array) {
  if (nativeConn) return nativePrint(data);
  if (!conn) throw new Error("No printer connected.");
  const chunk = 180;
  for (let i = 0; i < data.length; i += chunk) {
    const slice = data.slice(i, i + chunk);
    if (conn.characteristic.properties.writeWithoutResponse) {
      await conn.characteristic.writeValueWithoutResponse(slice);
    } else {
      await conn.characteristic.writeValue(slice);
    }
    await new Promise((r) => setTimeout(r, 25));
  }
}
