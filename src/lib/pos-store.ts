import { useCallback, useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";

export type PaperSize = 58 | 80;

export type Firm = {
  id: string;
  name: string;
  address: string;
  phone: string;
  gstin?: string;
  invoicePrefix: string;
  nextInvoiceNo: number;
  footer: string;
  /** Data-URL of the uploaded store logo */
  logo?: string;
  /** 1-5 layout preset for A4 invoices */
  a4Template?: number;
  /** 1-10 layout preset for 80mm receipts */
  thermalTemplate?: number;
  /** Thermal roll width: 58mm (32 cols) or 80mm (48 cols) */
  paperSize?: PaperSize;
};

export type Item = {
  id: string;
  firmId: string;
  name: string;
  price: number;
  unit: string;
};

export type CartLine = {
  itemId: string;
  name: string;
  price: number;
  unit: string;
  qty: number;
};

export type SavedBill = {
  id: string;
  firmId: string;
  firmName: string;
  invoiceNo: string;
  date: string;
  time: string;
  lines: CartLine[];
  total: number;
  discount: number;
  payment: "Cash" | "UPI";
  customer?: string;
  createdAt: number;
};

const KEY = "pos-data-v1";

export type PosData = {
  firms: Firm[];
  items: Item[];
  bills: SavedBill[];
  activeFirmId: string;
};

const uid = () => Math.random().toString(36).slice(2, 10);

/** Columns available for the given roll width. */
export const paperColumns = (size: PaperSize | undefined) => (Number(size) === 58 ? 32 : 48);

function seed(): PosData {
  const firm: Firm = {
    id: uid(),
    name: "Sri Balaji Grocery Store",
    address: "12, Market Road, Ground Floor, Chennai - 600001",
    phone: "+91 98765 43210",
    invoicePrefix: "INV-",
    nextInvoiceNo: 1,
    footer: "Thank you, visit again!",
    a4Template: 1,
    thermalTemplate: 1,
    paperSize: 80,
  };

  const items: Item[] = [
    { name: "Sugar", price: 46, unit: "kg" },
    { name: "Toor Dal", price: 132, unit: "kg" },
    { name: "Sunflower Oil", price: 148, unit: "ltr" },
    { name: "Basmati Rice", price: 96, unit: "kg" },
    { name: "Tea Powder", price: 265, unit: "kg" },
    { name: "Wheat Flour", price: 52, unit: "kg" },
  ].map((i) => ({ ...i, id: uid(), firmId: firm.id }));
  return { firms: [firm], items, bills: [], activeFirmId: firm.id };
}

const empty = (): PosData => ({ firms: [], items: [], bills: [], activeFirmId: "" });

function isPosData(v: unknown): v is PosData {
  return !!v && typeof v === "object" && Array.isArray((v as PosData).firms);
}

function read(): PosData {
  if (typeof window === "undefined") return empty();
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return seed();
    const parsed = JSON.parse(raw) as unknown;
    return isPosData(parsed) ? parsed : seed();
  } catch {
    return seed();
  }
}

let memory: PosData | null = null;
const listeners = new Set<(d: PosData) => void>();

/* ---------------- cloud sync (per signed-in user) ---------------- */

let pushTimer: ReturnType<typeof setTimeout> | null = null;

async function pushToCloud(next: PosData) {
  try {
    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user.id;
    if (!userId) return;
    await supabase
      .from("pos_state")
      .upsert({ user_id: userId, state: next as unknown as never }, { onConflict: "user_id" });
  } catch {
    /* offline — local cache keeps working */
  }
}

function schedulePush(next: PosData) {
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => void pushToCloud(next), 700);
}

async function pullFromCloud(): Promise<PosData | null> {
  try {
    const { data: sess } = await supabase.auth.getSession();
    const userId = sess.session?.user.id;
    if (!userId) return null;
    const { data } = await supabase
      .from("pos_state")
      .select("state")
      .eq("user_id", userId)
      .maybeSingle();
    const state = data?.state as unknown;
    return isPosData(state) && state.firms.length > 0 ? state : null;
  } catch {
    return null;
  }
}

function write(next: PosData) {
  memory = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l(next));
  schedulePush(next);
}

export function usePosData() {
  const [data, setData] = useState<PosData>(empty);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    if (!memory) memory = read();
    setData(memory);
    setReady(true);
    const l = (d: PosData) => setData({ ...d });
    listeners.add(l);

    // Pull the account copy; it wins when the device cache is untouched/older.
    void pullFromCloud().then((cloud) => {
      if (!alive || !cloud) {
        if (alive && memory) schedulePush(memory);
        return;
      }
      memory = cloud;
      try {
        window.localStorage.setItem(KEY, JSON.stringify(cloud));
      } catch {
        /* ignore */
      }
      listeners.forEach((fn) => fn(cloud));
    });

    return () => {
      alive = false;
      listeners.delete(l);
    };
  }, []);

  const update = useCallback((fn: (d: PosData) => PosData) => {
    const base = memory ?? read();
    write(fn(base));
  }, []);

  return { data, ready, update, uid };
}

/** Drop the device cache (used on sign-out so accounts never bleed together). */
export function clearLocalPosCache() {
  memory = null;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
