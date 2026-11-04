"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  listPortalNotificationsForProfile,
  markPortalNotificationsRead,
} from "@/lib/portal-notifications";

async function requireProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };
  return { user, admin: createAdminClient() };
}

export async function listMyPortalNotifications() {
  const auth = await requireProfile();
  if (auth.error) return { items: [], unreadCount: 0, error: auth.error };
  return listPortalNotificationsForProfile(auth.admin, auth.user.id);
}

export async function markMyPortalNotificationsRead(ids = null) {
  const auth = await requireProfile();
  if (auth.error) return auth;
  const result = await markPortalNotificationsRead(
    auth.admin,
    auth.user.id,
    ids
  );
  if (result.error) return result;
  revalidatePath("/student/notifications");
  revalidatePath("/teacher/notifications");
  revalidatePath("/registrar");
  return { ok: true };
}
