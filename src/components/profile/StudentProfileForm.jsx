"use client";

import { useState, useTransition } from "react";
import { updateStudentProfile } from "@/actions/profile";
import { ProfilePicturePicker } from "@/components/profile/ProfilePicturePicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function StudentProfileForm({ profile, student }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || null);

  function onSubmit(e) {
    e.preventDefault();
    setError("");
    setMessage("");
    const fd = new FormData(e.currentTarget);
    const payload = Object.fromEntries(fd.entries());
    startTransition(async () => {
      const result = await updateStudentProfile(payload);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setMessage("Personal details saved.");
    });
  }

  return (
    <div className="space-y-8">
      <section className="space-y-3 rounded-2xl border bg-white p-5 sm:p-6">
        <div>
          <h2 className="font-heading text-lg font-bold text-[#3d1212]">
            Profile photo
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload a photo or take a selfie. It appears on your student dashboard.
          </p>
        </div>
        <ProfilePicturePicker
          profile={profile}
          avatarUrl={avatarUrl}
          onAvatarChange={setAvatarUrl}
        />
      </section>

      <form
        onSubmit={onSubmit}
        className="space-y-6 rounded-2xl border bg-white p-5 sm:p-6"
      >
        <div>
          <h2 className="font-heading text-lg font-bold text-[#3d1212]">
            Personal information
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Keep your contact details accurate so the school can reach you.
          </p>
        </div>

        {error ? (
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </p>
        ) : null}
        {message ? (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            {message}
          </p>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="firstName">First name</Label>
            <Input
              id="firstName"
              name="firstName"
              required
              defaultValue={profile?.first_name || ""}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="middleName">Middle name</Label>
            <Input
              id="middleName"
              name="middleName"
              defaultValue={profile?.middle_name || ""}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lastName">Last name</Label>
            <Input
              id="lastName"
              name="lastName"
              required
              defaultValue={profile?.last_name || ""}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="lrn">LRN</Label>
            <Input
              id="lrn"
              value={student?.lrn || ""}
              disabled
              className="bg-muted/40"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="gradeSection">Grade & section</Label>
            <Input
              id="gradeSection"
              value={`Grade ${student?.grade_level || "—"} · ${student?.sections?.section_name || "Unassigned"}`}
              disabled
              className="bg-muted/40"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="contactNumber">Contact number</Label>
            <Input
              id="contactNumber"
              name="contactNumber"
              required
              placeholder="09XXXXXXXXX"
              defaultValue={student?.contact_number || ""}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="personalEmail">Personal email</Label>
            <Input
              id="personalEmail"
              name="personalEmail"
              type="email"
              placeholder="you@email.com"
              defaultValue={student?.personal_email || ""}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="address">Home address</Label>
          <Input
            id="address"
            name="address"
            placeholder="House No., Street, Barangay, City"
            defaultValue={student?.address || ""}
          />
        </div>

        <div>
          <h3 className="mb-3 font-heading text-base font-bold text-[#3d1212]">
            Emergency / parent contact
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="emergencyContactName">Contact name</Label>
              <Input
                id="emergencyContactName"
                name="emergencyContactName"
                defaultValue={student?.emergency_contact_name || ""}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="emergencyContactNumber">Contact number</Label>
              <Input
                id="emergencyContactNumber"
                name="emergencyContactNumber"
                placeholder="09XXXXXXXXX"
                defaultValue={student?.emergency_contact_number || ""}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={pending}
            className="bg-[#800000] hover:bg-[#6a0000]"
          >
            {pending ? "Saving…" : "Save personal details"}
          </Button>
        </div>
      </form>
    </div>
  );
}
