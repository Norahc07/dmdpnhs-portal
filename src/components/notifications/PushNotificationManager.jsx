"use client";

import { useEffect, useState, useTransition } from "react";
import { Bell, BellOff, BellRing } from "lucide-react";
import { toast } from "sonner";
import {
  deletePushSubscription,
  getPushPublicKey,
  savePushSubscription,
} from "@/actions/push";
import { Button } from "@/components/ui/button";
import {
  isIosDevice,
  isStandaloneDisplay,
  registerPortalServiceWorker,
  urlBase64ToUint8Array,
} from "@/lib/push-client";
import { cn } from "@/lib/utils";

async function currentSubscription() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return null;
  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
}

export function PushNotificationManager({
  variant = "banner",
  className,
}) {
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState("loading");
  const [hint, setHint] = useState("");
  const [publicKey, setPublicKey] = useState("");
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
        if (!cancelled) setStatus("unsupported");
        return;
      }

      const config = await getPushPublicKey();
      if (cancelled) return;
      if (!config?.enabled || !config.publicKey) {
        setStatus("unconfigured");
        return;
      }
      setPublicKey(config.publicKey);

      if (isIosDevice() && !isStandaloneDisplay()) {
        setHint("On iPhone, add PastraPortal to the Home Screen first, then enable alerts.");
      }

      if (window.localStorage.getItem("push-banner-dismissed") === "1") {
        setDismissed(true);
      }

      await registerPortalServiceWorker();
      const existing = await currentSubscription();
      if (cancelled) return;

      if (Notification.permission === "granted") {
        if (!existing) {
          const registration = await navigator.serviceWorker.ready;
          const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(config.publicKey),
          });
          await savePushSubscription({
            ...subscription.toJSON(),
            userAgent: navigator.userAgent,
          });
        }
        if (!cancelled) setStatus("on");
        return;
      }
      if (Notification.permission === "denied") {
        setStatus("denied");
        return;
      }
      setStatus("off");
    }

    boot();
    return () => {
      cancelled = true;
    };
  }, []);

  function enable() {
    startTransition(async () => {
      try {
        if (isIosDevice() && !isStandaloneDisplay()) {
          toast.error("Add PastraPortal to your Home Screen, then open it from there to enable phone alerts.");
          return;
        }
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          setStatus(permission === "denied" ? "denied" : "off");
          toast.error("Notification permission was not granted.");
          return;
        }

        await registerPortalServiceWorker();
        const registration = await navigator.serviceWorker.ready;
        let subscription = await registration.pushManager.getSubscription();
        if (!subscription) {
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicKey),
          });
        }

        const json = subscription.toJSON();
        const result = await savePushSubscription({
          ...json,
          userAgent: navigator.userAgent,
        });
        if (result?.error) {
          toast.error(result.error);
          return;
        }
        setStatus("on");
        toast.success("Phone alerts are on. New announcements will appear in your notification bar.");
      } catch (error) {
        toast.error(error?.message || "Could not enable phone alerts.");
      }
    });
  }

  function disable() {
    startTransition(async () => {
      try {
        const subscription = await currentSubscription();
        if (subscription) {
          await deletePushSubscription(subscription.endpoint);
          await subscription.unsubscribe();
        }
        setStatus("off");
        toast.success("Phone alerts are off.");
      } catch (error) {
        toast.error(error?.message || "Could not turn off alerts.");
      }
    });
  }

  if (status === "loading" || status === "unconfigured" || status === "unsupported") {
    if (variant === "card") {
      return (
        <section className={cn("rounded-2xl border border-[#800000]/10 bg-white p-4", className)}>
          <p className="text-xs font-semibold tracking-[0.16em] text-[#800000] uppercase">
            Phone alerts
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {status === "unsupported"
              ? "This browser does not support push notifications."
              : "Phone alerts are not configured on this server yet."}
          </p>
        </section>
      );
    }
    return null;
  }

  if (variant === "banner" && (status !== "off" || dismissed)) return null;

  const copy =
    status === "on"
      ? "Announcement alerts are on. They appear in your phone notification bar even when the portal is closed."
      : status === "denied"
        ? "Notifications are blocked in this browser. Allow them in site settings, then try again."
        : "Turn on phone alerts so new teacher announcements appear in your notification bar in real time.";

  if (variant === "card") {
    return (
      <section className={cn("rounded-2xl border border-[#800000]/10 bg-white p-4 shadow-[0_12px_28px_-20px_rgba(61,18,18,0.35)]", className)}>
        <div className="flex items-start gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-[#800000]/8 text-[#800000]">
            {status === "on" ? (
              <BellRing className="size-5" />
            ) : (
              <Bell className="size-5" />
            )}
          </span>
          <div className="flex-1">
            <p className="text-xs font-semibold tracking-[0.16em] text-[#800000] uppercase">
              Phone alerts
            </p>
            <h3 className="mt-1 font-heading text-sm font-bold text-[#3d1212]">
              Announcement notification bar
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">{copy}</p>
            {hint ? (
              <p className="mt-1 text-xs text-amber-800">{hint}</p>
            ) : null}
            <div className="mt-3">
              {status === "on" ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  onClick={disable}
                >
                  <BellOff className="size-4" />
                  {pending ? "Saving…" : "Turn off"}
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  disabled={pending || status === "denied"}
                  onClick={enable}
                  className="bg-[#800000] hover:bg-[#6a0000]"
                >
                  <BellRing className="size-4" />
                  {pending ? "Enabling…" : "Enable phone alerts"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <div className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-lg rounded-xl border border-[#800000]/20 bg-white p-4 shadow-lg md:bottom-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-lg bg-[#800000]/10 p-2 text-[#800000]">
          <Bell className="size-4" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-[#3d1212]">
            Enable announcement alerts
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{copy}</p>
          {hint ? <p className="mt-1 text-xs text-amber-800">{hint}</p> : null}
          <div className="mt-3 flex gap-2">
            <Button
              size="sm"
              onClick={enable}
              disabled={pending || status === "denied"}
              className="bg-[#800000] hover:bg-[#6a0000]"
            >
              {pending ? "Enabling…" : "Allow"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                window.localStorage.setItem("push-banner-dismissed", "1");
                setDismissed(true);
              }}
            >
              Not now
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
