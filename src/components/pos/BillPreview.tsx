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

type ThermalDef = {
  id: number;
  name: string;
  /** css font-family stack for the whole receipt */
  font: string;
  /** header font stack (store name) */
  headFont: string;
  align: "center" | "left";
};

export const THERMAL_TEMPLATES: ThermalDef[] = [
  { id: 1, name: "Modern Mono", font: '"JetBrains Mono", monospace', headFont: '"JetBrains Mono", monospace', align: "center" },
  { id: 2, name: "Minimal Sans", font: '"Plus Jakarta Sans", sans-serif', headFont: '"Plus Jakarta Sans", sans-serif', align: "left" },
  { id: 3, name: "Compact Condensed", font: '"Oswald", sans-serif', headFont: '"Oswald", sans-serif', align: "center" },
  { id: 4, name: "Classic Serif", font: '"Libre Baskerville", serif', headFont: '"Libre Baskerville", serif', align: "center" },
  { id: 5, name: "Bordered Typewriter", font: '"Courier Prime", monospace', headFont: '"Courier Prime", monospace', align: "center" },
  { id: 6, name: "Bold Poster", font: '"Barlow Condensed", sans-serif', headFont: '"Archivo Black", sans-serif', align: "left" },
  { id: 7, name: "Elegant Garamond", font: '"Cormorant Garamond", serif', headFont: '"Cormorant Garamond", serif', align: "center" },
  { id: 8, name: "Ticket Stub", font: '"Barlow", sans-serif', headFont: '"Bebas Neue", sans-serif', align: "center" },
  { id: 9, name: "Retro Space", font: '"Space Mono", monospace', headFont: '"Space Mono", monospace', align: "left" },
  { id: 10, name: "Grid Grotesk", font: '"Space Grotesk", sans-serif', headFont: '"Space Grotesk", sans-serif', align: "center" },
];

export const A4_TEMPLATES = [
  { id: 1, name: "Modern" },
  { id: 2, name: "Minimal" },
  { id: 3, name: "Compact" },
  { id: 4, name: "Classic" },
  { id: 5, name: "Bordered" },
] as const;

const clampA4 = (n: number | undefined) => Math.min(5, Math.max(1, Number(n) || 1));
const clampThermal = (n: number | undefined) => Math.min(10, Math.max(1, Number(n) || 1));

export function BillPreview({
  bill,
  mode,
  template = 1,
  paper,
}: {
  bill: BillData;
  mode: "a4" | "thermal";
  template?: number;
  /** thermal roll width in mm — 58 or 80 */
  paper?: 58 | 80;
}) {
  if (mode === "thermal") {
    const t = clampThermal(template);
    const def = THERMAL_TEMPLATES[t - 1];
    const narrow = Number(paper ?? bill.firm?.paperSize ?? 80) === 58;
    return (
      <div
        className={`mx-auto bg-white p-3 leading-tight text-black ${
          narrow ? "w-[220px] text-[10px]" : "w-[302px] text-[11px]"
        }`}
        style={{ fontFamily: def.font }}
      >
        <Thermal bill={bill} def={def} />
      </div>
    );
  }
  return (
    <div className="mx-auto w-full max-w-[820px] bg-white p-8 text-[13px] text-black">
      <A4 bill={bill} t={clampA4(template)} />
    </div>
  );
}


function Logo({ src, size = 44 }: { src?: string; size?: number }) {
  if (!src) return null;
  return (
    <img
      src={src}
      alt="Store logo"
      style={{ height: size, width: "auto", maxWidth: "70%", objectFit: "contain" }}
      className="mx-auto mb-1 block"
    />
  );
}

/* ------------------------------- THERMAL ------------------------------- */

