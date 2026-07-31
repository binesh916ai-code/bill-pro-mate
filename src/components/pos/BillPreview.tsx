import type { CartLine, Firm } from "@/lib/pos-store";

export type BillData = {
  firm: Firm | null;
  invoiceNo: string;
  date: string;
  time: string;
  lines: CartLine[];
  discount: number;
  payment: "Cash" | "UPI";
  customer: string;
};

export const money = (n: number) =>
  n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function billTotals(lines: CartLine[], discount: number) {
  const subtotal = lines.reduce((s, l) => s + l.price * l.qty, 0);
  const total = Math.max(0, subtotal - (discount || 0));
  return { subtotal, total };
}

export const THERMAL_TEMPLATES = [
  { id: 1, name: "Modern" },
  { id: 2, name: "Minimal" },
  { id: 3, name: "Compact" },
  { id: 4, name: "Classic" },
  { id: 5, name: "Bordered" },
] as const;

export const A4_TEMPLATES = [
  { id: 1, name: "Modern" },
  { id: 2, name: "Minimal" },
  { id: 3, name: "Compact" },
  { id: 4, name: "Classic" },
  { id: 5, name: "Bordered" },
] as const;

const clamp = (n: number | undefined) => Math.min(5, Math.max(1, Number(n) || 1));

export function BillPreview({
  bill,
  mode,
  template = 1,
}: {
  bill: BillData;
  mode: "a4" | "thermal";
  template?: number;
}) {
  const t = clamp(template);
  return mode === "thermal" ? (
    <div className="mx-auto w-[302px] bg-white p-3 font-mono text-[11px] leading-tight text-black">
      <Thermal bill={bill} t={t} />
    </div>
  ) : (
    <div className="mx-auto w-full max-w-[820px] bg-white p-8 text-[13px] text-black">
      <A4 bill={bill} t={t} />
    </div>
  );
}

/* ------------------------------- THERMAL ------------------------------- */

function Thermal({ bill, t }: { bill: BillData; t: number }) {
  const { firm, lines, discount } = bill;
  const { subtotal, total } = billTotals(lines, discount);

  const rule =
    t === 4 ? "border-t border-dashed border-black" : t === 2 ? "border-t border-black/30" : "border-t border-black";

  const Head = (
    <div className="text-center">
      <div
        className={
          t === 1
            ? "bg-black px-2 py-1 text-[15px] font-bold tracking-wide text-white uppercase"
            : t === 4
              ? "text-[15px] font-bold tracking-[0.2em] uppercase"
              : t === 2
                ? "text-[14px] font-semibold"
                : "text-[14px] font-bold uppercase"
        }
      >
        {firm?.name || "Your Business"}
      </div>
      {t !== 3 && firm?.address ? (
        <div className="mt-1 whitespace-pre-line">{firm.address}</div>
      ) : null}
      {firm?.phone ? <div>Ph: {firm.phone}</div> : null}
      {firm?.gstin ? <div>GSTIN: {firm.gstin}</div> : null}
      {t === 4 ? <div className="mt-1 tracking-widest">* TAX INVOICE *</div> : null}
    </div>
  );

  const Meta = (
    <div className={`mt-2 ${rule} ${t === 2 ? "" : "border-b " + rule.replace("border-t", "")} py-1`}>
      <div className="flex justify-between">
        <span>No: {bill.invoiceNo}</span>
        <span>{bill.date}</span>
      </div>
      <div className="flex justify-between">
        <span>{bill.customer ? `Cust: ${bill.customer}` : "Walk-in"}</span>
        <span>{bill.time}</span>
      </div>
    </div>
  );

  const Items =
    t === 3 ? (
      <div className="mt-1">
        {lines.map((l) => (
          <div key={l.itemId} className="flex justify-between">
            <span className="truncate pr-2">
              {l.qty}x {l.name}
            </span>
            <span>{money(l.price * l.qty)}</span>
          </div>
        ))}
      </div>
    ) : t === 4 ? (
      <div className="mt-1">
        {lines.map((l) => (
          <div key={l.itemId} className="mt-1">
            <div className="uppercase">{l.name}</div>
            <div className="flex justify-between">
              <span>
                {"  "}
                {l.qty} {l.unit} x {money(l.price)}
              </span>
              <span>{money(l.price * l.qty)}</span>
            </div>
          </div>
        ))}
      </div>
    ) : (
      <div className="mt-2">
        <div
          className={`flex pb-1 font-bold ${t === 2 ? "border-b border-black/30" : "border-b border-dashed border-black"}`}
        >
          <span className="flex-1">ITEM</span>
          <span className="w-8 text-right">QTY</span>
          <span className="w-14 text-right">RATE</span>
          <span className="w-16 text-right">AMT</span>
        </div>
        {lines.map((l) => (
          <div
            key={l.itemId}
            className={`flex py-[2px] ${t === 2 ? "" : "border-b border-dotted border-black/40"}`}
          >
            <span className="flex-1 pr-1">{l.name}</span>
            <span className="w-8 text-right">{l.qty}</span>
            <span className="w-14 text-right">{money(l.price)}</span>
            <span className="w-16 text-right">{money(l.price * l.qty)}</span>
          </div>
        ))}
      </div>
    );

  const Totals = (
    <div className={`mt-2 space-y-[2px] ${rule} pt-1`}>
      <div className="flex justify-between">
        <span>Subtotal</span>
        <span>{money(subtotal)}</span>
      </div>
      {discount > 0 && (
        <div className="flex justify-between">
          <span>Discount</span>
          <span>-{money(discount)}</span>
        </div>
      )}
      <div
        className={
          t === 1
            ? "mt-1 flex justify-between bg-black px-1 py-1 text-[13px] font-bold text-white"
            : t === 2
              ? "flex justify-between text-[13px] font-semibold"
              : "flex justify-between border-y border-black py-1 text-[13px] font-bold"
        }
      >
        <span>TOTAL</span>
        <span>Rs. {money(total)}</span>
      </div>
      <div className="flex justify-between">
        <span>Paid by</span>
        <span>{bill.payment}</span>
      </div>
      <div className="flex justify-between">
        <span>Items</span>
        <span>{lines.reduce((s, l) => s + l.qty, 0)}</span>
      </div>
    </div>
  );

  const Foot = (
    <div className="mt-3 text-center">
      <div className={t === 4 ? "tracking-widest uppercase" : ""}>{firm?.footer}</div>
      {t === 1 || t === 5 ? <div className="mt-1 text-[10px]">Powered by CounterBook POS</div> : null}
    </div>
  );

  const body = (
    <>
      {Head}
      {Meta}
      {Items}
      {Totals}
      {Foot}
    </>
  );

  if (t === 5) return <div className="border-2 border-black p-2">{body}</div>;
  return body;
}

