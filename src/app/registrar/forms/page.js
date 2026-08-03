import { redirect } from "next/navigation";

export const metadata = { title: "School Forms" };

/** School Forms export removed — redirect to registrar home. */
export default function RegistrarFormsRedirect() {
  redirect("/registrar");
}
