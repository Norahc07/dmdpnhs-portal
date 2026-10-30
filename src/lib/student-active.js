import { studentEmailFromLrn } from "@/lib/constants";

/** Apply active-only filter; if deleted_at column is missing, return original query. */
export function withActiveStudents(query) {
  return query.is("deleted_at", null);
}

export function isMissingDeletedAtColumn(error) {
  return /deleted_at/i.test(String(error?.message || error || ""));
}

/**
 * Select students that are not in trash.
 * Falls back without the deleted_at filter when the SQL upgrade is not applied yet.
 */
export async function selectActiveStudents(db, fields, apply = (q) => q) {
  let query = withActiveStudents(db.from("students").select(fields));
  query = apply(query);
  let result = await query;
  if (result.error && isMissingDeletedAtColumn(result.error)) {
    query = apply(db.from("students").select(fields));
    result = await query;
  }
  return result;
}

export async function findActiveStudentByLrn(db, lrn, fields = "id") {
  const clean = String(lrn || "").trim();
  if (!clean) return { data: null, error: null };
  let result = await db
    .from("students")
    .select(fields)
    .eq("lrn", clean)
    .is("deleted_at", null)
    .maybeSingle();
  if (result.error && isMissingDeletedAtColumn(result.error)) {
    result = await db
      .from("students")
      .select(fields)
      .eq("lrn", clean)
      .maybeSingle();
  }
  return result;
}

export function trashedAuthEmail(studentId, lrn) {
  const idPart = String(studentId || "x").replace(/-/g, "").slice(0, 10);
  const lrnPart = String(lrn || "000000000000").replace(/\D/g, "").slice(0, 12);
  return `deleted.${idPart}.${lrnPart}@student.dmdpnhs.edu.ph`;
}

/**
 * Soft-delete: keep grades/attendance/profile for restore, free the LRN for re-enroll.
 */
export async function moveStudentToTrash(admin, student, deletedBy = null) {
  if (!student?.id) return { error: "Student id is required." };

  const patch = {
    deleted_at: new Date().toISOString(),
    deleted_by: deletedBy || null,
    status: "deleted",
  };

  let { error } = await admin.from("students").update(patch).eq("id", student.id);
  if (error && isMissingDeletedAtColumn(error)) {
    return {
      error:
        "Student trash is not enabled yet. Apply supabase/student-trash.sql in the Supabase SQL editor.",
    };
  }
  if (error) return { error: error.message };

  if (student.profile_id) {
    await admin
      .from("profiles")
      .update({ status: "trashed" })
      .eq("id", student.profile_id);

    try {
      await admin.auth.admin.updateUserById(student.profile_id, {
        ban_duration: "876000h",
        email: trashedAuthEmail(student.id, student.lrn),
        email_confirm: true,
        user_metadata: {
          trashed: true,
          original_lrn: student.lrn || null,
        },
      });
    } catch {
      /* auth update is best-effort */
    }
  }

  return { ok: true };
}

export async function restoreStudentFromTrash(admin, student) {
  if (!student?.id) return { error: "Student id is required." };
  if (!student.deleted_at) return { error: "This student is not in trash." };

  const lrn = String(student.lrn || "").trim();
  if (lrn) {
    const { data: clash } = await findActiveStudentByLrn(admin, lrn, "id");
    if (clash?.id && clash.id !== student.id) {
      return {
        error: `LRN ${lrn} is already used by an active student. Remove or trash that record before restoring.`,
      };
    }
  }

  const email = studentEmailFromLrn(lrn || student.lrn);
  if (student.profile_id) {
    try {
      await admin.auth.admin.updateUserById(student.profile_id, {
        ban_duration: "none",
        email,
        email_confirm: true,
        user_metadata: {
          trashed: false,
          original_lrn: lrn || null,
        },
      });
    } catch (err) {
      return {
        error:
          err?.message ||
          "Could not restore the sign-in account. The LRN email may already be in use.",
      };
    }

    await admin
      .from("profiles")
      .update({
        status:
          student.activation_status === "active" ? "active" : "pending",
        email,
      })
      .eq("id", student.profile_id);
  }

  const { error } = await admin
    .from("students")
    .update({
      deleted_at: null,
      deleted_by: null,
      status: student.activation_status === "active" ? "enrolled" : "enrolled",
    })
    .eq("id", student.id);

  if (error) return { error: error.message };
  return { ok: true };
}

/** Permanent delete from trash (or force-remove). */
export async function purgeStudentRecord(admin, student) {
  if (!student?.id) return { error: "Student id is required." };

  await admin.from("parent_student_links").delete().eq("student_id", student.id);
  await admin.from("grades").delete().eq("student_id", student.id);
  await admin.from("attendance").delete().eq("student_id", student.id);

  const { error: studentError } = await admin
    .from("students")
    .delete()
    .eq("id", student.id);
  if (studentError) return { error: studentError.message };

  if (student.profile_id) {
    await admin.from("profiles").delete().eq("id", student.profile_id);
    try {
      await admin.auth.admin.deleteUser(student.profile_id);
    } catch {
      /* auth user may already be gone */
    }
  }

  return { ok: true };
}

/**
 * When re-enrolling an LRN, remove orphaned auth users left by old hard deletes
 * so createUser does not fail on the reserved student email.
 */
export async function clearOrphanStudentAuth(admin, lrn) {
  const email = studentEmailFromLrn(lrn).toLowerCase();
  const { data: active } = await findActiveStudentByLrn(
    admin,
    lrn,
    "id, profile_id"
  );
  if (active?.id) return { blocked: true, studentId: active.id };

  try {
    const { data: list } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    const orphan = (list?.users || []).find(
      (u) => String(u.email || "").toLowerCase() === email
    );
    if (!orphan?.id) return { cleared: false };

    const { data: linked } = await admin
      .from("students")
      .select("id, deleted_at")
      .eq("profile_id", orphan.id)
      .maybeSingle();

    if (linked?.id && !linked.deleted_at) {
      return { blocked: true, studentId: linked.id };
    }

    if (linked?.id && linked.deleted_at) {
      /* keep trashed account; email should already be renamed */
      return { cleared: false, trashed: true };
    }

    await admin.from("profiles").delete().eq("id", orphan.id);
    await admin.auth.admin.deleteUser(orphan.id);
    return { cleared: true };
  } catch (err) {
    return { cleared: false, error: err?.message || "Could not clear orphan auth." };
  }
}
