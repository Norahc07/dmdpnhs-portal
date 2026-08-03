import { redirect } from "next/navigation";

export const metadata = { title: "Promotion" };

/** Legacy route — promotion UI lives at /registrar/promotion */
export default function RegistrarStudentsRedirect() {
  redirect("/registrar/promotion");
}
