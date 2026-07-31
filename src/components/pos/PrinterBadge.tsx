import { useEffect, useState } from "react";
import { Bluetooth, BluetoothConnected, BluetoothOff, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  autoReconnect,
  connectPrinter,
  isBluetoothSupported,
  printerStatus,
  subscribePrinter,
  type PrinterStatus,
} from "@/lib/escpos";

export function PrinterBadge({ compact = false }: { compact?: boolean }) {
  const [status, setStatus] = useState<PrinterStatus>(printerStatus);

  useEffect(() => {
    const unsub = subscribePrinter(setStatus);
    void autoReconnect();
    return () => {
      unsub();
    };
  }, []);

  async function change() {
    if (!isBluetoothSupported())
      return toast.error("Web Bluetooth isn't available here. Use Chrome on Android/desktop.");
    try {
      const name = await connectPrinter();
      toast.success(`Connected to ${name}`);
    } catch (e) {
      toast.error((e as Error).message || "Could not connect to printer.");
    }
  }

  const label = status.connecting
    ? "Connecting…"
    : status.connected
      ? `Printer: ${status.name}`
      : status.savedName
        ? `Disconnected · ${status.savedName}`
        : "Printer: Not paired";

  return (
    <div className="flex items-center gap-2">
      <span
        className={`inline-flex min-w-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${
          status.connected
            ? "border-success/30 bg-success/10 text-success"
            : "border-destructive/30 bg-destructive/10 text-destructive"
        }`}
      >
        {status.connecting ? (
          <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
        ) : status.connected ? (
          <BluetoothConnected className="h-3.5 w-3.5 shrink-0" />
        ) : (
          <BluetoothOff className="h-3.5 w-3.5 shrink-0" />
        )}
        <span className="truncate">{label}</span>
      </span>
      {!compact && (
        <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={change}>
          <Bluetooth className="h-3.5 w-3.5" /> Change
        </Button>
      )}
    </div>
  );
}
