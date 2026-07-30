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

export function BillPreview({ bill, mode }: { bill: BillData; mode: "a4" | "thermal" }) {
  const { firm, lines, discount } = bill;
  const { subtotal, total } = billTotals(lines, discount);
  const thermal = mode === "thermal";

  return (
    <div
      className={
        thermal
          ? "mx-auto w-[302px] bg-white p-3 font-mono text-[11px] leading-tight text-black"
          : "mx-auto w-full max-w-[820px] bg-white p-8 text-[13px] text-black"
      }
    >
      <div className={thermal ? "text-center" : "border-b-2 border-black pb-4 text-center"}>
        <div className={thermal ? "text-[14px] font-bold uppercase" : "text-2xl font-bold"}>
          {firm?.name || "Your Business"}
        </div>
        <div className="mt-1 whitespace-pre-line">{firm?.address}</div>
        {firm?.phone ? <div>Ph: {firm.phone}</div> : null}
        {firm?.gstin ? <div>GSTIN: {firm.gstin}</div> : null}
      </div>

      <div
        className={
          thermal
            ? "mt-2 border-y border-dashed border-black py-1"
            : "mt-4 flex justify-between gap-6"
        }
      >
        <div>
          <div>Invoice No: {bill.invoiceNo}</div>
          {bill.customer ? <div>Customer: {bill.customer}</div> : null}
        </div>
        <div className={thermal ? "" : "text-right"}>
          <div>Date: {bill.date}</div>
          <div>Time: {bill.time}</div>
        </div>
      </div>

      {thermal ? (
        <div className="mt-2">
          <div className="flex border-b border-dashed border-black pb-1 font-bold">
            <span className="flex-1">ITEM</span>
            <span className="w-10 text-right">QTY</span>
            <span className="w-14 text-right">RATE</span>
            <span className="w-16 text-right">AMT</span>
          </div>
          {lines.map((l) => (
            <div key={l.itemId} className="flex border-b border-dotted border-black/40 py-[2px]">
              <span className="flex-1 pr-1">{l.name}</span>
              <span className="w-10 text-right">{l.qty}</span>
              <span className="w-14 text-right">{money(l.price)}</span>
              <span className="w-16 text-right">{money(l.price * l.qty)}</span>
            </div>
          ))}
        </div>
      ) : (
        <table className="mt-6 w-full border-collapse">
          <thead>
            <tr className="border-y border-black text-left">
              <th className="w-10 py-2">#</th>
              <th className="py-2">Item</th>
              <th className="py-2 text-right">Rate</th>
              <th className="py-2 text-right">Qty</th>
              <th className="py-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l, i) => (
              <tr key={l.itemId} className="border-b border-black/20">
                <td className="py-2">{i + 1}</td>
                <td className="py-2">{l.name}</td>
                <td className="py-2 text-right">{money(l.price)}</td>
                <td className="py-2 text-right">
                  {l.qty} {l.unit}
                </td>
                <td className="py-2 text-right">{money(l.price * l.qty)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className={thermal ? "mt-2 space-y-[2px]" : "mt-4 ml-auto w-64 space-y-1"}>
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
            thermal
              ? "flex justify-between border-y border-black py-1 text-[13px] font-bold"
              : "flex justify-between border-t-2 border-black pt-2 text-lg font-bold"
          }
        >
          <span>TOTAL</span>
          <span>Rs. {money(total)}</span>
        </div>
        <div className="flex justify-between">
          <span>Paid by</span>
          <span>{bill.payment}</span>
        </div>
      </div>

      <div className={thermal ? "mt-3 text-center" : "mt-10 text-center"}>
        <div className={thermal ? "" : "text-base font-semibold"}>{firm?.footer}</div>
        {!thermal && (
          <div className="mt-10 ml-auto w-56 border-t border-black pt-1 text-right text-xs">
            Authorised Signatory
          </div>
        )}
      </div>
    </div>
  );
}
