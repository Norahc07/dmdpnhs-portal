"use client";

import { useState, useTransition } from "react";
import { Info } from "lucide-react";
import { toast } from "sonner";
import { createDocumentRequest } from "@/actions/portal";
import {
  DOCUMENT_TYPE_HELP,
  DOCUMENT_TYPE_INFO,
  DOCUMENT_TYPES,
} from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function DocumentRequestForm({ studentId }) {
  const [documentType, setDocumentType] = useState(DOCUMENT_TYPES[0]);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="space-y-4 rounded-2xl border border-[#800000]/10 bg-white p-4 shadow-[0_12px_28px_-20px_rgba(61,18,18,0.35)] sm:p-5"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(async () => {
          const result = await createDocumentRequest({
            studentId,
            documentType,
            notes: fd.get("notes"),
          });
          if (result.error) toast.error(result.error);
          else {
            toast.success(
              "Request submitted. You will be notified when it is Ready for Pickup."
            );
            e.currentTarget.reset();
            setDocumentType(DOCUMENT_TYPES[0]);
          }
        });
      }}
    >
      <div className="rounded-xl border border-[#800000]/10 bg-linear-to-br from-white to-[#faf7f5] px-3 py-2.5">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-[#800000]/8 text-[#800000]">
            <Info className="size-3.5" aria-hidden />
          </span>
          <div className="min-w-0 space-y-2">
            <p className="text-xs font-medium text-[#3d1212]">
              What you can request
            </p>
            <ul className="space-y-2">
              {DOCUMENT_TYPE_INFO.map((item) => (
                <li key={item.type} className="text-[11px] leading-relaxed">
                  <span className="font-semibold text-[#3d1212]">
                    {item.title}
                  </span>
                  <span className="text-muted-foreground"> — {item.body}</span>
                </li>
              ))}
            </ul>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              After you submit, status is{" "}
              <span className="font-medium text-[#3d1212]">Pending</span>. When
              processing is done, you get an SMS and status becomes{" "}
              <span className="font-medium text-[#3d1212]">Ready for Pickup</span>
              . Claim it at the registrar&apos;s office.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Document type</Label>
        <Select value={documentType} onValueChange={setDocumentType}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DOCUMENT_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
                {DOCUMENT_TYPE_HELP[t] ? ` — ${DOCUMENT_TYPE_HELP[t]}` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {DOCUMENT_TYPE_HELP[documentType] ? (
          <p className="text-[11px] text-muted-foreground">
            {DOCUMENT_TYPE_HELP[documentType]}
          </p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="notes">Reason for request</Label>
        <Textarea
          id="notes"
          name="notes"
          rows={3}
          required
          placeholder="Why do you need this document? (e.g. transfer, scholarship, enrollment)"
        />
      </div>
      <Button
        type="submit"
        disabled={pending}
        className="bg-[#800000] hover:bg-[#6a0000]"
      >
        {pending ? "Submitting…" : "Submit request"}
      </Button>
    </form>
  );
}
