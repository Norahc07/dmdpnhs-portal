"use client";

import { useMemo, useState, useTransition } from "react";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  ClipboardList,
  FileText,
  IdCard,
  Mail,
  PackageCheck,
  ShieldCheck,
  UserPlus,
  Users,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { approveTeacher, updateDocumentRequestStatus } from "@/actions/portal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/layout/StatusBadge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export function PendingTeachersTable({ teachers = [] }) {
  const [pending, startTransition] = useTransition();
  const isEmpty = teachers.length === 0;

  function act(profileId, approve) {
    startTransition(async () => {
      const result = await approveTeacher({
        teacherProfileId: profileId,
        approve,
      });
      if (result.error) toast.error(result.error);
      else toast.success(approve ? "Teacher approved" : "Registration rejected");
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#800000]/10 bg-white px-4 py-3 shadow-[0_12px_28px_-20px_rgba(61,18,18,0.35)]">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-[#800000]/8 text-[#800000]">
            <UserPlus className="size-5" />
          </span>
          <div>
            <p className="font-heading text-sm font-bold text-[#3d1212]">
              Pending faculty
            </p>
            <p className="text-xs text-muted-foreground">
              Review registrations before granting teacher portal access.
            </p>
          </div>
        </div>
        <Badge
          variant="outline"
          className="border-[#800000]/20 bg-[#800000]/5 font-semibold text-[#800000]"
        >
          {teachers.length} awaiting
        </Badge>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#800000]/10 bg-white shadow-[0_12px_28px_-20px_rgba(61,18,18,0.35)]">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#800000]/3 hover:bg-[#800000]/3">
                <TableHead className="font-semibold text-[#3d1212]">
                  Name
                </TableHead>
                <TableHead className="font-semibold text-[#3d1212]">
                  Teacher ID
                </TableHead>
                <TableHead className="font-semibold text-[#3d1212]">
                  Department
                </TableHead>
                <TableHead className="font-semibold text-[#3d1212]">
                  Email
                </TableHead>
                <TableHead className="text-right font-semibold text-[#3d1212]">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isEmpty ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={5} className="h-56 p-0">
                    <div className="flex h-full flex-col items-center justify-center gap-3 px-6 py-10 text-center">
                      <div className="flex size-14 items-center justify-center rounded-2xl bg-[#800000]/8 text-[#800000] ring-1 ring-[#800000]/10">
                        <Users className="size-7" />
                      </div>
                      <div className="space-y-1">
                        <p className="font-heading text-base font-bold text-[#3d1212]">
                          No pending faculty registrations
                        </p>
                        <p className="max-w-md text-sm text-muted-foreground">
                          When teachers finish registration, their requests will
                          appear here for you to approve or reject.
                        </p>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center justify-center gap-2 text-[11px] text-muted-foreground">
                        <span className="inline-flex items-center gap-1 rounded-full border border-[#800000]/10 bg-[#800000]/5 px-2.5 py-1">
                          <IdCard className="size-3.5 text-[#800000]" />
                          Register first
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full border border-[#800000]/10 bg-[#800000]/5 px-2.5 py-1">
                          <ShieldCheck className="size-3.5 text-[#800000]" />
                          Then approve
                        </span>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                teachers.map((t) => (
                  <TableRow key={t.id} className="hover:bg-[#800000]/2">
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#800000]/10 text-xs font-bold text-[#800000]">
                          {(t.profiles?.first_name || "?").charAt(0)}
                          {(t.profiles?.last_name || "").charAt(0)}
                        </span>
                        <span className="font-medium text-[#3d1212]">
                          {t.profiles?.last_name}, {t.profiles?.first_name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs font-semibold">
                      {t.teacher_id}
                    </TableCell>
                    <TableCell className="text-sm">
                      <span className="inline-flex items-center gap-1.5">
                        <Building2 className="size-3.5 shrink-0 text-[#800000]/70" />
                        {t.faculty_dept || "—"}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <Mail className="size-3.5 shrink-0 text-[#800000]/70" />
                        {t.profiles?.email || "—"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex gap-2">
                        <Button
                          size="sm"
                          disabled={pending}
                          className="bg-[#800000] hover:bg-[#6a0000]"
                          onClick={() => act(t.profile_id, true)}
                        >
                          <CheckCircle2 className="size-3.5" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={pending}
                          className="border-rose-200 text-rose-700 hover:bg-rose-50"
                          onClick={() => act(t.profile_id, false)}
                        >
                          <XCircle className="size-3.5" />
                          Reject
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

export function DocumentRequestsAdmin({ requests = [] }) {
  const [pending, startTransition] = useTransition();
  const [tab, setTab] = useState("pending"); // pending | ready | claimed

  const buckets = useMemo(() => {
    const pendingRows = [];
    const readyRows = [];
    const claimedRows = [];
    for (const r of requests) {
      if (r.status === "Already Claimed") claimedRows.push(r);
      else if (r.status === "Ready for Pickup") readyRows.push(r);
      else pendingRows.push(r);
    }
    return { pending: pendingRows, ready: readyRows, claimed: claimedRows };
  }, [requests]);

  const tabs = [
    {
      key: "pending",
      label: "Pending",
      hint: "In pipeline",
      count: buckets.pending.length,
    },
    {
      key: "ready",
      label: "Ready for Pickup",
      hint: "Awaiting claim",
      count: buckets.ready.length,
    },
    {
      key: "claimed",
      label: "Already Claimed",
      hint: "Released",
      count: buckets.claimed.length,
    },
  ];

  const rows =
    tab === "ready"
      ? buckets.ready
      : tab === "claimed"
        ? buckets.claimed
        : buckets.pending;

  function advance(id, status) {
    startTransition(async () => {
      const result = await updateDocumentRequestStatus({ id, status });
      if (result.error) toast.error(result.error);
      else toast.success(`Status → ${status}`);
    });
  }

  return (
    <div className="space-y-4 rounded-2xl border border-[#800000]/10 bg-white p-4 shadow-[0_12px_28px_-20px_rgba(61,18,18,0.35)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-[#800000]/8 text-[#800000]">
            <ClipboardList className="size-5" />
          </span>
          <div>
            <p className="font-heading text-sm font-bold text-[#3d1212]">
              Document pipeline
            </p>
            <p className="text-xs text-muted-foreground">
              Pending → Ready for Pickup (SMS) → Already Claimed
            </p>
          </div>
        </div>
        <Badge
          variant="outline"
          className="border-[#800000]/20 bg-[#800000]/5 font-semibold text-[#800000]"
        >
          {requests.length} total
        </Badge>
      </div>

      <div className="grid grid-cols-3 gap-0 border-b border-[#800000]/15">
        {tabs.map((item) => {
          const active = tab === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setTab(item.key)}
              className={cn(
                "relative -mb-px flex w-full min-w-0 items-center justify-center gap-1.5 border-b-[3px] px-1 py-2.5 text-sm transition-colors sm:px-3",
                active
                  ? "border-[#800000] font-bold text-[#800000]"
                  : "border-transparent font-medium text-muted-foreground hover:border-[#800000]/30 hover:text-[#5c2a2a]"
              )}
            >
              <span className="flex min-w-0 flex-col items-center leading-tight sm:flex-row sm:gap-1.5">
                <span className="truncate">{item.label}</span>
                <span className="hidden truncate text-[11px] font-normal text-muted-foreground sm:inline">
                  · {item.hint}
                </span>
              </span>
              <span
                className={cn(
                  "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums",
                  active
                    ? "bg-[#800000]/10 text-[#800000] ring-1 ring-[#800000]/12"
                    : "bg-muted font-semibold text-muted-foreground"
                )}
              >
                {item.count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="overflow-x-auto rounded-lg border border-[#800000]/10">
        <Table className="table-fixed w-full min-w-[40rem]">
          <colgroup>
            <col className="w-[32%]" />
            <col className="w-[18%]" />
            <col className="w-[18%]" />
            <col className="w-[18%]" />
            <col className="w-[14%]" />
          </colgroup>
          <TableHeader>
            <TableRow className="bg-[#800000]/3 hover:bg-[#800000]/3">
              <TableHead className="font-semibold text-[#3d1212]">
                Learner
              </TableHead>
              <TableHead className="font-semibold text-[#3d1212]">
                Document
              </TableHead>
              <TableHead className="font-semibold text-[#3d1212]">
                Status
              </TableHead>
              <TableHead className="font-semibold text-[#3d1212]">
                Requested
              </TableHead>
              <TableHead className="text-right font-semibold text-[#3d1212]">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={5} className="h-48 p-0">
                  <div className="flex h-full flex-col items-center justify-center gap-3 px-6 py-10 text-center">
                    <div className="flex size-14 items-center justify-center rounded-2xl bg-[#800000]/8 text-[#800000] ring-1 ring-[#800000]/10">
                      {tab === "claimed" ? (
                        <PackageCheck className="size-7" />
                      ) : (
                        <FileText className="size-7" />
                      )}
                    </div>
                    <div className="space-y-1">
                      <p className="font-heading text-base font-bold text-[#3d1212]">
                        {tab === "pending"
                          ? "No pending requests"
                          : tab === "ready"
                            ? "Nothing ready for pickup"
                            : "No claimed documents yet"}
                      </p>
                      <p className="max-w-md text-sm text-muted-foreground">
                        {tab === "pending"
                          ? "New SF9, SF10, and Good Moral requests will appear here."
                          : tab === "ready"
                            ? "Mark pending requests as Ready for Pickup to fill this tab."
                            : "Mark ready documents as Already Claimed after the learner picks them up."}
                      </p>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => (
                <TableRow key={r.id} className="hover:bg-[#800000]/2">
                  <TableCell>
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#800000]/10 text-xs font-bold text-[#800000]">
                        {(r.students?.profiles?.first_name || "?").charAt(0)}
                        {(r.students?.profiles?.last_name || "").charAt(0)}
                      </span>
                      <span className="truncate font-medium text-[#3d1212]">
                        {r.students?.profiles?.last_name},{" "}
                        {r.students?.profiles?.first_name}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex max-w-full items-center gap-1.5 truncate text-sm">
                      <FileText className="size-3.5 shrink-0 text-[#800000]/70" />
                      <span className="truncate">{r.document_type}</span>
                    </span>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={r.status} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    <span className="block truncate">
                      {new Date(r.requested_at).toLocaleString("en-PH")}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    {r.status === "Ready for Pickup" ? (
                      <Button
                        size="sm"
                        disabled={pending}
                        variant="outline"
                        className="border-emerald-200 text-emerald-800 hover:bg-emerald-50"
                        onClick={() => advance(r.id, "Already Claimed")}
                      >
                        Mark claimed
                        <PackageCheck className="size-3.5" />
                      </Button>
                    ) : r.status === "Already Claimed" ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-sky-700">
                        <CheckCircle2 className="size-3.5" />
                        Claimed
                      </span>
                    ) : (
                      <Button
                        size="sm"
                        disabled={pending}
                        className="bg-[#800000] hover:bg-[#6a0000]"
                        onClick={() => advance(r.id, "Ready for Pickup")}
                      >
                        Ready for Pickup
                        <ArrowRight className="size-3.5" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
