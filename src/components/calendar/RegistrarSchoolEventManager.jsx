"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  createSchoolCalendarEvent,
  deleteSchoolCalendarEvent,
} from "@/actions/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GRADE_LEVELS } from "@/lib/constants";
import { styleForEventType } from "@/lib/portal-calendar";
import { cn } from "@/lib/utils";

const TYPE_OPTIONS = [
  { value: "school_event", label: "School event" },
  { value: "important", label: "Important / special day" },
  { value: "holiday", label: "Holiday (school-declared)" },
  { value: "activity", label: "Activity" },
  { value: "exam", label: "Exam" },
  { value: "assignment", label: "Assignment" },
];

const AUDIENCE_OPTIONS = [
  { value: "all", label: "All users (students, teachers, registrar)" },
  ...GRADE_LEVELS.map((g) => ({
    value: String(g),
    label: `Grade ${g} only`,
  })),
];

export function RegistrarSchoolEventManager({ managedEvents = [] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [eventType, setEventType] = useState("school_event");
  const [eventDate, setEventDate] = useState("");
  const [description, setDescription] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [audience, setAudience] = useState("all");
  const [repeatsYearly, setRepeatsYearly] = useState(false);

  const uniqueManaged = useMemo(() => {
    const seen = new Set();
    return managedEvents.filter((e) => {
      const key = e.dbId || e.id;
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [managedEvents]);

  function resetForm() {
    setTitle("");
    setEventType("school_event");
    setEventDate("");
    setDescription("");
    setStartTime("");
    setEndTime("");
    setAudience("all");
    setRepeatsYearly(false);
  }

  function onCreate(e) {
    e.preventDefault();
    startTransition(async () => {
      const result = await createSchoolCalendarEvent({
        title,
        eventType,
        eventDate,
        description,
        startTime,
        endTime,
        gradeLevel: audience,
        repeatsYearly,
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("School event published to all calendars.");
      resetForm();
      router.refresh();
    });
  }

  function onDelete(dbId) {
    if (!dbId) return;
    if (!window.confirm("Remove this event from all portal calendars?")) return;
    startTransition(async () => {
      const result = await deleteSchoolCalendarEvent(dbId);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Event removed.");
      router.refresh();
    });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
      <section className="overflow-hidden rounded-2xl border border-[#800000]/10 bg-white shadow-[0_12px_28px_-20px_rgba(61,18,18,0.35)]">
        <div className="portal-panel-head flex items-start gap-3 px-4 py-4 sm:px-5">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#800000]/8 text-[#800000] ring-1 ring-[#800000]/12">
            <CalendarPlus className="size-5" />
          </span>
          <div>
            <p className="text-xs font-semibold tracking-[0.16em] text-[#800000] uppercase">
              Registrar only
            </p>
            <h2 className="mt-1 font-heading text-base font-bold text-[#3d1212]">
              Add special day / school event
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Published events appear on student, teacher, and registrar calendars.
            </p>
          </div>
        </div>

        <form onSubmit={onCreate} className="space-y-3.5 p-4 sm:p-5">
          <div className="space-y-1.5">
            <Label htmlFor="event-title">Title</Label>
            <Input
              id="event-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Foundation Day, Intramurals Opening"
              required
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select
                value={eventType}
                onValueChange={setEventType}
                items={TYPE_OPTIONS}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPE_OPTIONS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="event-date">Date</Label>
              <Input
                id="event-date"
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="start-time">Start time (optional)</Label>
              <Input
                id="start-time"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="end-time">End time (optional)</Label>
              <Input
                id="end-time"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Audience</Label>
            <Select
              value={audience}
              onValueChange={setAudience}
              items={AUDIENCE_OPTIONS}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AUDIENCE_OPTIONS.map((a) => (
                  <SelectItem key={a.value} value={a.value}>
                    {a.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="event-desc">Description (optional)</Label>
            <Textarea
              id="event-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Details everyone should know…"
            />
          </div>

          <label className="flex items-start gap-2.5 rounded-xl border border-[#800000]/10 bg-[#faf7f5] px-3 py-2.5 text-sm text-[#3d1212]">
            <input
              type="checkbox"
              className="mt-1"
              checked={repeatsYearly}
              onChange={(e) => setRepeatsYearly(e.target.checked)}
            />
            <span>
              <span className="font-medium">Repeat every year</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                Same month and day will show on future years (requires calendar SQL
                upgrade).
              </span>
            </span>
          </label>

          <Button
            type="submit"
            disabled={pending}
            className="bg-[#800000] text-white hover:bg-[#6a0000]"
          >
            {pending ? "Publishing…" : "Publish to calendars"}
          </Button>
        </form>
      </section>

      <section className="overflow-hidden rounded-2xl border border-[#800000]/10 bg-white shadow-[0_12px_28px_-20px_rgba(61,18,18,0.35)]">
        <div className="portal-panel-head px-4 py-4 sm:px-5">
          <p className="text-xs font-semibold tracking-[0.16em] text-[#800000] uppercase">
            This month
          </p>
          <h3 className="mt-1 font-heading text-base font-bold text-[#3d1212]">
            Published school events
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Built-in holidays and birthdays are automatic. Only registrar-published
            events can be removed here.
          </p>
        </div>
        <div className="space-y-2 p-4 sm:p-5">
          {uniqueManaged.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[#800000]/15 px-3 py-8 text-center text-sm text-muted-foreground">
              No registrar-published events in this month yet.
            </p>
          ) : (
            uniqueManaged.map((event) => {
              const style = styleForEventType(event.event_type);
              return (
                <div
                  key={event.dbId || event.id}
                  className="flex items-start gap-3 rounded-xl border border-[#800000]/08 bg-[#faf7f5]/70 px-3 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <span
                      className={cn(
                        "rounded-md border px-2 py-0.5 text-[11px] font-semibold",
                        style.badge
                      )}
                    >
                      {style.label}
                    </span>
                    <p className="mt-1.5 font-medium text-[#3d1212]">
                      {event.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {event.event_date}
                      {event.grade_level == null
                        ? " · All users"
                        : ` · Grade ${event.grade_level}`}
                      {event.repeats_yearly ? " · yearly" : ""}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={pending}
                    className="shrink-0 border-rose-200 text-rose-700 hover:bg-rose-50"
                    onClick={() => onDelete(event.dbId)}
                    aria-label={`Delete ${event.title}`}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
