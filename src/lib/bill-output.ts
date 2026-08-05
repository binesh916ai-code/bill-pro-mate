import jsPDF from "jspdf";
import html2canvas from "html2canvas-pro";

import { EscPosBuilder, center, itemHeader, itemRow, printBytes, repeat, row, wrap } from "@/lib/escpos";
import { billTotals, money, type BillData } from "@/components/pos/BillPreview";
import { paperColumns, type PaperSize } from "@/lib/pos-store";

/** letter-spaced text, e.g. "SHOP" -> "S H O P" (used by poster/ticket templates) */
const spaced = (s: string, gap = " ") => s.split("").join(gap);
/**
 * Template 5 — Bordered Typewriter.
 * Prints a full outer box frame (+---+ / | ... |) in native condensed Font B,
 * with hardware bold on the store name, table headers and grand total.
 */
function buildBorderedTypewriter(bill: BillData, paper: PaperSize) {
  const W = Number(paper) === 58 ? 42 : 64; // Font B columns
  const IW = W - 4; // inner content width inside "| " ... " |"

  const { firm, lines, discount, payment, customer } = bill;
  const { subtotal, total } = billTotals(lines, discount);
  const qtyTotal = lines.reduce((s, l) => s + l.qty, 0);

  const b = new EscPosBuilder().init().align("left");
  b.condensed(true);

  const edge = () => b.bold(true).line("+" + repeat("-", W - 2) + "+").bold(false);
  const inner = (ch = "-") => b.bold(true).line("| " + repeat(ch, IW) + " |").bold(false);
  const boxed = (s: string, bold = false) => {
    b.bold(bold);
    b.line("| " + (s.length > IW ? s.slice(0, IW) : s.padEnd(IW)) + " |");
    b.bold(false);
    return b;
  };
  const boxedCenter = (s: string, bold = false) => boxed(center(s, IW).padEnd(IW), bold);
  const boxedRow = (l: string, r: string, bold = false) => boxed(row(l, r, IW), bold);

  edge();
  boxed("");
  boxedCenter((firm?.name ?? "Your Business").toUpperCase(), true);
  if (firm?.address) wrap(firm.address, IW).forEach((l) => boxedCenter(l.trim()));
  if (firm?.phone) boxedCenter("Ph: " + firm.phone);
  if (firm?.gstin) boxedCenter("GSTIN: " + firm.gstin);
  boxed("");
  inner();

  boxedRow("No: " + bill.invoiceNo, bill.date);
  boxedRow(customer ? "Cust: " + customer : "", bill.time);
  inner();

  boxed(itemHeader(IW), true);
  inner();
  lines.forEach((l) => {
    itemRow(l.name, String(l.qty), money(l.price), money(l.price * l.qty), IW).forEach((r) =>
      boxed(r),
    );
  });
  inner();

  // Option A — total qty aligned under the QTY column
  boxed(itemRow(`${lines.length} ITEM${lines.length === 1 ? "" : "S"}`, String(qtyTotal), "", "", IW)[0]!, true);
  inner();

  boxedRow("Subtotal", money(subtotal));
  if (discount > 0) boxedRow("Discount", "-" + money(discount));
  boxedRow("Paid by", payment);
  inner();
  boxedRow("GRAND TOTAL", "Rs. " + money(total), true);
  inner();

  if (firm?.footer) {
    boxed("");
    wrap(firm.footer, IW).forEach((l) => boxedCenter(l.trim()));
  }
  boxed("");
  edge();

  b.condensed(false);
  b.align("left").feed(3).cut();
  return b.build();
}


/**
 * Build ESC/POS bytes so the physical print mirrors the on-screen template.
 * Each of the 10 thermal templates has its own header, separators, meta block,
 * item table style, qty-summary placement and grand-total treatment.
 */
