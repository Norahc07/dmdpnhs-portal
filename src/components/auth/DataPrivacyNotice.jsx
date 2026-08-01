"use client";

import { useState } from "react";
import { Shield } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SCHOOL_NAME, SCHOOL_SHORT } from "@/lib/constants";

/**
 * Shown when entering student or teacher login portals.
 * @param {{ audience?: "student" | "teacher" }} props
 */
export function DataPrivacyNotice({ audience = "student" }) {
  const [open, setOpen] = useState(true);

  const roleLabel = audience === "teacher" ? "faculty and staff" : "learners";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"
        showCloseButton
      >
        <DialogHeader className="items-center pr-8 text-center sm:text-center">
          <div className="mb-1 flex size-10 items-center justify-center rounded-full bg-[#800000]/10 text-[#800000]">
            <Shield className="size-5" />
          </div>
          <DialogTitle className="text-center text-lg text-[#3d1212]">
            Data Privacy Act of 2012 (RA 10173)
          </DialogTitle>
          <DialogDescription className="sr-only">
            Data privacy notice for {SCHOOL_SHORT} Portal
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 font-sans text-sm leading-relaxed text-neutral-700">
          <p>
            <strong className="text-[#3d1212]">{SCHOOL_NAME}</strong> (
            {SCHOOL_SHORT}) is a public secondary school under the Department of
            Education (DepEd), committed to protect and respect your personal
            data privacy in accordance with Republic Act No. 10173, otherwise
            known as the Data Privacy Act of 2012.
          </p>
          <p>
            To perform its educational and administrative functions, the school
            collects, uses, processes, and stores information you provide as
            needed in the administration of learner and school records, and for
            the purposes of delivering portal services—including grades,
            attendance, enrollment status, document requests, and related
            school processes—or for other reasonable purposes connected to those
            services, such as system improvements, reporting to DepEd, research,
            and data analytics within authorized school use.
          </p>
          <p>
            It is the duty of every member of the school community, including{" "}
            {roleLabel}, to abide by the rules and regulations promulgated by{" "}
            {SCHOOL_SHORT} and DepEd, and to use the portal only for legitimate
            school purposes.
          </p>
          <p className="text-xs text-neutral-500">
            By continuing, you acknowledge that you have read and understood
            this privacy notice.
          </p>
        </div>

        <DialogFooter className="sm:justify-end">
          <DialogClose
            render={
              <Button
                variant="outline"
                className="border-[#800000]/20 text-[#800000]"
              />
            }
          >
            Close
          </DialogClose>
          <Button
            className="bg-[#800000] text-white hover:bg-[#6a0000]"
            onClick={() => setOpen(false)}
          >
            OK
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
