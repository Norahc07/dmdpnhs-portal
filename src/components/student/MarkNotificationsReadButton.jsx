"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { markAllStudentNotificationsRead } from "@/actions/announcements";
import { Button } from "@/components/ui/button";

export function MarkNotificationsReadButton({ disabled }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onClick() {
    startTransition(async () => {
      const result = await markAllStudentNotificationsRead();
      if (result?.error) {
        toast.error(result.error);
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
