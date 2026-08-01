"use client";

import { useTransition } from "react";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  ClipboardList,
  FileText,
  IdCard,
  Mail,
  ShieldCheck,
  UserPlus,
  Users,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { approveTeacher, updateDocumentRequestStatus } from "@/actions/portal";
import { DOCUMENT_STATUSES } from "@/lib/constants";
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
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#800000]/10 bg-white px-4 py-3 shadow-sm">
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

      <div className="overflow-hidden rounded-xl border border-[#800000]/10 bg-white shadow-sm">
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
  const isEmpty = requests.length === 0;

  function advance(id, status) {
    startTransition(async () => {
      const result = await updateDocumentRequestStatus({ id, status });
      if (result.error) toast.error(result.error);
      else toast.success(`Status → ${status}`);
    });
  }

  function nextStatus(current) {
    const idx = DOCUMENT_STATUSES.indexOf(current);
    return DOCUMENT_STATUSES[Math.min(idx + 1, DOCUMENT_STATUSES.length - 1)];
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#800000]/10 bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-[#800000]/8 text-[#800000]">
            <ClipboardList className="size-5" />
          </span>
          <div>
            <p className="font-heading text-sm font-bold text-[#3d1212]">
              Document pipeline
            </p>
            <p className="text-xs text-muted-foreground">
              Advance each request until it is ready for pickup.
            </p>
          </div>
        </div>
        <Badge
          variant="outline"
          className="border-[#800000]/20 bg-[#800000]/5 font-semibold text-[#800000]"
        >
          {requests.length} request{requests.length === 1 ? "" : "s"}
        </Badge>
      </div>

      <div className="overflow-hidden rounded-xl border border-[#800000]/10 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <Table>
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
                  Pipeline
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isEmpty ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={5} className="h-56 p-0">
                    <div className="flex h-full flex-col items-center justify-center gap-3 px-6 py-10 text-center">
                      <div className="flex size-14 items-center justify-center rounded-2xl bg-[#800000]/8 text-[#800000] ring-1 ring-[#800000]/10">
                        <FileText className="size-7" />
                      </div>
                      <div className="space-y-1">
                        <p className="font-heading text-base font-bold text-[#3d1212]">
                          No document requests yet
                        </p>
                        <p className="max-w-md text-sm text-muted-foreground">
                          When students submit document requests, they will
                          appear here for you to process and release.
                        </p>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center justify-center gap-2 text-[11px] text-muted-foreground">
                        <span className="inline-flex items-center gap-1 rounded-full border border-[#800000]/10 bg-[#800000]/5 px-2.5 py-1">
                          <ClipboardList className="size-3.5 text-[#800000]" />
                          Pending
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full border border-[#800000]/10 bg-[#800000]/5 px-2.5 py-1">
                          Processing
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full border border-[#800000]/10 bg-[#800000]/5 px-2.5 py-1">
                          Ready for pickup
                        </span>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                requests.map((r) => (
                  <TableRow key={r.id} className="hover:bg-[#800000]/2">
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#800000]/10 text-xs font-bold text-[#800000]">
                          {(r.students?.profiles?.first_name || "?").charAt(0)}
                          {(r.students?.profiles?.last_name || "").charAt(0)}
                        </span>
                        <span className="font-medium text-[#3d1212]">
                          {r.students?.profiles?.last_name},{" "}
                          {r.students?.profiles?.first_name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1.5 text-sm">
                        <FileText className="size-3.5 shrink-0 text-[#800000]/70" />
                        {r.document_type}
                      </span>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={r.status} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(r.requested_at).toLocaleString("en-PH")}
                    </TableCell>
                    <TableCell className="text-right">
                      {r.status !== "Ready for Pickup" ? (
                        <Button
                          size="sm"
                          disabled={pending}
                          className="bg-[#800000] hover:bg-[#6a0000]"
                          onClick={() => advance(r.id, nextStatus(r.status))}
                        >
                          Advance to {nextStatus(r.status)}
                          <ArrowRight className="size-3.5" />
                        </Button>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                          <CheckCircle2 className="size-3.5" />
                          Ready
                        </span>
                      )}
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
