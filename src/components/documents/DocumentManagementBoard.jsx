"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  getRequiredDocumentUrl,
  reviewRequiredDocument,
} from "@/actions/student-documents";
import { StatusBadge } from "@/components/layout/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  DOCUMENT_SUBMISSION_STATUSES,
  documentStatusLabel,
} from "@/lib/student-documents";
import { cn } from "@/lib/utils";

export function DocumentManagementBoard({
  learners = [],
  counts = {},
  hint = "",
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [openId, setOpenId] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return learners.filter((learner) => {
      const matchesQuery =
        !q ||
        learner.name.toLowerCase().includes(q) ||
        String(learner.lrn).toLowerCase().includes(q) ||
        learner.sectionLabel.toLowerCase().includes(q);
      if (!matchesQuery) return false;
      if (filter === "all") return true;
      return learner.documents.some((doc) => doc.status === filter);
    });
  }, [learners, query, filter]);

  return (
    <section className="overflow-hidden rounded-2xl border border-[#800000]/10 bg-white shadow-[0_12px_28px_-20px_rgba(61,18,18,0.35)]">
      <div className="portal-panel-head px-4 py-4 sm:px-5">
        <p className="text-xs font-semibold tracking-[0.16em] text-[#800000] uppercase">
          Required documents
        </p>
        <h3 className="mt-1 font-heading text-lg font-bold text-[#3d1212]">
          Review learner uploads
        </h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Submitted, under review, approved, needs revision, or not submitted.
        </p>
      </div>

      {hint ? (
        <p className="mx-4 mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 sm:mx-5">
          {hint}
        </p>
      ) : null}

      <div className="grid gap-2 px-4 py-4 sm:grid-cols-5 sm:px-5">
        {DOCUMENT_SUBMISSION_STATUSES.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(filter === key ? "all" : key)}
            className={cn(
              "rounded-xl border px-3 py-2.5 text-left transition",
              filter === key
                ? "border-[#800000] bg-[#800000]/6"
                : "border-[#800000]/10 bg-[#faf7f5] hover:border-[#800000]/25"
            )}
          >
            <p className="text-[11px] font-medium tracking-wide text-[#800000]/75 uppercase">
              {documentStatusLabel(key)}
            </p>
            <p className="mt-1 font-heading text-lg font-bold text-[#3d1212]">
              {counts[key] || 0}
            </p>
          </button>
        ))}
      </div>

      <div className="px-4 pb-4 sm:px-5">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, LRN, or section"
        />
      </div>

      <div className="divide-y divide-[#800000]/08 border-t border-[#800000]/10">
        {filtered.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground sm:px-5">
            No learners match this filter yet.
          </p>
        ) : (
          filtered.map((learner) => (
            <LearnerRow
              key={learner.studentId}
              learner={learner}
              openId={openId}
              setOpenId={setOpenId}
            />
          ))
        )}
      </div>
    </section>
  );
}

function LearnerRow({ learner, openId, setOpenId }) {
  return (
    <div className="px-4 py-4 sm:px-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-heading text-sm font-bold text-[#3d1212]">
            {learner.name}
          </p>
          <p className="text-xs text-muted-foreground">
            LRN {learner.lrn} · {learner.sectionLabel}
          </p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {learner.documents.map((doc) => {
          const active = openId === `${learner.studentId}:${doc.docKey}`;
          return (
            <button
              key={doc.docKey}
              type="button"
              onClick={() =>
                setOpenId(active ? "" : `${learner.studentId}:${doc.docKey}`)
              }
              className={cn(
                "rounded-full border px-2.5 py-1 text-left text-[11px] transition",
                active
                  ? "border-[#800000] bg-[#800000]/8"
                  : "border-[#800000]/12 hover:border-[#800000]/30"
              )}
            >
              <span className="font-semibold text-[#3d1212]">{doc.label}</span>
              <span className="ml-1.5 text-muted-foreground">
                {doc.statusLabel}
              </span>
            </button>
          );
        })}
      </div>
      {learner.documents.map((doc) =>
        openId === `${learner.studentId}:${doc.docKey}` ? (
          <ReviewPanel key={doc.docKey} doc={doc} />
        ) : null
      )}
    </div>
  );
}

function ReviewPanel({ doc }) {
  const [pending, startTransition] = useTransition();
  const [notes, setNotes] = useState(doc.reviewerNotes || "");

  function act(status) {
    if (!doc.id) {
      toast.error("This file has not been submitted yet.");
      return;
    }
    startTransition(async () => {
      const result = await reviewRequiredDocument({
        id: doc.id,
        status,
        notes,
      });
      if (result?.error) toast.error(result.error);
      else toast.success(`${doc.label} marked ${documentStatusLabel(status)}.`);
    });
  }

  function openFile() {
    if (!doc.id) return;
    startTransition(async () => {
      const result = await getRequiredDocumentUrl(doc.id);
      if (result?.error) toast.error(result.error);
      else if (result?.url) window.open(result.url, "_blank", "noopener,noreferrer");
    });
  }

  return (
    <div className="mt-3 rounded-xl border border-[#800000]/10 bg-[#faf7f5] p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-[#3d1212]">{doc.label}</p>
          <p className="text-xs text-muted-foreground">{doc.description}</p>
        </div>
        <StatusBadge status={doc.statusLabel} />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {doc.fileName ? (
          <Button type="button" size="sm" variant="outline" onClick={openFile} disabled={pending}>
            View file
          </Button>
        ) : (
          <p className="text-xs text-muted-foreground">Not submitted.</p>
        )}
        <span className="text-[11px] text-muted-foreground">{doc.fileName || ""}</span>
      </div>
      {doc.id ? (
        <>
          <Textarea
            className="mt-3 bg-white"
            rows={2}
            placeholder="Review note (required for Needs Revision)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <div className="mt-2 flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => act("under_review")}
            >
              Under Review
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={pending}
              className="bg-emerald-700 hover:bg-emerald-800"
              onClick={() => act("approved")}
            >
              Approved
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={pending}
              className="border-rose-200 text-rose-800 hover:bg-rose-50"
              onClick={() => act("needs_revision")}
            >
              Needs Revision
            </Button>
          </div>
        </>
      ) : null}
    </div>
  );
}
