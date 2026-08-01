"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  createDepartment,
  updateTeacherFacultyAssignment,
} from "@/actions/grade-workflow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  DEPARTMENT_BANDS,
  FACULTY_POSITIONS,
  FACULTY_POSITION_LABELS,
} from "@/lib/grade-workflow";
import { STATUS_BADGE_STYLES } from "@/lib/constants";

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-transparent pl-3 pr-9 text-sm";

export function FacultyDirectory({
  teachers = [],
  departments = [],
  assignmentsByTeacher = {},
}) {
  const [deptList, setDeptList] = useState(departments);
  const [rows, setRows] = useState(teachers);
  const [modal, setModal] = useState(null); // assign | department
  const [selected, setSelected] = useState(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const bandLabel = useMemo(
    () => Object.fromEntries(DEPARTMENT_BANDS.map((b) => [b.value, b.label])),
    []
  );

  function openAssign(teacher) {
    setSelected(teacher);
    setError("");
    setModal("assign");
  }

  function saveAssign(e) {
    e.preventDefault();
    setError("");
    const fd = Object.fromEntries(new FormData(e.currentTarget));
    startTransition(async () => {
      const result = await updateTeacherFacultyAssignment({
        teacherId: selected.id,
        departmentId: fd.departmentId || null,
        facultyPosition: fd.facultyPosition,
        facultyDept: fd.facultyDept,
      });
      if (result?.error) {
        setError(result.error);
        toast.error(result.error);
        return;
      }
      const dept = deptList.find((d) => d.id === fd.departmentId);
      setRows((list) =>
        list.map((t) =>
          t.id === selected.id
            ? {
                ...t,
                department_id: fd.departmentId || null,
                faculty_position: fd.facultyPosition,
                faculty_dept: fd.facultyDept || null,
                departments: dept || null,
              }
            : t
        )
      );
      toast.success("Faculty assignment updated.");
      setModal(null);
    });
  }

  function saveDepartment(e) {
    e.preventDefault();
    setError("");
    const fd = Object.fromEntries(new FormData(e.currentTarget));
    startTransition(async () => {
      const result = await createDepartment(fd);
      if (result?.error) {
        setError(result.error);
        toast.error(result.error);
        return;
      }
      toast.success("Department created. Refresh if it does not appear yet.");
      setModal(null);
      // Soft-add local row
      setDeptList((list) => [
        ...list,
        {
          id: `temp-${Date.now()}`,
          name: fd.name,
          band: fd.band,
          description: fd.description || null,
        },
      ]);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Assign each teacher to a department and position. Department heads see
          Grade validation in their teacher portal.
        </p>
        <Button
          type="button"
          variant="outline"
          className="border-[#800000]/20 text-[#800000]"
          onClick={() => {
            setError("");
            setModal("department");
          }}
        >
          Add department
        </Button>
      </div>

      {deptList.length ? (
        <div className="flex flex-wrap gap-2">
          {deptList.map((d) => (
            <Badge
              key={d.id}
              variant="outline"
              className="border-[#800000]/15 text-[#3d1212]"
            >
              {d.name} · {bandLabel[d.band] || d.band}
            </Badge>
          ))}
        </div>
      ) : (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          No departments yet. Run{" "}
          <code className="text-xs">supabase/grade-validation-upgrade.sql</code>{" "}
          or add one here.
        </p>
      )}

      <div className="overflow-x-auto rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Teacher ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Position</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Sections / subjects</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-muted-foreground">
                  No teachers yet.
                </TableCell>
              </TableRow>
            )}
            {rows.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="font-mono text-xs font-semibold">
                  {t.teacher_id}
                </TableCell>
                <TableCell>
                  {t.profiles?.first_name} {t.profiles?.last_name}
                </TableCell>
                <TableCell>
                  {t.departments?.name || t.faculty_dept || "—"}
                  {t.departments?.band ? (
                    <span className="block text-[11px] text-muted-foreground">
                      {bandLabel[t.departments.band] || t.departments.band}
                    </span>
                  ) : null}
                </TableCell>
                <TableCell>
                  {FACULTY_POSITION_LABELS[t.faculty_position] ||
                    "Regular teacher"}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={STATUS_BADGE_STYLES[t.profiles?.status] || ""}
                  >
                    {t.profiles?.status}
                  </Badge>
                </TableCell>
                <TableCell className="max-w-md text-xs text-muted-foreground">
                  {(assignmentsByTeacher[t.id] || []).join(" · ") ||
                    "No assignments"}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="border-[#800000]/20 text-[#800000]"
                    onClick={() => openAssign(t)}
                  >
                    Assign
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog
        open={modal !== null}
        onOpenChange={(open) => {
          if (!open) setModal(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          {modal === "assign" && selected ? (
            <>
              <DialogHeader>
                <DialogTitle>Faculty assignment</DialogTitle>
                <DialogDescription>
                  {selected.profiles?.first_name} {selected.profiles?.last_name}{" "}
                  ({selected.teacher_id})
                </DialogDescription>
              </DialogHeader>
              <form className="space-y-3" onSubmit={saveAssign}>
                <div className="space-y-1.5">
                  <Label>Department</Label>
                  <select
                    name="departmentId"
                    defaultValue={selected.department_id || ""}
                    className={selectClass}
                  >
                    <option value="">— Unassigned —</option>
                    {deptList.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({bandLabel[d.band] || d.band})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>Position</Label>
                  <select
                    name="facultyPosition"
                    defaultValue={selected.faculty_position || "teacher"}
                    className={selectClass}
                  >
                    {FACULTY_POSITIONS.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground">
                    Department heads get a Grade validation queue for teachers in
                    the same department.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label>Legacy department label (optional)</Label>
                  <Input
                    name="facultyDept"
                    defaultValue={selected.faculty_dept || ""}
                    placeholder="e.g. Filipino"
                  />
                </div>
                {error ? <p className="text-sm text-rose-700">{error}</p> : null}
                <DialogFooter>
                  <DialogClose
                    render={<Button type="button" variant="outline" />}
                  >
                    Cancel
                  </DialogClose>
                  <Button
                    type="submit"
                    disabled={pending}
                    className="bg-[#800000] hover:bg-[#6a0000]"
                  >
                    {pending ? "Saving…" : "Save assignment"}
                  </Button>
                </DialogFooter>
              </form>
            </>
          ) : null}

          {modal === "department" ? (
            <>
              <DialogHeader>
                <DialogTitle>Add department</DialogTitle>
                <DialogDescription>
                  Example: Filipino · Junior High — groups subject teachers for
                  grade reading.
                </DialogDescription>
              </DialogHeader>
              <form className="space-y-3" onSubmit={saveDepartment}>
                <div className="space-y-1.5">
                  <Label>Name</Label>
                  <Input name="name" required placeholder="e.g. Filipino" />
                </div>
                <div className="space-y-1.5">
                  <Label>Level band</Label>
                  <select name="band" defaultValue="jhs" className={selectClass}>
                    {DEPARTMENT_BANDS.map((b) => (
                      <option key={b.value} value={b.value}>
                        {b.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>Description (optional)</Label>
                  <Input
                    name="description"
                    placeholder="Junior High Filipino teachers"
                  />
                </div>
                {error ? <p className="text-sm text-rose-700">{error}</p> : null}
                <DialogFooter>
                  <DialogClose
                    render={<Button type="button" variant="outline" />}
                  >
                    Cancel
                  </DialogClose>
                  <Button
                    type="submit"
                    disabled={pending}
                    className="bg-[#800000] hover:bg-[#6a0000]"
                  >
                    {pending ? "Saving…" : "Create department"}
                  </Button>
                </DialogFooter>
              </form>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
