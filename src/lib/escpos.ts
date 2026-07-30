/* Minimal ESC/POS builder + Web Bluetooth transport for 80mm thermal printers */

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

  size(w: 0 | 1, h: 0 | 1) {
    return this.raw(GS, 0x21, (w << 4) | h);
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

/** pad a 2-column row to `width` chars (32 for 80mm font A) */
export function row(left: string, right: string, width = 32) {
  const l = left.length + right.length > width ? left.slice(0, width - right.length - 1) : left;
  const gap = Math.max(1, width - l.length - right.length);
  return l + " ".repeat(gap) + right;
}

const SERVICES = [
  "000018f0-0000-1000-8000-00805f9b34fb",
  "0000ffe0-0000-1000-8000-00805f9b34fb",
  "e7810a71-73ae-499d-8c15-faa9aef0c3f2",
  "49535343-fe7d-4ae5-8fa9-9fafd205e455",
];

type Conn = { device: BluetoothDevice; characteristic: BluetoothRemoteGATTCharacteristic };
let conn: Conn | null = null;

export function isBluetoothSupported() {
  return typeof navigator !== "undefined" && "bluetooth" in navigator;
}

export function connectedPrinterName() {
  return conn?.device.name ?? null;
}

export async function connectPrinter(): Promise<string> {
  if (!isBluetoothSupported()) throw new Error("Web Bluetooth is not supported in this browser.");
  const device = await navigator.bluetooth.requestDevice({
    acceptAllDevices: true,
    optionalServices: SERVICES,
  });
  const server = await device.gatt!.connect();
  let characteristic: BluetoothRemoteGATTCharacteristic | null = null;
  const services = await server.getPrimaryServices();
  for (const service of services) {
    const chars = await service.getCharacteristics();
    const writable = chars.find((c) => c.properties.write || c.properties.writeWithoutResponse);
    if (writable) {
      characteristic = writable;
      break;
    }
  }
  if (!characteristic) throw new Error("No writable characteristic found on this printer.");
  device.addEventListener("gattserverdisconnected", () => {
    conn = null;
  });
  conn = { device, characteristic };
  return device.name || "Thermal printer";
}

export function disconnectPrinter() {
  conn?.device.gatt?.disconnect();
  conn = null;
}

export async function printBytes(data: Uint8Array) {
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
