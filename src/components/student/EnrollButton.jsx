"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { enrollCurrentSemester } from "@/actions/student";
import { Button } from "@/components/ui/button";

export function EnrollButton({ enrolled }) {
  const [pending, startTransition] = useTransition();

  // Status text already covers "Officially Enrolled" — no duplicate button
  if (enrolled) return null;

  return (
    <Button
      type="button"
      disabled={pending}
      className="relative h-10 overflow-hidden bg-[#ffd700] px-5 font-semibold text-[#4a0000] shadow-lg shadow-black/20 hover:bg-[#ffe44d]"
      onClick={() => {
        startTransition(async () => {
          const result = await enrollCurrentSemester();
          if (result.error) toast.error(result.error);
          else toast.success("You are now officially enrolled.");
        });
      }}
    >
      <span className="pointer-events-none absolute inset-0 portal-cta-shine opacity-40" />
      {pending ? "Enrolling…" : "Enroll Now"}
    </Button>
  );
}
