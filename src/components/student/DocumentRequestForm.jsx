"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { createDocumentRequest } from "@/actions/portal";
import { DOCUMENT_TYPES } from "@/lib/constants";
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
      className="space-y-3 rounded-xl border border-[#800000]/10 bg-white p-4"
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
            toast.success("Document request submitted");
            e.currentTarget.reset();
          }
        });
      }}
    >
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
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="notes">Notes (optional)</Label>
        <Textarea id="notes" name="notes" rows={3} placeholder="Purpose / pickup notes" />
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
