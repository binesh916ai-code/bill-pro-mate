import type { PaperSize } from "@/lib/pos-store";

/** Clone every stylesheet currently on the page so the receipt prints exactly as previewed. */
function collectStyles() {
  const parts: string[] = [];
  document.querySelectorAll<HTMLLinkElement | HTMLStyleElement>('link[rel="stylesheet"], style').forEach((n) => {
    if (n instanceof HTMLLinkElement) {
      parts.push(`<link rel="stylesheet" href="${n.href}">`);
    } else {
      let css = n.textContent ?? "";
      if (!css && n.sheet) {
        try {
          css = Array.from(n.sheet.cssRules).map((r) => r.cssText).join("\n");
        } catch {
          /* cross-origin sheet — skip */
        }
      }
      parts.push(`<style>${css}</style>`);
    }
  });
  return parts.join("\n");
}

/**
 * Print only the rendered bill node via `window.print()` inside an invisible
 * iframe. Works in desktop/mobile Chrome and inside the Android WebView, where
 * it opens the system Print Spooler with the fully styled receipt.
 */
export async function printElementInFrame(el: HTMLElement, mode: "a4" | "thermal", paper: PaperSize = 80) {
  const roll = mode === "thermal";
  const widthMm = roll ? (Number(paper) === 58 ? 50 : 72) : 190;
  const html = `<!doctype html>
<html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
${collectStyles()}
<style>
  @page { size: ${roll ? `${Number(paper) === 58 ? 58 : 80}mm auto` : "A4"}; margin: ${roll ? "0" : "10mm"}; }
  html, body { margin: 0; padding: 0; background: #fff !important; color: #000 !important; }
  /* Extra leading space at the top of the page so the shop name is not cut off. */
  body { width: ${widthMm}mm; padding: ${roll ? "4mm" : "0"}; padding-top: ${roll ? "8mm" : "5mm"}; }
  .print-root { width: 100%; }
  .print-root * { visibility: visible !important; }
</style>
</head><body>
<div class="print-root">${el.outerHTML}</div>
</body></html>`;

  // Inside the Android APK, WebView ignores window.print() entirely — hand the
  // receipt HTML to the native print bridge (MainActivity) which opens the
  // system print dialog. On web/Chrome this global is absent and we fall back
  // to the invisible-iframe print below.
  const nativePrint = (window as unknown as { AndroidPrint?: { print(html: string): void } }).AndroidPrint;
  if (nativePrint) {
    nativePrint.print(html);
    return;
  }

  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none;";
  document.body.appendChild(frame);

  const win = frame.contentWindow;
  const doc = frame.contentDocument;
  if (!win || !doc) {
    frame.remove();
    throw new Error("Could not prepare the print view.");
  }

  await new Promise<void>((resolve) => {
    frame.onload = () => resolve();
    doc.open();
    doc.write(html);
    doc.close();
    // Safety net: some WebViews never fire onload for document.write().
    setTimeout(resolve, 800);
  });

  // Give fonts/images a moment to settle before handing off to the spooler.
  await new Promise((r) => setTimeout(r, 250));

  const cleanup = () => setTimeout(() => frame.remove(), 60_000);
  win.onafterprint = cleanup;
  try {
    win.focus();
    win.print();
  } catch (e) {
    frame.remove();
    throw new Error("The print dialog could not be opened here." + ((e as Error)?.message ? ` (${(e as Error).message})` : ""));
  }
  cleanup();
}
