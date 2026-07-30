import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { money } from "./BillPreview";
import type { Item, PosData } from "@/lib/pos-store";

type Props = {
  firmId: string;
  items: Item[];
  update: (fn: (d: PosData) => PosData) => void;
  uid: () => string;
};

export function ItemsTab({ firmId, items, update, uid }: Props) {
  const [editing, setEditing] = useState<Item | null>(null);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [unit, setUnit] = useState("pcs");
  const [q, setQ] = useState("");

  function reset() {
    setEditing(null);
    setName("");
    setPrice("");
    setUnit("pcs");
  }

  function save() {
    if (!name.trim() || !price) return toast.error("Enter item name and price.");
    if (editing) {
      update((d) => ({
        ...d,
        items: d.items.map((i) =>
          i.id === editing.id ? { ...i, name: name.trim(), price: Number(price), unit } : i,
        ),
      }));
      toast.success("Item updated");
    } else {
      update((d) => ({
        ...d,
        items: [...d.items, { id: uid(), firmId, name: name.trim(), price: Number(price), unit }],
      }));
      toast.success("Item added");
    }
    reset();
  }

  const filtered = items.filter((i) => i.name.toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <div className="space-y-4 pb-24">
      <Card className="gap-3 p-4">
        <h2 className="font-semibold">{editing ? "Edit item" : "Add new item"}</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="col-span-2 space-y-1.5">
            <Label className="text-xs text-muted-foreground">Item name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Wall Putty 20kg" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Price</Label>
            <Input
              type="number"
              inputMode="decimal"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="font-mono"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Unit</Label>
            <Input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="pcs / kg / ltr" />
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={save}>
            <Plus /> {editing ? "Update item" : "Add item"}
          </Button>
          {editing && (
            <Button variant="ghost" onClick={reset}>
              Cancel
            </Button>
          )}
        </div>
      </Card>

      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search items..." />

      <Card className="gap-0 overflow-hidden p-0">
        {filtered.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">No items yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((i) => (
              <li key={i.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 p-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{i.name}</p>
                  <p className="font-mono text-xs text-muted-foreground">
                    ₹{money(i.price)} / {i.unit}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      setEditing(i);
                      setName(i.name);
                      setPrice(String(i.price));
                      setUnit(i.unit);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      update((d) => ({ ...d, items: d.items.filter((x) => x.id !== i.id) }));
                      toast.success("Item deleted");
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
