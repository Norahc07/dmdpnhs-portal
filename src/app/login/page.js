import { redirect } from "next/navigation";

export const metadata = { title: "Sign in" };

/** Legacy /login → send users to portal picker on the landing page */
export default function LoginIndexPage() {
  redirect("/#portals");
}