function Thermal({ bill, def }: { bill: BillData; def: ThermalDef }) {
  const t = def.id;
  const { firm, lines, discount, customer } = bill;
  const { subtotal, total } = billTotals(lines, discount);
  const qtyTotal = lines.reduce((s, l) => s + l.qty, 0);

  const rule =
    t === 4 || t === 7
      ? "border-t border-dashed border-black"
      : t === 2 || t === 10
        ? "border-t border-black/30"
        : "border-t border-black";

  const nameCls: Record<number, string> = {
    1: "bg-black px-2 py-1 text-[15px] font-bold tracking-wide uppercase text-white",
    2: "text-[15px] font-semibold",
    3: "text-[18px] font-medium tracking-[0.12em] uppercase",
    4: "text-[15px] font-bold tracking-[0.18em] uppercase",
    5: "text-[14px] font-bold uppercase",
    6: "text-[17px] leading-tight uppercase",
    7: "text-[20px] font-semibold tracking-wide",
    8: "text-[24px] leading-none tracking-[0.06em]",
    9: "text-[14px] font-bold uppercase",
    10: "text-[16px] font-bold tracking-tight",
  };

  const Head = (
    <div className={def.align === "left" && t !== 8 ? "text-left" : "text-center"}>
      <Logo src={firm?.logo} size={t === 3 || t === 8 ? 52 : 44} />
      <div style={{ fontFamily: def.headFont }} className={nameCls[t]}>
        {firm?.name || "Your Business"}
      </div>
      {t !== 3 && firm?.address ? (
        <div className="mt-1 whitespace-pre-line">{firm.address}</div>
      ) : null}
      {firm?.phone ? <div>Ph: {firm.phone}</div> : null}
      {firm?.gstin ? <div>GSTIN: {firm.gstin}</div> : null}
      {t === 4 ? <div className="mt-1 tracking-widest">* INVOICE *</div> : null}
      {t === 8 ? (
        <div className="mt-1 text-[10px] tracking-[0.35em] uppercase">cash receipt</div>
      ) : null}
      {t === 6 ? <div className="mt-1 h-[3px] w-full bg-black" /> : null}
    </div>
  );

  /* --- Meta block: varies strongly per template --- */
  let Meta: React.ReactNode;
  if (t === 2) {
    Meta = (
      <div className="mt-3 space-y-[2px] text-[11px]">
        <div>
          <span className="text-black/50">Invoice</span> {bill.invoiceNo}
        </div>
        <div>
          <span className="text-black/50">Date</span> {bill.date} · {bill.time}
        </div>
        {customer ? (
          <div>
            <span className="text-black/50">Customer</span> {customer}
          </div>
        ) : null}
      </div>
    );
  } else if (t === 3) {
    Meta = (
      <div className={`mt-2 flex justify-between border-y border-black py-[2px] text-[10px] uppercase`}>
        <span>{bill.invoiceNo}</span>
        <span>
          {bill.date} {bill.time}
        </span>
      </div>
    );
  } else if (t === 6) {
    Meta = (
      <div className="mt-2 grid grid-cols-2 gap-x-2 text-[10px] uppercase">
        <div>
          <div className="text-black/50">Bill no</div>
          <div className="text-[12px] font-semibold">{bill.invoiceNo}</div>
        </div>
        <div className="text-right">
          <div className="text-black/50">Date / Time</div>
          <div className="text-[12px] font-semibold">
            {bill.date} {bill.time}
          </div>
        </div>
        {customer ? <div className="col-span-2 mt-1">Customer: {customer}</div> : null}
      </div>
    );
  } else if (t === 8) {
    Meta = (
      <div className="mt-2 border-y-2 border-dashed border-black py-1 text-center">
        <div className="text-[16px] tracking-[0.1em]" style={{ fontFamily: def.headFont }}>
          {bill.invoiceNo}
        </div>
        <div className="text-[10px] uppercase">
          {bill.date} — {bill.time}
        </div>
        {customer ? <div className="text-[10px]">{customer}</div> : null}
      </div>
    );
  } else if (t === 9) {
    Meta = (
      <div className="mt-2 space-y-[1px] text-[10px]">
        <div>{"> INVOICE  : " + bill.invoiceNo}</div>
        <div>{"> DATE     : " + bill.date}</div>
        <div>{"> TIME     : " + bill.time}</div>
        {customer ? <div>{"> CUSTOMER : " + customer}</div> : null}
      </div>
    );
  } else if (t === 10) {
    Meta = (
      <div className="mt-3 grid grid-cols-3 border border-black/20 text-center text-[9px] uppercase">
        <div className="border-r border-black/20 p-1">
          <div className="text-black/50">Bill</div>
          <div className="text-[11px] font-semibold normal-case">{bill.invoiceNo}</div>
        </div>
        <div className="border-r border-black/20 p-1">
          <div className="text-black/50">Date</div>
          <div className="text-[11px] font-semibold">{bill.date}</div>
        </div>
        <div className="p-1">
          <div className="text-black/50">Time</div>
          <div className="text-[11px] font-semibold">{bill.time}</div>
        </div>
      </div>
    );
  } else if (t === 7) {
    Meta = (
      <div className="mt-2 border-y border-dashed border-black py-1 text-center text-[11px] italic">
        {bill.invoiceNo} · {bill.date} · {bill.time}
        {customer ? ` · ${customer}` : ""}
      </div>
    );
  } else {
    Meta = (
      <div className={`mt-2 ${rule} border-b border-black py-1`}>
        <div className="flex justify-between">
          <span>No: {bill.invoiceNo}</span>
          <span>{bill.date}</span>
        </div>
        <div className="flex justify-between">
          <span>{customer ? `Cust: ${customer}` : ""}</span>
          <span>{bill.time}</span>
        </div>
      </div>
    );
  }

  /* --- Where does the Items / Total-Qty summary live in this template? --- */
  const place: "column" | "header" | "inline" | "banner" =
    t === 1 || t === 5 || t === 9
      ? "column"
      : t === 3 || t === 6
        ? "header"
        : t === 2 || t === 7
          ? "inline"
          : "banner";

  /* Option B — summary inside the header/meta section */
  const HeaderSummary =
    place !== "header" ? null : t === 3 ? (
      <div className="flex justify-between border-b border-black py-[2px] text-[10px] tracking-[0.12em] uppercase">
        <span>{lines.length} items</span>
        <span>qty {qtyTotal}</span>
      </div>
    ) : (
      <div className="mt-1 grid grid-cols-2 gap-x-2 border-y border-black/40 py-[2px] text-[10px] uppercase">
        <div>
          <span className="text-black/50">Items </span>
          <span className="font-semibold">{lines.length}</span>
        </div>
        <div className="text-right">
          <span className="text-black/50">Total qty </span>
          <span className="font-semibold">{qtyTotal}</span>
        </div>
      </div>
    );

  /* Option C — single sleek divider row */
  const InlineSummary =
    place !== "inline" ? null : t === 2 ? (
      <div className="mt-1 flex justify-center gap-2 border-y border-black/30 py-[3px] text-[10px] tracking-wide uppercase">
        <span>Items: {lines.length}</span>
        <span className="text-black/30">|</span>
        <span>Total Qty: {qtyTotal}</span>
      </div>
    ) : (
      <div className="mt-1 text-center text-[11px] italic">
        — items: {lines.length} | total qty: {qtyTotal} —
      </div>
    );

  /* --- Items --- */
  const compact = t === 3 || t === 8;
  const stacked = t === 4 || t === 7;

  /* Option A — a table footer row aligned under the QTY column */
  const QtyFooterRow =
    place !== "column" ? null : (
      <div
        className={`flex pt-[2px] font-semibold ${
          t === 9 ? "border-t border-dashed border-black" : "border-t border-black"
        }`}
      >
        <span className="flex-1 pr-1 text-[10px] tracking-wide uppercase">
          {lines.length} item{lines.length === 1 ? "" : "s"}
        </span>
        <span className="w-8 text-right">{qtyTotal}</span>
        <span className="w-14" />
        <span className="w-16" />
      </div>
    );

  const Items = compact ? (
    <div className="mt-2">
      {lines.map((l) => (
        <div key={l.itemId} className="flex justify-between">
          <span className="truncate pr-2">
            {l.qty}x {l.name}
          </span>
          <span>{money(l.price * l.qty)}</span>
        </div>
      ))}
    </div>
  ) : stacked ? (
    <div className="mt-2">
      {lines.map((l) => (
        <div key={l.itemId} className="mt-1">
          <div className={t === 4 ? "uppercase" : "font-semibold"}>{l.name}</div>
          <div className="flex justify-between">
            <span>
              {l.qty} {l.unit} × {money(l.price)}
            </span>
            <span>{money(l.price * l.qty)}</span>
          </div>
        </div>
      ))}
    </div>
  ) : (
    <div className="mt-2">
      <div
        className={`flex pb-1 font-bold ${
          t === 2 || t === 10 ? "border-b border-black/30" : "border-b border-dashed border-black"
        }`}
      >
        <span className="flex-1">ITEM</span>
        <span className="w-8 text-right">QTY</span>
        <span className="w-14 text-right">RATE</span>
        <span className="w-16 text-right">AMT</span>
      </div>
      {lines.map((l) => (
        <div
          key={l.itemId}
          className={`flex py-[2px] ${
            t === 2 || t === 6 || t === 9 ? "" : "border-b border-dotted border-black/40"
          }`}
        >
          <span className="flex-1 pr-1">{l.name}</span>
          <span className="w-8 text-right">{l.qty}</span>
          <span className="w-14 text-right">{money(l.price)}</span>
          <span className="w-16 text-right">{money(l.price * l.qty)}</span>
        </div>
      ))}
      {QtyFooterRow}

    </div>
  );

  const totalCls =
    t === 1
      ? "mt-1 flex justify-between bg-black px-1 py-1 text-[13px] font-bold text-white"
      : t === 2 || t === 10
        ? "flex justify-between text-[14px] font-semibold"
        : t === 6
          ? "mt-1 flex justify-between border-y-[3px] border-black py-1 text-[15px] font-bold uppercase"
          : t === 8
            ? "mt-1 flex justify-between text-[18px]"
            : "flex justify-between border-y border-black py-1 text-[13px] font-bold";

  /* Option D — the summary lives inside the grand-total banner */
  const GrandTotalBlock =
    place === "banner" ? (
      t === 4 ? (
        <div className="mt-1 border-y-2 border-black py-1">
          <div className="flex justify-between text-[9px] tracking-[0.2em] uppercase">
            <span>Items {lines.length}</span>
            <span>Qty {qtyTotal}</span>
          </div>
          <div className="flex justify-between text-[14px] font-bold tracking-wide uppercase">
            <span>Total</span>
            <span>Rs. {money(total)}</span>
          </div>
        </div>
      ) : t === 8 ? (
        <div className="mt-1 text-center" style={{ fontFamily: def.headFont }}>
          <div className="text-[9px] tracking-[0.3em] uppercase">
            {lines.length} items · {qtyTotal} qty
          </div>
          <div className="text-[20px] leading-tight">Rs. {money(total)}</div>
          <div className="text-[9px] tracking-[0.3em] uppercase">total payable</div>
        </div>
      ) : (
        <div className="mt-1 bg-black px-2 py-[6px] text-white">
          <div className="flex justify-between text-[13px] font-bold">
            <span>GRAND TOTAL</span>
            <span>Rs. {money(total)}</span>
          </div>
          <div className="flex justify-between text-[9px] tracking-wide uppercase opacity-80">
            <span>Items {lines.length}</span>
            <span>Total qty {qtyTotal}</span>
          </div>
        </div>
      )
    ) : (
      <div className={totalCls} style={t === 8 ? { fontFamily: def.headFont } : undefined}>
        <span>TOTAL</span>
        <span>Rs. {money(total)}</span>
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
      <div className="flex justify-between">
        <span>Paid by</span>
        <span>{bill.payment}</span>
      </div>
      {compact && place === "banner" ? null : null}
      {GrandTotalBlock}
    </div>
  );



  const Foot = (
    <div className={`mt-3 ${t === 9 ? "text-left" : "text-center"}`}>
      <div className={t === 4 || t === 3 ? "tracking-widest uppercase" : t === 7 ? "italic" : ""}>
        {firm?.footer}
      </div>
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
  if (t === 10) return <div className="border border-black/20 p-2">{body}</div>;
  return body;
}

/* --------------------------------- A4 --------------------------------- */

function A4({ bill, t }: { bill: BillData; t: number }) {
  const { firm, lines, discount, customer } = bill;
  const { subtotal, total } = billTotals(lines, discount);
  const serif = t === 4 ? "font-serif" : "";
  const logo = firm?.logo;

  const LogoBox = ({ dark = false, size = 56 }: { dark?: boolean; size?: number }) =>
    logo ? (
      <img
        src={logo}
        alt="Store logo"
        style={{ height: size, width: "auto", objectFit: "contain" }}
        className={dark ? "mb-2 bg-white/90 p-1" : "mb-2"}
      />
    ) : null;

  const Head =
    t === 1 ? (
      <div className="flex items-start justify-between bg-black px-6 py-5 text-white">
        <div>
          <LogoBox dark />
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
        <LogoBox />
        <div className="text-xs tracking-[0.35em] text-black/50 uppercase">Invoice</div>
        <div className="mt-2 text-3xl font-light">{firm?.name || "Your Business"}</div>
        <div className="mt-1 text-xs whitespace-pre-line text-black/60">{firm?.address}</div>
      </div>
    ) : t === 3 ? (
      <div className="flex items-end justify-between border-b border-black pb-2">
        <div className="flex items-end gap-3">
          <LogoBox size={44} />
          <div>
            <div className="text-lg font-bold uppercase">{firm?.name || "Your Business"}</div>
            <div className="text-[11px] whitespace-pre-line">{firm?.address}</div>
          </div>
        </div>
        <div className="text-right text-[11px]">
          {firm?.phone ? <div>Ph: {firm.phone}</div> : null}
          {firm?.gstin ? <div>GSTIN: {firm.gstin}</div> : null}
        </div>
      </div>
    ) : t === 4 ? (
      <div className="border-b-4 border-double border-black pb-4 text-center">
        {logo ? (
          <img
            src={logo}
            alt="Store logo"
            style={{ height: 60, width: "auto", objectFit: "contain" }}
            className="mx-auto mb-2"
          />
        ) : null}
        <div className="text-3xl font-bold tracking-wide">{firm?.name || "Your Business"}</div>
        <div className="mt-1 text-xs whitespace-pre-line">{firm?.address}</div>
        <div className="text-xs">
          {firm?.phone ? `Ph: ${firm.phone}` : ""} {firm?.gstin ? ` | GSTIN: ${firm.gstin}` : ""}
        </div>
        <div className="mt-3 inline-block border border-black px-6 py-1 text-sm tracking-[0.3em] uppercase">
          Invoice
        </div>
      </div>
    ) : (
      <div className="border-2 border-black">
        <div className="border-b-2 border-black px-4 py-2 text-center text-sm tracking-[0.3em] uppercase">
          Invoice
        </div>
        <div className="grid grid-cols-2">
          <div className="border-r-2 border-black p-4">
            <LogoBox size={40} />
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
        {customer ? (
          <div>
            <span className="text-black/50">Customer:</span> {customer}
          </div>
        ) : null}
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
