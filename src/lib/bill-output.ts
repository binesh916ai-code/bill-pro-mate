import jsPDF from "jspdf";
import html2canvas from "html2canvas-pro";

import { EscPosBuilder, center, itemHeader, itemRow, printBytes, repeat, row, wrap } from "@/lib/escpos";
import { billTotals, money, type BillData } from "@/components/pos/BillPreview";
import { paperColumns, type PaperSize } from "@/lib/pos-store";

/**
 * Build ESC/POS bytes for one of the 10 premium receipt templates.
 * Every row is padded to the exact column count of the roll (48 = 80mm, 32 = 58mm)
 * so item/qty/rate/amount columns line up on any ESC/POS printer.
 */
export function buildReceipt(bill: BillData, template = 1, paper: PaperSize = 80) {
  const t = Math.min(10, Math.max(1, Number(template) || 1));
  const W = paperColumns(paper);
  const { firm, lines, discount, payment, customer } = bill;
  const { subtotal, total } = billTotals(lines, discount);
  const qtyTotal = lines.reduce((s, l) => s + l.qty, 0);

  const solid = repeat("=", W);
  const dash = repeat("-", W);
  const dot = repeat(".", W);
  const wave = repeat("~", W);
  const star = repeat("*", W);

  // per-template separator + header personality
  const sep = [dash, dot, dash, dot, solid, solid, dot, dash, wave, star][t - 1]!;
  const bigName = t === 3 || t === 5 || t === 7 || t === 8 || t === 10;

  const b = new EscPosBuilder().init().align("center");

  /* ---------------- header ---------------- */
  if (t === 2 || t === 9) b.line(sep);
  b.bold(true)
    .size(bigName ? 1 : 0, 1)
    .line(firm?.name ?? "")
    .size(0, 0)
    .bold(false);
  if (firm?.address) wrap(firm.address, W).forEach((l) => b.line(center(l.trim(), W)));
  if (firm?.phone) b.line(center("Ph " + firm.phone, W));
  if (firm?.gstin) b.line(center("GSTIN " + firm.gstin, W));
  if (t === 4) b.line(center("* TAX FREE CASH INVOICE *", W));
  if (t === 8) b.line(center("CASH RECEIPT", W));
  if (t === 6) b.line(center("R E T A I L   I N V O I C E", W));
  b.align("left").line(sep);

  /* ---------------- meta ---------------- */
  if (t === 9) {
    b.line("> INVOICE : " + bill.invoiceNo);
    b.line("> DATE    : " + bill.date);
    b.line("> TIME    : " + bill.time);
    if (customer) b.line("> CUSTOMER: " + customer);
  } else if (t === 8 || t === 3) {
    b.align("center").line(bill.invoiceNo).line(bill.date + "  " + bill.time);
    if (customer) b.line(customer);
    b.align("left");
  } else if (t === 6 || t === 10) {
    b.line(row("BILL NO", bill.invoiceNo, W));
    b.line(row("DATE", bill.date, W));
    b.line(row("TIME", bill.time, W));
    if (customer) b.line(row("CUSTOMER", customer, W));
  } else {
    b.line(row("No: " + bill.invoiceNo, bill.date, W));
    b.line(row(customer ? "Cust: " + customer : "", bill.time, W));
  }
  b.line(sep);

  /* ---------------- items (fixed columns) ---------------- */
  b.bold(true).line(itemHeader(W)).bold(false);
  b.line(t === 5 || t === 6 ? repeat("=", W) : dash);
  lines.forEach((l) => {
    itemRow(
      t === 4 ? l.name.toUpperCase() : l.name,
      String(l.qty),
      money(l.price),
      money(l.price * l.qty),
      W,
    ).forEach((r) => b.line(r));
  });
  b.line(sep);

  /* ---------------- totals block ---------------- */
  b.line(row("Items", String(lines.length), W));
  b.line(row("Total Qty", String(qtyTotal), W));
  b.line(row("Subtotal", money(subtotal), W));
  if (discount > 0) b.line(row("Discount", "-" + money(discount), W));
  b.line(row("Paid by", payment, W));
  b.line(t === 5 || t === 6 || t === 10 ? repeat("=", W) : dash);
  if (t === 1 || t === 5 || t === 6 || t === 8 || t === 10) {
    b.bold(true)
      .size(0, 1)
      .line(row("TOTAL", "Rs." + money(total), W))
      .size(0, 0)
      .bold(false);
  } else {
    b.bold(true).line(row("TOTAL", "Rs." + money(total), W)).bold(false);
  }
  b.line(sep);

  /* ---------------- footer: only the custom message ---------------- */
  b.align("center");
  if (firm?.footer) wrap(firm.footer, W).forEach((l) => b.line(center(l.trim(), W)));
  b.feed(3).cut();
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
