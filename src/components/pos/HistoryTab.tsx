import { useMemo, useState } from "react";
import { Minus, Pencil, Plus, Printer, Receipt, Save, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { billTotals, fmtDate, money, type BillData } from "./BillPreview";
import { BillDialog } from "./BillDialog";
import type { Firm, PosData, SavedBill } from "@/lib/pos-store";

type Props = {
  bills: SavedBill[];
  firms: Firm[];
  update: (fn: (d: PosData) => PosData) => void;
};

export function HistoryTab({ bills, firms, update }: Props) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<SavedBill | null>(null);
  const [printOpen, setPrintOpen] = useState(false);
  const [printMode, setPrintMode] = useState<"a4" | "thermal">("a4");

  const selected = useMemo(() => bills.find((b) => b.id === openId) ?? null, [bills, openId]);
  const view = editing && draft ? draft : selected;
  const firm = firms.find((f) => f.id === view?.firmId) ?? null;

  const todayTotal = bills
    .filter((b) => b.date === new Date().toISOString().slice(0, 10))
    .reduce((s, b) => s + b.total, 0);

  const billData: BillData | null = view
    ? {
        firm,
        invoiceNo: view.invoiceNo,
        date: view.date,
        time: view.time,
        lines: view.lines,
        discount: view.discount,
        payment: view.payment,
        customer: view.customer ?? "",
      }
    : null;

  function close() {
    setOpenId(null);
    setEditing(false);
    setDraft(null);
  }

  function startEdit() {
    if (!selected) return;
    setDraft({ ...selected, lines: selected.lines.map((l) => ({ ...l })) });
    setEditing(true);
  }

  function saveEdit() {
    if (!draft) return;
    if (draft.lines.length === 0) return toast.error("A bill needs at least one item.");
    const { total } = billTotals(draft.lines, draft.discount);
    const next = { ...draft, total };
    update((d) => ({ ...d, bills: d.bills.map((b) => (b.id === next.id ? next : b)) }));
    setEditing(false);
    setDraft(null);
    toast.success("Bill updated");
  }

  function removeBill(id: string) {
    update((d) => ({ ...d, bills: d.bills.filter((b) => b.id !== id) }));
    close();
    toast.success("Bill deleted");
  }

  const setDraftQty = (itemId: string, qty: number) =>
    setDraft((d) =>
      !d
        ? d
        : {
            ...d,
            lines:
              qty <= 0
                ? d.lines.filter((l) => l.itemId !== itemId)
                : d.lines.map((l) => (l.itemId === itemId ? { ...l, qty } : l)),
          },
    );

  if (bills.length === 0) {
    return (
      <Card className="items-center gap-2 p-10 text-center">
        <Receipt className="h-6 w-6 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Saved bills will appear here.</p>
      </Card>
    );
  }

  const totals = view ? billTotals(view.lines, view.discount) : null;

  return (
    <div className="space-y-4 pb-24">
      <Card className="gap-1 p-4">
        <p className="text-xs text-muted-foreground">Today&apos;s sales</p>
        <p className="font-mono text-2xl font-bold">₹ {money(todayTotal)}</p>
      </Card>

      <Card className="gap-0 overflow-hidden p-0">
        <ul className="divide-y divide-border">
          {bills.map((b) => (
            <li key={b.id}>
              <button
                onClick={() => setOpenId(b.id)}
                className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 p-3 text-left transition-colors hover:bg-accent/60"
              >
                <div className="min-w-0">
                  <p className="truncate font-mono font-medium">{b.invoiceNo}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {b.firmName} · {fmtDate(b.date)} {b.time} · {b.payment} · {b.lines.length} items
                  </p>
                </div>
                <span className="shrink-0 font-mono font-semibold">₹{money(b.total)}</span>
              </button>
            </li>
          ))}
        </ul>
      </Card>

      <Dialog open={!!selected && !printOpen} onOpenChange={(o) => !o && close()}>
        <DialogContent className="max-h-[90vh] overflow-auto sm:max-w-lg">
          {view && totals && (
            <>
              <DialogHeader>
                <DialogTitle className="font-mono">{view.invoiceNo}</DialogTitle>
              </DialogHeader>

              {editing && draft ? (
                <div className="grid grid-cols-2 gap-3">
                  <FieldBox label="Invoice No.">
                    <Input
                      value={draft.invoiceNo}
                      className="font-mono"
                      onChange={(e) => setDraft({ ...draft, invoiceNo: e.target.value })}
                    />
                  </FieldBox>
                  <FieldBox label="Customer">
                    <Input
                      value={draft.customer ?? ""}
                      onChange={(e) => setDraft({ ...draft, customer: e.target.value })}
                    />
                  </FieldBox>
                  <FieldBox label="Date">
                    <Input
                      type="date"
                      value={draft.date}
                      onChange={(e) => setDraft({ ...draft, date: e.target.value })}
                    />
                  </FieldBox>
                  <FieldBox label="Time">
                    <Input
                      type="time"
                      value={draft.time}
                      onChange={(e) => setDraft({ ...draft, time: e.target.value })}
                    />
                  </FieldBox>
                  <FieldBox label="Discount (Rs.)">
                    <Input
                      type="number"
                      value={draft.discount || ""}
                      className="font-mono"
                      onChange={(e) => setDraft({ ...draft, discount: Number(e.target.value) || 0 })}
                    />
                  </FieldBox>
                  <FieldBox label="Payment">
                    <div className="flex h-9 gap-2">
                      {(["Cash", "UPI"] as const).map((p) => (
                        <button
                          key={p}
                          onClick={() => setDraft({ ...draft, payment: p })}
                          className={`h-9 flex-1 rounded-lg border text-sm font-medium ${
                            draft.payment === p
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border text-muted-foreground"
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </FieldBox>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  <Info label="Store" value={view.firmName} />
                  <Info label="Payment" value={view.payment} />
                  <Info label="Date" value={fmtDate(view.date)} />
                  <Info label="Time" value={view.time} />
                  <Info label="Customer" value={view.customer || "Walk-in"} />
                  <Info label="Items" value={String(view.lines.length)} />
                </div>
              )}

              <ul className="divide-y divide-border rounded-xl border border-border">
                {view.lines.map((l) => (
                  <li key={l.itemId} className="flex items-center gap-2 p-2.5 text-sm">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{l.name}</p>
                      <p className="font-mono text-xs text-muted-foreground">
                        {money(l.price)} / {l.unit}
                      </p>
                    </div>
                    {editing ? (
                      <div className="flex items-center rounded-lg border border-border">
                        <button
                          className="grid h-8 w-8 place-items-center text-muted-foreground"
                          onClick={() => setDraftQty(l.itemId, l.qty - 1)}
                          aria-label="Decrease quantity"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-8 text-center font-mono text-sm">{l.qty}</span>
                        <button
                          className="grid h-8 w-8 place-items-center text-muted-foreground"
                          onClick={() => setDraftQty(l.itemId, l.qty + 1)}
                          aria-label="Increase quantity"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <span className="font-mono text-xs text-muted-foreground">x{l.qty}</span>
                    )}
                    <span className="w-20 text-right font-mono font-semibold">
                      {money(l.price * l.qty)}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="space-y-1 rounded-xl bg-secondary p-3 font-mono text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>{money(totals.subtotal)}</span>
                </div>
                {view.discount > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Discount</span>
                    <span>-{money(view.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-border pt-2 text-lg font-bold">
                  <span>TOTAL</span>
                  <span>₹ {money(totals.total)}</span>
                </div>
              </div>

              {editing ? (
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setEditing(false);
                      setDraft(null);
                    }}
                  >
                    <X /> Cancel
                  </Button>
                  <Button onClick={saveEdit}>
                    <Save /> Save changes
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setPrintMode("a4");
                      setPrintOpen(true);
                    }}
                  >
                    <Printer /> Re-print PDF
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setPrintMode("thermal");
                      setPrintOpen(true);
                    }}
                  >
                    <Receipt /> Re-print thermal
                  </Button>
                  <Button variant="secondary" onClick={startEdit}>
                    <Pencil /> Edit bill
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" className="text-destructive hover:text-destructive">
                        <Trash2 /> Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Void this bill?</AlertDialogTitle>
                        <AlertDialogDescription>
                          {view.invoiceNo} will be permanently removed from your sales history.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => removeBill(view.id)}>
                          Delete bill
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {billData && (
        <BillDialog
          open={printOpen}
          onOpenChange={setPrintOpen}
          bill={billData}
          mode={printMode}
          onModeChange={setPrintMode}
          template={printMode === "a4" ? (firm?.a4Template ?? 1) : (firm?.thermalTemplate ?? 1)}
          title={`Re-print ${billData.invoiceNo}`}
        />
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="truncate font-medium">{value}</span>
    </div>
  );
}

function FieldBox({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
