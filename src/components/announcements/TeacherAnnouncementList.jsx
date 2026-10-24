"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { deleteAnnouncement } from "@/actions/announcements";
import { AnnouncementCard } from "@/components/announcements/AnnouncementCard";
import { AnnouncementComposer } from "@/components/announcements/AnnouncementComposer";
import { Button } from "@/components/ui/button";

export function TeacherAnnouncementList({ posts = [], sections = [] }) {
  const [editingId, setEditingId] = useState(null);
  const [pending, startTransition] = useTransition();

  if (!posts.length) {
    return (
      <p className="rounded-2xl border border-dashed border-[#800000]/20 bg-white px-4 py-8 text-center text-sm text-muted-foreground">
        No posts yet. Use the form above to send an announcement, reminder,
        assignment, or important update to your classes.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {posts.map((post) => (
        <div key={post.id} className="space-y-3">
          <AnnouncementCard
            post={post}
            actions={
              <div className="flex gap-1.5">
                <Button
                  type="button"
                  size="xs"
                  variant="outline"
                  onClick={() =>
                    setEditingId((current) => (current === post.id ? null : post.id))
                  }
                >
                  {editingId === post.id ? "Close" : "Edit"}
                </Button>
                <Button
                  type="button"
                  size="xs"
                  variant="destructive"
                  disabled={pending}
                  onClick={() => {
                    if (!window.confirm("Delete this announcement?")) return;
                    startTransition(async () => {
                      const result = await deleteAnnouncement(post.id);
                      if (result?.error) toast.error(result.error);
                      else toast.success("Announcement deleted.");
                    });
                  }}
                >
                  Delete
                </Button>
              </div>
            }
          />
          {editingId === post.id ? (
            <AnnouncementComposer
              sections={sections}
              initialPost={post}
              onDone={() => setEditingId(null)}
            />
          ) : null}
        </div>
      ))}
    </div>
  );
}
