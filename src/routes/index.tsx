import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Bluetooth, Boxes, Receipt, ShieldCheck, Store } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CounterBook — Multi-Store POS & Billing App" },
      {
        name: "description",
        content:
          "Lightweight multi-store retail POS: manage stores and items, edit invoice number, date and time, then print A4 PDF or 58mm/80mm Bluetooth thermal receipts.",
      },
      { property: "og:title", content: "CounterBook — Multi-Store POS & Billing App" },
      {
        property: "og:description",
        content:
          "Lightweight multi-store retail POS with A4 PDF invoices and 58mm/80mm Bluetooth thermal receipt printing.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  { icon: Store, title: "Multi-store profiles", text: "Separate logo, header, footer and templates per shop." },
  { icon: Boxes, title: "Fast counter billing", text: "Quick item search, editable invoice no., date and time." },
  { icon: Bluetooth, title: "Thermal + PDF", text: "58mm/80mm Bluetooth ESC/POS receipts and A4 PDF invoices." },
  { icon: ShieldCheck, title: "Locked & synced", text: "Google sign-in, PIN and fingerprint app lock." },
];

function Landing() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) void navigate({ to: "/app", replace: true });
      else setChecking(false);
    });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background">
      <div className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-80 bg-[radial-gradient(70%_60%_at_50%_0%,color-mix(in_oklab,var(--primary)_18%,transparent),transparent)]" />
      <main className="mx-auto max-w-3xl px-5 py-16">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-ink text-primary-foreground shadow-lg shadow-primary/20">
            <Receipt className="h-5 w-5" />
          </div>
          <span className="text-sm font-extrabold tracking-tight">CounterBook POS</span>
        </div>

        <h1 className="mt-8 text-3xl font-extrabold tracking-tight sm:text-4xl">
          Premium billing for every counter you run
        </h1>
        <p className="mt-3 max-w-xl text-sm text-muted-foreground sm:text-base">
          A lightweight multi-store retail POS that prints crisp A4 invoices and perfectly aligned
          58mm or 80mm Bluetooth thermal receipts — with your logo, your footer, your templates.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild size="lg" disabled={checking}>
            <Link to="/auth">Sign in to start billing</Link>
          </Button>
        </div>

        <div className="mt-10 grid gap-3 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <Card key={f.title} className="gap-1.5 p-4">
              <f.icon className="h-4.5 w-4.5 text-primary" />
              <p className="text-sm font-semibold">{f.title}</p>
              <p className="text-xs text-muted-foreground">{f.text}</p>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
