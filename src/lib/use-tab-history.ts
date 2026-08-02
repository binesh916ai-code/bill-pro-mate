import { useEffect, useState } from "react";

/**
 * Keeps in-app tab navigation in the browser history so the Android back
 * button/gesture steps back through tabs. On the first (home) tab, back asks
 * for exit confirmation instead of leaving the app.
 */
export function useTabHistory<T extends string>(
  tab: T,
  setTab: (t: T) => void,
  homeTab: T,
) {
  const [exitOpen, setExitOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!window.history.state?.posTab) {
      window.history.replaceState({ posTab: homeTab }, "");
    }
    const onPop = (e: PopStateEvent) => {
      const next = (e.state as { posTab?: T } | null)?.posTab;
      if (next) {
        setTab(next);
        return;
      }
      // Nothing left in our stack — confirm exit and stay put.
      window.history.pushState({ posTab: homeTab }, "");
      setTab(homeTab);
      setExitOpen(true);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [homeTab, setTab]);

  /** Use instead of setTab so each tab change becomes a history entry. */
  function go(next: T) {
    if (next === tab) return;
    if (typeof window !== "undefined") window.history.pushState({ posTab: next }, "");
    setTab(next);
  }

  return { go, exitOpen, setExitOpen };
}
