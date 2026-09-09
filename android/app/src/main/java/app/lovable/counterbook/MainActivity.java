package app.lovable.counterbook;

import android.content.Context;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onStart() {
        super.onStart();
        // Expose a native print bridge to the web app. Android WebView ignores
        // window.print(), so receipts are handed to the system PrintManager here.
        getBridge().getWebView().addJavascriptInterface(new PrintBridge(), "AndroidPrint");
    }

    class PrintBridge {
        @JavascriptInterface
        public void print(final String html) {
            runOnUiThread(() -> {
                WebView printView = new WebView(MainActivity.this);
                printView.setWebViewClient(new WebViewClient() {
                    @Override
                    public void onPageFinished(WebView view, String url) {
                        PrintManager pm = (PrintManager) getSystemService(Context.PRINT_SERVICE);
                        PrintDocumentAdapter adapter = view.createPrintDocumentAdapter("receipt");
                        pm.print("Receipt", adapter, new PrintAttributes.Builder().build());
                    }
                });
                printView.loadDataWithBaseURL("https://bill-pro-mate.lovable.app/", html, "text/HTML", "UTF-8", null);
            });
        }
    }
}
