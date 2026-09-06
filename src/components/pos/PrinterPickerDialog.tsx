import { useEffect, useRef, useState } from "react";
import { Bluetooth, Loader2, Printer, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  connectPrinter,
  connectScannedPrinter,
  isNativeApp,
  startPrinterScan,
  stopPrinterScan,
  type ScannedPrinter,
} from "@/lib/escpos";

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** Called with the printer name once connected. */
  onConnected: (name: string) => void;
};

/**
 * Scan-and-pick sheet for Bluetooth printers.
 * Android APK: native LE scan listing nearby devices.
 * Web: a single button that opens the browser's Web Bluetooth chooser.
 */
export function PrinterPickerDialog({ open, onOpenChange, onConnected }: Props) {
  const native = isNativeApp();
  const [devices, setDevices] = useState<ScannedPrinter[]>([]);
  const [scanning, setScanning] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function scan() {
    setError(null);
    setDevices([]);
    setScanning(true);
    try {
      await startPrinterScan((d) =>
        setDevices((prev) => (prev.some((p) => p.id === d.id) ? prev : [...prev, d])),
      );
      timer.current = setTimeout(() => {
        void stopPrinterScan();
        setScanning(false);
      }, 12_000);
    } catch (e) {
      setScanning(false);
      setError((e as Error).message);
      toast.error((e as Error).message);
    }
  }

  useEffect(() => {
    if (!open) return;
    if (native) void scan();
    return () => {
      if (timer.current) clearTimeout(timer.current);
      void stopPrinterScan();
      setScanning(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function pick(d: ScannedPrinter) {
    setBusyId(d.id);
    setError(null);
    if (timer.current) clearTimeout(timer.current);
    setScanning(false);
    try {
      const name = await connectScannedPrinter(d);
      toast.success(`Connected to ${name}`);
      onOpenChange(false);
      onConnected(name);
    } catch (e) {
      setError((e as Error).message);
      toast.error((e as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  async function webPick() {
    setBusyId("web");
    setError(null);
    try {
      const name = await connectPrinter();
      toast.success(`Connected to ${name}`);
      onOpenChange(false);
      onConnected(name);
    } catch (e) {
      setError((e as Error).message);
      toast.error((e as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bluetooth className="h-4 w-4" /> Choose a thermal printer
          </DialogTitle>
          <DialogDescription>
            {native
              ? "Turn the printer on and keep it close. Tap it below to connect."
              : "Your browser will show a list of nearby Bluetooth devices."}
          </DialogDescription>
        </DialogHeader>

        {native ? (
          <div className="space-y-2">
            <div className="max-h-72 space-y-1.5 overflow-auto rounded-lg border border-border p-1.5">
              {devices.length === 0 && (
                <div className="flex items-center justify-center gap-2 px-3 py-8 text-sm text-muted-foreground">
                  {scanning ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Scanning for printers…
                    </>
                  ) : (
                    "No printers found yet."
                  )}
                </div>
              )}
              {devices.map((d) => (
                <button
                  key={d.id}
                  disabled={!!busyId}
                  onClick={() => pick(d)}
                  className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors hover:bg-accent disabled:opacity-60"
                >
                  <Printer className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{d.name}</span>
                    <span className="block truncate text-[11px] text-muted-foreground">{d.id}</span>
                  </span>
                  {busyId === d.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : typeof d.rssi === "number" ? (
                    <span className="text-[11px] text-muted-foreground">{d.rssi} dBm</span>
                  ) : null}
                </button>
              ))}
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <Button variant="outline" className="w-full" disabled={scanning || !!busyId} onClick={scan}>
              {scanning ? <Loader2 className="animate-spin" /> : <RefreshCw />}
              {scanning ? "Scanning…" : "Scan again"}
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {error && <p className="text-xs text-destructive">{error}</p>}
            <Button className="w-full" disabled={!!busyId} onClick={webPick}>
              {busyId ? <Loader2 className="animate-spin" /> : <Bluetooth />} Scan for printers
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
