import { Receipt } from "lucide-react";

import { Card } from "@/components/ui/card";
import { money } from "./BillPreview";
import type { SavedBill } from "@/lib/pos-store";

export function HistoryTab({ bills }: { bills: SavedBill[] }) {
  if (bills.length === 0) {
    return (
      <Card className="items-center gap-2 p-10 text-center">
        <Receipt className="h-6 w-6 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Saved bills will appear here.</p>
      </Card>
    );
  }
  const todayTotal = bills
    .filter((b) => b.date === new Date().toISOString().slice(0, 10))
    .reduce((s, b) => s + b.total, 0);

  return (
    <div className="space-y-4 pb-24">
      <Card className="gap-1 p-4">
        <p className="text-xs text-muted-foreground">Today&apos;s sales</p>
        <p className="font-mono text-2xl font-bold">₹ {money(todayTotal)}</p>
      </Card>
      <Card className="gap-0 overflow-hidden p-0">
        <ul className="divide-y divide-border">
          {bills.map((b) => (
            <li key={b.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 p-3">
              <div className="min-w-0">
                <p className="truncate font-mono font-medium">{b.invoiceNo}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {b.firmName} · {b.date} {b.time} · {b.payment} · {b.lines.length} items
                </p>
              </div>
              <span className="shrink-0 font-mono font-semibold">₹{money(b.total)}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
