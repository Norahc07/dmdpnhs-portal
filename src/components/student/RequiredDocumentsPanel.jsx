"use client";

import { useRef, useState, useTransition } from "react";
import { FileUp, Upload } from "lucide-react";
import { toast } from "sonner";
import {
  getRequiredDocumentUrl,
  uploadRequiredDocument,
} from "@/actions/student-documents";
import { StatusBadge } from "@/components/layout/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  DOCUMENT_SUBMISSION_STATUSES,
  canStudentReplaceDocument,
  documentStatusLabel,
} from "@/lib/student-documents";
import { cn } from "@/lib/utils";

function countByStatus(items) {
  const counts = Object.fromEntries(
    DOCUMENT_SUBMISSION_STATUSES.map((key) => [key, 0])
  );
  for (const item of items) {
    if (counts[item.status] != null) counts[item.status] += 1;
  }
  return counts;
}

export function RequiredDocumentsPanel({ items = [], hint = "" }) {
  const counts = countByStatus(items);

  return (
    <section className="space-y-4">
      {hint ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          {hint}
        </p>
      ) : null}

      <div className="grid gap-2 sm:grid-cols-5">
        {DOCUMENT_SUBMISSION_STATUSES.map((key) => (
          <div
            key={key}
            className="rounded-xl border border-[#800000]/10 bg-white px-3 py-2.5 shadow-[0_10px_24px_-20px_rgba(61,18,18,0.35)]"
          >
            <p className="text-[11px] font-medium tracking-wide text-[#800000]/75 uppercase">
              {documentStatusLabel(key)}
            </p>
            <p className="mt-1 font-heading text-xl font-bold text-[#3d1212]">
              {counts[key] || 0}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {items.map((item) => (
          <DocumentUploadCard key={item.docKey} item={item} />
        ))}
      </div>
    </section>
  );
}

function DocumentUploadCard({ item }) {
  const inputRef = useRef(null);
  const [pending, startTransition] = useTransition();
  const [opening, setOpening] = useState(false);
  const canUpload = canStudentReplaceDocument(item.status);

  function onFile(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const fd = new FormData();
    fd.set("docKey", item.docKey);
    fd.set("file", file);
    startTransition(async () => {
      const result = await uploadRequiredDocument(fd);
      if (result?.error) toast.error(result.error);
      else toast.success(`${item.label} uploaded.`);
    });
  }

  function openFile() {
    if (!item.id) return;
    setOpening(true);
    startTransition(async () => {
      const result = await getRequiredDocumentUrl(item.id);
      setOpening(false);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      if (result?.url) window.open(result.url, "_blank", "noopener,noreferrer");
    });
  }

  return (
    <article
      className={cn(
        "flex flex-col rounded-2xl border bg-white p-4 shadow-[0_12px_28px_-20px_rgba(61,18,18,0.35)]",
        item.status === "needs_revision"
          ? "border-rose-200"
          : "border-[#800000]/10"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold tracking-[0.14em] text-[#800000] uppercase">
            {item.required ? "Required" : "If applicable"}
          </p>
          <h3 className="mt-1 font-heading text-sm font-bold text-[#3d1212]">
            {item.label}
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {item.description}
          </p>
        </div>
        <StatusBadge status={item.statusLabel} />
      </div>

      <div className="mt-3 rounded-xl border border-[#800000]/08 bg-[#faf7f5] px-3 py-2.5 text-xs">
        {item.fileName ? (
          <button
            type="button"
            onClick={openFile}
            disabled={opening || pending}
            className="font-medium text-[#800000] underline-offset-2 hover:underline"
          >
            {opening ? "Opening…" : item.fileName}
          </button>
        ) : (
          <span className="text-muted-foreground">No file uploaded yet.</span>
        )}
        {item.reviewerNotes ? (
          <p className="mt-2 text-[#3d1212]">
            <span className="font-semibold">Review note: </span>
            {item.reviewerNotes}
          </p>
        ) : null}
      </div>

      <div className="mt-auto flex items-center gap-2 pt-3">
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={onFile}
        />
        <Button
          type="button"
          size="sm"
          disabled={!canUpload || pending}
          className="bg-[#800000] hover:bg-[#6a0000]"
          onClick={() => inputRef.current?.click()}
        >
          {pending ? (
            "Uploading…"
          ) : (
            <>
              {item.fileName ? <Upload className="size-3.5" /> : <FileUp className="size-3.5" />}
              {item.fileName ? "Replace file" : "Upload file"}
            </>
          )}
        </Button>
        {!canUpload ? (
          <p className="text-[11px] text-muted-foreground">
            Locked while {item.statusLabel.toLowerCase()}.
          </p>
        ) : (
          <p className="text-[11px] text-muted-foreground">PDF, JPG, PNG, or WebP · 8 MB</p>
        )}
      </div>
    </article>
  );
}
