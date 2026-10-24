"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  createTeacherCalendarEvent,
  deleteTeacherCalendarEvent,
} from "@/actions/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { sectionLabel } from "@/lib/announcements";
import { styleForEventType } from "@/lib/portal-calendar";
import { cn } from "@/lib/utils";

const TYPE_OPTIONS = [
  { value: "activity", label: "School activity" },
  { value: "exam", label: "Examination" },
  { value: "assignment", label: "Assignment" },
  { value: "school_event", label: "Class / school event" },
];

export function TeacherClassEventManager({ sections = [], managedEvents = [] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [eventType, setEventType] = useState("activity");
  const [eventDate, setEventDate] = useState("");
  const [description, setDescription] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [sectionId, setSectionId] = useState(sections[0]?.id || "");

  const uniqueManaged = useMemo(() => {
    const seen = new Set();
    return managedEvents.filter((event) => {
      const key = event.dbId || event.id;
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [managedEvents]);

  function resetForm() {
    setTitle("");
    setEventType("activity");
    setEventDate("");
    setDescription("");
    setStartTime("");
    setEndTime("");
    setSectionId(sections[0]?.id || "");
  }

  function onCreate(event) {
    event.preventDefault();
    startTransition(async () => {
      const result = await createTeacherCalendarEvent({
        title,
        eventType,
        eventDate,
        description,
        startTime,
        endTime,
        sectionId,
      });
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Class event added for your assigned section.");
      resetForm();
      router.refresh();
    });
  }

  function onDelete(id) {
    if (!window.confirm("Remove this class event from the calendar?")) return;
    startTransition(async () => {
      const result = await deleteTeacherCalendarEvent(id);
      if (result?.error) toast.error(result.error);
      else {
        toast.success("Class event removed.");
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-4 rounded-2xl border border-[#800000]/10 bg-white p-4 shadow-[0_12px_28px_-20px_rgba(61,18,18,0.35)] sm:p-5">
      <div className="flex items-start gap-3">
        <span className="flex size-10 items-center justify-center rounded-xl bg-[#800000]/8 text-[#800000]">
          <CalendarPlus className="size-5" />
        </span>
        <div>
          <p className="text-[11px] font-semibold tracking-wide text-[#800000] uppercase">
            Authorized class events
          </p>
          <h2 className="font-heading text-lg font-bold text-[#3d1212]">
            Add a class or school event
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Official DepEd dates stay on the school calendar. You may add events
            only for sections you handle.
          </p>
        </div>
      </div>

      {sections.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No assigned sections yet. Ask the registrar to assign your classes.
        </p>
      ) : (
        <form className="grid gap-3 sm:grid-cols-2" onSubmit={onCreate}>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="class-event-title">Title</Label>
            <Input
              id="class-event-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. HUMSS-A performance task"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="class-event-type">Type</Label>
            <select
              id="class-event-type"
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
            >
              {TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="class-event-section">Section</Label>
            <select
              id="class-event-section"
              value={sectionId}
              onChange={(e) => setSectionId(e.target.value)}
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
            >
              {sections.map((section) => (
                <option key={section.id} value={section.id}>
                  {sectionLabel(section)}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="class-event-date">Date</Label>
            <Input
              id="class-event-date"
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="class-event-start">Start (optional)</Label>
              <Input
                id="class-event-start"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="class-event-end">End (optional)</Label>
              <Input
                id="class-event-end"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="class-event-details">Details (optional)</Label>
            <Textarea
              id="class-event-details"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Add class event"}
            </Button>
          </div>
        </form>
      )}

      {uniqueManaged.length > 0 ? (
        <div className="space-y-2 border-t border-[#800000]/10 pt-3">
          <p className="text-xs font-semibold tracking-wide text-[#800000] uppercase">
            Your class events this month
          </p>
          {uniqueManaged.map((event) => {
            const style = styleForEventType(event.event_type);
            return (
              <div
                key={event.dbId || event.id}
                className="flex items-start justify-between gap-2 rounded-xl border border-[#800000]/10 px-3 py-2"
              >
                <div>
                  <span
                    className={cn(
                      "inline-flex rounded-md border px-2 py-0.5 text-[11px] font-semibold",
                      style.badge
                    )}
                  >
                    {style.label}
                  </span>
                  <p className="mt-1 text-sm font-medium text-[#3d1212]">
                    {event.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {event.event_date}
                    {event.sectionLabel ? ` · ${event.sectionLabel}` : ""}
                  </p>
                </div>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  disabled={pending}
                  onClick={() => onDelete(event.dbId || event.id)}
                  aria-label="Delete class event"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
