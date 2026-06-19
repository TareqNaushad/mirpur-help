"use client";

import { useEffect, useState } from "react";

// Registers the service worker (offline / low-data) and shows a small
// "📲 ইনস্টল করুন" button when the browser says the app is installable.
export default function RegisterSW() {
  const [installEvt, setInstallEvt] = useState(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    const onPrompt = (e) => {
      e.preventDefault();
      setInstallEvt(e);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", () => setHidden(true));
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (!installEvt || hidden) return null;

  return (
    <button
      className="install-btn"
      onClick={async () => {
        installEvt.prompt();
        try {
          await installEvt.userChoice;
        } catch {}
        setHidden(true);
      }}
    >
      📲 অ্যাপটি ফোনে রাখুন (ইনস্টল)
    </button>
  );
}
