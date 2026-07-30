import { useState } from "react";
import { Building2, Check, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

export function FirmsTab({ firms, activeFirmId, update, uid }: Props) {
  const [form, setForm] = useState({ ...blank });
  const [editingId, setEditingId] = useState<string | null>(null);

  const set = (k: keyof typeof blank, v: string) => setForm((f) => ({ ...f, [k]: v }));

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
