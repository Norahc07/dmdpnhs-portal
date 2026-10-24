"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  createAnnouncement,
  deleteAnnouncementAttachment,
  updateAnnouncement,
} from "@/actions/announcements";
import {
  ANNOUNCEMENT_TYPES,
  sectionLabel,
} from "@/lib/announcements";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function AnnouncementComposer({
  sections = [],
  initialPost = null,
  onDone,
}) {
  const [pending, startTransition] = useTransition();
  const [postType, setPostType] = useState(
    initialPost?.postType || "announcement"
  );
  const [selected, setSelected] = useState(
    () => new Set((initialPost?.sections || []).map((s) => s.id))
  );

  function toggleSection(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <form
      className="space-y-4 rounded-2xl border border-[#800000]/10 bg-white p-4 shadow-[0_12px_28px_-20px_rgba(61,18,18,0.35)] sm:p-5"
      onSubmit={(event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const formData = new FormData(form);
        formData.set("postType", postType);
        formData.delete("sectionIds");
        for (const id of selected) formData.append("sectionIds", id);
        if (initialPost?.id) formData.set("id", initialPost.id);

        startTransition(async () => {
          const result = initialPost?.id
            ? await updateAnnouncement(formData)
            : await createAnnouncement(formData);
          if (result?.error) {
            toast.error(result.error);
            return;
          }
          toast.success(
            initialPost?.id
              ? "Announcement updated."
              : "Posted. Students in those sections get an in-app notice and a phone alert if they enabled it."
          );
          if (!initialPost?.id) {
            form.reset();
            setPostType("announcement");
            setSelected(new Set());
          }
          onDone?.();
        });
      }}
    >
      <div>
        <p className="text-[11px] font-semibold tracking-wide text-[#800000] uppercase">
          {initialPost?.id ? "Edit post" : "New post"}
        </p>
        <h2 className="mt-1 font-heading text-lg font-bold text-[#3d1212]">
          {initialPost?.id ? "Update announcement" : "Post to your classes"}
        </h2>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="postType">Type</Label>
        <div className="flex flex-wrap gap-1.5">
          {ANNOUNCEMENT_TYPES.map((item) => {
            const active = postType === item.value;
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => setPostType(item.value)}
                className={
                  active
                    ? "rounded-xl bg-[#800000]/10 px-3 py-2 text-xs font-semibold text-[#800000] ring-1 ring-[#800000]/15"
                    : "rounded-xl bg-[#faf7f5] px-3 py-2 text-xs font-semibold text-muted-foreground ring-1 ring-[#800000]/10 hover:text-[#800000]"
                }
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          name="title"
          required
          defaultValue={initialPost?.title || ""}
          placeholder="e.g. Term 2 performance task reminder"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="body">Details</Label>
        <Textarea
          id="body"
          name="body"
          required
          rows={5}
          defaultValue={initialPost?.body || ""}
          placeholder="Write what students need to know."
        />
      </div>

      <div className="space-y-1.5">
        <Label>Target section(s)</Label>
        {sections.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No assigned sections yet. Ask the registrar to assign your classes.
          </p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {sections.map((section) => {
              const checked = selected.has(section.id);
              return (
                <label
                  key={section.id}
                  className={
                    checked
                      ? "flex items-center gap-2 rounded-xl border border-[#800000]/25 bg-[#800000]/5 px-3 py-2 text-sm text-[#3d1212]"
                      : "flex items-center gap-2 rounded-xl border border-[#800000]/10 bg-[#faf7f5] px-3 py-2 text-sm text-[#3d1212]"
                  }
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleSection(section.id)}
                  />
                  {sectionLabel(section)}
                </label>
              );
            })}
          </div>
        )}
      </div>

      {initialPost?.attachments?.length ? (
        <div className="space-y-1.5">
          <Label>Current attachments</Label>
          <ul className="space-y-1 text-sm">
            {initialPost.attachments.map((file) => (
              <li
                key={file.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-[#800000]/10 px-3 py-1.5"
              >
                <a
                  href={file.file_url || "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="truncate text-[#800000] hover:underline"
                >
                  {file.file_name}
                </a>
                <Button
                  type="button"
                  size="xs"
                  variant="outline"
                  disabled={pending}
                  onClick={() => {
                    startTransition(async () => {
                      const result = await deleteAnnouncementAttachment({
                        announcementId: initialPost.id,
                        attachmentId: file.id,
                      });
                      if (result?.error) toast.error(result.error);
                      else toast.success("Attachment removed.");
                    });
                  }}
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="space-y-1.5">
        <Label htmlFor="attachments">Optional attachments</Label>
        <Input
          id="attachments"
          name="attachments"
          type="file"
          multiple
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
        />
        <p className="text-xs text-muted-foreground">
          Up to 3 files, 5 MB each. PDF, Word, or image.
        </p>
      </div>

      <Button type="submit" disabled={pending || sections.length === 0}>
        {pending
          ? "Saving…"
          : initialPost?.id
            ? "Save changes"
            : "Post announcement"}
      </Button>
    </form>
  );
}
