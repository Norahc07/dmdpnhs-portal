import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/**
 * Deduplicate auth + profile lookups within a single RSC request.
 * Middleware still runs separately; this stops pages from re-hitting Auth twice.
 */
export const getRequestAuth = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
});

export const getRequestProfile = cache(async (userId) => {
  if (!userId) return null;
  const { supabase } = await getRequestAuth();
  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "id, role, status, first_name, middle_name, last_name, email, avatar_url"
    )
    .eq("id", userId)
    .maybeSingle();
  return profile;
});
