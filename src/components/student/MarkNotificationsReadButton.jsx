"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { markAllStudentNotificationsRead } from "@/actions/announcements";
import { markMyPortalNotificationsRead } from "@/actions/portal-notifications";
import { Button } from "@/components/ui/button";

export function MarkNotificationsReadButton({ disabled }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onClick() {
    startTransition(async () => {
      const [announcements, portal] = await Promise.all([
        markAllStudentNotificationsRead(),
        markMyPortalNotificationsRead(),
      ]);
      if (announcements?.error || portal?.error) {
        toast.error(announcements?.error || portal?.error);
        return;
      }
      toast.success("Notifications marked as read.");
      router.refresh();
    });
  }

  return (
    <Button type="button" variant="outline" disabled={disabled || pending} onClick={onClick}>
      {pending ? "Updating…" : "Mark all as read"}
    </Button>
  );
}
