"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { promoteStudents, transferSection } from "@/actions/portal";
import { GRADE_LEVELS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/layout/StatusBadge";

export function PromotionPanel({ students, sections }) {
  const [selected, setSelected] = useState([]);
  const [gradeLevel, setGradeLevel] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [status, setStatus] = useState("promoted");
  const [pending, startTransition] = useTransition();

  const filteredSections = useMemo(() => {
    if (!gradeLevel) return sections;
    return sections.filter((s) => String(s.grade_level) === String(gradeLevel));
  }, [sections, gradeLevel]);

  const gradeItems = GRADE_LEVELS.map((g) => ({
    value: String(g),
    label: `Grade ${g}`,
  }));
  const sectionItems = filteredSections.map((s) => ({
    value: s.id,
    label: `G${s.grade_level} - ${s.section_name}`,
  }));

  function toggle(id) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function toggleAll() {
    if (selected.length === students.length) setSelected([]);
    else setSelected(students.map((s) => s.id));
  }

  function runPromote() {
    if (!selected.length) {
      toast.error("Select at least one student");
      return;
    }
    startTransition(async () => {
      const result = await promoteStudents({
        studentIds: selected,
        newGradeLevel: gradeLevel || undefined,
        newSectionId: sectionId || undefined,
        status,
      });
      if (result.error) toast.error(result.error);
      else {
        toast.success("Batch update applied");
        setSelected([]);
      }
    });
  }

  function runTransfer() {
    if (!selected.length || !sectionId) {
      toast.error("Select students and a target section");
      return;
    }
    startTransition(async () => {
      const result = await transferSection({
        studentIds: selected,
        sectionId,
      });
      if (result.error) toast.error(result.error);
      else {
        toast.success("Section transfer complete");
        setSelected([]);
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 rounded-xl border border-[#800000]/10 bg-white p-4 md:grid-cols-4">
        <div className="space-y-1.5">
          <Label>New grade level</Label>
          <Select items={gradeItems} value={gradeLevel} onValueChange={setGradeLevel}>
            <SelectTrigger>
              <SelectValue placeholder="Keep current" />
            </SelectTrigger>
            <SelectContent>
              {gradeItems.map((g) => (
                <SelectItem key={g.value} value={g.value}>
                  {g.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Target section</Label>
          <Select items={sectionItems} value={sectionId} onValueChange={setSectionId}>
            <SelectTrigger>
              <SelectValue placeholder="Select section" />
            </SelectTrigger>
            <SelectContent>
              {sectionItems.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Status</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {["promoted", "enrolled", "retained", "remedial"].map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end gap-2">
          <Button
            disabled={pending}
            className="bg-[#800000] hover:bg-[#6a0000]"
            onClick={runPromote}
          >
            Promote / Update
          </Button>
          <Button disabled={pending} variant="outline" onClick={runTransfer}>
            Transfer
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-[#800000]/10 bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-[#800000]/5">
              <TableHead>
                <input
                  type="checkbox"
                  checked={
                    students.length > 0 && selected.length === students.length
                  }
                  onChange={toggleAll}
                />
              </TableHead>
              <TableHead>Name</TableHead>
              <TableHead>LRN</TableHead>
              <TableHead>Grade</TableHead>
              <TableHead>Section</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.map((s) => (
              <TableRow key={s.id}>
                <TableCell>
                  <input
                    type="checkbox"
                    checked={selected.includes(s.id)}
                    onChange={() => toggle(s.id)}
                  />
                </TableCell>
                <TableCell className="font-medium">
                  {s.profiles?.last_name}, {s.profiles?.first_name}
                </TableCell>
                <TableCell>{s.lrn}</TableCell>
                <TableCell>{s.grade_level}</TableCell>
                <TableCell>{s.sections?.section_name || "—"}</TableCell>
                <TableCell>
                  <StatusBadge status={s.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
