import { registerPlugin } from "@capacitor/core";

import type { PaperSize } from "@/lib/pos-store";

type NativePrintPlugin = {
  print(opts: { html: string; name: string; baseUrl: string; roll: boolean }): Promise<void>;
};

/** Local Android plugin (android/.../NativePrintPlugin.java) — opens the system print dialog. */
const NativePrint = registerPlugin<NativePrintPlugin>("NativePrint");

/** Clone every stylesheet currently on the page so the receipt prints exactly as previewed. */
function collectStyles() {
  const parts: string[] = [];
  document.querySelectorAll<HTMLLinkElement | HTMLStyleElement>('link[rel="stylesheet"], style').forEach((n) => {
    if (n instanceof HTMLLinkElement) {
      parts.push(`<link rel="stylesheet" href="${n.href}">`);
    } else {
      // Vite dev injects styles as <style>; in prod they are <link>. Either way clone the text.
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
 * Send the rendered bill node to the Android system print dialog
 * (PrintManager / Print Spooler), preserving the full styled layout.
 */
export async function printElementNatively(
  el: HTMLElement,
  name: string,
  mode: "a4" | "thermal",
  paper: PaperSize = 80,
) {
  const roll = mode === "thermal";
  const widthMm = roll ? (Number(paper) === 58 ? 50 : 72) : 190;
  const html = `<!doctype html>
<html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
${collectStyles()}
<style>
  @page { size: ${roll ? "80mm auto" : "A4"}; margin: ${roll ? "0" : "10mm"}; }
  html, body { margin: 0; padding: 0; background: #fff !important; color: #000 !important; }
  body { width: ${widthMm}mm; padding: ${roll ? "4mm" : "0"}; }
  .print-root { width: 100%; }
  .print-root * { visibility: visible !important; }
</style>
</head><body>
<div class="print-root">${el.outerHTML}</div>
</body></html>`;

  await NativePrint.print({ html, name, baseUrl: window.location.origin + "/", roll });
}
