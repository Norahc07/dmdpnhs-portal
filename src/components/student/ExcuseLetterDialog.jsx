"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { FileUp } from "lucide-react";
import { submitExcuseLetter } from "@/actions/attendance";
import { EXCUSE_REASON_TYPES } from "@/lib/attendance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function ExcuseLetterDialog({
  open,
  onOpenChange,
  attendance,
}) {
  const [reasonType, setReasonType] = useState(EXCUSE_REASON_TYPES[0]);
  const [pending, startTransition] = useTransition();

  if (!attendance) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="gap-0 overflow-hidden rounded-2xl border border-[#800000]/10 bg-white p-0 text-[#3d1212] shadow-[0_12px_28px_-20px_rgba(61,18,18,0.35)] ring-0 sm:max-w-md"
        showCloseButton
      >
        <DialogHeader className="portal-panel-head space-y-1.5 px-4 py-4 text-left sm:px-5">
          <DialogTitle className="font-heading text-base font-bold text-[#3d1212]">
            Submit excuse letter
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            For {attendance.subjectName || "this period"} on {attendance.date}.
            Your teacher can approve this to mark the absence as excused.
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-3 px-4 py-4 sm:px-5"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            fd.set("reasonType", reasonType);
            startTransition(async () => {
              const result = await submitExcuseLetter(attendance.id, fd);
              if (result?.error) {
                toast.error(result.error);
                return;
              }
              toast.success("Excuse letter submitted for review.");
              onOpenChange(false);
            });
          }}
        >
          <div className="space-y-1.5">
            <Label>Reason</Label>
            <Select value={reasonType} onValueChange={setReasonType}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EXCUSE_REASON_TYPES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="explanation">Explanation</Label>
            <Textarea
              id="explanation"
              name="explanation"
              required
              rows={4}
              placeholder="Briefly explain why you were absent…"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="file">Medical certificate / signed note</Label>
            <div className="flex items-center gap-2 rounded-lg border border-dashed border-[#800000]/20 bg-[#faf7f5] px-3 py-2">
              <FileUp className="size-4 shrink-0 text-[#800000]" aria-hidden />
              <Input
                id="file"
                name="file"
                type="file"
                accept=".pdf,image/jpeg,image/png,image/webp"
                className="border-0 bg-transparent p-0 shadow-none file:mr-2"
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              Optional. PDF or image, max 5 MB.
            </p>
          </div>

          <DialogFooter className="px-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={pending}
              className="bg-[#800000] hover:bg-[#6a0000]"
            >
              {pending ? "Submitting…" : "Submit excuse"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
