import jsPDF from "jspdf";
import html2canvas from "html2canvas-pro";

import { EscPosBuilder, center, printBytes, row } from "@/lib/escpos";
import { billTotals, money, type BillData } from "@/components/pos/BillPreview";

const DIV = "--------------------------------";
const DIV2 = "================================";
const DOT = "................................";

/** Build ESC/POS bytes for one of the 5 receipt templates. */
export function buildReceipt(bill: BillData, template = 1) {
  const t = Math.min(5, Math.max(1, Number(template) || 1));
  const { firm, lines, discount, payment } = bill;
  const { subtotal, total } = billTotals(lines, discount);
  const b = new EscPosBuilder().init().align("center");

  // header
  b.bold(true).size(1, 1).line(firm?.name ?? "").size(0, 0).bold(false);
  if (t !== 3 && firm?.address) b.line(firm.address);
  if (firm?.phone) b.line("Ph: " + firm.phone);
  if (firm?.gstin) b.line("GSTIN: " + firm.gstin);
  if (t === 4) b.line("* TAX INVOICE *");
  b.align("left").line(t === 4 ? DIV : t === 2 ? "" : t === 5 ? DIV2 : DIV);

  b.line(row(`No: ${bill.invoiceNo}`, bill.date));
  b.line(row(bill.customer ? `Cust: ${bill.customer}` : "Walk-in", bill.time));
  b.line(t === 5 ? DIV2 : DIV);

  if (t === 3) {
    lines.forEach((l) => b.line(row(`${l.qty}x ${l.name}`, money(l.price * l.qty))));
  } else if (t === 4) {
    lines.forEach((l) => {
      b.line(l.name.toUpperCase());
      b.line(row(`  ${l.qty} ${l.unit} x ${money(l.price)}`, money(l.price * l.qty)));
    });
  } else {
    b.bold(true).line(row("ITEM  QTY x RATE", "AMOUNT")).bold(false);
    b.line(t === 2 ? DOT : DIV);
    lines.forEach((l) => {
      b.line(l.name);
      b.line(row(`  ${l.qty} x ${money(l.price)}`, money(l.price * l.qty)));
    });
  }

  b.line(t === 5 ? DIV2 : DIV);
  b.line(row("Subtotal", money(subtotal)));
  if (discount > 0) b.line(row("Discount", "-" + money(discount)));
  if (t === 1 || t === 5) {
    b.bold(true).size(0, 1).line(row("TOTAL", "Rs." + money(total))).size(0, 0).bold(false);
  } else {
    b.bold(true).line(row("TOTAL", "Rs." + money(total))).bold(false);
  }
  b.line(row("Paid by", payment));
  b.line(row("Items", String(lines.reduce((s, l) => s + l.qty, 0))));
  b.line(t === 5 ? DIV2 : DIV);
  b.align("center").line(t === 4 ? center(firm?.footer ?? "") : (firm?.footer ?? ""));
  b.feed(3).cut();
  return b.build();
}

export async function printThermal(bill: BillData, template = 1) {
  await printBytes(buildReceipt(bill, template));
}

async function snapshot(el: HTMLElement) {
  return html2canvas(el, { scale: 2, backgroundColor: "#ffffff", useCORS: true });
}

/** Save the rendered bill node as a PDF (A4 page, or a continuous 80mm roll). */
export async function saveBillPdf(el: HTMLElement, mode: "a4" | "thermal", filename: string) {
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
    const w = 80;
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
