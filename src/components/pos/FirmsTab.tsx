import { useState } from "react";
import { Building2, Check, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  A4_TEMPLATES,
  BillPreview,
  THERMAL_TEMPLATES,
  type BillData,
} from "./BillPreview";
import type { Firm, PosData } from "@/lib/pos-store";

type Props = {
  firms: Firm[];
  activeFirmId: string;
  update: (fn: (d: PosData) => PosData) => void;
  uid: () => string;
};

const blank = {
  name: "",
  address: "",
  phone: "",
  gstin: "",
  invoicePrefix: "INV-",
  nextInvoiceNo: "1",
  footer: "Thank you, visit again!",
};

const SAMPLE_LINES = [
  { itemId: "s1", name: "Sugar", price: 46, unit: "kg", qty: 2 },
  { itemId: "s2", name: "Sunflower Oil", price: 148, unit: "ltr", qty: 1 },
  { itemId: "s3", name: "Tea Powder", price: 265, unit: "kg", qty: 1 },
];

export function FirmsTab({ firms, activeFirmId, update, uid }: Props) {
  const [form, setForm] = useState({ ...blank });
  const [logo, setLogo] = useState<string>("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [a4Template, setA4Template] = useState(1);
  const [thermalTemplate, setThermalTemplate] = useState(1);
  const [previewMode, setPreviewMode] = useState<"a4" | "thermal">("thermal");

  const set = (k: keyof typeof blank, v: string) => setForm((f) => ({ ...f, [k]: v }));

  function pickLogo(file: File | undefined) {
    if (!file) return;
    if (file.size > 400_000) return toast.error("Please choose a logo under 400 KB.");
    const reader = new FileReader();
    reader.onload = () => setLogo(String(reader.result));
    reader.readAsDataURL(file);
  }


  const sampleBill: BillData = {
    firm: {
      id: "sample",
      name: form.name || "Your Business",
      address: form.address,
      phone: form.phone,
      gstin: form.gstin,
      invoicePrefix: form.invoicePrefix,
      nextInvoiceNo: Number(form.nextInvoiceNo) || 1,
      footer: form.footer,
      logo,
      a4Template,
      thermalTemplate,
    },
    invoiceNo: `${form.invoicePrefix}${String(Number(form.nextInvoiceNo) || 1).padStart(4, "0")}`,
    date: new Date().toISOString().slice(0, 10),
    time: new Date().toTimeString().slice(0, 5),
    lines: SAMPLE_LINES,
    discount: 20,
    payment: "Cash",
    customer: "",

  };


  function save() {
    if (!form.name.trim()) return toast.error("Enter the business name.");
    const payload = {
      name: form.name.trim(),
      address: form.address.trim(),
      phone: form.phone.trim(),
      gstin: form.gstin.trim(),
      invoicePrefix: form.invoicePrefix,
      nextInvoiceNo: Number(form.nextInvoiceNo) || 1,
      footer: form.footer,
      a4Template,
      thermalTemplate,
    };
    if (editingId) {
      update((d) => ({
        ...d,
        firms: d.firms.map((f) => (f.id === editingId ? { ...f, ...payload } : f)),
      }));
      toast.success("Business updated");
    } else {
      const id = uid();
      update((d) => ({ ...d, firms: [...d.firms, { id, ...payload }], activeFirmId: id }));
      toast.success("Business added");
    }
    setForm({ ...blank });
    setA4Template(1);
    setThermalTemplate(1);
    setEditingId(null);
  }

  return (
    <div className="space-y-4 pb-24">
      <Card className="gap-3 p-4">
        <h2 className="font-semibold">{editingId ? "Edit business profile" : "Add business profile"}</h2>
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Business name</Label>
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Sri Paints & Hardware" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Phone</Label>
            <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} />
          </div>
          <div className="space-y-1.5 lg:col-span-2">
            <Label className="text-xs text-muted-foreground">Address</Label>
            <Textarea rows={2} value={form.address} onChange={(e) => set("address", e.target.value)} />
          </div>
          <div className="grid grid-cols-3 gap-3 lg:col-span-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Invoice prefix</Label>
              <Input value={form.invoicePrefix} onChange={(e) => set("invoicePrefix", e.target.value)} className="font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Next serial no.</Label>
              <Input
                type="number"
                value={form.nextInvoiceNo}
                onChange={(e) => set("nextInvoiceNo", e.target.value)}
                className="font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">GSTIN (optional)</Label>
              <Input value={form.gstin} onChange={(e) => set("gstin", e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5 lg:col-span-2">
            <Label className="text-xs text-muted-foreground">Bill footer message</Label>
            <Input value={form.footer} onChange={(e) => set("footer", e.target.value)} />
          </div>
        </div>

        <div className="space-y-3 rounded-xl border border-border p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold">Bill templates</p>
            <div className="flex gap-1 rounded-lg bg-secondary p-1">
              {(["thermal", "a4"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setPreviewMode(m)}
                  className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                    previewMode === m ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
                  }`}
                >
                  {m === "a4" ? "A4 / PDF" : "80mm receipt"}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {(previewMode === "a4" ? A4_TEMPLATES : THERMAL_TEMPLATES).map((t) => {
              const active = (previewMode === "a4" ? a4Template : thermalTemplate) === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() =>
                    previewMode === "a4" ? setA4Template(t.id) : setThermalTemplate(t.id)
                  }
                  className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-muted-foreground hover:border-primary"
                  }`}
                >
                  {t.id}. {t.name}
                </button>
              );
            })}
          </div>

          <div className="max-h-[420px] overflow-auto rounded-lg border border-border bg-white p-2">
            <div className={previewMode === "a4" ? "origin-top scale-[0.62]" : ""}>
              <BillPreview
                bill={sampleBill}
                mode={previewMode}
                template={previewMode === "a4" ? a4Template : thermalTemplate}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            The selected templates are saved with this business profile and used for its bills.
          </p>
        </div>

        <div className="flex gap-2">
          <Button onClick={save}>
            <Plus /> {editingId ? "Update business" : "Add business"}
          </Button>
          {editingId && (
            <Button
              variant="ghost"
              onClick={() => {
                setEditingId(null);
                setForm({ ...blank });
              }}
            >
              Cancel
            </Button>
          )}
        </div>
      </Card>

      <div className="grid gap-3 lg:grid-cols-2">
        {firms.map((f) => (
          <Card key={f.id} className="gap-2 p-4">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-2">
                  <Building2 className="h-4 w-4 shrink-0 text-primary" />
                  <p className="truncate font-semibold">{f.name}</p>
                  {f.id === activeFirmId && (
                    <span className="shrink-0 rounded-full bg-accent px-2 py-0.5 text-[10px] font-medium text-accent-foreground">
                      ACTIVE
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{f.address}</p>
                <p className="font-mono text-xs text-muted-foreground">
                  Next: {f.invoicePrefix}
                  {String(f.nextInvoiceNo).padStart(4, "0")}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => update((d) => ({ ...d, activeFirmId: f.id }))}
                  aria-label="Set active"
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    setEditingId(f.id);
                    setForm({
                      name: f.name,
                      address: f.address,
                      phone: f.phone,
                      gstin: f.gstin ?? "",
                      invoicePrefix: f.invoicePrefix,
                      nextInvoiceNo: String(f.nextInvoiceNo),
                      footer: f.footer,
                    });
                    setA4Template(f.a4Template ?? 1);
                    setThermalTemplate(f.thermalTemplate ?? 1);
                  }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    if (firms.length === 1) return toast.error("Keep at least one business.");
                    update((d) => {
                      const rest = d.firms.filter((x) => x.id !== f.id);
                      return {
                        ...d,
                        firms: rest,
                        items: d.items.filter((i) => i.firmId !== f.id),
                        activeFirmId: d.activeFirmId === f.id ? rest[0].id : d.activeFirmId,
                      };
                    });
                    toast.success("Business removed");
                  }}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
