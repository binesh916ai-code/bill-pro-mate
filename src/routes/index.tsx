import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Boxes, Building2, History, Receipt } from "lucide-react";

import { Toaster } from "@/components/ui/sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BillingTab } from "@/components/pos/BillingTab";
import { ItemsTab } from "@/components/pos/ItemsTab";
import { FirmsTab } from "@/components/pos/FirmsTab";
import { HistoryTab } from "@/components/pos/HistoryTab";
import { usePosData } from "@/lib/pos-store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CounterBook — Multi-Store POS & Billing" },
      {
        name: "description",
        content:
          "Fast multi-store retail POS and billing app: manage firms and items, edit invoice number, date and time, then print A4 PDF or 80mm Bluetooth thermal receipts.",
      },
      { property: "og:title", content: "CounterBook — Multi-Store POS & Billing" },
      {
        property: "og:description",
        content:
          "Lightweight billing counter app with multi-firm profiles, quick item search, cash/UPI bills and Bluetooth thermal printing.",
      },
    ],
  }),
  component: PosApp,
});

const TABS = [
  { id: "billing", label: "Billing", icon: Receipt },
  { id: "items", label: "Items", icon: Boxes },
  { id: "firms", label: "Stores", icon: Building2 },
  { id: "history", label: "History", icon: History },
] as const;

type TabId = (typeof TABS)[number]["id"];

function PosApp() {
  const { data, ready, update, uid } = usePosData();
  const [tab, setTab] = useState<TabId>("billing");

  const firm = useMemo(
    () => data.firms.find((f) => f.id === data.activeFirmId) ?? data.firms[0] ?? null,
    [data.firms, data.activeFirmId],
  );
  const items = useMemo(
    () => data.items.filter((i) => i.firmId === firm?.id),
    [data.items, firm?.id],
  );

  return (
    <div className="min-h-screen bg-background">
      <Toaster position="top-center" />

      <header className="sticky top-0 z-20 border-b border-border bg-card/95 backdrop-blur print:hidden">
        <div className="mx-auto grid max-w-5xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-ink text-primary-foreground">
              <Receipt className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-sm font-bold tracking-tight">CounterBook POS</h1>
              <p className="truncate text-[11px] text-muted-foreground">
                {firm?.name ?? "No store selected"}
              </p>
            </div>
          </div>
          {ready && data.firms.length > 0 && (
            <Select
              value={firm?.id}
              onValueChange={(v) => update((d) => ({ ...d, activeFirmId: v }))}
            >
              <SelectTrigger className="w-[150px] shrink-0 sm:w-[220px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {data.firms.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <nav className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-3 pb-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
                tab === t.id
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <t.icon className="h-4 w-4" /> {t.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-4">
        {!ready ? (
          <p className="py-20 text-center text-sm text-muted-foreground">Loading…</p>
        ) : tab === "billing" ? (
          <BillingTab firm={firm} items={items} update={update} uid={uid} />
        ) : tab === "items" ? (
          <ItemsTab firmId={firm?.id ?? ""} items={items} update={update} uid={uid} />
        ) : tab === "firms" ? (
          <FirmsTab firms={data.firms} activeFirmId={firm?.id ?? ""} update={update} uid={uid} />
        ) : (
          <HistoryTab bills={data.bills} />
        )}
      </main>
    </div>
  );
}
