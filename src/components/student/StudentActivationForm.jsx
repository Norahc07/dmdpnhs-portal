"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { submitStudentActivation } from "@/actions/activation";
import { OptionalEmailField } from "@/components/forms/OptionalEmailField";
import { ProfilePicturePicker } from "@/components/profile/ProfilePicturePicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GRADE_LEVELS, SCHOOL_SHORT } from "@/lib/constants";

export function StudentActivationForm({ initial, sections = [], profile }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || null);
  const [gradeLevel, setGradeLevel] = useState(
    String(initial?.gradeLevel || sections[0]?.grade_level || "7")
  );
  const [sectionId, setSectionId] = useState(() => {
    const grade = String(
      initial?.gradeLevel || sections[0]?.grade_level || "7"
    );
    const match = sections.find(
      (s) =>
        s.id === initial?.sectionId && String(s.grade_level) === grade
    );
    return match?.id || "";
  });

  const filteredSections = useMemo(
    () =>
      sections.filter((s) => String(s.grade_level) === String(gradeLevel)),
    [sections, gradeLevel]
  );

  useEffect(() => {
    if (
      sectionId &&
      !filteredSections.some((s) => String(s.id) === String(sectionId))
    ) {
      setSectionId("");
    }
  }, [filteredSections, sectionId]);

  function onSubmit(e) {
    e.preventDefault();
    setError("");
    const fd = new FormData(e.currentTarget);
    const payload = Object.fromEntries(fd.entries());
    payload.emergencyContactName =
      `${payload.parentFirstName || ""} ${payload.parentLastName || ""}`.trim();
    payload.emergencyContactNumber = payload.parentPhone || "";
    startTransition(async () => {
      const result = await submitStudentActivation(payload);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="space-y-8">
      <section className="space-y-3 rounded-2xl border border-[#800000]/10 bg-[#faf7f5] p-4 shadow-sm">
        <h2 className="font-heading text-lg font-bold text-[#3d1212]">
          Profile photo
        </h2>
        <p className="text-sm text-muted-foreground">
          Upload a clear photo or take a selfie for your portal profile.
        </p>
        <ProfilePicturePicker
          profile={{
            first_name: initial?.firstName || profile?.first_name,
            last_name: initial?.lastName || profile?.last_name,
            avatar_url: avatarUrl,
          }}
          avatarUrl={avatarUrl}
          onAvatarChange={setAvatarUrl}
        />
      </section>

      <form onSubmit={onSubmit} className="space-y-8">
      {error ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      ) : null}

      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
        <p className="font-semibold">Important — parent / guardian contact</p>
        <p className="mt-1 text-amber-900/90">
          Use a working mobile number for your parent or guardian. The registrar
          will call to verify before activating your account. {SCHOOL_SHORT} uses
          that number for absence and grade SMS alerts after verification.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="font-heading text-lg font-bold text-[#3d1212]">
          Personal information
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="firstName">First name</Label>
            <Input
              id="firstName"
              name="firstName"
              required
              placeholder="e.g. Juan"
              defaultValue={initial?.firstName || ""}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="middleName">Middle name</Label>
            <Input
              id="middleName"
              name="middleName"
              required
              placeholder="e.g. Santos"
              defaultValue={initial?.middleName || ""}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lastName">Last name</Label>
            <Input
              id="lastName"
              name="lastName"
              required
              placeholder="e.g. Dela Cruz"
              defaultValue={initial?.lastName || ""}
            />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="gradeLevel">Grade level</Label>
            <select
              id="gradeLevel"
              name="gradeLevel"
              required
              value={gradeLevel}
              onChange={(e) => setGradeLevel(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent py-1 pl-3 pr-9 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              {GRADE_LEVELS.map((g) => (
                <option key={g} value={g}>
                  Grade {g}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sectionId">Section</Label>
            <select
              id="sectionId"
              name="sectionId"
              required
              value={sectionId}
              onChange={(e) => setSectionId(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent py-1 pl-3 pr-9 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              <option value="">
                {filteredSections.length
                  ? "Select section"
                  : "No sections for this grade"}
              </option>
              {filteredSections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.section_name} ({s.school_year})
                </option>
              ))}
            </select>
            {!filteredSections.length ? (
              <p className="text-xs text-rose-600">
                No sections for this grade yet. Ask the registrar to create one.
              </p>
            ) : null}
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="address">Home address</Label>
          <Input
            id="address"
            name="address"
            required
            placeholder="House No., Street, Barangay, City"
            defaultValue={initial?.address || ""}
          />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-heading text-lg font-bold text-[#3d1212]">
          Parent / guardian
        </h2>
        <p className="text-sm text-muted-foreground">
          Name and contact number for school notices. Parent email is optional.
          There is no parent portal login.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="parentFirstName">Parent / guardian first name</Label>
            <Input
              id="parentFirstName"
              name="parentFirstName"
              required
              placeholder="e.g. Maria"
              defaultValue={initial?.parentFirstName || ""}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="parentLastName">Parent / guardian last name</Label>
            <Input
              id="parentLastName"
              name="parentLastName"
              required
              placeholder="e.g. Dela Cruz"
              defaultValue={initial?.parentLastName || ""}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="parentPhone">Parent / guardian contact number</Label>
            <Input
              id="parentPhone"
              name="parentPhone"
              required
              placeholder="09XXXXXXXXX"
              defaultValue={initial?.parentPhone || ""}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="parentRelationship">Relationship</Label>
            <select
              id="parentRelationship"
              name="parentRelationship"
              required
              defaultValue={initial?.parentRelationship || "Mother"}
              className="flex h-9 w-full rounded-md border border-input bg-transparent py-1 pl-3 pr-9 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              <option value="Mother">Mother</option>
              <option value="Father">Father</option>
              <option value="Guardian">Guardian</option>
            </select>
          </div>
          <OptionalEmailField
            className="sm:col-span-2"
            defaultValue={initial?.parentEmail || ""}
            defaultNone={!initial?.parentEmail}
          />
        </div>
      </section>

      <Button
        type="submit"
        disabled={pending || !filteredSections.length}
        className="w-full bg-[#800000] hover:bg-[#6a0000] sm:w-auto"
      >
        {pending ? "Submitting…" : "Submit for registrar verification"}
      </Button>
    </form>
    </div>
  );
}
