import { useMemo, useRef, useState } from "react";
import { FileText, Minus, Plus, Receipt, Save, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { BillPreview, billTotals, money, type BillData } from "./BillPreview";
import { BillDialog } from "./BillDialog";
import { PrinterBadge } from "./PrinterBadge";
import type { CartLine, Firm, Item, PosData } from "@/lib/pos-store";

type Props = {
  firm: Firm | null;
  items: Item[];
  update: (fn: (d: PosData) => PosData) => void;
  uid: () => string;
};

const todayStr = () => new Date().toISOString().slice(0, 10);
const nowStr = () => new Date().toTimeString().slice(0, 5);

export function BillingTab({ firm, items, update, uid }: Props) {
  const [invoiceNo, setInvoiceNo] = useState("");
  const [date, setDate] = useState(todayStr);
  const [time, setTime] = useState(nowStr);
  const [customer, setCustomer] = useState("");
  const [query, setQuery] = useState("");
  const [lines, setLines] = useState<CartLine[]>([]);
  const [discount, setDiscount] = useState(0);
  const [payment, setPayment] = useState<"Cash" | "UPI">("Cash");
  const [preview, setPreview] = useState<null | "a4" | "thermal">(null);
  const [printMode, setPrintMode] = useState<"a4" | "thermal">("a4");
  const [printerName, setPrinterName] = useState<string | null>(connectedPrinterName());

  const autoNo = firm ? `${firm.invoicePrefix}${String(firm.nextInvoiceNo).padStart(4, "0")}` : "";
  const effectiveNo = invoiceNo.trim() || autoNo;

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items.slice(0, 8);
    return items.filter((i) => i.name.toLowerCase().includes(q)).slice(0, 8);
  }, [items, query]);

  const { subtotal, total } = billTotals(lines, discount);

  const bill: BillData = {
    firm,
    invoiceNo: effectiveNo,
    date,
    time,
    lines,
    discount,
    payment,
    customer,
  };

  function addItem(item: Item) {
    setLines((prev) => {
      const found = prev.find((l) => l.itemId === item.id);
      if (found)
        return prev.map((l) => (l.itemId === item.id ? { ...l, qty: l.qty + 1 } : l));
      return [
        ...prev,
        { itemId: item.id, name: item.name, price: item.price, unit: item.unit, qty: 1 },
      ];
    });
    setQuery("");
  }

  const setQty = (id: string, qty: number) =>
    setLines((prev) =>
      qty <= 0 ? prev.filter((l) => l.itemId !== id) : prev.map((l) => (l.itemId === id ? { ...l, qty } : l)),
    );

  function resetBill() {
    setLines([]);
    setDiscount(0);
    setCustomer("");
    setInvoiceNo("");
    setDate(todayStr());
    setTime(nowStr());
  }

  function saveBill(silent = false) {
    if (!firm || lines.length === 0) {
      if (!silent) toast.error("Add at least one item to the cart.");
      return false;
    }
    update((d) => ({
      ...d,
      firms: d.firms.map((f) =>
        f.id === firm.id
          ? {
              ...f,
              nextInvoiceNo: invoiceNo.trim() ? f.nextInvoiceNo : f.nextInvoiceNo + 1,
            }
          : f,
      ),
      bills: [
        {
          id: uid(),
          firmId: firm.id,
          firmName: firm.name,
          invoiceNo: effectiveNo,
          date,
          time,
          lines,
          total,
          discount,
          payment,
          createdAt: Date.now(),
        },
        ...d.bills,
      ],
    }));
    if (!silent) toast.success(`Bill ${effectiveNo} saved`);
    return true;
  }

  function openPreview(mode: "a4" | "thermal") {
    if (lines.length === 0) {
      toast.error("Cart is empty.");
      return;
    }
    setPrintMode(mode);
    setPreview(mode);
  }

  function doPrint() {
    window.print();
  }

  async function handleConnect() {
    if (!isBluetoothSupported()) {
      toast.error("Web Bluetooth isn't available in this browser. Use Chrome on Android/desktop.");
      return;
    }
    try {
      const name = await connectPrinter();
      setPrinterName(name);
      toast.success(`Connected to ${name}`);
    } catch (e) {
      toast.error((e as Error).message || "Could not connect to printer.");
    }
  }

  async function handleThermalPrint() {
    if (lines.length === 0) return toast.error("Cart is empty.");
    if (!connectedPrinterName()) return toast.error("Connect a thermal printer first.");
    try {
      const b = new EscPosBuilder().init().align("center").bold(true).size(1, 1);
      b.line(firm?.name ?? "").size(0, 0).bold(false);
      if (firm?.address) b.line(firm.address);
      if (firm?.phone) b.line("Ph: " + firm.phone);
      b.line("--------------------------------").align("left");
      b.line(row(`No: ${effectiveNo}`, date));
      b.line(row(customer ? `Cust: ${customer}` : "", time));
      b.line("--------------------------------");
      b.bold(true).line(row("ITEM  QTY x RATE", "AMOUNT")).bold(false);
      b.line("--------------------------------");
      lines.forEach((l) => {
        b.line(l.name);
        b.line(row(`  ${l.qty} x ${money(l.price)}`, money(l.price * l.qty)));
      });
      b.line("--------------------------------");
      b.line(row("Subtotal", money(subtotal)));
      if (discount > 0) b.line(row("Discount", "-" + money(discount)));
      b.bold(true).line(row("TOTAL", "Rs." + money(total))).bold(false);
      b.line(row("Paid by", payment));
      b.line("--------------------------------");
      b.align("center").line(firm?.footer ?? "").feed(3).cut();
      await printBytes(b.build());
      toast.success("Sent to thermal printer");
    } catch (e) {
      toast.error((e as Error).message || "Printing failed.");
    }
  }

  return (
    <div className="space-y-4 pb-32 lg:pb-6">
      <Card className="gap-0 p-4">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Field label="Invoice No.">
            <Input
              value={invoiceNo}
              placeholder={autoNo}
              onChange={(e) => setInvoiceNo(e.target.value)}
              className="font-mono"
            />
          </Field>
          <Field label="Customer (optional)">
            <Input value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="Walk-in" />
          </Field>
          <Field label="Date">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Time">
            <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </Field>
        </div>
      </Card>

      <Card className="gap-3 p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search item by name..."
            className="h-12 pl-9 text-base"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {results.map((i) => (
            <button
              key={i.id}
              onClick={() => addItem(i)}
              className="rounded-lg border border-border bg-secondary px-3 py-2 text-left text-sm transition-colors hover:border-primary hover:bg-accent"
            >
              <span className="font-medium">{i.name}</span>
              <span className="ml-2 font-mono text-xs text-muted-foreground">
                {money(i.price)}/{i.unit}
              </span>
            </button>
          ))}
          {results.length === 0 && (
            <p className="py-1 text-sm text-muted-foreground">No matching items.</p>
          )}
        </div>
      </Card>

      <Card className="gap-0 overflow-hidden p-0">
        {lines.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">
            Cart is empty — search and tap an item to add it.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {lines.map((l) => (
              <li key={l.itemId} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 p-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{l.name}</p>
                  <p className="font-mono text-xs text-muted-foreground">
                    {money(l.price)} / {l.unit}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <div className="flex items-center rounded-lg border border-border">
                    <button
                      className="grid h-9 w-9 place-items-center text-muted-foreground hover:text-foreground"
                      onClick={() => setQty(l.itemId, l.qty - 1)}
                      aria-label="Decrease quantity"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <input
                      value={l.qty}
                      onChange={(e) => setQty(l.itemId, Number(e.target.value) || 0)}
                      className="w-10 bg-transparent text-center font-mono text-sm outline-none"
                    />
                    <button
                      className="grid h-9 w-9 place-items-center text-muted-foreground hover:text-foreground"
                      onClick={() => setQty(l.itemId, l.qty + 1)}
                      aria-label="Increase quantity"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <span className="w-20 text-right font-mono font-semibold">
                    {money(l.price * l.qty)}
                  </span>
                  <button
                    onClick={() => setQty(l.itemId, 0)}
                    className="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground hover:text-destructive"
                    aria-label="Remove item"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="gap-4 p-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Discount (Rs.)">
            <Input
              type="number"
              inputMode="decimal"
              value={discount || ""}
              onChange={(e) => setDiscount(Number(e.target.value) || 0)}
              className="font-mono"
            />
          </Field>
          <Field label="Payment method">
            <div className="flex h-9 items-center gap-2">
              {(["Cash", "UPI"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPayment(p)}
                  className={`h-9 flex-1 rounded-lg border text-sm font-medium transition-colors ${
                    payment === p
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-muted-foreground"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </Field>
        </div>

        <div className="space-y-1 rounded-xl bg-secondary p-4 font-mono text-sm">
          <Row label="Subtotal" value={money(subtotal)} />
          {discount > 0 && <Row label="Discount" value={"-" + money(discount)} />}
          <div className="flex justify-between border-t border-border pt-2 text-xl font-bold">
            <span>TOTAL</span>
            <span>₹ {money(total)}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          <Button variant="outline" onClick={() => openPreview("a4")}>
            <Printer /> A4 Preview
          </Button>
          <Button variant="outline" onClick={() => openPreview("thermal")}>
            <Printer /> 80mm Preview
          </Button>
          <Button variant={printerName ? "secondary" : "outline"} onClick={handleConnect}>
            <Bluetooth /> {printerName ? printerName.slice(0, 12) : "Connect Printer"}
          </Button>
          <Button onClick={handleThermalPrint}>
            <Printer /> Thermal Print
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="ghost" onClick={resetBill}>
            <X /> Clear
          </Button>
          <Button
            className="bg-ink text-primary-foreground hover:bg-ink/90"
            onClick={() => saveBill() && resetBill()}
          >
            <Save /> Save Bill
          </Button>
        </div>
      </Card>

      <Dialog open={preview !== null} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-h-[90vh] overflow-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{printMode === "a4" ? "A4 Invoice preview" : "80mm receipt preview"}</DialogTitle>
          </DialogHeader>
          <div className="rounded-lg border border-border bg-white">
            <BillPreview bill={bill} mode={printMode} />
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" onClick={() => setPreview(null)}>
              Close
            </Button>
            <Button
              onClick={() => {
                saveBill(true);
                doPrint();
              }}
            >
              <Printer /> Print / Save as PDF
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className={`print-area ${printMode === "thermal" ? "thermal" : ""}`}>
        <BillPreview bill={bill} mode={printMode} />
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-muted-foreground">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
