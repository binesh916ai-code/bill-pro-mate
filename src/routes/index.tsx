import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Boxes, Building2, History, Moon, Receipt, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
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
import { PrinterBadge } from "@/components/pos/PrinterBadge";
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
          "Fast multi-store retail POS and billing app: manage firms and items, edit invoice number, date and time, then print A4 PDF or 80mm Bluetooth thermal receipts.",
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
  const { theme, toggle } = useTheme();

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
      <div className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-72 bg-[radial-gradient(70%_60%_at_50%_0%,color-mix(in_oklab,var(--primary)_18%,transparent),transparent)]" />

      <header className="sticky top-0 z-20 border-b border-border/70 bg-card/80 backdrop-blur-xl print:hidden">
        <div className="mx-auto grid max-w-5xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-ink text-primary-foreground shadow-lg shadow-primary/20 ring-1 ring-white/10">
              <Receipt className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-sm font-extrabold tracking-tight">CounterBook POS</h1>
              <p className="truncate text-[11px] text-muted-foreground">
                {firm?.name ?? "No store selected"}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {ready && data.firms.length > 0 && (
              <Select
                value={firm?.id}
                onValueChange={(v) => update((d) => ({ ...d, activeFirmId: v }))}
              >
                <SelectTrigger className="w-[132px] shrink-0 rounded-xl sm:w-[220px]">
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
            <Button
              variant="outline"
              size="icon"
              onClick={toggle}
              className="shrink-0 rounded-xl"
              aria-label="Toggle dark mode"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        <div className="mx-auto flex max-w-5xl px-4 pb-1">
          <PrinterBadge />
        </div>

        <nav className="mx-auto mt-1 flex max-w-5xl gap-1 overflow-x-auto px-3 pb-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold whitespace-nowrap transition-all ${
                tab === t.id
                  ? "bg-ink text-primary-foreground shadow-md shadow-primary/15"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
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
          <HistoryTab bills={data.bills} firms={data.firms} update={update} />
        )}
      </main>
    </div>
  );
}
