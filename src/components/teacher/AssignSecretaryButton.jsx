"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { setSectionSecretary } from "@/actions/class-secretary";
import { Button } from "@/components/ui/button";

export function AssignSecretaryButton({
  sectionId,
  studentId,
  isSecretary,
}) {
  const [pending, startTransition] = useTransition();

  function onClick() {
    startTransition(async () => {
      const result = await setSectionSecretary({
        sectionId,
        studentId: isSecretary ? null : studentId,
      });
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success(
        isSecretary
          ? "Class secretary access removed."
          : "Class secretary appointed. That student can record and update attendance for this section only."
      );
    });
  }

  return (
    <Button
      type="button"
      size="xs"
      variant={isSecretary ? "outline" : "default"}
      disabled={pending}
      onClick={onClick}
      className={
        isSecretary
          ? "border-[#800000]/20 text-[#800000]"
          : "bg-[#800000] text-white hover:bg-[#6a0000]"
      }
    >
      {pending
        ? "Saving…"
        : isSecretary
          ? "Remove access"
          : "Make secretary"}
    </Button>
  );
}