export function buildReceipt(bill: BillData, template = 1, paper: PaperSize = 80) {
  const t = Math.min(10, Math.max(1, Number(template) || 1));
  if (t === 5) return buildBorderedTypewriter(bill, paper);
  /** Template 3 prints in native condensed Font B (~1.33x denser columns) */
  const condensed = t === 3;
  const W = condensed
    ? Number(paper) === 58
      ? 42
      : 64
    : paperColumns(paper);

  const { firm, lines, discount, payment, customer } = bill;
  const { subtotal, total } = billTotals(lines, discount);
  const qtyTotal = lines.reduce((s, l) => s + l.qty, 0);

  const solid = repeat("=", W);
  const dash = repeat("-", W);
  const dot = repeat(".", W);
  const wave = repeat("~", W);
  const star = repeat("*", W);
  const dashSpaced = repeat("- ", Math.floor(W / 2));

  /** center a string inside a fixed-width block of spaces (for solid invert banners) */
  const plate = (s: string, w: number) => {
    const txt = s.length > w ? s.slice(0, w) : s;
    const left = Math.floor((w - txt.length) / 2);
    return " ".repeat(left) + txt + " ".repeat(w - txt.length - left);
  };

  // separator personality per template (mirrors the CSS border of each design)
  const sep = [solid, dash, solid, dashSpaced, solid, solid, dashSpaced, dashSpaced, dot, dash][t - 1]!;
  /** crisp bold rule (used by Modern Mono instead of faded dotted lines) */
  const rule = (ch = "-") => b.bold(true).line(repeat(ch, W)).bold(false);
  /** template-aware separator (Modern Mono / Compact Condensed get crisp bold rules) */
  const putSep = () => (t === 1 || t === 4 || condensed ? rule("-") : b.line(sep));

  const b = new EscPosBuilder().init().align("center");
  if (condensed) b.condensed(true);


  /* ---------------- header ---------------- */
  const name = (firm?.name ?? "Your Business").trim();
  if (t === 5) b.line(solid); // bordered typewriter
  if (t === 10) b.line(dash); // grid grotesk frame

  b.align(t === 2 || t === 6 || t === 9 ? "left" : "center");

  switch (t) {
    case 1: {
      // Modern Mono — solid deep-black name plate (native GS B invert, double size)
      const half = Math.floor(W / 2);
      b.invert(true)
        .line(plate("", W))
        .bold(true)
        .size(1, 1)
        .line(plate(name.toUpperCase(), half))
        .size(0, 0)
        .bold(false)
        .line(plate("", W))
        .invert(false);
      break;
    }

    case 3: {
      // Compact Condensed — tall narrow caps, one centered line, never wrapped
      const caps = name.toUpperCase();
      const tracked = spaced(caps);
      b.bold(true)
        .size(0, 1) // double height only: stays condensed-narrow horizontally
        .line((tracked.length <= W ? tracked : caps).slice(0, W))
        .size(0, 0)
        .bold(false);
      break;
    }

    case 4: // Classic Serif — tracked caps
      b.bold(true).line(spaced(name.toUpperCase())).bold(false);
      break;
    case 6: // Bold Poster — double width + heavy rule
      b.bold(true).size(1, 1).line(name.toUpperCase()).size(0, 0).bold(false);
      break;
    case 7: // Elegant Garamond — double height, title case
      b.size(0, 1).line(name).size(0, 0);
      break;
    case 8: // Ticket Stub — big display name
      b.bold(true).size(1, 1).line(spaced(name.toUpperCase())).size(0, 0).bold(false);
      break;
    case 10: // Grid Grotesk
      b.bold(true).size(1, 0).line(name.toUpperCase()).size(0, 0).bold(false);
      break;
    default: // 2, 5, 9
      b.bold(true).line(t === 2 ? name : name.toUpperCase()).bold(false);
  }

  const leftHead = t === 2 || t === 6 || t === 9;
  const put = (s: string) => b.line(leftHead ? s : center(s, W));
  if (t !== 3 && firm?.address) wrap(firm.address, W).forEach((l) => put(l.trim()));
  if (firm?.phone) put("Ph: " + firm.phone);
  if (firm?.gstin) put("GSTIN: " + firm.gstin);
  if (t === 4) {
    b.align("center")
      .bold(true)
      .line(center(spaced("* CASH BILL *", ""), W))
      .bold(false)
      .align("left");
  }
  if (t === 8) b.line(center(spaced("CASH RECEIPT"), W));
  if (t === 6) b.line(solid);
  b.align("left");
  if (t !== 6) putSep();

  /* ---------------- meta (unique per template) ---------------- */
  if (t === 2) {
    b.line("Invoice  " + bill.invoiceNo);
    b.line("Date     " + bill.date + " · " + bill.time);
    if (customer) b.line("Customer " + customer);
  } else if (t === 3) {
    b.line(row(bill.invoiceNo.toUpperCase(), (bill.date + " " + bill.time).toUpperCase(), W));
    putSep();
  } else if (t === 6) {
    b.line(row("BILL NO", "DATE / TIME", W));
    b.bold(true).line(row(bill.invoiceNo, bill.date + " " + bill.time, W)).bold(false);
    if (customer) b.line("CUSTOMER: " + customer);
  } else if (t === 7) {
    b.align("center")
      .line(center([bill.invoiceNo, bill.date, bill.time, customer].filter(Boolean).join(" · "), W))
      .align("left")
      .line(dashSpaced);
  } else if (t === 8) {
    b.align("center");
    b.line(dashSpaced);
    b.size(1, 0).line(bill.invoiceNo).size(0, 0);
    b.line(center((bill.date + " — " + bill.time).toUpperCase(), W));
    if (customer) b.line(center(customer, W));
    b.line(dashSpaced).align("left");
  } else if (t === 9) {
    b.line("> INVOICE  : " + bill.invoiceNo);
    b.line("> DATE     : " + bill.date);
    b.line("> TIME     : " + bill.time);
    if (customer) b.line("> CUSTOMER : " + customer);
  } else if (t === 10) {
    const col = Math.floor(W / 3);
    const cell = (a: string, c: string) =>
      a.padEnd(col).slice(0, col) + c.padEnd(col).slice(0, col);
    b.line(cell("BILL", "DATE") + "TIME");
    b.bold(true).line(cell(bill.invoiceNo, bill.date) + bill.time).bold(false);
    if (customer) b.line("CUSTOMER: " + customer);
  } else {
    b.line(row("No: " + bill.invoiceNo, bill.date, W));
    b.line(row(customer ? "Cust: " + customer : "", bill.time, W));
  }

  /* summary placement per template: column | header | inline | banner */
  const place =
    t === 1 || t === 5 || t === 9
      ? "column"
      : t === 3 || t === 6
        ? "header"
        : t === 2 || t === 7
          ? "inline"
          : "banner";

  if (place === "header") {
    if (t === 3) b.align("center").line(center(`${lines.length} ITEMS   QTY ${qtyTotal}`, W)).align("left");
    else b.line(row("ITEMS  " + lines.length, "TOTAL QTY  " + qtyTotal, W));
  }
  putSep();

  /* ---------------- items (style mirrors the preview) ---------------- */
  const compact = t === 3 || t === 8; // "2x Item .......... amount"
  const stacked = t === 4 || t === 7; // name on its own line, qty × rate below

  if (compact) {
    lines.forEach((l) => {
      const label = `${l.qty}x ${t === 3 ? l.name.toUpperCase() : l.name}`;
      wrap(label, W - 10).forEach((part, i, arr) =>
        b.line(i === arr.length - 1 ? row(part, money(l.price * l.qty), W) : part),
      );
    });
  } else if (stacked) {
    lines.forEach((l) => {
      wrap(t === 4 ? l.name.toUpperCase() : l.name, W).forEach((p) => b.line(p));
      b.line(row(`  ${l.qty} ${l.unit ?? ""} x ${money(l.price)}`.trimEnd(), money(l.price * l.qty), W));
      if (t === 7) b.line(dashSpaced);
    });
  } else {
    b.bold(true).line(itemHeader(W)).bold(false);
    b.line(t === 2 || t === 10 ? dash : dashSpaced);
    lines.forEach((l) => {
      itemRow(l.name, String(l.qty), money(l.price), money(l.price * l.qty), W).forEach((r) =>
        b.line(r),
      );
      if (t === 5) b.line(dot);
    });
  }

  /* Option A — total qty padded directly under the QTY column */
  if (place === "column") {
    rule("-");
    b.bold(true)
      .line(itemRow(`${lines.length} ITEM${lines.length === 1 ? "" : "S"}`, String(qtyTotal), "", "", W)[0]!)
      .bold(false);
  }

  putSep();

  /* Option C — single sleek inline summary row */
  if (place === "inline") {
    if (t === 7)
      b.align("center").line(center(`- items: ${lines.length} | total qty: ${qtyTotal} -`, W)).align("left");
    else b.align("center").line(center(`ITEMS: ${lines.length}  |  TOTAL QTY: ${qtyTotal}`, W)).align("left");
    b.line(t === 7 ? dashSpaced : dash);
  }

  /* ---------------- totals block ---------------- */
  b.line(row("Subtotal", money(subtotal), W));
  if (discount > 0) b.line(row("Discount", "-" + money(discount), W));
  b.line(row("Paid by", payment, W));

  /* Option D — summary folded into the grand-total banner */
  if (place === "banner") {
    if (t === 4) {
      rule("-");
      b.line(row("ITEMS " + lines.length, "QTY " + qtyTotal, W));
      b.bold(true).line(row(spaced("TOTAL", ""), "Rs. " + money(total), W)).bold(false);
      rule("-");
    } else if (t === 8) {
      b.align("center")
        .line(center(`${lines.length} ITEMS · ${qtyTotal} QTY`, W))
        .bold(true)
        .size(1, 1)
        .line("Rs." + money(total))
        .size(0, 0)
        .bold(false)
        .line(center(spaced("TOTAL PAYABLE"), W))
        .align("left");
    } else {
      // 10 — dark banner feel via reverse printing
      b.invert(true)
        .bold(true)
        .line(row(" GRAND TOTAL", "Rs. " + money(total) + " ", W))
        .bold(false)
        .invert(false);
      b.line(row("Items " + lines.length, "Total qty " + qtyTotal, W));
    }
  } else if (t === 1) {
    b.invert(true)
      .line(plate("", W))
      .bold(true)
      .line(row(" TOTAL", "Rs. " + money(total) + " ", W))
      .bold(false)
      .line(plate("", W))
      .invert(false);
    rule("-");
  } else if (t === 6) {
    b.line(solid);
    b.bold(true).size(0, 1).line(row("TOTAL", "Rs. " + money(total), W)).size(0, 0).bold(false);
    b.line(solid);
  } else if (t === 5 || t === 9) {
    b.line(dash);
    b.bold(true).size(0, 1).line(row("TOTAL", "Rs. " + money(total), W)).size(0, 0).bold(false);
    b.line(dash);
  } else {
    b.bold(true).line(row("TOTAL", "Rs. " + money(total), W)).bold(false);
  }
  if (t === 5 || t === 10) b.line(t === 5 ? solid : dash);

  /* ---------------- footer: only the custom message ---------------- */
  b.align(t === 9 ? "left" : "center");
  if (firm?.footer)
    wrap(firm.footer, W).forEach((l) =>
      b.line(t === 9 ? l.trim() : center(t === 3 || t === 4 ? l.trim().toUpperCase() : l.trim(), W)),
    );
  if (condensed) b.condensed(false);
  b.align("left").feed(3).cut();
  return b.build();
}


