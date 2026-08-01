"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PWAInstallBanner() {
  const [deferred, setDeferred] = useState(null);
  const [visible, setVisible] = useState(false);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    const dismissed = window.localStorage.getItem("pwa-banner-dismissed");
    if (dismissed === "1") return;

    const isIos =
      /iphone|ipad|ipod/i.test(window.navigator.userAgent) &&
      !window.navigator.standalone;

    const onBeforeInstall = (e) => {
      e.preventDefault();
      setDeferred(e);
      setVisible(true);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);

    if (isIos) {
      setIosHint(true);
      setVisible(true);
    }

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
    };
  }, []);

  if (!visible) return null;

  async function install() {
    if (!deferred) return;
    deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    setVisible(false);
  }

  function dismiss() {
    window.localStorage.setItem("pwa-banner-dismissed", "1");
    setVisible(false);
  }

  return (
    <div className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-lg rounded-xl border border-[#800000]/20 bg-white p-4 shadow-lg">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-lg bg-[#800000]/10 p-2 text-[#800000]">
          <Download className="size-4" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-[#3d1212]">
            Install PastraPortal
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {iosHint && !deferred
              ? "On iOS: tap Share, then “Add to Home Screen”."
              : "Add PastraPortal to your home screen for faster offline access."}
          </p>
          <div className="mt-3 flex gap-2">
            {deferred && (
              <Button size="sm" onClick={install} className="bg-[#800000] hover:bg-[#6a0000]">
                Install
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={dismiss}>
              Not now
            </Button>
          </div>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="rounded-md p-1 text-muted-foreground hover:bg-muted"
          aria-label="Dismiss"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
