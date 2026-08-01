import { useCallback, useEffect, useState } from "react";

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

function read(): PosData {
  if (typeof window === "undefined") return { firms: [], items: [], bills: [], activeFirmId: "" };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) {
      const s = seed();
      window.localStorage.setItem(KEY, JSON.stringify(s));
      return s;
    }
    return JSON.parse(raw) as PosData;
  } catch {
    return seed();
  }
}

let memory: PosData | null = null;
const listeners = new Set<(d: PosData) => void>();

function write(next: PosData) {
  memory = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l(next));
}

export function usePosData() {
  const [data, setData] = useState<PosData>({
    firms: [],
    items: [],
    bills: [],
    activeFirmId: "",
  });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!memory) memory = read();
    setData(memory);
    setReady(true);
    const l = (d: PosData) => setData({ ...d });
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);

  const update = useCallback((fn: (d: PosData) => PosData) => {
    const base = memory ?? read();
    write(fn(base));
  }, []);

  return { data, ready, update, uid };
}
