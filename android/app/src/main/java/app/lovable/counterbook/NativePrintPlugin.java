package app.lovable.counterbook;

import android.content.Context;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Renders an HTML document in an off-screen WebView and hands it to the
 * Android system print dialog (PrintManager / Print Spooler) — the same
 * path Chrome uses for window.print(), so the styled receipt is preserved.
 */
@CapacitorPlugin(name = "NativePrint")
public class NativePrintPlugin extends Plugin {

    private WebView printWebView; // keep a strong ref until the job is handed off

    @PluginMethod
    public void print(PluginCall call) {
        final String html = call.getString("html");
        final String name = call.getString("name", "Receipt");
        final String baseUrl = call.getString("baseUrl", "https://localhost/");
        final boolean roll = Boolean.TRUE.equals(call.getBoolean("roll", false));
        if (html == null || html.isEmpty()) {
            call.reject("Nothing to print");
            return;
        }

        getActivity().runOnUiThread(() -> {
            try {
                WebView wv = new WebView(getContext());
                wv.getSettings().setJavaScriptEnabled(false);
                wv.getSettings().setLoadWithOverviewMode(true);
                wv.getSettings().setUseWideViewPort(false);
                wv.setWebViewClient(new WebViewClient() {
                    @Override
                    public void onPageFinished(WebView view, String url) {
                        // give web fonts a moment to settle before snapshotting
                        view.postDelayed(() -> {
                            try {
                                startPrintJob(view, name, roll);
                                call.resolve(new JSObject());
                            } catch (Exception e) {
                                call.reject("Print failed: " + e.getMessage());
                            }
                        }, 400);
                    }
                });
                printWebView = wv;
                wv.loadDataWithBaseURL(baseUrl, html, "text/html", "UTF-8", null);
            } catch (Exception e) {
                call.reject("Print failed: " + e.getMessage());
            }
        });
    }

    private void startPrintJob(WebView view, String name, boolean roll) {
        PrintManager pm = (PrintManager) getContext().getSystemService(Context.PRINT_SERVICE);
        PrintDocumentAdapter adapter = view.createPrintDocumentAdapter(name);
        PrintAttributes.Builder attrs = new PrintAttributes.Builder();
        if (roll) {
            // 80mm roll ≈ 3.15in; long page so short receipts never split
            attrs.setMediaSize(new PrintAttributes.MediaSize("roll80", "80mm roll", 3150, 11690));
            attrs.setMinMargins(PrintAttributes.Margins.NO_MARGINS);
        } else {
            attrs.setMediaSize(PrintAttributes.MediaSize.ISO_A4);
        }
        pm.print(name, adapter, attrs.build());
        printWebView = null;
    }
}
