import type { CapacitorConfig } from "@capacitor/cli";

/**
 * CounterBook native shell.
 *
 * The app is a server-rendered TanStack Start site, so the Android shell loads
 * the published web app over HTTPS instead of bundling a static build.
 * For local device testing you can temporarily point `server.url` at your
 * machine (e.g. http://192.168.1.10:8080) and set `cleartext: true`.
 */
const config: CapacitorConfig = {
  appId: "app.lovable.counterbook",
  appName: "CounterBook",
  // Fallback folder used only if server.url is removed. Kept so `npx cap sync` succeeds.
  webDir: "www",
  server: {
    url: "https://bill-pro-mate.lovable.app",
    cleartext: false,
    androidScheme: "https",
  },
  android: {
    allowMixedContent: false,
    backgroundColor: "#0F766E",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: "#0F766E",
      showSpinner: false,
    },
  },
};

export default config;
