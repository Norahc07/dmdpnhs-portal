import { updateTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache/tags";

/**
 * Drop cached registrar roster/sections after student or section mutations.
 * Uses updateTag so Server Actions see fresh data immediately (read-your-own-writes).
 */
export function invalidateRegistrarCaches() {
  updateTag(CACHE_TAGS.registrarStudents);
  updateTag(CACHE_TAGS.registrarSections);
}
