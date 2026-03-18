import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";

export default async function DashboardRouter() {
  const user = await requireUser();

  if (user.role === "ADMIN" || user.role === "BARBER") {
    redirect("/admin");
  }

  if (user.role === "OWNER") {
    redirect("/owner");
  }

  redirect("/cliente");
}