/* --------------------------------- A4 --------------------------------- */

function A4({ bill, t }: { bill: BillData; t: number }) {
  const { firm, lines, discount } = bill;
  const { subtotal, total } = billTotals(lines, discount);
  const serif = t === 4 ? "font-serif" : "";

  const Head =
    t === 1 ? (
      <div className="flex items-start justify-between bg-black px-6 py-5 text-white">
        <div>
          <div className="text-2xl font-bold tracking-tight">{firm?.name || "Your Business"}</div>
          <div className="mt-1 max-w-sm text-xs whitespace-pre-line opacity-80">{firm?.address}</div>
        </div>
        <div className="text-right text-xs">
          <div className="text-lg font-semibold tracking-[0.3em] uppercase">Invoice</div>
          {firm?.phone ? <div className="mt-1">Ph: {firm.phone}</div> : null}
          {firm?.gstin ? <div>GSTIN: {firm.gstin}</div> : null}
        </div>
      </div>
    ) : t === 2 ? (
      <div>
        <div className="text-xs tracking-[0.35em] text-black/50 uppercase">Invoice</div>
        <div className="mt-2 text-3xl font-light">{firm?.name || "Your Business"}</div>
        <div className="mt-1 text-xs whitespace-pre-line text-black/60">{firm?.address}</div>
      </div>
    ) : t === 3 ? (
      <div className="flex items-end justify-between border-b border-black pb-2">
        <div>
          <div className="text-lg font-bold uppercase">{firm?.name || "Your Business"}</div>
          <div className="text-[11px] whitespace-pre-line">{firm?.address}</div>
        </div>
        <div className="text-right text-[11px]">
          {firm?.phone ? <div>Ph: {firm.phone}</div> : null}
          {firm?.gstin ? <div>GSTIN: {firm.gstin}</div> : null}
        </div>
      </div>
    ) : t === 4 ? (
      <div className="border-b-4 border-double border-black pb-4 text-center">
        <div className="text-3xl font-bold tracking-wide">{firm?.name || "Your Business"}</div>
        <div className="mt-1 text-xs whitespace-pre-line">{firm?.address}</div>
        <div className="text-xs">
          {firm?.phone ? `Ph: ${firm.phone}` : ""} {firm?.gstin ? ` | GSTIN: ${firm.gstin}` : ""}
        </div>
        <div className="mt-3 inline-block border border-black px-6 py-1 text-sm tracking-[0.3em] uppercase">
          Tax Invoice
        </div>
      </div>
    ) : (
      <div className="border-2 border-black">
        <div className="border-b-2 border-black px-4 py-2 text-center text-sm tracking-[0.3em] uppercase">
          Tax Invoice
        </div>
        <div className="grid grid-cols-2">
          <div className="border-r-2 border-black p-4">
            <div className="text-lg font-bold">{firm?.name || "Your Business"}</div>
            <div className="text-xs whitespace-pre-line">{firm?.address}</div>
          </div>
          <div className="p-4 text-xs">
            {firm?.phone ? <div>Phone: {firm.phone}</div> : null}
            {firm?.gstin ? <div>GSTIN: {firm.gstin}</div> : null}
          </div>
        </div>
      </div>
    );

  const Meta = (
    <div
      className={
        t === 5
          ? "grid grid-cols-2 border-x-2 border-b-2 border-black text-xs"
          : t === 2
            ? "mt-8 grid grid-cols-2 gap-6 text-xs"
            : "mt-5 grid grid-cols-2 gap-6 text-xs"
      }
    >
      <div className={t === 5 ? "border-r-2 border-black p-3" : ""}>
        <div>
          <span className="text-black/50">Invoice No:</span>{" "}
          <span className="font-semibold">{bill.invoiceNo}</span>
        </div>
        <div>
          <span className="text-black/50">Customer:</span> {bill.customer || "Walk-in"}
        </div>
      </div>
      <div className={t === 5 ? "p-3 text-right" : "text-right"}>
        <div>
          <span className="text-black/50">Date:</span> {bill.date}
        </div>
        <div>
          <span className="text-black/50">Time:</span> {bill.time}
        </div>
      </div>
    </div>
  );

  const headCls =
    t === 1
      ? "bg-black text-white text-left"
      : t === 5
        ? "border-2 border-black bg-black/5 text-left"
        : t === 2
          ? "border-b border-black/30 text-left text-black/50 uppercase text-[11px] tracking-wider"
          : "border-y border-black text-left";
  const cellPad = t === 3 ? "py-1" : "py-2";
  const bodyRow =
    t === 5 ? "border-2 border-black" : t === 2 ? "border-b border-black/10" : "border-b border-black/20";

  const Table = (
    <table className={`${t === 2 ? "mt-6" : "mt-5"} w-full border-collapse`}>
      <thead>
        <tr className={headCls}>
          <th className={`w-10 px-2 ${cellPad}`}>#</th>
          <th className={`px-2 ${cellPad}`}>Item</th>
          <th className={`px-2 text-right ${cellPad}`}>Rate</th>
          <th className={`px-2 text-right ${cellPad}`}>Qty</th>
          <th className={`px-2 text-right ${cellPad}`}>Amount</th>
        </tr>
      </thead>
      <tbody>
        {lines.map((l, i) => (
          <tr key={l.itemId} className={bodyRow}>
            <td className={`px-2 ${cellPad}`}>{i + 1}</td>
            <td className={`px-2 ${cellPad}`}>{l.name}</td>
            <td className={`px-2 text-right ${cellPad}`}>{money(l.price)}</td>
            <td className={`px-2 text-right ${cellPad}`}>
              {l.qty} {l.unit}
            </td>
            <td className={`px-2 text-right ${cellPad}`}>{money(l.price * l.qty)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const Totals = (
    <div className={`mt-4 ml-auto w-72 space-y-1 ${t === 5 ? "border-2 border-black p-3" : ""}`}>
      <div className="flex justify-between">
        <span className="text-black/60">Subtotal</span>
        <span>{money(subtotal)}</span>
      </div>
      {discount > 0 && (
        <div className="flex justify-between">
          <span className="text-black/60">Discount</span>
          <span>-{money(discount)}</span>
        </div>
      )}
      <div
        className={
          t === 1
            ? "mt-2 flex justify-between bg-black px-3 py-2 text-lg font-bold text-white"
            : t === 2
              ? "mt-2 flex justify-between border-t border-black/30 pt-2 text-lg font-medium"
              : "mt-2 flex justify-between border-t-2 border-black pt-2 text-lg font-bold"
        }
      >
        <span>TOTAL</span>
        <span>Rs. {money(total)}</span>
      </div>
      <div className="flex justify-between text-xs">
        <span className="text-black/60">Paid by</span>
        <span>{bill.payment}</span>
      </div>
    </div>
  );

  const Foot = (
    <div className="mt-10">
      <div className={t === 2 ? "text-xs text-black/60" : "text-center text-base font-semibold"}>
        {firm?.footer}
      </div>
      <div className="mt-10 ml-auto w-56 border-t border-black pt-1 text-right text-xs">
        Authorised Signatory
      </div>
    </div>
  );

  return (
    <div className={serif}>
      {Head}
      {Meta}
      {Table}
      {Totals}
      {Foot}
    </div>
  );
}
