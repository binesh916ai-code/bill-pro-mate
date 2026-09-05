import { useRef, useState } from "react";
import { Bluetooth, Download, FileImage, Printer } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BillPreview, type BillData } from "./BillPreview";
import { printThermal, printViaRawBT, saveBillImage, saveBillPdf } from "@/lib/bill-output";
import { ensurePrinter, isBluetoothSupported, isNativeApp } from "@/lib/escpos";

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  bill: BillData;
  mode: "a4" | "thermal";
  onModeChange: (m: "a4" | "thermal") => void;
  template: number;
  onBeforePrint?: () => void;
  title?: string;
};

export function BillDialog({
  open,
  onOpenChange,
  bill,
  mode,
  onModeChange,
  template,
  onBeforePrint,
  title,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const paper = (Number(bill.firm?.paperSize) === 58 ? 58 : 80) as 58 | 80;
  const [busy, setBusy] = useState(false);

  const fileName = `${bill.invoiceNo || "bill"}-${mode === "a4" ? "invoice" : "receipt"}`;

  async function withBusy(fn: () => Promise<void>, okMsg: string) {
    setBusy(true);
    try {
      await fn();
      toast.success(okMsg);
    } catch (e) {
      toast.error((e as Error).message || "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function thermalPrint() {
    if (!isBluetoothSupported())
      return toast.error("Web Bluetooth isn't available here. Use Chrome on Android/desktop.");
    await withBusy(async () => {
      await ensurePrinter();
      onBeforePrint?.();
      await printThermal(bill, template, paper);
    }, "Sent to thermal printer");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{title ?? (mode === "a4" ? "A4 invoice" : `${paper}mm receipt`)}</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2">
          {(["a4", "thermal"] as const).map((m) => (
            <button
              key={m}
              onClick={() => onModeChange(m)}
              className={`h-8 flex-1 rounded-lg border text-xs font-medium transition-colors ${
                mode === m
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-muted-foreground"
              }`}
            >
              {m === "a4" ? "A4 / PDF" : `${paper}mm thermal`}
            </button>
          ))}
        </div>

        <div className="overflow-auto rounded-lg border border-border bg-white">
          <div ref={ref}>
            <BillPreview bill={bill} mode={mode} template={template} paper={paper} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => {
              onBeforePrint?.();
              if (isNativeApp()) {
                // window.print() is a no-op inside the Android WebView — hand the
                // ESC/POS receipt to RawBT via its intent scheme instead.
                if (mode === "thermal") {
                  printViaRawBT(bill, template, paper);
                  toast.success("Sent to RawBT");
                } else {
                  withBusy(() => saveBillPdf(ref.current!, mode, fileName, paper), "PDF saved — open it to print");
                }
                return;
              }
              window.print();
            }}
          >
            <Printer /> Print
          </Button>
          <Button
            variant="outline"
            disabled={busy}
            onClick={() =>
              withBusy(async () => {
                onBeforePrint?.();
                await saveBillPdf(ref.current!, mode, fileName, paper);
              }, "PDF saved to your device")
            }
          >
            <Download /> Save PDF
          </Button>
          <Button
            variant="outline"
            disabled={busy}
            onClick={() =>
              withBusy(async () => {
                onBeforePrint?.();
                await saveBillImage(ref.current!, fileName);
              }, "Image saved to your device")
            }
          >
            <FileImage /> Save Image
          </Button>
          <Button disabled={busy} onClick={thermalPrint}>
            <Bluetooth /> Thermal Print
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