export async function printThermal(bill: BillData, template = 1, paper: PaperSize = 80) {
  await printBytes(buildReceipt(bill, template, paper));
}

async function snapshot(el: HTMLElement) {
  return html2canvas(el, { scale: 2, backgroundColor: "#ffffff", useCORS: true });
}

/** Save the rendered bill node as a PDF (A4 page, or a continuous thermal roll). */
export async function saveBillPdf(
  el: HTMLElement,
  mode: "a4" | "thermal",
  filename: string,
  paper: PaperSize = 80,
) {
  const canvas = await snapshot(el);
  const img = canvas.toDataURL("image/jpeg", 0.95);
  if (mode === "a4") {
    const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
    const pw = 210;
    const w = pw - 20;
    const h = (canvas.height / canvas.width) * w;
    pdf.addImage(img, "JPEG", 10, 10, w, h);
    pdf.save(filename + ".pdf");
  } else {
    const w = Number(paper) === 58 ? 58 : 80;
    const h = (canvas.height / canvas.width) * w;
    const pdf = new jsPDF({ unit: "mm", format: [w, h] });
    pdf.addImage(img, "JPEG", 0, 0, w, h);
    pdf.save(filename + ".pdf");
  }
}

/** Save the rendered bill node as a PNG image (handy for thermal receipts). */
export async function saveBillImage(el: HTMLElement, filename: string) {
  const canvas = await snapshot(el);
  const a = document.createElement("a");
  a.href = canvas.toDataURL("image/png");
  a.download = filename + ".png";
  a.click();
}
